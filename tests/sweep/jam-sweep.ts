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
 *
 * A Jam steered by its doodle (a doodle and a drift given) plays as C5 sets it: the controls read
 * from the doodle, its steering block and its join; phrase 1 through the double of Jam's ladder
 * (or another ladder given); then the session started without phrase 1 at the generation
 * measure's start, phrase 1 handed over at the barline it is shown at (phrase 2 requested there,
 * spec D457) and sounding one read-in measure later, every later request carrying the block; no
 * Vary settings and no Tension across phrases, which a Jam has none of.
 */

import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import type { JamDrift } from '@/jam/steering-block-builder'
import { STANDALONE_RESERVE_SECONDS, measureSeconds } from '@/session/session-timing'
import {
  SWEEP_PHRASE_COUNT,
  caseSettings,
  phraseOneIntent,
  phraseSlots,
  runTimedSession,
  type AttemptCost,
  type JamHandover,
  type OutcomeCache,
  type SweepCase,
  type TimedSession,
} from '../unit/session/deadline-sweep'
import { generateEveryAttempt, measuredAttemptCost, runShortfalls } from './deadline-sweep-measured'
import type { AttemptRecord } from './jam-sweep-figures'
import {
  BASELINE_LADDER,
  JAM_DOUBLE_LADDER,
  doodlePhraseOne,
  extendedWaitMeasures,
  jamPhraseOneIntent,
  phraseOneDeadlineSeconds,
  phraseOneGenerator,
  type DoodlePhraseOne,
  type JamLock,
  type LadderAttempt,
  type LadderRung,
  type PhraseOneLadder,
  type PhraseOneReady,
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
 * One run of the sweep. A doodle with a drift steers the Jam (its controls, block and join, see
 * above); a doodle alone is only recorded (chunk 3's runs); no steering block is the baseline; a
 * cold domain applies to a Jam's phrase 1 only. The phrase count defaults to the mode's, the
 * ladder to the double for a steered Jam, the baseline one otherwise.
 */
export interface JamRunConfig {
  readonly mode: JamMode
  readonly sweepCase: SweepCase
  readonly tempo: number
  readonly doodle?: JamDoodle
  readonly drift?: JamDrift
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
  /** The drift of a Jam steered by its doodle, null otherwise. */
  readonly drift: JamDrift | null
  /** The case's instrument. */
  readonly instrument: string
  /** How phrase 2 was decided (carry-in, standalone, repeat), null when it never was. */
  readonly phraseTwoOrigin: string | null
  readonly phraseOne: JamPhraseOneRecord | null
  readonly attempts: readonly AttemptRecord[]
  readonly repeats: number
  readonly shortfalls: readonly string[]
  readonly lockCensus: SessionLockCensus | null
}

/**
 * A finished run: its record, the session it played (none when a Jam's phrase 1 never came) and,
 * for a Jam steered by its doodle, what the doodle gave phrase 1.
 */
export interface JamRun {
  readonly record: JamRunRecord
  readonly session: TimedSession | undefined
  readonly phraseOneInput?: DoodlePhraseOne
}

/**
 * Intent: refuse a configuration only a caller bug can give: a cold domain in session mode, a
 * steering block or a drift in session mode, a drift without a doodle, or a drift beside a block
 * given by hand.
 */
function requireConfig(config: JamRunConfig): void {
  if (config.mode === 'session' && config.domain === 'cold')
    throw new Error('A cold rhythm domain applies to a Jam phrase 1 only, not to session mode.')
  if (config.mode === 'session' && (config.steering !== undefined || config.drift !== undefined))
    throw new Error('Session mode carries no steering block.')
  if (config.drift !== undefined && (config.doodle === undefined || config.steering !== undefined))
    throw new Error('A Jam steered by its doodle needs the doodle, and takes no block by hand.')
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
    ...(attempt.cancelledAt === undefined ? {} : { cancelled: true }),
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

/**
 * Intent: how phrase 2 of a run was decided (its phrase-ready origin), or null when it never was.
 */
function phraseTwoOriginOf(run: TimedSession): string | null {
  return phraseSlots(run)[0]?.decided?.origin ?? null
}

/**
 * Intent: a Jam's phrase 1 through its ladder, at the run's tempo, domain, block and lock; for a
 * Jam steered by its doodle, with what the doodle gives phrase 1 (its controls, block and join).
 */
function jamPhraseOne(config: JamRunConfig): {
  readonly record: JamPhraseOneRecord
  readonly ready: PhraseOneReady | undefined
  readonly doodle: DoodlePhraseOne | undefined
} {
  const settings = caseSettings(config.sweepCase, config.tempo)
  const doodle =
    config.drift === undefined || config.doodle === undefined
      ? undefined
      : doodlePhraseOne(settings, config.doodle.quantized, config.drift, config.lock)
  const ladder =
    config.phraseOneLadder ?? (doodle === undefined ? BASELINE_LADDER : JAM_DOUBLE_LADDER)
  const { attempts, ready } = ladder.run({
    baseIntent: phraseOneIntent(settings, config.sweepCase.seed),
    intentAt: (seed, extras) => jamPhraseOneIntent(settings, seed, extras),
    firstSeed: config.sweepCase.seed,
    steering: doodle?.steering ?? config.steering,
    lock: config.lock,
    deadlineSeconds: phraseOneDeadlineSeconds(config.tempo),
    reserveSeconds: STANDALONE_RESERVE_SECONDS,
    generate: phraseOneGenerator(config.domain),
    sessionSeed: config.sweepCase.firstSessionSeed,
    ...(doodle === undefined ? {} : { doodle }),
  })
  const record = {
    ladder: ladder.name,
    rung: ready?.rung ?? null,
    readyAt: ready?.readyAt ?? null,
    extendedWaitMeasures:
      ready === undefined ? null : extendedWaitMeasures(ready.readyAt, config.tempo),
    attempts,
  }
  return { record, ready, doodle }
}

/**
 * Intent: phrase 1 of a Jam steered by its doodle as the session is handed it (C5.6, C5.7): the
 * attempt that made it, asked for when it started with the doodle's settings and block and the
 * deadline; shown at the first barline at or after it was ready (the generation measure's end at
 * the earliest), sounding one read-in measure later.
 */
function jamHandover(ready: PhraseOneReady, doodle: DoodlePhraseOne, tempo: number): JamHandover {
  const made = ready.made
  if (made === undefined || made.attempt === undefined)
    throw new Error('A steered Jam is handed phrase 1 from a ladder that names its attempt.')
  if (ready.phraseOne.outcome.kind !== 'generation_success')
    throw new Error('Phrase 1 handed over is a generated phrase.')
  const measure = measureSeconds(tempo)
  const shownAt = (1 + extendedWaitMeasures(ready.readyAt, tempo)) * measure
  return {
    attempt: {
      kind: 'phrase-one-attempt',
      at: made.startedAt,
      step: made.rung === 'join-and-block' ? 'carry-in' : 'standalone',
      retry: made.attempt,
      intent: ready.phraseOne.intent,
      settings: doodle.settings,
      deadline: phraseOneDeadlineSeconds(tempo),
      steering: doodle.steering,
    },
    generated: {
      outcome: ready.phraseOne.outcome,
      seconds: made.seconds,
      orderingSeconds: made.orderingSeconds ?? 0,
    },
    chargedSeconds: made.chargedSeconds,
    shownAt,
    soundsAt: shownAt + measure,
  }
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
    drift: config.drift ?? null,
    instrument: sweepCase.controls.instrumentProfileId,
    phraseOne: phraseOne?.record ?? null,
  }
  if (phraseOne !== undefined && phraseOne.ready === undefined) {
    const record = {
      ...base,
      phraseTwoOrigin: null,
      attempts,
      repeats: 0,
      shortfalls: [],
      lockCensus: null,
    }
    return {
      record,
      session: undefined,
      ...(phraseOne.doodle === undefined ? {} : { phraseOneInput: phraseOne.doodle }),
    }
  }
  const steered = phraseOne?.doodle
  const session = await runTimedSession(
    sweepCase,
    tempo,
    outcomes,
    generateEveryAttempt,
    recordingCost(attempts),
    undefined,
    steered !== undefined && phraseOne?.ready !== undefined
      ? { phraseCount, jam: jamHandover(phraseOne.ready, steered, tempo) }
      : {
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
    phraseTwoOrigin: phraseTwoOriginOf(session),
    attempts,
    repeats: repeatCount(session),
    shortfalls: runShortfalls(sweepCase, session),
    lockCensus: lock.on ? censusOfSession(censusPhrasesOf(session), lock.allowedChanges) : null,
  }
  return { record, session, ...(steered === undefined ? {} : { phraseOneInput: steered }) }
}
