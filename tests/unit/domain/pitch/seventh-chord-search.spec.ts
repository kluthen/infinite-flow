/**
 * Inside a phrase, the seventh of a seventh-form event is a chord tone: the attack's chord tones
 * hold it beside its triad tones, the search tries it with the chord tones and before every
 * decorating note (a Jam's doodle moves included), Arpeggio chaos orders it with the three others,
 * and the figures, free or scheduled by Tension, may resolve onto it. Extensions never become chord
 * tones. Every plan here is hand-built (chunk 2's fixture builder); a triad event is unchanged.
 */

import { describe, expect, it } from 'vitest'
import { JAZZ_FIGURE_LEVELS, type FigureLevels } from '@/domain/figures/figure-levels'
import { chordTones } from '@/domain/harmony/harmony-types'
import { noteFacts } from '@/domain/pitch/pitch-advance'
import { compileAttacks, compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { freeToneResolves } from '@/domain/pitch/pitch-figures'
import { planPitchPhrase } from '@/domain/pitch/pitch-planner'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey } from '@/domain/pitch/pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchCandidate,
  PitchSearchContext,
} from '@/domain/pitch/pitch-types'
import {
  boundSeventhInput,
  PLAN_KINDS,
  pc,
  quarterRhythms,
  seventhInput,
} from './seventh-chord-inputs'

/** The static C-major plan: every attack sounds Cmaj7 (C E G B) in seventh form. */
const STATIC_C = PLAN_KINDS.find((kind) => kind.name === 'tonal static')!
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11]
const CMAJ7 = [0, 4, 7, 11]
const B = 11

/** Jazz's levels with the appoggiatura and the diatonic enclosure on too: every free figure. */
const EVERY_FREE_FIGURE: FigureLevels = {
  ...JAZZ_FIGURE_LEVELS,
  appoggiatura: 'asToday',
  diatonicEnclosure: 'asToday',
}

/** The event sounding at an attack. */
function eventAt(input: BoundPitchPlannerInput, attackIndex: number) {
  const attack = compileAttacks(input)[attackIndex]!
  return input.harmony.events[attack.harmonyIndex]!
}

/** Inner attacks (neither the first nor the final) outside Tension's scheduled figure. */
function innerFreeAttacks(context: PitchSearchContext) {
  const bound = new Set(context.input.tensionBinding.attackIndices)
  return context.attacks.filter(
    (attack) => attack.attackIndex > 0 && !attack.isFinal && !bound.has(attack.attackIndex),
  )
}

/** Distinct pitch classes of the candidates of `role` (or of every other role, with `not`). */
function pitchClassesOf(domain: readonly PitchCandidate[], role: string, not = false) {
  return [
    ...new Set(
      domain.filter((c) => (c.role === role) !== not && !c.reservation).map((c) => c.pitchClass),
    ),
  ].sort((a, b) => a - b)
}

// @test-link [[module_pitch_search_context]]
describe('pitch-context: each attack holds its chord tones and its triad tones', () => {
  it('lists the triad then the seventh as chord tones, and the triad alone, in seventh form', () => {
    const input = boundSeventhInput()
    for (const attack of compileAttacks(input)) {
      const event = input.harmony.events[attack.harmonyIndex]!
      expect(event.seventh).toBeDefined()
      expect(attack.chordPitchClasses).toEqual([
        ...event.triad.pitchClasses,
        event.seventh!.pitchClass,
      ])
      expect(attack.triadPitchClasses).toEqual(event.triad.pitchClasses)
    }
  })

  it('gives two equal lists, the triad, in triad form', () => {
    const input = boundSeventhInput({ sevenths: () => false })
    for (const attack of compileAttacks(input)) {
      const triad = input.harmony.events[attack.harmonyIndex]!.triad.pitchClasses
      expect(attack.chordPitchClasses).toEqual(triad)
      expect(attack.triadPitchClasses).toEqual(triad)
    }
  })
})

// @test-link [[rule_seventh_is_chord_tone]]
describe('pitch-candidates: the seventh is a chord tone of the domain', () => {
  it('offers C, E, G and B as chord tones and only D, F and A as decorating notes under Cmaj7', () => {
    const context = compilePitchSearchContext(boundSeventhInput({ kind: STATIC_C }))
    const inner = innerFreeAttacks(context)
    expect(inner.length).toBeGreaterThan(0)
    for (const attack of inner) {
      const domain = context.candidateDomains[attack.attackIndex]!
      expect(pitchClassesOf(domain, 'chord_tone')).toEqual(CMAJ7)
      expect(pitchClassesOf(domain, 'chord_tone', true)).toEqual([2, 5, 9])
    }
  })

  it('reads the seventh as a chord tone in the note facts of an inner attack', () => {
    const context = compilePitchSearchContext(boundSeventhInput({ kind: STATIC_C }))
    const attack = innerFreeAttacks(context)[0]!
    expect(noteFacts(context, attack, 71).chordTone).toBe(true)
    expect(noteFacts(context, attack, 69).chordTone).toBe(false)
  })
})

