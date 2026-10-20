/**
 * My instrument's actions with its kept sessions (spec D326): deleting it, and a change of its
 * range or transposition while it has kept sessions, are one batch with the counted sessions'
 * deletes, and nothing changes in memory (my instrument, its sessions, the selection, the phrase)
 * until it is saved; a refusal, or saving off with sessions to erase, changes nothing, the counted
 * sessions told they stay. A change of name or clef, and any change with no kept session, stays
 * the plain write.
 */
import { describe, expect, it, vi, type Mock } from 'vitest'

import {
  createGenerationSession,
  type MyInstrumentSessions,
} from '@/composables/use-generation-session'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import type { KeptChangeOutcome, KeptChanges } from '@/storage/save-policy'
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

const WIDER = makeMyInstrument({ ...LOW_TENOR, writtenRange: { minMidi: 40, maxMidi: 70 } })
const OCTAVE_LOWER = makeMyInstrument({
  ...LOW_TENOR,
  transposition: { octaves: 1, semitones: 0, direction: 'lower' },
})

const MINE_SELECTED = makeGenerationControls({
  ...DEFAULT_GENERATION_CONTROLS,
  instrumentProfileId: 'my-instrument',
})

/** The deletes the counted sessions hand the batch: a marker the fake saves pass through. */
const THREE_DELETES: KeptChanges = () => Promise.resolve([])

/** Counted sessions of my instrument, with spies on their leaving memory and their staying. */
type CountedSessions = MyInstrumentSessions & {
  readonly leave: Mock<() => void>
  readonly stay: Mock<() => void>
}

/** Intent: three counted sessions of my instrument, with spies on their leaving and staying. */
function threeSessions(): CountedSessions {
  return {
    count: 3,
    deletes: THREE_DELETES,
    leave: vi.fn<() => void>(),
    stay: vi.fn<() => void>(),
  }
}

/** Intent: no counted session, with spies on their (empty) leaving and staying. */
function noSessions(): CountedSessions {
  return {
    count: 0,
    deletes: () => Promise.resolve([]),
    leave: vi.fn<() => void>(),
    stay: vi.fn<() => void>(),
  }
}

/**
 * Intent: a session on fakes with `myInstrument` and `controls` and a phrase on screen, whose
 * batches resolve `batch` (a promise the test may hold), recording every save in order.
 */
