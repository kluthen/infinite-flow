/**
 * The session history: an in-memory record of every phrase of a session that started sounding,
 * fed from the session engine's outputs in order. Each entry keeps the phrase as it was shown and
 * the inputs that reproduce it, with the tempo it played at (its phrase-sounding output's) and the
 * internal repeat mark, and the acknowledgements and played notes that fall inside it, placed on
 * read (see session-history-played-notes). The tempo the session reached is the last recorded
 * phrase's.
 * It also keeps when the session started, read once from an injected wall clock, the instrument
 * profile of the locked settings and the session seed the session started with; nothing derived
 * from that seed is kept beside it. It never reads the system time, touches no browser API and
 * stores nothing outside memory.
 */

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { ConcertPitch } from '../domain/events/concert-pitch'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { InstrumentProfileId } from '../domain/profile/instrument-profiles'
import type { Seed } from '../domain/random/seed'
import { withPlayedNotes } from './session-history-played-notes'
import type { AudioTime, SessionOutput, SessionSettings, SuccessfulOutcome } from './session-types'

/** A note the player played during a phrase: its concert pitch, velocity and audio-clock span. */
// @spec-link [[rule_session_history_records_played_notes]]
export interface RecordedPlayedNote {
  readonly pitch: ConcertPitch
  readonly velocity: number
  readonly onsetAt: AudioTime
  readonly releaseAt: AudioTime
}

/**
 * One phrase that started sounding. `outcome` is the phrase exactly as shown (its timeline and the
 * harmony its chord symbols come from); `intent` holds the resolved request with the density it
 * was generated with, the seed and the carry-in; `tempo` is the tempo it played at, from its
 * phrase-sounding output. `isRepeat` and
 * `repeatOf` are the internal repeat mark, which no view shows. `acknowledgements` holds the
 * acknowledged expected notes of the phrase, in arrival order; `playedNotes` the played notes whose
 * onsets fall inside it, by onset.
 */
// @spec-link [[service_session_history]]
// @spec-link [[rule_session_history_keeps_timeline_and_inputs]]
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
export interface SessionHistoryRecord {
  readonly phraseNumber: number
  readonly startedAt: AudioTime
  readonly outcome: SuccessfulOutcome
  readonly intent: GenerationIntent
  readonly tempo: number
  readonly isRepeat: boolean
  readonly repeatOf?: number
  readonly acknowledgements: readonly ExpectedNoteIdentity[]
  readonly playedNotes: readonly RecordedPlayedNote[]
}

/**
 * A session's history: fed every engine output in order, every finished played note (onset and
 * release already latency-compensated, in release order) and every acknowledgement, read back as
 * one ordered list, with the tempo the session reached (the last recorded phrase's, null before
 * phrase 1 sounds), the session's start time (epoch milliseconds, read once from the wall clock at
 * creation), the instrument profile id of its locked settings and its session seed.
 */
// @spec-link [[service_session_history]]
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_session_history_records_played_notes]]
export interface SessionHistory {
  record(output: SessionOutput): void
  recordPlayedNote(note: RecordedPlayedNote): void
  recordAcknowledgement(identity: ExpectedNoteIdentity): void
  phrases(): readonly SessionHistoryRecord[]
  // @spec-link [[rule_adaptive_tempo_resets_after_session]]
  tempoReached(): number | null
  readonly phraseCount: number
  readonly startedAt: number
  readonly instrumentProfileId: InstrumentProfileId
  /** The session seed every seed of the session after phrase 1 derives from; nothing derived. */
  // @spec-link [[module_session_seed_plan]]
  readonly sessionSeed: Seed
}

/** The injected wall clock: the player's current local moment, as epoch milliseconds. */
// @spec-link [[service_session_history]]
export type WallClock = () => number

/** Typed failure for a caller that feeds the history outputs a session cannot produce. */
// @spec-link [[service_session_history]]
export class SessionHistoryError extends Error {
  readonly kind = 'SessionHistoryError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SessionHistoryError'
  }
}

