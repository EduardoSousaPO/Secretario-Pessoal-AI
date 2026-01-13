/**
 * Cliente Notion para o AI Secretary
 * 
 * Responsavel por (docs/05_INTEGRATIONS.md - 5.4):
 * - Criar paginas (tarefas)
 * - Atualizar propriedades de paginas
 * - Consultar database (buscar tarefas)
 * 
 * IMPORTANTE: Usa nomes de propriedades CANONICOS (docs/04_DATA_MODEL.md)
 * 
 * Kanban Simples:
 * - Backlog
 * - Em Andamento
 * - Pausado
 * - Concluido
 */

import { Client } from '@notionhq/client'

// Singleton do cliente
let notionClient: Client | null = null

function getNotionClient(): Client {
  if (!notionClient) {
    const token = process.env.NOTION_TOKEN
    if (!token) {
      throw new Error('NOTION_TOKEN is required')
    }
    notionClient = new Client({ auth: token })
  }
  return notionClient
}

function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID
  if (!id) {
    throw new Error('NOTION_DATABASE_ID is required')
  }
  return id
}

// Propriedades canonicas (docs/04_DATA_MODEL.md)
export interface TaskProperties {
  Name: string
  Status?: string
  Due?: string
  Notes?: string
  Source?: string
  Confidence?: number
  Tags?: string[]
  Effort?: string
}

/**
 * Cria uma nova tarefa no Notion
 */
export async function createTask(properties: TaskProperties): Promise<{ id: string; url: string } | null> {
  try {
    const client = getNotionClient()
    const databaseId = getDatabaseId()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notionProperties: any = {
      Name: {
        title: [{ text: { content: properties.Name } }]
      }
    }

    if (properties.Status) {
      notionProperties.Status = { select: { name: properties.Status } }
    }

    if (properties.Due) {
      notionProperties.Due = { date: { start: properties.Due } }
    }

    if (properties.Notes) {
      notionProperties.Notes = { rich_text: [{ text: { content: properties.Notes } }] }
    }

    if (properties.Source) {
      notionProperties.Source = { rich_text: [{ text: { content: properties.Source } }] }
    }

    if (properties.Confidence !== undefined) {
      notionProperties.Confidence = { number: properties.Confidence }
    }

    if (properties.Tags && properties.Tags.length > 0) {
      notionProperties.Tags = { multi_select: properties.Tags.map(tag => ({ name: tag })) }
    }

    if (properties.Effort) {
      notionProperties.Effort = { select: { name: properties.Effort } }
    }

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: notionProperties
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = response as any
    console.log(`Task created in Notion: ${page.url}`)
    return { id: page.id, url: page.url }
  } catch (error) {
    console.error('Error creating task in Notion:', error)
    return null
  }
}

/**
 * Atualiza uma tarefa existente no Notion
 */
export async function updateTask(
  pageId: string, 
  properties: Partial<TaskProperties>
): Promise<{ id: string; url: string } | null> {
  try {
    const client = getNotionClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notionProperties: any = {}

    if (properties.Name) {
      notionProperties.Name = { title: [{ text: { content: properties.Name } }] }
    }

    if (properties.Status) {
      notionProperties.Status = { select: { name: properties.Status } }
    }

    if (properties.Due) {
      notionProperties.Due = { date: { start: properties.Due } }
    }

    if (properties.Notes) {
      notionProperties.Notes = { rich_text: [{ text: { content: properties.Notes } }] }
    }

    if (properties.Source) {
      notionProperties.Source = { rich_text: [{ text: { content: properties.Source } }] }
    }

    if (properties.Confidence !== undefined) {
      notionProperties.Confidence = { number: properties.Confidence }
    }

    if (properties.Tags && properties.Tags.length > 0) {
      notionProperties.Tags = { multi_select: properties.Tags.map(tag => ({ name: tag })) }
    }

    if (properties.Effort) {
      notionProperties.Effort = { select: { name: properties.Effort } }
    }

    const response = await client.pages.update({
      page_id: pageId,
      properties: notionProperties
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = response as any
    console.log(`Task updated in Notion: ${page.url}`)
    return { id: page.id, url: page.url }
  } catch (error) {
    console.error('Error updating task in Notion:', error)
    return null
  }
}

/**
 * Busca tarefas pendentes (Status != Concluido)
 */
export async function getPendingTasks(limit: number = 5): Promise<Array<{ id: string; url: string; title: string; status: string }>> {
  try {
    const client = getNotionClient()
    const databaseId = getDatabaseId()

    const response = await client.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Status',
        select: { does_not_equal: 'Concluido' }
      },
      page_size: limit
    })

    return response.results.map(page => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = page as any
      
      let title = ''
      if (p.properties?.Name?.title?.[0]?.plain_text) {
        title = p.properties.Name.title[0].plain_text
      }
      
      let status = ''
      if (p.properties?.Status?.select?.name) {
        status = p.properties.Status.select.name
      }

      return {
        id: p.id,
        url: p.url,
        title,
        status
      }
    })
  } catch (error) {
    console.error('Error fetching pending tasks:', error)
    return []
  }
}

/**
 * Busca tarefas no Notion por titulo
 */
export async function queryTasks(params?: {
  titleContains?: string
  status?: string
  limit?: number
}): Promise<Array<{ id: string; url: string; title: string; status: string }>> {
  try {
    const client = getNotionClient()
    const databaseId = getDatabaseId()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams: any = {
      database_id: databaseId,
      page_size: params?.limit || 10
    }

    if (params?.titleContains) {
      queryParams.filter = {
        property: 'Name',
        title: { contains: params.titleContains }
      }
    } else if (params?.status) {
      queryParams.filter = {
        property: 'Status',
        select: { equals: params.status }
      }
    }

    const response = await client.databases.query(queryParams)

    return response.results.map(page => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = page as any
      
      let title = ''
      if (p.properties?.Name?.title?.[0]?.plain_text) {
        title = p.properties.Name.title[0].plain_text
      }
      
      let status = ''
      if (p.properties?.Status?.select?.name) {
        status = p.properties.Status.select.name
      }

      return {
        id: p.id,
        url: p.url,
        title,
        status
      }
    })
  } catch (error) {
    console.error('Error querying tasks in Notion:', error)
    return []
  }
}
