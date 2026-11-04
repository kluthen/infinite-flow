/**
 * A kept Jam session through the change path, on a real save policy over fake-indexeddb: its own
 * save keeps its quantized doodle with its capture tempo and its clock whatever `Keep my played
 * notes` says, its raw doodle notes only under the opt-in (and as played notes to keep when only
 * the doodle was played); `Keep mine` rewrites its session-wide record with the decline and
 * nothing else; deleting its played notes deletes the raw doodle notes and keeps the doodle;
 * deleting the session, or every session, removes both forms.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deletePlayedNotesChanges,
  keepPlayedNotesChanges,
  deleteEveryPlayedNoteChanges,
} from '@/components/workspace/kept-session-changes'
import {
  changeKeptDecline,
  deleteEveryKeptSession,
  deleteKeptSession,
} from '@/components/workspace/kept-session-review-changes'
import {
  ENDED_SESSION_FACTS,
  endedSessionSave,
  keptFreshJam,
  keptSessionChanges,
} from '@/components/workspace/workspace-session-save'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { APP_VERSION } from '@/storage/app-version'
import * as codec from '@/storage/records/kept-session-record'
import { createSavePolicy } from '@/storage/save-policy'
import { createVisitSaves, type VisitSaves } from '@/storage/settings-saver'
import type { StoragePort } from '@/storage/storage-port'

import { readyPort } from '../../storage/save-policy-doubles'
import { freshFactory } from '../../storage/storage-test-doubles'
import {
  JAM_COUNT_IN_AT,
  KEPT_DOODLE,
  RAW_DOODLE_NOTES,
  jamHistory,
  reviewedJamPart,
} from './reviewed-jam-part-fixture'

/** A port, the visit's saves over a real policy on it, and its batches counted. */
interface Rig {
  readonly port: StoragePort
  readonly saves: VisitSaves
  readonly key: string
  readonly batches: () => number
}

/**
 * Intent: a port holding the Jam-style session saved at its end as a fresh Jam, its phrases
 * holding played notes or none, its doodle's raw notes those given, `Keep my played notes` as
 * `keep` says; the batches counted from then on.
 */
async function savedJam(
  keep: boolean,
  playedInPhrases: boolean,
  rawDoodleNotes = RAW_DOODLE_NOTES,
): Promise<Rig> {
  const port = await readyPort(freshFactory())
  const history = jamHistory(playedInPhrases)
  const saving = endedSessionSave(history, keep, BUILT_IN_PRESETS, reviewedJamPart(rawDoodleNotes))
  await port.apply(keptSessionChanges(codec, history, saving, [], APP_VERSION))
  const policy = createSavePolicy(port)
  const apply = vi.spyOn(port, 'apply')
  return {
    port,
    saves: createVisitSaves(Promise.resolve(policy), APP_VERSION),
    key: saving.key,
    batches: () => apply.mock.calls.length,
  }
}

/** Intent: the kept session stored under `key`, as its three stores hold it. */
async function storedSession(port: StoragePort, key: string): Promise<codec.StoredKeptSession> {
  const [summary, body, playedNotes] = await Promise.all([
    port.read('sessionSummaries', key),
    port.read('sessionBodies', key),
    port.read('playedNotes', key),
  ])
  return { summary, body, playedNotes }
}

/** Intent: the kept session under `key` decoded, failing unless it reads as current. */
async function decoded(port: StoragePort, key: string): Promise<codec.KeptSession> {
  const reading = codec.decodeKeptSession(await storedSession(port, key))
  if (reading.reading !== 'current') throw new Error(`expected current, got ${reading.reading}`)
  return reading.value
}

