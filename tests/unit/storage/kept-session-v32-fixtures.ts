/**
 * Builders for the specs of v3.2's kept-session shape: real phrases generated with v3.2's request
 * inputs and recorded as a session history holds them. A locked session on the lock test's rhythm
 * controls (phrase 1 with the lock on and nothing locked yet, then a phrase kept on its bars, a
 * phrase with an allowed rhythm change and a forced bend, each joined from the phrase before); a
 * Jam-style session whose phrase 1 joins from no phrase beside its steering block and whose
 * phrase 2 joins from phrase 1, with a steering block too, and the same session with notes played
 * in each phrase; a quantized doodle with its capture tempo, as the body of a Jam session keeps
 * it; and the audio-clock moments of a fresh Jam's count-in and doodle, with the notes played
 * during the doodle.
 */

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import {
  makeRequestRhythmLock,
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { isRhythmChangeDrawn } from '@/domain/rhythm/rhythm-change-draw'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import type { SuccessfulOutcome } from '@/session/session-types'
import type { KeptDoodle, KeptFreshJam } from '@/storage/records/kept-session-record'

import { BASE_CONTROLS, generateSuccess } from '../domain/generation/carry-in/carry-in-fixture'
import { SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'
import { lockTestIntent } from '../domain/generation/orchestration/rhythm-lock-search-fixture'
import { lockedBarsOf, lockPending, lockTestDomain } from '../domain/rhythm/rhythm-lock-fixture'

/** A phrase's length at 90 BPM, in seconds: four measures of four beats. */
const PHRASE_SECONDS = (4 * 4 * 60) / 90

/** The audio-clock moment phrase 1 of each built session starts: off 0, so rebasing shows. */
const PHRASE_ONE_AT = 7.25

/** Intent: one generated phrase as a session history records it, at its place in the session. */
export function historyRecord(
  intent: GenerationIntent,
  outcome: SuccessfulOutcome,
  phraseNumber: number,
): SessionHistoryRecord {
  return {
    phraseNumber,
    startedAt: PHRASE_ONE_AT + (phraseNumber - 1) * PHRASE_SECONDS,
    outcome,
    intent,
    tempo: intent.controls.tempo,
    isRepeat: false,
    acknowledgements: [],
    playedNotes: [],
    clef: 'treble',
  }
}

/** Intent: the rhythm lock group on with these bars, these allowed changes, no tenser phrase. */
function lockedOn(
  bars: readonly LockedRhythmMeasure[],
  allowedChanges: RequestRhythmLock['allowedChanges'],
): RequestRhythmLock {
  return makeRequestRhythmLock({
    state: { kind: 'locked', bars },
    allowedChanges,
    tenserPhrase: false,
  })
}

/** Intent: a lock test intent joined from the phrase before, with the given lock group. */
function joinedLockIntent(
  tension: 'Build' | 'Lift',
  seed: number,
  rhythmLock: RequestRhythmLock,
  carryIn: CarryIn,
): GenerationIntent {
  const base = lockTestIntent({ tension, seed, rhythmLock })
  return makeCarryInGenerationIntent({
    requestId: base.requestId,
    seed: base.seed,
    controls: base.controls,
    figureLevels: base.figureLevels,
    rhythmLock,
    carryIn,
  })
}

/** One generated phrase: its intent and its outcome. */
interface Generated {
  readonly intent: GenerationIntent
  readonly outcome: SuccessfulOutcome
}

/** Intent: generate an intent, which must succeed. */
function generated(intent: GenerationIntent): Generated {
  return { intent, outcome: generateSuccess(intent) }
}

/** Intent: the carry-in a generated phrase hands forward as the given phrase number. */
function carryInOf(phrase: Generated, phraseNumber: number): CarryIn {
  return deriveCarryIn({ intent: phrase.intent, outcome: phrase.outcome, phraseNumber })
}

/**
 * Intent: phrase 3 of the locked session: the first seed from 1 up whose rhythm change is drawn
 * and whose phrase takes the changed rhythm, every change allowed.
 */
function changedPhrase(bars: readonly LockedRhythmMeasure[], carryIn: CarryIn): Generated {
  for (let seed = 1; seed < 200; seed += 1) {
    if (!isRhythmChangeDrawn(makeSeed(seed), false)) continue
    const phrase = generated(
      joinedLockIntent('Build', seed, lockedOn(bars, RHYTHM_CHANGE_KINDS), carryIn),
    )
    if (phrase.outcome.provenance.rhythmLockOutcome === 'rhythm_change') return phrase
  }
  throw new Error('Fixture setup: no seed made a rhythm change.')
}

/** Intent: locked bars written at Build that no rhythm of the Lift domain writes. */
function buildOnlyBars(): readonly LockedRhythmMeasure[] {
  const lift = new Set(lockTestDomain('Lift').map((rhythm) => rhythmBarKey(rhythm.bars)))
  const buildOnly = lockTestDomain('Build').find((rhythm) => !lift.has(rhythmBarKey(rhythm.bars)))
  if (buildOnly === undefined) throw new Error('Fixture setup: no Build-only rhythm.')
  return lockedBarsOf(buildOnly)
}

/**
 * Intent: the records of a four-phrase locked session on the C keyboard at 90 BPM: phrase 1 with
 * the lock on and nothing locked yet; phrase 2 kept on phrase 1's bars; phrase 3 with an allowed
 * rhythm change from them; phrase 4 at Lift on bars Lift cannot write, so its rhythm is a forced
 * bend; each phrase after the first joined from the one before.
 */
export function lockedSessionRecords(): readonly SessionHistoryRecord[] {
  const first = generated(lockTestIntent({ tension: 'Build', seed: 4, rhythmLock: lockPending() }))
  const bars = lockedBarsOf(first.outcome.provenance.rhythm)
  const locked = generated(joinedLockIntent('Build', 5, lockedOn(bars, []), carryInOf(first, 1)))
  const changed = changedPhrase(bars, carryInOf(locked, 2))
  const bent = generated(
    joinedLockIntent('Lift', 6, lockedOn(buildOnlyBars(), []), carryInOf(changed, 3)),
  )
  return [first, locked, changed, bent].map((phrase, index) =>
    historyRecord(phrase.intent, phrase.outcome, index + 1),
  )
}

/** The doodle's join into the Jam's phrase 1: a carry-in from no phrase, inside its window. */
export const NO_PHRASE_CARRY_IN: CarryIn = makeCarryIn({
  origin: 'none',
  lastPitch: { midi: makeConcertPitch(60), arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: makeRegisterWindow(54, 66),
  finalHarmony: null,
})

/** Intent: a Jam-style intent on the focused carry-in controls, with its steering block. */
function jamIntent(seed: number, carryIn: CarryIn, steering: SteeringBlock): GenerationIntent {
  return makeCarryInGenerationIntent({
    requestId: makeRequestId(`kept-jam-${seed}`),
    seed: makeSeed(seed),
    controls: BASE_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    steering,
    carryIn,
  })
}

/**
 * Intent: the records of a two-phrase Jam-style session on the C keyboard at 90 BPM: phrase 1
 * joined from no phrase (the doodle's join) beside its steering block, phrase 2 joined from
 * phrase 1, with a steering block too.
 */
export function jamSessionRecords(): readonly SessionHistoryRecord[] {
  const first = generated(jamIntent(14, NO_PHRASE_CARRY_IN, SAMPLE_STEERING))
  const second = generated(jamIntent(15, carryInOf(first, 1), SAMPLE_STEERING))
  return [
    historyRecord(first.intent, first.outcome, 1),
    historyRecord(second.intent, second.outcome, 2),
  ]
}

/** A two-measure quantized doodle and the tempo it was captured at, as a Jam's body keeps it. */
export const KEPT_DOODLE: KeptDoodle = {
  quantized: makeQuantizedDoodle({
    measureCount: 2,
    notes: [
      { startTick: 0, lengthTicks: 4, pitch: 62 },
      { startTick: 4, lengthTicks: 2, pitch: 64 },
      { startTick: 8, lengthTicks: 6, pitch: 67 },
      { startTick: 18, lengthTicks: 10, pitch: 60 },
    ],
  }),
  captureTempo: 96,
}

/** Intent: a played note at an audio-clock onset, held for a quarter of a second. */
function playedNote(midi: number, onsetAt: number): RecordedPlayedNote {
  return { pitch: makeConcertPitch(midi), velocity: 72, onsetAt, releaseAt: onsetAt + 0.25 }
}

/**
 * Intent: the records of the Jam-style session (see `jamSessionRecords`), each phrase holding two
 * played notes, at half a second and at two seconds and an eighth into it.
 */
export function jamSessionRecordsWithPlayedNotes(): readonly SessionHistoryRecord[] {
  return jamSessionRecords().map((record) => ({
    ...record,
    playedNotes: [
      playedNote(62 + record.phraseNumber, record.startedAt + 0.5),
      playedNote(65 + record.phraseNumber, record.startedAt + 2.125),
    ],
  }))
}

/** The audio-clock moment a fresh Jam's count-in starts: its first beat. */
export const JAM_COUNT_IN_AT = 0.25

/** The audio-clock moment a fresh Jam's doodle starts: its first barline, a second later. */
export const JAM_DOODLE_FIRST_BARLINE_AT = 1.25

/**
 * The notes played during a fresh Jam's doodle, in onset order: one before its first barline
 * (on the count-in), two during the doodle.
 */
export const RAW_DOODLE_NOTES: readonly RecordedPlayedNote[] = [
  playedNote(60, 0.75),
  playedNote(62, 1.5),
  playedNote(64, 3.75),
]

/**
 * Intent: a fresh Jam's count-in and doodle before the Jam-style session's phrase 1, with the
 * notes played during it, `RAW_DOODLE_NOTES` unless given.
 */
export function freshJam(
  rawDoodleNotes: readonly RecordedPlayedNote[] = RAW_DOODLE_NOTES,
): KeptFreshJam {
  return {
    countInStartsAt: JAM_COUNT_IN_AT,
    doodleFirstBarlineAt: JAM_DOODLE_FIRST_BARLINE_AT,
    rawDoodleNotes,
  }
}
