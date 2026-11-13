/**
 * The session controller's count of my instrument's kept sessions (spec D295, D326, D338): the
 * session list's rows naming my instrument, and the session that just ended when it was played
 * with it and has no row yet. The count names them by their keys (one held in memory only because
 * its save failed adding no delete while nothing of it is stored) and, once the batch is saved,
 * makes them leave memory as `Delete session` does: their rows, a Review of one (the list in its
 * place when it showed) and the most recent session when it is one, their keys recorded as the
 * player's deletion (spec D503). Another instrument's sessions stay. On the fake audio clock at 240
 * BPM from 5 s: phrase 1 sounds from 6.1 s. In Jam mode, through the workspace's kept doodle over
 * Jam's real code and the generation session's my-instrument actions, their batches saved:
 * deleting my instrument, or saving a change to its range, lets go a doodle kept from one of its
 * sessions, Jam's Idle left with no doodle; a doodle kept from the tenor's session stays through
 * both, and a change of name or clef, which erases nothing, keeps it.
 */
import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { effectScope, type EffectScope } from 'vue'

import {
  useKeptDoodleHost,
  type WorkspaceKeptDoodle,
} from '@/components/workspace/use-kept-doodle-host'
import { createGenerationSession } from '@/composables/use-generation-session'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { BUILT_IN_PRESETS, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import * as jamMode from '@/jam/jam-mode'
import type { SessionHistory } from '@/session/session-history'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import type { KeptRecordsReader, SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StorageChange, StoredEntry } from '@/storage/storage-port'

import { alwaysFitsStaff } from '../../composables/fake-staff-fit'
import { countingSessionSeeds } from '../../composables/fake-session-seed'
import { createFakeViewportWidth } from '../../composables/fake-viewport-width'
import { BASE_CONTROLS, generateSuccess } from '../../domain/generation/carry-in/carry-in-fixture'
import { lowHorn, recordedMyInstrumentSession } from '../../session/my-instrument-session'
import {
  APP_VERSION,
  recordedKeptSession,
  storedRecords,
} from '../../storage/kept-session-fixtures'
import {
  controllerRig,
  flush,
  playTo,
  RIG_SESSION_SEED,
  RIG_TEMPO,
  type ControllerRig,
} from './session-controller-rig'
import { reviewedJamPart } from './reviewed-jam-part-fixture'

const HORN = lowHorn('treble')
let mine: SessionHistory
const tenor = recordedKeptSession('bb-tenor', 2)

beforeAll(async () => {
  mine = await recordedMyInstrumentSession(HORN, 2)
})

/** Intent: the stored summary of `history` started at `startedAt`, kept under `key`. */
function summaryAt(history: SessionHistory, key: string, startedAt: number): StoredEntry {
  const shifted = { ...history, phrases: () => history.phrases(), startedAt }
  const facts = {
    pinned: false,
    favorites: [],
    comment: '',
    playedNotesKept: false,
    presets: BUILT_IN_PRESETS,
  }
  const records = storedRecords(encodeKeptSession(shifted, facts, APP_VERSION))
  return { key, value: records.summary as never }
}

/** Intent: three kept sessions of my instrument and two of the tenor, as a reload loads them. */
function loaded(): StoredEntry[] {
  return [
    summaryAt(mine, 'mine-1', 1_000),
    summaryAt(tenor, 'tenor-1', 2_000),
    summaryAt(mine, 'mine-2', 3_000),
    summaryAt(tenor, 'tenor-2', 4_000),
    summaryAt(mine, 'mine-3', 5_000),
  ]
}

/** Intent: a reader over `summaries`, as the device holds them, for the count's deletes. */
function readerOver(summaries: readonly StoredEntry[]): KeptRecordsReader {
  const byKey = new Map(summaries.map(({ key, value }) => [key, value]))
  return {
    read: (store, key) =>
      Promise.resolve(store === 'sessionSummaries' ? byKey.get(key) : undefined),
    readKeyed: () => Promise.reject(new Error('no keyed read')),
    readKeys: () => Promise.reject(new Error('no key read')),
  }
}

/** Intent: the keys the deletes name, once each. */
function deletedKeys(batch: readonly StorageChange[]): string[] {
  return [...new Set(batch.map((change) => change.key))].sort()
}

/** Whether saving is off for the rigs built next: set by a test, reset after each. */
let savingOff = false

/** The effect scope of a test's kept doodle, stopped after each. */
let scope: EffectScope | null = null

afterEach(() => {
  savingOff = false
  scope?.stop()
  scope = null
})

/** Intent: a rig over `summaries` whose sessions' own saves resolve `outcome`. */
function rigOver(
  summaries: readonly StoredEntry[],
  outcome: SessionSaveOutcome = { status: 'saved' },
): ControllerRig {
  return controllerRig(undefined, undefined, {
    keptSessions: {
      summaries,
      savingOff: () => savingOff,
    },
    sessionSaveOutcome: (changes: SessionChanges) => {
      changes([])
      return Promise.resolve(outcome)
    },
  })
}

/** Intent: play a two-phrase session with my instrument selected at Idle, then Stop. */
async function playedWithMyInstrument(rig: ControllerRig): Promise<void> {
  const controls = makeGenerationControls({
    ...BASE_CONTROLS,
    tempo: RIG_TEMPO,
    instrumentProfileId: 'my-instrument',
  })
  const intent = createGenerationIntent({
    requestId: makeRequestId('mine-idle'),
    seed: makeSeed(11),
    controls,
    figureLevels: rig.idle.figureLevels,
    chordFamilies: OFF_CHORD_FAMILIES,
    instrumentProfile: HORN.profile,
  })
  rig.idle.controls = controls
  rig.idle.myInstrument = HORN
  rig.idle.latestIntent = intent
  rig.idle.result = {
    intent,
    outcome: generateSuccess(intent),
    settings: { controls, figureLevels: rig.idle.figureLevels, selection: rig.idle.selection },
    sessionSeed: RIG_SESSION_SEED,
  }
  rig.controller.start()
  await playTo(rig, 10.2)
  rig.controller.stop()
  await flush()
}

/** Intent: the keys of the controller's rows, sorted. */
function rowKeys(rig: ControllerRig): string[] {
  return rig.controller.state.keptRows.map((row) => row.key).sort()
}

// @test-link [[entity_my_instrument_record]]
// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_sessions]]
describe("session controller: my instrument's kept sessions", () => {
  // @test-link [[module_kept_session_reach]]
  it('counts the rows naming my instrument, and its deletes name exactly them', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries)

    const counted = rig.controller.myInstrumentSessions()

    expect(counted.count).toBe(3)
    expect(deletedKeys(await counted.deletes(readerOver(summaries)))).toEqual([
      'mine-1',
      'mine-2',
      'mine-3',
    ])
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('once the batch is saved, they leave: their rows and the most recent kept one; the tenor ones stay', () => {
    const rig = rigOver(loaded())
    expect(rig.controller.state.mostRecent).toEqual({ kind: 'kept', key: 'mine-3' })

    rig.controller.myInstrumentSessions().leave()

    expect(rowKeys(rig)).toEqual(['tenor-1', 'tenor-2'])
    expect(rig.controller.state.mostRecent).toBeNull()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it("leaving records their keys as the player's deletion; staying, or none counted, records nothing", () => {
    const rig = rigOver(loaded())

    rig.controller.myInstrumentSessions().stay()
    expect(rig.controller.state.lastDeletion).toBeNull()

    rig.controller.myInstrumentSessions().leave()
    expect(rig.controller.state.lastDeletion).toEqual({
      kind: 'my-instrument-sessions',
      keys: ['mine-3', 'mine-2', 'mine-1'],
    })

    const tenorOnly = rigOver([summaryAt(tenor, 'tenor-1', 2_000)])
    tenorOnly.controller.myInstrumentSessions().leave()
    expect(tenorOnly.controller.state.lastDeletion).toBeNull()
  })

  // @test-link [[rule_most_recent_session_kept]]
  // @test-link [[req_kept_session_review]]
  it('counts the session that just ended once, by the key its save minted; leaving closes its Review for the list', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries)
    await playedWithMyInstrument(rig)
    const ended = rig.controller.state.review
    if (ended === null) throw new Error('no Review opened')
    expect(rowKeys(rig)).toContain(ended.key)

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(4)
    expect(counted.reviewed).toBe(true)
    expect(counted.withheld).toBe(false)

    counted.leave()
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.listShowing).toBe(true)
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rowKeys(rig)).toEqual(['tenor-1', 'tenor-2'])
  })

  // @test-link [[entity_my_instrument_record]]
  it('counts a session whose own save failed, deletes nothing of it from the device, and it only leaves memory', async () => {
    const summaries = loaded()
    const rig = rigOver(summaries, { status: 'refused', kind: 'quota' })
    await playedWithMyInstrument(rig)
    const ended = rig.controller.state.mostRecent
    if (ended?.kind !== 'held') throw new Error('no session held')
    expect(ended.session.keeping).toBe('not-saved')

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(4)
    expect(deletedKeys(await counted.deletes(readerOver(summaries)))).toEqual([
      'mine-1',
      'mine-2',
      'mine-3',
    ])

    counted.leave()
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.controller.state.review).toBeNull()
  })

  // @test-link [[module_kept_session_reach]]
  it("counts no session of another instrument, and leaving keeps that session's Review", async () => {
    const rig = rigOver([summaryAt(tenor, 'tenor-1', 2_000)])
    rig.controller.start()
    await playTo(rig, 10.2)
    rig.controller.stop()
    await flush()

    const counted = rig.controller.myInstrumentSessions()
    expect(counted.count).toBe(0)
    counted.leave()
    expect(rig.controller.state.review?.showing).toBe(true)
    expect(rig.controller.state.mostRecent?.kind).toBe('held')
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_failed_read_offers_only_delete_everything]]
  it('while saving is off counts no held session, so it keeps its Review; with rows read, erasing them is withheld', async () => {
    savingOff = true
    const fromDefaults = rigOver([], { status: 'saving-off' })
    await playedWithMyInstrument(fromDefaults)
    const none = fromDefaults.controller.myInstrumentSessions()
    expect(none).toMatchObject({ count: 0, reviewed: false, withheld: false })
    none.leave()
    expect(fromDefaults.controller.state.review?.showing).toBe(true)

    const outdated = rigOver(loaded(), { status: 'saving-off' })
    await playedWithMyInstrument(outdated)
    expect(outdated.controller.myInstrumentSessions()).toMatchObject({
      count: 3,
      reviewed: false,
      withheld: true,
    })
  })
})

