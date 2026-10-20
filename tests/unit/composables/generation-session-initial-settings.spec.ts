/**
 * The Idle generation session's first state: the saved settings it is given (controls, figure
 * levels, preset selection, theme) when the app loaded them before the first draw, the first-load
 * values otherwise; and the creation prewarm, which warms the controls the session starts from.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  createGenerationSession,
  type InitialGenerationSettings,
} from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { alwaysFitsStaff } from './fake-staff-fit'
import { countingSessionSeeds } from './fake-session-seed'
import { createFakeViewportWidth } from './fake-viewport-width'

/** Saved controls that differ from the first-load ones in a rhythm and a non-rhythm control. */
const LOADED_CONTROLS = makeGenerationControls({
  ...DEFAULT_GENERATION_CONTROLS,
  tempo: 120,
  tonalCenter: 'F',
  noteDensity: 'Eighth',
})

/** A loaded selection: Custom based on Jazz. */
const LOADED_SELECTION: PresetSelection = { kind: 'custom', baseId: 'jazz' }

/** Intent: a session on fakes, with `initialSettings` when given, posting prewarms to `prewarm`. */
function session(
  prewarm: (intent: GenerationIntent) => void,
  initialSettings?: InitialGenerationSettings,
) {
  let counter = 0
  return createGenerationSession({
    saveSettings: () => undefined,
    ...alwaysFitsStaff(),
    viewport: createFakeViewportWidth(),
    providers: {
      nextRequestId: () => makeRequestId(`initial-${++counter}`),
      nextSeed: () => makeSeed(++counter),
    },
    nextSessionSeed: countingSessionSeeds(),
    withSessionSeed: (generated) => generated,
    generate: async () => 'phrase',
    notate: async () => undefined,
    prewarm,
    ...(initialSettings === undefined ? {} : { initialSettings }),
  })
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[service_idle_generation_session]]
describe('createGenerationSession: the settings it starts from', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[module_generative_profile_selection]]
  it('starts from the loaded controls, levels, preset selection and theme, and prewarms them', () => {
    const prewarm = vi.fn<(intent: GenerationIntent) => void>()
    const created = session(prewarm, {
      controls: LOADED_CONTROLS,
      figureLevels: JAZZ_FIGURE_LEVELS,
      selection: LOADED_SELECTION,
      theme: 'Dark',
      myInstrument: null,
    })

    expect(created.state.controls).toEqual(LOADED_CONTROLS)
    expect(created.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(created.state.selection).toEqual(LOADED_SELECTION)
    expect(created.state.presentation).toEqual({ theme: 'Dark' })
    expect(prewarm).toHaveBeenCalledOnce()
    // The intent carries the sounding key, so only the rhythm and tempo are compared here.
    expect(prewarm.mock.calls[0]?.[0].controls).toMatchObject({ noteDensity: 'Eighth', tempo: 120 })
    expect(prewarm.mock.calls[0]?.[0].figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    created.dispose()
  })

  // @test-link [[service_idle_generation_session]]
  it('starts from the first-load values when given no settings', () => {
    const prewarm = vi.fn<(intent: GenerationIntent) => void>()
    const created = session(prewarm)

    expect(created.state.controls).toEqual(DEFAULT_GENERATION_CONTROLS)
    expect(created.state.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
    expect(created.state.selection).toEqual(DEFAULT_PRESET_SELECTION)
    expect(created.state.presentation).toEqual({ theme: 'System' })
    expect(created.state.myInstrument).toBeNull()
    expect(prewarm.mock.calls[0]?.[0].controls).toMatchObject({ noteDensity: 'Quarter', tempo: 90 })
    created.dispose()
  })
})
