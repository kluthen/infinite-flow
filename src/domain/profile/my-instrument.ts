/**
 * My instrument: the player's own instrument, made from a built-in template, a display name, a
 * written range and a transposition, from which a validated instrument profile is derived under
 * the fixed id `my-instrument`. Building it refuses an invalid record with a reason and never
 * clamps; the same refusal is available without throwing, for a live check while it is edited.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type InstrumentProfile, makeInstrumentProfile } from './instrument-profile'
import {
  BUILT_IN_REGISTER_WINDOW_POLICY,
  MY_INSTRUMENT_ID,
  findBuiltInInstrumentProfile,
  isBuiltInInstrumentProfileId,
  type BuiltInInstrumentProfileId,
} from './instrument-profiles'
import {
  deriveTranspositionInterval,
  findTranspositionProblem,
  instrumentTranspositionFor,
  transpositionFromInstrumentTransposition,
  type MyInstrumentTransposition,
  type TranspositionInterval,
} from './transposition-interval'

/** The lowest and highest written note the player sets and keeps, as MIDI note numbers. */
// @spec-link [[entity_my_instrument]]
export interface WrittenRange {
  readonly minMidi: number
  readonly maxMidi: number
}

/** How the player's notes reach the app: a MIDI controller, the only kind for now. */
// @spec-link [[entity_my_instrument]]
export type MyInstrumentInputKind = 'midi-controller'

/**
 * A validated, deep-frozen my instrument: the record the player edits (template, name, written
 * range, transposition, input kind) and what is derived from it (the interval and the profile).
 */
// @spec-link [[entity_my_instrument]]
export interface MyInstrument {
  readonly kind: 'MyInstrument'
  readonly id: typeof MY_INSTRUMENT_ID
  readonly template: BuiltInInstrumentProfileId
  readonly name: string
  readonly writtenRange: WrittenRange
  readonly transposition: MyInstrumentTransposition
  readonly inputKind: MyInstrumentInputKind
  readonly interval: TranspositionInterval
  readonly profile: InstrumentProfile
}

/** What the player gives to build my instrument; the template may name no built-in. */
// @spec-link [[entity_my_instrument]]
export interface MyInstrumentInput {
  readonly template: string
  readonly name: string
  readonly writtenRange: WrittenRange
  readonly transposition: MyInstrumentTransposition
}

/** Why building my instrument is refused, one code per rule, checked in this order. */
// @spec-link [[rule_my_instrument_range_limits]]
export type MyInstrumentRefusalReason =
  | 'name-empty'
  | 'unknown-template'
  | 'transposition-invalid'
  | 'range-not-whole'
  | 'lowest-not-below-highest'
  | 'range-under-two-octaves'
  | 'sounds-outside-midi'

/** A refusal: its reason code and a human-readable message. */
// @spec-link [[rule_my_instrument_range_limits]]
export interface MyInstrumentRefusal {
  readonly reason: MyInstrumentRefusalReason
  readonly message: string
}

/** Typed failure for an invalid attempt to build my instrument, carrying the refusal's reason. */
// @spec-link [[entity_my_instrument]]
export class MyInstrumentError extends Error {
  readonly kind = 'MyInstrumentError' as const
  readonly reason: MyInstrumentRefusalReason

  constructor(refusal: MyInstrumentRefusal) {
    super(refusal.message)
    this.name = 'MyInstrumentError'
    this.reason = refusal.reason
  }
}

/** A starting point taken from a built-in: its template id, written range and transposition. */
// @spec-link [[entity_my_instrument]]
export interface MyInstrumentDraft {
  readonly template: BuiltInInstrumentProfileId
  readonly writtenRange: WrittenRange
  readonly transposition: MyInstrumentTransposition
}

/** The narrowest written span my instrument may have: two octaves. */
const MINIMUM_SPAN = 24
const LOWEST_MIDI_NOTE = 0
const HIGHEST_MIDI_NOTE = 127

/** Intent: a refusal value with its reason and message. */
function refusal(reason: MyInstrumentRefusalReason, message: string): MyInstrumentRefusal {
  return deepFreeze({ reason, message })
}

/**
 * Intent: check a written range that is already known to hold whole numbers against the range
 * limits: the lowest note below the highest, a span of at least two octaves, and both concert
 * ends, the written range moved by the chromatic count, inside MIDI notes 0 to 127. Written notes
 * have no bound of their own.
 */
