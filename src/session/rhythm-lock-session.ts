/**
 * The rhythm lock in a session, as pure functions: the lock state the session holds while the lock
 * is on (the locked bars, frozen from phrase 1 at Start, the allowed changes, and whether a re-lock
 * after a narrow-window step-down is still pending), the rhythm lock group each phrase's requests
 * carry at its place, the lock state once a phrase is decided, and how a phrase's history record
 * reads what the lock did. Nothing here is shown, saved or kept in a kept session.
 */

import { TENSION_ARCS, type TensionArc } from '../domain/controls/generation-controls'
import { deepFreeze } from '../domain/events/deep-freeze'
import {
  makeRequestRhythmLock,
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
  type RhythmChangeKind,
} from '../domain/generation/request-rhythm-lock'
import {
  SessionEngineError,
  type SessionPhrase,
  type SessionSettings,
  type SuccessfulOutcome,
} from './session-types'
import { tensionArcCycleStep } from './tension-arc-cycle'

/**
 * The session's lock state while the lock is on (none while it is off): the locked bars, the
 * rhythm changes the player allows on them, and whether a re-lock is pending: the bars use
 * sixteenth notes and no re-lock has happened yet, so the first phrase generated with Eighth after
 * a narrow-window step-down re-locks.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_locked_rhythm_is_phrase_one]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export interface SessionRhythmLock {
  readonly bars: readonly LockedRhythmMeasure[]
  readonly allowedChanges: readonly RhythmChangeKind[]
  readonly relockOnStepDown: boolean
}

/**
 * The rhythm lock groups one phrase's rungs carry: `group` normally; `relockGroup`, the same
 * locked bars and tenser flag with no allowed change, only while a re-lock is pending, for a rung
 * built with Eighth by the step-down.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[entity_request_rhythm_lock]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export interface PhraseRhythmLock {
  readonly group: RequestRhythmLock
  readonly relockGroup?: RequestRhythmLock
}

/** Where a phrase stands, as its lock group reads it. */
// @spec-link [[module_session_rhythm_lock]]
export interface PhraseLockPlace {
  readonly phraseNumber: number
  readonly tensionInEffect: TensionArc
  readonly multiPhraseTensionArc: boolean
}

/** What the lock did to one phrase, as its history record tells it. */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_forced_bend]]
export interface PhraseRhythmLockRecord {
  readonly lock: 'relock' | 'locked' | 'changed' | 'forced_bend'
  readonly change?: RhythmChangeKind
  readonly noChangeAvailable: boolean
}

/** The sixteenth-tick grid step of the Eighth density: every start and length is a multiple. */
const EIGHTH_GRID_TICKS = 2

/**
 * Intent: the four written measures of a decided phrase's rhythm as locked bars: each event's
 * kind, measure-relative start, length and whether it continues a tie, as written.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_locked_rhythm_is_phrase_one]]
export function lockedBarsOfOutcome(outcome: SuccessfulOutcome): readonly LockedRhythmMeasure[] {
  return outcome.provenance.rhythm.bars.map((bar) =>
    bar.events.map((event) => ({
      kind: event.kind,
      startTick: event.startTick,
      durationTicks: event.durationTicks,
      tieContinuation: event.tieContinuation === true,
    })),
  )
}

/**
 * Intent: whether locked bars use sixteenth notes: some note or rest of them starts or lasts off
 * the Eighth density's two-tick grid.
 */
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export function barsUseSixteenthNotes(bars: readonly LockedRhythmMeasure[]): boolean {
  return bars.some((measure) =>
    measure.some(
      (event) =>
        event.startTick % EIGHTH_GRID_TICKS !== 0 || event.durationTicks % EIGHTH_GRID_TICKS !== 0,
    ),
  )
}

