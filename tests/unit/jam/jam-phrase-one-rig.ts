/**
 * The Jam's way to phrase 1 on a fake clock: the real phrase 1 ladder (createJamPhraseOne) over a
 * real capture (createJamCapture), and a real session engine started without phrase 1, wired as
 * Jam's code wires them, with a held-generation double. Phrases 2 onward start sounding whole
 * phrases after phrase 1, once ready. Each generation request is answered after the
 * time its script gives, with the real outcome of its intent, a failure code or a crash; a
 * cancelled one never answers. Fit checks answer at once (fitting unless the script says not). A
 * run is a discrete-event simulation over the doodle's notes, the generation answers and the
 * decision times the capture and the ladder ask for; no real time passes.
 */
import { beatAt, createClickPlan, type ClickPlan } from '@/audio/click-track'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import type { Seed } from '@/domain/random/seed'
import { createJamCapture, type JamCaptureOutput } from '@/jam/jam-capture'
import { barlineAt } from '@/jam/jam-phase'
import { createJamPhraseOne, type JamPhraseOneOutput } from '@/jam/jam-phrase-one'
import type { JamPhraseOneAttemptIndex } from '@/jam/jam-phrase-one-attempts'
import type { JamDrift } from '@/jam/steering-block-builder'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import { createSessionEngine } from '@/session/session-engine'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import { PHRASE_MEASURE_COUNT } from '@/domain/generation/generation-request-envelope'
import { measureSeconds } from '@/session/session-timing'
import type {
  AudioTime,
  SessionEngine,
  SessionEvent,
  SessionOutput,
  SessionSettings,
} from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  DEFAULT_SESSION_SEED,
  failureOutcome,
  fakeDisplay,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
  type GenerationRequestOutput,
} from '../session/session-harness'

/** When the rig's count-in starts. */
export const RIG_START_AT = 10

/** One scripted note: its pitch, onset and release, in beats from the count-in's end. */
export type BeatNote = readonly [pitch: number, onsetBeat: number, lengthBeats: number]

/** How the double answers one generation request: after `after` seconds, with what. */
export interface GenerationPlan {
  readonly after: number
  readonly answer: 'real' | 'crash' | GenerationFailureCode
  readonly fits?: boolean
}

/** What one Jam run is played with. */
export interface JamRunOptions {
  readonly tempo: number
  readonly doodle: readonly BeatNote[]
  readonly until: AudioTime
  readonly settings?: SessionSettings
  readonly drift?: JamDrift
  readonly sessionSeed?: Seed
  /** Whether the window is below the tablet-landscape width, read at each request. */
  readonly below?: () => boolean
  /** The double's answer to each request; instant and real by default. */
  readonly generate?: (request: GenerationRequestOutput, at: AudioTime) => GenerationPlan
}

/** One request the engine made, with when it was made. */
export interface TimedRequest {
  readonly at: AudioTime
  readonly request: GenerationRequestOutput
}

/** Everything a run produced, each with its time. */
export interface JamRun {
  readonly plan: ClickPlan
  readonly countInEndsAt: AudioTime
  readonly measure: number
  readonly requests: readonly TimedRequest[]
  readonly engine: readonly { readonly at: AudioTime; readonly output: SessionOutput }[]
  readonly capture: readonly JamCaptureOutput[]
  readonly ladder: readonly JamPhraseOneOutput[]
  readonly seedsAsked: readonly JamPhraseOneAttemptIndex[]
}

/** Intent: the time of beat `beat` after the count-in's end, on the click plan's own grid. */
function beatTime(plan: ClickPlan, beat: number): AudioTime {
  const whole = Math.floor(beat)
  const at = beatAt(plan, plan.countInBeats + whole)
  return beat === whole
    ? at
    : at + (beat - whole) * (beatAt(plan, plan.countInBeats + whole + 1) - at)
}

/** Intent: the doodle's note-on and note-off events on the clock, in time order. */
function noteEvents(notes: readonly BeatNote[], plan: ClickPlan): PlayedNoteEvent[] {
  const timed: { at: number; order: number; event: PlayedNoteEvent }[] = []
  for (const [pitch, onsetBeat, lengthBeats] of notes) {
    const onsetAt = beatTime(plan, onsetBeat)
    const releaseAt = beatTime(plan, onsetBeat + lengthBeats)
    const note = { pitch: makeConcertPitch(pitch), velocity: 80, onsetAt }
    timed.push({ at: onsetAt, order: 1, event: { kind: 'played', note } })
    timed.push({ at: releaseAt, order: 0, event: { kind: 'ended', note: { ...note, releaseAt } } })
  }
  return timed.sort((a, b) => a.at - b.at || a.order - b.order).map((entry) => entry.event)
}

/** Intent: barline `k` of a run, 0 at the count-in's end, as the capture's grid places it. */
export function rigBarline(run: JamRun, k: number): AudioTime {
  return barlineAt(run.plan, k)
}

/** A queued item of the simulation: a note, a generation answer, a fit answer, phrase 1 sounding. */
interface Queued {
  readonly at: AudioTime
  readonly run: () => void
  readonly attemptId?: number
}

/**
 * Intent: play one fresh Jam from its count-in to `until`: the doodle's notes into the capture,
 * the capture's outputs into the ladder, the ladder's session events into the engine, the engine's
 * phrase 1 outputs back into the ladder, ready into the capture, a missed deadline into the
 * engine's end, and phrase 1's sounding time into `count-in-over`. Seeds come from the session
 * seed plan's labels for phrase 1.
 */
