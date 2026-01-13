/**
 * Classificador da Matriz de Eisenhower
 * 
 * Mapeia combinacoes de Importancia e Urgencia para os quadrantes
 * (docs/04_DATA_MODEL.md - 4.6):
 * 
 * - Do        -> "DO (Agora)"       : Importante + Urgente
 * - Decide    -> "DECIDE (Agendar)" : Importante + Nao Urgente
 * - Delegate  -> "DELEGATE (Delegar)": Nao Importante + Urgente
 * - Delete    -> "DELETE (Eliminar)": Nao Importante + Nao Urgente
 * 
 * IMPORTANTE: Os status sao CANONICOS (docs/04_DATA_MODEL.md)
 * Este e um mapeamento DETERMINISTICO, nao requer interpretacao
 */

export type EisenhowerQuadrant = 'Do' | 'Decide' | 'Delegate' | 'Delete'
export type KanbanStatus = 'DO (Agora)' | 'DECIDE (Agendar)' | 'DELEGATE (Delegar)' | 'DELETE (Eliminar)' | 'DONE'
export type ImportanceLevel = 'High' | 'Medium' | 'Low' | null
export type UrgencyLevel = 'High' | 'Medium' | 'Low' | null

// Mapeamento Eisenhower -> Status do Kanban (CANONICO - docs/04_DATA_MODEL.md - 4.6)
const STATUS_MAP: Record<EisenhowerQuadrant, KanbanStatus> = {
  'Do': 'DO (Agora)',
  'Decide': 'DECIDE (Agendar)',
  'Delegate': 'DELEGATE (Delegar)',
  'Delete': 'DELETE (Eliminar)'
}

/**
 * Classifica uma tarefa na Matriz de Eisenhower
 * 
 * Logica:
 * - High = considerado como "sim"
 * - Medium = considerado como "sim" (para nao perder tarefas)
 * - Low/null = considerado como "nao"
 */
export function classify(importance: ImportanceLevel, urgency: UrgencyLevel): EisenhowerQuadrant {
  // Determinar se e importante (High ou Medium = sim)
  const isImportant = importance === 'High' || importance === 'Medium'
  
  // Determinar se e urgente (High ou Medium = sim)
  const isUrgent = urgency === 'High' || urgency === 'Medium'
  
  // Matriz de Eisenhower
  if (isImportant && isUrgent) {
    return 'Do'  // Fazer agora
  } else if (isImportant && !isUrgent) {
    return 'Decide'  // Agendar
  } else if (!isImportant && isUrgent) {
    return 'Delegate'  // Delegar
  } else {
    return 'Delete'  // Eliminar/Baixa prioridade
  }
}

/**
 * Converte quadrante Eisenhower para status do Kanban
 */
export function getStatus(eisenhower: EisenhowerQuadrant): KanbanStatus {
  return STATUS_MAP[eisenhower] || 'DO (Agora)'
}

/**
 * Converte status do Kanban para quadrante Eisenhower
 */
export function getEisenhowerFromStatus(status: string): EisenhowerQuadrant | null {
  const reverseMap: Record<string, EisenhowerQuadrant> = {
    'DO (Agora)': 'Do',
    'DECIDE (Agendar)': 'Decide',
    'DELEGATE (Delegar)': 'Delegate',
    'DELETE (Eliminar)': 'Delete'
  }
  return reverseMap[status] || null
}

/**
 * Classifica e retorna tanto o quadrante quanto o status
 */
export function classifyWithStatus(
  importance: ImportanceLevel,
  urgency: UrgencyLevel
): { eisenhower: EisenhowerQuadrant; status: KanbanStatus } {
  const eisenhower = classify(importance, urgency)
  const status = getStatus(eisenhower)
  return { eisenhower, status }
}
