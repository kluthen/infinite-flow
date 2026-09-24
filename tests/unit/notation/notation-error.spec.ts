import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'

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
