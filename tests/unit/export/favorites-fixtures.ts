/**
 * A hand-laid seven-phrase session for the favorites-only export specs: real recorded phrases
 * (their timelines and harmonies), renumbered 1 to 7, each at a tempo of its own, back to back on
 * the audio clock from 2 s, with played notes given as offsets from their phrase's start, so every
 * expected MIDI tick can be worked out by hand. Phrase 2 holds a note held into phrase 3.
 */
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import { longHistory } from '../components/review/review-fixtures'
import { phraseLength, phraseStarts } from './midi/played-notes-fixtures'

/** The tempo of each of the seven phrases, phrase 1 first. */
export const SEVEN_TEMPOS: readonly number[] = [120, 90, 120, 100, 80, 150, 120]

/** Where phrase 1 starts on the audio clock, in seconds. */
const FIRST_START = 2

/** A played note as its pitch and its onset and release in seconds from its phrase's start. */
type Offsets = readonly [pitch: number, onset: number, release: number]

/** The played notes of each phrase, phrase 1 first, as offsets from that phrase's start. */
const SEVEN_PLAYED: readonly (readonly Offsets[])[] = [
  [[57, 1, 1.5]],
  // Phrase 2 (90 BPM, 10.667 s): a note at 0.5 s, and one from 0.5 s before its end held 1 s,
  // so half a second into phrase 3.
  [
    [60, 0.5, 1],
    [62, phraseLength(90) - 0.5, phraseLength(90) + 0.5],
  ],
  [[64, 0.25, 0.75]],
  [[65, 1, 2]],
  // Phrase 5 (80 BPM): a note from 1 s to 1.5 s.
  [[67, 1, 1.5]],
  // Phrase 6 (150 BPM): a note from 2 s to 2.25 s.
  [[69, 2, 2.25]],
  [[71, 0.5, 1]],
]

/** The note-on velocity of every played note of the session. */
export const SEVEN_VELOCITY = 80

/** Intent: a played note at absolute audio-clock times from its phrase's start. */
function played(start: number, [pitch, onset, release]: Offsets): RecordedPlayedNote {
  return {
    pitch: makeConcertPitch(pitch),
    velocity: SEVEN_VELOCITY,
    onsetAt: start + onset,
    releaseAt: start + release,
  }
}

/**
 * Intent: the seven-phrase session's records, phrase 1 first: numbered 1 to 7, at
 * SEVEN_TEMPOS, back to back from 2 s, each holding its played notes.
 */
export function sevenPhraseRecords(
  playedNotes: readonly (readonly Offsets[])[] = SEVEN_PLAYED,
): SessionHistoryRecord[] {
  const starts = phraseStarts(FIRST_START, SEVEN_TEMPOS)
  return longHistory(SEVEN_TEMPOS.length).map((record, index) => ({
    ...record,
    tempo: SEVEN_TEMPOS[index]!,
    startedAt: starts[index]!,
    playedNotes: (playedNotes[index] ?? []).map((note) => played(starts[index]!, note)),
  }))
}

/** The session start of the seven-phrase session, epoch milliseconds (2026-10-04 07:05:09). */
export const SEVEN_STARTED_AT = new Date(2026, 9, 4, 7, 5, 9).getTime()

/** Intent: the seven-phrase session as the export reads it, with a comment the Review shows. */
export function sevenPhraseHistory(
  records: readonly SessionHistoryRecord[] = sevenPhraseRecords(),
) {
  return { phrases: () => records, startedAt: SEVEN_STARTED_AT, comment: DISTINCTIVE_COMMENT }
}

/** A comment no exported file may hold. */
export const DISTINCTIVE_COMMENT = 'Zyxquorp comment: keep the low B soft'
