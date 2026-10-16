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
  const notated: unknown[] = []
  /** Every save, in order: settings changed, and my instrument written or deleted. */
  const saves: unknown[] = []
  const created = createGenerationSession({
    saveSettings: (changes) => saves.push(changes),
    myInstrumentSaves: {
      saveMyInstrument: (instrument) => saves.push({ written: instrument }),
      deleteMyInstrument: () => saves.push('deleted'),
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
      profileSelection: DEFAULT_PROFILE_SELECTION,
      theme: 'System',
      myInstrument,
    },
  })
  return { created, prewarm, generated, notated, saves }
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

/** Intent: my instrument with some fields changed. */
function changed(changes: Partial<Parameters<typeof makeMyInstrument>[0]>): MyInstrument {
  return makeMyInstrument({ ...LOW_TENOR, ...changes })
}

/** Intent: a session with a phrase on screen, its records cleared. */
async function withPhrase(controls = MINE_SELECTED, myInstrument: MyInstrument | null = LOW_TENOR) {
  const rig = session(controls, myInstrument)
  await rig.created.actions.generate()
  rig.generated.length = 0
  rig.notated.length = 0
  rig.saves.length = 0
  return rig
}

// @test-link [[req_my_instrument]]
// @test-link [[rule_profile_switch_validates_phrase]]
describe('saving and deleting my instrument', () => {
  // @test-link [[req_my_instrument]]
  // @test-link [[entity_my_instrument_record]]
  it('a new one is saved, then selected, and the phrase replaced as on a switch', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS, null)

    expect(await created.actions.saveMyInstrument(LOW_TENOR)).toBe('regenerated')

    expect(saves).toEqual([
      { written: LOW_TENOR },
      { 'controls.instrumentProfileId': 'my-instrument' },
    ])
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
    expect(generated).toHaveLength(1)
    expect(generated[0]?.instrumentProfile).toEqual(LOW_TENOR.profile)
    created.dispose()
  })

  // @test-link [[req_my_instrument]]
  it('a change of name only relabels: the phrase stays and the selection still names my instrument', async () => {
    const { created, generated, notated, saves } = await withPhrase()
    const renamed = changed({ name: 'Tenor two' })

    expect(await created.actions.saveMyInstrument(renamed)).toBe('saved')

    expect(saves).toEqual([{ written: renamed }])
    expect(created.state.myInstrument?.name).toBe('Tenor two')
    expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
    expect(generated).toEqual([])
    expect(notated).toEqual([])
    created.dispose()
  })

  // @test-link [[rule_profile_switch_validates_phrase]]
  it('a change of range or transposition while selected replaces the phrase, with its new profile', async () => {
    const { created, generated } = await withPhrase()
    const wider = changed({ writtenRange: { minMidi: 40, maxMidi: 70 } })

    expect(await created.actions.saveMyInstrument(wider)).toBe('regenerated')
    expect(generated[0]?.instrumentProfile).toEqual(wider.profile)

    const higher = changed({ transposition: { octaves: 0, semitones: 9, direction: 'lower' } })
    expect(await created.actions.saveMyInstrument(higher)).toBe('regenerated')
    expect(generated[1]?.instrumentProfile).toEqual(higher.profile)
    created.dispose()
  })

  // @test-link [[req_my_instrument]]
  it('a change of clef alone while selected keeps the phrase and draws it again', async () => {
    const { created, generated, notated } = await withPhrase()
    const shown = created.state.result

    expect(await created.actions.saveMyInstrument(changed({ clef: 'treble' }))).toBe('redrawn')

    expect(generated).toEqual([])
    expect(notated).toEqual([shown])
    expect(created.state.result).toBe(shown)
    created.dispose()
  })

  // @test-link [[req_my_instrument]]
  it('a change while another profile is selected touches neither the phrase nor the selection', async () => {
    const { created, generated, notated } = await withPhrase(DEFAULT_GENERATION_CONTROLS)

    const wider = changed({ writtenRange: { minMidi: 40, maxMidi: 70 } })
    expect(await created.actions.saveMyInstrument(wider)).toBe('saved')

    expect(created.state.controls.instrumentProfileId).toBe(
      DEFAULT_GENERATION_CONTROLS.instrumentProfileId,
    )
    expect(generated).toEqual([])
    expect(notated).toEqual([])
    created.dispose()
  })

  // @test-link [[entity_my_instrument_record]]
  it('a save that changes nothing writes nothing', async () => {
    const { created, saves } = await withPhrase()
    expect(await created.actions.saveMyInstrument(changed({}))).toBe('unchanged')
    expect(saves).toEqual([])
    created.dispose()
  })

  // @test-link [[req_my_instrument]]
  it('deleting it while selected selects its template first, then deletes it, the phrase replaced', async () => {
    const { created, generated, saves } = await withPhrase()

    expect(await created.actions.deleteMyInstrument()).toBe('regenerated')

    expect(saves).toEqual([{ 'controls.instrumentProfileId': 'bb-tenor' }, 'deleted'])
    expect(created.state.myInstrument).toBeNull()
    expect(created.state.controls.instrumentProfileId).toBe('bb-tenor')
    expect(generated[0]?.instrumentProfile.id).toBe('bb-tenor')
    created.dispose()
  })

  // @test-link [[req_my_instrument]]
  it('deleting it while another profile is selected changes nothing else', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS)

    expect(await created.actions.deleteMyInstrument()).toBe('saved')

    expect(saves).toEqual(['deleted'])
    expect(created.state.myInstrument).toBeNull()
    expect(created.state.controls.instrumentProfileId).toBe(
      DEFAULT_GENERATION_CONTROLS.instrumentProfileId,
    )
    expect(generated).toEqual([])
    created.dispose()
  })
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
describe('my instrument saved and selected, as the transposition check uses it', () => {
  const SAME_PITCH = changed({ transposition: { octaves: 0, semitones: 0, direction: 'same' } })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('a new one is saved, then selected, and the phrase replaced as on a switch', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS, null)

    expect(await created.actions.saveAndSelectMyInstrument(SAME_PITCH)).toBe('regenerated')

    expect(saves).toEqual([
      { written: SAME_PITCH },
      { 'controls.instrumentProfileId': 'my-instrument' },
    ])
    expect(created.state.myInstrument).toBe(SAME_PITCH)
    expect(generated).toHaveLength(1)
    expect(generated[0]?.instrumentProfile).toEqual(SAME_PITCH.profile)
    created.dispose()
  })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('one that exists, not selected, is saved first, then selected, the phrase replaced', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS)

    expect(await created.actions.saveAndSelectMyInstrument(SAME_PITCH)).toBe('regenerated')

    expect(saves).toEqual([
      { written: SAME_PITCH },
      { 'controls.instrumentProfileId': 'my-instrument' },
    ])
    expect(created.state.myInstrument).toBe(SAME_PITCH)
    expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
    expect(generated[0]?.instrumentProfile).toEqual(SAME_PITCH.profile)
    created.dispose()
  })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('one that exists, not selected, with the same record is only selected', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS)

    expect(await created.actions.saveAndSelectMyInstrument(changed({}))).toBe('regenerated')

    expect(saves).toEqual([{ 'controls.instrumentProfileId': 'my-instrument' }])
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    expect(generated[0]?.instrumentProfile).toEqual(LOW_TENOR.profile)
    created.dispose()
  })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('the selected one is saved and the phrase replaced, the selection unchanged', async () => {
    const { created, generated, saves } = await withPhrase()

    expect(await created.actions.saveAndSelectMyInstrument(SAME_PITCH)).toBe('regenerated')

    expect(saves).toEqual([{ written: SAME_PITCH }])
    expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
    expect(generated[0]?.instrumentProfile).toEqual(SAME_PITCH.profile)
    created.dispose()
  })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('waits for a generation under way before it selects', async () => {
    const { created, generated, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS)
    const regenerating = created.actions.regenerate()

    const saving = created.actions.saveAndSelectMyInstrument(SAME_PITCH)
    await regenerating
    expect(await saving).toBe('regenerated')

    expect(saves).toEqual([
      { written: SAME_PITCH },
      { 'controls.instrumentProfileId': 'my-instrument' },
    ])
    expect(generated.at(-1)?.instrumentProfile).toEqual(SAME_PITCH.profile)
    created.dispose()
  })
})
