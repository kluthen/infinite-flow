/**
 * The Idle generation session's first state: the saved settings it is given (controls, musical
 * profile selection, theme) when the app loaded them before the first draw, the first-load values
 * otherwise; and the creation prewarm, which warms the controls the session starts from.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  createGenerationSession,
  type InitialGenerationSettings,
} from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
  type ProfileSelection,
} from '@/domain/controls/profile-selection'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
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

/** A saved, customised Jazz selection. */
const LOADED_PROFILE: ProfileSelection = { musicalProfile: 'Jazz', isCustom: true }

/** Intent: a session on fakes, with `initialSettings` when given, posting prewarms to `prewarm`. */
function session(
  prewarm: (intent: GenerationIntent) => void,
  initialSettings?: InitialGenerationSettings,
) {
  let counter = 0
  return createGenerationSession({
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
  it('starts from the loaded controls, profile selection and theme, and prewarms them', () => {
    const prewarm = vi.fn<(intent: GenerationIntent) => void>()
    const created = session(prewarm, {
      controls: LOADED_CONTROLS,
      profileSelection: LOADED_PROFILE,
      theme: 'Dark',
    })

    expect(created.state.controls).toEqual(LOADED_CONTROLS)
    expect(created.state.profileSelection).toEqual(LOADED_PROFILE)
    expect(created.state.presentation).toEqual({ theme: 'Dark' })
    expect(prewarm).toHaveBeenCalledOnce()
    // The intent carries the sounding key, so only the rhythm and tempo are compared here.
    expect(prewarm.mock.calls[0]?.[0].controls).toMatchObject({ noteDensity: 'Eighth', tempo: 120 })
    expect(prewarm.mock.calls[0]?.[0].musicalProfile).toEqual(LOADED_PROFILE)
    created.dispose()
  })

  // @test-link [[service_idle_generation_session]]
  it('starts from the first-load values when given no settings', () => {
    const prewarm = vi.fn<(intent: GenerationIntent) => void>()
    const created = session(prewarm)

    expect(created.state.controls).toEqual(DEFAULT_GENERATION_CONTROLS)
    expect(created.state.profileSelection).toEqual(DEFAULT_PROFILE_SELECTION)
    expect(created.state.presentation).toEqual({ theme: 'System' })
    expect(prewarm.mock.calls[0]?.[0].controls).toMatchObject({ noteDensity: 'Quarter', tempo: 90 })
    created.dispose()
  })
})
