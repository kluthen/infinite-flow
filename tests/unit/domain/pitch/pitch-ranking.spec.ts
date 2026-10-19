import { describe, expect, it } from 'vitest'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { orderCandidates, pitchRank } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey, type PitchTieKeyFactory } from '@/domain/pitch/pitch-tie-key'
import type { ArpeggioChaos } from '@/domain/controls/generation-controls'
import type { PitchAttack, PitchCandidate } from '@/domain/pitch/pitch-types'

/** A full PitchAttack fixture; overrides let each test isolate the fields it probes. */
function attack(overrides: Partial<PitchAttack> = {}): PitchAttack {
  return {
    attackIndex: 0,
    identity: '0:0',
    barIndex: 0,
    startTick: 0,
    durationTicks: 4,
    start: 0,
    end: 4,
    chordPitchClasses: [0, 4, 7],
    harmonyIndex: 0,
    harmonyIdentity: 'fixture/0/0',
    isCheckpoint: true,
    isBeatOne: false,
    isFirstUnderHarmonyChange: false,
    isFinal: false,
    ...overrides,
  }
}

/** A chord-tone or non-chord candidate at a given MIDI. */
function candidate(
  role: PitchCandidate['role'],
  midi: number,
  identitySuffix = `${midi}`,
): PitchCandidate {
  return {
    identity: `${role}/${identitySuffix}`,
    role,
    midi: makeConcertPitch(midi),
    pitchClass: ((midi % 12) + 12) % 12,
    octaveIndex: Math.floor(midi / 12),
    obligationIdentity: `${role}:${identitySuffix}`,
    enumerationIndex: 0,
  }
}