// @spec-link [[rule_my_instrument_range_limits]]
function findRangeRefusal(range: WrittenRange, chromatic: number): MyInstrumentRefusal | undefined {
  if (range.minMidi >= range.maxMidi)
    return refusal(
      'lowest-not-below-highest',
      `The lowest note (${range.minMidi}) must be below the highest (${range.maxMidi}).`,
    )
  const span = range.maxMidi - range.minMidi
  if (span < MINIMUM_SPAN)
    return refusal(
      'range-under-two-octaves',
      `The range spans ${span} semitones; it must span at least two octaves (${MINIMUM_SPAN}).`,
    )
  const concertMin = range.minMidi - chromatic
  const concertMax = range.maxMidi - chromatic
  if (concertMin < LOWEST_MIDI_NOTE || concertMax > HIGHEST_MIDI_NOTE)
    return refusal(
      'sounds-outside-midi',
      `The range sounds from ${concertMin} to ${concertMax}; both ends must sound inside MIDI notes ${LOWEST_MIDI_NOTE} to ${HIGHEST_MIDI_NOTE}.`,
    )
  return undefined
}

/**
 * Intent: the first rule an input breaks, or nothing when my instrument can be built from it.
 * Checked in a fixed order: a blank name, a template that names no built-in, a malformed
 * transposition, endpoints that are not whole numbers, then the range limits.
 */
// @spec-link [[entity_my_instrument]]
// @spec-link [[rule_my_instrument_range_limits]]
export function findMyInstrumentRefusal(input: MyInstrumentInput): MyInstrumentRefusal | undefined {
  if (input.name.trim().length === 0)
    return refusal('name-empty', 'My instrument needs a name that is not blank.')
  if (!isBuiltInInstrumentProfileId(input.template))
    return refusal(
      'unknown-template',
      `The template ${JSON.stringify(input.template)} is not a built-in instrument.`,
    )
  const transpositionProblem = findTranspositionProblem(input.transposition)
  if (transpositionProblem !== undefined)
    return refusal('transposition-invalid', transpositionProblem)
  const { minMidi, maxMidi } = input.writtenRange
  if (!Number.isInteger(minMidi) || !Number.isInteger(maxMidi))
    return refusal(
      'range-not-whole',
      `The lowest and highest notes must be whole numbers, got ${minMidi} and ${maxMidi}.`,
    )
  return findRangeRefusal(
    input.writtenRange,
    instrumentTranspositionFor(input.transposition).chromatic,
  )
}

/**
 * Intent: build my instrument, refusing any input `findMyInstrumentRefusal` refuses as a typed
 * MyInstrumentError. The profile carries the fixed id, the display name, the concert range (the
 * written range minus the chromatic count, as written = concert + chromatic), the built-in
 * profiles' window policy and the chromatic/diatonic pair from the interval table.
 */
// @spec-link [[entity_my_instrument]]
export function makeMyInstrument(input: MyInstrumentInput): MyInstrument {
  const refused = findMyInstrumentRefusal(input)
  if (refused !== undefined) throw new MyInstrumentError(refused)
  const template = input.template
  if (!isBuiltInInstrumentProfileId(template))
    throw new MyInstrumentError(refusal('unknown-template', `Unknown template ${template}.`))

  const interval = deriveTranspositionInterval(input.transposition)
  const transposition = instrumentTranspositionFor(input.transposition)
  const writtenRange = { minMidi: input.writtenRange.minMidi, maxMidi: input.writtenRange.maxMidi }
  const profile = makeInstrumentProfile({
    id: MY_INSTRUMENT_ID,
    displayName: input.name,
    concertRange: {
      minMidi: writtenRange.minMidi - transposition.chromatic,
      maxMidi: writtenRange.maxMidi - transposition.chromatic,
    },
    registerWindows: BUILT_IN_REGISTER_WINDOW_POLICY,
    transposition,
  })

  return deepFreeze({
    kind: 'MyInstrument',
    id: MY_INSTRUMENT_ID,
    template,
    name: input.name,
    writtenRange,
    transposition: {
      octaves: input.transposition.octaves,
      semitones: input.transposition.semitones,
      direction: input.transposition.direction,
    },
    inputKind: 'midi-controller',
    interval,
    profile,
  })
}

/**
 * Intent: the starting point a built-in gives my instrument: its id as the template, its written
 * range (the concert range plus the chromatic count) and its transposition in octaves, semitones
 * and a direction. Refuses an id that names no built-in, and a built-in whose diatonic count the
 * interval table would spell differently.
 */
// @spec-link [[entity_my_instrument]]
export function myInstrumentDraftFromTemplate(templateId: string): MyInstrumentDraft {
  const builtIn = findBuiltInInstrumentProfile(templateId)
  if (builtIn === undefined || !isBuiltInInstrumentProfileId(templateId))
    throw new MyInstrumentError(
      refusal(
        'unknown-template',
        `The template ${JSON.stringify(templateId)} is not a built-in instrument.`,
      ),
    )
  const { chromatic } = builtIn.transposition
  return deepFreeze({
    template: templateId,
    writtenRange: {
      minMidi: builtIn.concertRange.minMidi + chromatic,
      maxMidi: builtIn.concertRange.maxMidi + chromatic,
    },
    transposition: transpositionFromInstrumentTransposition(builtIn.transposition),
  })
}
