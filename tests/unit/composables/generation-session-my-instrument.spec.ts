/**
 * My instrument on the Idle side: a session started with my instrument loaded and selected holds
 * it, and gives its profile as data to every intent it builds, the Idle phrase's and the rhythm
 * prewarm's, never looking it up by id.
 */
import { describe, expect, it, vi } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { alwaysFitsStaff } from './fake-staff-fit'
import { countingSessionSeeds } from './fake-session-seed'
import { createFakeViewportWidth } from './fake-viewport-width'

const LOW_TENOR: MyInstrument = makeMyInstrument({
  template: 'bb-tenor',
  name: 'Low tenor',
  clef: 'bass',
  writtenRange: { minMidi: 40, maxMidi: 64 },
  transposition: { octaves: 1, semitones: 2, direction: 'lower' },
})

const MINE_SELECTED = makeGenerationControls({
  ...DEFAULT_GENERATION_CONTROLS,
  instrumentProfileId: 'my-instrument',
})

/** Intent: a session on fakes started with `myInstrument` and `controls`, recording its intents. */
function session(controls = MINE_SELECTED, myInstrument: MyInstrument | null = LOW_TENOR) {
  let counter = 0
  const prewarm = vi.fn<(intent: GenerationIntent) => void>()
  const generated: GenerationIntent[] = []
  const created = createGenerationSession({
    saveSettings: () => undefined,
    ...alwaysFitsStaff(),
    viewport: createFakeViewportWidth(),
    providers: {
      nextRequestId: () => makeRequestId(`mine-${++counter}`),
      nextSeed: () => makeSeed(++counter),
    },
    nextSessionSeed: countingSessionSeeds(),
    withSessionSeed: (phrase) => phrase,
    generate: async (intent) => {
      generated.push(intent)
      return 'phrase'
    },
    notate: async () => undefined,
    prewarm,
    initialSettings: {
      controls,
      profileSelection: DEFAULT_PROFILE_SELECTION,
      theme: 'System',
      myInstrument,
    },
  })
  return { created, prewarm, generated }
}

// @test-link [[entity_my_instrument]]
// @test-link [[service_idle_generation_session]]
describe('the Idle session with my instrument', () => {
  // @test-link [[entity_my_instrument]]
  it('holds the loaded my instrument', () => {
    const { created } = session()
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    created.dispose()
  })

  // @test-link [[entity_my_instrument]]
  // @test-link [[module_generation_prewarm]]
  it('gives its profile as data to the rhythm prewarm and the Idle phrase', async () => {
    const { created, prewarm, generated } = session()

    expect(prewarm.mock.calls[0]?.[0].instrumentProfile).toEqual(LOW_TENOR.profile)
    expect(await created.actions.generate()).toBe(true)
    expect(generated).toHaveLength(1)
    expect(generated[0]?.instrumentProfile).toEqual(LOW_TENOR.profile)
    expect(generated[0]?.controls.instrumentProfileId).toBe('my-instrument')
    created.dispose()
  })

  // @test-link [[entity_my_instrument]]
  it('gives a built-in selection its own profile while my instrument exists', async () => {
    const { created, generated } = session(DEFAULT_GENERATION_CONTROLS)

    await created.actions.generate()
    expect(generated[0]?.instrumentProfile.id).toBe(DEFAULT_GENERATION_CONTROLS.instrumentProfileId)
    created.dispose()
  })

  // @test-link [[entity_my_instrument]]
  it('refuses to start with my instrument selected and none given', () => {
    expect(() => session(MINE_SELECTED, null)).toThrow(/my instrument/)
  })
})
