/**
 * Cliente Supabase para o AI Secretary
 * 
 * Responsavel por (docs/04_DATA_MODEL.md):
 * - Persistir eventos (auditoria)
 * - Garantir idempotencia via constraint UNIQUE
 * - Mapear tarefas do Notion
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Tipos das tabelas (docs/04_DATA_MODEL.md)
export type EventStatus = 'received' | 'transcribed' | 'parsed' | 'synced' | 'failed'

export interface Event {
  id: string
  trace_id: string
  chat_id: string
  message_id: string
  from_user_id: string | null
  audio_file_id: string | null
  audio_duration_sec: number | null
  transcription: string | null
  parsed_intent: Record<string, unknown> | null
  notion_action: Record<string, unknown> | null
  status: EventStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface TaskMap {
  id: string
  notion_page_id: string
  task_title: string | null
  last_seen_status: string | null
  created_from_message_id: string | null
  created_at: string
  updated_at: string
}

// Singleton do cliente
let supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    }

    supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return supabase
}

/**
 * Verifica se um evento ja foi processado (idempotencia)
 * Chave: (chat_id, message_id) - docs/RULES.md R3
 */
export async function eventExists(chatId: string, messageId: string): Promise<boolean> {
  const client = getSupabaseClient()
  
  const { data, error } = await client
    .from('events')
    .select('id')
    .eq('chat_id', chatId)
    .eq('message_id', messageId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking event existence:', error)
  }

  return !!data
}

/**
 * Cria um novo evento
 */
export async function createEvent(params: {
  chatId: string
  messageId: string
  fromUserId?: string
  audioFileId?: string
  audioDurationSec?: number
}): Promise<{ id: string; traceId: string } | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('events')
    .insert({
      chat_id: params.chatId,
      message_id: params.messageId,
      from_user_id: params.fromUserId || null,
      audio_file_id: params.audioFileId || null,
      audio_duration_sec: params.audioDurationSec || null,
      status: 'received'
    })
    .select('id, trace_id')
    .single()

  if (error) {
    // Constraint violation = evento ja existe (idempotencia)
    if (error.code === '23505') {
      console.log(`Event already exists for chat=${params.chatId}, message=${params.messageId}`)
      return null
    }
    console.error('Error creating event:', error)
    return null
  }

  return { id: data.id, traceId: data.trace_id }
}

/**
 * Atualiza um evento existente
 */
export async function updateEvent(
  eventId: string,
  updates: {
    transcription?: string
    parsedIntent?: Record<string, unknown>
    notionAction?: Record<string, unknown>
    status?: EventStatus
    errorMessage?: string
  }
): Promise<boolean> {
  const client = getSupabaseClient()

  const updateData: Record<string, unknown> = {}
  
  if (updates.transcription !== undefined) updateData.transcription = updates.transcription
  if (updates.parsedIntent !== undefined) updateData.parsed_intent = updates.parsedIntent
  if (updates.notionAction !== undefined) updateData.notion_action = updates.notionAction
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage

  const { error } = await client
    .from('events')
    .update(updateData)
    .eq('id', eventId)

  if (error) {
    console.error('Error updating event:', error)
    return false
  }

  return true
}

/**
 * Busca eventos com falha para retry
 */
export async function getFailedEvents(limit: number = 100): Promise<Event[]> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching failed events:', error)
    return []
  }

  return data || []
}

/**
 * Upsert no mapeamento de tarefas
 */
export async function upsertTaskMap(params: {
  notionPageId: string
  taskTitle?: string
  lastSeenStatus?: string
  createdFromMessageId?: string
}): Promise<boolean> {
  const client = getSupabaseClient()

  const { error } = await client
    .from('tasks_map')
    .upsert({
      notion_page_id: params.notionPageId,
      task_title: params.taskTitle || null,
      last_seen_status: params.lastSeenStatus || null,
      created_from_message_id: params.createdFromMessageId || null
    }, {
      onConflict: 'notion_page_id'
    })

  if (error) {
    console.error('Error upserting task map:', error)
    return false
  }

  return true
}

/**
 * Busca tarefa por titulo aproximado
 */
export async function getTaskByTitle(title: string): Promise<TaskMap | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('tasks_map')
    .select('*')
    .ilike('task_title', `%${title}%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching task by title:', error)
  }

  return data || null
}

/**
 * Busca tarefa por page_id do Notion
 */
export async function getTaskByPageId(pageId: string): Promise<TaskMap | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('tasks_map')
    .select('*')
    .eq('notion_page_id', pageId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching task by page id:', error)
  }

  return data || null
}