/** Intent: every played note's onset the played-notes record under `key` holds, as stored. */
async function storedOnsets(port: StoragePort, key: string): Promise<readonly number[]> {
  const record = (await port.read('playedNotes', key)) as { notes: { onset: number }[] }
  return record.notes.map((note) => note.onset)
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[module_kept_jam_session]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
// @test-link [[rule_quantized_doodle_is_generation_input]]
describe("a Jam session's own save", () => {
  it('keeps the doodle and its tempo, the Jam mark and no raw doodle note with the opt-in off', async () => {
    const rig = await savedJam(false, true)

    const session = await decoded(rig.port, rig.key)
    expect(session.summary).toEqual(
      expect.objectContaining({ isJam: true, suggestionDeclined: false, playedNotesKept: false }),
    )
    expect(session.jam?.doodle).toEqual(KEPT_DOODLE)
    expect(session.jam?.playedNotesClock).not.toBeNull()
    expect(session.jam?.rawDoodleNotes).toEqual([])
    expect(await rig.port.read('playedNotes', rig.key)).toBeUndefined()
  })

  it('keeps the raw doodle notes with the opt-in on, told apart by their times from the count-in', async () => {
    const rig = await savedJam(true, true)

    const session = await decoded(rig.port, rig.key)
    expect(session.jam?.rawDoodleNotes.map((note) => note.onsetAt)).toEqual(
      RAW_DOODLE_NOTES.map((note) => note.onsetAt - JAM_COUNT_IN_AT),
    )
    const clock = session.jam!.playedNotesClock!
    const onsets = await storedOnsets(rig.port, rig.key)
    expect(onsets.filter((onset) => onset < clock.phraseOneStart)).toHaveLength(3)
    expect(onsets.filter((onset) => onset >= clock.phraseOneStart)).toHaveLength(4)
    expect(session.phrases.every((phrase) => phrase.playedNotes.length === 2)).toBe(true)
  })

  it('keeps the raw doodle notes of a Jam in which only the doodle was played, under the opt-in', async () => {
    const rig = await savedJam(true, false)

    expect((await decoded(rig.port, rig.key)).summary.playedNotesKept).toBe(true)
    expect(await storedOnsets(rig.port, rig.key)).toHaveLength(3)
  })

  it('keeps no played-notes record for a Jam in which nothing was played, even under the opt-in', async () => {
    const rig = await savedJam(true, false, [])

    expect((await decoded(rig.port, rig.key)).summary.playedNotesKept).toBe(false)
    expect(await rig.port.read('playedNotes', rig.key)).toBeUndefined()
  })

  it('carries the decline in a retry, as held in memory then', () => {
    const history = jamHistory(false)
    const saving = endedSessionSave(history, false, BUILT_IN_PRESETS, reviewedJamPart())
    const held = { ...ENDED_SESSION_FACTS, suggestionDeclined: true }

    const [summary] = keptSessionChanges(codec, history, saving, [], APP_VERSION, held)

    expect(summary).toEqual(
      expect.objectContaining({
        store: 'sessionSummaries',
        record: expect.objectContaining({ isJam: true, suggestionDeclined: true }),
      }),
    )
  })
})

// @test-link [[module_kept_session_changes]]
// @test-link [[rule_suggestion_keep_mine]]
describe("a Jam session's Keep mine after its save", () => {
  it('rewrites its session-wide record with the decline, in one batch, and nothing else', async () => {
    const rig = await savedJam(true, true)
    const before = await storedSession(rig.port, rig.key)

    expect(await changeKeptDecline(rig.saves, rig.key)).toEqual({ status: 'saved' })

    expect(rig.batches()).toBe(1)
    const after = await storedSession(rig.port, rig.key)
    expect(after.summary).toEqual({ ...(before.summary as object), suggestionDeclined: true })
    expect(after.body).toEqual(before.body)
    expect(after.playedNotes).toEqual(before.playedNotes)
  })
})

// @test-link [[rule_deleting_played_notes_keeps_quantized_doodle]]
// @test-link [[rule_kept_played_notes_deletable]]
describe("a Jam session's played notes, kept or deleted after its save", () => {
  it('deleting them deletes the raw doodle notes and keeps the doodle and its clock', async () => {
    const rig = await savedJam(true, true)
    const before = await storedSession(rig.port, rig.key)

    await rig.saves.changeKept(deletePlayedNotesChanges(codec, rig.key, APP_VERSION), 'caller')

    const session = await decoded(rig.port, rig.key)
    expect(await rig.port.read('playedNotes', rig.key)).toBeUndefined()
    expect(await rig.port.read('sessionBodies', rig.key)).toEqual(before.body)
    expect(session.jam?.doodle).toEqual(KEPT_DOODLE)
    expect(session.jam?.rawDoodleNotes).toEqual([])
  })

  it('deleting every kept played note keeps the doodle too', async () => {
    const rig = await savedJam(true, false)

    await rig.saves.changeKept(deleteEveryPlayedNoteChanges(codec, APP_VERSION), 'caller')

    expect(await rig.port.read('playedNotes', rig.key)).toBeUndefined()
    expect((await decoded(rig.port, rig.key)).jam?.doodle).toEqual(KEPT_DOODLE)
  })

  it('keeping them after the save writes the raw doodle notes, timed from the count-in', async () => {
    const rig = await savedJam(false, false)
    const history = jamHistory(false)
    const fresh = keptFreshJam(reviewedJamPart())

    await rig.saves.changeKept(
      keepPlayedNotesChanges(codec, rig.key, history, APP_VERSION, fresh),
      'notice',
    )

    expect(await rig.port.read('playedNotes', rig.key)).toEqual(
      codec.encodeKeptPlayedNotes(history, APP_VERSION, fresh),
    )
    expect((await decoded(rig.port, rig.key)).jam?.rawDoodleNotes).toHaveLength(3)
  })
})

// @test-link [[module_kept_jam_session]]
// @test-link [[rule_delete_everything]]
describe('a Jam session deleted', () => {
  it('Delete session removes its three records, so both forms of its doodle', async () => {
    const rig = await savedJam(true, true)

    await deleteKeptSession(rig.saves, rig.key)

    expect(await storedSession(rig.port, rig.key)).toEqual({
      summary: undefined,
      body: undefined,
      playedNotes: undefined,
    })
  })

  it('Delete every session leaves no Jam session', async () => {
    const rig = await savedJam(true, false)

    await deleteEveryKeptSession(rig.saves)

    expect(await rig.port.readKeys('sessionSummaries')).toEqual([])
    expect(await rig.port.readKeys('sessionBodies')).toEqual([])
    expect(await rig.port.readKeys('playedNotes')).toEqual([])
  })
})
