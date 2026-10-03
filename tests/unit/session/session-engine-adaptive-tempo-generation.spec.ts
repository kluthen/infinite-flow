// @vitest-environment node
/**
 * Adaptive tempo never reaches generation. Property over provider seeds, starting tempos and
 * scripted sessions (attempt failures, controller losses, the settings-mutation flag on or off):
 * with the same start and the same generation and fit results, a session with adaptive tempo
 * requests exactly the intents, with exactly the replay keys, and readies exactly the phrases of
 * the same session without it, while its own tempo rises. A risen session's intent round-trips
 * through its replay key.
 */

import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { SETTINGS_MUTATION_OFF, type SettingsMutationFlag } from '@/session/settings-mutation'
import { queuedProviders, type SessionDriver } from './session-harness'
import {
  driveTempoSession,
  phraseTempoOf,
  tempoDriver,
  tempoMap,
  type TempoScript,
} from './tempo-session'

/** The first seed of each run's queued providers, one session per seed. */
const PROVIDER_SEEDS = [3000, 4100, 5200, 6300] as const

/** The starting tempos the property runs over. */
const STARTING_TEMPOS = [60, 120, 200] as const

/** How many phrases each scripted session sounds. */
const SOUNDED = 9

/** The scripted sessions: a smooth one, and one with failures and controller losses. */
const SCRIPTS: readonly { readonly name: string; readonly script: TempoScript }[] = [
  { name: 'smooth', script: {} },
  {
    name: 'failures and losses',
    script: {
      failFirst: (phraseNumber) => phraseNumber % 3 === 0,
      controller: [
        { during: 0, measures: 0.25, attached: false },
        { during: 1, measures: 1, attached: true },
        { during: 4, measures: 3.5, attached: false },
        { during: 6, measures: 1, attached: true },
      ],
    },
  },
]

/** Generous timeout for the property, which generates whole sessions. */
const PROPERTY_TIMEOUT_MS = 60_000

/** Intent: the mutation flag of the run for the provider seed at `index`: on every other one. */
function mutationFor(index: number): SettingsMutationFlag {
  return index % 2 === 0 ? SETTINGS_MUTATION_OFF : { kind: 'on', seed: makeSeed(17 + index) }
}

/** Intent: one scripted session, adaptive tempo on or off, everything else equal. */
function run(
  index: number,
  tempo: number,
  script: TempoScript,
  adaptiveTempo: boolean,
): SessionDriver {
  const driver = tempoDriver({
    tempo,
    adaptiveTempo,
    providers: queuedProviders(PROVIDER_SEEDS[index]!, 120),
    mutation: mutationFor(index),
    phraseOneSeed: 11 + index,
  })
  driveTempoSession(driver, SOUNDED, script)
  return driver
}

/**
 * Intent: what a session asked generation for: each request with its replay key, without its
 * deadline, the one field the tempo sets.
 */
function requested(driver: SessionDriver): readonly unknown[] {
  return driver.requests().map(({ deadline, ...request }) => {
    void deadline
    return { ...request, replayKey: encodePhraseReplayKey(request.intent, request.phraseNumber) }
  })
}

// @test-link [[rule_tempo_never_affects_generation]]
// @test-link [[req_adaptive_tempo]]
describe('adaptive tempo and generation', () => {
  // @test-link [[rule_tempo_never_affects_generation]]
  // @test-link [[req_adaptive_tempo]]
  it(
    'requests the same intents and replay keys and readies the same phrases with it on or off',
    () => {
      for (const [index] of PROVIDER_SEEDS.entries()) {
        for (const tempo of STARTING_TEMPOS) {
          for (const { name, script } of SCRIPTS) {
            const label = `seed ${PROVIDER_SEEDS[index]}, ${tempo} BPM, ${name}`
            const off = run(index, tempo, script, false)
            const on = run(index, tempo, script, true)
            expect(phraseTempoOf(on, SOUNDED + 1), label).toBeGreaterThan(tempo)
            expect(new Set(tempoMap(off, SOUNDED + 1)), label).toEqual(new Set([tempo]))
            expect(requested(on), label).toEqual(requested(off))
            expect(on.all('phrase-ready'), label).toEqual(off.all('phrase-ready'))
            expect(on.all('settings-changed'), label).toEqual(off.all('settings-changed'))
          }
        }
      }
    },
    PROPERTY_TIMEOUT_MS,
  )

  // @test-link [[rule_tempo_never_affects_generation]]
  it('round-trips the intent of a phrase requested after a rise through its replay key', () => {
    const on = run(0, 120, {}, true)
    const request = on.requests(7)[0]!
    expect(phraseTempoOf(on, 6)).toBe(130)
    expect(request.intent.controls.tempo).toBe(120)
    const decoded = decodePhraseReplayKey(encodePhraseReplayKey(request.intent, 7))
    expect(decoded.intent).toEqual(request.intent)
    expect(decoded.phraseNumber).toBe(7)
  })
})
