/**
 * Session mode's instrument switches held while Jam mode opens or shows (master spec C5.1): an
 * instrument switch, my instrument's included, or a saved change to the selected my instrument's
 * range or clef, changes and saves the instrument at once but leaves session mode's phrase as it
 * is; on returning, the owed switch is applied as one made there, the phrase written again for
 * the new instrument. Nothing owed, the release changes nothing.
 */
import { describe, expect, it, vi } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { MyInstrumentSessions } from '@/composables/use-generation-session'
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
  const notated: unknown[] = []
  /** Every save, in order: settings changed, and my instrument written or deleted. */
  const saves: unknown[] = []
  const created = createGenerationSession({
    saveSettings: (changes) => saves.push(changes),
    myInstrumentSaves: {
      saveMyInstrument: (instrument) => {
        saves.push({ written: instrument })
      },
      saveMyInstrumentErasing: (instrument) => {
        saves.push({ writtenErasing: instrument })
        return Promise.resolve({ status: 'saved' })
      },
      deleteMyInstrument: () => {
        saves.push('deleted')
        return Promise.resolve({ status: 'saved' })
      },
    },
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
      return `phrase ${generated.length}`
    },
    notate: async (result) => {
      notated.push(result)
    },
    prewarm,
    initialSettings: {
      controls,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: DEFAULT_PRESET_SELECTION,
      playerPresets: [],
      theme: 'System',
      myInstrument,
    },
  })
  return { created, prewarm, generated, notated, saves }
}

const NO_SESSIONS: MyInstrumentSessions = {
  count: 0,
  deletes: () => Promise.resolve([]),
  leave: () => undefined,
  stay: () => undefined,
}

/** Intent: a session with a phrase on screen and its switches held, its records cleared. */
async function heldWithPhrase(controls = MINE_SELECTED) {
  const rig = session(controls, LOW_TENOR)
  await rig.created.actions.generate()
  expect(await rig.created.actions.holdInstrumentSwitches(true)).toBe('unchanged')
  rig.generated.length = 0
  rig.notated.length = 0
  rig.saves.length = 0
  return rig
}

// @test-link [[rule_shared_setting_changed_in_jam_mode]]
describe("session mode's instrument switches, held while Jam mode shows", () => {
  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  // @test-link [[rule_profile_switch_validates_phrase]]
  it('save a switch at once, keep the phrase, and write it again for the new instrument on release', async () => {
    const { created, generated, notated, saves } = await heldWithPhrase(DEFAULT_GENERATION_CONTROLS)
    const shown = created.state.result

    expect(await created.actions.selectInstrumentProfile('eb-alto')).toBe('applied')
    expect(saves).toEqual([{ 'controls.instrumentProfileId': 'eb-alto' }])
    expect(created.state.controls.instrumentProfileId).toBe('eb-alto')
    expect(generated).toEqual([])
    expect(created.state.result).toBe(shown)

    expect(await created.actions.holdInstrumentSwitches(false)).toBe('regenerated')
    expect(generated).toHaveLength(1)
    expect(generated[0]?.controls.instrumentProfileId).toBe('eb-alto')
    expect(notated).toHaveLength(1)
    created.dispose()
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it('change nothing on release when no switch was made', async () => {
    const { created, generated, notated } = await heldWithPhrase()
    const shown = created.state.result

    expect(await created.actions.holdInstrumentSwitches(false)).toBe('unchanged')
    expect(generated).toEqual([])
    expect(notated).toEqual([])
    expect(created.state.result).toBe(shown)
    created.dispose()
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it("owe session mode a change of the selected my instrument's range, applied on release", async () => {
    const { created, generated } = await heldWithPhrase()
    const wider = makeMyInstrument({ ...LOW_TENOR, writtenRange: { minMidi: 40, maxMidi: 70 } })

    expect(await created.actions.saveMyInstrument(wider, NO_SESSIONS)).toBe('applied')
    expect(generated).toEqual([])

    expect(await created.actions.holdInstrumentSwitches(false)).toBe('regenerated')
    expect(generated).toHaveLength(1)
    expect(generated[0]?.instrumentProfile).toEqual(wider.profile)
    created.dispose()
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it("owe session mode a change of the selected my instrument's clef, the phrase written again on release", async () => {
    const { created, generated, notated } = await heldWithPhrase()

    await created.actions.saveMyInstrument(
      makeMyInstrument({ ...LOW_TENOR, clef: 'treble' }),
      NO_SESSIONS,
    )
    expect(notated).toEqual([])

    expect(await created.actions.holdInstrumentSwitches(false)).toBe('regenerated')
    expect(generated).toHaveLength(1)
    created.dispose()
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it('apply a switch at once again once released', async () => {
    const { created, generated } = await heldWithPhrase(DEFAULT_GENERATION_CONTROLS)
    await created.actions.holdInstrumentSwitches(false)

    expect(await created.actions.selectInstrumentProfile('c-keyboard')).toBe('regenerated')
    expect(generated).toHaveLength(1)
    created.dispose()
  })
})
