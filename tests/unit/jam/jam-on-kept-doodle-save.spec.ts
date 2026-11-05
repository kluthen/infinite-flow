// @vitest-environment node
/**
 * A Jam on the kept doodle's save, read back and kept doodle, through the workspace's session
 * controller on the controller rig (fake audio clock, fake MIDI; 240 BPM, a 1 s measure) and the
 * workspace's own kept doodle and Jam sides over Jam's real code: the save writes the kept doodle
 * with its capture tempo, its decline, no played-notes clock and played notes timed from phrase 1
 * with no raw doodle note; read back, it gives the review its end showed (the kept doodle at its
 * capture tempo, its lane empty, its decline). Each end with a review keeps the same doodle, now
 * from the session just played, and writes phrase 1 again from it once; an end before phrase 1
 * writes nothing. A second Jam whose save deletes the first, unpinned, session keeps the doodle;
 * deleting the latest session played on it lets it go. The same doodle read back and the same
 * settings and seeds give the same phrase 1.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef } from 'vue'

import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { useFreshJam } from '@/components/workspace/use-fresh-jam'
import { useKeptDoodleHost } from '@/components/workspace/use-kept-doodle-host'
import { useKeptDoodleJam } from '@/components/workspace/use-kept-doodle-jam'
import type { KeptDoodlePhraseResult } from '@/components/workspace/use-kept-doodle-phrase'
import { readKeptReviewedSession } from '@/components/workspace/workspace-kept-session-read'
import type { KeptSessionsSeam } from '@/components/workspace/workspace-kept-sessions-seam'
import type { ReviewedSession } from '@/components/workspace/workspace-session-controller-types'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import * as jamMode from '@/jam/jam-mode'
import { decodeKeptSession, type KeptSession } from '@/storage/records/kept-session-record'
import type { SessionChanges } from '@/storage/save-policy'
import type { StorageChange } from '@/storage/storage-port'
import { flush, playTo, type ControllerRig } from '../components/workspace/session-controller-rig'
import { lift, press } from '../components/workspace/session-controller-midi'
import { reviewedJamPart } from '../components/workspace/reviewed-jam-part-fixture'
import {
  keptDoodleJamRig,
  keptPhraseOneFrom,
  type KeptDoodleJamRig,
  type KeptDoodleJamRigOptions,
} from './kept-doodle-jam-rig'

/** Intent: changes after a save that succeed at once, as a visit that saves. */
const SAVING: Partial<KeptSessionsSeam> = {
  changes: {
    changeKept: () => Promise.resolve({ status: 'saved' }),
    readKept: () => {
      throw new Error('no read at a change is asked for')
    },
  },
}

/** Intent: the time phrase 1 of the latest Jam started on the rig starts sounding. */
function phraseOneAt(rig: ControllerRig): number {
  const input = rig.runnerInputs.at(-1)
  if (input === undefined) throw new Error('no Jam was started')
  return input.start.at + 1
}

/**
 * Intent: play a Jam on the kept doodle to one measure into phrase 2, a note played half a second
 * into phrase 1, and Stop; once its save was asked for, the review it opened.
 */
async function playJam(run: KeptDoodleJamRig, start: () => void): Promise<ReviewedSession> {
  start()
  const at = phraseOneAt(run.rig)
  await playTo(run.rig, at + 0.5)
  press(run.rig, 62)
  await playTo(run.rig, at + 0.75)
  lift(run.rig, 62)
  await playTo(run.rig, at + 5)
  const saves = run.rig.sessionSaves.length
  run.rig.controller.stop()
  // The save loads the kept-session codec on demand first.
  await vi.waitFor(() => expect(run.rig.sessionSaves.length).toBe(saves + 1))
  await flush()
  const review = run.rig.controller.state.review
  if (review === null) throw new Error('the Jam opened no review')
  return review
}

/** Intent: the records the `index`th session save wrote over `summaries`, by store. */
function saved(rig: ControllerRig, index: number, summaries: readonly StorageChange[] = []) {
  const changes: SessionChanges | undefined = rig.sessionSaves[index]
  if (changes === undefined) throw new Error(`no session save ${index} was asked for`)
  const stored = summaries.flatMap((change) =>
    change.kind === 'write' ? [{ key: change.key, value: change.record }] : [],
  )
  return changes(stored)
}

/** Intent: the record a batch writes to `store`, cloned as the device would keep it. */
function written(changes: readonly StorageChange[], store: StorageChange['store']): unknown {
  const write = changes.find((change) => change.kind === 'write' && change.store === store)
  return write?.kind === 'write' ? structuredClone(write.record) : undefined
}

