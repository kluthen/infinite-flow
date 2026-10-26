/**
 * Shared builders for the specs of the rhythm lock in a session: chosen settings with the lock on,
 * a phrase's written bars as locked bars (read from its outcome's rhythm, independently of the
 * session's own reader), the lock group a request is expected to carry, the tenser flag computed
 * from the rule, the phrases a driver decided, and the session history its outputs record.
 */

import type { GenerationControls, TensionArc } from '@/domain/controls/generation-controls'
import type {
  LockedRhythmMeasure,
  RequestRhythmLock,
  RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { createSessionHistory, type SessionHistory } from '@/session/session-history'
import type { SessionPhrase, SessionSettings, SuccessfulOutcome } from '@/session/session-types'
import { lockedBarsOf } from '../domain/rhythm/rhythm-lock-fixture'
import { FAST_TEMPO } from './scripted-session'
import { fixedWallClock, sessionSettings, type SessionDriver } from './session-harness'

/** Intent: chosen settings at the fast tempo with the rhythm lock on and these changes allowed. */
export function lockSettings(
  allowedRhythmChanges: readonly RhythmChangeKind[],
  overrides: Partial<GenerationControls> = {},
): SessionSettings {
  return {
    ...sessionSettings({ tempo: FAST_TEMPO, ...overrides }),
    rhythmLockOn: true,
    allowedRhythmChanges,
  }
}

/** Intent: an outcome's written bars, as a request's locked bars hold them. */
export function barsOf(outcome: SuccessfulOutcome): readonly LockedRhythmMeasure[] {
  return lockedBarsOf(outcome.provenance.rhythm)
}

/** Intent: the lock group a request is expected to carry, as a plain value. */
export function expectedGroup(
  bars: readonly LockedRhythmMeasure[],
  allowedChanges: readonly RhythmChangeKind[],
  tenserPhrase: boolean,
): RequestRhythmLock {
  return { state: { kind: 'locked', bars }, allowedChanges, tenserPhrase }
}

/**
 * Intent: the tenser flag by the rule: Tension across phrases on, the second phrase of a group of
 * four (2, 6, 10...), and the tension in effect below Edge.
 */
export function expectedTenser(
  tensionAcrossPhrases: boolean,
  phraseNumber: number,
  tensionInEffect: TensionArc,
): boolean {
  return tensionAcrossPhrases && (phraseNumber - 1) % 4 === 1 && tensionInEffect !== 'Edge'
}

/** Intent: every phrase a driver decided (no settings change discards one in these runs). */
export function decidedPhrases(driver: SessionDriver): readonly SessionPhrase[] {
  return driver.all('phrase-ready').map((output) => output.phrase)
}

/** Intent: the session history the driver's outputs record. */
export function historyOf(driver: SessionDriver): SessionHistory {
  const history = createSessionHistory(
    driver.settings,
    fixedWallClock,
    driver.start.sessionSeed,
    BUILT_IN_INSTRUMENT_CLEF,
  )
  for (const output of driver.log) history.record(output)
  return history
}