/** A phrase-sounding output, the only kind the history records. */
type SoundingOutput = Extract<SessionOutput, { kind: 'phrase-sounding' }>

/** An ended output, which closes the history. */
type EndedOutput = Extract<SessionOutput, { kind: 'ended' }>

/** Intent: refuse a tempo that is not a finite positive BPM, which no session runs at. */
function assertTempo(tempo: number, what: string): void {
  if (!Number.isFinite(tempo) || tempo <= 0)
    throw new SessionHistoryError(`${what} must be a positive BPM, got ${tempo}.`)
}

/**
 * Intent: the session's start time, the wall clock's one reading at creation: finite, not before
 * the epoch, or the injected clock is broken.
 */
function sessionStartTime(wallClock: WallClock): number {
  const startedAt = wallClock()
  if (!Number.isFinite(startedAt) || startedAt < 0)
    throw new SessionHistoryError(
      `The session start time must be finite epoch milliseconds, got ${startedAt}.`,
    )
  return startedAt
}

/**
 * Intent: the session's instrument profile id, from the settings locked at start; never
 * defaulted, so settings without one are refused.
 */
function sessionInstrumentProfileId(settings: SessionSettings): InstrumentProfileId {
  const id = settings.controls.instrumentProfileId
  if (typeof id !== 'string' || id.length === 0)
    throw new SessionHistoryError('The session settings hold no instrument profile.')
  return id
}

/** The largest 32-bit unsigned value, the largest seed. */
const MAX_UNSIGNED_32 = 0xffffffff

/** Intent: the session seed, refused unless it is a 32-bit unsigned integer, as every Seed is. */
// @spec-link [[module_session_seed_plan]]
function checkedSessionSeed(sessionSeed: Seed): Seed {
  if (!Number.isInteger(sessionSeed) || sessionSeed < 0 || sessionSeed > MAX_UNSIGNED_32)
    throw new SessionHistoryError(
      `The session seed must be a 32-bit unsigned integer, got ${sessionSeed}.`,
    )
  return sessionSeed
}

/**
 * Intent: refuse a phrase generated for an instrument profile other than the session's; the
 * profile is locked for the whole session.
 */
function assertSessionProfile(output: SoundingOutput, instrumentProfileId: string): void {
  const phraseProfileId = output.phrase.intent.instrumentProfile.id
  if (phraseProfileId !== instrumentProfileId)
    throw new SessionHistoryError(
      `Phrase ${output.phrase.phraseNumber} was generated for ${phraseProfileId}; the session runs ${instrumentProfileId}.`,
    )
}

/**
 * Intent: refuse a repeat mark the engine cannot produce: a repeat names an earlier phrase, and
 * any other phrase names none.
 */
function assertRepeatMark(output: SoundingOutput): void {
  const { phraseNumber, origin, repeatOf } = output.phrase
  if (origin !== 'repeat') {
    if (repeatOf !== undefined)
      throw new SessionHistoryError(
        `Phrase ${phraseNumber} is no repeat but names phrase ${repeatOf}.`,
      )
    return
  }
  if (
    repeatOf === undefined ||
    !Number.isInteger(repeatOf) ||
    repeatOf < 1 ||
    repeatOf >= phraseNumber
  )
    throw new SessionHistoryError(`Repeat phrase ${phraseNumber} must name an earlier phrase.`)
}

/**
 * Intent: refuse a sounding output that is not the next phrase, or that starts before the phrase
 * before it; the engine outputs phrases in order on a clock that never runs backwards.
 */
function assertNextSounding(
  output: SoundingOutput,
  previous: SessionHistoryRecord | undefined,
): void {
  const expected = (previous?.phraseNumber ?? 0) + 1
  if (output.phrase.phraseNumber !== expected)
    throw new SessionHistoryError(
      `Phrase ${output.phrase.phraseNumber} started sounding; phrase ${expected} was next.`,
    )
  if (!Number.isFinite(output.at) || (previous !== undefined && output.at < previous.startedAt))
    throw new SessionHistoryError(
      `Phrase ${expected} started at ${output.at}, before phrase ${expected - 1}.`,
    )
}