async function withPhrase(
  controls = MINE_SELECTED,
  batch: () => Promise<KeptChangeOutcome> = () => Promise.resolve({ status: 'saved' }),
) {
  let counter = 0
  const generated: unknown[] = []
  const saves: unknown[] = []
  const created = createGenerationSession({
    saveSettings: (changes) => saves.push(changes),
    myInstrumentSaves: {
      saveMyInstrument: (instrument) => {
        saves.push({ written: instrument })
      },
      saveMyInstrumentErasing: (instrument, sessions) => {
        saves.push({ writtenErasing: instrument, sessions })
        return batch()
      },
      deleteMyInstrument: (sessions) => {
        saves.push({ deleted: sessions })
        return batch()
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
    notate: async () => {},
    initialSettings: {
      controls,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection: DEFAULT_PRESET_SELECTION,
      theme: 'System',
      myInstrument: LOW_TENOR,
    },
  })
  await created.actions.generate()
  generated.length = 0
  saves.length = 0
  return { created, generated, saves }
}

/** Intent: a batch outcome the test resolves when it chooses. */
function heldBatch() {
  let resolve: (outcome: KeptChangeOutcome) => void = () => undefined
  const promise = new Promise<KeptChangeOutcome>((settle) => {
    resolve = settle
  })
  return { batch: () => promise, resolve }
}

const REFUSED: KeptChangeOutcome = { status: 'refused', kind: 'quota' }
const SAVING_OFF: KeptChangeOutcome = { status: 'saving-off' }

// @test-link [[entity_my_instrument_record]]
// @test-link [[req_my_instrument]]
describe('a change of range or transposition while my instrument has kept sessions', () => {
  // @test-link [[entity_my_instrument_record]]
  it('is one batch erasing the counted sessions; once saved they leave memory, then the phrase is replaced', async () => {
    const { created, generated, saves } = await withPhrase()
    const sessions = threeSessions()

    expect(await created.actions.saveMyInstrument(WIDER, sessions)).toBe('regenerated')

    expect(saves).toEqual([{ writtenErasing: WIDER, sessions: THREE_DELETES }])
    expect(sessions.leave).toHaveBeenCalledOnce()
    expect(created.state.myInstrument).toBe(WIDER)
    expect(generated).toHaveLength(1)

    const lower = threeSessions()
    expect(await created.actions.saveMyInstrument(OCTAVE_LOWER, lower)).toBe('regenerated')
    expect(saves.at(-1)).toEqual({ writtenErasing: OCTAVE_LOWER, sessions: THREE_DELETES })
    created.dispose()
  })

  // @test-link [[entity_my_instrument_record]]
  it('changes nothing in memory before the batch is saved', async () => {
    const held = heldBatch()
    const { created, generated } = await withPhrase(MINE_SELECTED, held.batch)
    const sessions = threeSessions()

    const saving = created.actions.saveMyInstrument(WIDER, sessions)
    await Promise.resolve()
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    expect(sessions.leave).not.toHaveBeenCalled()
    expect(generated).toEqual([])

    held.resolve({ status: 'saved' })
    expect(await saving).toBe('regenerated')
    expect(created.state.myInstrument).toBe(WIDER)
    created.dispose()
  })

  // @test-link [[entity_my_instrument_record]]
  it('refused, or with saving off, changes nothing: my instrument, its sessions and the phrase stay', async () => {
    for (const [outcome, expected] of [
      [REFUSED, 'refused'],
      [SAVING_OFF, 'saving-off'],
    ] as const) {
      const { created, generated, saves } = await withPhrase(MINE_SELECTED, () =>
        Promise.resolve(outcome),
      )
      const shown = created.state.result
      const sessions = threeSessions()

      expect(await created.actions.saveMyInstrument(WIDER, sessions)).toBe(expected)

      expect(saves).toHaveLength(1)
      expect(sessions.leave).not.toHaveBeenCalled()
      expect(sessions.stay).toHaveBeenCalledOnce()
      expect(created.state.myInstrument).toBe(LOW_TENOR)
      expect(created.state.result).toBe(shown)
      expect(generated).toEqual([])
      created.dispose()
    }
  })

  // @test-link [[entity_my_instrument_record]]
  it('a change of name or clef stays the plain write and keeps every session', async () => {
    const { created, saves } = await withPhrase()
    const sessions = threeSessions()
    const renamed = makeMyInstrument({ ...LOW_TENOR, name: 'Tenor two' })
    const treble = makeMyInstrument({ ...renamed, clef: 'treble' })

    expect(await created.actions.saveMyInstrument(renamed, sessions)).toBe('saved')
    expect(await created.actions.saveMyInstrument(treble, sessions)).toBe('redrawn')

    expect(saves).toEqual([{ written: renamed }, { written: treble }])
    expect(sessions.leave).not.toHaveBeenCalled()
    created.dispose()
  })

  // @test-link [[entity_my_instrument_record]]
  it('with no kept session, stays the plain write', async () => {
    const { created, saves } = await withPhrase()

    expect(await created.actions.saveMyInstrument(WIDER, noSessions())).toBe('regenerated')

    expect(saves).toEqual([{ written: WIDER }])
    created.dispose()
  })
})

// @test-link [[rule_transposition_check_sets_my_instrument]]
// @test-link [[entity_my_instrument_record]]
describe("the transposition check's Use for my instrument while it has kept sessions", () => {
  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('erases them in the batch, then selects my instrument once it is saved', async () => {
    const { created, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS)
    const sessions = threeSessions()

    expect(await created.actions.saveAndSelectMyInstrument(OCTAVE_LOWER, sessions)).toBe(
      'regenerated',
    )

    expect(saves).toEqual([
      { writtenErasing: OCTAVE_LOWER, sessions: THREE_DELETES },
      { 'controls.instrumentProfileId': 'my-instrument' },
    ])
    expect(sessions.leave).toHaveBeenCalledOnce()
    expect(created.state.myInstrument).toBe(OCTAVE_LOWER)
    created.dispose()
  })

  // @test-link [[rule_transposition_check_sets_my_instrument]]
  it('refused, selects nothing and changes nothing', async () => {
    const { created, saves } = await withPhrase(DEFAULT_GENERATION_CONTROLS, () =>
      Promise.resolve(REFUSED),
    )

    expect(await created.actions.saveAndSelectMyInstrument(OCTAVE_LOWER, threeSessions())).toBe(
      'refused',
    )

    expect(saves).toHaveLength(1)
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    expect(created.state.controls.instrumentProfileId).toBe(
      DEFAULT_GENERATION_CONTROLS.instrumentProfileId,
    )
    created.dispose()
  })
})

// @test-link [[entity_my_instrument_record]]
// @test-link [[req_my_instrument]]
describe('deleting my instrument with its kept sessions', () => {
  // @test-link [[entity_my_instrument_record]]
  it('is one batch with the counted sessions; once saved they leave, then its template is selected', async () => {
    const held = heldBatch()
    const { created, saves } = await withPhrase(MINE_SELECTED, held.batch)
    const sessions = threeSessions()

    const deleting = created.actions.deleteMyInstrument(sessions)
    await Promise.resolve()
    expect(created.state.myInstrument).toBe(LOW_TENOR)
    expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
    expect(sessions.leave).not.toHaveBeenCalled()

    held.resolve({ status: 'saved' })
    expect(await deleting).toBe('regenerated')

    expect(saves).toEqual([
      { deleted: THREE_DELETES },
      { 'controls.instrumentProfileId': 'bb-tenor' },
    ])
    expect(sessions.leave).toHaveBeenCalledOnce()
    expect(created.state.myInstrument).toBeNull()
    expect(created.state.controls.instrumentProfileId).toBe('bb-tenor')
    created.dispose()
  })

  // @test-link [[entity_my_instrument_record]]
  it('refused, changes nothing, whatever the number of sessions', async () => {
    for (const sessions of [threeSessions(), noSessions()]) {
      const { created, saves } = await withPhrase(MINE_SELECTED, () => Promise.resolve(REFUSED))

      expect(await created.actions.deleteMyInstrument(sessions)).toBe('refused')

      expect(saves).toHaveLength(1)
      expect(sessions.leave).not.toHaveBeenCalled()
      expect(sessions.stay).toHaveBeenCalledOnce()
      expect(created.state.myInstrument).toBe(LOW_TENOR)
      expect(created.state.controls.instrumentProfileId).toBe('my-instrument')
      created.dispose()
    }
  })

  // @test-link [[entity_my_instrument_record]]
  it('with saving off, changes nothing while it has sessions, and deletes it for the visit when it has none', async () => {
    const off = () => Promise.resolve(SAVING_OFF)
    const withSessions = await withPhrase(DEFAULT_GENERATION_CONTROLS, off)
    expect(await withSessions.created.actions.deleteMyInstrument(threeSessions())).toBe(
      'saving-off',
    )
    expect(withSessions.created.state.myInstrument).toBe(LOW_TENOR)
    withSessions.created.dispose()

    const without = await withPhrase(DEFAULT_GENERATION_CONTROLS, off)
    expect(await without.created.actions.deleteMyInstrument(noSessions())).toBe('saved')
    expect(without.created.state.myInstrument).toBeNull()
    without.created.dispose()
  })
})
