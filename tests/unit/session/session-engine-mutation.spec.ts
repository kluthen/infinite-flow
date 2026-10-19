/**
 * The session engine with the settings-mutation flag: off, a whole session is built from the
 * chosen settings exactly as before; on, each mutation lands on its scheduled phrase and is in
 * effect for that phrase's request, a mutation landing on a repeat still counts, a note-density
 * mutation never restores Sixteenth after a step-down, and a register mutation from a chosen
 * Varying replaces the carried window.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { levelsForProfile } from '@/domain/figures/figure-levels'
import { makeSeed } from '@/domain/random/seed'
import { resolvedRegister } from '@/session/session-intents'
import {
  MUTATION_GAP_MAX,
  MUTATION_GAP_MIN,
  mutationPhrase,
  scaleNeighbours,
  MUTATION_SCALES,
  type SettingsMutationFlag,
} from '@/session/settings-mutation'
import { fakeDisplay, fakeViewport, phraseOneFor, sessionSettings } from './session-harness'
import {
  FAST_TEMPO,
  driveSession,
  fastDriver,
  settingsChanges,
  settingsFor,
  soundingAt,
} from './scripted-session'

/** Generous timeout for the tests that generate whole sessions for many seeds. */
const SESSIONS_TIMEOUT_MS = 60_000

/** Intent: the flag on with a numeric mutation seed. */
function mutationOn(seed: number): SettingsMutationFlag {
  return { kind: 'on', seed: makeSeed(seed) }
}

/** Intent: the scheduled mutation phrases of a seed, up to and including a last phrase. */
function scheduledPhrases(seed: number, lastPhrase: number): readonly number[] {
  const phrases: number[] = []
  for (let k = 1; mutationPhrase(makeSeed(seed), k) <= lastPhrase; k += 1)
    phrases.push(mutationPhrase(makeSeed(seed), k))
  return phrases
}

// @test-link [[req_settings_mutation_flag]]
// @test-link [[rule_session_settings_locked]]
describe('a session with the settings-mutation flag off', () => {
  // @test-link [[req_settings_mutation_flag]]
  // @test-link [[rule_session_settings_locked]]
  // @test-link [[rule_session_density_only_steps_down]]
  it.each([
    { label: 'wide, Quarter', below: false, chosen: 'Quarter', generated: 'Quarter' },
    { label: 'narrow, Sixteenth', below: true, chosen: 'Sixteenth', generated: 'Eighth' },
  ] as const)(
    'builds every request of a long session from the chosen settings ($label)',
    ({ below, chosen, generated }) => {
      const settings = sessionSettings({ tempo: FAST_TEMPO, noteDensity: chosen })
      const display = fakeDisplay(false)
      const driver = fastDriver({
        settings,
        viewport: fakeViewport(below),
        display,
        phraseOneDensity: generated,
      })
      driveSession(driver, 14)
      expect(driver.requests().length).toBeGreaterThanOrEqual(14)
      for (const request of driver.requests()) {
        expect(request.intent.controls).toEqual({ ...settings.controls, noteDensity: generated })
        expect(request.intent.figureLevels).toEqual(
          levelsForProfile(settings.musicalProfile.musicalProfile),
        )
      }
      expect(settingsChanges(driver)).toEqual([])
      expect(driver.all('phrase-discarded')).toEqual([])
      expect(display.asked).toEqual([])
      // Phrase 2's standalone attempt goes first at 240 BPM, after drawing and discarding the
      // request ids of the four carry-in rungs it skips; every other request id is one request's,
      // and no seed is drawn: every attempt seed comes from the session seed plan.
      expect(driver.requests(2)[0]).toMatchObject({ step: 'standalone', retry: 4 })
      expect(driver.requests(2)[0]!.intent.requestId).toBe('session-5')
      expect(driver.lastRequest().intent.requestId).toBe(`session-${driver.requests().length + 4}`)
      expect(driver.providers.seedsHandedOut).toEqual([])
    },
  )
})

