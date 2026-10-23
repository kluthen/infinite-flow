import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  TENSION_ARCS,
  type SilenceDensity,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import {
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeBetween } from '@/domain/rhythm/rhythm-change-kinds'
import {
  RHYTHM_CHANGE_SHARE,
  RHYTHM_CHANGE_SHARE_BITS,
  RHYTHM_CHANGE_TIE_KEY_PREFIX,
  TENSER_RHYTHM_CHANGE_SHARE,
  drawRhythmChange,
  isRhythmChangeDrawn,
  rhythmChangeCandidates,
  rhythmChangeHash,
} from '@/domain/rhythm/rhythm-change-draw'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { phraseAttemptSeed } from '@/session/session-seed-plan'

import { lockedBarsOf, lockTestDomain, seededOrder } from './rhythm-lock-fixture'

const BUILD = lockTestDomain('Build')
const EDGE = lockTestDomain('Edge')
const SEED = makeSeed(11)

/**
 * Intent: phrase seeds as a session derives them (the session seed plan), over many sessions and
 * phrases: the seeds the draw sees in use.
 */
function sessionPhraseSeeds(sessions: number, phrases: number): readonly Seed[] {
  const seeds: Seed[] = []
  for (let session = 0; session < sessions; session += 1)
    for (let phrase = 2; phrase < phrases + 2; phrase += 1)
      seeds.push(phraseAttemptSeed(makeSeed(session), phrase, 0))
  return seeds
}

/** Intent: the oracle: every candidate one allowed change from the locked bars, by a full scan. */
function scannedCandidates(
  domain: readonly RhythmCandidate[],
  locked: RhythmCandidate,
  allowed: readonly RhythmChangeKind[],
): ReadonlyMap<number, RhythmChangeKind> {
  const found = new Map<number, RhythmChangeKind>()
  for (const candidate of domain) {
    const change = rhythmChangeBetween(locked.bars, candidate.bars)
    if (change && allowed.includes(change.kind)) found.set(candidate.candidateIndex, change.kind)
  }
  return found
}

/** Intent: one candidate per bar key of a domain, in domain order. */
function distinctBars(domain: readonly RhythmCandidate[]): readonly RhythmCandidate[] {
  const seen = new Set<string>()
  return domain.filter((candidate) => {
    const key = rhythmBarKey(candidate.bars)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Intent: the Sixteenth, Strict, Straight domain of one silence and tension, if it has a plan. */
function strictStraightSixteenth(
  silenceDensity: SilenceDensity,
  tensionArc: TensionArc,
): readonly RhythmCandidate[] | undefined {
  const result = makeRhythmCandidateDomain({
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    syncopation: 'Straight',
    silenceDensity,
    tensionArc,
  })
  if (isNoLegalRhythmPlan(result)) return undefined
  return Object.freeze([...result.candidates()])
}

/** Intent: every kind a domain's locked rhythms find, over each distinct bar key as the lock. */
function kindsFound(domain: readonly RhythmCandidate[]): ReadonlySet<RhythmChangeKind> {
  const kinds = new Set<RhythmChangeKind>()
  const seeded = seededOrder(domain, SEED)
  for (const locked of distinctBars(domain))
    for (const { kind } of rhythmChangeCandidates({
      domain,
      seeded,
      lockedBars: lockedBarsOf(locked),
      allowedChanges: RHYTHM_CHANGE_KINDS,
    }))
      kinds.add(kind)
  return kinds
}

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_rhythm_change_share]]
describe('whether a phrase changes', () => {
  it('draws about 1 in 4 phrases, and 1 in 2 tenser phrases, over many session seeds', () => {
    const seeds = sessionPhraseSeeds(200, 40)
    const normal = seeds.filter((seed) => isRhythmChangeDrawn(seed, false)).length
    const tenser = seeds.filter((seed) => isRhythmChangeDrawn(seed, true)).length
    expect(Math.abs(normal / seeds.length - 0.25)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(tenser / seeds.length - 0.5)).toBeLessThanOrEqual(0.02)
  })

  it('draws on a tenser phrase every seed it draws on a normal one', () => {
    for (const seed of sessionPhraseSeeds(50, 40))
      if (isRhythmChangeDrawn(seed, false)) expect(isRhythmChangeDrawn(seed, true)).toBe(true)
  })

  it('keeps both shares whole numerators over 2^16, under the versioned tie-key prefix', () => {
    expect(RHYTHM_CHANGE_SHARE_BITS).toBe(16)
    expect(RHYTHM_CHANGE_SHARE).toBe(2 ** 14)
    expect(TENSER_RHYTHM_CHANGE_SHARE).toBe(2 ** 15)
    expect(RHYTHM_CHANGE_TIE_KEY_PREFIX).toBe('infinite-flow/rhythm-change/v1')
  })

  it('gives the golden hashes and draws for a fixed seed list', () => {
    const golden: readonly (readonly [number, number, boolean, boolean])[] = [
      [0, 3254562163, false, false],
      [1, 3237784544, false, false],
      [7, 3338450258, false, false],
      [11, 335359625, true, true],
      [42, 83297982, true, true],
      [1000, 3091231851, false, false],
      [0xffffffff, 2763783027, false, false],
    ]
    for (const [value, hash, normal, tenser] of golden) {
      const seed = makeSeed(value)
      expect(rhythmChangeHash(seed)).toBe(hash)
      expect(isRhythmChangeDrawn(seed, false)).toBe(normal)
      expect(isRhythmChangeDrawn(seed, true)).toBe(tenser)
    }
    const drawnOnlyWhenTenser = sessionPhraseSeeds(4, 10).filter(
      (seed) => isRhythmChangeDrawn(seed, true) && !isRhythmChangeDrawn(seed, false),
    )
    expect(drawnOnlyWhenTenser.length).toBeGreaterThan(0)
  })
})

/** The draw module's source with comments and string and template literals removed. */
function codeOnly(): string {
  const source = readFileSync(
    resolve(process.cwd(), 'src/domain/rhythm/rhythm-change-draw.ts'),
    'utf8',
  )
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    ' ',
  )
}

