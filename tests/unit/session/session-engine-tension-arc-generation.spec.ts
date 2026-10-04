// @vitest-environment node
/**
 * The multi-phrase tension arc with real generation, over seeded sessions: with the
 * settings-mutation flag on too, each phrase steps around the tension arc then in effect while
 * every settings-changed output keeps the unstepped value; the same seeds give the same session;
 * a stepped phrase round-trips through its replay key and replays identically; and every join
 * across a step stays valid, its carried harmony kept only when it fits the stepped tension arc.
 */

import { describe, expect, it } from 'vitest'

import { TENSION_ARCS, type TensionArc } from '@/domain/controls/generation-controls'
import { carriedHarmonyFits } from '@/domain/generation/carry-in/carry-in-fit'
import { makeSeed } from '@/domain/random/seed'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import { carryInAfter } from '@/session/failure-ladder'
import type { SessionPhrase, SessionSettings } from '@/session/session-types'
import { SETTINGS_MUTATION_OFF, type SettingsMutationFlag } from '@/session/settings-mutation'
import { steppedTensionArc } from '@/session/tension-arc-cycle'
import { SessionDriver, phraseOneFor, queuedProviders, sessionSettings } from './session-harness'
import { FAST_TEMPO, driveSession, settingsChanges, settingsFor } from './scripted-session'

/** How many phrases each session sounds; phrases 2 to `SOUNDED + 1` are requested. */
const SOUNDED = 12

/** The mutation seeds of the sessions with both flags on. */
const MUTATION_SEEDS = Array.from({ length: 40 }, (_, index) => index + 1)

/** The provider seeds of the join property, one session per seed and starting tension arc. */
const JOIN_PROVIDER_SEEDS = [3000, 4100, 5200, 6300, 7400, 8500, 9600, 10700] as const

/** Generous timeout for the tests that generate whole sessions for many seeds. */
const SESSIONS_TIMEOUT_MS = 60_000

/** Intent: the flag on with a numeric mutation seed. */
function mutationOn(seed: number): SettingsMutationFlag {
  return { kind: 'on', seed: makeSeed(seed) }
}

/** What an arc session starts from. */
interface ArcRun {
  readonly tension: TensionArc
  readonly mutation: SettingsMutationFlag
  readonly firstSeed?: number
}

/** Intent: a fast session with the arc on, driven until phrase `SOUNDED` has started sounding. */
function arcSession({ tension, mutation, firstSeed }: ArcRun): SessionDriver {
  const settings = sessionSettings({ tempo: FAST_TEMPO, tension })
  const driver = new SessionDriver({
    at: 0,
    settings,
    phraseOne: phraseOneFor(settings),
    providers: queuedProviders(firstSeed, 120),
    mutation,
    multiPhraseTensionArc: true,
  })
  driveSession(driver, SOUNDED)
  return driver
}

/** Intent: the chosen tension arc of the session for a mutation seed, cycling through all four. */
function tensionFor(seed: number): TensionArc {
  return TENSION_ARCS[seed % TENSION_ARCS.length]!
}

/** Intent: the tension arc in effect for a phrase, from the session's settings-changed outputs. */
function tensionInEffect(driver: SessionDriver, phraseNumber: number): TensionArc {
  return settingsInEffect(driver, phraseNumber).controls.tension
}

/** Intent: the settings in effect for a phrase, from the session's settings-changed outputs. */
function settingsInEffect(driver: SessionDriver, phraseNumber: number): SessionSettings {
  const changes = settingsChanges(driver).filter((change) => change.phraseNumber <= phraseNumber)
  return changes.at(-1)?.settings ?? driver.settings
}

/** Intent: the latest decided phrase of each number, phrase 1 the Idle one, by phrase number. */
function decidedPhrases(driver: SessionDriver): ReadonlyMap<number, SessionPhrase> {
  const decided = new Map<number, SessionPhrase>()
  for (const output of driver.all('phrase-sounding'))
    if (output.phrase.phraseNumber === 1) decided.set(1, output.phrase)
  for (const output of driver.all('phrase-ready'))
    decided.set(output.phrase.phraseNumber, output.phrase)
  return decided
}

// @test-link [[rule_multi_phrase_tension_arc_cycle]]
// @test-link [[module_tension_arc_cycle]]
// @test-link [[req_multi_phrase_tension_arc]]
describe('the multi-phrase tension arc with the settings-mutation flag on', () => {
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it(
    `steps each phrase around the tension arc then in effect (${MUTATION_SEEDS.length} seeds)`,
    () => {
      let tensionMutations = 0
      let steppedFromMutated = 0
      for (const seed of MUTATION_SEEDS) {
        const chosen = tensionFor(seed)
        const driver = arcSession({ tension: chosen, mutation: mutationOn(seed) })
        expect(settingsChanges(driver).length, `seed ${seed}`).toBeGreaterThan(0)
        for (const change of settingsChanges(driver)) {
          expect(change.cause).toBe('mutation')
          if (change.cause !== 'mutation') continue
          const before = tensionInEffect(driver, change.phraseNumber - 1)
          const shown = change.setting === 'tension' ? change.to : before
          expect(change.settings.controls.tension, `seed ${seed}`).toBe(shown)
          if (change.setting === 'tension') tensionMutations += 1
        }
        for (const request of driver.requests()) {
          const label = `seed ${seed}, request ${request.attemptId}, phrase ${request.phraseNumber}`
          const settings = settingsFor(driver, request)
          const inEffect = settings.controls.tension
          const stepped = steppedTensionArc(inEffect, request.phraseNumber)
          expect(request.intent.controls, label).toEqual({ ...settings.controls, tension: stepped })
          if (inEffect !== chosen && stepped !== inEffect) steppedFromMutated += 1
        }
      }
      expect(tensionMutations).toBeGreaterThan(0)
      expect(steppedFromMutated).toBeGreaterThan(0)
    },
    SESSIONS_TIMEOUT_MS,
  )

  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  // @test-link [[module_tension_arc_cycle]]
  it(
    'gives deep-equal outputs for the same seeds and events',
    () => {
      for (const seed of MUTATION_SEEDS.slice(0, 6)) {
        const run = { tension: tensionFor(seed), mutation: mutationOn(seed) }
        expect(arcSession(run).log, `seed ${seed}`).toEqual(arcSession(run).log)
      }
    },
    SESSIONS_TIMEOUT_MS,
  )
})