const WIDER = makeMyInstrument({ ...HORN, writtenRange: { minMidi: 36, maxMidi: 76 } })
const RENAMED = makeMyInstrument({ ...HORN, name: 'My other horn' })
const BASS_CLEF = makeMyInstrument({ ...RENAMED, clef: 'bass' })

/** Intent: a generation session with my instrument selected and a phrase shown, batches saved. */
async function generationSession() {
  let counter = 0
  const created = createGenerationSession({
    saveSettings: () => undefined,
    myInstrumentSaves: {
      saveMyInstrument: () => undefined,
      saveMyInstrumentErasing: () => Promise.resolve({ status: 'saved' }),
      deleteMyInstrument: () => Promise.resolve({ status: 'saved' }),
    },
    ...alwaysFitsStaff(),
    viewport: createFakeViewportWidth(),
    providers: {
      nextRequestId: () => makeRequestId(`kept-doodle-mine-${++counter}`),
      nextSeed: () => makeSeed(++counter),
    },
    nextSessionSeed: countingSessionSeeds(),
    withSessionSeed: (phrase) => phrase,
    generate: async () => `phrase ${counter}`,
    notate: async () => {},
    initialSettings: {
      controls: makeGenerationControls({
        ...DEFAULT_GENERATION_CONTROLS,
        instrumentProfileId: 'my-instrument',
      }),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      chordFamilies: OFF_CHORD_FAMILIES,
      selection: DEFAULT_PRESET_SELECTION,
      playerPresets: [],
      theme: 'System',
      myInstrument: HORN,
    },
  })
  await created.actions.generate()
  return created
}

