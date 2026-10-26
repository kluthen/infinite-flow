/**
 * The Jam sweep's runs (measurement tooling, v3.2 measurements M1 and M5): one case at one tempo,
 * played as a Jam (phrase 1 through a pluggable ladder before its deadline, then phrases 2 to n as
 * a session) or as a session (phrase 1 at Idle, as v3.1 plays it), with or without a steering
 * block, the rhythm lock off or on, phrase 1's rhythm domain warm or cold. Every attempt is
 * charged its measured cost (deadline-sweep-measured.ts). A run comes back as a small record of
 * times, counts and lines (`JamRunRecord`) the figures add up, and the timed session it played.
 *
 * With no steering block, the lock off and a warm domain, a Jam asks for the very phrase 1 a
 * session gets at Idle, so it plays the same phrases as v3.1's measured session.
 */

import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { STANDALONE_RESERVE_SECONDS } from '@/session/session-timing'
import {
  SWEEP_PHRASE_COUNT,
  caseSettings,
  phraseOneIntent,
  phraseSlots,
  runTimedSession,
  type AttemptCost,
  type OutcomeCache,
  type SweepCase,
  type TimedSession,
} from '../unit/session/deadline-sweep'
import { generateEveryAttempt, measuredAttemptCost, runShortfalls } from './deadline-sweep-measured'
import type { AttemptRecord } from './jam-sweep-figures'
import {
  BASELINE_LADDER,
  extendedWaitMeasures,
  jamPhraseOneIntent,
  phraseOneDeadlineSeconds,
  phraseOneGenerator,
  type JamLock,
  type LadderAttempt,
  type LadderRung,
  type PhraseOneLadder,
  type RhythmDomainState,
} from './jam-sweep-ladder'
import {
  censusOfSession,
  type CensusPhrase,
  type SessionLockCensus,
  type VaryTensionStep,
} from './lock-census'

/** How a run plays: as a Jam, or as a session started from Idle. */
export type JamMode = 'jam' | 'session'

/** A doodle a Jam run is played after, by name. */
export interface JamDoodle {
  readonly name: string
  readonly quantized: QuantizedDoodle
}

/** How many phrases a Jam plays before Stop, phrase 1 included. */
export const JAM_PHRASE_COUNT = 8

/** How many phrases a session-mode run plays before Stop: v3.1's sweep's. */
export const SESSION_PHRASE_COUNT = SWEEP_PHRASE_COUNT

/**
 * One run of the sweep. The doodle is recorded and not yet read (the controls a doodle sets come
 * later); no steering block is the baseline; a cold domain applies to a Jam's phrase 1 only. The
 * phrase count defaults to the mode's, the ladder to the baseline one.
 */
export interface JamRunConfig {
  readonly mode: JamMode
  readonly sweepCase: SweepCase
  readonly tempo: number
  readonly doodle?: JamDoodle
  readonly steering?: SteeringBlock
  readonly lock: JamLock
  readonly domain: RhythmDomainState
  readonly phraseCount?: number
  readonly phraseOneLadder?: PhraseOneLadder
}

/** What a Jam's ladder did for phrase 1: its attempts, and its rung and readiness when it came. */
export interface JamPhraseOneRecord {
  readonly ladder: string
  readonly rung: LadderRung | null
  readonly readyAt: number | null
  readonly extendedWaitMeasures: number | null
  readonly attempts: readonly LadderAttempt[]
}

/**
 * What the figures keep of one run: no phrase, only phrase 1's ladder (a Jam's), every attempt
 * (phrase 1's ladder first, then the session's in request order), the repeats, the deadline
 * shortfalls and, with the lock on, the lock census of the phrases that sounded.
 */
export interface JamRunRecord {
  readonly label: string
  readonly mode: JamMode
  readonly tempo: number
  readonly phraseCount: number
  readonly doodle: string | null
  readonly phraseOne: JamPhraseOneRecord | null
  readonly attempts: readonly AttemptRecord[]
  readonly repeats: number
  readonly shortfalls: readonly string[]
  readonly lockCensus: SessionLockCensus | null
}

/** A finished run: its record, and the session it played (none when a Jam's phrase 1 never came). */
export interface JamRun {
  readonly record: JamRunRecord
  readonly session: TimedSession | undefined
}

/** Intent: refuse a configuration only a caller bug can give: a cold domain in session mode. */
function requireConfig(config: JamRunConfig): void {
  if (config.mode === 'session' && config.domain === 'cold')
    throw new Error('A cold rhythm domain applies to a Jam phrase 1 only, not to session mode.')
  if (config.mode === 'session' && config.steering !== undefined)
    throw new Error('Session mode carries no steering block.')
}

/** Intent: the measured cost of each session attempt, recording each one's time as it is charged. */
function recordingCost(records: AttemptRecord[]): AttemptCost {
  return (generated, request) => {
    const chargedSeconds = measuredAttemptCost(generated, request)
    if (generated === undefined) throw new Error('A measured attempt has an outcome.')
    const { outcome, seconds, orderingSeconds } = generated
    records.push({
      phraseNumber: request.phraseNumber,
      kind: request.step,
      seconds,
      chargedSeconds,
      failureCode: outcome.kind === 'generation_failure' ? outcome.code : null,
      orderingSeconds,
    })
    return chargedSeconds
  }
}

/** Intent: a ladder attempt as an attempt record of phrase 1. */
function ladderAttemptRecord(attempt: LadderAttempt): AttemptRecord {
  return {
    phraseNumber: 1,
    kind: attempt.rung,
    seconds: attempt.seconds,
    chargedSeconds: attempt.chargedSeconds,
    failureCode: attempt.failureCode,
    ...(attempt.orderingSeconds === undefined ? {} : { orderingSeconds: attempt.orderingSeconds }),
  }
}