/**
 * Intent: refuse an end that disagrees with what was recorded: an end in the count-in follows no
 * sounded phrase, and the count of sounded phrases it reports is the history's.
 */
function assertEndMatches(output: EndedOutput, recorded: number): void {
  if (output.phase === 'count-in' && recorded > 0)
    throw new SessionHistoryError(`The session ended in its count-in after ${recorded} phrases.`)
  if (output.soundedPhraseCount !== recorded)
    throw new SessionHistoryError(
      `The session ended with ${output.soundedPhraseCount} phrases sounded; ${recorded} recorded.`,
    )
}

/** The highest MIDI velocity; a played note's velocity is 1 to this. */
const MAX_VELOCITY = 127

/** The last measure of a four-measure phrase, counted from 0. */
const LAST_MEASURE_INDEX = 3

/**
 * Intent: a deep-frozen copy of a finished played note, or a SessionHistoryError when its span is
 * not finite, it releases before its onset, or its velocity is no MIDI note-on velocity.
 */
// @spec-link [[rule_session_history_records_played_notes]]
function checkedPlayedNote(note: RecordedPlayedNote): RecordedPlayedNote {
  const { pitch, velocity, onsetAt, releaseAt } = note
  if (!Number.isFinite(onsetAt) || !Number.isFinite(releaseAt) || releaseAt < onsetAt)
    throw new SessionHistoryError(
      `A played note must release at or after its onset, got ${onsetAt} to ${releaseAt}.`,
    )
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > MAX_VELOCITY)
    throw new SessionHistoryError(`A played note's velocity must be 1 to 127, got ${velocity}.`)
  return deepFreeze({ pitch, velocity, onsetAt, releaseAt })
}

/**
 * Intent: a deep-frozen copy of an acknowledged note's identity and its key, or a
 * SessionHistoryError when it names no possible note of the session.
 */
// @spec-link [[rule_session_history_records_played_notes]]
function checkedAcknowledgement(identity: ExpectedNoteIdentity): {
  readonly identity: ExpectedNoteIdentity
  readonly key: string
} {
  const { phraseNumber, measureIndex, eventIndex } = identity
  if (
    !Number.isInteger(phraseNumber) ||
    phraseNumber < 1 ||
    !Number.isInteger(measureIndex) ||
    measureIndex < 0 ||
    measureIndex > LAST_MEASURE_INDEX ||
    !Number.isInteger(eventIndex) ||
    eventIndex < 0
  )
    throw new SessionHistoryError(
      `An acknowledgement must name a note of the session, got phrase ${phraseNumber}, measure ${measureIndex}, event ${eventIndex}.`,
    )
  return {
    identity: deepFreeze({ phraseNumber, measureIndex, eventIndex }),
    key: `${phraseNumber}:${measureIndex}:${eventIndex}`,
  }
}

/** Intent: the deep-frozen record of one sounded phrase at the tempo its output carries. */
// @spec-link [[service_session_history]]
function recordOf(output: SoundingOutput): SessionHistoryRecord {
  const { phraseNumber, origin, intent, outcome, repeatOf } = output.phrase
  return deepFreeze({
    phraseNumber,
    startedAt: output.at,
    outcome,
    intent,
    tempo: output.tempo,
    isRepeat: origin === 'repeat',
    ...(repeatOf === undefined ? {} : { repeatOf }),
    acknowledgements: [],
    playedNotes: [],
  })
}

/**
 * Intent: an empty history for one session, created at its start from the settings locked at that
 * start (whose tempo, the starting tempo, must be usable but is never a record's), an injected wall
 * clock, read exactly once here for the start time, and the session seed taken with phrase 1 from
 * the Idle result (one that is no seed throws), kept as it is. `record` takes every engine output
 * in order: a phrase-sounding output adds the next record at its own tempo, `ended` closes the
 * history, and every other kind (read-ahead included) is ignored. `recordPlayedNote` and
 * `recordAcknowledgement` take the player's finished notes and acknowledgements, placed in the
 * records on read. An output, note or acknowledgement after the end, a phrase out of order, for
 * another instrument profile or at an unusable tempo, an end that disagrees with the records, an
 * invalid note or a repeated acknowledgement throws a SessionHistoryError.
 */
