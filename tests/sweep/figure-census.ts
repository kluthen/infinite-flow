/**
 * The figure census (measurement tooling, never product code): from one generated phrase, name
 * every non-chord attack as one of the seven embellishment figures of the v3.1 master spec (B5.1),
 * as Tension's scheduled figure, or as unexplained, and count the instances per phrase.
 *
 * The census reads only what a generation outcome exposes: the rhythm, harmony and tension binding
 * of its provenance and the MIDI of its attacks. The free-figure search state stays inside the
 * search, so free figures are classified from their definitions, by the census's own rules.
 */

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { TensionFigureKind } from '@/domain/harmony/harmony-types'
import type { ConcreteTensionBinding } from '@/domain/pitch/pitch-types'
import {
  collectionStep,
  contiguous,
  reconstructPhraseFacts,
} from '@/domain/pitch/validation/phrase-facts'
import type {
  PitchValidationContext,
  SoundingFact,
} from '@/domain/pitch/validation/pitch-validation-types'
import { flattenNotes } from '@/domain/validation/generation-result-validator-checks'

/** The seven free embellishment figures, in the master spec's order. */
export const FREE_FIGURES = [
  'passing_tone',
  'accented_passing_tone',
  'neighbor_tone',
  'appoggiatura',
  'diatonic_enclosure',
  'chromatic_approach',
  'chromatic_enclosure',
] as const

export type FreeFigure = (typeof FREE_FIGURES)[number]

/** Every label the census gives: a free figure, Tension's scheduled figure, or unexplained. */
export const CENSUS_FIGURES = [...FREE_FIGURES, 'tension_scheduled', 'unexplained'] as const

export type CensusFigure = (typeof CENSUS_FIGURES)[number]

/** One figure instance: its label, the attacks it covers (targets excluded) and its bar. */
export interface FigureInstance {
  readonly figure: CensusFigure
  readonly attackIndices: readonly number[]
  readonly barIndex: number
  /** Tension's figure kind, on a `tension_scheduled` instance only. */
  readonly figureKind?: TensionFigureKind
}

/** The census of one phrase: its instances, its non-chord attacks and the count per label. */
export interface PhraseCensus {
  readonly instances: readonly FigureInstance[]
  readonly nonChordAttacks: readonly number[]
  readonly counts: Readonly<Record<CensusFigure, number>>
}

/** A generation that produced no phrase, kept with its failure code. */
export interface FailedCensus {
  readonly kind: 'failed'
  readonly code: string
}

/** The smallest leap, in half steps, that enters an appoggiatura. */
const APPOGGIATURA_LEAP = 3

/*
 * The validator's figure helpers (figure-rules.ts: `sameDirection`, `tightGroup`,
 * `freeDiatonicFigure`, `chromaticOrnament`, `diatonicNonChord`, `freeAppoggiatura` and
 * `diatonicEnclosureMembers`) are private to it, so the census reimplements them here, rule for
 * rule, rather than importing them. The census's rules stay level-blind: it reports
 * what a phrase holds, whatever figure levels it was generated with.
 */

/** Intent: true when two consecutive moves go the same non-zero direction. */
function sameDirection(first: SoundingFact, middle: SoundingFact, last: SoundingFact): boolean {
  const before = Math.sign(middle.midi - first.midi)
  return before !== 0 && before === Math.sign(last.midi - middle.midi)
}

/** Intent: true when attacks sound back to back under one unchanged harmony. */
function tightGroup(group: readonly SoundingFact[]): boolean {
  return group.every(
    (attack, index) =>
      index === 0 ||
      (contiguous(group[index - 1]!, attack) && attack.harmony === group[0]!.harmony),
  )
}

/**
 * Intent: the chromatic ornament explaining the out-of-collection attack `index`, as its member
 * indices, in the validator's shape order (`[i, i+1]`, `[i-1, i]`, `[i]`): two members a half step
 * above and below the chord-tone attack after them, or one member a half step from it, every
 * member no longer than the target and the whole group back to back under one harmony.
 */