/**
 * Intent: each phrase that sounded in a run, in phrase order, as the lock census reads it: its
 * repeat and re-lock marks, the written bars and lock record of the generation outcome it sounded
 * with (its provenance), its request's tenser flag, the tension in effect, and the Vary settings
 * tension step that landed on it, when one did. Phrase 1 is the locked rhythm; a repeat sounds its
 * phrase's rhythm, and carries its record, again.
 */
export function censusPhrasesOf(run: TimedSession): CensusPhrase[] {
  const varySteps = new Map<number, VaryTensionStep>()
  for (const { output } of run.outputs)
    if (
      output.kind === 'settings-changed' &&
      output.cause === 'mutation' &&
      output.setting === 'tension'
    )
      varySteps.set(output.phraseNumber, { from: output.from, to: output.to })
  const byNumber = new Map<number, CensusPhrase>()
  for (const { output } of run.outputs)
    if (output.kind === 'phrase-sounding') {
      const { phraseNumber, origin, relock, intent, outcome } = output.phrase
      const { rhythm, rhythmLockOutcome, rhythmChange } = outcome.provenance
      const varyTensionStep = varySteps.get(phraseNumber)
      byNumber.set(phraseNumber, {
        phraseNumber,
        repeat: origin === 'repeat',
        relock: relock === true,
        bars: rhythm.bars,
        ...(rhythmLockOutcome === undefined ? {} : { rhythmLockOutcome }),
        ...(rhythmChange === undefined ? {} : { rhythmChange }),
        tenserPhrase: intent.rhythmLock?.tenserPhrase === true,
        tension: intent.controls.tension,
        ...(varyTensionStep === undefined ? {} : { varyTensionStep }),
      })
    }
  return [...byNumber.values()].sort((a, b) => a.phraseNumber - b.phraseNumber)
}

/**
 * Intent: how many of a run's planned phrases (2 to its phrase count) were decided as a repeat, as
 * runShortfalls counts them; a look-ahead phrase past the planned end never sounds, so its repeat
 * does not count.
 */
function repeatCount(run: TimedSession): number {
  return phraseSlots(run).filter((slot) => slot.decided?.origin === 'repeat').length
}

/** Intent: a Jam's phrase 1 through its ladder, at the run's tempo, domain, block and lock. */
function jamPhraseOne(config: JamRunConfig): {
  readonly record: JamPhraseOneRecord
  readonly ready: ReturnType<PhraseOneLadder['run']>['ready']
} {
  const settings = caseSettings(config.sweepCase, config.tempo)
  const ladder = config.phraseOneLadder ?? BASELINE_LADDER
  const { attempts, ready } = ladder.run({
    baseIntent: phraseOneIntent(settings, config.sweepCase.seed),
    intentAt: (seed, extras) => jamPhraseOneIntent(settings, seed, extras),
    firstSeed: config.sweepCase.seed,
    steering: config.steering,
    lock: config.lock,
    deadlineSeconds: phraseOneDeadlineSeconds(config.tempo),
    reserveSeconds: STANDALONE_RESERVE_SECONDS,
    generate: phraseOneGenerator(config.domain),
  })
  const record = {
    ladder: ladder.name,
    rung: ready?.rung ?? null,
    readyAt: ready?.readyAt ?? null,
    extendedWaitMeasures:
      ready === undefined ? null : extendedWaitMeasures(ready.readyAt, config.tempo),
    attempts,
  }
  return { record, ready }
}

/**
 * Intent: play one run: a Jam's phrase 1 through its ladder, then (when it came) phrases 2 to n as
 * a session started from it; or a session-mode run from phrase 1 at Idle. Every session attempt is
 * charged its measured cost; with the lock on, the phrases that sounded are classified against
 * phrase 1's rhythm.
 */
export async function runJamCase(config: JamRunConfig, outcomes: OutcomeCache): Promise<JamRun> {
  requireConfig(config)
  const { sweepCase, tempo, lock } = config
  const phraseCount =
    config.phraseCount ?? (config.mode === 'jam' ? JAM_PHRASE_COUNT : SESSION_PHRASE_COUNT)
  const phraseOne = config.mode === 'jam' ? jamPhraseOne(config) : undefined
  const attempts: AttemptRecord[] = (phraseOne?.record.attempts ?? []).map(ladderAttemptRecord)
  const base = {
    label: sweepCase.label,
    mode: config.mode,
    tempo,
    phraseCount,
    doodle: config.doodle?.name ?? null,
    phraseOne: phraseOne?.record ?? null,
  }
  if (phraseOne !== undefined && phraseOne.ready === undefined) {
    const record = { ...base, attempts, repeats: 0, shortfalls: [], lockCensus: null }
    return { record, session: undefined }
  }
  const session = await runTimedSession(
    sweepCase,
    tempo,
    outcomes,
    generateEveryAttempt,
    recordingCost(attempts),
    undefined,
    {
      phraseCount,
      settings: {
        rhythmLockOn: lock.on,
        ...(lock.on ? { allowedRhythmChanges: lock.allowedChanges } : {}),
      },
      ...(phraseOne?.ready === undefined ? {} : { phraseOne: phraseOne.ready.phraseOne }),
    },
  )
  const record: JamRunRecord = {
    ...base,
    attempts,
    repeats: repeatCount(session),
    shortfalls: runShortfalls(sweepCase, session),
    lockCensus: lock.on ? censusOfSession(censusPhrasesOf(session), lock.allowedChanges) : null,
  }
  return { record, session }
}
