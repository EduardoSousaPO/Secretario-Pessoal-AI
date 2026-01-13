/**
 * Cliente Notion para o AI Secretary
 * 
 * Responsavel por (docs/05_INTEGRATIONS.md - 5.4):
 * - Criar paginas (tarefas)
 * - Atualizar propriedades de paginas
 * - Consultar database (buscar tarefas)
 * 
 * IMPORTANTE: Usa nomes de propriedades CANONICOS (docs/04_DATA_MODEL.md - 4.5)
 */

import { Client } from '@notionhq/client'
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints'

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

// Propriedades canonicas (docs/04_DATA_MODEL.md - 4.5)
export interface TaskProperties {
  Name: string
  Status?: string
  Eisenhower?: string
  Importance?: string
  Urgency?: string
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

    const notionProperties = mapToNotionProperties(properties)

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: notionProperties
    }) as PageObjectResponse

    console.log(`Task created in Notion: ${response.url}`)
    return { id: response.id, url: response.url }
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
    const notionProperties = mapToNotionProperties(properties)

    const response = await client.pages.update({
      page_id: pageId,
      properties: notionProperties
    }) as PageObjectResponse

    console.log(`Task updated in Notion: ${response.url}`)
    return { id: response.id, url: response.url }
  } catch (error) {
    console.error('Error updating task in Notion:', error)
    return null
  }
}

/**
 * Busca tarefas no Notion
 */
export async function queryTasks(params?: {
  titleContains?: string
  status?: string
  limit?: number
}): Promise<Array<{ id: string; url: string; title: string; status: string }>> {
  try {
    const client = getNotionClient()
    const databaseId = getDatabaseId()

    const filters: Array<{ property: string; title?: { contains: string }; select?: { equals: string } }> = []
    
    if (params?.titleContains) {
      filters.push({
        property: 'Name',
        title: { contains: params.titleContains }
      })
    }
    
    if (params?.status) {
      filters.push({
        property: 'Status',
        select: { equals: params.status }
      })
    }

    const queryParams: Parameters<typeof client.databases.query>[0] = {
      database_id: databaseId,
      page_size: params?.limit || 10
    }

    if (filters.length > 0) {
      queryParams.filter = filters.length === 1 
        ? filters[0] 
        : { and: filters }
    }

    const response = await client.databases.query(queryParams) as QueryDatabaseResponse

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(page => {
        const titleProp = page.properties['Name']
        const statusProp = page.properties['Status']
        
        let title = ''
        if (titleProp && titleProp.type === 'title' && titleProp.title.length > 0) {
          title = titleProp.title[0].plain_text
        }
        
        let status = ''
        if (statusProp && statusProp.type === 'select' && statusProp.select) {
          status = statusProp.select.name
        }

        return {
          id: page.id,
          url: page.url,
          title,
          status
        }
      })
  } catch (error) {
    console.error('Error querying tasks in Notion:', error)
    return []
  }
}

/**
 * Busca tarefas pendentes (Status != DONE)
 */
export async function getPendingTasks(limit: number = 5): Promise<Array<{ id: string; url: string; title: string; status: string }>> {
  try {
    const client = getNotionClient()
    const databaseId = getDatabaseId()

    const response = await client.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Status',
        select: { does_not_equal: 'DONE' }
      },
      page_size: limit
    }) as QueryDatabaseResponse

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(page => {
        const titleProp = page.properties['Name']
        const statusProp = page.properties['Status']
        
        let title = ''
        if (titleProp && titleProp.type === 'title' && titleProp.title.length > 0) {
          title = titleProp.title[0].plain_text
        }
        
        let status = ''
        if (statusProp && statusProp.type === 'select' && statusProp.select) {
          status = statusProp.select.name
        }

        return {
          id: page.id,
          url: page.url,
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
 * Mapeia propriedades para formato da API do Notion
 */
function mapToNotionProperties(properties: Partial<TaskProperties>): Record<string, unknown> {
  const notionProps: Record<string, unknown> = {}

  if (properties.Name) {
    notionProps['Name'] = {
      title: [{ text: { content: properties.Name } }]
    }
  }

  if (properties.Status) {
    notionProps['Status'] = {
      select: { name: properties.Status }
    }
  }

  if (properties.Eisenhower) {
    notionProps['Eisenhower'] = {
      select: { name: properties.Eisenhower }
    }
  }

  if (properties.Importance) {
    notionProps['Importance'] = {
      select: { name: properties.Importance }
    }
  }

  if (properties.Urgency) {
    notionProps['Urgency'] = {
      select: { name: properties.Urgency }
    }
  }

  if (properties.Due) {
    notionProps['Due'] = {
      date: { start: properties.Due }
    }
  }

  if (properties.Notes) {
    notionProps['Notes'] = {
      rich_text: [{ text: { content: properties.Notes } }]
    }
  }

  if (properties.Source) {
    notionProps['Source'] = {
      rich_text: [{ text: { content: properties.Source } }]
    }
  }

  if (properties.Confidence !== undefined) {
    notionProps['Confidence'] = {
      number: properties.Confidence
    }
  }

  if (properties.Tags && properties.Tags.length > 0) {
    notionProps['Tags'] = {
      multi_select: properties.Tags.map(tag => ({ name: tag }))
    }
  }

  if (properties.Effort) {
    notionProps['Effort'] = {
      select: { name: properties.Effort }
    }
  }

  return notionProps
}
