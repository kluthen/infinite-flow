/**
 * The carry-in: the only data that crosses a join into the next generated phrase. A carry-in has
 * an origin. From a phrase (v3.1's carry-in, unchanged in fields and form), exactly four items
 * cross: the last sounding concert pitch with its leap state, the resolved register window, the
 * final harmony event (chord and role) with its endpoint class, and the phrase's ordinal in the
 * session. After a mid-session key or collection change the harmonic part is dropped:
 * `finalHarmony` is then an explicit null, never a missing field. From no phrase (the doodle's
 * join into a Jam's phrase 1), only the doodle's last pitch, reached by no interval and owing no
 * recovery, and the window cross; it holds no chord and no ordinal. Tempo, seeds, settings and
 * every other fact of the phrase stay behind. A carry-in is always constructed valid and
 * deep-frozen, and an untrusted wire value is parsed through the same constructor, rejecting any
 * missing, extra or malformed field.
 */

import { makeConcertPitch, type ConcertPitch } from '../../events/concert-pitch'
import { deepFreeze } from '../../events/deep-freeze'
import type { CarriedHarmony } from '../../harmony/harmony-join'
import type {
  CollectionDegree,
  DiatonicTriad,
  HarmonyEndpoint,
  HarmonyRole,
  PitchClassNumber,
  TriadQuality,
} from '../../harmony/harmony-types'
import {
  makeRegisterWindow,
  registerWindowContainsPitch,
  type RegisterWindow,
} from '../../profile/register-window'

/** The direction of a melodic move: +1 upward, -1 downward. */
// @spec-link [[entity_phrase_carry_in]]
export type LeapDirection = -1 | 1

/** Whether the last pitch still owes the recovery of a large leap, and that leap's direction. */
// @spec-link [[entity_phrase_carry_in]]
export type CarriedRecovery =
  { readonly kind: 'settled' } | { readonly kind: 'owed'; readonly leapDirection: LeapDirection }

/** The last sounding concert pitch of the phrase before a join, with its leap state there. */
// @spec-link [[entity_phrase_carry_in]]
export interface CarriedPitch {
  readonly midi: ConcertPitch
  /** Signed semitones from the second-to-last sounding pitch to this one; null for a lone note. */
  readonly arrivingInterval: number | null
  readonly recovery: CarriedRecovery
}

/**
 * A carry-in from a phrase: the four items that cross a join, and nothing else. v3.1's carry-in,
 * unchanged: exactly these four keys, no origin key.
 */
// @spec-link [[rule_join_carry_in_limited]]
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export interface PhraseCarryIn {
  readonly lastPitch: CarriedPitch
  readonly registerWindow: RegisterWindow
  /** The carried chord; null when a key or collection change dropped the harmonic part. */
  readonly finalHarmony: CarriedHarmony | null
  /** Ordinal of the phrase that just ended, counted from 1 in its session. */
  readonly phraseNumber: number
}

/**
 * A carry-in from no phrase: the doodle's join into a Jam's phrase 1. Its pitch is reached by no
 * interval and owes no recovery; it carries no chord and no ordinal. Those fixed parts keep the
 * phrase carry-in's shape, so every reader of the pitch, the window and the harmony reads both.
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
// @spec-link [[entity_phrase_carry_in]]
export interface NoPhraseCarryIn {
  readonly origin: 'none'
  readonly lastPitch: {
    readonly midi: ConcertPitch
    readonly arrivingInterval: null
    readonly recovery: { readonly kind: 'settled' }
  }
  readonly registerWindow: RegisterWindow
  readonly finalHarmony: null
}

/** What crosses a join: a carry-in from a phrase, or from no phrase. */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export type CarryIn = PhraseCarryIn | NoPhraseCarryIn

/** Intent: true when a carry-in comes from a phrase, which has no `origin` key. */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export function isPhraseCarryIn(carryIn: CarryIn): carryIn is PhraseCarryIn {
  return !Object.hasOwn(carryIn, 'origin')
}

/** Typed failure for a malformed or inconsistent carry-in. */
// @spec-link [[entity_phrase_carry_in]]
export class CarryInError extends Error {
  readonly kind = 'CarryInError' as const

