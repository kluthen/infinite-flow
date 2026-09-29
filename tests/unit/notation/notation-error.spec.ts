import { describe, expect, it } from 'vitest'

import { isStaffLayoutFailure, NotationError } from '@/notation/notation-error'

// @test-link [[module_notation_layout_preflight]]
describe('NotationError', () => {
  it('carries the original thrown value as the standard Error cause when given one', () => {
    const original = new Error('VexFlow RuntimeError: boom')
    const wrapped = new NotationError('notation_engraving_failed', 'wrapped', {}, original)

    expect(wrapped.cause).toBe(original)
    expect(wrapped.code).toBe('notation_engraving_failed')
  })

  it('leaves cause unset when none is given', () => {
    const error = new NotationError('notation_container_unavailable', 'no container', {})

    expect(error.cause).toBeUndefined()
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('isStaffLayoutFailure', () => {
  it('singles out the two staff layout failures from the retryable notation errors', () => {
    const layoutCodes = ['notation_no_room', 'notation_notes_too_wide'] as const
    const retryableCodes = [
      'notation_bounds_exceeded',
      'notation_font_unavailable',
      'notation_container_unavailable',
      'notation_engraving_failed',
    ] as const

    for (const code of layoutCodes) {
      expect(isStaffLayoutFailure(new NotationError(code, code, {}))).toBe(true)
    }
    for (const code of retryableCodes) {
      expect(isStaffLayoutFailure(new NotationError(code, code, {}))).toBe(false)
    }
  })
})