function chromaticOrnament(
  attacks: readonly SoundingFact[],
  index: number,
): readonly number[] | undefined {
  const shapes = [[index, index + 1], [index - 1, index], [index]]
  for (const memberIndices of shapes) {
    const members = memberIndices.map((member) => attacks[member])
    const target = attacks[memberIndices.at(-1)! + 1]
    if (!target?.chordTone || members.some((member) => !member)) continue
    const present = members as SoundingFact[]
    const offsets = present.map((member) => member.midi - target.midi).sort((a, b) => a - b)
    const shaped = present.length === 1 ? Math.abs(offsets[0]!) === 1 : offsets.join() === '-1,1'
    const shortEnough = present.every((member) => member.durationTicks <= target.durationTicks)
    if (shaped && shortEnough && tightGroup([...present, target])) return memberIndices
  }
  return undefined
}

/** Intent: true for an in-collection attack outside its chord. */
function diatonicNonChord(attack: SoundingFact | undefined): attack is SoundingFact {
  return attack !== undefined && attack.inCollection && !attack.chordTone
}

/**
 * Intent: true when attacks `index` and `index + 1` are a diatonic enclosure: two in-collection
 * non-chord attacks, one a collection step above and one a collection step below the chord-tone
 * attack after them, in either order, the three back to back under one harmony.
 */
function diatonicEnclosure(attacks: readonly SoundingFact[], index: number): boolean {
  const [first, second, target] = [attacks[index], attacks[index + 1], attacks[index + 2]]
  if (!diatonicNonChord(first) || !diatonicNonChord(second) || !target?.chordTone) return false
  const surrounds =
    collectionStep(first, target) &&
    collectionStep(second, target) &&
    Math.sign(first.midi - target.midi) === -Math.sign(second.midi - target.midi)
  return surrounds && tightGroup([first, second, target])
}

/**
 * Intent: true when attack `index` is a free appoggiatura: entered by a leap of 3 half steps or
 * more, on a strong onset, resolved by one collection step onto the next attack, a chord tone
 * under the same harmony.
 */
function appoggiatura(attacks: readonly SoundingFact[], index: number): boolean {
  const [before, note, after] = [attacks[index - 1], attacks[index]!, attacks[index + 1]]
  return (
    before !== undefined &&
    after !== undefined &&
    Math.abs(note.midi - before.midi) >= APPOGGIATURA_LEAP &&
    note.strongOnset &&
    collectionStep(note, after) &&
    after.chordTone &&
    after.harmony === note.harmony
  )
}

/**
 * Intent: the free diatonic figure of a single non-chord attack `index`, mirroring the
 * validator's `freeDiatonicFigure`: a passing tone (collection step in and out, same direction, onto
 * a chord tone; accented on a strong onset) or a neighbor tone (collection step in and out, from a
 * chord tone back to the same MIDI); otherwise unexplained.
 */
function steppedFigure(attacks: readonly SoundingFact[], index: number): CensusFigure {
  const [before, note, after] = [attacks[index - 1], attacks[index]!, attacks[index + 1]]
  if (!before || !after || !collectionStep(before, note) || !collectionStep(note, after))
    return 'unexplained'
  if (sameDirection(before, note, after) && after.chordTone)
    return note.strongOnset ? 'accented_passing_tone' : 'passing_tone'
  if (before.chordTone && after.midi === before.midi) return 'neighbor_tone'
  return 'unexplained'
}

/** Intent: the figure of the diatonic non-chord attack `index`, with the attacks it covers. */
function diatonicFigure(
  attacks: readonly SoundingFact[],
  index: number,
  claimed: ReadonlySet<number>,
): { readonly figure: CensusFigure; readonly attackIndices: readonly number[] } {
  if (!claimed.has(index + 1) && diatonicEnclosure(attacks, index))
    return { figure: 'diatonic_enclosure', attackIndices: [index, index + 1] }
  if (appoggiatura(attacks, index)) return { figure: 'appoggiatura', attackIndices: [index] }
  return { figure: steppedFigure(attacks, index), attackIndices: [index] }
}

/**
 * Intent: label every non-chord attack of a phrase, sorted by first attack. Tension's scheduled
 * figure comes first, from the generator's own binding; then each out-of-collection attack is a
 * chromatic enclosure or approach (an enclosure covers its diatonic member too) or unexplained;
 * then each remaining in-collection non-chord attack is a diatonic enclosure, an appoggiatura, an
 * accented or plain passing tone, a neighbor tone, or unexplained, in that order. A diatonic
 * enclosure is found from its first member, since the attack before it was judged first.
 */