/** The workspace in Jam mode: its session controller, kept doodle and generation session. */
interface JamWorkspace {
  readonly rig: ControllerRig
  readonly host: WorkspaceKeptDoodle
  readonly generation: Awaited<ReturnType<typeof generationSession>>
}

/**
 * Intent: Jam mode showing, Jam's code loaded, over the controller holding `mine-1` (my
 * instrument's) and `tenor-1`, with the doodle kept from the session under `sessionKey`.
 */
async function jamWorkspace(sessionKey: string): Promise<JamWorkspace> {
  const rig = rigOver([summaryAt(mine, 'mine-1', 1_000), summaryAt(tenor, 'tenor-1', 2_000)])
  scope = effectScope()
  const host = scope.run(() =>
    useKeptDoodleHost({
      jamModule: () => jamMode,
      jamShowing: () => true,
      lastDeletion: () => rig.controller.state.lastDeletion,
      instrument: () => C_KEYBOARD_PROFILE,
      keyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
    }),
  )
  if (host === undefined) throw new Error('the effect scope ran nothing')
  host.keep(reviewedJamPart(), sessionKey)
  return { rig, host, generation: await generationSession() }
}

// @test-link [[rule_held_doodle_dropped_on_change]]
describe("Jam's kept doodle and my instrument's erased sessions", () => {
  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('deleting my instrument lets go the doodle kept from a session played with it', async () => {
    const jam = await jamWorkspace('mine-1')

    await jam.generation.actions.deleteMyInstrument(jam.rig.controller.myInstrumentSessions())

    expect(jam.generation.state.myInstrument).toBeNull()
    expect(rowKeys(jam.rig)).toEqual(['tenor-1'])
    expect(jam.host.kept.value).toBeNull()
    jam.generation.dispose()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('saving a change to its range lets go the doodle kept from a session played with it', async () => {
    const jam = await jamWorkspace('mine-1')

    await jam.generation.actions.saveMyInstrument(WIDER, jam.rig.controller.myInstrumentSessions())

    expect(jam.generation.state.myInstrument).toBe(WIDER)
    expect(jam.host.kept.value).toBeNull()
    jam.generation.dispose()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('a doodle kept from a session played with a built-in profile stays through both', async () => {
    const jam = await jamWorkspace('tenor-1')

    await jam.generation.actions.saveMyInstrument(WIDER, jam.rig.controller.myInstrumentSessions())
    expect(jam.host.kept.value?.sessionKey).toBe('tenor-1')

    await jam.generation.actions.deleteMyInstrument(jam.rig.controller.myInstrumentSessions())
    expect(jam.generation.state.myInstrument).toBeNull()
    expect(jam.host.kept.value?.sessionKey).toBe('tenor-1')
    jam.generation.dispose()
  })

  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('a change of its name or clef keeps the doodle kept from a session played with it', async () => {
    const jam = await jamWorkspace('mine-1')
    const { controller } = jam.rig

    await jam.generation.actions.saveMyInstrument(RENAMED, controller.myInstrumentSessions())
    await jam.generation.actions.saveMyInstrument(BASS_CLEF, controller.myInstrumentSessions())

    expect(jam.generation.state.myInstrument).toBe(BASS_CLEF)
    expect(jam.rig.controller.state.lastDeletion).toBeNull()
    expect(jam.host.kept.value?.sessionKey).toBe('mine-1')
    jam.generation.dispose()
  })
})
