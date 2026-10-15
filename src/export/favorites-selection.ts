/**
 * The phrases an export scope holds. The whole session passes through untouched. Favorites only
 * keeps the session's favorite phrases, in session order, each with its session phrase number, and
 * lays them out as a whole session of those phrases alone: the first where it started, each next
 * one right where the one before ends, at its own tempo, with no gap where a phrase was left out.
 * Phrases that followed each other in the session move together, so a run of them keeps its own
 * timing exactly; a played note keeps its times from its own phrase's start. Where a run ends
 * before a phrase that is not exported, the run is cut at its end: a played note held past it stops
 * there, and one played after it is left out. The session's last phrase is cut by the encoder, as
 * in a whole session. Both files of one scope are built from this one selection, so they line up.
 * Pure: no clock, no storage.
 */

import type { RecordedPlayedNote, ReviewedPhrase } from '../session/session-history'
import type { ExportScope } from './export-file'
import { phraseSeconds } from './midi/midi-time'

/** What the selection reads and rewrites of a phrase: its number, time, tempo and played notes. */
type ScopedPhrase = Pick<ReviewedPhrase, 'phraseNumber' | 'startedAt' | 'tempo' | 'playedNotes'>

/** Typed failure for a favorites-only scope no file can be made from; never repaired. */
// @spec-link [[rule_favorites_only_export]]
export class FavoritesSelectionError extends Error {
  readonly kind = 'FavoritesSelectionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'FavoritesSelectionError'
  }
}

/**
 * Intent: the positions in `records` of the favorite phrases, in session order. Throws a
 * FavoritesSelectionError on no favorite (the scope is unavailable then) or on a favorite the
 * session does not hold.
 */
function favoritePositions(
  records: readonly ScopedPhrase[],
  favorites: readonly number[],
): number[] {
  if (favorites.length === 0) {
    throw new FavoritesSelectionError('A favorites-only export needs at least one favorite.')
  }
  const wanted = new Set(favorites)
  const positions = records.flatMap((record, position) =>
    wanted.has(record.phraseNumber) ? [position] : [],
  )
  if (positions.length !== wanted.size) {
    const held = new Set(records.map((record) => record.phraseNumber))
    const missing = [...wanted].filter((number) => !held.has(number))
    throw new FavoritesSelectionError(`The session holds no phrase ${missing.join(', ')}.`)
  }
  return positions
}

/** Intent: the positions grouped into runs of phrases that followed each other in the session. */
function runsOf(positions: readonly number[]): number[][] {
  const runs: number[][] = []
  for (const position of positions) {
    const run = runs.at(-1)
    if (run !== undefined && run.at(-1)! + 1 === position) run.push(position)
    else runs.push([position])
  }
  return runs
}

/**
 * Intent: a played note moved by `shift` seconds; when `cutAt` is set, null for a note played at
 * or after it, and a note held past it stopped there.
 */
function movedNote(
  note: RecordedPlayedNote,
  shift: number,
  cutAt: number | null,
): RecordedPlayedNote | null {
  const onsetAt = note.onsetAt + shift
  const releaseAt = note.releaseAt + shift
  if (cutAt === null) return { ...note, onsetAt, releaseAt }
  if (onsetAt >= cutAt) return null
  return { ...note, onsetAt, releaseAt: Math.min(releaseAt, cutAt) }
}

/**
 * Intent: one run's phrases moved by `shift` seconds, and cut at the run's end unless the run ends
 * the session; a run neither moved nor cut is handed back as it is.
 */
function movedRun<R extends ScopedPhrase>(
  records: readonly R[],
  run: readonly number[],
  shift: number,
): R[] {
  const lastPosition = run.at(-1)!
  const last = records[lastPosition]!
  const cutAt =
    lastPosition === records.length - 1 ? null : last.startedAt + shift + phraseSeconds(last.tempo)
  return run.map((position) => {
    const record = records[position]!
    if (shift === 0 && cutAt === null) return record
    const playedNotes = record.playedNotes.flatMap((note) => movedNote(note, shift, cutAt) ?? [])
    return { ...record, startedAt: record.startedAt + shift, playedNotes }
  })
}

/**
 * Intent: the phrases `scope` exports from `records` (the session's phrases in order): all of them
 * as they are for the whole session; for favorites only, the favorite phrases in session order with
 * their session numbers, laid out back to back from the first one's start, each run of phrases
 * that followed each other in the session moved as one and cut at its end when the next phrase is
 * not exported. Throws a FavoritesSelectionError on a favorites-only scope with no favorite or with
 * a favorite the session does not hold.
 */
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[req_session_export]]
// @spec-link [[req_played_notes_export]]
export function phrasesInScope<R extends ScopedPhrase>(
  records: readonly R[],
  scope: ExportScope,
): readonly R[] {
  if (scope.kind === 'wholeSession') return records
  const selected: R[] = []
  let nextStart: number | null = null
  for (const run of runsOf(favoritePositions(records, scope.favorites))) {
    const first = records[run[0]!]!
    const shift = nextStart === null ? 0 : nextStart - first.startedAt
    const moved: R[] = movedRun(records, run, shift)
    const last: R = moved.at(-1)!
    nextStart = last.startedAt + phraseSeconds(last.tempo)
    selected.push(...moved)
  }
  return selected
}