// @test-link [[module_rhythm_change_draw]]
describe('the draw: whole-number operations only', () => {
  it('holds no floating-point operation, and draws with an unsigned shift', () => {
    const code = codeOnly()
    for (const forbidden of [/\//, /\*/, /%/, /Math\./, /parseFloat/, /Number\(/, /toFixed/])
      expect(code).not.toMatch(forbidden)
    expect(code).not.toMatch(/\d\.\d|\.\d/)
    expect(code).toContain('>>>')
  })
})

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_allowed_rhythm_changes]]
// @test-link [[rule_rhythm_change_kinds]]
describe('which candidates carry the change', () => {
  it('finds exactly the candidates one allowed change from the locked bars, as a full scan does', () => {
    for (const domain of [BUILD, EDGE]) {
      const seeded = seededOrder(domain, SEED)
      for (const locked of distinctBars(domain).slice(0, 40)) {
        const found = rhythmChangeCandidates({
          domain,
          seeded,
          lockedBars: lockedBarsOf(locked),
          allowedChanges: RHYTHM_CHANGE_KINDS,
        })
        const expected = scannedCandidates(domain, locked, RHYTHM_CHANGE_KINDS)
        expect(new Map(found.map((entry) => [entry.rhythm.candidateIndex, entry.kind]))).toEqual(
          expected,
        )
      }
    }
  })

  it('keeps only the allowed kinds, each pooled with the others', () => {
    const seeded = seededOrder(BUILD, SEED)
    let anyFound = false
    for (const locked of distinctBars(BUILD).slice(0, 40)) {
      const lockedBars = lockedBarsOf(locked)
      const all = rhythmChangeCandidates({
        domain: BUILD,
        seeded,
        lockedBars,
        allowedChanges: RHYTHM_CHANGE_KINDS,
      })
      for (const kind of RHYTHM_CHANGE_KINDS) {
        const only = rhythmChangeCandidates({
          domain: BUILD,
          seeded,
          lockedBars,
          allowedChanges: [kind],
        })
        expect(only.every((entry) => entry.kind === kind)).toBe(true)
        expect(only).toEqual(all.filter((entry) => entry.kind === kind))
        anyFound ||= only.length > 0
      }
    }
    expect(anyFound).toBe(true)
  })

  it('lists the candidates in seeded order, measured from the locked bars', () => {
    const seeded = seededOrder(BUILD, SEED)
    const position = new Map(seeded.map((candidate, index) => [candidate.candidateIndex, index]))
    for (const locked of distinctBars(BUILD).slice(0, 40)) {
      const found = rhythmChangeCandidates({
        domain: BUILD,
        seeded,
        lockedBars: lockedBarsOf(locked),
        allowedChanges: RHYTHM_CHANGE_KINDS,
      })
      const positions = found.map((entry) => position.get(entry.rhythm.candidateIndex)!)
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
      for (const entry of found)
        expect(rhythmChangeBetween(locked.bars, entry.rhythm.bars)?.kind).toBe(entry.kind)
    }
  })

  it('finds locked bars missing from the domain by the bars alone, never by identity', () => {
    const locked = distinctBars(BUILD).find(
      (candidate) => scannedCandidates(BUILD, candidate, RHYTHM_CHANGE_KINDS).size > 0,
    )!
    const found = rhythmChangeCandidates({
      domain: EDGE,
      seeded: seededOrder(EDGE, SEED),
      lockedBars: lockedBarsOf(locked),
      allowedChanges: RHYTHM_CHANGE_KINDS,
    })
    expect(new Map(found.map((entry) => [entry.rhythm.candidateIndex, entry.kind]))).toEqual(
      scannedCandidates(EDGE, locked, RHYTHM_CHANGE_KINDS),
    )
  })
})

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_rhythm_change_kinds]]
describe('the known limit: Strict variety, Straight syncopation, Sixteenth', () => {
  it('finds no change under Conversational or Breath-heavy silence', () => {
    let domains = 0
    for (const silence of ['Conversational', 'Breath-heavy'] as const)
      for (const tension of TENSION_ARCS) {
        const domain = strictStraightSixteenth(silence, tension)
        if (domain === undefined) continue
        domains += 1
        expect(kindsFound(domain)).toEqual(new Set())
      }
    expect(domains).toBeGreaterThan(0)
  })

  it('finds only Add or remove a rest under Sparse silence', () => {
    const kinds = new Set<RhythmChangeKind>()
    for (const tension of TENSION_ARCS) {
      const domain = strictStraightSixteenth('Sparse', tension)
      if (domain === undefined) continue
      for (const kind of kindsFound(domain)) kinds.add(kind)
    }
    expect(kinds).toEqual(new Set(['note_rest']))
  })
})