// @spec-link [[service_session_history]]
// @spec-link [[rule_session_history_keeps_timeline_and_inputs]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[module_session_seed_plan]]
export function createSessionHistory(
  settings: SessionSettings,
  wallClock: WallClock,
  sessionSeed: Seed,
): SessionHistory {
  assertTempo(settings.controls.tempo, 'The starting tempo')
  const instrumentProfileId = sessionInstrumentProfileId(settings)
  const checkedSeed = checkedSessionSeed(sessionSeed)
  const startedAt = sessionStartTime(wallClock)
  const records: SessionHistoryRecord[] = []
  const playedNotes: RecordedPlayedNote[] = []
  const acknowledgements: ExpectedNoteIdentity[] = []
  const acknowledgedKeys = new Set<string>()
  let snapshot: readonly SessionHistoryRecord[] | undefined
  let ended = false

  /** Intent: refuse anything the player does once the session ended; held notes come first. */
  function assertOpen(what: string): void {
    if (ended) throw new SessionHistoryError(`${what} arrived after the end.`)
  }

  /** Intent: add the next sounded phrase; the read-back list is rebuilt on the next read. */
  function addSounding(output: SoundingOutput): void {
    assertNextSounding(output, records.at(-1))
    assertRepeatMark(output)
    assertSessionProfile(output, instrumentProfileId)
    assertTempo(output.tempo, `Phrase ${output.phrase.phraseNumber}'s tempo`)
    records.push(recordOf(output))
    snapshot = undefined
  }

  return Object.freeze({
    startedAt,
    instrumentProfileId,
    sessionSeed: checkedSeed,
    /** Intent: take one engine output, in the order the engine gave it. */
    record(output: SessionOutput): void {
      assertOpen(`A ${output.kind} output`)
      if (output.kind === 'phrase-sounding') addSounding(output)
      else if (output.kind === 'ended') {
        assertEndMatches(output, records.length)
        ended = true
      }
    },
    /** Intent: keep one finished played note; the read-back list is rebuilt on the next read. */
    // @spec-link [[rule_session_history_records_played_notes]]
    recordPlayedNote(note: RecordedPlayedNote): void {
      assertOpen('A played note')
      playedNotes.push(checkedPlayedNote(note))
      snapshot = undefined
    },
    /** Intent: keep one acknowledgement, once; the read-back list is rebuilt on the next read. */
    // @spec-link [[rule_session_history_records_played_notes]]
    recordAcknowledgement(identity: ExpectedNoteIdentity): void {
      assertOpen('An acknowledgement')
      const checked = checkedAcknowledgement(identity)
      if (acknowledgedKeys.has(checked.key))
        throw new SessionHistoryError(`Note ${checked.key} was already acknowledged.`)
      acknowledgedKeys.add(checked.key)
      acknowledgements.push(checked.identity)
      snapshot = undefined
    },
    /**
     * Intent: every recorded phrase in sounding order with its acknowledgements and played notes,
     * as a list frozen until the next record, note or acknowledgement.
     */
    // @spec-link [[rule_session_history_records_played_notes]]
    phrases(): readonly SessionHistoryRecord[] {
      snapshot ??= Object.freeze(withPlayedNotes(records, playedNotes, acknowledgements))
      return snapshot
    },
    /**
     * Intent: the tempo the session reached: the last recorded phrase's, also its highest, since
     * a session's tempo never goes down; null before phrase 1 sounds.
     */
    // @spec-link [[service_session_history]]
    // @spec-link [[rule_adaptive_tempo_resets_after_session]]
    tempoReached(): number | null {
      return records.at(-1)?.tempo ?? null
    },
    /** Intent: how many phrases have started sounding so far. */
    get phraseCount(): number {
      return records.length
    },
  })
}
