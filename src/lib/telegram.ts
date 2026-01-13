/**
 * Cliente Telegram para o AI Secretary
 * 
 * Responsavel por (docs/05_INTEGRATIONS.md - 5.1):
 * - Baixar arquivos de audio
 * - Enviar mensagens de confirmacao
 * 
 * NOTA: O sistema usa WEBHOOK (nao polling)
 */

// Tipos do Telegram
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export interface TelegramMessage {
  message_id: number
  from?: {
    id: number
    first_name: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  date: number
  voice?: {
    file_id: string
    duration: number
    file_size?: number
  }
  audio?: {
    file_id: string
    duration: number
    file_size?: number
  }
  text?: string
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required')
  }
  return token
}

function getAllowedUsers(): number[] {
  const users = process.env.TELEGRAM_ALLOWED_USERS
  if (!users) return []
  
  return users
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id))
}

/**
 * Verifica se o usuario esta autorizado
 */
export function isUserAllowed(userId: number): boolean {
  const allowedUsers = getAllowedUsers()
  
  // Se nao ha lista, permite todos (apenas para desenvolvimento)
  if (allowedUsers.length === 0) {
    console.warn('TELEGRAM_ALLOWED_USERS not set - allowing all users')
    return true
  }
  
  return allowedUsers.includes(userId)
}

/**
 * Extrai dados de audio de uma mensagem
 */
export function extractAudioData(message: TelegramMessage): {
  fileId: string
  duration: number
} | null {
  const voice = message.voice
  const audio = message.audio
  
  if (voice) {
    return { fileId: voice.file_id, duration: voice.duration }
  }
  
  if (audio) {
    return { fileId: audio.file_id, duration: audio.duration }
  }
  
  return null
}

/**
 * Baixa um arquivo de audio do Telegram
 */
export async function downloadAudio(fileId: string): Promise<Buffer | null> {
  try {
    const token = getBotToken()
    
    // 1. Obter file_path
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
    )
    
    if (!fileInfoResponse.ok) {
      console.error('Error getting file info:', await fileInfoResponse.text())
      return null
    }
    
    const fileInfo = await fileInfoResponse.json() as { ok: boolean; result?: { file_path: string } }
    
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      console.error('Invalid file info response:', fileInfo)
      return null
    }
    
    // 2. Baixar o arquivo
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`
    const downloadResponse = await fetch(downloadUrl)
    
    if (!downloadResponse.ok) {
      console.error('Error downloading file:', await downloadResponse.text())
      return null
    }
    
    const arrayBuffer = await downloadResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error downloading audio:', error)
    return null
  }
}

/**
 * Envia uma mensagem de texto para um chat
 */
export async function sendMessage(
  chatId: number,
  text: string,
  replyToMessageId?: number
): Promise<boolean> {
  try {
    const token = getBotToken()
    
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    }
    
    if (replyToMessageId) {
      body.reply_to_message_id = replyToMessageId
    }
    
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
    
    if (!response.ok) {
      console.error('Error sending message:', await response.text())
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error sending message:', error)
    return false
  }
}

/**
 * Valida o secret do webhook (opcional mas recomendado)
 */
export function validateWebhookSecret(secretHeader: string | null): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  
  // Se nao ha secret configurado, permite (mas avisa)
  if (!expectedSecret) {
    console.warn('TELEGRAM_WEBHOOK_SECRET not set - skipping validation')
    return true
  }
  
  return secretHeader === expectedSecret
}
