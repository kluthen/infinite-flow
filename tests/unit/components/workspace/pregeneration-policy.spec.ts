/** The page-URL switch of the Idle pre-generation policy: `off`, `on` or absent, nothing else. */
import { describe, expect, it } from 'vitest'

import {
  pregenerationPolicyFromSearch,
  prewarmPolicyFromSearch,
} from '@/components/workspace/prewarm-policy'

// @test-link [[module_idle_pregeneration_queue]]
describe('pregenerationPolicyFromSearch', () => {
  // @test-link [[module_idle_pregeneration_queue]]
  it('enables pre-generation unless the URL asks for pregeneration=off', () => {
    expect(pregenerationPolicyFromSearch('')).toBe('enabled')
    expect(pregenerationPolicyFromSearch('?prewarm=off')).toBe('enabled')
    expect(pregenerationPolicyFromSearch('?pregeneration=on')).toBe('enabled')
    expect(pregenerationPolicyFromSearch('?prewarm=on&pregeneration=off')).toBe('disabled')
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('throws on any other value, and leaves the prewarm switch to its own parameter', () => {
    expect(() => pregenerationPolicyFromSearch('?pregeneration=no')).toThrow(
      /Unknown pregeneration mode "no"/,
    )
    expect(() => pregenerationPolicyFromSearch('?pregeneration=')).toThrow(
      /Unknown pregeneration mode ""/,
    )
    expect(prewarmPolicyFromSearch('?pregeneration=off')).toBe('enabled')
  })
})
