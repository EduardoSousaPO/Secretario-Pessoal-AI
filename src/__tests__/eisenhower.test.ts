/**
 * Testes para o classificador Eisenhower
 */

import { describe, it, expect } from 'vitest'
import { 
  classify, 
  getStatus, 
  getEisenhowerFromStatus, 
  classifyWithStatus 
} from '../lib/eisenhower'

describe('Eisenhower Classifier', () => {
  describe('classify', () => {
    it('should return Do for High importance and High urgency', () => {
      expect(classify('High', 'High')).toBe('Do')
    })

    it('should return Do for High importance and Medium urgency', () => {
      expect(classify('High', 'Medium')).toBe('Do')
    })

    it('should return Do for Medium importance and High urgency', () => {
      expect(classify('Medium', 'High')).toBe('Do')
    })

    it('should return Do for Medium importance and Medium urgency', () => {
      expect(classify('Medium', 'Medium')).toBe('Do')
    })

    it('should return Decide for High importance and Low urgency', () => {
      expect(classify('High', 'Low')).toBe('Decide')
    })

    it('should return Decide for High importance and null urgency', () => {
      expect(classify('High', null)).toBe('Decide')
    })

    it('should return Decide for Medium importance and Low urgency', () => {
      expect(classify('Medium', 'Low')).toBe('Decide')
    })

    it('should return Decide for Medium importance and null urgency', () => {
      expect(classify('Medium', null)).toBe('Decide')
    })

    it('should return Delegate for Low importance and High urgency', () => {
      expect(classify('Low', 'High')).toBe('Delegate')
    })

    it('should return Delegate for Low importance and Medium urgency', () => {
      expect(classify('Low', 'Medium')).toBe('Delegate')
    })

    it('should return Delegate for null importance and High urgency', () => {
      expect(classify(null, 'High')).toBe('Delegate')
    })

    it('should return Delegate for null importance and Medium urgency', () => {
      expect(classify(null, 'Medium')).toBe('Delegate')
    })

    it('should return Delete for Low importance and Low urgency', () => {
      expect(classify('Low', 'Low')).toBe('Delete')
    })

    it('should return Delete for null importance and null urgency', () => {
      expect(classify(null, null)).toBe('Delete')
    })

    it('should return Delete for Low importance and null urgency', () => {
      expect(classify('Low', null)).toBe('Delete')
    })

    it('should return Delete for null importance and Low urgency', () => {
      expect(classify(null, 'Low')).toBe('Delete')
    })
  })

  describe('getStatus', () => {
    it('should return canonical status for Do', () => {
      expect(getStatus('Do')).toBe('DO (Agora)')
    })

    it('should return canonical status for Decide', () => {
      expect(getStatus('Decide')).toBe('DECIDE (Agendar)')
    })

    it('should return canonical status for Delegate', () => {
      expect(getStatus('Delegate')).toBe('DELEGATE (Delegar)')
    })

    it('should return canonical status for Delete', () => {
      expect(getStatus('Delete')).toBe('DELETE (Eliminar)')
    })
  })

  describe('getEisenhowerFromStatus', () => {
    it('should return Do for DO (Agora)', () => {
      expect(getEisenhowerFromStatus('DO (Agora)')).toBe('Do')
    })

    it('should return Decide for DECIDE (Agendar)', () => {
      expect(getEisenhowerFromStatus('DECIDE (Agendar)')).toBe('Decide')
    })

    it('should return Delegate for DELEGATE (Delegar)', () => {
      expect(getEisenhowerFromStatus('DELEGATE (Delegar)')).toBe('Delegate')
    })

    it('should return Delete for DELETE (Eliminar)', () => {
      expect(getEisenhowerFromStatus('DELETE (Eliminar)')).toBe('Delete')
    })

    it('should return null for DONE', () => {
      expect(getEisenhowerFromStatus('DONE')).toBeNull()
    })

    it('should return null for unknown status', () => {
      expect(getEisenhowerFromStatus('Unknown')).toBeNull()
    })
  })

  describe('classifyWithStatus', () => {
    it('should return both eisenhower and status', () => {
      const result = classifyWithStatus('High', 'High')
      expect(result.eisenhower).toBe('Do')
      expect(result.status).toBe('DO (Agora)')
    })

    it('should work for all quadrants', () => {
      expect(classifyWithStatus('High', 'Low')).toEqual({
        eisenhower: 'Decide',
        status: 'DECIDE (Agendar)'
      })

      expect(classifyWithStatus('Low', 'High')).toEqual({
        eisenhower: 'Delegate',
        status: 'DELEGATE (Delegar)'
      })

      expect(classifyWithStatus('Low', 'Low')).toEqual({
        eisenhower: 'Delete',
        status: 'DELETE (Eliminar)'
      })
    })
  })
})
