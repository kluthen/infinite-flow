/**
 * The headless phrase replay report: the readable JSON account of one replayed phrase key. Its
 * input holds every generation-intent field verbatim plus readable names, the rhythm lock group
 * and the steering block among them (null when the request has none); its output holds, for a
 * successful phrase, the resolved request, the four bars, the harmony, the ending, the carry-out,
 * the provenance, the diagnostics and the raw outcome verbatim; a generation failure keeps its
 * code and diagnostics; a worker crash keeps its error name and message. Readable additions always
 * sit beside the raw values, never in place of them.
 */

import type { GenerationControls, PitchClass } from '../domain/controls/generation-controls'
import type { FigureLevels } from '../domain/figures/figure-levels'
import { deriveCarryIn } from '../domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationRequest, Meter } from '../domain/generation/generation-request'
import type { RequestRhythmLock } from '../domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '../domain/generation/steering-block'
import type {
  GenerationDiagnostics,
  GenerationFailureCode,
  GenerationOutcome,
  GenerationProvenance,
} from '../domain/generation/orchestration/orchestration-types'
import type { HarmonyCandidate } from '../domain/harmony/harmony-types'
import type { WrittenKey } from '../domain/notation/written-phrase-types'
import type { ActiveConcertRange } from '../domain/profile/active-concert-range'
import type { InstrumentProfile } from '../domain/profile/instrument-profile'
import type { RegisterId } from '../domain/profile/register-id'
import type { RegisterIntent } from '../domain/profile/register-intent'
import type { RegisterWindow } from '../domain/profile/register-window'
import { encodeSeed } from '../domain/random/seed'
import type {
  GenerationWorkerRequest,
  GenerationWorkerResponse,
} from './generation-worker-protocol'
import {
  replayBars,
  replayNotation,
  type ReplayBar,
  type ReplayChord,
  type ReplayNoteEvent,
} from './phrase-replay-bars'
import {
  carryInNames,
  keyFor,
  namedRange,
  type CarryInNames,
  type NamedMidiRange,
} from './phrase-replay-names'
import type { DecodedPhraseReplayKey } from './phrase-replay-key-decode'

/** A successful generation outcome. */
type SuccessOutcome = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** The written and concert tonal centers, each beside its spelled key name. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayTonalCenters {
  readonly written: { readonly pitchClass: PitchClass; readonly key: string }
  readonly concert: { readonly pitchClass: PitchClass; readonly key: string }
}

/** One register window candidate of the register intent, with its bounds named. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayRegisterWindowName extends NamedMidiRange {
  readonly register: RegisterId
}

/** Every generation-intent field verbatim, plus readable additions and the replayed envelope. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayInput {
  readonly requestId: string
  readonly seed: number
  /** The seed in its `seed1-` text form. */
  readonly seedCode: string
  readonly measureCount: 4
  readonly meter: Meter
  /** The controls as generation reads them: `tonalCenter` is the concert tonal center. */
  readonly controls: GenerationControls
  readonly writtenTonalCenter: PitchClass
  readonly tonalCenters: ReplayTonalCenters
  /** The seven figure levels by figure id; the intent holds no musical profile. */
  readonly figureLevels: FigureLevels
  readonly instrumentProfile: InstrumentProfile
  readonly instrumentConcertRange: NamedMidiRange
  readonly registerIntent: RegisterIntent
  readonly registerWindows: readonly ReplayRegisterWindowName[]
  /** The carry-in verbatim, or null for a phrase generated without one. */
  readonly carryIn: CarryIn | null
  readonly carryInNames: CarryInNames | null
  /** The rhythm lock group verbatim, or null for a request without one (every key before ifk4). */
  readonly rhythmLock: RequestRhythmLock | null
  /** The steering block verbatim, or null for a request without one (every key before ifk4). */
  readonly steering: SteeringBlock | null
  /** The generation worker envelope replayed (JSON-identical to the clone sent to the worker). */
  readonly workerRequest: GenerationWorkerRequest
}

/** The resolved core request verbatim, with its ranges named and its seed in text form. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayRequest {
  readonly requestId: string
  readonly seed: number
  readonly seedCode: string
  readonly measureCount: 4
  readonly meter: Meter
  readonly activeConcertRange: ActiveConcertRange
  readonly activeConcertRangeNames: NamedMidiRange
  readonly register: RegisterId
  readonly registerWindow: RegisterWindow
  readonly registerWindowNames: NamedMidiRange
  readonly carryIn: CarryIn | null
}

/** The selected harmony candidate's identity, plan and requirements. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayHarmony {
  readonly candidateIndex: number
  readonly identity: string
  readonly templateId: string
  readonly degreeSequence: HarmonyCandidate['degreeSequence']
  readonly endpoint: HarmonyCandidate['endpoint']
  readonly endpointClass: HarmonyCandidate['endpoint']['kind']
  readonly tensionRequirement: HarmonyCandidate['tensionRequirement']
}

/** How the phrase ends: endpoint class, final chord and last sounding (attacked) note. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayEnding {
  readonly endpointClass: HarmonyCandidate['endpoint']['kind']
  readonly endpoint: HarmonyCandidate['endpoint']
  readonly finalChord: ReplayChord & { readonly bar: number }
  /** The last attacked note (a tie continuation repeats its pitch); null when none sounded. */
  readonly lastSoundingNote: (ReplayNoteEvent & { readonly bar: number }) | null
}

