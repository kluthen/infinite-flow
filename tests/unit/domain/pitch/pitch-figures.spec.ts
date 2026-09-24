import { describe, expect, it } from 'vitest'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  advanceFigure,
  collectionStep,
  figureSettled,
  freeToneResolves,
  initialFigureState,
  requiredMidi,
  type ActiveFigurePath,
  type FigureState,
  type FigureStep,
} from '@/domain/pitch/pitch-figures'
import type { PitchCandidate, PitchNoteFacts, PitchReservation } from '@/domain/pitch/pitch-types'

/** A sounding-note fact; defaults represent an in-collection non-chord tone. */
function fact(midi: number, overrides: Partial<PitchNoteFacts> = {}): PitchNoteFacts {
  return { midi, chordTone: false, inCollection: true, ...overrides }
}

/** A minimal ordinary candidate carrying no reservation. */
function plainCandidate(midi: number, role: PitchCandidate['role'] = 'chord_tone'): PitchCandidate {
  return {
    identity: `${role}/${midi}`,
    role,
    midi: makeConcertPitch(midi),
    pitchClass: ((midi % 12) + 12) % 12,
    octaveIndex: Math.floor(midi / 12),
    obligationIdentity: `chord:${midi}`,
    enumerationIndex: 0,
  }
}

/** A reserved figure-path candidate at `memberPosition` of `identity`. */
function pathCandidate(input: {
  readonly identity: string
  readonly role: PitchCandidate['role']
  readonly midi: number
  readonly memberPosition: number
  readonly path: readonly number[]
  readonly attackIndices: readonly number[]
  readonly targetAttackIndex: number
  readonly bindingIdentity?: string
  readonly figureKind?: PitchReservation['figureKind']
}): PitchCandidate {
  const reservation: PitchReservation = {
    identity: input.identity,
    ...(input.bindingIdentity === undefined ? {} : { bindingIdentity: input.bindingIdentity }),
    figureKind: input.figureKind ?? 'appoggiatura',
    attackIndices: input.attackIndices,
    targetAttackIndex: input.targetAttackIndex,
    targetPitchClass: ((input.path.at(-1)! % 12) + 12) % 12,
    memberPosition: input.memberPosition,
    path: input.path,
  }
  return {
    identity: `${input.role}/${input.identity}/${input.memberPosition}`,
    role: input.role,
    midi: makeConcertPitch(input.midi),
    pitchClass: ((input.midi % 12) + 12) % 12,
    octaveIndex: Math.floor(input.midi / 12),
    obligationIdentity: input.identity,
    enumerationIndex: 0,
    reservation,
  }
}