/** Intent: a batch's records decoded as the kept-session codec reads them back. */
function decoded(changes: readonly StorageChange[]): KeptSession {
  const reading = decodeKeptSession({
    summary: written(changes, 'sessionSummaries'),
    body: written(changes, 'sessionBodies'),
    playedNotes: written(changes, 'playedNotes'),
  })
  if (reading.reading !== 'current') throw new Error(`the save reads as ${reading.reading}`)
  return reading.value
}

/** A rig whose Jam starts through the workspace's Jam side, over its kept doodle. */
interface WorkspaceJamRig extends KeptDoodleJamRig {
  readonly host: ReturnType<typeof useKeptDoodleHost>
  readonly writeAgain: ReturnType<typeof vi.fn>
  readonly start: () => void
}

/**
 * Intent: the rig with the workspace's kept doodle (Jam's real code), its fresh Jam's end handing
 * every Jam part on, and its Jam on the kept doodle over phrase 1 shown at Idle; the doodle kept as
 * a first Jam's end would keep it, from the session under `session-0`.
 */
async function workspaceJamRig(options: KeptDoodleJamRigOptions = {}): Promise<WorkspaceJamRig> {
  const run = await keptDoodleJamRig({ ...options, controller: { keptSessions: SAVING } })
  const { rig } = run
  const loaded: JamModeModule = jamMode
  const writeAgain = vi.fn()
  const state = shallowRef<IdlePhraseState<KeptDoodlePhraseResult>>({
    latestIntent: run.phraseOne.intent,
    result: run.phraseOne,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: true,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const made = effectScope().run(() => {
    const host = useKeptDoodleHost({
      jamModule: () => loaded,
      jamShowing: () => true,
      lastDeletion: () => rig.controller.state.lastDeletion,
      instrument: () => C_KEYBOARD_PROFILE,
      keyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
    })
    useFreshJam({
      jamModule: () => loaded,
      jamShowing: () => true,
      controller: () => rig.controller,
      settings: () => null,
      instrument: () => ({ instrumentProfileId: 'c-keyboard', myInstrument: null }),
      lastEnd: () => rig.controller.state.lastEnd,
      jamStaffState: () => null,
      keepDoodle: host.keep,
    })
    const jam = useKeptDoodleJam({
      controller: () => rig.controller,
      kept: () => host.kept.value,
      phrase: { state: state.value, written: shallowRef(run.request.written), writeAgain },
      tempo: () => run.request.tempo,
      take: run.request.take,
      lastEnd: () => rig.controller.state.lastEnd,
      startFresh: () => {
        throw new Error('no fresh Jam is started here')
      },
    })
    return { host, jam }
  })!
  made.host.keep(
    {
      ...reviewedJamPart(),
      doodle: { ...reviewedJamPart().doodle, doodle: run.kept.doodle },
      suggestion: run.kept.suggestion,
      suggestionDeclined: run.kept.suggestionDeclined,
      doodleControls: run.kept.readings,
    },
    'session-0',
  )
  return { ...run, host: made.host, writeAgain, start: made.jam.start }
}

// @test-link [[module_kept_jam_session]]
// @test-link [[rule_jam_on_held_doodle_skips_capture]]
describe("a Jam on the kept doodle's save and read back", () => {
  // @test-link [[module_kept_jam_session]]
  // @test-link [[rule_jam_on_held_doodle_skips_capture]]
  it('saves the kept doodle and its capture tempo, no clock, its played notes from phrase 1, no raw doodle note', async () => {
    const run = await keptDoodleJamRig({ controller: { savedKeepPlayedNotes: true } })
    await playJam(run, () => run.rig.controller.startOnKeptDoodle(run.request))

    const changes = saved(run.rig, 0)
    expect(written(changes, 'sessionSummaries')).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: false, playedNotesKept: true }),
    )
    const session = decoded(changes)
    expect(session.jam).toEqual({
      doodle: { quantized: run.kept.doodle, captureTempo: run.kept.captureTempo },
      playedNotesClock: null,
      rawDoodleNotes: [],
    })
    const notes = session.phrases[0]!.playedNotes
    expect(notes.map((note) => note.pitch)).toEqual([62])
    expect(notes[0]!.onsetAt).toBeGreaterThan(0.45)
    expect(notes[0]!.onsetAt).toBeLessThan(0.55)
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('saves a declined suggestion as declined', async () => {
    const run = await keptDoodleJamRig({ suggestionDeclined: true })
    await playJam(run, () => run.rig.controller.startOnKeptDoodle(run.request))

    expect(written(saved(run.rig, 0), 'sessionSummaries')).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: true }),
    )
  })

  // @test-link [[module_kept_jam_session]]
  // @test-link [[req_kept_session_review]]
  it('reads back to the review its end showed: the kept doodle at its capture tempo, its lane empty, its decline', async () => {
    const run = await keptDoodleJamRig({ suggestionDeclined: true })
    const review = await playJam(run, () => run.rig.controller.startOnKeptDoodle(run.request))
    const at = review.history.phrases()[0]!.startedAt
    const changes = saved(run.rig, 0)

    const read = await readKeptReviewedSession(
      () =>
        Promise.resolve({
          summary: written(changes, 'sessionSummaries'),
          body: written(changes, 'sessionBodies'),
          playedNotes: written(changes, 'playedNotes'),
        }),
      review.key,
    )

    if (read.kind !== 'read') throw new Error(`expected the session read, got ${read.kind}`)
    const shown = review.jam!
    expect(read.session.jam).toEqual({
      doodle: {
        ...shown.doodle,
        firstBarlineAt: expect.closeTo(shown.doodle.firstBarlineAt - at, 9),
        endBarlineAt: expect.closeTo(shown.doodle.endBarlineAt - at, 9),
      },
      countInStartAt: null,
      suggestion: null,
      suggestionDeclined: true,
      doodleControls: null,
    })
  })

  // @test-link [[rule_seeded_phrase_reproduction]]
  // @test-link [[rule_jam_again_on_this_doodle]]
  it('gives the same phrase 1 from the doodle read back, with the same settings and seeds', async () => {
    const run = await keptDoodleJamRig()
    const review = await playJam(run, () => run.rig.controller.startOnKeptDoodle(run.request))
    const changes = saved(run.rig, 0)
    const read = await readKeptReviewedSession(
      () =>
        Promise.resolve({
          summary: written(changes, 'sessionSummaries'),
          body: written(changes, 'sessionBodies'),
          playedNotes: written(changes, 'playedNotes'),
        }),
      review.key,
    )
    if (read.kind !== 'read') throw new Error(`expected the session read, got ${read.kind}`)

    const again = keptPhraseOneFrom(read.session.jam!.doodle.doodle, run.rig.settings)

    expect(read.session.jam!.doodle.doodle).not.toBe(run.kept.doodle)
    expect(again.intent).toEqual(run.phraseOne.intent)
    expect(again.outcome).toEqual(run.phraseOne.outcome)
  })
})

