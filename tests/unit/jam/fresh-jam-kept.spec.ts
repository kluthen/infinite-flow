/**
 * A fresh Jam's own save and its decline, through the workspace's session controller, on the
 * controller rig (fake audio clock, fake MIDI, scripted generations; 240 BPM, a 1 s measure): the
 * save writes the Jam mark with no decline, the quantized doodle with its capture tempo and the
 * clock, and the raw doodle notes only under `Keep my played notes`; a Jam in which only the doodle
 * was played keeps its raw doodle notes under the opt-in. `Keep mine` declines at once in memory
 * and is saved as a change after the save; while saving is off nothing is written; a retry of a
 * refused save carries it.
 */
import { describe, expect, it, vi } from 'vitest'

import type { KeptSessionsSeam } from '@/components/workspace/workspace-kept-sessions-seam'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { startFreshJam, type FreshJam } from '@/jam/fresh-jam'
import type { KeptRefusal, SessionChanges, SessionSaveOutcome } from '@/storage/save-policy'
import type { StorageChange } from '@/storage/storage-port'
import type { AudioTime } from '@/session/session-types'
import {
  controllerRig,
  flush,
  playTo,
  type ControllerRig,
  type ControllerRigOptions,
} from '../components/workspace/session-controller-rig'
import { connectKeys, lift, press } from '../components/workspace/session-controller-midi'

/** A started fresh Jam on a connected rig, with the changes after the save it was asked for. */
interface RigJam {
  readonly rig: ControllerRig
  readonly jam: FreshJam
  readonly countInEndsAt: AudioTime
  readonly changes: KeptRefusal[]
}

/** Intent: a connected rig with a fresh Jam started, its changes after the save logged. */
async function startJam(options: ControllerRigOptions = {}, savingOff = false): Promise<RigJam> {
  const changes: KeptRefusal[] = []
  const keptSessions: Partial<KeptSessionsSeam> = {
    savingOff: () => savingOff,
    changes: {
      changeKept: (_changes, refusal) => {
        changes.push(refusal)
        return Promise.resolve({ status: 'saved' })
      },
      readKept: () => {
        throw new Error('no read at a change is asked for')
      },
    },
  }
  const rig = controllerRig(undefined, undefined, { ...options, keptSessions })
  await connectKeys(rig)
  const jam = startFreshJam({
    startWithoutPhraseOne: rig.controller.startWithoutPhraseOne,
    jam: { settings: rig.settings, drift: 'Near' },
    clef: BUILT_IN_INSTRUMENT_CLEF,
  })
  return { rig, jam, countInEndsAt: jam.session.timeline.countInEndsAt, changes }
}

/** Intent: a one-measure doodle of four quarter notes, then Stop one measure into phrase 1. */
async function doodleThenStop(run: RigJam): Promise<void> {
  for (const [index, pitch] of [60, 62, 64, 65].entries()) {
    await playTo(run.rig, run.countInEndsAt + index * 0.25 + 0.01)
    press(run.rig, pitch)
    await playTo(run.rig, run.countInEndsAt + index * 0.25 + 0.2)
    lift(run.rig, pitch)
  }
  await playTo(run.rig, run.countInEndsAt + 4.5)
  run.rig.controller.stop()
  // The save loads the kept-session codec on demand first.
  await vi.waitFor(() => expect(run.rig.sessionSaves.length).toBeGreaterThan(0))
  await flush()
}

/** Intent: the records the `index`th session save wrote from no kept summary, by store. */
function savedRecords(
  rig: ControllerRig,
  index: number,
): Partial<Record<StorageChange['store'], Record<string, unknown>>> {
  const changes: SessionChanges | undefined = rig.sessionSaves[index]
  if (changes === undefined) throw new Error(`no session save ${index} was asked for`)
  return Object.fromEntries(
    changes([]).flatMap((change) =>
      change.kind === 'write'
        ? [[change.store, Object.fromEntries(Object.entries(change.record))]]
        : [],
    ),
  )
}