/** Intent: a locked rhythm of the Build domain with candidates for every allowed kind together. */
function lockedWithChanges(): readonly LockedRhythmMeasure[] {
  const locked = distinctBars(BUILD).find(
    (candidate) => scannedCandidates(BUILD, candidate, RHYTHM_CHANGE_KINDS).size > 0,
  )
  if (!locked) throw new Error('Fixture setup: no locked rhythm of Build offers a change.')
  return lockedBarsOf(locked)
}

/** Intent: the first session phrase seed for which the normal draw says `drawn`. */
function seedWhere(drawn: boolean): Seed {
  const seed = sessionPhraseSeeds(4, 20).find((each) => isRhythmChangeDrawn(each, false) === drawn)
  if (seed === undefined) throw new Error('Fixture setup: no such seed.')
  return seed
}

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_allowed_rhythm_changes]]
// @test-link [[rule_rhythm_change_share]]
describe('the draw', () => {
  const lockedBars = lockedWithChanges()
  const base = { domain: BUILD, lockedBars, tenserPhrase: false }

  it('is not made without an allowed kind', () => {
    for (const seed of [seedWhere(true), seedWhere(false)])
      expect(
        drawRhythmChange({ ...base, seed, seeded: seededOrder(BUILD, seed), allowedChanges: [] }),
      ).toBeUndefined()
  })

  it('says no change when the phrase does not draw one', () => {
    const seed = seedWhere(false)
    expect(
      drawRhythmChange({
        ...base,
        seed,
        seeded: seededOrder(BUILD, seed),
        allowedChanges: RHYTHM_CHANGE_KINDS,
      }),
    ).toEqual({ changes: false })
  })

  it('holds the candidates in seeded order when the phrase draws a change', () => {
    const seed = seedWhere(true)
    const seeded = seededOrder(BUILD, seed)
    const draw = drawRhythmChange({ ...base, seed, seeded, allowedChanges: RHYTHM_CHANGE_KINDS })
    expect(draw).toEqual({
      changes: true,
      candidates: rhythmChangeCandidates({
        domain: BUILD,
        seeded,
        lockedBars,
        allowedChanges: RHYTHM_CHANGE_KINDS,
      }),
    })
    expect(draw?.changes === true && draw.candidates.length).toBeGreaterThan(0)
  })

  it('draws the same change for the same request and seed', () => {
    const seed = seedWhere(true)
    const input = {
      ...base,
      seed,
      seeded: seededOrder(BUILD, seed),
      allowedChanges: RHYTHM_CHANGE_KINDS,
    }
    expect(drawRhythmChange(input)).toEqual(drawRhythmChange(input))
  })
})
