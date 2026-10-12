/**
 * Shared plumbing for the look-ahead deadline sweep: the sweep's cases (every supported rhythm
 * setting crossed with the seed matrix's seeds, every value of every other generation control and
 * both values of each session flag assigned to them deterministically) and a timed session run.
 *
 * A timed run drives the real session runner, with the real `generatePhrase` behind its generate
 * seam, on a fake audio clock that only this module moves. Every generate call keeps one serial
 * generator (the app's single generation worker) busy for the time its cost model charges: by
 * default a fixed modelled time, so a deadline is met or missed by the model, never by the speed of
 * the machine running the tests; a run can charge another cost instead. A run may play an Idle
 * phase before Start, off the clock, whose ready phrases the session's start carries. An attempt the engine
 * cancels while it runs frees the generator at the cancel plus the worker's restart cost, and is
 * never answered; one cancelled while still queued leaves the queue at no cost. The transport plays
 * the session in time: the count-in, each phrase starting to sound on the measure grid at the
 * session's tempo, a tick at every deadline the engine asks to be woken at, and Stop once the last
 * planned phrase has sounded in full. Every output is kept with the fake time it came out at.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { PHRASE_MEASURE_COUNT } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { makeSeed } from '@/domain/random/seed'
import {
  GenerationCancelledError,
  GenerationWorkerCrashError,
} from '@/generation-worker/generation-worker-client'
import type { PregenerationSeams, PregenerationStart } from '@/session/session-pregeneration'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { createSessionRunner, type SessionRunnerEvent } from '@/session/session-runner'
import {
  COUNT_IN_MEASURES,
  WORKER_RESPAWN_SECONDS,
  measureSeconds,
  nextPhraseDeadline,
  phraseTwoDeadline,
} from '@/session/session-timing'
import type {
  AudioTime,
  SessionOutput,
  SessionSettings,
  SessionStart,
} from '@/session/session-types'
import { settingsMutationSeed } from '@/session/session-seed-plan'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import { SEEDS } from '../domain/generation/carry-in/carry-in-matrix'
import {
  allRhythmSettings,
  settingKey,
  type RhythmSetting,
} from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'
import { buildIntent } from '../domain/generation/carry-in/carry-in-fixture'
import {
  UNREAD_DISPLAY,
  failureOutcome,
  fakeViewport,
  queuedProviders,
  withoutTempo,
  type GenerationRequestOutput,
} from './session-harness'

/**
 * The modelled cost of one generation attempt, retries included, in seconds of audio time: from
 * the request to a phrase drawn on the staff. On the reference machine on 2026-10-06 the slowest
 * cold generation in Chromium took 277.2 ms from request to phrase ready, the worker round trip
 * and the engraving included (321 ms counted from the click), and the longest main-thread
 * engraving block was 52.8 ms (docs/generation-latency.md, "2026-10-06 run (v2.0 gate)"). 350 ms
 * covers the slowest generation plus the longest engraving block on top, and is charged to every
 * attempt alike, warm ones and failed ones included.
 */
export const ATTEMPT_COST_SECONDS = 0.35

/**
 * The most times phrase 1 is generated at Idle, each with the next seed, before a case is given up
 * as broken.
 */
const IDLE_GENERATIONS = 5

/** The tempos the sweep runs every case at: the slowest, a middle and the fastest, in BPM. */
export const SWEEP_TEMPOS: readonly number[] = [60, 120, 240]

/** How many phrases each swept session plays before Stop, phrase 1 included. */
export const SWEEP_PHRASE_COUNT = 6

/** The window every swept session runs in: at or above the tablet-landscape width. */
const WIDE_WINDOW = { belowTabletLandscape: false, sessionSteppedDown: false }

/** One case of the sweep: the chosen settings and flags of one session, and its seeds. */
export interface SweepCase {
  readonly index: number
  readonly label: string
  readonly rhythm: RhythmSetting
  /** The seed-matrix seed phrase 1 is first generated with at Idle. */
  readonly seed: number
  /** The session seed drawn with phrase 1: every seed the session uses derives from it. */
  readonly firstSessionSeed: number
  readonly controls: Omit<GenerationControls, 'tempo'>
  readonly musicalProfile: MusicalProfile
  /** The "Vary settings" flag: the settings mutation, on with its own seed, or off. */
  readonly varySettings: boolean
  /** The "Tension across phrases" flag: the multi-phrase tension arc. */
  readonly tensionAcrossPhrases: boolean
}