// @test-link [[module_pitch_planner]]
describe('pitch-ranking', () => {
  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  describe('pitchRank', () => {
    it('ranks a chord tone with priority 0 and group 0 regardless of beat position', () => {
      expect(
        pitchRank(
          'Predictable',
          { isBeatOne: true, isFirstUnderHarmonyChange: false },
          candidate('chord_tone', 60),
          60,
        ),
      ).toEqual([0, 0, 0])
    })

    it('gives priority 1 only to a non-chord candidate on beat one or a harmony change', () => {
      const onBeatOne = pitchRank(
        'Predictable',
        { isBeatOne: true, isFirstUnderHarmonyChange: false },
        candidate('passing_or_neighbor', 62),
        60,
      )
      expect(onBeatOne[0]).toBe(1)

      const onHarmonyChange = pitchRank(
        'Predictable',
        { isBeatOne: false, isFirstUnderHarmonyChange: true },
        candidate('passing_or_neighbor', 62),
        60,
      )
      expect(onHarmonyChange[0]).toBe(1)

      const elsewhere = pitchRank(
        'Predictable',
        { isBeatOne: false, isFirstUnderHarmonyChange: false },
        candidate('passing_or_neighbor', 62),
        60,
      )
      expect(elsewhere[0]).toBe(0)
    })

    it('places every non-chord candidate in group 1, after every chord tone in group 0', () => {
      const chord = pitchRank(
        'Predictable',
        { isBeatOne: false, isFirstUnderHarmonyChange: false },
        candidate('chord_tone', 60),
        60,
      )
      const nonChord = pitchRank(
        'Predictable',
        { isBeatOne: false, isFirstUnderHarmonyChange: false },
        candidate('passing_or_neighbor', 62),
        60,
      )
      expect(chord[1]).toBe(0)
      expect(nonChord[1]).toBe(1)
    })

    it('applies chaos only to chord tones: Predictable nearest, Chaotic farthest, Varied flat', () => {
      const attackFacts = { isBeatOne: false, isFirstUnderHarmonyChange: false }
      const near = candidate('chord_tone', 62)
      const far = candidate('chord_tone', 72)
      const priorMidi = 60

      expect(pitchRank('Predictable', attackFacts, near, priorMidi)[2]).toBe(2)
      expect(pitchRank('Predictable', attackFacts, far, priorMidi)[2]).toBe(12)
      expect(pitchRank('Chaotic', attackFacts, near, priorMidi)[2]).toBe(-2)
      expect(pitchRank('Chaotic', attackFacts, far, priorMidi)[2]).toBe(-12)
      expect(pitchRank('Varied', attackFacts, near, priorMidi)[2]).toBe(0)
      expect(pitchRank('Varied', attackFacts, far, priorMidi)[2]).toBe(0)
    })

    it('never applies chaos to a non-chord candidate, even when Predictable or Chaotic', () => {
      const attackFacts = { isBeatOne: false, isFirstUnderHarmonyChange: false }
      const free = candidate('passing_or_neighbor', 72)
      expect(pitchRank('Predictable', attackFacts, free, 60)[2]).toBe(0)
      expect(pitchRank('Chaotic', attackFacts, free, 60)[2]).toBe(0)
    })

    it('treats an undefined prior MIDI as zero distance', () => {
      const attackFacts = { isBeatOne: false, isFirstUnderHarmonyChange: false }
      expect(pitchRank('Predictable', attackFacts, candidate('chord_tone', 72), undefined)[2]).toBe(
        0,
      )
    })
  })

  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  describe('orderCandidates', () => {
    const mixed = (): readonly PitchCandidate[] => [
      candidate('passing_or_neighbor', 61, 'a'),
      candidate('chord_tone', 67, 'b'),
      candidate('chord_tone', 60, 'c'),
      candidate('passing_or_neighbor', 65, 'd'),
      candidate('chord_tone', 72, 'e'),
    ]

    function order(
      chaos: ArpeggioChaos,
      attackFacts: PitchAttack,
      key: PitchTieKeyFactory = pitchTieKey,
    ) {
      return orderCandidates({
        chaos,
        seed: 1,
        attack: attackFacts,
        candidates: mixed(),
        priorMidi: 60,
        key,
      }).map((entry) => entry.candidate)
    }

    it.each<ArpeggioChaos>(['Predictable', 'Chaotic', 'Varied'])(
      'never places a non-chord candidate before a chord-tone candidate under %s chaos',
      (chaos) => {
        const ordered = order(chaos, attack())
        const firstNonChordIndex = ordered.findIndex((entry) => entry.role !== 'chord_tone')
        const lastChordIndex = ordered.reduce(
          (last, entry, index) => (entry.role === 'chord_tone' ? index : last),
          -1,
        )
        expect(
          firstNonChordIndex === -1 || lastChordIndex === -1 || firstNonChordIndex > lastChordIndex,
        ).toBe(true)
      },
    )

    it('orders chord tones nearest-first under Predictable', () => {
      const ordered = order('Predictable', attack()).filter((entry) => entry.role === 'chord_tone')
      expect(ordered.map((entry) => entry.midi)).toEqual([60, 67, 72])
    })

    it('orders chord tones farthest-first under Chaotic', () => {
      const ordered = order('Chaotic', attack()).filter((entry) => entry.role === 'chord_tone')
      expect(ordered.map((entry) => entry.midi)).toEqual([72, 67, 60])
    })

    it('produces the same order for equal inputs (deterministic)', () => {
      const first = order('Varied', attack())
      const second = order('Varied', attack())
      expect(first).toEqual(second)
    })

    it('breaks exact rank ties using the seeded tie key', () => {
      // Two same-role, same-distance chord tones tie every rank component under Varied chaos, so
      // the seeded tie key alone must decide their order.
      const attackFacts = attack()
      const candidates = [candidate('chord_tone', 58, 'x'), candidate('chord_tone', 62, 'y')]
      const keyOf = (identity: string) => (identity.endsWith('/x') ? 5 : 9)
      const key: PitchTieKeyFactory = (subject) => keyOf(subject.candidateStableIdentity)
      const ordered = orderCandidates({
        chaos: 'Varied',
        seed: 1,
        attack: attackFacts,
        candidates,
        priorMidi: 60,
        key,
      }).map((entry) => entry.candidate)
      expect(ordered.map((entry) => entry.identity)).toEqual(['chord_tone/x', 'chord_tone/y'])

      const reversedKey: PitchTieKeyFactory = (subject) =>
        subject.candidateStableIdentity.endsWith('/x') ? 9 : 5
      const reversed = orderCandidates({
        chaos: 'Varied',
        seed: 1,
        attack: attackFacts,
        candidates,
        priorMidi: 60,
        key: reversedKey,
      }).map((entry) => entry.candidate)
      expect(reversed.map((entry) => entry.identity)).toEqual(['chord_tone/y', 'chord_tone/x'])
    })
  })
})
