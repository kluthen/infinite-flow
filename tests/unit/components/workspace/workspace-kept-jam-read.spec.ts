/**
 * A kept Jam session read back for its Review: the reviewed session's Jam part from its records,
 * in the shape a just-ended Jam's has, every time on its phrases' clock (phrase 1 at 0): its
 * quantized doodle with its capture tempo and barlines, its count-in's first beat, its raw doodle
 * notes when its played notes are kept (none otherwise), its decline as stored, and neither a
 * suggestion nor controls, which the records do not hold. A session that is no Jam has none.
 */
import { describe, expect, it } from 'vitest'

import { readKeptReviewedSession } from '@/components/workspace/workspace-kept-session-read'
import { endedSessionSave, keptSessionChanges } from '@/components/workspace/workspace-session-save'
import type { ReviewedSession } from '@/components/workspace/workspace-session-controller-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { APP_VERSION } from '@/storage/app-version'
import * as codec from '@/storage/records/kept-session-record'
import type { StorageChange } from '@/storage/storage-port'

import { recordedKeptSession } from '../../storage/kept-session-fixtures'
import {
  JAM_COUNT_IN_AT,
  JAM_DOODLE_END_BARLINE_AT,
  JAM_DOODLE_FIRST_BARLINE_AT,
  KEPT_DOODLE,
  RAW_DOODLE_NOTES,
  jamHistory,
  reviewedJamPart,
} from './reviewed-jam-part-fixture'

/**
 * Intent: the session the Review of the fresh Jam kept by its own save draws once read back, its
 * played notes kept or not, its suggestion declined or not.
 */
async function readBack(keep: boolean, declined: boolean): Promise<ReviewedSession> {
  const history = jamHistory(true)
  const saving = endedSessionSave(history, keep, BUILT_IN_PRESETS, reviewedJamPart())
  const held = { pinned: false, favorites: [], comment: '', suggestionDeclined: declined }
  const changes = keptSessionChanges(codec, history, saving, [], APP_VERSION, held)
  const stored = (store: StorageChange['store']): unknown => {
    const write = changes.find((change) => change.kind === 'write' && change.store === store)
    return write?.kind === 'write' ? structuredClone(write.record) : undefined
  }
  const read = await readKeptReviewedSession(
    () =>
      Promise.resolve({
        summary: stored('sessionSummaries'),
        body: stored('sessionBodies'),
        playedNotes: stored('playedNotes'),
      }),
    saving.key,
  )
  if (read.kind !== 'read') throw new Error(`expected the session read, got ${read.kind}`)
  return read.session
}

/** Phrase 1's start on the audio clock of the fixture's fresh Jam. */
const PHRASE_ONE_AT = jamHistory(false).phrases()[0]!.startedAt

// @test-link [[module_kept_jam_session]]
// @test-link [[req_kept_session_review]]
describe('a kept Jam session read back for its Review', () => {
  it("gives its Jam part on its phrases' clock: the doodle, its barlines, the count-in, the raw notes kept", async () => {
    const session = await readBack(true, false)

    expect(session.history.phrases()[0]?.startedAt).toBe(0)
    const jam = session.jam!
    expect(jam.doodle.doodle).toEqual(KEPT_DOODLE.quantized)
    expect(jam.doodle.captureTempo).toBe(KEPT_DOODLE.captureTempo)
    expect(jam.doodle.firstBarlineAt).toBeCloseTo(JAM_DOODLE_FIRST_BARLINE_AT - PHRASE_ONE_AT, 9)
    expect(jam.doodle.endBarlineAt).toBeCloseTo(JAM_DOODLE_END_BARLINE_AT - PHRASE_ONE_AT, 9)
    expect(jam.countInStartAt).toBeCloseTo(JAM_COUNT_IN_AT - PHRASE_ONE_AT, 9)
    expect(jam.doodle.playedNotes.map((note) => note.onsetAt)).toEqual(
      RAW_DOODLE_NOTES.map((note) => expect.closeTo(note.onsetAt - PHRASE_ONE_AT, 9)),
    )
    expect(jam.doodle.playedNotes.map((note) => note.pitch)).toEqual(
      RAW_DOODLE_NOTES.map((note) => note.pitch),
    )
    expect(jam.suggestion).toBeNull()
    expect(jam.doodleControls).toBeNull()
    expect(jam.suggestionDeclined).toBe(false)
    expect(Object.isFrozen(jam.doodle)).toBe(true)
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('holds no raw doodle note when its played notes were not kept, its doodle still there', async () => {
    const session = await readBack(false, false)

    expect(session.jam?.doodle.playedNotes).toEqual([])
    expect(session.jam?.doodle.doodle).toEqual(KEPT_DOODLE.quantized)
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('reads its decline as stored', async () => {
    expect((await readBack(false, true)).jam?.suggestionDeclined).toBe(true)
  })

  it('gives a session that is no Jam no Jam part', async () => {
    const history = recordedKeptSession('bb-tenor', 2)
    const records = codec.encodeKeptSession(
      history,
      {
        pinned: false,
        favorites: [],
        comment: '',
        playedNotesKept: false,
        presets: BUILT_IN_PRESETS,
      },
      APP_VERSION,
    )
    const read = await readKeptReviewedSession(
      () =>
        Promise.resolve({
          summary: structuredClone(records.summary),
          body: structuredClone(records.body),
          playedNotes: undefined,
        }),
      'k',
    )

    expect(read.kind === 'read' && read.session.jam).toBeUndefined()
  })
})