// @test-link [[rule_extensions_never_chord_tones]]
describe('pitch-candidates: extensions are never chord tones', () => {
  it('never offers the ninth, eleventh or thirteenth as a chord tone, in any plan kind', () => {
    for (const kind of PLAN_KINDS) {
      const context = compilePitchSearchContext(boundSeventhInput({ kind }))
      const collection = context.collectionPitchClasses
      for (const attack of context.attacks) {
        const event = context.input.harmony.events[attack.harmonyIndex]!
        const root = event.triad.degree - 1
        const extensions = [1, 3, 5].map((above) => collection[(root + above) % 7]!)
        const chord = pitchClassesOf(context.candidateDomains[attack.attackIndex]!, 'chord_tone')
        for (const extension of extensions) expect(chord).not.toContain(extension)
        expect(chord.every((value) => chordTones(event).includes(value as never))).toBe(true)
      }
    }
  })

  it('keeps the ninth, eleventh and thirteenth as decorating notes under Cmaj7', () => {
    const context = compilePitchSearchContext(boundSeventhInput({ kind: STATIC_C }))
    const attack = innerFreeAttacks(context)[0]!
    const facts = [62, 65, 69].map((midi) => noteFacts(context, attack, midi))
    expect(facts.map((fact) => fact.chordTone)).toEqual([false, false, false])
  })
})

/** An inner attack's search order, under a chaos, from a prior note, optionally steered. */
function innerOrder(
  chaos: 'Predictable' | 'Varied' | 'Chaotic',
  priorMidi: number,
  steering?: Parameters<typeof orderCandidates>[0]['steering'],
) {
  const context = compilePitchSearchContext(boundSeventhInput({ kind: STATIC_C, chaos }))
  const attack = innerFreeAttacks(context)[0]!
  return orderCandidates({
    chaos,
    seed: 7,
    attack,
    candidates: context.candidateDomains[attack.attackIndex]!,
    priorMidi,
    key: pitchTieKey,
    ...(steering === undefined ? {} : { steering }),
  }).map((entry) => entry.candidate)
}