/** The carry-in this phrase hands forward, derived with the key's phrase number. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayCarryOut {
  readonly carryIn: CarryIn
  readonly names: CarryInNames
}

/** The output of a replay whose worker answered with a successful phrase. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplaySuccessOutput {
  readonly kind: 'generation_success'
  readonly request: PhraseReplayRequest
  readonly bars: readonly ReplayBar[]
  readonly harmony: PhraseReplayHarmony
  readonly ending: PhraseReplayEnding
  /** Null when the phrase carries nothing forward; `carryOutAbsentReason` then says why. */
  readonly carryOut: PhraseReplayCarryOut | null
  readonly carryOutAbsentReason: string | null
  readonly provenance: GenerationProvenance
  readonly diagnostics: GenerationDiagnostics
  readonly raw: GenerationOutcome
}

/** The output of a replay whose worker answered with a typed generation failure. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayFailureOutput {
  readonly kind: 'generation_failure'
  readonly code: GenerationFailureCode
  readonly diagnostics: GenerationDiagnostics
  readonly raw: GenerationOutcome
}

/** The output of a replay whose worker path crashed. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayCrashOutput {
  readonly kind: 'crash'
  readonly id: number
  readonly name: string
  readonly message: string
}

/** The output section of a replay report. */
// @spec-link [[service_headless_phrase_replay]]
export type PhraseReplayOutput =
  PhraseReplaySuccessOutput | PhraseReplayFailureOutput | PhraseReplayCrashOutput

/** The whole JSON document the replay prints. */
// @spec-link [[service_headless_phrase_replay]]
export interface PhraseReplayReport {
  readonly key: string
  readonly keyVersion: DecodedPhraseReplayKey['keyVersion']
  readonly phraseNumber: number
  readonly input: PhraseReplayInput
  readonly output: PhraseReplayOutput
}

/** Why a phrase that sounded no note carries nothing forward. */
const NO_SOUNDING_NOTE_REASON = 'The phrase sounded no note, so it carries nothing forward.'

/** Intent: the concert key generation used: the concert tonal center in the chosen collection. */
function concertKeyOf(intent: GenerationIntent): WrittenKey {
  return keyFor(intent.controls.tonalCenter, intent.controls.collection)
}

/** Intent: the input section: every intent field verbatim, readable names and the envelope. */
function replayInput(
  intent: GenerationIntent,
  workerRequest: GenerationWorkerRequest,
): PhraseReplayInput {
  const concertKey = concertKeyOf(intent)
  const writtenKey = keyFor(intent.writtenTonalCenter, intent.controls.collection)
  return {
    requestId: intent.requestId,
    seed: intent.seed,
    seedCode: encodeSeed(intent.seed),
    measureCount: intent.measureCount,
    meter: intent.meter,
    controls: intent.controls,
    writtenTonalCenter: intent.writtenTonalCenter,
    tonalCenters: {
      written: { pitchClass: intent.writtenTonalCenter, key: writtenKey.label },
      concert: { pitchClass: intent.controls.tonalCenter, key: concertKey.label },
    },
    figureLevels: intent.figureLevels,
    instrumentProfile: intent.instrumentProfile,
    instrumentConcertRange: namedRange(intent.instrumentProfile.concertRange, concertKey),
    registerIntent: intent.registerIntent,
    registerWindows: intent.registerIntent.candidates.map((candidate) => ({
      register: candidate.id,
      ...namedRange(candidate.window, concertKey),
    })),
    carryIn: intent.carryIn ?? null,
    carryInNames: intent.carryIn === undefined ? null : carryInNames(intent.carryIn, concertKey),
    rhythmLock: intent.rhythmLock ?? null,
    steering: intent.steering ?? null,
    workerRequest,
  }
}

/** Intent: the resolved request verbatim beside its named ranges and text seed. */
function replayRequest(request: GenerationRequest, concertKey: WrittenKey): PhraseReplayRequest {
  return {
    requestId: request.requestId,
    seed: request.seed,
    seedCode: encodeSeed(request.seed),
    measureCount: request.measureCount,
    meter: request.meter,
    activeConcertRange: request.activeConcertRange,
    activeConcertRangeNames: namedRange(request.activeConcertRange, concertKey),
    register: request.register,
    registerWindow: request.registerWindow,
    registerWindowNames: namedRange(request.registerWindow, concertKey),
    carryIn: request.carryIn ?? null,
  }
}

