/**
 * The session history's skipped mutations: every `mutation-skipped` output the engine gives is
 * kept in memory, in record order, frozen, beside the phrases and never among them; a skip that
 * names no phrase or mutation, or arrives after the end, is refused.
 */

import { describe, expect, it } from 'vitest'

import { SessionHistoryError, createSessionHistory } from '@/session/session-history'
import type { SessionOutput } from '@/session/session-types'
import { DEFAULT_SESSION_SEED, fixedWallClock, sessionSettings } from './session-harness'

/** Intent: an empty history for a session on the harness settings. */
function emptyHistory() {
  return createSessionHistory(sessionSettings(), fixedWallClock, DEFAULT_SESSION_SEED, 'treble')
}

/** Intent: the skip of mutation `mutationNumber` on phrase `phraseNumber`. */
function skipped(phraseNumber: number, mutationNumber: number): SessionOutput {
  return { kind: 'mutation-skipped', phraseNumber, mutationNumber }
}

// @test-link [[rule_vary_settings_skips_dead_end]]
// @test-link [[service_session_history]]
describe('the session history of skipped mutations', () => {
  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[service_session_history]]
  it('keeps every skipped mutation in record order, frozen, and no phrase for it', () => {
    const history = emptyHistory()
    expect(history.skippedMutations()).toStrictEqual([])
    history.record(skipped(4, 1))
    history.record({ kind: 'wake-at', at: 3 })
    history.record(skipped(7, 2))
    const kept = history.skippedMutations()
    expect(kept).toStrictEqual([
      { phraseNumber: 4, mutationNumber: 1 },
      { phraseNumber: 7, mutationNumber: 2 },
    ])
    expect(Object.isFrozen(kept)).toBe(true)
    expect(Object.isFrozen(kept[0])).toBe(true)
    expect(history.phrases()).toStrictEqual([])
    expect(history.phraseCount).toBe(0)
  })

  // @test-link [[rule_vary_settings_skips_dead_end]]
  it('refuses a skip naming no phrase or mutation, and one after the end', () => {
    for (const [phraseNumber, mutationNumber] of [
      [0, 1],
      [3, 0],
      [2.5, 1],
      [3, Number.NaN],
      [-1, 1],
    ] as const)
      expect(() => emptyHistory().record(skipped(phraseNumber, mutationNumber))).toThrow(
        SessionHistoryError,
      )
    const history = emptyHistory()
    history.record({
      kind: 'ended',
      at: 1,
      cause: 'stop',
      phase: 'count-in',
      soundedPhraseCount: 0,
    })
    expect(() => history.record(skipped(3, 1))).toThrow(SessionHistoryError)
    expect(history.skippedMutations()).toStrictEqual([])
  })
})