/** Intent: every rhythm setting of the 324-setting catalog that does not block generation. */
export function supportedRhythmSettings(): readonly RhythmSetting[] {
  return allRhythmSettings().filter((setting) => !isRhythmSettingBlocked(setting, WIDE_WINDOW))
}

/**
 * The generation controls and session flags outside the rhythm setting, each with every value it
 * can take. Tempo is not among them: each case runs at every sweep tempo.
 */
export const NON_RHYTHM_DIMENSIONS = {
  tonalCenter: PITCH_CLASSES,
  collection: COLLECTIONS,
  harmonicMotion: HARMONIC_MOTIONS,
  contour: CONTOURS,
  register: REGISTER_CHOICES,
  leapiness: LEAPINESS_VALUES,
  arpeggioChaos: ARPEGGIO_CHAOS_VALUES,
  instrumentProfileId: INSTRUMENT_PROFILE_IDS,
  musicalProfile: MUSICAL_PROFILES,
  varySettings: [false, true],
  tensionAcrossPhrases: [true, false],
} as const

/**
 * Intent: the value one dimension takes in case `index`, round-robin with a per-dimension shift
 * after each full turn, so every value appears within the first `values.length` cases and two
 * dimensions of the same size do not stay locked in the same pairs.
 */
function roundRobin<T>(values: readonly T[], index: number, shift: number): T {
  const turn = Math.floor(index / values.length)
  return values[(index + turn * shift) % values.length]!
}

/**
 * Intent: the sweep's cases, in a fixed order: each supported rhythm setting with each seed of the
 * seed matrix, and every other control and flag assigned round-robin over the case index.
 */
export function sweepCases(): readonly SweepCase[] {
  const d = NON_RHYTHM_DIMENSIONS
  return supportedRhythmSettings().flatMap((rhythm, settingIndex) =>
    SEEDS.map((seed, seedIndex): SweepCase => {
      const index = settingIndex * SEEDS.length + seedIndex
      const controls = {
        tonalCenter: roundRobin(d.tonalCenter, index, 1),
        collection: roundRobin(d.collection, index, 2),
        harmonicMotion: roundRobin(d.harmonicMotion, index, 1),
        tension: rhythm.tensionArc,
        noteDensity: rhythm.noteDensity,
        rhythmicVariety: rhythm.rhythmicVariety,
        syncopation: rhythm.syncopation,
        silenceDensity: rhythm.silenceDensity,
        contour: roundRobin(d.contour, index, 1),
        register: roundRobin(d.register, index, 2),
        leapiness: roundRobin(d.leapiness, index, 3),
        arpeggioChaos: roundRobin(d.arpeggioChaos, index, 2),
        instrumentProfileId: roundRobin(d.instrumentProfileId, index, 1),
      }
      const musicalProfile = roundRobin(d.musicalProfile, index, 0)
      const varySettings = roundRobin(d.varySettings, Math.floor(index / 2), 1)
      const tensionAcrossPhrases = roundRobin(d.tensionAcrossPhrases, Math.floor(index / 4), 1)
      const flags = `${varySettings ? 'vary' : 'fixed'}${tensionAcrossPhrases ? ' arc' : ''}`
      return {
        index,
        label: `#${index} ${settingKey(rhythm)} seed ${seed} ${controls.instrumentProfileId} ${controls.register} ${controls.tonalCenter} ${controls.collection} ${musicalProfile} ${flags}`,
        rhythm,
        seed,
        firstSessionSeed: 100_000 + 100 * index,
        controls,
        musicalProfile,
        varySettings,
        tensionAcrossPhrases,
      }
    }),
  )
}

/** Intent: the chosen settings of a case at one tempo. */
function caseSettings(sweepCase: SweepCase, tempo: number): SessionSettings {
  return {
    controls: makeGenerationControls({ ...sweepCase.controls, tempo }),
    musicalProfile: { musicalProfile: sweepCase.musicalProfile, isCustom: true },
  }
}

/** A real outcome, with the wall time in seconds `generatePhrase` took to produce it here. */
interface TimedOutcome {
  readonly outcome: GenerationOutcome
  readonly seconds: number
}