/** Intent: the review's session key, which must exist. */
function reviewKey(rig: ControllerRig): string {
  const review = rig.controller.state.review
  if (review === null) throw new Error('no Review exists')
  return review.key
}

// @test-link [[module_kept_jam_session]]
// @test-link [[module_kept_session_save]]
describe("a fresh Jam's own save", () => {
  // @test-link [[rule_quantized_doodle_is_generation_input]]
  it('writes the Jam mark, the doodle with its tempo and its clock, and no raw note with the opt-in off', async () => {
    const run = await startJam()
    await doodleThenStop(run)

    const records = savedRecords(run.rig, 0)
    expect(records.sessionSummaries).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: false, playedNotesKept: false }),
    )
    expect(records.sessionBodies?.doodle).toEqual({
      quantized: run.rig.controller.state.review?.jam?.doodle.doodle,
      captureTempo: run.rig.settings.controls.tempo,
    })
    expect(records.sessionBodies?.playedNotesClock).toBeDefined()
    expect(records.playedNotes).toBeUndefined()
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('keeps the raw doodle notes of a Jam in which only the doodle was played, under the opt-in', async () => {
    const run = await startJam({ savedKeepPlayedNotes: true })
    await doodleThenStop(run)

    const records = savedRecords(run.rig, 0)
    expect(records.sessionSummaries?.playedNotesKept).toBe(true)
    expect((records.playedNotes?.notes as unknown[]).length).toBe(4)
    expect(run.rig.controller.state.review?.playedNotesKept).toBe(true)
  })
})

// @test-link [[rule_suggestion_keep_mine]]
// @test-link [[module_kept_session_changes]]
describe("a fresh Jam's Keep mine", () => {
  it('declines at once in memory, in the review and the most recent session, saved as a change', async () => {
    const run = await startJam()
    await doodleThenStop(run)

    await run.rig.controller.declineSuggestion(reviewKey(run.rig))

    const { review, mostRecent } = run.rig.controller.state
    expect(review?.jam?.suggestionDeclined).toBe(true)
    expect(mostRecent?.kind === 'held' && mostRecent.session.jam?.suggestionDeclined).toBe(true)
    expect(run.changes).toEqual(['notice'])
    await run.rig.controller.declineSuggestion(reviewKey(run.rig))
    expect(run.changes).toEqual(['notice'])
  })

  // @test-link [[rule_jam_in_visits_that_save_nothing]]
  it('while saving is off, holds in memory for the visit and writes nothing', async () => {
    const run = await startJam({}, true)
    await doodleThenStop(run)

    await run.rig.controller.declineSuggestion(reviewKey(run.rig))

    expect(run.rig.controller.state.review?.jam?.suggestionDeclined).toBe(true)
    expect(run.changes).toEqual([])
  })

  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('after a refused save, is carried by the retry of that save', async () => {
    const outcomes: SessionSaveOutcome[] = [{ status: 'refused', kind: 'other' }]
    const run = await startJam({
      sessionSaveOutcome: () => Promise.resolve(outcomes.shift() ?? { status: 'saved' }),
    })
    await doodleThenStop(run)
    expect(run.rig.controller.state.review?.keeping).toBe('not-saved')

    await run.rig.controller.declineSuggestion(reviewKey(run.rig))

    expect(run.changes).toEqual([])
    expect(savedRecords(run.rig, 1).sessionSummaries).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: true }),
    )
    expect(savedRecords(run.rig, 1).sessionBodies?.doodle).toEqual(
      savedRecords(run.rig, 0).sessionBodies?.doodle,
    )
  })

  it('refuses a session that is no Jam', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 10.2)
    rig.controller.stop()
    await flush()

    expect(() => rig.controller.declineSuggestion(reviewKey(rig))).toThrow(
      'a session that is no Jam declines nothing',
    )
  })
})
