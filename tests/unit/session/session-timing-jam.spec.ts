// @vitest-environment node
/**
 * A fresh Jam's phrase 1 deadline on the session's measure grid: three measures after the
 * generation measure begins, the span a look-ahead phrase gets, with the standalone reserve kept
 * before it as before any deadline.
 */

import { describe, expect, it } from 'vitest'

import {
  JAM_PHRASE_ONE_DEADLINE_MEASURES,
  STANDALONE_RESERVE_SECONDS,
  cutoverAt,
  jamPhraseOneDeadline,
  measureSeconds,
} from '@/session/session-timing'

// @test-link [[rule_jam_phrase_one_deadline]]
describe("a fresh Jam's phrase 1 deadline", () => {
  // @test-link [[rule_jam_phrase_one_deadline]]
  it.each([
    { tempo: 60, seconds: 12 },
    { tempo: 120, seconds: 6 },
    { tempo: 180, seconds: 4 },
    { tempo: 240, seconds: 3 },
  ])(
    'falls three measures after the generation measure begins: $seconds s at $tempo BPM',
    ({ tempo, seconds }) => {
      expect(JAM_PHRASE_ONE_DEADLINE_MEASURES).toBe(3)
      expect(jamPhraseOneDeadline(10, tempo)).toBeCloseTo(10 + seconds, 12)
      expect(jamPhraseOneDeadline(10, tempo)).toBe(10 + 3 * measureSeconds(tempo))
    },
  )

  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('keeps the standalone reserve before it, leaving the first rungs about 2.9 s at 180 BPM', () => {
    const deadline = jamPhraseOneDeadline(0, 180)
    expect(cutoverAt(deadline)).toBeCloseTo(4 - STANDALONE_RESERVE_SECONDS, 12)
    expect(cutoverAt(deadline)).toBeCloseTo(2.925, 12)
  })
})