/**
 * The real outcomes of the intents a sweep generates, shared by the runs of one case at its three
 * tempos: tempo never reaches generation, so an intent's outcome is keyed without its tempo. Each
 * intent is generated and timed once; its later runs reuse the outcome and the time recorded.
 */
export class OutcomeCache {
  private readonly outcomes = new Map<string, TimedOutcome>()

  /** Intent: the real outcome of an intent and its generation time, once per intent content. */
  of(intent: GenerationIntent): TimedOutcome {
    const key = JSON.stringify(withoutTempo(intent))
    const cached = this.outcomes.get(key)
    if (cached !== undefined) return cached
    const startedAt = performance.now()
    const outcome = generatePhrase(intent)
    const timed = { outcome, seconds: (performance.now() - startedAt) / 1000 }
    this.outcomes.set(key, timed)
    return timed
  }
}

/** How one generate call is answered: by the real generator, a failure, or a worker crash. */
type AttemptAnswer = 'generate' | 'fail' | 'crash'

/** The injected-failure script: how to answer each requested attempt. */
export type AttemptScript = (request: GenerationRequestOutput) => AttemptAnswer

/**
 * How long one attempt keeps the serial generator busy, in seconds of audio time, given its real
 * outcome (undefined when the script answers it with an injected failure or crash) and the request
 * it answers.
 */
export type AttemptCost = (
  generated: TimedOutcome | undefined,
  request: GenerationRequestOutput,
) => number

/** Intent: the default cost model: every attempt costs the same modelled time. */
const flatAttemptCost: AttemptCost = () => ATTEMPT_COST_SECONDS

/**
 * An Idle phase a run plays before Start, off the fake clock: given the seams the session will run
 * with (so request ids carry on from it) and what the session starts from, the phrases it
 * pre-generated, which the session's start carries. A run with none starts with no ready phrase.
 */
export type IdlePhase = (
  seams: PregenerationSeams,
  start: PregenerationStart,
) => Promise<readonly ReadyPhrase[]>

/** One output of a timed run, with the fake audio time it came out at. */
export interface TimedOutput {
  readonly at: AudioTime
  readonly output: SessionOutput
}

/**
 * What the serial generator did with one requested attempt: when it started on it (undefined when
 * it never did), and when it was answered or cancelled (undefined when neither happened by the end
 * of the run).
 */
export interface GeneratorRecord {
  readonly attemptId: number
  readonly phraseNumber: number
  readonly step: 'carry-in' | 'standalone'
  readonly requestedAt: AudioTime
  readonly startedAt: AudioTime | undefined
  readonly answeredAt: AudioTime | undefined
  readonly cancelledAt: AudioTime | undefined
}

/**
 * A finished timed run: every output in order, what the generator did with each attempt, in
 * request order, and every error the runner or engine raised.
 */
export interface TimedSession {
  readonly tempo: number
  readonly outputs: readonly TimedOutput[]
  readonly generations: readonly GeneratorRecord[]
  readonly errors: readonly unknown[]
}

/** One attempt handed to the serial generator, with how it is answered and what it costs. */
interface GeneratorJob {
  readonly request: GenerationRequestOutput
  readonly answer: AttemptAnswer
  readonly generated: TimedOutcome | undefined
  readonly cost: number
  readonly resolve: (outcome: GenerationOutcome) => void
  readonly reject: (error: Error) => void
  readonly record: OpenGeneratorRecord
}

/** A generator record still being filled in during its run. */
type OpenGeneratorRecord = { -readonly [K in keyof GeneratorRecord]: GeneratorRecord[K] }

/** One thing due on the fake clock: a generate call finishing, or a transport event. */
interface DueItem {
  readonly at: AudioTime
  readonly order: number
  readonly run: () => void
}