/**
 * Intent: the session's lock state at Start: none while the lock is off; otherwise phrase 1's
 * written bars (the Idle phrase Start takes, stale or not), the allowed changes chosen, and a
 * re-lock pending when those bars use sixteenth notes. Deep-frozen.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_locked_rhythm_is_phrase_one]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export function sessionRhythmLockAtStart(
  settings: SessionSettings,
  phraseOne: SessionPhrase,
): SessionRhythmLock | undefined {
  if (!settings.rhythmLockOn) return undefined
  const bars = lockedBarsOfOutcome(phraseOne.outcome)
  return deepFreeze({
    bars,
    allowedChanges: [...settings.allowedRhythmChanges],
    relockOnStepDown: barsUseSixteenthNotes(bars),
  })
}

/**
 * Intent: whether a phrase is a tenser one: Tension across phrases runs in the session, the
 * phrase's cycle step is one step tenser (phrases 2, 6, 10...), and the tension in effect from
 * it on is below Edge, so the step really makes it tenser. A Vary settings tension step never
 * counts. An unknown tension or an invalid phrase number throws.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_rhythm_change_share]]
export function isTenserPhrase(
  multiPhraseTensionArc: boolean,
  phraseNumber: number,
  tensionInEffect: TensionArc,
): boolean {
  const index = TENSION_ARCS.indexOf(tensionInEffect)
  if (index < 0) throw new SessionEngineError(`Unknown tension arc: ${String(tensionInEffect)}.`)
  const tenserStep = tensionArcCycleStep(phraseNumber) === 1
  return multiPhraseTensionArc && tenserStep && index < TENSION_ARCS.length - 1
}

/**
 * Intent: the rhythm lock groups a phrase's rungs carry at its place: none while the lock is off;
 * otherwise on with the locked bars, the allowed changes and the phrase's tenser flag, plus, while
 * a re-lock is pending, the re-lock group: the same bars and flag with no allowed change, so the
 * re-lock phrase draws no change and takes the nearest rhythm of its own density.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[entity_request_rhythm_lock]]
// @spec-link [[rule_rhythm_lock_strict]]
// @spec-link [[rule_rhythm_change_lasts_one_phrase]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
// @spec-link [[rule_forced_bend]]
export function phraseRhythmLock(
  lock: SessionRhythmLock | undefined,
  place: PhraseLockPlace,
): PhraseRhythmLock | undefined {
  if (lock === undefined) return undefined
  const { phraseNumber, tensionInEffect, multiPhraseTensionArc } = place
  const tenserPhrase = isTenserPhrase(multiPhraseTensionArc, phraseNumber, tensionInEffect)
  const state = { kind: 'locked', bars: lock.bars } as const
  const group = makeRequestRhythmLock({ state, allowedChanges: lock.allowedChanges, tenserPhrase })
  if (!lock.relockOnStepDown) return Object.freeze({ group })
  const relockGroup = makeRequestRhythmLock({ state, allowedChanges: [], tenserPhrase })
  return Object.freeze({ group, relockGroup })
}

/**
 * Intent: the session's lock state once a phrase is decided: after the re-lock phrase, its written
 * bars locked for the rest of the session, the allowed changes kept and no re-lock pending any
 * more; after any other phrase, the same. A re-lock phrase with the lock off is a caller bug.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export function rhythmLockAfterDecision(
  lock: SessionRhythmLock | undefined,
  phrase: SessionPhrase,
): SessionRhythmLock | undefined {
  if (phrase.relock !== true) return lock
  if (lock === undefined)
    throw new SessionEngineError(`Phrase ${phrase.phraseNumber} re-locks with the lock off.`)
  return deepFreeze({
    bars: lockedBarsOfOutcome(phrase.outcome),
    allowedChanges: [...lock.allowedChanges],
    relockOnStepDown: false,
  })
}

/** Intent: the kind of change a phrase that took a drawn change made, which it must name. */
function changeKindOf(outcome: SuccessfulOutcome): RhythmChangeKind {
  const change = outcome.provenance.rhythmChange
  const kind = RHYTHM_CHANGE_KINDS.find((entry) => entry === change)
  if (kind === undefined)
    throw new SessionEngineError(
      `A phrase that changed its rhythm names no change kind: ${change}.`,
    )
  return kind
}

/**
 * Intent: what the lock did to one phrase, read from its history record: none when its outcome
 * holds no lock outcome (the lock off, or phrase 1); a re-lock when the session's re-lock mark is
 * set, whatever the provenance says; otherwise the locked bars, a change with its kind, or a
 * forced bend, with whether the phrase drew a change and none was available.
 */
// @spec-link [[module_session_rhythm_lock]]
// @spec-link [[rule_forced_bend]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export function phraseRhythmLockRecord(record: {
  readonly outcome: SuccessfulOutcome
  readonly relock?: true
}): PhraseRhythmLockRecord | undefined {
  const { rhythmLockOutcome, rhythmChange } = record.outcome.provenance
  if (rhythmLockOutcome === undefined) {
    if (record.relock === true)
      throw new SessionEngineError('A re-lock phrase must hold the rhythm lock outcome.')
    return undefined
  }
  const noChangeAvailable = rhythmChange === 'no_change_available'
  if (record.relock === true) return deepFreeze({ lock: 'relock', noChangeAvailable })
  if (rhythmLockOutcome === 'rhythm_change')
    return deepFreeze({ lock: 'changed', change: changeKindOf(record.outcome), noChangeAvailable })
  const lock = rhythmLockOutcome === 'locked_bars' ? 'locked' : 'forced_bend'
  return deepFreeze({ lock, noChangeAvailable })
}
