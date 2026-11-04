/**
 * A fresh Jam's reviewed session for the workspace's save, review-state and confirmation specs:
 * the Jam-style session's two phrases (phrase 1 joined from no phrase) on the audio clock, with or
 * without notes played in its phrases, and its Jam part: the two-measure quantized doodle with its
 * capture tempo, its count-in's first beat, its doodle's barlines and its raw doodle notes (or
 * none), nothing suggested, no decline; and the Jam part of a Jam on that doodle kept, as its end
 * gives it: no count-in, no raw note, the doodle's measures ending at phrase 1's start.
 */
import { makeSeed } from '@/domain/random/seed'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { readDoodleControls } from '@/jam/doodle-controls'
import type { SessionHistoryRecord } from '@/session/session-history'
import { keptSessionDoodle, type ReviewedJamPart } from '@/components/workspace/session-jam-part'
import type { RecordedPlayedNote } from '@/session/session-history'
import { historyOf } from '../../storage/kept-session-fixtures'
import {
  JAM_COUNT_IN_AT,
  JAM_DOODLE_FIRST_BARLINE_AT,
  KEPT_DOODLE,
  RAW_DOODLE_NOTES,
  jamSessionRecords,
  jamSessionRecordsWithPlayedNotes,
} from '../../storage/kept-session-v32-fixtures'

export { JAM_COUNT_IN_AT, JAM_DOODLE_FIRST_BARLINE_AT, KEPT_DOODLE, RAW_DOODLE_NOTES }

/** The two-measure doodle's end barline at its capture tempo (96 BPM): eight beats on. */
export const JAM_DOODLE_END_BARLINE_AT = JAM_DOODLE_FIRST_BARLINE_AT + (8 * 60) / 96

/** The controls taken from the doodle on the C keyboard, as Jam's view reads them. */
const DOODLE_CONTROLS = readDoodleControls(
  KEPT_DOODLE.quantized,
  deriveRegisterWindowCandidates(
    C_KEYBOARD_PROFILE.concertRange,
    C_KEYBOARD_PROFILE.registerWindows,
  ),
)

/** Intent: a fresh Jam's Jam part, its raw doodle notes `RAW_DOODLE_NOTES` unless given. */
export function reviewedJamPart(
  rawDoodleNotes: readonly RecordedPlayedNote[] = RAW_DOODLE_NOTES,
): ReviewedJamPart {
  return {
    doodle: {
      doodle: KEPT_DOODLE.quantized,
      captureTempo: KEPT_DOODLE.captureTempo,
      firstBarlineAt: JAM_DOODLE_FIRST_BARLINE_AT,
      endBarlineAt: JAM_DOODLE_END_BARLINE_AT,
      playedNotes: rawDoodleNotes,
    },
    countInStartAt: JAM_COUNT_IN_AT,
    suggestion: { kind: 'nothing' },
    suggestionDeclined: false,
    doodleControls: DOODLE_CONTROLS,
  }
}

/**
 * Intent: the history of the Jam-style session as its save and review read it, its phrases
 * holding played notes or none, played on the C keyboard.
 */
export function jamHistory(playedInPhrases: boolean): ReturnType<typeof historyOf> & {
  readonly phraseCount: number
  readonly tempoReached: () => number
} {
  const records: readonly SessionHistoryRecord[] = playedInPhrases
    ? jamSessionRecordsWithPlayedNotes()
    : jamSessionRecords()
  return {
    ...historyOf(records, 'c-keyboard'),
    sessionSeed: makeSeed(41),
    phraseCount: records.length,
    tempoReached: () => records.at(-1)!.tempo,
  }
}

/**
 * Intent: the Jam part a Jam on the fixture's doodle, kept, gives at its end, its phrase 1
 * starting at `phraseOneAt` on the audio clock, its suggestion declined or not.
 */
export function keptDoodleJamPart(
  phraseOneAt: number,
  suggestionDeclined = false,
): ReviewedJamPart {
  return {
    doodle: keptSessionDoodle(
      { doodle: KEPT_DOODLE.quantized, captureTempo: KEPT_DOODLE.captureTempo },
      phraseOneAt,
    ),
    countInStartAt: null,
    suggestion: { kind: 'nothing' },
    suggestionDeclined,
    doodleControls: DOODLE_CONTROLS,
  }
}
