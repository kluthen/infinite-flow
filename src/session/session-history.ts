/**
 * The session history: an in-memory record of every phrase of a session that started sounding, fed
 * from the session engine's outputs in order. Each entry keeps the phrase as it was shown and the
 * inputs that reproduce it, with the tempo it played at (its phrase-sounding output's) and the
 * internal repeat mark, and the acknowledgements and played notes that fall inside it, placed on
 * read (see session-history-played-notes). The tempo the session reached is the last recorded
 * phrase's. It also keeps when the session started, read once from an injected wall clock, the
 * instrument profile and the preset selection of the locked settings and the session seed
 * the session started with; nothing derived from that seed is kept beside it. Every phrase carries the clef the session's instrument
 * was drawn in at its start, as display data beside the phrase, never in its intent. Beside the
 * phrases it keeps the mutations the session skipped at a dead end, which no kept session holds.
 * It never reads the system time, touches no browser API and stores nothing outside memory.
 */

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { ConcertPitch } from '../domain/events/concert-pitch'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationResult } from '../domain/generation/generation-result'
import type { GenerationProvenance } from '../domain/generation/orchestration/orchestration-types'
import type { PresetSelection } from '../domain/presets/preset-selection'
import {
  BUILT_IN_INSTRUMENT_CLEF,
  isInstrumentClef,
  type InstrumentClef,
} from '../domain/profile/instrument-clef'
import {
  isBuiltInInstrumentProfileId,
  type InstrumentProfileId,
} from '../domain/profile/instrument-profiles'
import type { Seed } from '../domain/random/seed'
import { withPlayedNotes } from './session-history-played-notes'
import type {
  AudioTime,
  MutationSkippedOutput,
  SessionOutput,
  SessionSettings,
  SuccessfulOutcome,
} from './session-types'

/** A note the player played during a phrase: its concert pitch, velocity and audio-clock span. */
// @spec-link [[rule_session_history_records_played_notes]]
export interface RecordedPlayedNote {
  readonly pitch: ConcertPitch
  readonly velocity: number
  readonly onsetAt: AudioTime
  readonly releaseAt: AudioTime
}

/**
 * The parts of a phrase's outcome the Review and the exports read: its result (the shown concert
 * timeline) and the harmony its chord symbols and backing come from. A kept session holds exactly
 * these, so decoding one invents nothing the readers need.
 */
// @spec-link [[service_session_history]]
// @spec-link [[module_kept_session_codec]]
export interface ReviewedOutcome {
  readonly result: GenerationResult
  readonly provenance: Pick<GenerationProvenance, 'harmony'>
}

/**
 * One phrase as the Review and the exports read it: its number, the audio-clock time it started
 * sounding, its outcome as shown, the intent it was generated from, the tempo it played at, the
 * played notes placed in it and the clef it was drawn in. A live record and a decoded kept session
 * both give this.
 */
// @spec-link [[service_session_history]]
// @spec-link [[module_kept_session_codec]]
export interface ReviewedPhrase {
  readonly phraseNumber: number
  readonly startedAt: AudioTime
  readonly outcome: ReviewedOutcome
  readonly intent: GenerationIntent
  readonly tempo: number
  readonly playedNotes: readonly RecordedPlayedNote[]
  readonly clef: InstrumentClef
}

/**
 * One phrase that started sounding. `outcome` is the phrase exactly as shown (its timeline and the
 * harmony its chord symbols come from); `intent` holds the resolved request with the density it
 * was generated with, the seed and the carry-in; `tempo` is the tempo it played at, from its
 * phrase-sounding output. `isRepeat` and
 * `repeatOf` are the internal repeat mark, which no view shows. `acknowledgements` holds the
 * acknowledged expected notes of the phrase, in arrival order; `playedNotes` the played notes whose
 * onsets fall inside it, by onset; `clef` the clef the session's instrument was drawn in at its
 * start.
 */
// @spec-link [[service_session_history]]
// @spec-link [[rule_session_history_keeps_timeline_and_inputs]]
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
export interface SessionHistoryRecord extends ReviewedPhrase {
  readonly phraseNumber: number
  readonly startedAt: AudioTime
  readonly outcome: SuccessfulOutcome
  readonly intent: GenerationIntent
  readonly tempo: number
  readonly isRepeat: boolean
  readonly repeatOf?: number
  readonly acknowledgements: readonly ExpectedNoteIdentity[]
  readonly playedNotes: readonly RecordedPlayedNote[]
  readonly clef: InstrumentClef
}

/**
 * A scheduled mutation the session skipped: it met a dead end on the phrase it would have landed
 * on. Kept in memory only; no kept session record holds it.
 */
// @spec-link [[rule_vary_settings_skips_dead_end]]
export interface SkippedMutation {
  readonly phraseNumber: number
  readonly mutationNumber: number
}

/**
 * A session's history: fed every engine output in order, every finished played note (onset and
 * release already latency-compensated, in release order) and every acknowledgement, read back as
 * one ordered list, with the tempo the session reached (the last recorded phrase's, null before
 * phrase 1 sounds), the session's start time (epoch milliseconds, read once from the wall clock at
 * creation), the instrument profile id and the preset selection of its locked settings and its
 * session seed.
 */
