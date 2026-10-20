import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIGURE_IDS, FIGURE_LEVEL_IDS, type FigureId } from '@/domain/figures/figure-levels'
import { fnv1a32 } from '@/domain/random/hash32'
import {
  FAVORED_SHARE,
  FIGURE_DRAW_DOMAIN,
  FIGURE_DRAW_SHARE_BITS,
  STRONGLY_FAVORED_SHARE,
  isFavoredLevel,
  isFigureDrawn,
} from '@/domain/pitch/figure-draw'

// The real hash, wrapped in a spy, so a test can see whether a draw hashed anything.
vi.mock('@/domain/random/hash32', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/random/hash32')>()
  return { ...actual, fnv1a32: vi.fn(actual.fnv1a32) }
})

const GOLDEN_SEEDS = [0, 1, 7, 13, 42, 2147483647, 4294967295] as const
const GOLDEN_NOTES = ['0:0', '0:4', '1:8', '2:6', '3:12'] as const

// Pinned once from the implementation, then hard-coded: changing them changes every replay.
const GOLDEN_RAW_0_00_PASSING = 22538
const GOLDEN_RAW_1_04_NEIGHBOR = 26694
const GOLDEN_RAW_42_18_ACCENTED = 12988
const GOLDEN_RAW_MAX31 = 37583
const GOLDEN_RAW_MAX32 = 48708

// One line per golden seed; per note (space-separated), one digit per figure in FIGURE_IDS order.
const GOLDEN_FAVORED = [
  '0110001 0000100 0100001 0111011 0000001',
  '0001100 1001100 0000100 1100100 0000000',
  '1101000 0000001 0000001 0100000 1000000',
  '1100100 0100000 0110110 0001100 1000010',
  '0010101 1000000 1100000 0000001 1100011',
  '0000100 1000000 0001000 0001101 0000100',
  '1000010 0010010 0000000 0100010 0101110',
]
const GOLDEN_STRONGLY_FAVORED = [
  '1110101 0001100 1100011 0111011 0001001',
  '0001110 1011110 0010101 1111110 0000110',
  '1111000 0001001 0001101 0111110 1001111',
  '1101100 0100101 1110111 0011110 1101010',
  '0011101 1011001 1110000 0100101 1101011',
  '0100101 1000000 0011000 0111101 0110101',
  '1010011 1010010 0000010 1100010 0111110',
]

/** An independent FNV-1a 32-bit reference over UTF-16 code units, in BigInt arithmetic. */
function referenceFnv1a32(input: string): number {
  let hash = 0x811c9dc5n
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index))
    hash = (hash * 0x01000193n) & 0xffffffffn
  }
  return Number(hash)
}

/** The reference 16-bit draw value of one (seed, note, figure): the top 16 bits of the hash. */
function referenceDrawValue(seed: number, note: string, figure: FigureId): number {
  return referenceFnv1a32(`infinite-flow/figure-draw/v1|${seed}|${note}|${figure}`) >>> 16
}

/** One seed's draws at a level: per note, one 0/1 digit per figure in FIGURE_IDS order. */
function drawPattern(seed: number, level: 'favored' | 'stronglyFavored'): string {
  return GOLDEN_NOTES.map((note) =>
    FIGURE_IDS.map((figure) => (isFigureDrawn(seed, note, figure, level) ? '1' : '0')).join(''),
  ).join(' ')
}

/** The 64 note identities of one phrase's sixteenth-note grid, spelled as bar:tick. */
const GRID_NOTES = Array.from({ length: 64 }, (_, index) => `${index >>> 4}:${index & 15}`)

