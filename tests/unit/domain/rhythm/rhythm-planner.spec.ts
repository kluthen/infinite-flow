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
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'

const input = {
  grammarVersion: 'rhythm-mvp-v2',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  silenceDensity: 'Sparse',
  syncopation: 'Straight',
  tensionArc: 'Settled',
} as const

function domainFor(
  overrides: Partial<Parameters<typeof makeRhythmCandidateDomain>[0]> = {},
): RhythmCandidateDomain {
  const result = makeRhythmCandidateDomain({ ...input, ...overrides })
  if (isNoLegalRhythmPlan(result))
    throw new Error(`Unexpected empty domain: ${result.codes.join(', ')}`)
  return result
}

// @test-link [[api_rhythm_domain_expansion]]
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

  it('rejects malformed controls and unknown grammar versions/varieties without fallback', () => {
    expect(() =>
      makeRhythmCandidateDomain({
        ...input,
        grammarVersion: 'rhythm-mvp-v1' as unknown as 'rhythm-mvp-v2',
      }),
    ).toThrow(RhythmPlannerInputError)
    expect(() =>
      makeRhythmCandidateDomain({ ...input, noteDensity: 'invalid' as unknown as 'Eighth' }),
    ).toThrow(RhythmPlannerInputError)
    expect(() =>
      makeRhythmCandidateDomain({
        ...input,
        rhythmicVariety: 'invalid' as unknown as 'Strict',
      }),
    ).toThrow(RhythmPlannerInputError)
  })

  it.each([
    ['Quarter', 4],
    ['Eighth', 2],
    ['Sixteenth', 1],
  ] as const)(
    'tiles %s bars exactly on its nominal grid',
    (noteDensity, quantum) => {
      const candidate = [...domainFor({ noteDensity }).candidates()][0]!
      for (const bar of candidate.bars) {
        expect(bar.events[0]?.startTick).toBe(0)
        expect(bar.events.at(-1)!.startTick + bar.events.at(-1)!.durationTicks).toBe(16)
        expect(bar.events.every((event) => event.durationTicks > 0)).toBe(true)
        expect(bar.events.filter((event) => event.kind === 'note').length).toBeGreaterThanOrEqual(1)
        expect(bar.events.every((event) => event.nominalDurationTicks % quantum === 0)).toBe(true)
      }
    },
    60_000,
  )

  it('covers all 324 settings with a complete domain or a typed, evidenced no-plan result', () => {
    for (const noteDensity of NOTE_DENSITIES)
      for (const rhythmicVariety of RHYTHMIC_VARIETIES)
        for (const silenceDensity of SILENCE_DENSITIES)
          for (const syncopation of SYNCOPATIONS)
            for (const tensionArc of TENSION_ARCS) {
              const result = makeRhythmCandidateDomain({
                noteDensity,
                rhythmicVariety,
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
  }, 600_000)

  // @test-link [[rule_phrase_starts_on_downbeat]]
  it('opens every legal control combination on a fresh downbeat note, including the tight combos', () => {
    let noPlanCount = 0
    for (const noteDensity of NOTE_DENSITIES)
      for (const rhythmicVariety of RHYTHMIC_VARIETIES)
        for (const silenceDensity of SILENCE_DENSITIES)
          for (const syncopation of SYNCOPATIONS)
            for (const tensionArc of TENSION_ARCS) {
              const label = `${noteDensity}|${rhythmicVariety}|${silenceDensity}|${syncopation}|${tensionArc}`
              const setting = { noteDensity, rhythmicVariety, silenceDensity, syncopation }
              const result = makeRhythmCandidateDomain({
                noteDensity,
                rhythmicVariety,
                silenceDensity,
                syncopation,
                tensionArc,
              })
              if (isNoLegalRhythmPlan(result)) {
                noPlanCount += 1
                // Every no-plan combination must be a documented, blocked rhythm setting -- not a
                // fresh grammar gap introduced by the downbeat rule or by rhythmic variety.
                expect(isUnsupportedRhythmSetting(setting), label).toBe(true)
                continue
              }
              expect(isUnsupportedRhythmSetting(setting), label).toBe(false)
              let sampled = 0
              for (const candidate of result.candidates()) {
                const first = candidate.bars[0]?.events[0]
                expect(first?.kind, label).toBe('note')
                expect(first?.startTick, label).toBe(0)
                expect(first?.tieContinuation, label).toBeFalsy()
                sampled += 1
                if (sampled >= 50) break
              }
              expect(sampled, label).toBeGreaterThan(0)
            }
    // The blocked set is 6 Strict + 4 Slightly varied + 0 Heavily varied settings, each blocked on
    // all 4 tension arcs (ISS-004 feasibility review §4).
    expect(noPlanCount).toBe(40)
  }, 600_000)

  it('matches the checked-in complete v2 identity manifest', () => {
    const manifest = JSON.parse(
      readFileSync('tests/unit/domain/rhythm/fixtures/rhythm-mvp-v2-manifest.json', 'utf8'),
    ) as { readonly entries: Readonly<Record<string, Record<string, unknown>>> }
    for (const noteDensity of NOTE_DENSITIES)
      for (const rhythmicVariety of RHYTHMIC_VARIETIES)
        for (const silenceDensity of SILENCE_DENSITIES)
          for (const syncopation of SYNCOPATIONS)
            for (const tensionArc of TENSION_ARCS) {
              const result = makeRhythmCandidateDomain({
                noteDensity,
                rhythmicVariety,
                silenceDensity,
                syncopation,
                tensionArc,
              })
              const entry =
                manifest.entries[
                  `${noteDensity}|${rhythmicVariety}|${silenceDensity}|${syncopation}|${tensionArc}`
                ]
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
  }, 600_000)

  /**
   * ISS-004 feasibility review §7: with `rhythmicVariety` stripped from the identity and the
   * grammar version projected back to `rhythm-mvp-v1`, every supported Quarter/`Slightly varied`
   * setting's candidate *set* is exactly the pre-ISS-004 `rhythm-mvp-v1` set for the same Quarter
   * setting -- confirmed here against a reference manifest computed directly from the pre-ISS-004
   * planner (commit e615a4d, before the ISS-004 `rhythm-mvp-v2` grammar bump). The comparison is
   * order-independent (sorted identities) rather than a raw-sequence hash: introducing
   * `rhythmicVariety` into the expansion pipeline changed the internal enumeration *order* (the
   * dominance/variety pass now runs where the retired Mixed-coverage pass used to), so the raw
   * enumeration sequence does not match even though the candidate set is unchanged -- which is
   * exactly why every golden output still moves (§7) despite this equivalence.
   */
  it('is exactly the v1 Quarter domain (as a set) once rhythmicVariety and the grammar-version bump are projected away', () => {
    const manifest = JSON.parse(
      readFileSync(
        'tests/unit/domain/rhythm/fixtures/rhythm-mvp-v1-quarter-sorted-manifest.json',
        'utf8',
      ),
    ) as { readonly entries: Readonly<Record<string, Record<string, unknown>>> }
    for (const silenceDensity of SILENCE_DENSITIES)
      for (const syncopation of SYNCOPATIONS)
        for (const tensionArc of TENSION_ARCS) {
          const result = makeRhythmCandidateDomain({
            noteDensity: 'Quarter',
            rhythmicVariety: 'Slightly varied',
            silenceDensity,
            syncopation,
            tensionArc,
          })
          const entry = manifest.entries[`Quarter|${silenceDensity}|${syncopation}|${tensionArc}`]
          if (isNoLegalRhythmPlan(result)) {
            expect(entry).toEqual({ kind: result.kind, codes: result.codes })
            continue
          }
          const candidates = [...result.candidates()]
          const projectedIdentities = candidates
            .map((candidate) => {
              // Rebuild `controls` with the exact key order the v1 fixture's identities used
              // (`grammarVersion` first, no `rhythmicVariety`) -- JSON.stringify is key-order
              // sensitive, and object key order is otherwise just an artifact of how each test's
              // input literal happened to be written, not a real structural difference.
              const v1Controls = {
                grammarVersion: candidate.input.grammarVersion,
                noteDensity: candidate.input.noteDensity,
                silenceDensity: candidate.input.silenceDensity,
                syncopation: candidate.input.syncopation,
                tensionArc: candidate.input.tensionArc,
              }
              const v2Identity = JSON.stringify({
                grammarVersion: candidate.grammarVersion,
                controls: v1Controls,
                bars: candidate.bars,
                recurrence: candidate.recurrence,
                transforms: candidate.transforms,
              })
              // Project every nested grammar-version marker (top-level, controls, and every cell
              // address/catalog/bar-form provenance in `bars`) back onto `rhythm-mvp-v1`.
              return v2Identity.replace(/rhythm-mvp-v2/g, 'rhythm-mvp-v1')
            })
            .sort()
          const identitySequence = projectedIdentities.join('\n') + '\n'
          const computed = {
            kind: result.kind,
            count: candidates.length,
            sortedSha256: createHash('sha256').update(identitySequence, 'utf8').digest('hex'),
          }
          expect(entry).toEqual(computed)
        }
  }, 300_000)
})