export function runJam(options: JamRunOptions): JamRun {
  const { tempo } = options
  const settings = options.settings ?? sessionSettings({ tempo })
  const sessionSeed = options.sessionSeed ?? DEFAULT_SESSION_SEED
  const providers = queuedProviders()
  const engine: SessionEngine = createSessionEngine(
    {
      providers,
      viewport: { isBelowTabletLandscape: () => options.below?.() ?? false },
      display: fakeDisplay(),
    },
    {
      at: RIG_START_AT,
      settings,
      sessionSeed,
      mutation: SETTINGS_MUTATION_OFF,
      adaptiveTempo: false,
      multiPhraseTensionArc: false,
    },
  )
  const capture = createJamCapture({ startAt: RIG_START_AT, tempo })
  const seedsAsked: JamPhraseOneAttemptIndex[] = []
  const ladder = createJamPhraseOne(
    {
      nextRequestId: providers.nextRequestId,
      seedOf: (index) => {
        seedsAsked.push(index)
        return jamPhraseOneSeed(sessionSeed, index)
      },
      isBelowTabletLandscape: () => options.below?.() ?? false,
    },
    { settings, drift: options.drift ?? 'Near' },
    capture,
  )
  const measure = measureSeconds(tempo)
  const plan = createClickPlan(RIG_START_AT, tempo)
  const countInEndsAt = barlineAt(plan, 0)
  const log = {
    requests: [] as TimedRequest[],
    engine: [] as { at: AudioTime; output: SessionOutput }[],
    capture: [] as JamCaptureOutput[],
    ladder: [] as JamPhraseOneOutput[],
  }
  let queue: Queued[] = noteEvents(options.doodle, plan).map((event) => ({
    at: event.kind === 'played' ? event.note.onsetAt : event.note.releaseAt,
    run: () => fromLadder(ladder.note(event)),
  }))
  const generate = options.generate ?? ((): GenerationPlan => ({ after: 0, answer: 'real' }))
  let now = RIG_START_AT
  /** When phrase 1 sounds, once shown; later phrases sound whole phrases after it. */
  let soundingAt = Infinity

  function enqueue(item: Queued): void {
    queue = [...queue, item]
  }

  function toEngine(event: SessionEvent): void {
    for (const output of engine.handle(event)) fromEngine(output, event.at)
  }

  function fromEngine(output: SessionOutput, at: AudioTime): void {
    log.engine.push({ at, output })
    if (output.kind === 'request-generation') {
      log.requests.push({ at, request: output })
      const plan = generate(output, at)
      const { attemptId, intent } = output
      const answerAt = at + plan.after
      enqueue({
        at: answerAt,
        attemptId,
        run: () => {
          if (plan.answer === 'crash')
            return toEngine({ kind: 'generation-crashed', at: answerAt, attemptId })
          const outcome =
            plan.answer === 'real' ? realOutcomeFor(intent) : failureOutcome(plan.answer)
          toEngine({ kind: 'generation-result', at: answerAt, attemptId, outcome })
          if (outcome.kind === 'generation_success')
            enqueue({
              at: answerAt,
              run: () =>
                toEngine({ kind: 'fit-result', at: answerAt, attemptId, fits: plan.fits ?? true }),
            })
        },
      })
    } else if (output.kind === 'phrase-ready' && output.phrase.phraseNumber >= 2) {
      const { phraseNumber } = output.phrase
      const soundsAt = soundingAt + (phraseNumber - 1) * PHRASE_MEASURE_COUNT * measure
      enqueue({
        at: soundsAt,
        run: () => toEngine({ kind: 'phrase-started-sounding', at: soundsAt, phraseNumber }),
      })
    } else if (output.kind === 'cancel-generation') {
      queue = queue.filter((item) => item.attemptId !== output.attemptId)
    }
    fromLadder(ladder.session(output, at))
  }

  function fromLadder(outputs: readonly JamPhraseOneOutput[]): void {
    for (const output of outputs) {
      log.ladder.push(output)
      if (output.kind === 'session-event') toEngine(output.event)
      else if (output.kind === 'capture') fromCapture(output.output)
      else if (output.kind === 'no-phrase-one')
        toEngine({ kind: 'end', at: output.at, cause: 'no-phrase-one' })
    }
  }

  function fromCapture(output: JamCaptureOutput): void {
    log.capture.push(output)
    if (output.kind === 'no-note-played')
      toEngine({ kind: 'end', at: output.at, cause: 'no-note-played' })
    if (output.kind === 'phrase-one-shown') soundingAt = output.soundsAt
    if (output.kind === 'phrase-one-shown')
      enqueue({
        at: output.soundsAt,
        run: () => toEngine({ kind: 'count-in-over', at: output.soundsAt }),
      })
  }

  for (;;) {
    const times = [...queue.map((item) => item.at), ladder.nextDecisionAt() ?? Infinity]
    const next = Math.max(now, Math.min(...times))
    if (!(next <= options.until)) break
    now = next
    const due = queue.find((item) => item.at <= now)
    if (due !== undefined) {
      queue = queue.filter((item) => item !== due)
      due.run()
      continue
    }
    fromLadder(ladder.advance(now))
  }
  return { plan, countInEndsAt, measure, ...log, seedsAsked }
}

/** Intent: the requests of phrase 1, in order. */
export function phraseOneRequests(run: JamRun): readonly TimedRequest[] {
  return run.requests.filter((entry) => entry.request.phraseNumber === 1)
}

/** Intent: the engine outputs of one kind, with their times. */
export function engineOutputs<K extends SessionOutput['kind']>(
  run: JamRun,
  kind: K,
): readonly { readonly at: AudioTime; readonly output: Extract<SessionOutput, { kind: K }> }[] {
  return run.engine.filter(
    (entry): entry is { at: AudioTime; output: Extract<SessionOutput, { kind: K }> } =>
      entry.output.kind === kind,
  )
}
