import { describe, expect, it } from 'vitest'

import { presetLabel } from '@/domain/controls/preset-label'

describe('presetLabel', () => {
  // @test-link [[rule_preset_label_kept_with_session]]
  it('names each of the four selections in the kept-session form', () => {
    expect(presetLabel({ musicalProfile: 'Neutral', isCustom: false })).toBe('Neutral')
    expect(presetLabel({ musicalProfile: 'Jazz', isCustom: false })).toBe('Jazz')
    expect(presetLabel({ musicalProfile: 'Neutral', isCustom: true })).toBe(
      'Custom, based on Neutral',
    )
    expect(presetLabel({ musicalProfile: 'Jazz', isCustom: true })).toBe('Custom, based on Jazz')
  })
})