// @test-link [[rule_mutation_lands_on_scheduled_phrase]]
// @test-link [[req_settings_mutation_flag]]
describe('mutations landing on their scheduled phrases', () => {
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  // @test-link [[req_settings_mutation_flag]]
  it.each([1, 2, 3, 5, 8, 21])(
    'lands every mutation on its scheduled phrase, in effect for its request (seed %i)',
    (seed) => {
      const driver = fastDriver({ mutation: mutationOn(seed) })
      driveSession(driver, 18)
      const changes = settingsChanges(driver)
      const landed = changes.map((change) => change.phraseNumber)
      expect(landed).toEqual(scheduledPhrases(seed, 19))
      expect(landed[0]).toBeGreaterThanOrEqual(1 + MUTATION_GAP_MIN)
      expect(landed[0]).toBeLessThanOrEqual(1 + MUTATION_GAP_MAX)
      landed.slice(1).forEach((phrase, index) => {
        expect(phrase - landed[index]!).toBeGreaterThanOrEqual(MUTATION_GAP_MIN)
        expect(phrase - landed[index]!).toBeLessThanOrEqual(MUTATION_GAP_MAX)
      })
      for (const change of changes) {
        expect(change.cause).toBe('mutation')
        const next = driver.log[driver.log.indexOf(change) + 1]
        expect(next).toMatchObject({
          kind: 'request-generation',
          phraseNumber: change.phraseNumber,
          retry: 0,
        })
      }
      for (const request of driver.requests()) {
        const settings = settingsFor(driver, request)
        expect(request.intent.controls).toEqual(settings.controls)
        expect(request.intent.figureLevels).toEqual(
          levelsForProfile(settings.musicalProfile.musicalProfile),
        )
      }
      expect(driver.all('phrase-discarded')).toEqual([])
    },
  )

  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it('counts a mutation landing on a phrase that ends up a repeat, and the next phrase uses it', () => {
    const seed = 1
    expect(mutationPhrase(makeSeed(seed), 1)).toBe(3)
    const driver = fastDriver({ mutation: mutationOn(seed) })
    driver.settle(0.5)
    driver.countInOver(soundingAt(1))
    driver.sounding(soundingAt(2), 2)
    const [change] = settingsChanges(driver)
    expect(change).toMatchObject({ phraseNumber: 3, cause: 'mutation' })
    driver.exhaust(soundingAt(2) + 0.5)
    driver.tick(soundingAt(2) + 3)
    expect(driver.all('phrase-ready').at(-1)?.phrase).toMatchObject({
      phraseNumber: 3,
      origin: 'repeat',
      repeatOf: 2,
    })
    const second = mutationPhrase(makeSeed(seed), 2)
    for (let phraseNumber = 3; phraseNumber + 1 < second; phraseNumber += 1) {
      driver.sounding(soundingAt(phraseNumber), phraseNumber)
      expect(driver.lastRequest().intent.controls).toEqual(change!.settings.controls)
      driver.settle(soundingAt(phraseNumber) + 0.5)
    }
    driver.sounding(soundingAt(second - 1), second - 1)
    expect(settingsChanges(driver).map((landed) => landed.phraseNumber)).toEqual([3, second])
  })
})

// @test-link [[rule_mutation_sixteenth_blocked_after_step_down]]
// @test-link [[rule_density_mutation_steps_from_generated_density]]
describe('a note-density mutation after a step-down', () => {
  /** Intent: a session that chose Sixteenth, stepped down while narrow, then widened again. */
  function steppedDownDriver(seed: number): ReturnType<typeof fastDriver> {
    const settings = sessionSettings({ tempo: FAST_TEMPO, noteDensity: 'Sixteenth' })
    const viewport = fakeViewport(true)
    const driver = fastDriver({
      settings,
      viewport,
      mutation: mutationOn(seed),
      phraseOneDensity: 'Eighth',
    })
    expect(driver.lastRequest().intent.controls.noteDensity).toBe('Eighth')
    viewport.below = false
    return driver
  }

  // @test-link [[rule_mutation_sixteenth_blocked_after_step_down]]
  // @test-link [[rule_density_mutation_steps_from_generated_density]]
  it.each([7, 13, 78, 99])(
    'steps from Eighth to Quarter once the window is wide again, never to Sixteenth (seed %i)',
    (seed) => {
      const driver = steppedDownDriver(seed)
      const landing = mutationPhrase(makeSeed(seed), 1)
      driveSession(driver, landing - 1)
      const [change] = settingsChanges(driver)
      expect(change).toMatchObject({
        phraseNumber: landing,
        setting: 'noteDensity',
        from: 'Eighth',
        to: 'Quarter',
      })
      expect(driver.requests(landing)[0]?.intent.controls.noteDensity).toBe('Quarter')
    },
  )

  // @test-link [[rule_mutation_sixteenth_blocked_after_step_down]]
  it(
    'never generates or mutates to Sixteenth in a session that stepped down',
    () => {
      for (let seed = 1; seed <= 20; seed += 1) {
        const driver = steppedDownDriver(seed)
        driveSession(driver, 12)
        for (const request of driver.requests())
          expect(request.intent.controls.noteDensity).not.toBe('Sixteenth')
        for (const change of settingsChanges(driver))
          if (change.cause === 'mutation' && change.setting === 'noteDensity')
            expect(change.to).not.toBe('Sixteenth')
      }
    },
    SESSIONS_TIMEOUT_MS,
  )
})

// @test-link [[rule_varying_register_once_per_session]]
// @test-link [[rule_register_change_replaces_carried_window]]
describe('a register mutation from a chosen Varying', () => {
  // @test-link [[rule_varying_register_once_per_session]]
  // @test-link [[rule_register_change_replaces_carried_window]]
  it.each([24, 25, 36])(
    'lands on a neighbour of the resolved register and carries in its window (seed %i)',
    (seed) => {
      const settings = sessionSettings({ tempo: FAST_TEMPO, register: 'Varying' })
      const phraseOne = phraseOneFor(settings)
      const candidates = phraseOne.intent.registerIntent.candidates
      const resolved = resolvedRegister(
        deriveCarryIn({ ...phraseOne, phraseNumber: 1 }),
        candidates,
      )
      const driver = fastDriver({ settings, mutation: mutationOn(seed) })
      const landing = mutationPhrase(makeSeed(seed), 1)
      driveSession(driver, landing - 1)
      const [change] = settingsChanges(driver)
      expect(change).toMatchObject({ phraseNumber: landing, setting: 'register', from: resolved })
      const to = change?.cause === 'mutation' ? change.to : undefined
      expect(scaleNeighbours(MUTATION_SCALES.register.scale, resolved)).toContain(to)
      const request = driver.requests(landing)[0]!
      expect(request.step).toBe('carry-in')
      expect(request.intent.controls.register).toBe(to)
      const window = candidates.find((candidate) => candidate.id === to)?.window
      expect(request.intent.carryIn?.registerWindow).toEqual(window)
    },
  )
})
