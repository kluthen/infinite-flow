/**
 * The validators of what a kept phrase stores beside its timeline: the harmony its chord symbols
 * are drawn from and the generation intent it was generated from. Each reads a stored value back
 * into exactly the value the generator produced, or refuses it: a missing, extra, ill-typed or
 * out-of-range field anywhere throws, and nothing is ever repaired, defaulted or partly read.
 *
 * Every field is checked by the domain's own parser or validator where one exists; what no domain
 * parser covers (a whole harmony, an intent's outer shape, its register intent) is checked here
 * against the domain types. An intent's instrument profile is read from the data it holds, never
 * looked up or rebuilt from its id, so a kept My instrument phrase reads back as it was played.
 *
 * Pure: no storage access. The kept-session codec calls these and reports any refusal as an
 * unreadable record.
 */

import {
  GenerationControlError,
  makeGenerationControls,
  MUSICAL_PROFILES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  TENSION_ARCS,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { ConcertPitchError } from '@/domain/events/concert-pitch'
import { deepEqual } from '@/domain/events/deep-equal'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { CarryInError, parseCarryIn } from '@/domain/generation/carry-in/carry-in'
import {
  writtenToConcertTonalCenter,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import {
  GenerationRequestError,
  parseMeter,
  parseRequestId,
  PHRASE_MEASURE_COUNT,
} from '@/domain/generation/generation-request'
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
import {
  InstrumentProfileParseError,
  parseInstrumentProfile,
  type InstrumentProfile,
} from '@/domain/profile/instrument-profile'
import { CANONICAL_REGISTER_ORDER, type RegisterId } from '@/domain/profile/register-id'
import { buildRegisterIntent, type RegisterIntent } from '@/domain/profile/register-intent'
import {
  REGISTER_WINDOW_ALGORITHM_V1,
  type RegisterWindowCandidate,
} from '@/domain/profile/register-window-derivation'
import { TimelineParseError } from '@/domain/events/timeline-parser'
import { makeSeed, SeedConstructionError, type Seed } from '@/domain/random/seed'

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

export { KeptRecordError }

/**
 * Every error a kept-session validator throws for an invalid stored value: these validators',
 * the domain parsers' they call, and those of the timeline and concert-pitch parsers the codec
 * reads a phrase's timeline and its played notes with.
 */
const REFUSALS: readonly (abstract new (message: string) => Error)[] = [
  KeptRecordError,
  GenerationRequestError,
  SeedConstructionError,
  GenerationControlError,
  InstrumentProfileParseError,
  CarryInError,
  TimelineParseError,
  ConcertPitchError,
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

const CONTROL_FIELDS: Catalog<keyof GenerationControls> = {
  tempo: true,
  tonalCenter: true,
  collection: true,
  harmonicMotion: true,
  tension: true,
  noteDensity: true,
  rhythmicVariety: true,
  syncopation: true,
  silenceDensity: true,
  contour: true,
  register: true,
  leapiness: true,
  arpeggioChaos: true,
  instrumentProfileId: true,
}

/**
 * Intent: the stored controls, exactly the control fields, each through the strict control
 * builder, which refuses any value the controls do not offer.
 */
function parseControls(value: unknown): GenerationControls {
  const record = exactRecord(value, Object.keys(CONTROL_FIELDS), 'Kept intent.controls')
  return makeGenerationControls(record as unknown as GenerationControls)
}

/** Intent: the stored seed, a number the domain's seed maker accepts as a 32-bit unsigned seed. */
function parseStoredSeed(value: unknown): Seed {
  if (typeof value !== 'number') throw new KeptRecordError('Kept intent.seed must be a number.')
  return makeSeed(value)
}

/**
 * Intent: a stored musical profile selection: exactly a known profile and a boolean, as an intent
 * and a kept session's session-wide record hold it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptProfileSelection(value: unknown, context: string): ProfileSelection {
  const record = exactRecord(value, ['musicalProfile', 'isCustom'], context)
  const musicalProfile = MUSICAL_PROFILES.find((profile) => profile === record.musicalProfile)
  if (musicalProfile === undefined)
    throw new KeptRecordError(`${context}.musicalProfile is unknown.`)
  if (typeof record.isCustom !== 'boolean')
    throw new KeptRecordError(`${context}.isCustom must be a boolean.`)
  return { musicalProfile, isCustom: record.isCustom }
}

/**
 * Intent: the instrument profile from the data the intent holds, never from its id: its own
 * `kind` tags checked here, every other field through the domain's profile parser, which
 * re-validates the range, the register-window policy and the transposition.
 */
function parseStoredProfile(value: unknown): InstrumentProfile {
  const context = 'Kept intent.instrumentProfile'
  const record = exactRecord(
    value,
    ['kind', 'id', 'displayName', 'concertRange', 'registerWindows', 'transposition'],
    context,
  )
  if (record.kind !== 'InstrumentProfile')
    throw new KeptRecordError(`${context}.kind must be "InstrumentProfile".`)
  const range = exactRecord(
    record.concertRange,
    ['kind', 'minMidi', 'maxMidi'],
    `${context}.concertRange`,
  )
  if (range.kind !== 'ActiveConcertRange')
    throw new KeptRecordError(`${context}.concertRange.kind must be "ActiveConcertRange".`)
  return parseInstrumentProfile({
    id: record.id,
    displayName: record.displayName,
    concertRange: { minMidi: range.minMidi, maxMidi: range.maxMidi },
    registerWindows: record.registerWindows,
    transposition: record.transposition,
  })
}

/** Intent: a stored MIDI span with its own `kind` tag: a concert range or a register window. */
function parseTaggedSpan<K extends 'ActiveConcertRange' | 'RegisterWindow'>(
  value: unknown,
  kind: K,
  context: string,
): { readonly kind: K; readonly minMidi: number; readonly maxMidi: number } {
  const record = exactRecord(value, ['kind', 'minMidi', 'maxMidi'], context)
  if (record.kind !== kind) throw new KeptRecordError(`${context}.kind must be "${kind}".`)
  return {
    kind,
    minMidi: integerIn(record.minMidi, 0, 127, `${context}.minMidi`),
    maxMidi: integerIn(record.maxMidi, 0, 127, `${context}.maxMidi`),
  }
}

/** Intent: one stored register-window candidate: a register, its index and its window. */
function parseCandidate(value: unknown, context: string): RegisterWindowCandidate {
  const record = exactRecord(value, ['id', 'canonicalIndex', 'window'], context)
  const id = CANONICAL_REGISTER_ORDER.find((register: RegisterId) => register === record.id)
  if (id === undefined) throw new KeptRecordError(`${context}.id is unknown.`)
  return {
    id,
    canonicalIndex: integerIn(record.canonicalIndex, 0, 2, `${context}.canonicalIndex`),
    window: parseTaggedSpan(record.window, 'RegisterWindow', `${context}.window`),
  }
}

/**
 * Intent: the stored register intent, checked field by field against the RegisterIntent shape,
 * then against what the stored profile's own data and the stored register choice give: a register
 * intent the generator could not have built from them is refused, never replaced.
 */
function parseRegisterIntent(
  value: unknown,
  profile: InstrumentProfile,
  controls: GenerationControls,
): RegisterIntent {
  const context = 'Kept intent.registerIntent'
  const record = exactRecord(
    value,
    ['kind', 'sourceRange', 'requestedRegister', 'candidates', 'policyVersion'],
    context,
  )
  if (record.kind !== 'RegisterIntent')
    throw new KeptRecordError(`${context}.kind must be "RegisterIntent".`)
  if (record.policyVersion !== REGISTER_WINDOW_ALGORITHM_V1)
    throw new KeptRecordError(`${context}.policyVersion must be "${REGISTER_WINDOW_ALGORITHM_V1}".`)
  const registerIntent: RegisterIntent = {
    kind: 'RegisterIntent',
    sourceRange: parseTaggedSpan(
      record.sourceRange,
      'ActiveConcertRange',
      `${context}.sourceRange`,
    ),
    requestedRegister: validateControlValue(
      REGISTER_CHOICES,
      record.requestedRegister,
      'Kept intent requested register',
    ),
    candidates: nonEmptyArray(record.candidates, `${context}.candidates`).map((candidate, index) =>
      parseCandidate(candidate, `${context}.candidates[${index}]`),
    ),
    policyVersion: REGISTER_WINDOW_ALGORITHM_V1,
  }
  if (registerIntent.requestedRegister !== controls.register)
    throw new KeptRecordError(`${context}.requestedRegister is not the controls' register.`)
  if (!deepEqual(registerIntent, buildRegisterIntent(profile, controls.register)))
    throw new KeptRecordError(`${context} is not what the stored instrument profile gives.`)
  return registerIntent
}

/**
 * Intent: refuse an intent whose parts disagree: controls naming another instrument than the
 * profile held, or a concert tonal center that is not the written one transposed for it.
 */
function assertIntentCoherent(
  controls: GenerationControls,
  writtenTonalCenter: GenerationIntent['writtenTonalCenter'],
  profile: InstrumentProfile,
): void {
  if (controls.instrumentProfileId !== profile.id)
    throw new KeptRecordError(
      `Kept intent controls name "${controls.instrumentProfileId}" but its profile is "${profile.id}".`,
    )
  if (controls.tonalCenter !== writtenToConcertTonalCenter(writtenTonalCenter, profile))
    throw new KeptRecordError(
      'Kept intent concert tonal center is not its written tonal center transposed.',
    )
}

const INTENT_FIELDS = [
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'musicalProfile',
  'instrumentProfile',
  'registerIntent',
] as const

/**
 * Intent: read a kept phrase's stored generation intent back into the intent it was generated
 * from, without rebuilding it: each field through the domain's own parser (request id, seed,
 * meter, controls, written tonal center, instrument profile from its stored data, carry-in), the
 * rest against the intent's shape, with exactly its keys (`carryIn` only when one was handed
 * forward), then its parts checked against each other. Returns a fresh deep-frozen intent equal
 * to the one stored; throws a KeptRecordError or the domain parser's own error for anything
 * invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptIntent(input: unknown): GenerationIntent {
  const record = exactRecord(input, INTENT_FIELDS, 'Kept intent', ['carryIn'])
  const requestId = parseRequestId(record.requestId)
  const seed = parseStoredSeed(record.seed)
  if (record.measureCount !== PHRASE_MEASURE_COUNT)
    throw new KeptRecordError(`Kept intent.measureCount must be ${PHRASE_MEASURE_COUNT}.`)
  const meter = parseMeter(record.meter)
  const controls = parseControls(record.controls)
  const writtenTonalCenter = validateControlValue(
    PITCH_CLASSES,
    record.writtenTonalCenter,
    'Kept intent written tonal center',
  )
  const musicalProfile = parseKeptProfileSelection(
    record.musicalProfile,
    'Kept intent.musicalProfile',
  )
  const instrumentProfile = parseStoredProfile(record.instrumentProfile)
  assertIntentCoherent(controls, writtenTonalCenter, instrumentProfile)
  const registerIntent = parseRegisterIntent(record.registerIntent, instrumentProfile, controls)
  const carried = Object.hasOwn(record, 'carryIn') ? { carryIn: parseCarryIn(record.carryIn) } : {}
  return deepFreeze({
    requestId,
    seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter,
    controls,
    writtenTonalCenter,
    musicalProfile,
    instrumentProfile,
    registerIntent,
    ...carried,
  })
}
