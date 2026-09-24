import { describe, expect, it } from 'vitest'

import {
  assemblePhraseResult,
  PhraseAssemblyError,
} from '@/domain/generation/orchestration/timeline-assembly'
import { makeGenerationRequest, makeRequestId } from '@/domain/generation/generation-request'
import { makeRational } from '@/domain/time/rational'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { resolveRegisterIntentCandidate } from '@/domain/profile/register-intent'
import { buildRegisterIntent } from '@/domain/profile/register-intent'
import { makeSeed } from '@/domain/random/seed'

function fastRhythmCandidates(): readonly RhythmCandidate[] {
  const result = makeRhythmCandidateDomain({
    noteDensity: 'Eighth',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
    tensionArc: 'Settled',
  })
  if (isNoLegalRhythmPlan(result)) throw new Error('Unexpected empty rhythm domain.')
  return [...result.candidates()]
}

function findCandidateWithTie(candidates: readonly RhythmCandidate[]): RhythmCandidate {
  const found = candidates.find((candidate) =>
    candidate.bars.some((bar) => bar.events.some((event) => event.tieContinuation === true)),
  )
  if (found === undefined) throw new Error('No candidate with a tie continuation was found.')
  return found
}

function countFreshAttacks(candidate: RhythmCandidate): number {
  return candidate.bars.reduce(
    (total, bar) =>
      total +
      bar.events.filter((event) => event.kind === 'note' && event.tieContinuation !== true).length,
    0,
  )
}

function countRests(candidate: RhythmCandidate): number {
  return candidate.bars.reduce(
    (total, bar) => total + bar.events.filter((event) => event.kind === 'rest').length,
    0,
  )
}

const registerIntent = buildRegisterIntent(BB_TENOR_PROFILE, 'Middle')
const middleCandidate = resolveRegisterIntentCandidate(registerIntent, 'Middle')

const request = makeGenerationRequest({
  requestId: makeRequestId('request-assembly'),
  seed: makeSeed(1),
  measureCount: 4,
  meter: { beatsPerMeasure: 4, beatUnit: 4 },
  activeConcertRange: BB_TENOR_PROFILE.concertRange,
  register: 'Middle',
  registerWindow: middleCandidate.window,
})

describe('timeline-assembly', () => {
  // @test-link [[service_generation_orchestration]]
  describe('assemblePhraseResult', () => {
    const rhythm = findCandidateWithTie(fastRhythmCandidates())
    const attackMidis = Array.from({ length: countFreshAttacks(rhythm) }, (_, i) => 60 + i)

    it('tiles four measures matching the rhythm bars', () => {
      const result = assemblePhraseResult(request, rhythm, attackMidis)
      expect(result.timeline.measures).toHaveLength(4)
      result.timeline.measures.forEach((measure, index) => {
        expect(measure.measureIndex).toBe(index)
      })
    })

    it('repeats the most recent attack pitch for a tie continuation', () => {
      const result = assemblePhraseResult(request, rhythm, attackMidis)
      const flatRhythmEvents = rhythm.bars.flatMap((bar) => bar.events)
      const flatResultEvents = result.timeline.measures.flatMap((measure) => measure.events)
      expect(flatRhythmEvents).toHaveLength(flatResultEvents.length)

      let lastPitch: number | undefined
      flatRhythmEvents.forEach((rhythmEvent, index) => {
        const resultEvent = flatResultEvents[index]!
        if (rhythmEvent.kind === 'rest') {
          expect(resultEvent.kind).toBe('rest')
          return
        }
        expect(resultEvent.kind).toBe('note')
        if (resultEvent.kind !== 'note') return
        if (rhythmEvent.tieContinuation === true) {
          expect(resultEvent.tieContinuation).toBe(true)
          expect(resultEvent.pitch).toBe(lastPitch)
        } else {
          expect(resultEvent.tieContinuation).toBe(false)
          lastPitch = resultEvent.pitch
        }
      })
    })

    it('preserves rests as rest events with the exact whole-note-fraction duration', () => {
      const result = assemblePhraseResult(request, rhythm, attackMidis)
      const flatRhythmEvents = rhythm.bars.flatMap((bar) => bar.events)
      const flatResultEvents = result.timeline.measures.flatMap((measure) => measure.events)
      const restCount = countRests(rhythm)
      expect(flatResultEvents.filter((event) => event.kind === 'rest')).toHaveLength(restCount)
      flatRhythmEvents.forEach((rhythmEvent, index) => {
        if (rhythmEvent.kind !== 'rest') return
        const resultEvent = flatResultEvents[index]!
        expect(resultEvent.kind).toBe('rest')
        expect(resultEvent.duration).toEqual(makeRational(rhythmEvent.durationTicks, 16))
      })
    })

    it('carries the request identity and seed in the result envelope', () => {
      const result = assemblePhraseResult(request, rhythm, attackMidis)
      expect(result.requestId).toBe(request.requestId)
      expect(result.seed).toBe(request.seed)
    })

    it('throws PhraseAssemblyError when attackMidis count does not match fresh attacks', () => {
      expect(() => assemblePhraseResult(request, rhythm, attackMidis.slice(1))).toThrow(
        PhraseAssemblyError,
      )
      expect(() => assemblePhraseResult(request, rhythm, [...attackMidis, 72])).toThrow(
        PhraseAssemblyError,
      )
    })
  })
})