// @test-link [[module_pitch_planner]]
describe('pitch-figures', () => {
  // @test-link [[rule_neutral_profile_diatonic_pitches]]
  describe('collectionStep', () => {
    it('accepts a 1-2 semitone move between two collection members', () => {
      expect(
        collectionStep(fact(60, { inCollection: true }), fact(62, { inCollection: true })),
      ).toBe(true)
      expect(
        collectionStep(fact(60, { inCollection: true }), fact(61, { inCollection: true })),
      ).toBe(true)
    })

    it('rejects a move outside 1-2 semitones', () => {
      expect(
        collectionStep(fact(60, { inCollection: true }), fact(60, { inCollection: true })),
      ).toBe(false)
      expect(
        collectionStep(fact(60, { inCollection: true }), fact(63, { inCollection: true })),
      ).toBe(false)
    })

    it('rejects a step where either side is out of the collection', () => {
      expect(
        collectionStep(fact(60, { inCollection: false }), fact(62, { inCollection: true })),
      ).toBe(false)
      expect(
        collectionStep(fact(60, { inCollection: true }), fact(61, { inCollection: false })),
      ).toBe(false)
    })
  })

  // @test-link [[entity_pitch_candidate_domain]]
  describe('freeToneResolves', () => {
    it('accepts a passing tone: same-direction collection steps landing on a chord tone', () => {
      const before = fact(60, { chordTone: true, inCollection: true })
      const tone = fact(62, { inCollection: true })
      const after = fact(64, { chordTone: true, inCollection: true })
      expect(freeToneResolves(before, tone, after)).toBe(true)
    })

    it('accepts a neighbor tone: leaves and returns to the same chord tone', () => {
      const before = fact(60, { chordTone: true, inCollection: true })
      const tone = fact(62, { inCollection: true })
      const after = fact(60, { chordTone: true, inCollection: true })
      expect(freeToneResolves(before, tone, after)).toBe(true)
    })

    it('rejects double passing: a free tone followed by another non-chord tone', () => {
      const before = fact(60, { chordTone: true, inCollection: true })
      const tone = fact(62, { inCollection: true })
      const after = fact(64, { chordTone: false, inCollection: true })
      expect(freeToneResolves(before, tone, after)).toBe(false)
    })

    it('rejects when either leg is not a collection step', () => {
      const before = fact(60, { chordTone: true, inCollection: true })
      const tone = fact(64, { inCollection: true })
      const after = fact(66, { chordTone: true, inCollection: true })
      expect(freeToneResolves(before, tone, after)).toBe(false)
    })
  })

  // @test-link [[entity_pitch_candidate_domain]]
  describe('initialFigureState', () => {
    it('starts already fulfilled when no binding is required', () => {
      expect(initialFigureState(false)).toEqual({ boundFulfilled: true })
    })

    it('starts unfulfilled when a binding is required', () => {
      expect(initialFigureState(true)).toEqual({ boundFulfilled: false })
    })
  })

  // @test-link [[entity_pitch_candidate_domain]]
  describe('requiredMidi', () => {
    it('returns the next expected MIDI while a path is active', () => {
      const path: ActiveFigurePath = {
        identity: 'p',
        attackIndices: [1, 2],
        midis: [62, 60],
        position: 1,
      }
      const state: FigureState = { path, boundFulfilled: true }
      expect(requiredMidi(state)).toBe(60)
    })

    it('returns undefined when no path is active', () => {
      expect(requiredMidi({ boundFulfilled: true })).toBeUndefined()
    })
  })

  // @test-link [[entity_pitch_candidate_domain]]
  describe('figureSettled', () => {
    it('is true only with no active path, no free obligation, and the bound figure realized', () => {
      expect(figureSettled({ boundFulfilled: true })).toBe(true)
      expect(figureSettled({ boundFulfilled: false })).toBe(false)
      expect(
        figureSettled({
          boundFulfilled: true,
          path: { identity: 'p', attackIndices: [0], midis: [60], position: 0 },
        }),
      ).toBe(false)
      expect(
        figureSettled({
          boundFulfilled: true,
          free: { before: fact(60, { chordTone: true }), midi: 62 },
        }),
      ).toBe(false)
    })
  })

  describe('advanceFigure: opening a bound figure path', () => {
    // @test-link [[entity_pitch_candidate_domain]]
    it('opens an appoggiatura only with a 3+ semitone entry approach', () => {
      const candidate = pathCandidate({
        identity: 'fig/appoggiatura',
        role: 'appoggiatura',
        midi: 65,
        memberPosition: 0,
        path: [65, 64],
        attackIndices: [2],
        targetAttackIndex: 3,
        figureKind: 'appoggiatura',
      })
      const near: FigureStep = {
        attackIndex: 2,
        isFinal: false,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(65, { chordTone: false, inCollection: true }),
        candidate,
      }
      const accepted = advanceFigure({ boundFulfilled: true }, near)
      expect(accepted).toEqual({
        kind: 'accepted',
        state: {
          path: {
            identity: 'fig/appoggiatura',
            attackIndices: [2, 3],
            midis: [65, 64],
            position: 1,
          },
          boundFulfilled: true,
        },
      })

      const tooClose: FigureStep = {
        ...near,
        prior: fact(64, { chordTone: true, inCollection: true }),
      }
      expect(advanceFigure({ boundFulfilled: true }, tooClose)).toEqual({
        kind: 'rejected',
        reason: 'appoggiatura_entry',
      })

      // Boundary: exactly 2 semitones rejects, exactly 3 semitones (the settled threshold) accepts.
      const atTwo: FigureStep = {
        ...near,
        prior: fact(63, { chordTone: true, inCollection: true }),
      }
      expect(advanceFigure({ boundFulfilled: true }, atTwo)).toEqual({
        kind: 'rejected',
        reason: 'appoggiatura_entry',
      })
      const atThree: FigureStep = {
        ...near,
        prior: fact(62, { chordTone: true, inCollection: true }),
      }
      expect(advanceFigure({ boundFulfilled: true }, atThree).kind).toBe('accepted')
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('opens a bound passing/neighbor path only when a collection-step preparation continues to the fixed target', () => {
      const candidate = pathCandidate({
        identity: 'fig/passing',
        role: 'passing_or_neighbor',
        midi: 62,
        memberPosition: 0,
        path: [62, 64],
        attackIndices: [1],
        targetAttackIndex: 2,
        figureKind: 'diatonic_passing_or_neighbor',
      })
      const prepared: FigureStep = {
        attackIndex: 1,
        isFinal: false,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(62, { chordTone: false, inCollection: true }),
        candidate,
      }
      expect(advanceFigure({ boundFulfilled: true }, prepared)).toEqual({
        kind: 'accepted',
        state: {
          path: { identity: 'fig/passing', attackIndices: [1, 2], midis: [62, 64], position: 1 },
          boundFulfilled: true,
        },
      })

      const unprepared: FigureStep = {
        ...prepared,
        prior: fact(67, { chordTone: true, inCollection: true }),
      }
      expect(advanceFigure({ boundFulfilled: true }, unprepared)).toEqual({
        kind: 'rejected',
        reason: 'passing_or_neighbor_entry',
      })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('never opens a path on the final attack', () => {
      const candidate = pathCandidate({
        identity: 'fig/appoggiatura',
        role: 'appoggiatura',
        midi: 65,
        memberPosition: 0,
        path: [65, 64],
        attackIndices: [2],
        targetAttackIndex: 3,
        figureKind: 'appoggiatura',
      })
      const step: FigureStep = {
        attackIndex: 2,
        isFinal: true,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(65, { chordTone: false, inCollection: true }),
        candidate,
      }
      expect(advanceFigure({ boundFulfilled: true }, step)).toEqual({
        kind: 'rejected',
        reason: 'figure_starts_on_final',
      })
      // Positive control: the identical candidate and approach open the path once the attack is
      // no longer final.
      const notFinal: FigureStep = { ...step, isFinal: false }
      expect(advanceFigure({ boundFulfilled: true }, notFinal).kind).toBe('accepted')
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a member candidate with memberPosition > 0 when no path is active', () => {
      const candidate = pathCandidate({
        identity: 'fig/approach',
        role: 'diatonic_approach_one',
        midi: 64,
        memberPosition: 1,
        path: [62, 64, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
        figureKind: 'two_note_diatonic_approach',
      })
      const step: FigureStep = {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { chordTone: false, inCollection: true }),
        note: fact(64, { chordTone: false, inCollection: true }),
        candidate,
      }
      expect(advanceFigure({ boundFulfilled: true }, step)).toEqual({
        kind: 'rejected',
        reason: 'figure_member_without_path',
      })
      // Positive control: the same member candidate is accepted once a matching path is active.
      const activePath: ActiveFigurePath = {
        identity: 'fig/approach',
        attackIndices: [1, 2, 3],
        midis: [62, 64, 65],
        position: 1,
      }
      expect(advanceFigure({ path: activePath, boundFulfilled: true }, step).kind).toBe('accepted')
    })
  })

  describe('advanceFigure: confirming an active path', () => {
    const path: ActiveFigurePath = {
      identity: 'fig/approach',
      attackIndices: [1, 2, 3],
      midis: [62, 64, 65],
      position: 1,
    }

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects an out-of-order attack index', () => {
      const candidate = pathCandidate({
        identity: 'fig/approach',
        role: 'diatonic_approach_one',
        midi: 64,
        memberPosition: 1,
        path: [62, 64, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      })
      const step: FigureStep = {
        attackIndex: 5,
        isFinal: false,
        prior: fact(62, { inCollection: true }),
        note: fact(64, { chordTone: false, inCollection: true }),
        candidate,
      }
      expect(advanceFigure({ path, boundFulfilled: true }, step)).toEqual({
        kind: 'rejected',
        reason: 'figure_path_out_of_order',
      })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a member whose MIDI does not match the fixed path exactly', () => {
      const candidate = pathCandidate({
        identity: 'fig/approach',
        role: 'diatonic_approach_one',
        midi: 63,
        memberPosition: 1,
        path: [62, 63, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      })
      const step: FigureStep = {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { inCollection: true }),
        note: fact(63, { chordTone: false, inCollection: true }),
        candidate,
      }
      expect(advanceFigure({ path, boundFulfilled: true }, step)).toEqual({
        kind: 'rejected',
        reason: 'figure_path_mismatch',
      })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a member whose reservation identity or memberPosition does not match the active path', () => {
      const wrongIdentity = pathCandidate({
        identity: 'other/path',
        role: 'diatonic_approach_one',
        midi: 64,
        memberPosition: 1,
        path: [62, 64, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      })
      const step: FigureStep = {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { inCollection: true }),
        note: fact(64, { chordTone: false, inCollection: true }),
        candidate: wrongIdentity,
      }
      expect(advanceFigure({ path, boundFulfilled: true }, step)).toEqual({
        kind: 'rejected',
        reason: 'figure_path_mismatch',
      })

      const wrongPosition = pathCandidate({
        identity: 'fig/approach',
        role: 'diatonic_approach_one',
        midi: 64,
        memberPosition: 0,
        path: [62, 64, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      })
      const step2: FigureStep = { ...step, candidate: wrongPosition }
      expect(advanceFigure({ path, boundFulfilled: true }, step2)).toEqual({
        kind: 'rejected',
        reason: 'figure_path_mismatch',
      })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('advances position on a confirmed non-final member', () => {
      const candidate = pathCandidate({
        identity: 'fig/approach',
        role: 'diatonic_approach_one',
        midi: 64,
        memberPosition: 1,
        path: [62, 64, 65],
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      })
      const step: FigureStep = {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { inCollection: true }),
        note: fact(64, { chordTone: false, inCollection: true }),
        candidate,
      }
      const result = advanceFigure({ path, boundFulfilled: true }, step)
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') expect(result.state.path?.position).toBe(2)
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('sets boundFulfilled when completing a path carrying a bindingIdentity', () => {
      const boundPath: ActiveFigurePath = { ...path, position: 2, bindingIdentity: 'binding-1' }
      const target: FigureStep = {
        attackIndex: 3,
        isFinal: false,
        prior: fact(64, { chordTone: false, inCollection: true }),
        note: fact(65, { chordTone: true, inCollection: true }),
        candidate: plainCandidate(65),
      }
      const result = advanceFigure({ path: boundPath, boundFulfilled: false }, target)
      expect(result).toEqual({ kind: 'accepted', state: { boundFulfilled: true } })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('completes a path without a bindingIdentity without setting boundFulfilled', () => {
      const unboundPath: ActiveFigurePath = { ...path, position: 2 }
      const target: FigureStep = {
        attackIndex: 3,
        isFinal: false,
        prior: fact(64, { chordTone: false, inCollection: true }),
        note: fact(65, { chordTone: true, inCollection: true }),
        candidate: plainCandidate(65),
      }
      const result = advanceFigure({ path: unboundPath, boundFulfilled: false }, target)
      expect(result).toEqual({ kind: 'accepted', state: { boundFulfilled: false } })
    })
  })

  describe('advanceFigure: free vocabulary', () => {
    // @test-link [[entity_pitch_candidate_domain]]
    it('opens a free obligation for a prepared non-final non-chord tone and resolves it as a passing tone', () => {
      const state: FigureState = { boundFulfilled: true }
      const open = advanceFigure(state, {
        attackIndex: 1,
        isFinal: false,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(62, { chordTone: false, inCollection: true }),
        candidate: plainCandidate(62, 'passing_or_neighbor'),
      })
      expect(open.kind).toBe('accepted')
      if (open.kind !== 'accepted') return
      expect(open.state.free).toEqual({
        before: fact(60, { chordTone: true, inCollection: true }),
        midi: 62,
      })

      const resolved = advanceFigure(open.state, {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { chordTone: false, inCollection: true }),
        note: fact(64, { chordTone: true, inCollection: true }),
        candidate: plainCandidate(64),
      })
      expect(resolved).toEqual({ kind: 'accepted', state: { boundFulfilled: true } })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a free non-chord tone with no prior note', () => {
      const state: FigureState = { boundFulfilled: true }
      const result = advanceFigure(state, {
        attackIndex: 0,
        isFinal: false,
        note: fact(62, { chordTone: false, inCollection: true }),
        candidate: plainCandidate(62, 'passing_or_neighbor'),
      })
      expect(result).toEqual({ kind: 'rejected', reason: 'free_tone_unprepared' })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a free non-chord tone on the final attack', () => {
      const state: FigureState = { boundFulfilled: true }
      const result = advanceFigure(state, {
        attackIndex: 3,
        isFinal: true,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(62, { chordTone: false, inCollection: true }),
        candidate: plainCandidate(62, 'passing_or_neighbor'),
      })
      expect(result).toEqual({ kind: 'rejected', reason: 'free_tone_unprepared' })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects a free non-chord tone whose prior note is not a collection step away', () => {
      const state: FigureState = { boundFulfilled: true }
      const result = advanceFigure(state, {
        attackIndex: 1,
        isFinal: false,
        prior: fact(60, { chordTone: true, inCollection: true }),
        note: fact(66, { chordTone: false, inCollection: true }),
        candidate: plainCandidate(66, 'passing_or_neighbor'),
      })
      expect(result).toEqual({ kind: 'rejected', reason: 'free_tone_unprepared' })
    })

    // @test-link [[entity_pitch_candidate_domain]]
    it('rejects double passing: an open free obligation followed by another unresolving non-chord tone', () => {
      const state: FigureState = {
        boundFulfilled: true,
        free: { before: fact(60, { chordTone: true, inCollection: true }), midi: 62 },
      }
      const result = advanceFigure(state, {
        attackIndex: 2,
        isFinal: false,
        prior: fact(62, { chordTone: false, inCollection: true }),
        note: fact(64, { chordTone: false, inCollection: true }),
        candidate: plainCandidate(64, 'passing_or_neighbor'),
      })
      expect(result).toEqual({ kind: 'rejected', reason: 'free_tone_unresolved' })
    })
  })
})