export function classifyFigures(
  attacks: readonly SoundingFact[],
  binding: ConcreteTensionBinding,
): readonly FigureInstance[] {
  const instances: FigureInstance[] = []
  const claimed = new Set<number>()
  /** Intent: keep an instance and claim its attacks, so no later rule labels them again. */
  const record = (instance: FigureInstance): void => {
    instances.push(instance)
    instance.attackIndices.forEach((index) => claimed.add(index))
  }
  /** Intent: the bar an instance sits in: the bar of its first attack. */
  const barOf = (indices: readonly number[]): number => attacks[indices[0]!]!.barIndex
  if (binding.attackIndices.length > 0) {
    if (binding.figureKind === undefined)
      throw new Error('A tension binding with attacks must name its figure kind.')
    const attackIndices = binding.attackIndices
    record({
      figure: 'tension_scheduled',
      attackIndices,
      barIndex: barOf(attackIndices),
      figureKind: binding.figureKind,
    })
  }
  for (const attack of attacks) {
    if (attack.inCollection || claimed.has(attack.index)) continue
    const members = chromaticOrnament(attacks, attack.index)
    const free = members !== undefined && members.every((member) => !claimed.has(member))
    const attackIndices = free ? members : [attack.index]
    const ornament = members?.length === 2 ? 'chromatic_enclosure' : 'chromatic_approach'
    record({
      figure: free ? ornament : 'unexplained',
      attackIndices,
      barIndex: barOf(attackIndices),
    })
  }
  for (const attack of attacks) {
    if (!diatonicNonChord(attack) || claimed.has(attack.index)) continue
    const found = diatonicFigure(attacks, attack.index, claimed)
    record({ ...found, barIndex: barOf(found.attackIndices) })
  }
  return instances.sort((left, right) => left.attackIndices[0]! - right.attackIndices[0]!)
}

/** Intent: count the instances of each census label. */
function tally(instances: readonly FigureInstance[]): Record<CensusFigure, number> {
  const counts = Object.fromEntries(CENSUS_FIGURES.map((figure) => [figure, 0])) as Record<
    CensusFigure,
    number
  >
  for (const instance of instances) counts[instance.figure] += 1
  return counts
}

/**
 * Intent: the census of a phrase given as a validation context and its attack MIDIs, through the
 * same fact reconstruction the v3.0 validator uses.
 */
export function censusOfContext(
  context: PitchValidationContext,
  midis: readonly number[],
): PhraseCensus {
  const attacks = reconstructPhraseFacts(context, midis).attacks
  const instances = classifyFigures(attacks, context.tensionBinding)
  return {
    instances,
    nonChordAttacks: attacks.filter((attack) => !attack.chordTone).map((attack) => attack.index),
    counts: tally(instances),
  }
}

/**
 * Intent: the validation context of a successful outcome, built field for field as the whole-result
 * validator's `melodicFailures` builds it (that function is private, so it is mirrored here).
 */
export function contextOf(
  intent: GenerationIntent,
  outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>,
): PitchValidationContext {
  const { request, provenance } = outcome
  return {
    request: {
      activeConcertRange: request.activeConcertRange,
      registerWindow: request.registerWindow,
      ...(request.carryIn === undefined ? {} : { carryIn: request.carryIn }),
    },
    policy: {
      collection: intent.controls.collection,
      tonalCenter: intent.controls.tonalCenter,
      contour: intent.controls.contour,
      leapiness: intent.controls.leapiness,
      figureLevels: intent.figureLevels,
    },
    harmony: provenance.harmony,
    rhythm: provenance.rhythm,
    tensionBinding: provenance.tensionBinding,
  }
}

/**
 * Intent: the census of one generation outcome for a standalone phrase, or its failure code. A
 * carry-in intent is refused: a carry-in phrase may end on a tense note its next phrase resolves,
 * which the census does not model, so it would be miscounted as unexplained.
 */
export function censusOfOutcome(
  intent: GenerationIntent,
  outcome: GenerationOutcome,
): PhraseCensus | FailedCensus {
  if (intent.carryIn !== undefined)
    throw new Error('The figure census covers standalone phrases only, not carry-in phrases.')
  if (outcome.kind !== 'generation_success') return { kind: 'failed', code: outcome.code }
  const midis = flattenNotes(outcome.result.timeline.measures)
    .filter((ref) => !ref.event.tieContinuation)
    .map((ref) => ref.event.pitch)
  return censusOfContext(contextOf(intent, outcome), midis)
}
