/**
 * The session's rhythm lock functions on their own: whether locked bars use sixteenth notes, the
 * tenser flag, the lock state at Start and after a decision, the groups of a phrase, and how a
 * history record reads what the lock did.
 */

import { describe, expect, it } from 'vitest'

import type { TensionArc } from '@/domain/controls/generation-controls'
import {
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
} from '@/domain/generation/request-rhythm-lock'
import type { GenerationProvenance } from '@/domain/generation/orchestration/orchestration-types'
import {
  barsUseSixteenthNotes,
  isTenserPhrase,
  lockedBarsOfOutcome,
  phraseRhythmLock,
  phraseRhythmLockRecord,
  rhythmLockAfterDecision,
  sessionRhythmLockAtStart,
} from '@/session/rhythm-lock-session'
import {
  SessionEngineError,
  type SessionPhrase,
  type SuccessfulOutcome,
} from '@/session/session-types'
import { phraseOneFor, sessionSettings } from './session-harness'
import { barsOf, expectedGroup, lockSettings } from './rhythm-lock-sessions'

/** Intent: one measure of whole events from (kind, start, length) triples. */
function measure(...events: [kind: 'note' | 'rest', start: number, length: number][]) {
  return events.map(([kind, startTick, durationTicks]) => ({
    kind,
    startTick,
    durationTicks,
    tieContinuation: false,
  }))
}

/** Four measures on the two-tick grid: quarters and eighths. */
const EIGHTH_BARS: readonly LockedRhythmMeasure[] = [
  measure(['note', 0, 4], ['note', 4, 4], ['rest', 8, 4], ['note', 12, 4]),
  measure(['note', 0, 2], ['note', 2, 2], ['note', 4, 8], ['rest', 12, 4]),
  measure(['note', 0, 16]),
  measure(['note', 0, 8], ['rest', 8, 8]),
]

/** A real phrase 1 and its outcome, at the fast tempo. */
const PHRASE_ONE = phraseOneFor(sessionSettings())

/** Intent: phrase 1's outcome with these lock fields in its provenance. */
function withLock(
  fields: Pick<GenerationProvenance, 'rhythmLockOutcome' | 'rhythmChange'>,
): SuccessfulOutcome {
  return {
    ...PHRASE_ONE.outcome,
    provenance: { ...PHRASE_ONE.outcome.provenance, ...fields },
  }
}

/** Intent: a session phrase with this outcome, re-lock mark and number. */
function phraseOf(outcome: SuccessfulOutcome, relock: boolean, phraseNumber = 3): SessionPhrase {
  return {
    phraseNumber,
    origin: 'carry-in',
    intent: PHRASE_ONE.intent,
    outcome,
    ...(relock ? { relock: true as const } : {}),
  }
}

// @test-link [[rule_rhythm_lock_relocks_after_step_down]]
describe('barsUseSixteenthNotes', () => {
  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  it('is false for bars on the two-tick grid, true for an odd start or an odd length', () => {
    expect(barsUseSixteenthNotes(EIGHTH_BARS)).toBe(false)
    const oddLength = [
      ...EIGHTH_BARS.slice(0, 3),
      measure(['note', 0, 8], ['rest', 8, 7], ['note', 15, 1]),
    ]
    expect(barsUseSixteenthNotes(oddLength)).toBe(true)
    const oddStart = [
      measure(['note', 0, 2], ['note', 2, 1], ['note', 3, 1], ['rest', 4, 12]),
      ...EIGHTH_BARS.slice(1),
    ]
    expect(barsUseSixteenthNotes(oddStart)).toBe(true)
    const oddRest = [...EIGHTH_BARS.slice(0, 3), measure(['rest', 0, 3], ['note', 3, 13])]
    expect(barsUseSixteenthNotes(oddRest)).toBe(true)
  })
})

