/**
 * A Jam session in the Review's pure transitions: its raw doodle notes count as played notes to
 * keep, deleting its played notes empties them and keeps its quantized doodle, and `Keep mine`
 * declines its suggestion; a session that is no Jam declines nothing.
 */
import { describe, expect, it } from 'vitest'

import {
  endedSession,
  holdsPlayedNote,
  mayKeepPlayedNotes,
  withoutPlayedNotes,
  withSuggestionDeclined,
} from '@/components/workspace/session-review-state'
import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { recordedKeptSession } from '../../storage/kept-session-fixtures'
import { KEPT_DOODLE, jamHistory, reviewedJamPart } from './reviewed-jam-part-fixture'

/** How each ended session here is saved: under a fixed key, its played notes not kept. */
const SAVE = {
  key: 'session-1-1',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
  jam: null,
} as const

/** Intent: a session-mode session's closed history, two phrases on the tenor. */
function history() {
  return recordedKeptSession('bb-tenor', 2)
}

// @test-link [[module_kept_jam_session]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe("a Jam session's played notes and decline in the Review", () => {
  /** Intent: the reviewed fresh Jam, its phrases holding played notes or none, its raw notes given. */
  function jamSession(playedInPhrases: boolean, raw = reviewedJamPart()) {
    return endedSession(jamHistory(playedInPhrases), 'not-pinned', SAVE, raw)
  }

  it('holds played notes to keep when only the doodle was played, and none with no raw note', () => {
    expect(holdsPlayedNote(jamSession(false))).toBe(true)
    expect(mayKeepPlayedNotes(jamSession(false))).toBe(true)
    expect(holdsPlayedNote(jamSession(false, reviewedJamPart([])))).toBe(false)
    expect(holdsPlayedNote(jamSession(true, reviewedJamPart([])))).toBe(true)
  })

  // @test-link [[rule_deleting_played_notes_keeps_quantized_doodle]]
  it('deleting its played notes empties the raw doodle notes too and keeps the doodle', () => {
    const deleted = withoutPlayedNotes(jamSession(true))

    expect(holdsPlayedNote(deleted)).toBe(false)
    expect(deleted.jam?.doodle.playedNotes).toEqual([])
    expect(deleted.jam?.doodle.doodle).toEqual(KEPT_DOODLE.quantized)
    expect(deleted.jam?.countInStartAt).toBe(reviewedJamPart().countInStartAt)
    expect(Object.isFrozen(deleted.jam)).toBe(true)
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('declines its suggestion, every other fact as held, and refuses a session that is no Jam', () => {
    const session = jamSession(false)
    const declined = withSuggestionDeclined(session)

    expect(declined.jam?.suggestionDeclined).toBe(true)
    expect({ ...declined, jam: undefined }).toEqual({ ...session, jam: undefined })
    expect(() => withSuggestionDeclined(endedSession(history(), 'not-pinned', SAVE))).toThrow(
      SessionControllerError,
    )
  })
})