/** `count` distinct (seed, note, figure) triples: seed by seed, note by note, figure by figure. */
function triples(count: number): { seed: number; note: string; figure: FigureId }[] {
  const perSeed = GRID_NOTES.length * FIGURE_IDS.length
  return Array.from({ length: count }, (_, index) => {
    const within = index % perSeed
    return {
      seed: Math.floor(index / perSeed),
      note: GRID_NOTES[Math.floor(within / FIGURE_IDS.length)]!,
      figure: FIGURE_IDS[within % FIGURE_IDS.length]!,
    }
  })
}

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_draws_reproducible]]
describe('figure-draw: golden draws', () => {
  it('matches an independent BigInt FNV-1a reference on every golden input', () => {
    for (const seed of GOLDEN_SEEDS)
      for (const note of GOLDEN_NOTES)
        for (const figure of FIGURE_IDS) {
          const key = `${FIGURE_DRAW_DOMAIN}|${seed}|${note}|${figure}`
          expect(fnv1a32(key)).toBe(referenceFnv1a32(key))
        }
  })

  it('pins the raw 16-bit draw values of a handful of cases', () => {
    expect(referenceDrawValue(0, '0:0', 'passingTone')).toBe(GOLDEN_RAW_0_00_PASSING)
    expect(referenceDrawValue(1, '0:4', 'neighborTone')).toBe(GOLDEN_RAW_1_04_NEIGHBOR)
    expect(referenceDrawValue(42, '1:8', 'accentedPassingTone')).toBe(GOLDEN_RAW_42_18_ACCENTED)
    expect(referenceDrawValue(2147483647, '2:6', 'chromaticApproach')).toBe(GOLDEN_RAW_MAX31)
    expect(referenceDrawValue(4294967295, '3:12', 'chromaticEnclosure')).toBe(GOLDEN_RAW_MAX32)
  })

  it('draws exactly when the reference draw value falls under the level share', () => {
    for (const seed of GOLDEN_SEEDS)
      for (const note of GOLDEN_NOTES)
        for (const figure of FIGURE_IDS) {
          const value = referenceDrawValue(seed, note, figure)
          expect(isFigureDrawn(seed, note, figure, 'favored')).toBe(value < FAVORED_SHARE)
          expect(isFigureDrawn(seed, note, figure, 'stronglyFavored')).toBe(
            value < STRONGLY_FAVORED_SHARE,
          )
        }
  })

  it('pins the full draw pattern at Favored and Strongly favored', () => {
    expect(GOLDEN_SEEDS.map((seed) => drawPattern(seed, 'favored'))).toEqual(GOLDEN_FAVORED)
    expect(GOLDEN_SEEDS.map((seed) => drawPattern(seed, 'stronglyFavored'))).toEqual(
      GOLDEN_STRONGLY_FAVORED,
    )
  })
})

// @test-link [[module_favored_figure_draw]]
describe('figure-draw: no draw at Off and As today', () => {
  beforeEach(() => {
    vi.mocked(fnv1a32).mockClear()
  })

  it('never draws a figure at Off or As today, and computes no hash there', () => {
    for (const level of ['off', 'asToday'] as const)
      for (const { seed, note, figure } of triples(700))
        expect(isFigureDrawn(seed, note, figure, level)).toBe(false)
    expect(fnv1a32).not.toHaveBeenCalled()
    isFigureDrawn(0, '0:0', 'passingTone', 'favored')
    expect(fnv1a32).toHaveBeenCalledTimes(1)
  })

  it('names Favored and Strongly favored, and only them, as favored levels', () => {
    expect(FIGURE_LEVEL_IDS.filter(isFavoredLevel)).toEqual(['favored', 'stronglyFavored'])
  })
})

// @test-link [[module_favored_figure_draw]]
describe('figure-draw: the shares', () => {
  it('draws at Strongly favored every figure drawn at Favored', () => {
    for (const { seed, note, figure } of triples(4000))
      if (isFigureDrawn(seed, note, figure, 'favored'))
        expect(isFigureDrawn(seed, note, figure, 'stronglyFavored')).toBe(true)
  })

  it('draws about 1 in 4 at Favored and 1 in 2 at Strongly favored', () => {
    const list = triples(20_000)
    const favored = list.filter((t) => isFigureDrawn(t.seed, t.note, t.figure, 'favored'))
    const strongly = list.filter((t) => isFigureDrawn(t.seed, t.note, t.figure, 'stronglyFavored'))
    expect(Math.abs(favored.length / list.length - 0.25)).toBeLessThanOrEqual(0.02)
    expect(Math.abs(strongly.length / list.length - 0.5)).toBeLessThanOrEqual(0.02)
  })

  it('keeps both shares whole numerators over 2^16, Strongly favored never below Favored', () => {
    expect(FIGURE_DRAW_SHARE_BITS).toBe(16)
    for (const share of [FAVORED_SHARE, STRONGLY_FAVORED_SHARE]) {
      expect(Number.isInteger(share)).toBe(true)
      expect(share).toBeGreaterThan(0)
      expect(share).toBeLessThanOrEqual(2 ** FIGURE_DRAW_SHARE_BITS)
    }
    expect(FAVORED_SHARE).toBeLessThanOrEqual(STRONGLY_FAVORED_SHARE)
    expect(FIGURE_DRAW_DOMAIN).toBe('infinite-flow/figure-draw/v1')
  })
})

/** The draw module's source with comments and string and template literals removed. */
function codeOnly(): string {
  const source = readFileSync(resolve(process.cwd(), 'src/domain/pitch/figure-draw.ts'), 'utf8')
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    ' ',
  )
}

// @test-link [[module_favored_figure_draw]]
// @test-link [[rule_figure_draws_reproducible]]
describe('figure-draw: whole-number operations only', () => {
  it('holds no floating-point operation, and draws with an unsigned shift and a mask', () => {
    const code = codeOnly()
    for (const forbidden of [/\//, /\*/, /%/, /Math\./, /parseFloat/, /Number\(/, /toFixed/])
      expect(code).not.toMatch(forbidden)
    expect(code).not.toMatch(/\d\.\d|\.\d/)
    expect(code).toContain('>>>')
    expect(code).toMatch(/[^&]&[^&]/)
  })
})
