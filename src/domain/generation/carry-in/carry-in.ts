/**
 * The carry-in: the only data one session phrase hands forward to the phrase generated after it.
 * Exactly four items cross a join: the last sounding concert pitch with its leap state, the
 * resolved register window, the final harmony event (chord and role) with its endpoint class, and
 * the phrase's ordinal in the session. Tempo, seeds, settings and every other fact of the phrase
 * stay behind. A carry-in is always constructed valid and deep-frozen, and an untrusted wire value
 * is parsed through the same constructor, rejecting any missing, extra or malformed field.
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

/** The four items that cross a join, and nothing else. */
// @spec-link [[rule_join_carry_in_limited]]
// @spec-link [[entity_phrase_carry_in]]
export interface CarryIn {
  readonly lastPitch: CarriedPitch
  readonly registerWindow: RegisterWindow
  readonly finalHarmony: CarriedHarmony
  /** Ordinal of the phrase that just ended, counted from 1 in its session. */
  readonly phraseNumber: number
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
 * Intent: build one immutable carry-in from its four items, refusing a pitch outside the carried
 * window, an inconsistent leap state, a malformed chord, or an ordinal that is not a positive
 * whole number. A carried pitch off the carried chord is a tense note and must have been reached
 * by a step.
 */
// @spec-link [[entity_phrase_carry_in]]
export function makeCarryIn(input: CarryIn): CarryIn {
  try {
    return buildCarryIn(input)
  } catch (error) {
    if (error instanceof CarryInError) throw error
    throw new CarryInError(`The carry-in is invalid: ${(error as Error).message}`)
  }
}

/** Intent: the unguarded body of `makeCarryIn`; value-object errors are rethrown as CarryInError. */
function buildCarryIn(input: CarryIn): CarryIn {
  const midi = makeConcertPitch(input.lastPitch.midi)
  if (!registerWindowContainsPitch(input.registerWindow, midi))
    throw new CarryInError(
      `The carried pitch ${midi} lies outside the carried window ${input.registerWindow.minMidi}-${input.registerWindow.maxMidi}.`,
    )
  assertCarriedHarmony(input.finalHarmony)
  const tense = !(input.finalHarmony.triad.pitchClasses as readonly number[]).includes(
    pitchClassOf(midi),
  )
  assertLeapState(input.lastPitch, tense)
  if (!Number.isInteger(input.phraseNumber) || input.phraseNumber < 1)
    throw new CarryInError(
      `The phrase number must be a positive whole number, got ${input.phraseNumber}.`,
    )
  const { triad, role, endpoint } = input.finalHarmony
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
    finalHarmony: {
      triad: {
        degree: triad.degree,
        pitchClasses: [...triad.pitchClasses] as unknown as DiatonicTriad['pitchClasses'],
        quality: triad.quality,
      },
      role,
      endpoint: { kind: endpoint.kind, degree: endpoint.degree },
    },
    phraseNumber: input.phraseNumber,
  })
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
 * Intent: parse an untrusted wire value (a structured clone, which drops freezing) into a
 * carry-in, rejecting any missing or extra field at every level, then re-validating it through
 * `makeCarryIn`. Never fills in a default.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[module_generation_worker_protocol]]
export function parseCarryIn(input: unknown): CarryIn {
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
    finalHarmony: parseCarriedHarmony(record.finalHarmony),
    phraseNumber: record.phraseNumber,
  })
}