  constructor(message: string) {
    super(message)
    this.name = 'CarryInError'
  }
}

/** The largest interval any leapiness level allows between two sounding notes: an octave. */
const MAX_INTERVAL = 12
/** A skip: the smallest interval a large leap's run or arrival can end with. */
const SKIP = 3
/** A step: the largest move that prepares or resolves a tense note. */
const STEP = 2

const HARMONY_ROLES: readonly HarmonyRole[] = [
  'tonic',
  'tonic_prolongation',
  'predominant',
  'open_arrival',
  'modal_color',
]
const TRIAD_QUALITIES: readonly TriadQuality[] = ['major', 'minor', 'diminished']
const ENDPOINT_KINDS: readonly HarmonyEndpoint['kind'][] = [
  'tonal_degree_five_chord_tone',
  'tonal_static_degree_five',
  'modal_non_tonic_chord_tone',
]

/** Intent: the pitch class of a MIDI value. */
function pitchClassOf(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/**
 * Intent: true when the carried pitch is a tone of the carried chord. With the harmonic part
 * dropped there is no carried chord, so the pitch is a tone of none.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function carriedPitchOnCarriedChord(
  carryIn: Pick<CarryIn, 'lastPitch' | 'finalHarmony'>,
): boolean {
  if (carryIn.finalHarmony === null) return false
  const pitchClasses = carryIn.finalHarmony.triad.pitchClasses as readonly number[]
  return pitchClasses.includes(pitchClassOf(carryIn.lastPitch.midi))
}

/**
 * Intent: true when the carried pitch is a tense note the next phrase must resolve: a pitch off
 * the carried chord. With the harmonic part dropped nothing is tense, so no resolution is owed.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function carriedPitchIsTense(carryIn: Pick<CarryIn, 'lastPitch' | 'finalHarmony'>): boolean {
  return carryIn.finalHarmony !== null && !carriedPitchOnCarriedChord(carryIn)
}

/** Intent: validate the arriving interval and the recovery it may still owe. */
function assertLeapState(lastPitch: CarriedPitch, tense: boolean): void {
  const { arrivingInterval, recovery } = lastPitch
  if (
    arrivingInterval !== null &&
    (!Number.isInteger(arrivingInterval) || Math.abs(arrivingInterval) > MAX_INTERVAL)
  )
    throw new CarryInError(
      `The arriving interval must be a whole number of semitones within an octave, got ${arrivingInterval}.`,
    )
  if (recovery.kind === 'owed') {
    if (
      arrivingInterval === null ||
      Math.abs(arrivingInterval) < SKIP ||
      Math.sign(arrivingInterval) !== recovery.leapDirection
    )
      throw new CarryInError(
        'An owed recovery needs an arriving interval of at least a skip in the owed leap direction.',
      )
  }
  if (
    tense &&
    (arrivingInterval === null || Math.abs(arrivingInterval) > STEP || arrivingInterval === 0)
  )
    throw new CarryInError('A tense carried note must have been reached by a step.')
}

/** Intent: validate the carried chord's shape; its fit to a collection is checked by the intent. */
function assertCarriedHarmony(harmony: CarriedHarmony): void {
  const { triad, role, endpoint } = harmony
  const pitchClasses = triad.pitchClasses as readonly number[]
  if (!Number.isInteger(triad.degree) || triad.degree < 1 || triad.degree > 7)
    throw new CarryInError(`The carried chord degree must be 1-7, got ${triad.degree}.`)
  if (
    pitchClasses.length !== 3 ||
    pitchClasses.some((pc) => !Number.isInteger(pc) || pc < 0 || pc > 11) ||
    new Set(pitchClasses).size !== 3
  )
    throw new CarryInError('The carried chord must hold three distinct pitch classes 0-11.')
  if (!TRIAD_QUALITIES.includes(triad.quality))
    throw new CarryInError(`The carried chord quality ${JSON.stringify(triad.quality)} is unknown.`)
  if (!HARMONY_ROLES.includes(role))
    throw new CarryInError(`The carried harmonic role ${JSON.stringify(role)} is unknown.`)
  if (!ENDPOINT_KINDS.includes(endpoint.kind) || endpoint.degree !== 5)
    throw new CarryInError(`The carried endpoint class ${JSON.stringify(endpoint)} is unknown.`)
}

/**
 * Intent: build one immutable carry-in. From a phrase, from its four items, refusing a pitch
 * outside the carried window, an inconsistent leap state, a malformed chord, a harmony that is
 * neither a chord nor an explicit null, or an ordinal that is not a positive whole number. A
 * carried pitch off the carried chord is a tense note and must have been reached by a step;
 * without a carried chord there is no tense note, and only the leap-recovery state is checked.
 * From no phrase, only the pitch inside the window is checked; its fixed parts (no interval, no
 * owed recovery, no chord, no ordinal) are the form and are refused if anything else. An input
 * holding an origin other than none is refused.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export function makeCarryIn(input: PhraseCarryIn): PhraseCarryIn
export function makeCarryIn(input: NoPhraseCarryIn): NoPhraseCarryIn
export function makeCarryIn(input: CarryIn): CarryIn
export function makeCarryIn(input: CarryIn): CarryIn {
  try {
    return isPhraseCarryIn(input) ? buildCarryIn(input) : buildNoPhraseCarryIn(input)
  } catch (error) {
    if (error instanceof CarryInError) throw error
    throw new CarryInError(`The carry-in is invalid: ${(error as Error).message}`)
  }
}

/**
 * Intent: the unguarded body of `makeCarryIn` for a carry-in from no phrase: the origin, the
 * pitch inside the window, and the fixed parts exactly as the form has them.
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
function buildNoPhraseCarryIn(input: NoPhraseCarryIn): NoPhraseCarryIn {
  if (input.origin !== 'none')
    throw new CarryInError(
      `The carry-in origin must be "none", got ${JSON.stringify(input.origin)}.`,
    )
  if (Object.hasOwn(input, 'phraseNumber'))
    throw new CarryInError('A carry-in from no phrase has no phrase number.')
  const midi = makeConcertPitch(input.lastPitch.midi)
  const registerWindow = makeRegisterWindow(
    input.registerWindow.minMidi,
    input.registerWindow.maxMidi,
  )
  if (!registerWindowContainsPitch(registerWindow, midi))
    throw new CarryInError(
      `The carried pitch ${midi} lies outside the carried window ${registerWindow.minMidi}-${registerWindow.maxMidi}.`,
    )
  if (input.lastPitch.arrivingInterval !== null)
    throw new CarryInError('A carry-in from no phrase has no arriving interval.')
  if (input.lastPitch.recovery.kind !== 'settled')
    throw new CarryInError('A carry-in from no phrase owes no leap recovery.')
  if (input.finalHarmony !== null) throw new CarryInError('A carry-in from no phrase has no chord.')
  return deepFreeze({
    origin: 'none' as const,
    lastPitch: { midi, arrivingInterval: null, recovery: { kind: 'settled' as const } },
    registerWindow,
    finalHarmony: null,
  })
}

/** Intent: the unguarded body of `makeCarryIn` for a carry-in from a phrase, as v3.1 built it. */
function buildCarryIn(input: PhraseCarryIn): PhraseCarryIn {
  const midi = makeConcertPitch(input.lastPitch.midi)
  if (!registerWindowContainsPitch(input.registerWindow, midi))
    throw new CarryInError(
      `The carried pitch ${midi} lies outside the carried window ${input.registerWindow.minMidi}-${input.registerWindow.maxMidi}.`,
    )
  if (input.finalHarmony === undefined)
    throw new CarryInError(
      'The carried harmony is missing: give the carried chord, or null when it was dropped.',
    )
  if (input.finalHarmony !== null) assertCarriedHarmony(input.finalHarmony)
  assertLeapState(input.lastPitch, carriedPitchIsTense(input))
  if (!Number.isInteger(input.phraseNumber) || input.phraseNumber < 1)
    throw new CarryInError(
      `The phrase number must be a positive whole number, got ${input.phraseNumber}.`,
    )
  return deepFreeze({
    lastPitch: {
      midi,
      arrivingInterval: input.lastPitch.arrivingInterval,
      recovery:
        input.lastPitch.recovery.kind === 'owed'
          ? { kind: 'owed' as const, leapDirection: input.lastPitch.recovery.leapDirection }
          : { kind: 'settled' as const },
    },
    registerWindow: makeRegisterWindow(input.registerWindow.minMidi, input.registerWindow.maxMidi),
    finalHarmony: input.finalHarmony === null ? null : copyCarriedHarmony(input.finalHarmony),
    phraseNumber: input.phraseNumber,
  })
}

/** Intent: a plain copy of a validated carried harmony, ready to be frozen with its carry-in. */
function copyCarriedHarmony(harmony: CarriedHarmony): CarriedHarmony {
  const { triad, role, endpoint } = harmony
  return {
    triad: {
      degree: triad.degree,
      pitchClasses: [...triad.pitchClasses] as unknown as DiatonicTriad['pitchClasses'],
      quality: triad.quality,
    },
    role,
    endpoint: { kind: endpoint.kind, degree: endpoint.degree },
  }
}

/** Intent: narrow an untrusted value to a plain record holding exactly the expected keys. */
function exactRecord(
  input: unknown,
  keys: readonly string[],
  context: string,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new CarryInError(`${context} must be a plain object.`)
  const record = input as Record<string, unknown>
  for (const key of Object.keys(record))
    if (!keys.includes(key)) throw new CarryInError(`${context} has unknown field "${key}".`)
  for (const key of keys)
    if (!(key in record)) throw new CarryInError(`${context} is missing field "${key}".`)
  return record
}

/** Intent: parse an untrusted wire recovery state. */
function parseRecovery(input: unknown): CarriedRecovery {
  const record = input as Record<string, unknown> | null
  if (record?.kind === 'settled') {
    exactRecord(input, ['kind'], 'CarryIn.lastPitch.recovery')
    return { kind: 'settled' }
  }
  if (record?.kind === 'owed') {
    exactRecord(input, ['kind', 'leapDirection'], 'CarryIn.lastPitch.recovery')
    if (record.leapDirection !== 1 && record.leapDirection !== -1)
      throw new CarryInError('CarryIn.lastPitch.recovery.leapDirection must be 1 or -1.')
    return { kind: 'owed', leapDirection: record.leapDirection }
  }
  throw new CarryInError('CarryIn.lastPitch.recovery.kind must be "settled" or "owed".')
}

/** Intent: parse an untrusted wire last pitch; the constructor checks its values. */
function parseCarriedPitch(input: unknown): CarriedPitch {
  const record = exactRecord(input, ['midi', 'arrivingInterval', 'recovery'], 'CarryIn.lastPitch')
  if (typeof record.midi !== 'number')
    throw new CarryInError('CarryIn.lastPitch.midi must be a number.')
  if (record.arrivingInterval !== null && typeof record.arrivingInterval !== 'number')
    throw new CarryInError('CarryIn.lastPitch.arrivingInterval must be a number or null.')
  return {
    midi: record.midi as ConcertPitch,
    arrivingInterval: record.arrivingInterval,
    recovery: parseRecovery(record.recovery),
  }
}

/** Intent: parse an untrusted wire carried harmony; the constructor checks its values. */
function parseCarriedHarmony(input: unknown): CarriedHarmony {
  const record = exactRecord(input, ['triad', 'role', 'endpoint'], 'CarryIn.finalHarmony')
  const triad = exactRecord(
    record.triad,
    ['degree', 'pitchClasses', 'quality'],
    'CarryIn.finalHarmony.triad',
  )
  const endpoint = exactRecord(record.endpoint, ['kind', 'degree'], 'CarryIn.finalHarmony.endpoint')
  if (!Array.isArray(triad.pitchClasses))
    throw new CarryInError('CarryIn.finalHarmony.triad.pitchClasses must be an array.')
  return {
    triad: {
      degree: triad.degree as CollectionDegree,
      pitchClasses: triad.pitchClasses as unknown as readonly [
        PitchClassNumber,
        PitchClassNumber,
        PitchClassNumber,
      ],
      quality: triad.quality as TriadQuality,
    },
    role: record.role as HarmonyRole,
    endpoint: endpoint as unknown as HarmonyEndpoint,
  }
}

/** Intent: parse an untrusted wire register window, keeping its own `kind` tag exact. */
function parseCarriedWindow(input: unknown): RegisterWindow {
  const record = exactRecord(input, ['kind', 'minMidi', 'maxMidi'], 'CarryIn.registerWindow')
  if (record.kind !== 'RegisterWindow')
    throw new CarryInError('CarryIn.registerWindow.kind must be "RegisterWindow".')
  if (typeof record.minMidi !== 'number' || typeof record.maxMidi !== 'number')
    throw new CarryInError('CarryIn.registerWindow bounds must be numbers.')
  return { kind: 'RegisterWindow', minMidi: record.minMidi, maxMidi: record.maxMidi }
}

/**
 * Intent: parse an untrusted wire value (a structured clone, which drops freezing) into a carry-in
 * from a phrase exactly as v3.1 parsed every carry-in, rejecting any missing or extra field at
 * every level (an `origin` key among them), then re-validating it through `makeCarryIn`. The
 * harmony is a carried chord or an explicit null; a missing or undefined one is refused. Never
 * fills in a default.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[module_generation_worker_protocol]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function parsePhraseCarryIn(input: unknown): PhraseCarryIn {
  const record = exactRecord(
    input,
    ['lastPitch', 'registerWindow', 'finalHarmony', 'phraseNumber'],
    'CarryIn',
  )
  if (typeof record.phraseNumber !== 'number')
    throw new CarryInError('CarryIn.phraseNumber must be a number.')
  return makeCarryIn({
    lastPitch: parseCarriedPitch(record.lastPitch),
    registerWindow: parseCarriedWindow(record.registerWindow),
    finalHarmony: record.finalHarmony === null ? null : parseCarriedHarmony(record.finalHarmony),
    phraseNumber: record.phraseNumber,
  })
}

/**
 * Intent: parse an untrusted wire carry-in from no phrase, with exactly its keys at every level
 * and its fixed parts exactly null, settled and null, then re-validate it through `makeCarryIn`.
 */
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
function parseNoPhraseCarryIn(input: unknown): NoPhraseCarryIn {
  const record = exactRecord(
    input,
    ['origin', 'lastPitch', 'registerWindow', 'finalHarmony'],
    'CarryIn',
  )
  if (record.origin !== 'none')
    throw new CarryInError(`CarryIn.origin must be "none", got ${JSON.stringify(record.origin)}.`)
  const lastPitch = exactRecord(
    record.lastPitch,
    ['midi', 'arrivingInterval', 'recovery'],
    'CarryIn.lastPitch',
  )
  if (typeof lastPitch.midi !== 'number')
    throw new CarryInError('CarryIn.lastPitch.midi must be a number.')
  if (lastPitch.arrivingInterval !== null)
    throw new CarryInError('CarryIn.lastPitch.arrivingInterval must be null for no phrase.')
  const recovery = exactRecord(lastPitch.recovery, ['kind'], 'CarryIn.lastPitch.recovery')
  if (recovery.kind !== 'settled')
    throw new CarryInError('CarryIn.lastPitch.recovery.kind must be "settled" for no phrase.')
  if (record.finalHarmony !== null)
    throw new CarryInError('CarryIn.finalHarmony must be null for no phrase.')
  return makeCarryIn({
    origin: 'none',
    lastPitch: {
      midi: lastPitch.midi as ConcertPitch,
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: parseCarriedWindow(record.registerWindow),
    finalHarmony: null,
  })
}

/**
 * Intent: parse an untrusted wire carry-in of either origin: a record holding its own `origin` key
 * is read as a carry-in from no phrase, any other value exactly as v3.1 read a carry-in.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
// @spec-link [[module_generation_worker_protocol]]
export function parseCarryIn(input: unknown): CarryIn {
  if (typeof input === 'object' && input !== null && Object.hasOwn(input, 'origin'))
    return parseNoPhraseCarryIn(input)
  return parsePhraseCarryIn(input)
}
