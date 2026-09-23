// @test-link [[api_rhythm_domain_expansion]]
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  isNoLegalRhythmPlan,
  makeRhythmCandidateDomain,
  RhythmPlannerInputError,
  type RhythmCandidateDomain,
} from '@/domain/rhythm/rhythm-planner'
import {
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'

const input = {
  grammarVersion: 'rhythm-mvp-v1',
  noteDensity: 'Eighth',
  silenceDensity: 'Sparse',
  syncopation: 'Straight',
  tensionArc: 'Settled',
} as const

function domainFor(overrides: Partial<typeof input> = {}): RhythmCandidateDomain {
  const result = makeRhythmCandidateDomain({ ...input, ...overrides })
  if (isNoLegalRhythmPlan(result))
    throw new Error(`Unexpected empty domain: ${result.codes.join(', ')}`)
  return result
}

describe('rhythm candidate domain', () => {
  it('replays immutable, canonical candidates with contiguous indices and no seed dependencies', () => {
    const domain = domainFor()
    const first = [...domain.candidates()]
    const second = [...domain.candidates()]

    expect(first.length).toBeGreaterThan(0)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    expect(first.map((candidate) => candidate.candidateIndex)).toEqual(
      first.map((_, index) => index),
    )
    expect(new Set(first.map((candidate) => candidate.identity)).size).toBe(first.length)
    expect(Object.isFrozen(first[0])).toBe(true)
    expect(Object.isFrozen(first[0]!.bars[0]!.events)).toBe(true)
    expect(JSON.stringify(domain)).not.toMatch(/seed|harmony|pitch|profile|instrument|rank|select/i)
  })

  it('rejects malformed controls and unknown grammar versions without fallback', () => {
    expect(() =>
      makeRhythmCandidateDomain({
        ...input,
        grammarVersion: 'rhythm-mvp-v2' as unknown as 'rhythm-mvp-v1',
      }),
    ).toThrow(RhythmPlannerInputError)
    expect(() =>
      makeRhythmCandidateDomain({ ...input, noteDensity: 'invalid' as unknown as 'Eighth' }),
    ).toThrow(RhythmPlannerInputError)
  })

  it.each([
    ['Quarter', 4],
    ['Eighth', 2],
    ['Sixteenth', 1],
    ['Mixed', 1],
  ] as const)('tiles %s bars exactly on its nominal grid', (noteDensity, quantum) => {
    const candidate = domainFor({ noteDensity }).candidates().next().value!
    for (const bar of candidate.bars) {
      expect(bar.events[0]?.startTick).toBe(0)
      expect(bar.events.at(-1)!.startTick + bar.events.at(-1)!.durationTicks).toBe(16)
      expect(bar.events.every((event) => event.durationTicks > 0)).toBe(true)
      expect(bar.events.filter((event) => event.kind === 'note').length).toBeGreaterThanOrEqual(1)
      expect(bar.events.every((event) => event.nominalDurationTicks % quantum === 0)).toBe(true)
    }
  })

  it('covers all 144 controls with a complete domain or a typed, evidenced no-plan result', () => {
    for (const noteDensity of NOTE_DENSITIES)
      for (const silenceDensity of SILENCE_DENSITIES)
        for (const syncopation of SYNCOPATIONS)
          for (const tensionArc of TENSION_ARCS) {
            const result = makeRhythmCandidateDomain({
              grammarVersion: 'rhythm-mvp-v1',
              noteDensity,
              silenceDensity,
              syncopation,
              tensionArc,
            })
            if (isNoLegalRhythmPlan(result)) {
              expect(result.codes.length).toBeGreaterThan(0)
              continue
            }
            const domain = result
            const candidates = [...domain.candidates()]
            expect(candidates).not.toHaveLength(0)
            expect(
              candidates.every((candidate) => validateRhythmCandidate(candidate).length === 0),
            ).toBe(true)
          }
  }, 300_000)

  it('matches the checked-in complete v1 identity manifest', () => {
    const manifest = JSON.parse(
      readFileSync('tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-manifest.json', 'utf8'),
    ) as { readonly entries: Readonly<Record<string, Record<string, unknown>>> }
    for (const noteDensity of NOTE_DENSITIES)
      for (const silenceDensity of SILENCE_DENSITIES)
        for (const syncopation of SYNCOPATIONS)
          for (const tensionArc of TENSION_ARCS) {
            const result = makeRhythmCandidateDomain({
              grammarVersion: 'rhythm-mvp-v1',
              noteDensity,
              silenceDensity,
              syncopation,
              tensionArc,
            })
            const entry =
              manifest.entries[`${noteDensity}|${silenceDensity}|${syncopation}|${tensionArc}`]
            if (isNoLegalRhythmPlan(result))
              expect(entry).toEqual({ kind: result.kind, codes: result.codes })
            else {
              const candidates = [...result.candidates()]
              const identitySequence =
                candidates.map((candidate) => candidate.identity).join('\n') + '\n'
              expect(entry).toEqual({
                kind: result.kind,
                count: candidates.length,
                sha256: createHash('sha256').update(identitySequence, 'utf8').digest('hex'),
              })
            }
          }
  }, 300_000)
})
