/**
 * Testes para o modulo de Status do Kanban
 */

import { describe, it, expect } from 'vitest'
import { 
  getDefaultStatus, 
  isValidStatus, 
  normalizeStatus,
  VALID_STATUSES,
  DEFAULT_STATUS
} from '../lib/eisenhower'

describe('Kanban Status', () => {
  describe('VALID_STATUSES', () => {
    it('should have exactly 4 statuses', () => {
      expect(VALID_STATUSES).toHaveLength(4)
    })

    it('should contain all expected statuses', () => {
      expect(VALID_STATUSES).toContain('Backlog')
      expect(VALID_STATUSES).toContain('Em Andamento')
      expect(VALID_STATUSES).toContain('Pausado')
      expect(VALID_STATUSES).toContain('Concluido')
    })
  })

  describe('DEFAULT_STATUS', () => {
    it('should be Backlog', () => {
      expect(DEFAULT_STATUS).toBe('Backlog')
    })
  })

  describe('getDefaultStatus', () => {
    it('should return Backlog', () => {
      expect(getDefaultStatus()).toBe('Backlog')
    })
  })

  describe('isValidStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidStatus('Backlog')).toBe(true)
      expect(isValidStatus('Em Andamento')).toBe(true)
      expect(isValidStatus('Pausado')).toBe(true)
      expect(isValidStatus('Concluido')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidStatus('Invalid')).toBe(false)
      expect(isValidStatus('backlog')).toBe(false) // case sensitive
      expect(isValidStatus('')).toBe(false)
      expect(isValidStatus('Done')).toBe(false)
    })
  })

  describe('normalizeStatus', () => {
    it('should return default for null/undefined', () => {
      expect(normalizeStatus(null)).toBe('Backlog')
      expect(normalizeStatus(undefined)).toBe('Backlog')
      expect(normalizeStatus('')).toBe('Backlog')
    })

    it('should normalize Backlog variations', () => {
      expect(normalizeStatus('backlog')).toBe('Backlog')
      expect(normalizeStatus('back log')).toBe('Backlog')
      expect(normalizeStatus('a fazer')).toBe('Backlog')
      expect(normalizeStatus('to do')).toBe('Backlog')
      expect(normalizeStatus('todo')).toBe('Backlog')
      expect(normalizeStatus('novo')).toBe('Backlog')
      expect(normalizeStatus('nova')).toBe('Backlog')
    })

    it('should normalize Em Andamento variations', () => {
      expect(normalizeStatus('em andamento')).toBe('Em Andamento')
      expect(normalizeStatus('andamento')).toBe('Em Andamento')
      expect(normalizeStatus('em progresso')).toBe('Em Andamento')
      expect(normalizeStatus('fazendo')).toBe('Em Andamento')
      expect(normalizeStatus('doing')).toBe('Em Andamento')
      expect(normalizeStatus('in progress')).toBe('Em Andamento')
    })

    it('should normalize Pausado variations', () => {
      expect(normalizeStatus('pausado')).toBe('Pausado')
      expect(normalizeStatus('pausada')).toBe('Pausado')
      expect(normalizeStatus('parado')).toBe('Pausado')
      expect(normalizeStatus('parada')).toBe('Pausado')
      expect(normalizeStatus('on hold')).toBe('Pausado')
    })

    it('should normalize Concluido variations', () => {
      expect(normalizeStatus('concluido')).toBe('Concluido')
      expect(normalizeStatus('concluida')).toBe('Concluido')
      expect(normalizeStatus('feito')).toBe('Concluido')
      expect(normalizeStatus('feita')).toBe('Concluido')
      expect(normalizeStatus('done')).toBe('Concluido')
      expect(normalizeStatus('finalizado')).toBe('Concluido')
      expect(normalizeStatus('finalizada')).toBe('Concluido')
      expect(normalizeStatus('completo')).toBe('Concluido')
      expect(normalizeStatus('completa')).toBe('Concluido')
    })

    it('should return default for unknown values', () => {
      expect(normalizeStatus('unknown')).toBe('Backlog')
      expect(normalizeStatus('xyz')).toBe('Backlog')
    })

    it('should handle whitespace', () => {
      expect(normalizeStatus('  backlog  ')).toBe('Backlog')
      expect(normalizeStatus('  em andamento  ')).toBe('Em Andamento')
    })

    it('should be case insensitive', () => {
      expect(normalizeStatus('BACKLOG')).toBe('Backlog')
      expect(normalizeStatus('EM ANDAMENTO')).toBe('Em Andamento')
      expect(normalizeStatus('PAUSADO')).toBe('Pausado')
      expect(normalizeStatus('CONCLUIDO')).toBe('Concluido')
    })
  })
})