// @test-link [[rule_seventh_is_chord_tone]]
// @test-link [[rule_arpeggio_chaos_respects_constraints]]
// @test-link [[rule_figure_level_orders_search]]
describe('pitch-ranking: the seventh is tried with the chord tones', () => {
  it('tries every seventh before every decorating note, under every chaos', () => {
    for (const chaos of ['Predictable', 'Varied', 'Chaotic'] as const) {
      const order = innerOrder(chaos, 64)
      const lastSeventh = order.map((c) => c.pitchClass).lastIndexOf(B)
      const firstDecorating = order.findIndex((c) => c.role !== 'chord_tone')
      expect(lastSeventh).toBeGreaterThanOrEqual(0)
      expect(lastSeventh).toBeLessThan(firstDecorating)
    }
  })

  it('orders the four chord tones nearest first under Predictable, the seventh included', () => {
    const order = innerOrder('Predictable', 72).filter((c) => c.role === 'chord_tone')
    expect(order.slice(0, 2).map((c) => c.midi)).toEqual([72, 71])
    expect(new Set(order.map((c) => c.pitchClass))).toEqual(new Set(CMAJ7))
  })

  it('orders the seventh farthest first under Chaotic when it is the farthest chord tone', () => {
    const order = innerOrder('Chaotic', 60).filter((c) => c.role === 'chord_tone')
    const distances = order.map((c) => Math.abs(c.midi - 60))
    expect(distances).toEqual([...distances].sort((a, b) => b - a))
    expect(order.some((c) => c.pitchClass === B)).toBe(true)
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it("never lets a doodle's move lift a decorating note above the seventh", () => {
    for (const strength of ['size-and-direction', 'direction'] as const) {
      // From C4, a step up is D, a decorating note; every B is a skip or more away.
      const order = innerOrder('Varied', 60, { move: { direction: 'up', size: 'step' }, strength })
      const lastSeventh = order.map((c) => c.pitchClass).lastIndexOf(B)
      const firstD = order.findIndex((c) => c.midi === 62)
      expect(firstD).toBeGreaterThan(lastSeventh)
    }
  })
})

/** Inputs over seventh-chord plans whose Tension (Lift or Build) schedules a figure. */
function scheduledFigureInputs(): readonly BoundPitchPlannerInput[] {
  const inputs: BoundPitchPlannerInput[] = []
  for (const tensionArc of ['Lift', 'Build'] as const)
    for (let harmonyIndex = 0; harmonyIndex < 3; harmonyIndex += 1)
      for (let rhythmIndex = 0; rhythmIndex < 4; rhythmIndex += 1) {
        const input = seventhInput({ tensionArc, harmonyIndex, rhythmIndex })
        if (input?.tensionBinding.figureKind) inputs.push(input)
      }
  return inputs
}

/** The kinds of the scheduled figure's paths whose target is the seventh of its chord. */
function scheduledLandingsOnTheSeventh(input: BoundPitchPlannerInput): readonly string[] {
  return compilePitchSearchContext(input)
    .candidateDomains.flat()
    .flatMap(({ reservation }) =>
      reservation?.bindingIdentity !== undefined &&
      reservation.targetPitchClass ===
        eventAt(input, reservation.targetAttackIndex).seventh?.pitchClass
        ? [reservation.figureKind]
        : [],
    )
}

// @test-link [[rule_figures_resolve_onto_chord_tones]]
describe('pitch-figures: every figure may resolve onto the seventh', () => {
  it('explains a free passing tone that resolves onto the seventh', () => {
    const context = compilePitchSearchContext(boundSeventhInput({ kind: STATIC_C }))
    const attack = innerFreeAttacks(context)[0]!
    const [g, a, b] = [67, 69, 71].map((midi) => noteFacts(context, attack, midi))
    expect(freeToneResolves(g!, a!, b!)).toBe(true)
  })

  it('offers free figures whose target is the seventh of the chord under it', () => {
    const context = compilePitchSearchContext(
      boundSeventhInput({ kind: STATIC_C, figureLevels: EVERY_FREE_FIGURE }),
    )
    const targets = new Set(
      context.candidateDomains
        .flat()
        .filter((c) => c.reservation !== undefined && c.reservation.bindingIdentity === undefined)
        .map((c) => `${c.reservation!.figureKind}:${c.reservation!.targetPitchClass}`),
    )
    for (const kind of ['appoggiatura', 'chromatic_approach', 'chromatic_enclosure'])
      expect(targets.has(`${kind}:${B}`)).toBe(true)
    // B and C are one scale step apart: no decorating note fits between them to enclose either.
    expect(targets.has(`diatonic_enclosure:${B}`)).toBe(false)
    expect(targets.has('diatonic_enclosure:0')).toBe(false)
    expect(targets.has('diatonic_enclosure:4')).toBe(true)
  })

  // @test-link [[rule_tension_arc_build]]
  it("lets Tension's scheduled figure land on the seventh", () => {
    const kinds = scheduledFigureInputs().flatMap(scheduledLandingsOnTheSeventh)
    expect(kinds.length).toBeGreaterThan(0)
  })
})

// @test-link [[rule_seventh_is_chord_tone]]
describe('pitch-search: phrases over seventh chords', () => {
  it('sounds the seventh on inner attacks of generated phrases', () => {
    let innerSevenths = 0
    for (let rhythmIndex = 0; rhythmIndex < quarterRhythms(4).length; rhythmIndex += 1)
      for (const seed of [1, 2, 3]) {
        const input = boundSeventhInput({ kind: STATIC_C, rhythmIndex, seed, chaos: 'Varied' })
        const result = planPitchPhrase(input)
        if (result.kind !== 'pitch_plan') continue
        for (const { attack, candidate } of result.phrase.assignments)
          if (!attack.isFinal && pc(candidate.midi) === B) {
            expect(candidate.role).toBe('chord_tone')
            innerSevenths += 1
          }
      }
    expect(innerSevenths).toBeGreaterThan(0)
  })

  it('treats every collection note of a triad event as before: three chord tones, four others', () => {
    const context = compilePitchSearchContext(
      boundSeventhInput({ kind: STATIC_C, sevenths: () => false }),
    )
    for (const attack of innerFreeAttacks(context)) {
      const domain = context.candidateDomains[attack.attackIndex]!
      expect(pitchClassesOf(domain, 'chord_tone')).toEqual([0, 4, 7])
      expect(pitchClassesOf(domain, 'chord_tone', true)).toEqual(
        C_MAJOR.filter((value) => ![0, 4, 7].includes(value)),
      )
    }
  })
})
