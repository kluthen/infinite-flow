import { describe, expect, it } from 'vitest'

import { controlSummaryText } from '@/components/controls/control-options'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'

describe('controlSummaryText', () => {
  it('reads the default load as tonal center, collection, Neutral, tension, leapiness', () => {
    expect(controlSummaryText(DEFAULT_GENERATION_CONTROLS, DEFAULT_PROFILE_SELECTION)).toBe(
      'C Ionian · Neutral · Lift · Shaped',
    )
  })

  it('shows the applied preset name when the Jazz preset is selected', () => {
    expect(
      controlSummaryText(DEFAULT_GENERATION_CONTROLS, {
        musicalProfile: 'Jazz',
        isCustom: false,
      }),
    ).toBe('C Ionian · Jazz · Lift · Shaped')
  })

  it('shows the retained grammar in parentheses during a custom edit', () => {
    expect(
      controlSummaryText(DEFAULT_GENERATION_CONTROLS, {
        musicalProfile: 'Neutral',
        isCustom: true,
      }),
    ).toBe('C Ionian · Custom (Neutral grammar) · Lift · Shaped')
  })

  it('uses the tonal-center control label, not the raw pitch class, for an enharmonic value', () => {
    const controls: GenerationControls = {
      ...DEFAULT_GENERATION_CONTROLS,
      tonalCenter: 'C#',
      collection: 'Dorian',
    }
    expect(controlSummaryText(controls, DEFAULT_PROFILE_SELECTION)).toBe(
      'C-sharp/D-flat Dorian · Neutral · Lift · Shaped',
    )
  })
})