// @spec-link [[service_session_history]]
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_session_history_records_played_notes]]
export interface SessionHistory {
  record(output: SessionOutput): void
  recordPlayedNote(note: RecordedPlayedNote): void
  recordAcknowledgement(identity: ExpectedNoteIdentity): void
  phrases(): readonly SessionHistoryRecord[]
  // @spec-link [[rule_vary_settings_skips_dead_end]]
  skippedMutations(): readonly SkippedMutation[]
  // @spec-link [[rule_adaptive_tempo_resets_after_session]]
  tempoReached(): number | null
  readonly phraseCount: number
  readonly startedAt: number
  readonly instrumentProfileId: InstrumentProfileId
  /**
   * The preset selection of the session's settings at its start, frozen: what a kept session's
   * preset label is made from (the preset's name, or Custom naming its base), whatever a Vary
   * settings step marked later in the session.
   */
  // @spec-link [[rule_preset_label_kept_with_session]]
  readonly selection: PresetSelection
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

/**
 * Intent: the frozen skip a mutation-skipped output reports, or a SessionHistoryError when it
 * names no phrase or no mutation (each an integer from 1).
 */
// @spec-link [[rule_vary_settings_skips_dead_end]]
function checkedSkip(output: MutationSkippedOutput): SkippedMutation {
  const { phraseNumber, mutationNumber } = output
  if (!Number.isSafeInteger(phraseNumber) || phraseNumber < 1)
    throw new SessionHistoryError(`A skipped mutation must name a phrase, got ${phraseNumber}.`)
  if (!Number.isSafeInteger(mutationNumber) || mutationNumber < 1)
    throw new SessionHistoryError(`A skipped mutation must name a mutation, got ${mutationNumber}.`)
  return deepFreeze({ phraseNumber, mutationNumber })
}

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

/**
 * Intent: the clef the session's instrument was drawn in at its start, refused unless it is a clef
 * an instrument is drawn in, and treble for a built-in instrument.
 */
function sessionClef(
  instrumentProfileId: InstrumentProfileId,
  clef: InstrumentClef,
): InstrumentClef {
  if (!isInstrumentClef(clef))
    throw new SessionHistoryError(`The session clef must be treble or bass, got ${String(clef)}.`)
  if (isBuiltInInstrumentProfileId(instrumentProfileId) && clef !== BUILT_IN_INSTRUMENT_CLEF)
    throw new SessionHistoryError(
      `A built-in instrument is drawn in ${BUILT_IN_INSTRUMENT_CLEF} clef, not ${clef}.`,
    )
  return clef
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

/**
 * Intent: the deep-frozen record of one sounded phrase at the tempo its output carries, in the
 * session's clef.
 */
// @spec-link [[service_session_history]]
function recordOf(output: SoundingOutput, clef: InstrumentClef): SessionHistoryRecord {
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
    clef,
  })
}

/**
 * Intent: an empty history for one session, created at its start from the settings locked at that
 * start (whose tempo, the starting tempo, must be usable but is never a record's, and whose preset
 * selection it keeps as a frozen copy), an injected wall clock, read exactly once here for
 * the start time, and the session seed taken with phrase 1 from
 * the Idle result (one that is no seed throws), kept as it is, and the clef the instrument's
 * written phrase was drawn in at that start, which every record carries (a clef that is none, or a
 * built-in instrument in any clef but treble, throws). `record` takes every engine output
 * in order: a phrase-sounding output adds the next record at its own tempo, `ended` closes the
 * history, a mutation-skipped output is kept in memory beside the records (never in a phrase,
 * nor in any kept session), and every other kind (read-ahead included) is ignored. A skip that
 * names no phrase or mutation throws a SessionHistoryError. `recordPlayedNote` and
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
  clef: InstrumentClef,
): SessionHistory {
  assertTempo(settings.controls.tempo, 'The starting tempo')
  const instrumentProfileId = sessionInstrumentProfileId(settings)
  const checkedClef = sessionClef(instrumentProfileId, clef)
  const checkedSeed = checkedSessionSeed(sessionSeed)
  const startedAt = sessionStartTime(wallClock)
  const selection: PresetSelection = deepFreeze(
    settings.selection.kind === 'preset'
      ? { kind: 'preset', presetId: settings.selection.presetId }
      : { kind: 'custom', baseId: settings.selection.baseId },
  )
  const records: SessionHistoryRecord[] = []
  const playedNotes: RecordedPlayedNote[] = []
  const acknowledgements: ExpectedNoteIdentity[] = []
  const acknowledgedKeys = new Set<string>()
  const skips: SkippedMutation[] = []
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
    records.push(recordOf(output, checkedClef))
    snapshot = undefined
  }

  return Object.freeze({
    startedAt,
    instrumentProfileId,
    selection,
    sessionSeed: checkedSeed,
    /** Intent: take one engine output, in the order the engine gave it. */
    record(output: SessionOutput): void {
      assertOpen(`A ${output.kind} output`)
      if (output.kind === 'phrase-sounding') addSounding(output)
      else if (output.kind === 'mutation-skipped') skips.push(checkedSkip(output))
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
    /** Intent: every mutation the session skipped at a dead end, in record order, frozen. */
    // @spec-link [[rule_vary_settings_skips_dead_end]]
    skippedMutations(): readonly SkippedMutation[] {
      return Object.freeze([...skips])
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