/** Intent: let every settled promise run its continuations before the clock moves on. */
function drainContinuations(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

/** Intent: the moment phrase N starts sounding in a session started at 0, at a tempo. */
export function soundingAt(phraseNumber: number, tempo: number): AudioTime {
  const measure = measureSeconds(tempo)
  return measure * (COUNT_IN_MEASURES + (phraseNumber - 1) * PHRASE_MEASURE_COUNT)
}

/**
 * Intent: the transport's events of a session of `phraseCount` phrases started at 0: the count-in
 * over, each later phrase starting to sound, and Stop when the last phrase has sounded.
 */
function transportEvents(tempo: number, phraseCount: number): readonly SessionRunnerEvent[] {
  const sounding = Array.from({ length: phraseCount - 1 }, (_, offset) => offset + 2).map(
    (phraseNumber): SessionRunnerEvent => ({
      kind: 'phrase-started-sounding',
      at: soundingAt(phraseNumber, tempo),
      phraseNumber,
    }),
  )
  return [
    { kind: 'count-in-over', at: soundingAt(1, tempo) },
    ...sounding,
    { kind: 'end', at: soundingAt(phraseCount + 1, tempo), cause: 'stop' },
  ]
}

/**
 * Intent: the runner's fit check: the attempt's written phrase is built from its outcome and
 * intent, the step before engraving, and it fits the wide window's staff.
 */
export function writtenPhraseFits(candidate: {
  readonly outcome: Parameters<typeof notationInputFromOutcome>[0]
  readonly intent: GenerationIntent
}): Promise<boolean> {
  transformToWrittenPhrase(notationInputFromOutcome(candidate.outcome, candidate.intent))
  return Promise.resolve(true)
}

/**
 * Intent: phrase 1 as the player gets it at Idle, before Start. As in v1, a phrase 1 that fails at
 * Idle is no phrase to start from, and the player generates again; the sweep does the same
 * deterministically, with the next seed each time (the case's seed, then seed + 1, seed + 2, ...),
 * and gives the case up as broken after `IDLE_GENERATIONS` failures.
 */
function phraseOneAtIdle(
  sweepCase: SweepCase,
  settings: SessionSettings,
  outcomes: OutcomeCache,
): SessionStart['phraseOne'] {
  for (let seed = sweepCase.seed; seed < sweepCase.seed + IDLE_GENERATIONS; seed++) {
    const intent = buildIntent({
      controls: settings.controls,
      musicalProfile: settings.musicalProfile.musicalProfile,
      seed,
      label: 'sweep-phrase-1',
    })
    const { outcome } = outcomes.of(intent)
    if (outcome.kind === 'generation_success') return { intent, outcome }
  }
  throw new Error(`${sweepCase.label}: phrase 1 failed at Idle with ${IDLE_GENERATIONS} seeds`)
}

/**
 * Intent: play one case's session at a tempo through the real runner on the fake clock, answering
 * each attempt as the script says once the serial generator has spent the attempt's cost on it,
 * unless the engine cancels it first, and keep every output with its time. An Idle phase, when
 * given, runs first and the session starts with the phrases it made ready. The run stops at Stop,
 * or at the first event the engine refuses.
 */
export async function runTimedSession(
  sweepCase: SweepCase,
  tempo: number,
  outcomes: OutcomeCache,
  script: AttemptScript,
  attemptCost: AttemptCost = flatAttemptCost,
  idlePhase?: IdlePhase,
): Promise<TimedSession> {
  const settings = caseSettings(sweepCase, tempo)
  const providers = queuedProviders(sweepCase.firstSessionSeed)
  const viewport = fakeViewport(false)
  const start: PregenerationStart = {
    settings,
    phraseOne: phraseOneAtIdle(sweepCase, settings, outcomes),
    sessionSeed: makeSeed(sweepCase.firstSessionSeed),
    mutation: sweepCase.varySettings
      ? { kind: 'on', seed: settingsMutationSeed(makeSeed(sweepCase.firstSessionSeed)) }
      : SETTINGS_MUTATION_OFF,
    multiPhraseTensionArc: sweepCase.tensionAcrossPhrases,
  }
  const readyPhrases =
    idlePhase === undefined ? [] : await idlePhase({ providers, viewport }, start)
  const clock = { at: 0 }
  const due: DueItem[] = []
  const outputs: TimedOutput[] = []
  const errors: unknown[] = []
  const generations: OpenGeneratorRecord[] = []
  /** The jobs waiting for the generator, in request order. */
  const waiting: GeneratorJob[] = []
  /** The job the generator is on, with the due item that answers it. */
  let current: { readonly job: GeneratorJob; readonly answer: DueItem } | undefined
  /** The earliest moment the generator can start a job: after the last one, or after a restart. */
  let generatorFreeAt = 0
  let queued = 0
  let latestRequest: GenerationRequestOutput | undefined

  /** Intent: queue work for a moment on the fake clock, after anything already queued for it. */
  function schedule(at: AudioTime, run: () => void): DueItem {
    const item = { at, order: queued++, run }
    due.push(item)
    due.sort((a, b) => a.at - b.at || a.order - b.order)
    return item
  }

  /** Intent: take a due item off the fake clock, so it never runs. */
  function unschedule(item: DueItem): void {
    due.splice(due.indexOf(item), 1)
  }

  /** Intent: once the generator is idle, start the next waiting job, as soon as it is free. */
  function startNext(): void {
    const job = waiting.shift()
    if (job === undefined) return
    const startAt = Math.max(clock.at, generatorFreeAt)
    job.record.startedAt = startAt
    current = { job, answer: schedule(startAt + job.cost, () => finish(job)) }
  }

  /** Intent: answer the current job as the script says, then move on to the next one. */
  function finish(job: GeneratorJob): void {
    current = undefined
    generatorFreeAt = clock.at
    job.record.answeredAt = clock.at
    if (job.answer === 'crash')
      job.reject(new GenerationWorkerCrashError('Error', 'injected crash'))
    else job.resolve(job.generated === undefined ? failureOutcome() : job.generated.outcome)
    startNext()
  }

  /**
   * Intent: cancel a job, never answering it. The job the generator runs frees it at the cancel
   * plus the worker's restart cost; a job not started yet (still waiting, or waiting for a restart
   * to end) leaves at no cost; a job already answered or cancelled is left alone.
   */
  function cancel(job: GeneratorJob): void {
    if (current?.job === job) {
      unschedule(current.answer)
      current = undefined
      if (job.record.startedAt! <= clock.at) generatorFreeAt = clock.at + WORKER_RESPAWN_SECONDS
    } else if (waiting.includes(job)) waiting.splice(waiting.indexOf(job), 1)
    else return
    job.record.cancelledAt = clock.at
    job.reject(new GenerationCancelledError())
    if (current === undefined) startNext()
  }

  /**
   * Intent: hand one attempt to the serial generator, answered as the script says once the
   * generator has spent its cost on it, unless its signal cancels it first.
   */
  function generate(intent: GenerationIntent, signal?: AbortSignal): Promise<GenerationOutcome> {
    const request = latestRequest!
    const answer = script(request)
    const generated = answer === 'generate' ? outcomes.of(intent) : undefined
    return new Promise((resolve, reject) => {
      const record: OpenGeneratorRecord = {
        attemptId: request.attemptId,
        phraseNumber: request.phraseNumber,
        step: request.step,
        requestedAt: clock.at,
        startedAt: undefined,
        answeredAt: undefined,
        cancelledAt: undefined,
      }
      generations.push(record)
      const cost = attemptCost(generated, request)
      const job: GeneratorJob = { request, answer, generated, cost, resolve, reject, record }
      waiting.push(job)
      signal?.addEventListener('abort', () => cancel(job), { once: true })
      if (current === undefined) startNext()
    })
  }

  const runner = createSessionRunner(
    {
      generate,
      checkFit: writtenPhraseFits,
      now: () => clock.at,
      providers,
      viewport,
      display: UNREAD_DISPLAY,
      onOutput: (output) => {
        outputs.push({ at: clock.at, output })
        if (output.kind === 'request-generation') latestRequest = output
        if (output.kind === 'wake-at')
          schedule(output.at, () => runner.dispatch({ kind: 'tick', at: output.at }))
      },
      onError: (error) => errors.push(error),
    },
    { at: 0, ...start, adaptiveTempo: false, readyPhrases },
  )
  for (const event of transportEvents(tempo, SWEEP_PHRASE_COUNT))
    schedule(event.at, () => runner.dispatch(event))
  await drainContinuations()
  for (let item = due.shift(); item !== undefined; item = due.shift()) {
    clock.at = item.at
    try {
      item.run()
    } catch (error) {
      errors.push(error)
      break
    }
    await drainContinuations()
  }
  return { tempo, outputs, generations, errors }
}

/**
 * Intent: the deadline the session's schedule gives phrase N (2 or more) in a session started at 0
 * at a constant tempo: the end of the count-in for phrase 2, otherwise the start of the previous
 * phrase's last measure.
 */
function scheduledDeadline(phraseNumber: number, tempo: number): AudioTime {
  return phraseNumber === 2
    ? phraseTwoDeadline(0, tempo)
    : nextPhraseDeadline(soundingAt(phraseNumber - 1, tempo), tempo)
}

/** What became of one phrase slot after phrase 1 in a timed run. */
interface PhraseSlot {
  readonly phraseNumber: number
  /**
   * Its deadline, as every request for it carried; for a phrase spent from the ready phrases, never
   * requested, the one the session's schedule gives it.
   */
  readonly deadline: AudioTime
  /** How many attempts were requested for it. */
  readonly attempts: number
  /** How it was decided, and when; undefined when it never was. */
  readonly decided: { readonly origin: string; readonly at: AudioTime } | undefined
  /** When it started sounding; undefined when it never did. */
  readonly soundingAt: AudioTime | undefined
}

/** Intent: the slots of phrases 2 to `SWEEP_PHRASE_COUNT` of a timed run, in order. */
export function phraseSlots(run: TimedSession): readonly PhraseSlot[] {
  return Array.from({ length: SWEEP_PHRASE_COUNT - 1 }, (_, offset) => offset + 2).map(
    (phraseNumber): PhraseSlot => {
      const requests = run.outputs.filter(
        ({ output }) =>
          output.kind === 'request-generation' && output.phraseNumber === phraseNumber,
      )
      const ready = run.outputs.find(
        ({ output }) =>
          output.kind === 'phrase-ready' && output.phrase.phraseNumber === phraseNumber,
      )
      const sounding = run.outputs.find(
        ({ output }) =>
          output.kind === 'phrase-sounding' && output.phrase.phraseNumber === phraseNumber,
      )
      const last = requests.at(-1)?.output
      return {
        phraseNumber,
        deadline:
          last?.kind === 'request-generation'
            ? last.deadline
            : scheduledDeadline(phraseNumber, run.tempo),
        attempts: requests.length,
        decided:
          ready?.output.kind === 'phrase-ready'
            ? { origin: ready.output.phrase.origin, at: ready.at }
            : undefined,
        soundingAt: sounding?.at,
      }
    },
  )
}

/** Intent: the struggling-notice changes of a timed run, each with its time. */
export function noticeChanges(
  run: TimedSession,
): readonly { readonly visible: boolean; readonly at: AudioTime }[] {
  return run.outputs.flatMap(({ at, output }) =>
    output.kind === 'struggling-notice' ? [{ visible: output.visible, at }] : [],
  )
}

/** Intent: how many phrases the run's end reported as sounded, or undefined with no end. */
function soundedAtEnd(run: TimedSession): number | undefined {
  const ended = run.outputs.find(({ output }) => output.kind === 'ended')?.output
  return ended?.kind === 'ended' ? ended.soundedPhraseCount : undefined
}

/**
 * Intent: every way a run broke the session's guarantees, as readable lines (none when it held):
 * a runner or engine error, a phrase slot never decided, a generated phrase not ready strictly
 * before its deadline, a repeat decided anywhere but at its deadline, a phrase not sounding on the
 * grid, or a session that did not reach its planned end.
 */
export function sessionBreaks(sweepCase: SweepCase, run: TimedSession): readonly string[] {
  const where = `${sweepCase.label} at ${run.tempo} BPM`
  const breaks = run.errors.map((error) => `${where}: error ${String(error)}`)
  for (const slot of phraseSlots(run)) {
    const phrase = `${where}: phrase ${slot.phraseNumber}`
    if (slot.decided === undefined) breaks.push(`${phrase} never decided`)
    else if (slot.decided.origin === 'repeat' && slot.decided.at !== slot.deadline)
      breaks.push(`${phrase} repeated at ${slot.decided.at} s, deadline ${slot.deadline} s`)
    else if (slot.decided.origin !== 'repeat' && !(slot.decided.at < slot.deadline))
      breaks.push(`${phrase} ready at ${slot.decided.at} s, deadline ${slot.deadline} s`)
    if (slot.soundingAt !== soundingAt(slot.phraseNumber, run.tempo))
      breaks.push(`${phrase} sounded at ${slot.soundingAt} s`)
  }
  const sounded = soundedAtEnd(run)
  if (sounded !== SWEEP_PHRASE_COUNT) breaks.push(`${where}: ended with ${sounded} phrases sounded`)
  return breaks
}
