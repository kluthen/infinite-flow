/**
 * Shared builders for the kept-session codec specs: real recorded sessions at 240 BPM on each
 * built-in instrument (phrase 2 a failure-ladder repeat of phrase 1, acknowledgements and played
 * notes in every phrase, the count-in starting off the clock's origin), a long Jazz Sixteenth
 * history cycled from a dozen real phrases, the stored copies of a session's records (through
 * `structuredClone`, as IndexedDB stores them), and helpers to edit and walk stored values.
 */

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { PROFILE_BUNDLES } from '@/domain/controls/profile-selection'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { JAZZ_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import {
  createSessionHistory,
  type RecordedPlayedNote,
  type SessionHistory,
  type SessionHistoryRecord,
} from '@/session/session-history'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import type {
  KeptSessionHistory,
  KeptSessionRecords,
  StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { idlePhraseOne, recordRunnerSession } from '../session/history-recording'
import {
  DEFAULT_SESSION_SEED,
  SESSION_START_EPOCH_MS,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from '../session/session-harness'

/** The app version the specs write records with. */
export const APP_VERSION = '3.0.0-test'

/** The audio-clock moment each recorded session's count-in starts: off 0, so rebasing shows. */
const COUNT_IN_AT = 3.3

/** A measure at 240 BPM, in seconds, and a four-measure phrase. */
const MEASURE_SECONDS = 1
const PHRASE_SECONDS = 4

/** Intent: the audio-clock start of phrase N of a recorded session (phrase 1 after the count-in). */
function phraseStart(phraseNumber: number): number {
  return COUNT_IN_AT + MEASURE_SECONDS + (phraseNumber - 1) * PHRASE_SECONDS
}

/**
 * Intent: the engine outputs of a 240 BPM session on an instrument whose phrase 2 misses its
 * deadline, so the failure ladder repeats phrase 1 as phrase 2; every later phrase is generated
 * in time. Stopped one second into its last phrase.
 */
function drivenSession(
  instrumentProfileId: InstrumentProfileId,
  phraseCount: number,
): SessionDriver {
  const settings = sessionSettings({ tempo: 240, instrumentProfileId })
  const driver = new SessionDriver({ at: COUNT_IN_AT, settings, phraseOne: phraseOneFor(settings) })
  driver.tick(phraseStart(1))
  driver.countInOver(phraseStart(1))
  driver.sounding(phraseStart(2), 2)
  for (let phraseNumber = 3; phraseNumber <= phraseCount; phraseNumber++) {
    driver.accept(phraseStart(phraseNumber - 1) + 0.5)
    driver.sounding(phraseStart(phraseNumber), phraseNumber)
  }
  driver.end(phraseStart(phraseCount) + MEASURE_SECONDS)
  return driver
}

/**
 * Intent: the played notes of phrase N, at offsets that are no round binary fractions; a phrase
 * other than the last also holds a note released in the next phrase, and the last only notes
 * before the stop.
 */
function playedNotesOf(phraseNumber: number, isLast: boolean): RecordedPlayedNote[] {
  const start = phraseStart(phraseNumber)
  const offsets = isLast ? [0.137, 0.618] : [0.137, 1.618, 2.71828, 3.9]
  return offsets.map((offset, index) => ({
    pitch: makeConcertPitch(55 + ((phraseNumber * 5 + index * 3) % 24)),
    velocity: 40 + index * 17,
    onsetAt: start + offset,
    releaseAt: start + offset + (offset === 3.9 ? 0.45 : 0.3),
  }))
}

/**
 * Intent: a recorded 240 BPM session on the instrument (see `drivenSession`), with two
 * acknowledgements and played notes in every phrase and one stray note before phrase 1, which
 * no phrase holds.
 */
export function recordedKeptSession(
  instrumentProfileId: InstrumentProfileId,
  phraseCount: number,
): SessionHistory {
  const driver = drivenSession(instrumentProfileId, phraseCount)
  const history = createSessionHistory(
    driver.settings,
    fixedWallClock,
    DEFAULT_SESSION_SEED,
    'treble',
  )
  for (const output of driver.log) {
    if (output.kind === 'ended') {
      history.recordPlayedNote({
        pitch: makeConcertPitch(70),
        velocity: 64,
        onsetAt: COUNT_IN_AT + 0.4,
        releaseAt: COUNT_IN_AT + 0.6,
      })
      for (let phraseNumber = 1; phraseNumber <= phraseCount; phraseNumber++) {
        history.recordAcknowledgement({ phraseNumber, measureIndex: 0, eventIndex: 0 })
        history.recordAcknowledgement({ phraseNumber, measureIndex: 2, eventIndex: 1 })
        playedNotesOf(phraseNumber, phraseNumber === phraseCount).forEach((note) =>
          history.recordPlayedNote(note),
        )
      }
    }
    history.record(output)
  }
  return history
}

/**
 * Intent: a history-shaped value over given records, as the encoder reads one, its session's
 * preset selection the harness settings' unless given.
 */
export function historyOf(
  records: readonly SessionHistoryRecord[],
  instrumentProfileId: InstrumentProfileId,
  selection: PresetSelection = sessionSettings().selection,
): KeptSessionHistory {
  return {
    phrases: () => records,
    startedAt: SESSION_START_EPOCH_MS,
    instrumentProfileId,
    selection,
    sessionSeed: DEFAULT_SESSION_SEED,
  }
}

/** Intent: Jazz settings at 240 BPM with Sixteenth density on the E-flat alto. */
function jazzSixteenthSettings(): SessionSettings {
  return {
    controls: makeGenerationControls({
      ...sessionSettings().controls,
      ...PROFILE_BUNDLES.Jazz,
      noteDensity: 'Sixteenth',
      tempo: 240,
      instrumentProfileId: 'eb-alto',
    }),
    figureLevels: JAZZ_FIGURE_LEVELS,
    selection: { kind: 'preset', presetId: 'jazz' },
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
  }
}

/** Intent: the number of notes a phrase's timeline shows, tie continuations not counted. */
function noteCountOf(record: SessionHistoryRecord): number {
  return record.outcome.result.timeline.measures
    .flatMap((measure) => measure.events)
    .filter((event) => event.kind === 'note' && !event.tieContinuation).length
}

/**
 * Intent: one played note per shown note of a phrase, spread over its four seconds at times with
 * the full precision an audio clock gives, as a realistic upper estimate of a player's notes.
 */
function realisticPlayedNotes(record: SessionHistoryRecord): RecordedPlayedNote[] {
  const count = noteCountOf(record)
  return Array.from({ length: count }, (_, index) => {
    const onsetAt = record.startedAt + (index * PHRASE_SECONDS) / count + 0.003871 * (index % 7)
    return {
      pitch: makeConcertPitch(60 + (index % 12)),
      velocity: 70 + (index % 40),
      onsetAt,
      releaseAt: onsetAt + 0.0912345 + 0.0011 * (index % 5),
    }
  })
}

/**
 * Intent: the records of a 30-minute 240 BPM Jazz Sixteenth session: `phraseCount` phrases,
 * 4 s apart, cycled from `sourceCount` real phrases recorded through the session runner and
 * renumbered, each with one played note per shown note.
 */
export async function longJazzSixteenthRecords(
  phraseCount: number,
  sourceCount: number,
): Promise<readonly SessionHistoryRecord[]> {
  const settings = jazzSixteenthSettings()
  const source = (
    await recordRunnerSession({
      settings,
      phraseOne: idlePhraseOne(settings, 41),
      firstSeed: 4100,
      phraseCount: sourceCount,
    })
  ).phrases()
  const origin = source[0]!.startedAt
  return Array.from({ length: phraseCount }, (_, index) => {
    const { repeatOf, ...record } = source[index % sourceCount]!
    void repeatOf
    const renumbered = {
      ...record,
      phraseNumber: index + 1,
      startedAt: origin + index * PHRASE_SECONDS,
      isRepeat: false,
    }
    return { ...renumbered, playedNotes: realisticPlayedNotes(renumbered) }
  })
}

/** Intent: the stored copies of a session's records, as IndexedDB would store and return them. */
export function storedRecords(records: KeptSessionRecords): StoredKeptSession {
  return {
    summary: structuredClone(records.summary),
    body: structuredClone(records.body),
    playedNotes: records.playedNotes === null ? undefined : structuredClone(records.playedNotes),
  }
}

/** One step of a path into a stored value: a field name or an array index. */
export type Step = string | number

/** The replacement that removes a field from a stored copy. */
export const REMOVE = Symbol('remove')

/** Intent: a stored copy of a value with the field at a path replaced, or removed. */
export function edited(value: unknown, path: readonly Step[], replacement: unknown): unknown {
  const copy = structuredClone(value) as Record<Step, unknown>
  const parent = path
    .slice(0, -1)
    .reduce<Record<Step, unknown>>((node, step) => node[step] as Record<Step, unknown>, copy)
  const last = path.at(-1)!
  if (replacement === REMOVE) Reflect.deleteProperty(parent, last)
  else parent[last] = replacement
  return copy
}

/** Intent: add every object key reachable from a value, at any depth, to `keys`. */
function collectKeys(node: unknown, keys: Set<string>): void {
  if (typeof node !== 'object' || node === null) return
  if (!Array.isArray(node)) Object.keys(node).forEach((key) => keys.add(key))
  Object.values(node).forEach((child) => collectKeys(child, keys))
}

/** Intent: every object key reachable from a value, at any depth. */
export function allKeys(value: unknown): Set<string> {
  const keys = new Set<string>()
  collectKeys(value, keys)
  return keys
}

/** Intent: whether a value and every object or array reachable from it is frozen. */
export function isDeepFrozen(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return true
  if (!Object.isFrozen(value)) return false
  return Object.values(value).every(isDeepFrozen)
}
