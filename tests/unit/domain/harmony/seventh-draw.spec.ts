import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHORD_FAMILY_LEVEL_IDS } from '@/domain/chords/chord-families'
import { COLLECTIONS, HARMONIC_MOTIONS, TENSION_ARCS } from '@/domain/controls/generation-controls'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import {
  FAVORED_SEVENTH_SHARE,
  SEVENTH_DRAW_DOMAIN,
  SEVENTH_DRAW_SHARE_BITS,
  SOMETIMES_SEVENTH_SHARE,
  isSeventhDrawn,
  seventhDrawByte,
  type SeventhDrawPosition,
} from '@/domain/harmony/seventh-draw'
import { fnv1a32 } from '@/domain/random/hash32'
import { encodeSeed, makeSeed } from '@/domain/random/seed'

// The real hash, wrapped in a spy, so a test can see whether a draw hashed anything.
vi.mock('@/domain/random/hash32', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/random/hash32')>()
  return { ...actual, fnv1a32: vi.fn(actual.fnv1a32) }
})

/** The eight places a harmony event can start: each bar's beat 0 and beat 2. */
const POSITIONS: readonly SeventhDrawPosition[] = ([0, 1, 2, 3] as const).flatMap((barIndex) =>
  ([0, 2] as const).map((startBeat) => ({ barIndex, startBeat })),
)

// Pinned once from an independent script, then hard-coded: changing them changes every replay.
// Per seed, the draw's low byte at each of POSITIONS, in order.
const GOLDEN_BYTES: ReadonlyArray<readonly [number, readonly number[]]> = [
  [0, [150, 112, 217, 179, 136, 174, 83, 121]],
  [1, [9, 227, 198, 160, 131, 169, 184, 222]],
  [7, [239, 21, 164, 202, 245, 207, 178, 140]],
  [42, [7, 45, 220, 2, 13, 231, 202, 164]],
  [123456789, [249, 211, 54, 16, 243, 25, 40, 78]],
  [4294967295, [38, 0, 105, 67, 24, 62, 99, 137]],
]
// Per seed, one digit per position: 1 where the event is drawn at Sometimes, then at Favored.
const GOLDEN_SOMETIMES = ['00000000', '10000000', '01000000', '11011000', '00110110', '11001100']
const GOLDEN_FAVORED = ['01000011', '10000000', '01000000', '11011000', '00110111', '11111110']

/** An independent FNV-1a 32-bit reference over UTF-16 code units, in BigInt arithmetic. */
function referenceFnv1a32(input: string): number {
  let hash = 0x811c9dc5n
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index))
    hash = (hash * 0x01000193n) & 0xffffffffn
  }
  return Number(hash)
}

/** Intent: the drawn digits of one seed at one level, over POSITIONS. */
function drawnDigits(level: 'sometimes' | 'favored', seed: number): string {
  return POSITIONS.map((position) =>
    isSeventhDrawn(level, makeSeed(seed), position) ? '1' : '0',
  ).join('')
}

/** Every harmony event of every candidate plan, over every mode, motion and tension. */
function everyPlannedEvent(): readonly HarmonyEvent[] {
  const inputs = COLLECTIONS.flatMap((collection) =>
    HARMONIC_MOTIONS.flatMap((harmonicMotion) =>
      TENSION_ARCS.map((tensionArc) => ({ collection, harmonicMotion, tensionArc })),
    ),
  )
  return inputs.flatMap((input) => {
    const domain = makeHarmonyCandidateDomain({ tonalCenter: 'D', ...input })
    if (domain.kind !== 'harmony_candidate_domain') return []
    return domain.candidates.flatMap((candidate) => candidate.events)
  })
}

beforeEach(() => {
  vi.mocked(fnv1a32).mockClear()
})

// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('the seventh-chord draw: golden draws', () => {
  it('hashes the versioned domain, the seed and the event start, and reads the low byte', () => {
    for (const [seed, bytes] of GOLDEN_BYTES) {
      const read = POSITIONS.map((position) => seventhDrawByte(makeSeed(seed), position))
      expect(read, `seed ${seed}`).toEqual(bytes)
      const reference = POSITIONS.map(
        ({ barIndex, startBeat }) =>
          referenceFnv1a32(
            `infinite-flow/seventh-chord/v1|${encodeSeed(makeSeed(seed))}|${barIndex}|${startBeat}`,
          ) & 0xff,
      )
      expect(read, `seed ${seed} against the reference hash`).toEqual(reference)
    }
  })

  it('draws the golden events at Sometimes and at Favored', () => {
    GOLDEN_BYTES.forEach(([seed], index) => {
      expect(drawnDigits('sometimes', seed), `seed ${seed}`).toBe(GOLDEN_SOMETIMES[index])
      expect(drawnDigits('favored', seed), `seed ${seed}`).toBe(GOLDEN_FAVORED[index])
    })
  })

  it('names its versioned domain and two shares over 256, Sometimes below Favored', () => {
    expect(SEVENTH_DRAW_DOMAIN).toBe('infinite-flow/seventh-chord/v1')
    expect(SEVENTH_DRAW_SHARE_BITS).toBe(8)
    expect([SOMETIMES_SEVENTH_SHARE, FAVORED_SEVENTH_SHARE]).toEqual([64, 128])
  })
})

