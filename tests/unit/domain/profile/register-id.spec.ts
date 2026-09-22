// @test-link [[module_register_window_resolution_primitives]]
import { describe, expect, it } from 'vitest'

import { CANONICAL_REGISTER_INDEX, CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'

describe('canonical register order', () => {
  it('is fixed as [Low, Middle, High]', () => {
    expect(CANONICAL_REGISTER_ORDER).toEqual(['Low', 'Middle', 'High'])
  })

  it('cannot be mutated', () => {
    expect(() => {
      // @ts-expect-error the canonical order is a readonly, frozen array
      CANONICAL_REGISTER_ORDER.push('Extra')
    }).toThrow()
    expect(CANONICAL_REGISTER_ORDER).toEqual(['Low', 'Middle', 'High'])
  })
})

describe('canonical register index', () => {
  it('maps Low=0, Middle=1, High=2', () => {
    expect(CANONICAL_REGISTER_INDEX.Low).toBe(0)
    expect(CANONICAL_REGISTER_INDEX.Middle).toBe(1)
    expect(CANONICAL_REGISTER_INDEX.High).toBe(2)
  })

  it('cannot be mutated', () => {
    expect(() => {
      // @ts-expect-error the canonical index lookup is frozen
      CANONICAL_REGISTER_INDEX.Low = 99
    }).toThrow()
    expect(CANONICAL_REGISTER_INDEX.Low).toBe(0)
  })
})
