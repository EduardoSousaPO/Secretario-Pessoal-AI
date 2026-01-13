/**
 * Cliente OpenAI para o AI Secretary
 * 
 * Responsavel por (docs/05_INTEGRATIONS.md - 5.3):
 * - Transcricao de audio (Whisper)
 * - Interpretacao de intencoes (GPT)
 * 
 * PRINCIPIO OPENAI-FIRST (docs/RULES.md):
 * - TODA interpretacao semantica e responsabilidade da OpenAI
 * - O backend NAO implementa logica de NLP
 */

import OpenAI from 'openai'

// Singleton do cliente
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Transcreve um arquivo de audio para texto
 */
export async function transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.ogg'): Promise<string | null> {
  try {
    const client = getOpenAIClient()
    
    // Criar File object para a API usando Uint8Array
    const uint8Array = new Uint8Array(audioBuffer)
    const file = new File([uint8Array], filename, { type: 'audio/ogg' })
    
    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: file,
      language: 'pt'
    })

    return transcription.text
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return null
  }
}

// Schema canonico de intencao (docs/06_WORKFLOWS.md - 6.5)
export interface ParsedIntent {
  intent: 'create_task' | 'update_task' | 'complete_task' | 'list_tasks' | 'noop'
  confidence: number
  task_ref: {
    notion_page_id: string | null
    title_guess: string | null
  }
  fields: {
    title: string | null
    notes: string | null
    due_date: string | null
    tags: string[]
    effort: 'S' | 'M' | 'L' | null
    status: string | null
  }
}

// Prompt do sistema para o parser (OpenAI-First) - Kanban Simples
const SYSTEM_PROMPT = `Voce e um parser de comandos de voz para um sistema de gestao de tarefas com Kanban simples.

Sua funcao e analisar a transcricao de um audio e extrair a intencao e os campos relevantes.

## Intencoes possiveis:
- create_task: criar uma nova tarefa
- update_task: atualizar uma tarefa existente  
- complete_task: marcar uma tarefa como concluida
- list_tasks: listar tarefas pendentes
- noop: nenhuma acao clara (conversa casual, despedida, etc)

## Regras de interpretacao:
IMPORTANTE: O usuario geralmente NAO vai dizer "criar tarefa" explicitamente. Voce deve inferir a intencao pelo contexto.

### create_task - Qualquer uma dessas situacoes:
- "criar tarefa X" / "nova tarefa X" / "adicionar tarefa X" (explicito)
- "preciso fazer X" / "tenho que X" / "devo X" (implicito)
- "lembrar de X" / "nao esquecer de X" (implicito)
- "agendar X" / "marcar X" / "combinar X" (implicito)
- "pagar X" / "enviar X" / "comprar X" / "ligar para X" (acao direta)
- "preencher X" / "confeccionar X" / "preparar X" (acao direta)
- Qualquer frase que descreva uma ACAO a ser feita no futuro => create_task

### update_task:
- "atualizar tarefa X para..." / "mover tarefa X para..."
- "colocar X em andamento" / "pausar X"

### complete_task:
- "marcar tarefa X como concluida" / "concluir X" / "feito X" / "finalizar X"
- "ja fiz X" / "terminei X" / "acabei X"

### list_tasks:
- "minhas tarefas" / "pendencias" / "o que tenho" / "listar tarefas"

### noop - APENAS para:
- Conversas casuais: "oi", "tudo bem", "obrigado"
- Despedidas: "ate mais", "tchau", "ate a proxima"
- Frases sem acao: "isso ai", "beleza", "ok"
- Audio incompreensivel ou muito curto

## Status do Kanban (colunas):
- "Backlog": tarefas novas, a fazer (PADRAO para criar tarefa)
- "Em Andamento": tarefas em progresso
- "Pausado": tarefas pausadas/paradas
- "Concluido": tarefas finalizadas

## Extracao de campos:
1. Extraia o titulo da tarefa de forma concisa e clara
2. Se mencionar data (amanha, segunda, dia X), converta para YYYY-MM-DD
3. Se mencionar tags (trabalho, pessoal, financeiro), extraia em "tags"
4. Se mencionar esforco (rapido/pequeno=S, medio=M, grande/demorado=L), extraia em "effort"
5. Se mencionar status (backlog, em andamento, pausado, concluido), extraia em "status"

## Valores validos:
- effort: "S" | "M" | "L" | null
- status: "Backlog" | "Em Andamento" | "Pausado" | "Concluido" | null
- tags: ["Trabalho", "Pessoal", "Financeiro", "Saude", "Estudos"]

## Confidence:
- 90-100: Comando claro com acao especifica (ex: "preciso pagar a conta de luz")
- 70-89: Comando razoavelmente claro (ex: "combinar reuniao com fulano")
- 60-69: Comando ambiguo mas interpretavel (ex: "aquele negocio do relatorio")
- 0-59: APENAS para conversas casuais, despedidas, ou audio incompreensivel

IMPORTANTE: Se o audio descreve uma ACAO a ser feita, mesmo sem dizer "criar tarefa", 
a confianca deve ser >= 70. Seja generoso na interpretacao!

## Schema de saida (JSON estrito):
{
  "intent": "create_task|update_task|complete_task|list_tasks|noop",
  "confidence": 0-100,
  "task_ref": {
    "notion_page_id": "string|null",
    "title_guess": "string|null"
  },
  "fields": {
    "title": "string|null",
    "notes": "string|null",
    "due_date": "YYYY-MM-DD|null",
    "tags": ["string"],
    "effort": "S|M|L|null",
    "status": "Backlog|Em Andamento|Pausado|Concluido|null"
  }
}

IMPORTANTE: Responda APENAS com o JSON valido, sem explicacoes ou markdown.`

