/**
 * The validators of the harmony a kept phrase stores beside its timeline, the one its chord symbols
 * are drawn from, and the list of refusals every kept-session validator throws. A harmony is read
 * back into exactly the candidate the generator chose, or refused: a missing, extra, ill-typed or
 * out-of-range field anywhere throws, and nothing is ever repaired, defaulted or partly read. The
 * generation intent's readers live in `kept-intent-parsers.ts`.
 *
 * Pure: no storage access. The kept-session codec calls these and reports any refusal as an
 * unreadable record.
 */

import {
  GenerationControlError,
  TENSION_ARCS,
  validateControlValue,
} from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import {
  QuantizedDoodleParseError,
  QuantizedDoodleViolation,
} from '@/domain/doodle/quantized-doodle'
import { ConcertPitchError } from '@/domain/events/concert-pitch'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { FigureLevelsError } from '@/domain/figures/figure-levels'
import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import { GenerationRequestError } from '@/domain/generation/generation-request'
import { RequestRhythmLockError } from '@/domain/generation/request-rhythm-lock'
import { SteeringBlockError } from '@/domain/generation/steering-block'
import type {
  AbstractTensionRequirement,
  BarRole,
  CollectionDegree,
  DiatonicTriad,
  HarmonyCandidate,
  HarmonyEndpoint,
  HarmonyEvent,
  HarmonyRole,
  PitchClassNumber,
  TensionFigureKind,
  TriadQuality,
} from '@/domain/harmony/harmony-types'
import { InstrumentProfileParseError } from '@/domain/profile/instrument-profile'
import { TimelineParseError } from '@/domain/events/timeline-parser'
import { SeedConstructionError } from '@/domain/random/seed'

import {
  anyArray,
  exactRecord,
  integerIn,
  KeptRecordError,
  member,
  nonEmptyArray,
  nonEmptyString,
  oneOfNumbers,
  type Catalog,
} from './kept-record-shape'
import { parseStoredProfileSelection } from './profile-to-levels'

export { KeptRecordError }

/**
 * Every error a kept-session validator throws for an invalid stored value: these validators',
 * the domain parsers' they call (the rhythm lock group's, the steering block's and the quantized
 * doodle's among them), and those of the timeline and concert-pitch parsers the codec reads a
 * phrase's timeline and its played notes with.
 */
const REFUSALS: readonly (abstract new (message: string) => Error)[] = [
  KeptRecordError,
  GenerationRequestError,
  SeedConstructionError,
  GenerationControlError,
  InstrumentProfileParseError,
  CarryInError,
  FigureLevelsError,
  TimelineParseError,
  ConcertPitchError,
  RequestRhythmLockError,
  SteeringBlockError,
  QuantizedDoodleParseError,
  QuantizedDoodleViolation,
]

/**
 * Intent: whether an error is one of the refusals the kept-session validators and parsers throw
 * for an invalid stored value, which the codec reports as unreadable. Any other error is a defect
 * and must surface.
 */
// @spec-link [[module_kept_session_codec]]
export function isKeptPhraseRefusal(error: unknown): boolean {
  return REFUSALS.some((refusal) => error instanceof refusal)
}

const HARMONY_ROLES: Catalog<HarmonyRole> = {
  tonic: true,
  tonic_prolongation: true,
  predominant: true,
  open_arrival: true,
  modal_color: true,
}
const TRIAD_QUALITIES: Catalog<TriadQuality> = { major: true, minor: true, diminished: true }
const ENDPOINT_KINDS: Catalog<HarmonyEndpoint['kind']> = {
  tonal_degree_five_chord_tone: true,
  tonal_static_degree_five: true,
  modal_non_tonic_chord_tone: true,
}
const FIGURE_KINDS: Catalog<TensionFigureKind> = {
  diatonic_passing_or_neighbor: true,
  appoggiatura: true,
  two_note_diatonic_approach: true,
}
const RESOLUTION_DELAYS: Catalog<AbstractTensionRequirement['maximumResolutionDelay']> = {
  next_strong_sounding_onset: true,
  next_beat_or_bar: true,
}
const RESOLUTION_PREFERENCES: Catalog<AbstractTensionRequirement['resolutionPreference']> = {
  ordinary: true,
  latest_legal_before_final: true,
}

