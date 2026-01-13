/**
 * Webhook do Telegram para o AI Secretary
 * 
 * Endpoint: POST /api/telegram/webhook
 * 
 * Fluxo (docs/06_WORKFLOWS.md):
 * 1. Recebe update do Telegram
 * 2. Verifica idempotencia no Supabase
 * 3. Baixa audio e transcreve (OpenAI)
 * 4. Interpreta intencao (OpenAI)
 * 5. Executa acao no Notion
 * 6. Responde no Telegram
 * 
 * PRINCIPIO OPENAI-FIRST: Toda interpretacao e delegada a OpenAI
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  TelegramUpdate, 
  TelegramMessage,
  isUserAllowed, 
  extractAudioData, 
  downloadAudio, 
  sendMessage,
  validateWebhookSecret
} from '@/lib/telegram'
import { 
  eventExists, 
  createEvent, 
  updateEvent,
  upsertTaskMap,
  getTaskByTitle,
  getTaskByPageId
} from '@/lib/supabase'
import { transcribeAudio, parseIntent, isConfidenceSufficient, CONFIDENCE_THRESHOLD } from '@/lib/openai'
import { classifyWithStatus, getEisenhowerFromStatus } from '@/lib/eisenhower'
import { createTask, updateTask, getPendingTasks, queryTasks } from '@/lib/notion'

export async function POST(request: NextRequest) {
  try {
    // Validar webhook secret (opcional)
    const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (!validateWebhookSecret(secretHeader)) {
      console.warn('Invalid webhook secret')
      return NextResponse.json({ ok: true }) // Retorna 200 para nao gerar retries
    }

    const update = await request.json() as TelegramUpdate
    
    // Ignorar updates sem mensagem
    if (!update.message) {
      return NextResponse.json({ ok: true })
    }

    const message = update.message
    const chatId = message.chat.id
    const messageId = message.message_id
    const userId = message.from?.id

    // Verificar se e mensagem de audio
    const audioData = extractAudioData(message)
    if (!audioData) {
      // Ignorar mensagens sem audio (nao e erro)
      return NextResponse.json({ ok: true })
    }

    // Verificar usuario autorizado (docs/08_SECURITY_PRIVACY.md)
    if (userId && !isUserAllowed(userId)) {
      console.log(`User ${userId} not allowed`)
      return NextResponse.json({ ok: true })
    }

    // Processar mensagem de audio
    await processVoiceMessage(message, audioData)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Retornar 200 para evitar retries do Telegram
    return NextResponse.json({ ok: true })
  }
}

async function processVoiceMessage(
  message: TelegramMessage,
  audioData: { fileId: string; duration: number }
) {
  const chatId = message.chat.id
  const messageId = message.message_id
  const userId = message.from?.id

  // 1. Verificar idempotencia (docs/RULES.md R3)
  const exists = await eventExists(String(chatId), String(messageId))
  if (exists) {
    console.log(`Event already exists for chat=${chatId}, message=${messageId}`)
    return
  }

  // 2. Criar evento no Supabase
  const event = await createEvent({
    chatId: String(chatId),
    messageId: String(messageId),
    fromUserId: userId ? String(userId) : undefined,
    audioFileId: audioData.fileId,
    audioDurationSec: audioData.duration
  })

  if (!event) {
    // Provavelmente ja existe (constraint violation)
    return
  }

  const { id: eventId, traceId } = event
  console.log(`[${traceId}] Processing voice message from chat=${chatId}`)

  try {
    // 3. Baixar audio do Telegram
    const audioBuffer = await downloadAudio(audioData.fileId)
    if (!audioBuffer) {
      throw new Error('Failed to download audio')
    }

    // 4. Transcrever audio (OpenAI Whisper)
    const transcription = await transcribeAudio(audioBuffer)
    if (!transcription) {
      throw new Error('Failed to transcribe audio')
    }

    await updateEvent(eventId, { 
      transcription, 
      status: 'transcribed' 
    })
    console.log(`[${traceId}] Transcription: ${transcription.substring(0, 100)}...`)

    // 5. Interpretar intencao (OpenAI GPT) - OPENAI-FIRST
    const parsedIntent = await parseIntent(transcription)
    await updateEvent(eventId, { 
      parsedIntent, 
      status: 'parsed' 
    })
    console.log(`[${traceId}] Intent: ${parsedIntent.intent} (confidence: ${parsedIntent.confidence})`)

    // 6. Verificar confianca (docs/RULES.md R4)
    if (!isConfidenceSufficient(parsedIntent)) {
      const response = `Nao entendi bem sua intencao (confianca: ${parsedIntent.confidence}%). ` +
        `Por favor, tente reformular.\n\n_Transcricao: "${transcription.substring(0, 100)}..."_`
      
      await sendMessage(chatId, response, messageId)
      await updateEvent(eventId, { 
        notionAction: { action: 'noop', reason: 'low_confidence' },
        status: 'synced'
      })
      return
    }

    // 7. Executar acao baseada na intencao
    const result = await executeIntent(parsedIntent, chatId, messageId, transcription, traceId)
    
    // 8. Atualizar evento e responder
    await updateEvent(eventId, {
      notionAction: result.notionAction,
      status: 'synced'
    })

    await sendMessage(chatId, result.response, messageId)

  } catch (error) {
    console.error(`[${traceId}] Error processing message:`, error)
    
    await updateEvent(eventId, {
      status: 'failed',
      errorMessage: String(error)
    })

    await sendMessage(
      chatId,
      'Ocorreu um erro ao processar sua solicitacao. Tente novamente.',
      messageId
    )
  }
}

async function executeIntent(
  intent: Awaited<ReturnType<typeof parseIntent>>,
  chatId: number,
  messageId: number,
  transcription: string,
  traceId: string
): Promise<{ response: string; notionAction: Record<string, unknown> }> {
  const { fields, task_ref } = intent

  switch (intent.intent) {
    case 'create_task': {
      // Classificar Eisenhower (mapeamento deterministico)
      const { eisenhower, status } = classifyWithStatus(
        fields.importance,
        fields.urgency
      )

      const taskTitle = fields.title || transcription.substring(0, 50)
      
      const newPage = await createTask({
        Name: taskTitle,
        Status: status,
        Eisenhower: eisenhower,
        Importance: fields.importance || undefined,
        Urgency: fields.urgency || undefined,
        Due: fields.due_date || undefined,
        Notes: fields.notes || undefined,
        Source: `telegram:${chatId}:${messageId}`,
        Confidence: intent.confidence,
        Tags: fields.tags.length > 0 ? fields.tags : undefined,
        Effort: fields.effort || undefined
      })

      if (!newPage) {
        throw new Error('Failed to create task in Notion')
      }

      // Salvar no tasks_map
      await upsertTaskMap({
        notionPageId: newPage.id,
        taskTitle,
        lastSeenStatus: status,
        createdFromMessageId: String(messageId)
      })

      return {
        response: `Tarefa *"${taskTitle}"* criada na coluna *${status}*.\n[Ver no Notion](${newPage.url})`,
        notionAction: { action: 'create', pageId: newPage.id, url: newPage.url }
      }
    }

    case 'update_task': {
      // Encontrar tarefa alvo
      let targetTask = null
      
      if (task_ref.notion_page_id) {
        targetTask = await getTaskByPageId(task_ref.notion_page_id)
      } else if (task_ref.title_guess || fields.title) {
        targetTask = await getTaskByTitle(task_ref.title_guess || fields.title!)
      }

      if (!targetTask) {
        return {
          response: `Nao encontrei a tarefa *"${task_ref.title_guess || fields.title}"* para atualizar. ` +
            `Por favor, seja mais especifico ou crie uma nova.`,
          notionAction: { action: 'update_failed', reason: 'task_not_found' }
        }
      }

      // Preparar atualizacoes
      const updates: Record<string, unknown> = {}
      
      if (fields.title) updates.Name = fields.title
      if (fields.notes) updates.Notes = fields.notes
      if (fields.due_date) updates.Due = fields.due_date
      if (fields.tags.length > 0) updates.Tags = fields.tags
      if (fields.effort) updates.Effort = fields.effort
      
      // Recalcular Eisenhower se necessario
      if (fields.importance || fields.urgency) {
        const currentEisenhower = getEisenhowerFromStatus(targetTask.last_seen_status || '')
        const newImportance = fields.importance || (currentEisenhower ? 'Medium' : null)
        const newUrgency = fields.urgency || (currentEisenhower ? 'Medium' : null)
        
        const { eisenhower, status } = classifyWithStatus(newImportance, newUrgency)
        updates.Eisenhower = eisenhower
        updates.Status = status
        if (fields.importance) updates.Importance = fields.importance
        if (fields.urgency) updates.Urgency = fields.urgency
      }

      // Permitir update direto de status
      if (fields.status) {
        updates.Status = fields.status
        const eisenhower = getEisenhowerFromStatus(fields.status)
        if (eisenhower) updates.Eisenhower = eisenhower
      }

      const updatedPage = await updateTask(targetTask.notion_page_id, updates)
      
      if (!updatedPage) {
        throw new Error('Failed to update task in Notion')
      }

      // Atualizar tasks_map
      await upsertTaskMap({
        notionPageId: targetTask.notion_page_id,
        taskTitle: (updates.Name as string) || targetTask.task_title || undefined,
        lastSeenStatus: (updates.Status as string) || targetTask.last_seen_status || undefined
      })

      return {
        response: `Tarefa *"${targetTask.task_title}"* atualizada.\n[Ver no Notion](${updatedPage.url})`,
        notionAction: { action: 'update', pageId: updatedPage.id, url: updatedPage.url }
      }
    }

    case 'complete_task': {
      // Encontrar tarefa alvo
      let targetTask = null
      
      if (task_ref.notion_page_id) {
        targetTask = await getTaskByPageId(task_ref.notion_page_id)
      } else if (task_ref.title_guess || fields.title) {
        targetTask = await getTaskByTitle(task_ref.title_guess || fields.title!)
      }

      if (!targetTask) {
        return {
          response: `Nao encontrei a tarefa *"${task_ref.title_guess || fields.title}"* para concluir. ` +
            `Por favor, seja mais especifico.`,
          notionAction: { action: 'complete_failed', reason: 'task_not_found' }
        }
      }

      const updatedPage = await updateTask(targetTask.notion_page_id, { Status: 'DONE' })
      
      if (!updatedPage) {
        throw new Error('Failed to complete task in Notion')
      }

      // Atualizar tasks_map
      await upsertTaskMap({
        notionPageId: targetTask.notion_page_id,
        lastSeenStatus: 'DONE'
      })

      return {
        response: `Tarefa *"${targetTask.task_title}"* marcada como concluida!\n[Ver no Notion](${updatedPage.url})`,
        notionAction: { action: 'complete', pageId: updatedPage.id, url: updatedPage.url }
      }
    }

    case 'list_tasks': {
      const tasks = await getPendingTasks(5)
      
      if (tasks.length === 0) {
        return {
          response: 'Nenhuma tarefa pendente encontrada.',
          notionAction: { action: 'list', count: 0 }
        }
      }

      let taskList = '*Suas tarefas pendentes:*\n\n'
      for (const task of tasks) {
        taskList += `• [${task.title}](${task.url}) - _${task.status}_\n`
      }

      return {
        response: taskList,
        notionAction: { action: 'list', count: tasks.length }
      }
    }

    case 'noop':
    default: {
      return {
        response: `Nao entendi sua intencao. Por favor, tente reformular.\n\n` +
          `_Transcricao: "${transcription.substring(0, 100)}..."_`,
        notionAction: { action: 'noop' }
      }
    }
  }
}

// GET para verificar se o endpoint esta funcionando
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'AI Secretary webhook is running',
    timestamp: new Date().toISOString()
  })
}