// @test-link [[rule_rhythm_change_share]]
describe('isTenserPhrase', () => {
  // @test-link [[rule_rhythm_change_share]]
  it('is set on phrases 2, 6, 10 only, under Tension across phrases, below Edge', () => {
    const tenser = (arc: boolean, tension: TensionArc) =>
      Array.from({ length: 12 }, (_, index) => index + 1).filter((phraseNumber) =>
        isTenserPhrase(arc, phraseNumber, tension),
      )
    for (const tension of ['Settled', 'Lift', 'Build'] as const) {
      expect(tenser(true, tension)).toEqual([2, 6, 10])
      expect(tenser(false, tension)).toEqual([])
    }
    expect(tenser(true, 'Edge')).toEqual([])
    expect(tenser(false, 'Edge')).toEqual([])
  })

  // @test-link [[rule_rhythm_change_share]]
  it('throws on an unknown tension or an invalid phrase number', () => {
    expect(() => isTenserPhrase(true, 2, 'Calm' as TensionArc)).toThrow(SessionEngineError)
    expect(() => isTenserPhrase(true, 0, 'Lift')).toThrow(SessionEngineError)
    expect(() => isTenserPhrase(false, 1.5, 'Lift')).toThrow(SessionEngineError)
  })
})

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_locked_rhythm_is_phrase_one]]
describe('the session lock state and the groups of a phrase', () => {
  const phraseOne = phraseOf(PHRASE_ONE.outcome, false, 1)

  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  it("holds nothing with the lock off, and phrase 1's bars, frozen, with it on", () => {
    expect(sessionRhythmLockAtStart(sessionSettings(), phraseOne)).toBeUndefined()
    const lock = sessionRhythmLockAtStart(lockSettings(['move_rest']), phraseOne)
    expect(lock).toEqual({
      bars: barsOf(PHRASE_ONE.outcome),
      allowedChanges: ['move_rest'],
      relockOnStepDown: barsUseSixteenthNotes(barsOf(PHRASE_ONE.outcome)),
    })
    expect(lockedBarsOfOutcome(PHRASE_ONE.outcome)).toEqual(barsOf(PHRASE_ONE.outcome))
    expect(Object.isFrozen(lock?.bars[0]?.[0])).toBe(true)
    expect(phraseRhythmLock(undefined, place(2))).toBeUndefined()
  })

  // @test-link [[entity_request_rhythm_lock]]
  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  it('gives the re-lock group only while a re-lock is pending, with the same flag', () => {
    const settled = {
      bars: EIGHTH_BARS,
      allowedChanges: RHYTHM_CHANGE_KINDS,
      relockOnStepDown: false,
    }
    expect(phraseRhythmLock(settled, place(6))).toEqual({
      group: expectedGroup(EIGHTH_BARS, RHYTHM_CHANGE_KINDS, true),
    })
    const pending = { ...settled, relockOnStepDown: true }
    expect(phraseRhythmLock(pending, place(3))).toEqual({
      group: expectedGroup(EIGHTH_BARS, RHYTHM_CHANGE_KINDS, false),
      relockGroup: expectedGroup(EIGHTH_BARS, [], false),
    })
  })

  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  it("locks the re-lock phrase's bars, keeps the lock after any other, refuses one with the lock off", () => {
    const pending = {
      bars: EIGHTH_BARS,
      allowedChanges: ['split_note'] as const,
      relockOnStepDown: true,
    }
    const other = phraseOf(PHRASE_ONE.outcome, false)
    expect(rhythmLockAfterDecision(pending, other)).toBe(pending)
    expect(rhythmLockAfterDecision(undefined, other)).toBeUndefined()
    const relock = phraseOf(PHRASE_ONE.outcome, true)
    expect(rhythmLockAfterDecision(pending, relock)).toEqual({
      bars: barsOf(PHRASE_ONE.outcome),
      allowedChanges: ['split_note'],
      relockOnStepDown: false,
    })
    expect(() => rhythmLockAfterDecision(undefined, relock)).toThrow(SessionEngineError)
  })
})

/** Intent: a phrase's place with Tension across phrases on at Lift. */
function place(phraseNumber: number) {
  return { phraseNumber, tensionInEffect: 'Lift' as const, multiPhraseTensionArc: true }
}

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_forced_bend]]
describe('phraseRhythmLockRecord', () => {
  // @test-link [[module_session_rhythm_lock]]
  it('reads nothing from a phrase without a lock outcome', () => {
    expect(phraseRhythmLockRecord({ outcome: PHRASE_ONE.outcome })).toBeUndefined()
    expect(() => phraseRhythmLockRecord({ outcome: PHRASE_ONE.outcome, relock: true })).toThrow(
      SessionEngineError,
    )
  })

  // @test-link [[rule_forced_bend]]
  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  it('tells locked, changed with its kind, forced bend, no change available, and re-lock', () => {
    const read = (
      fields: Pick<GenerationProvenance, 'rhythmLockOutcome' | 'rhythmChange'>,
      relock = false,
    ) =>
      phraseRhythmLockRecord({
        outcome: withLock(fields),
        ...(relock ? { relock: true as const } : {}),
      })
    expect(read({ rhythmLockOutcome: 'locked_bars' })).toEqual({
      lock: 'locked',
      noChangeAvailable: false,
    })
    expect(read({ rhythmLockOutcome: 'rhythm_change', rhythmChange: 'merge_notes' })).toEqual({
      lock: 'changed',
      change: 'merge_notes',
      noChangeAvailable: false,
    })
    expect(read({ rhythmLockOutcome: 'forced_bend' })).toEqual({
      lock: 'forced_bend',
      noChangeAvailable: false,
    })
    expect(read({ rhythmLockOutcome: 'locked_bars', rhythmChange: 'no_change_available' })).toEqual(
      {
        lock: 'locked',
        noChangeAvailable: true,
      },
    )
    expect(read({ rhythmLockOutcome: 'forced_bend', rhythmChange: 'no_change_available' })).toEqual(
      {
        lock: 'forced_bend',
        noChangeAvailable: true,
      },
    )
    expect(read({ rhythmLockOutcome: 'forced_bend' }, true)).toEqual({
      lock: 'relock',
      noChangeAvailable: false,
    })
    expect(read({ rhythmLockOutcome: 'locked_bars' }, true)).toEqual({
      lock: 'relock',
      noChangeAvailable: false,
    })
  })
})