const BAR_INDICES = [0, 1, 2, 3] as const satisfies readonly HarmonyEvent['barIndex'][]
const START_BEATS = [0, 2] as const satisfies readonly HarmonyEvent['startBeat'][]
const FIGURE_BARS = [
  0, 1, 2,
] as const satisfies readonly AbstractTensionRequirement['allowedBars'][number][]
const REQUIRED_FIGURE_COUNTS = [
  0, 1,
] as const satisfies readonly AbstractTensionRequirement['requiredFigureCount'][]

/** Intent: a stored scale degree of the collection, 1 to 7. */
function parseDegree(value: unknown, context: string): CollectionDegree {
  return integerIn(value, 1, 7, context) as CollectionDegree
}

/** Intent: a stored triad: its degree, three distinct pitch classes 0 to 11 and its quality. */
function parseTriad(value: unknown, context: string): DiatonicTriad {
  const record = exactRecord(value, ['degree', 'pitchClasses', 'quality'], context)
  const stored = anyArray(record.pitchClasses, `${context}.pitchClasses`)
  if (stored.length !== 3) throw new KeptRecordError(`${context}.pitchClasses must hold three.`)
  const pitchClasses = stored.map(
    (pc) => integerIn(pc, 0, 11, `${context}.pitchClasses`) as PitchClassNumber,
  )
  if (new Set(pitchClasses).size !== 3)
    throw new KeptRecordError(`${context}.pitchClasses must be three distinct pitch classes.`)
  return {
    degree: parseDegree(record.degree, `${context}.degree`),
    pitchClasses: pitchClasses as unknown as DiatonicTriad['pitchClasses'],
    quality: member(TRIAD_QUALITIES, record.quality, `${context}.quality`),
  }
}

/** Intent: a stored bar role: its bar, its harmonic role and its degree. */
function parseBarRole(value: unknown, context: string): BarRole {
  const record = exactRecord(value, ['barIndex', 'role', 'degree'], context)
  return {
    barIndex: oneOfNumbers(record.barIndex, BAR_INDICES, `${context}.barIndex`),
    role: member(HARMONY_ROLES, record.role, `${context}.role`),
    degree: parseDegree(record.degree, `${context}.degree`),
  }
}

/** Intent: one stored harmony event, on a bar and half-bar, lasting a positive even beat count. */
function parseHarmonyEvent(value: unknown, context: string): HarmonyEvent {
  const record = exactRecord(
    value,
    ['barIndex', 'startBeat', 'durationBeats', 'triad', 'role', 'templateId', 'barRoles'],
    context,
  )
  const { durationBeats } = record
  if (typeof durationBeats !== 'number' || !Number.isInteger(durationBeats))
    throw new KeptRecordError(`${context}.durationBeats must be a whole number.`)
  if (durationBeats <= 0 || durationBeats % 2 !== 0)
    throw new KeptRecordError(`${context}.durationBeats must be a positive even beat count.`)
  const barRoles = nonEmptyArray(record.barRoles, `${context}.barRoles`)
  return {
    barIndex: oneOfNumbers(record.barIndex, BAR_INDICES, `${context}.barIndex`),
    startBeat: oneOfNumbers(record.startBeat, START_BEATS, `${context}.startBeat`),
    durationBeats,
    triad: parseTriad(record.triad, `${context}.triad`),
    role: member(HARMONY_ROLES, record.role, `${context}.role`),
    templateId: nonEmptyString(record.templateId, `${context}.templateId`),
    barRoles: barRoles.map((role, index) => parseBarRole(role, `${context}.barRoles[${index}]`)),
  }
}

/** Intent: the stored endpoint class: one of the three kinds, always on degree 5. */
function parseEndpoint(value: unknown): HarmonyEndpoint {
  const record = exactRecord(value, ['kind', 'degree'], 'Kept harmony.endpoint')
  if (record.degree !== 5) throw new KeptRecordError('Kept harmony.endpoint.degree must be 5.')
  return { kind: member(ENDPOINT_KINDS, record.kind, 'Kept harmony.endpoint.kind'), degree: 5 }
}