// @test-link [[rule_seventh_chords_level_steps]]
// @test-link [[rule_seventh_chords_off_changes_nothing]]
describe('the seventh-chord draw: what each level computes', () => {
  it('draws nothing at Off and computes no hash', () => {
    for (const [seed] of GOLDEN_BYTES)
      for (const position of POSITIONS)
        expect(isSeventhDrawn('off', makeSeed(seed), position)).toBe(false)
    expect(fnv1a32).not.toHaveBeenCalled()
  })

  it('draws every event at Strongly favored, without hashing', () => {
    for (const [seed] of GOLDEN_BYTES)
      for (const position of POSITIONS)
        expect(isSeventhDrawn('stronglyFavored', makeSeed(seed), position)).toBe(true)
    expect(fnv1a32).not.toHaveBeenCalled()
  })

  it('hashes once per event at Sometimes and at Favored', () => {
    isSeventhDrawn('sometimes', makeSeed(3), POSITIONS[0]!)
    isSeventhDrawn('favored', makeSeed(3), POSITIONS[1]!)
    expect(fnv1a32).toHaveBeenCalledTimes(2)
  })

  it('never draws fewer events a step up: Sometimes within Favored within Strongly favored', () => {
    const counts = { off: 0, sometimes: 0, favored: 0, stronglyFavored: 0 }
    for (let seed = 0; seed < 4000; seed += 1)
      for (const position of POSITIONS) {
        const drawn = CHORD_FAMILY_LEVEL_IDS.map((level) =>
          isSeventhDrawn(level, makeSeed(seed), position),
        )
        CHORD_FAMILY_LEVEL_IDS.forEach((level, index) => {
          if (drawn[index]) counts[level] += 1
        })
        for (let index = 1; index < drawn.length; index += 1)
          if (drawn[index - 1]) expect(drawn[index]).toBe(true)
      }
    const events = 4000 * POSITIONS.length
    expect(counts.off).toBe(0)
    expect(counts.sometimes / events).toBeGreaterThan(0.23)
    expect(counts.sometimes / events).toBeLessThan(0.27)
    expect(counts.favored / events).toBeGreaterThan(0.48)
    expect(counts.favored / events).toBeLessThan(0.52)
    expect(counts.stronglyFavored).toBe(events)
  })
})

// @test-link [[rule_seventh_chance_same_at_every_degree]]
describe('the seventh-chord draw: the same chance at every degree', () => {
  it('reads only where an event starts, never its degree, chord or role', () => {
    const events = everyPlannedEvent()
    const degrees = new Set(events.map((event) => event.triad.degree))
    const roles = new Set(events.map((event) => event.role))
    expect(degrees.size).toBe(7)
    expect(roles.size).toBeGreaterThan(3)
    for (const level of ['sometimes', 'favored'] as const)
      for (let seed = 0; seed < 64; seed += 1) {
        const byStart = new Map<string, boolean>()
        for (const event of events) {
          const drawn = isSeventhDrawn(level, makeSeed(seed), event)
          const start = `${event.barIndex}:${event.startBeat}`
          expect(byStart.get(start) ?? drawn, `${level} seed ${seed} at ${start}`).toBe(drawn)
          byStart.set(start, drawn)
        }
      }
  })

  it('gives every degree about the same share at Sometimes, over many seeds', () => {
    const events = everyPlannedEvent()
    const tally = new Map<number, { drawn: number; total: number }>()
    for (let seed = 0; seed < 400; seed += 1)
      for (const event of events) {
        const entry = tally.get(event.triad.degree) ?? { drawn: 0, total: 0 }
        entry.total += 1
        if (isSeventhDrawn('sometimes', makeSeed(seed), event)) entry.drawn += 1
        tally.set(event.triad.degree, entry)
      }
    for (const [degree, { drawn, total }] of tally) {
      expect(drawn / total, `degree ${degree}`).toBeGreaterThan(0.2)
      expect(drawn / total, `degree ${degree}`).toBeLessThan(0.3)
    }
  })
})

/** The draw module's source with comments and string and template literals removed. */
function codeOnly(): string {
  const source = readFileSync(resolve(process.cwd(), 'src/domain/harmony/seventh-draw.ts'), 'utf8')
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    ' ',
  )
}

// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('the seventh-chord draw: whole-number operations only', () => {
  it('holds no floating-point operation, and draws with an unsigned shift and a mask', () => {
    const code = codeOnly()
    for (const forbidden of [/\//, /\*/, /%/, /Math\./, /parseFloat/, /Number\(/, /toFixed/])
      expect(code).not.toMatch(forbidden)
    expect(code).not.toMatch(/\d\.\d|\.\d/)
    expect(code).toContain('>>>')
    expect(code).toMatch(/[^&]&[^&]/)
    expect(code).toContain('fnv1a32(')
  })
})