/**
 * Interpreta uma transcricao e extrai intencao + campos
 * 
 * PRINCIPIO OPENAI-FIRST: Toda interpretacao e delegada a OpenAI
 */
export async function parseIntent(transcription: string): Promise<ParsedIntent> {
  // Fallback para transcricao vazia
  if (!transcription || !transcription.trim()) {
    return createNoopResponse('Transcricao vazia')
  }

  try {
    const client = getOpenAIClient()

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Transcricao do audio:\n\n${transcription}` }
      ]
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return createNoopResponse('OpenAI nao retornou conteudo')
    }

    const parsed = JSON.parse(content) as ParsedIntent
    
    // Validar e normalizar (apenas schema, NAO semantica)
    return validateAndNormalize(parsed)
  } catch (error) {
    console.error('Error parsing intent:', error)
    return createNoopResponse(`Erro ao interpretar: ${error}`)
  }
}

/**
 * Valida e normaliza o resultado do parser
 * 
 * NOTA: O backend APENAS valida schema, NAO interpreta semantica
 */
function validateAndNormalize(data: Partial<ParsedIntent>): ParsedIntent {
  const validIntents = ['create_task', 'update_task', 'complete_task', 'list_tasks', 'noop']
  const validEffort = ['S', 'M', 'L', null]
  const validStatus = ['Backlog', 'Em Andamento', 'Pausado', 'Concluido', null]

  // Garantir campos obrigatorios
  const intent = validIntents.includes(data.intent as string) ? data.intent! : 'noop'
  const confidence = typeof data.confidence === 'number' 
    ? Math.max(0, Math.min(100, data.confidence)) 
    : 50

  const taskRef = {
    notion_page_id: data.task_ref?.notion_page_id || null,
    title_guess: data.task_ref?.title_guess || null
  }

  const fields = (data.fields || {}) as Partial<ParsedIntent['fields']>
  
  return {
    intent: intent as ParsedIntent['intent'],
    confidence,
    task_ref: taskRef,
    fields: {
      title: fields.title || null,
      notes: fields.notes || null,
      due_date: isValidDate(fields.due_date) ? fields.due_date : null,
      tags: Array.isArray(fields.tags) ? fields.tags : [],
      effort: validEffort.includes(fields.effort as string) ? fields.effort as ParsedIntent['fields']['effort'] : null,
      status: validStatus.includes(fields.status as string) ? (fields.status as string | null) : null
    }
  }
}

function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

function createNoopResponse(reason: string): ParsedIntent {
  return {
    intent: 'noop',
    confidence: 0,
    task_ref: { notion_page_id: null, title_guess: null },
    fields: {
      title: null,
      notes: reason,
      due_date: null,
      tags: [],
      effort: null,
      status: null
    }
  }
}

// Threshold de confianca minima (docs/RULES.md R4)
export const CONFIDENCE_THRESHOLD = 60

export function isConfidenceSufficient(intent: ParsedIntent): boolean {
  return intent.confidence >= CONFIDENCE_THRESHOLD
}
