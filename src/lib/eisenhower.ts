/**
 * Status do Kanban para o AI Secretary
 * 
 * Colunas simples (docs/04_DATA_MODEL.md):
 * - Backlog: Tarefas a fazer
 * - Em Andamento: Tarefas em progresso
 * - Pausado: Tarefas pausadas
 * - Concluido: Tarefas finalizadas
 */

export type KanbanStatus = 'Backlog' | 'Em Andamento' | 'Pausado' | 'Concluido'

// Status validos (CANONICO)
export const VALID_STATUSES: KanbanStatus[] = ['Backlog', 'Em Andamento', 'Pausado', 'Concluido']

// Status padrao para novas tarefas
export const DEFAULT_STATUS: KanbanStatus = 'Backlog'

/**
 * Retorna o status padrao para novas tarefas
 */
export function getDefaultStatus(): KanbanStatus {
  return DEFAULT_STATUS
}

/**
 * Valida se um status e valido
 */
export function isValidStatus(status: string): status is KanbanStatus {
  return VALID_STATUSES.includes(status as KanbanStatus)
}

/**
 * Normaliza o status (caso venha com variações)
 */
export function normalizeStatus(status: string | null | undefined): KanbanStatus {
  if (!status) return DEFAULT_STATUS
  
  const normalized = status.toLowerCase().trim()
  
  // Mapeamento de variações comuns
  const statusMap: Record<string, KanbanStatus> = {
    'backlog': 'Backlog',
    'back log': 'Backlog',
    'a fazer': 'Backlog',
    'to do': 'Backlog',
    'todo': 'Backlog',
    'novo': 'Backlog',
    'nova': 'Backlog',
    
    'em andamento': 'Em Andamento',
    'andamento': 'Em Andamento',
    'em progresso': 'Em Andamento',
    'fazendo': 'Em Andamento',
    'doing': 'Em Andamento',
    'in progress': 'Em Andamento',
    
    'pausado': 'Pausado',
    'pausada': 'Pausado',
    'parado': 'Pausado',
    'parada': 'Pausado',
    'on hold': 'Pausado',
    
    'concluido': 'Concluido',
    'concluida': 'Concluido',
    'feito': 'Concluido',
    'feita': 'Concluido',
    'done': 'Concluido',
    'finalizado': 'Concluido',
    'finalizada': 'Concluido',
    'completo': 'Concluido',
    'completa': 'Concluido'
  }
  
  return statusMap[normalized] || DEFAULT_STATUS
}