/** Intent: the stored abstract tension requirement, every field as the domain type allows. */
function parseTensionRequirement(value: unknown): AbstractTensionRequirement {
  const context = 'Kept harmony.tensionRequirement'
  const record = exactRecord(
    value,
    [
      'arc',
      'allowedBars',
      'maximumResolutionDelay',
      'permittedFigureKinds',
      'requiredFigureCount',
      'maximumFigureCount',
      'resolutionPreference',
      'mustResolveBeforeFinalSoundingEvent',
    ],
    context,
  )
  if (record.maximumFigureCount !== 1)
    throw new KeptRecordError(`${context}.maximumFigureCount must be 1.`)
  if (record.mustResolveBeforeFinalSoundingEvent !== true)
    throw new KeptRecordError(`${context}.mustResolveBeforeFinalSoundingEvent must be true.`)
  return {
    arc: validateControlValue(TENSION_ARCS, record.arc, 'Kept harmony tension arc'),
    allowedBars: anyArray(record.allowedBars, `${context}.allowedBars`).map((bar) =>
      oneOfNumbers(bar, FIGURE_BARS, `${context}.allowedBars`),
    ),
    maximumResolutionDelay: member(
      RESOLUTION_DELAYS,
      record.maximumResolutionDelay,
      `${context}.maximumResolutionDelay`,
    ),
    permittedFigureKinds: anyArray(
      record.permittedFigureKinds,
      `${context}.permittedFigureKinds`,
    ).map((kind) => member(FIGURE_KINDS, kind, `${context}.permittedFigureKinds`)),
    requiredFigureCount: oneOfNumbers(
      record.requiredFigureCount,
      REQUIRED_FIGURE_COUNTS,
      `${context}.requiredFigureCount`,
    ),
    maximumFigureCount: 1,
    resolutionPreference: member(
      RESOLUTION_PREFERENCES,
      record.resolutionPreference,
      `${context}.resolutionPreference`,
    ),
    mustResolveBeforeFinalSoundingEvent: true,
  }
}

/**
 * Intent: read a kept phrase's stored harmony, the one its chord symbols and backing are drawn
 * from, back into the harmony candidate the generator chose: every field checked, with exactly
 * the candidate's keys at every level. Returns a fresh deep-frozen candidate, never the stored
 * value; throws a KeptRecordError (or the tension arc's GenerationControlError) for anything
 * invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptHarmony(input: unknown): HarmonyCandidate {
  const record = exactRecord(
    input,
    [
      'candidateIndex',
      'identity',
      'templateId',
      'degreeSequence',
      'events',
      'endpoint',
      'tensionRequirement',
    ],
    'Kept harmony',
  )
  return deepFreeze({
    candidateIndex: integerIn(
      record.candidateIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      'Kept harmony.candidateIndex',
    ),
    identity: nonEmptyString(record.identity, 'Kept harmony.identity'),
    templateId: nonEmptyString(record.templateId, 'Kept harmony.templateId'),
    degreeSequence: nonEmptyArray(record.degreeSequence, 'Kept harmony.degreeSequence').map(
      (degree) => parseDegree(degree, 'Kept harmony.degreeSequence'),
    ),
    events: nonEmptyArray(record.events, 'Kept harmony.events').map((event, index) =>
      parseHarmonyEvent(event, `Kept harmony.events[${index}]`),
    ),
    endpoint: parseEndpoint(record.endpoint),
    tensionRequirement: parseTensionRequirement(record.tensionRequirement),
  })
}

/**
 * Intent: a stored musical profile selection: exactly a known profile and a boolean, as a v3.0
 * intent and a kept session's session-wide record hold it, read by storage's profile-to-levels
 * module.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptProfileSelection(value: unknown, context: string): ProfileSelection {
  return parseStoredProfileSelection(value, context)
}