/** Intent: the selected harmony candidate's identity, plan, endpoint and tension requirement. */
function replayHarmony(harmony: HarmonyCandidate): PhraseReplayHarmony {
  return {
    candidateIndex: harmony.candidateIndex,
    identity: harmony.identity,
    templateId: harmony.templateId,
    degreeSequence: harmony.degreeSequence,
    endpoint: harmony.endpoint,
    endpointClass: harmony.endpoint.kind,
    tensionRequirement: harmony.tensionRequirement,
  }
}

/** Intent: the last attacked note across the bars, with its bar number, or null when none. */
function lastAttack(bars: readonly ReplayBar[]): PhraseReplayEnding['lastSoundingNote'] {
  for (const bar of [...bars].reverse()) {
    const note = [...bar.events]
      .reverse()
      .find((event): event is ReplayNoteEvent => event.kind === 'note' && !event.tieContinuation)
    if (note !== undefined) return { ...note, bar: bar.bar }
  }
  return null
}

/** Intent: how the phrase ends: its endpoint, final chord and last sounding note. */
function replayEnding(harmony: HarmonyCandidate, bars: readonly ReplayBar[]): PhraseReplayEnding {
  const finalBar = [...bars].reverse().find((bar) => bar.chords.length > 0)
  const finalChord = finalBar?.chords.at(-1)
  if (finalBar === undefined || finalChord === undefined) {
    throw new RangeError('A successful phrase must carry at least one chord.')
  }
  return {
    endpointClass: harmony.endpoint.kind,
    endpoint: harmony.endpoint,
    finalChord: { ...finalChord, bar: finalBar.bar },
    lastSoundingNote: lastAttack(bars),
  }
}

/**
 * Intent: the carry-out of a successful phrase, derived exactly as the session does with the key's
 * phrase number. A phrase that sounded no note carries nothing, reported as null with its reason;
 * any other carry-in failure propagates.
 */
function replayCarryOut(
  intent: GenerationIntent,
  outcome: SuccessOutcome,
  phraseNumber: number,
  bars: readonly ReplayBar[],
): Pick<PhraseReplaySuccessOutput, 'carryOut' | 'carryOutAbsentReason'> {
  if (lastAttack(bars) === null)
    return { carryOut: null, carryOutAbsentReason: NO_SOUNDING_NOTE_REASON }
  const carryIn = deriveCarryIn({ intent, outcome, phraseNumber })
  return {
    carryOut: { carryIn, names: carryInNames(carryIn, concertKeyOf(intent)) },
    carryOutAbsentReason: null,
  }
}

/** Intent: the output section of a successful phrase. */
function successOutput(
  decoded: DecodedPhraseReplayKey,
  outcome: SuccessOutcome,
): PhraseReplaySuccessOutput {
  const { intent, phraseNumber } = decoded
  const concertKey = concertKeyOf(intent)
  const bars = replayBars(outcome, replayNotation(outcome, intent), concertKey)
  return {
    kind: outcome.kind,
    request: replayRequest(outcome.request, concertKey),
    bars,
    harmony: replayHarmony(outcome.provenance.harmony),
    ending: replayEnding(outcome.provenance.harmony, bars),
    ...replayCarryOut(intent, outcome, phraseNumber, bars),
    provenance: outcome.provenance,
    diagnostics: outcome.diagnostics,
    raw: outcome,
  }
}

/** Intent: the output section for whatever the worker answered. */
function replayOutput(
  decoded: DecodedPhraseReplayKey,
  response: GenerationWorkerResponse,
): PhraseReplayOutput {
  if (response.type === 'crash') {
    return { kind: 'crash', id: response.id, name: response.name, message: response.message }
  }
  const { outcome } = response
  if (outcome.kind === 'generation_failure') {
    return {
      kind: outcome.kind,
      code: outcome.code,
      diagnostics: outcome.diagnostics,
      raw: outcome,
    }
  }
  return successOutput(decoded, outcome)
}

/**
 * Intent: build the full replay report from the key, its decoded intent and phrase number, the
 * envelope replayed and the worker's response. Written pitches and names come only from the
 * notation path; every raw value is kept verbatim beside its readable restatement.
 */
// @spec-link [[service_headless_phrase_replay]]
export function buildPhraseReplayReport(
  key: string,
  decoded: DecodedPhraseReplayKey,
  workerRequest: GenerationWorkerRequest,
  response: GenerationWorkerResponse,
): PhraseReplayReport {
  return {
    key,
    keyVersion: decoded.keyVersion,
    phraseNumber: decoded.phraseNumber,
    input: replayInput(decoded.intent, workerRequest),
    output: replayOutput(decoded, response),
  }
}
