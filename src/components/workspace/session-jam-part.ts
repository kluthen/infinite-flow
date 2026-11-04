/**
 * The Jam part of a reviewed session: what the review of an ended Jam is drawn from beside its
 * closed history (its doodle section, the raw doodle notes in its played-notes lane, its key and
 * mode suggestion), and the controls taken from the doodle, carried for Jam's view, which the
 * review never shows. Gathered once at the end, from the closed history and the running session,
 * or read back from a kept Jam session's records; a session that is no Jam has none. A Jam on
 * the kept doodle has no capture: its Jam part is the kept doodle it started on, with no raw note
 * and no count-in its played notes are timed from. Beside it, what deleting the played notes and
 * `Keep mine` make of it. Pure; Jam's types are imported as types only, erased from the bundle.
 */
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { DoodleReadings } from '@/jam/doodle-controls'
import type { DoodleSuggestion, SessionDoodle } from '@/session/session-history'
import { measureSeconds } from '@/session/session-timing'
import type { AudioTime } from '@/session/session-types'
import type { ActiveSession } from './workspace-session-active'

/**
 * The Jam part of a reviewed session: the doodle (quantized, with its capture tempo, its first
 * and end barlines and its raw notes, which belong to no phrase), the first beat of a fresh Jam's
 * count-in (the clock its played notes are kept on; null for a Jam on the kept doodle, whose
 * played notes count from phrase 1, as session mode's), the suggestion worked out at the doodle's
 * end, whether the player has declined it, and the controls taken from the doodle. A Jam on the
 * kept doodle played no doodle: its doodle holds no raw note, and its barlines are the doodle's
 * measures at its capture tempo ending where phrase 1 starts. A kept Jam session read back gives
 * the same shape from its records, its times on its phrases' clock (phrase 1 starting at 0); its
 * records hold neither the suggestion nor the controls, so both are null there: Jam's code works
 * the suggestion out again from the doodle, the same doodle giving the same answer, and the
 * controls are only ever read at the Jam's end.
 */
// @spec-link [[module_jam_session_end]]
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export interface ReviewedJamPart {
  readonly doodle: SessionDoodle
  readonly countInStartAt: AudioTime | null
  readonly suggestion: DoodleSuggestion | null
  readonly suggestionDeclined: boolean
  readonly doodleControls: DoodleReadings | null
}

/**
 * The kept doodle a Jam on it starts on, as Jam's code keeps it: the quantized doodle with its
 * capture tempo, its key and mode suggestion with whether the player declined it, and the
 * readings Jam's controls take from it.
 */
// @spec-link [[module_kept_doodle]]
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export interface StartedOnKeptDoodle {
  readonly doodle: QuantizedDoodle
  readonly captureTempo: number
  readonly suggestion: DoodleSuggestion
  readonly suggestionDeclined: boolean
  readonly readings: DoodleReadings
}

/** What the end reads a session's Jam part from: the running session, its history closed. */
export type EndedJamSources = Pick<
  ActiveSession,
  'phraseOne' | 'history' | 'timeline' | 'doodleControls' | 'keptDoodle'
>

/**
 * Intent: the doodle a Jam on the kept doodle shows, on the audio clock: the kept doodle with its
 * capture tempo, its measures at that tempo ending at phrase 1's start, `phraseOneAt`, and no raw
 * note, since none was played in this session.
 */
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export function keptSessionDoodle(
  kept: Pick<StartedOnKeptDoodle, 'doodle' | 'captureTempo'>,
  phraseOneAt: AudioTime,
): SessionDoodle {
  const length = kept.doodle.measureCount * measureSeconds(kept.captureTempo)
  return Object.freeze({
    doodle: kept.doodle,
    captureTempo: kept.captureTempo,
    firstBarlineAt: phraseOneAt - length,
    endBarlineAt: phraseOneAt,
    playedNotes: Object.freeze([]),
  })
}

/**
 * Intent: the Jam part of a session that ended once phrase 1 had sounded. A Jam on the kept
 * doodle gives the kept doodle it started on (`keptSessionDoodle`, phrase 1 starting at the
 * count-in's end), no count-in, its suggestion with the decline as kept (a declined suggestion
 * stays declined) and the readings taken from it. A session started without phrase 1 (a fresh
 * Jam's) gives its doodle and suggestion as the closed history kept them, its count-in's first
 * beat, no decline yet, and the controls taken from the doodle at phrase 1's hand-over; a Jam
 * that sounded phrase 1 always recorded all three before it, so one missing is a defect and
 * throws. Any other session started with phrase 1 (session mode's) gives none.
 */
// @spec-link [[module_jam_session_end]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[rule_jam_on_held_doodle_skips_capture]]
export function jamPartOf(session: EndedJamSources): ReviewedJamPart | null {
  const kept = session.keptDoodle
  if (kept !== null) {
    return Object.freeze({
      doodle: keptSessionDoodle(kept, session.timeline.countInEndsAt),
      countInStartAt: null,
      suggestion: kept.suggestion,
      suggestionDeclined: kept.suggestionDeclined,
      doodleControls: kept.readings,
    })
  }
  if (session.phraseOne !== null) return null
  const doodle = session.history.doodle()
  const suggestion = session.history.suggestion()
  const { doodleControls } = session
  if (doodle === null || suggestion === null || doodleControls === null) {
    throw new Error(
      'session end: a Jam that sounded phrase 1 holds no doodle, suggestion or controls',
    )
  }
  return Object.freeze({
    doodle,
    countInStartAt: session.timeline.startAt,
    suggestion,
    suggestionDeclined: false,
    doodleControls,
  })
}

/** Intent: whether a Jam part holds a raw doodle note, which counts as a played note to keep. */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function holdsRawDoodleNote(jam: ReviewedJamPart): boolean {
  return jam.doodle.playedNotes.length > 0
}

/**
 * Intent: a Jam part once its session's played notes are deleted: no raw doodle note, its
 * quantized doodle, its barlines and everything else kept.
 */
// @spec-link [[rule_deleting_played_notes_keeps_quantized_doodle]]
export function withoutRawDoodleNotes(jam: ReviewedJamPart): ReviewedJamPart {
  return Object.freeze({
    ...jam,
    doodle: Object.freeze({ ...jam.doodle, playedNotes: Object.freeze([]) }),
  })
}

/** Intent: a Jam part with its key and mode suggestion declined (`Keep mine`), all else as held. */
// @spec-link [[rule_suggestion_keep_mine]]
export function declinedJamPart(jam: ReviewedJamPart): ReviewedJamPart {
  return Object.freeze({ ...jam, suggestionDeclined: true })
}
