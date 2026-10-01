import { describe, expect, it } from 'vitest'

import { sheetCloseFocusTarget } from '@/components/workspace/sheet-close-focus'

// @test-link [[rule_controller_connects_between_sessions]]
describe('sheetCloseFocusTarget', () => {
  it('is the session action whenever it is enabled', () => {
    expect(sheetCloseFocusTarget({ sessionActionEnabled: true, phraseActionEnabled: true })).toBe(
      'session-action',
    )
    expect(sheetCloseFocusTarget({ sessionActionEnabled: true, phraseActionEnabled: false })).toBe(
      'session-action',
    )
  })

  it('is the phrase action when only it is enabled', () => {
    expect(sheetCloseFocusTarget({ sessionActionEnabled: false, phraseActionEnabled: true })).toBe(
      'phrase-action',
    )
  })

  it('is controller-status when both header actions are disabled', () => {
    expect(sheetCloseFocusTarget({ sessionActionEnabled: false, phraseActionEnabled: false })).toBe(
      'controller-status',
    )
  })
})