// @test-link [[module_tension_arc_cycle]]
// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('the replay key of a phrase generated with a stepped tension arc', () => {
  // @test-link [[module_tension_arc_cycle]]
  // @test-link [[module_phrase_replay_key]]
  // @test-link [[rule_seeded_phrase_reproduction]]
  it.each([
    { tension: 'Settled', stepped: ['Lift'] },
    { tension: 'Lift', stepped: ['Build', 'Settled'] },
    { tension: 'Build', stepped: ['Edge', 'Lift'] },
    { tension: 'Edge', stepped: ['Build'] },
  ] as const)(
    'holds the stepped tension arc and replays the phrase as generated ($tension)',
    ({ tension, stepped }) => {
      const driver = arcSession({ tension, mutation: SETTINGS_MUTATION_OFF })
      const phrases = [...decidedPhrases(driver).values()].filter(
        (phrase) => phrase.origin !== 'repeat' && phrase.intent.controls.tension !== tension,
      )
      expect(new Set(phrases.map((phrase) => phrase.intent.controls.tension))).toEqual(
        new Set(stepped),
      )
      for (const phrase of phrases) {
        const key = encodePhraseReplayKey(phrase.intent, phrase.phraseNumber)
        const decoded = decodePhraseReplayKey(key)
        expect(decoded.intent).toEqual(phrase.intent)
        expect(decoded.phraseNumber).toBe(phrase.phraseNumber)
        expect(stepped).toContain(decoded.intent.controls.tension)
        const report = replayPhraseKey(key)
        if (report.output.kind === 'crash')
          throw new Error(`Replay crashed: ${report.output.message}`)
        expect(JSON.stringify(report.output.raw)).toBe(JSON.stringify(phrase.outcome))
      }
    },
    SESSIONS_TIMEOUT_MS,
  )
})

/** How the joins of the matrix went, counted over every session. */
interface JoinCounts {
  carriedIn: number
  steppedJoins: number
  harmonyKept: number
  harmonyDropped: number
}

/** Intent: true when two phrases share their tonal center and collection. */
function sameKey(before: SessionPhrase, after: SessionPhrase): boolean {
  const { tonalCenter, collection } = before.intent.controls
  return (
    tonalCenter === after.intent.controls.tonalCenter &&
    collection === after.intent.controls.collection
  )
}

/**
 * Intent: check every carried-in phrase of a session: its result passes the generation-result
 * validation, join included, and across a join whose tension arc changed, a carried harmony fits
 * the receiving intent, and one dropped with the key unchanged does not. Counts the joins into
 * `counts`.
 */
function checkJoins(driver: SessionDriver, counts: JoinCounts, label: string): void {
  const decided = decidedPhrases(driver)
  for (const phrase of decided.values()) {
    const carryIn = phrase.intent.carryIn
    if (phrase.origin === 'repeat' || carryIn === undefined) continue
    counts.carriedIn += 1
    const where = `${label}, phrase ${phrase.phraseNumber}`
    const { request, result, provenance } = phrase.outcome
    const verdict = validateGenerationResult({ intent: phrase.intent, request, result, provenance })
    expect(verdict, where).toEqual({ kind: 'valid_generation_result' })
    const previous = decided.get(phrase.phraseNumber - 1)
    if (previous === undefined) throw new Error(`${where} has no decided phrase before it.`)
    if (previous.intent.controls.tension === phrase.intent.controls.tension) continue
    counts.steppedJoins += 1
    if (carryIn.finalHarmony === null) {
      const carried = carryInAfter(previous).finalHarmony
      if (carried === null) continue
      counts.harmonyDropped += 1
      if (sameKey(previous, phrase))
        expect(carriedHarmonyFits(carried, phrase.intent), where).toBe(false)
      continue
    }
    counts.harmonyKept += 1
    expect(carriedHarmonyFits(carryIn.finalHarmony, phrase.intent), where).toBe(true)
  }
}

// @test-link [[module_tension_arc_cycle]]
// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
describe('the joins of a session with the multi-phrase tension arc on', () => {
  // @test-link [[module_tension_arc_cycle]]
  // @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  // @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
  it(
    'are valid across every step, a carried harmony kept only when it fits',
    () => {
      const counts: JoinCounts = {
        carriedIn: 0,
        steppedJoins: 0,
        harmonyKept: 0,
        harmonyDropped: 0,
      }
      for (const [index, firstSeed] of JOIN_PROVIDER_SEEDS.entries()) {
        for (const tension of TENSION_ARCS) {
          for (const mutation of [SETTINGS_MUTATION_OFF, mutationOn(31 + index)]) {
            const label = `seed ${firstSeed}, ${tension}, mutation ${mutation.kind}`
            checkJoins(arcSession({ tension, mutation, firstSeed }), counts, label)
          }
        }
      }
      expect(counts.carriedIn).toBeGreaterThan(0)
      expect(counts.steppedJoins).toBeGreaterThan(0)
      expect(counts.harmonyKept).toBeGreaterThan(0)
      expect(counts.harmonyDropped).toBeGreaterThan(0)
    },
    SESSIONS_TIMEOUT_MS,
  )
})