// @test-link [[module_kept_doodle]]
// @test-link [[rule_held_doodle_dropped_on_change]]
describe('the kept doodle across Jams on it', () => {
  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('keeps the same doodle from the session just played and writes phrase 1 again once; a count-in end writes nothing', async () => {
    const run = await workspaceJamRig()
    const doodle = run.host.kept.value!.doodle

    run.start()
    await playTo(run.rig, phraseOneAt(run.rig) - 0.3)
    run.rig.controller.stop()
    expect(run.writeAgain).not.toHaveBeenCalled()
    expect(run.host.kept.value?.sessionKey).toBe('session-0')

    const review = await playJam(run, run.start)

    expect(run.writeAgain).toHaveBeenCalledTimes(1)
    expect(run.host.kept.value?.doodle).toBe(doodle)
    expect(run.host.kept.value?.sessionKey).toBe(review.key)
    expect(run.rig.freshPhraseRequests).toEqual([])
  })

  // @test-link [[module_kept_doodle]]
  // @test-link [[rule_held_doodle_dropped_on_change]]
  it('keeps it when a second Jam replaces the first, unpinned, session; deleting the latest session played on it lets it go', async () => {
    const run = await workspaceJamRig()
    const first = await playJam(run, run.start)
    const firstRecords = saved(run.rig, 0)

    const second = await playJam(run, run.start)
    const secondChanges = saved(run.rig, 1, firstRecords)

    expect(secondChanges).toContainEqual({ kind: 'delete', store: 'sessionBodies', key: first.key })
    expect(run.rig.controller.state.lastDeletion).toBeNull()
    expect(run.host.kept.value?.sessionKey).toBe(second.key)
    expect(run.writeAgain).toHaveBeenCalledTimes(2)

    run.rig.controller.closeReview()
    await run.rig.controller.deleteSession(second.key)

    expect(run.host.kept.value).toBeNull()
  })
})
