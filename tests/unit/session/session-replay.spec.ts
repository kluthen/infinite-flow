// @vitest-environment node
/**
 * Replaying sessions from their inputs: the same start (mutation seed included) and the same
 * timed events give deep-equal outputs, the mutations depend only on the start and the phrase
 * numbers, and a phrase requested after a key or collection mutation (its carried harmony
 * dropped) round-trips through its replay key and replays to the same generation.
 */

import { describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { mutationPhrase, type SettingsMutationFlag } from '@/session/settings-mutation'
import type { SessionDriver } from './session-harness'
import { driveSession, fastDriver, settingsChanges } from './scripted-session'

/** How many mutation seeds the replay property runs over. */
const REPLAYED_SEEDS = 50

/** Generous timeout for the tests that generate whole sessions for every replayed seed. */
const SESSIONS_TIMEOUT_MS = 60_000

/** Intent: the flag on with a numeric mutation seed. */
function mutationOn(seed: number): SettingsMutationFlag {
  return { kind: 'on', seed: makeSeed(seed) }
}

/** Intent: the mutations a session logged: where each landed and what it stepped. */
function mutationSeries(driver: SessionDriver): readonly unknown[] {
  return settingsChanges(driver).map((change) =>
    change.cause === 'mutation'
      ? [change.phraseNumber, change.setting, change.from, change.to, change.settings]
      : change,
  )
}

// @test-link [[rule_mutation_lands_on_scheduled_phrase]]
// @test-link [[req_settings_mutation_flag]]
// @test-link [[service_session_engine]]
describe('a session replayed from its inputs', () => {
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  // @test-link [[service_session_engine]]
  it(
    `gives deep-equal outputs for the same start and events (${REPLAYED_SEEDS} mutation seeds)`,
    () => {
      for (let seed = 1; seed <= REPLAYED_SEEDS; seed += 1) {
        const first = fastDriver({ mutation: mutationOn(seed) })
        const second = fastDriver({ mutation: mutationOn(seed) })
        driveSession(first, 10)
        driveSession(second, 10)
        expect(second.log).toEqual(first.log)
        expect(settingsChanges(first).length).toBeGreaterThan(0)
      }
    },
    SESSIONS_TIMEOUT_MS,
  )

  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  // @test-link [[req_settings_mutation_flag]]
  it(
    'makes the same mutations on the same phrases whatever happens to the attempts',
    () => {
      for (let seed = 1; seed <= REPLAYED_SEEDS; seed += 1) {
        const smooth = fastDriver({ mutation: mutationOn(seed) })
        const bumpy = fastDriver({ mutation: mutationOn(seed) })
        driveSession(smooth, 10)
        driveSession(bumpy, 10, (phraseNumber) => phraseNumber % 3 === 0)
        expect(bumpy.log).not.toEqual(smooth.log)
        expect(mutationSeries(bumpy)).toEqual(mutationSeries(smooth))
      }
    },
    SESSIONS_TIMEOUT_MS,
  )
})

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_key_change_drops_harmonic_carry_in]]
describe('the replay key of a phrase requested after a key or collection mutation', () => {
  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_key_change_drops_harmonic_carry_in]]
  it.each([
    { seed: 16, setting: 'tonalCenter' },
    { seed: 46, setting: 'tonalCenter' },
    { seed: 40, setting: 'collection' },
    { seed: 44, setting: 'collection' },
  ])(
    'round-trips the intent and replays it identically ($setting, seed $seed)',
    ({ seed, setting }) => {
      const driver = fastDriver({ mutation: mutationOn(seed) })
      const landing = mutationPhrase(makeSeed(seed), 1)
      driveSession(driver, landing - 1)
      expect(settingsChanges(driver)[0]).toMatchObject({ phraseNumber: landing, setting })
      const request = driver.requests(landing)[0]!
      expect(request.step).toBe('carry-in')
      expect(request.intent.carryIn?.finalHarmony).toBeNull()
      const key = encodePhraseReplayKey(request.intent, landing)
      const decoded = decodePhraseReplayKey(key)
      expect(decoded.intent).toEqual(request.intent)
      expect(decoded.phraseNumber).toBe(landing)
      const report = replayPhraseKey(key)
      if (report.output.kind === 'crash')
        throw new Error(`Replay crashed: ${report.output.message}`)
      expect(JSON.stringify(report.output.raw)).toBe(JSON.stringify(generatePhrase(request.intent)))
    },
  )
})
