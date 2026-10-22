/**
 * The session engine's mutation step: a scheduled mutation that meets a dead end is skipped,
 * throwing nothing, the settings in effect kept as the very same object and the skip reported for
 * the phrase it would have landed on; and the mutation context at the session's start is the one
 * its first mutation sees when nothing changed since.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeSeed } from '@/domain/random/seed'
import { resolvedRegister } from '@/session/session-intents'
import { landingMutation, mutationContextAtStart } from '@/session/session-mutation-step'
import {
  MUTATION_SCALES,
  hasLegalMove,
  mutationPhrase,
  scaleNeighbours,
  type MutationContext,
  type SettingsMutationFlag,
} from '@/session/settings-mutation'
import { driveSession, fastDriver, settingsChanges, FAST_TEMPO } from './scripted-session'
import { phraseOneFor, sessionSettings } from './session-harness'
import { mutatedMove } from './settings-mutation-moves'
import { groupsOn } from './vary-settings-groups-cases'

const WIDE: MutationContext = {
  belowTabletLandscape: false,
  sessionSteppedDown: false,
  resolvedRegister: 'Middle',
}

/** Intent: the flag on with a numeric mutation seed. */
function mutationOn(seed: number): SettingsMutationFlag {
  return { kind: 'on', seed: makeSeed(seed) }
}

// @test-link [[rule_vary_settings_skips_dead_end]]
// @test-link [[module_session_mutation_step]]
describe('a mutation landing on a dead end', () => {
  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[module_session_mutation_step]]
  it('is skipped, throwing nothing: the settings in effect stay the same object and the skip names its phrase and number', () => {
    const settings = { ...sessionSettings(), allowedGroups: groupsOn([]) }
    expect(hasLegalMove(settings, WIDE)).toBe(false)
    for (const seed of [1, 2, 3, 5, 8]) {
      const flag = mutationOn(seed)
      for (const k of [1, 2, 3]) {
        const phraseNumber = mutationPhrase(makeSeed(seed), k)
        let reads = 0
        const landing = landingMutation(flag, phraseNumber, settings, () => {
          reads += 1
          return WIDE
        })
        expect(landing?.settings).toBe(settings)
        expect(landing?.output).toStrictEqual({
          kind: 'mutation-skipped',
          phraseNumber,
          mutationNumber: k,
        })
        expect(reads).toBe(1)
        expect(landingMutation(flag, phraseNumber, settings, () => WIDE)).toStrictEqual(landing)
      }
    }
  })
})

// @test-link [[rule_vary_settings_needs_legal_move]]
// @test-link [[module_session_mutation_step]]
describe('the mutation context at the session start', () => {
  // @test-link [[rule_vary_settings_needs_legal_move]]
  it("is the window's width, no step-down yet and the register phrase 2's carry-in holds", () => {
    const settings = sessionSettings({ tempo: FAST_TEMPO, register: 'Varying' })
    const phraseOne = phraseOneFor(settings)
    const resolved = resolvedRegister(
      deriveCarryIn({ ...phraseOne, phraseNumber: 1 }),
      phraseOne.intent.registerIntent.candidates,
    )
    for (const belowTabletLandscape of [false, true])
      expect(mutationContextAtStart(phraseOne, belowTabletLandscape)).toStrictEqual({
        belowTabletLandscape,
        sessionSteppedDown: false,
        resolvedRegister: resolved,
      })
  })

  // @test-link [[rule_vary_settings_needs_legal_move]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it.each([24, 25, 36])(
    'gives the first mutation of a session whose window and register did not change the very move it lands (seed %i)',
    (seed) => {
      const settings = sessionSettings({ tempo: FAST_TEMPO, register: 'Varying' })
      const phraseOne = phraseOneFor(settings)
      const context = mutationContextAtStart(phraseOne, false)
      const driver = fastDriver({ settings, mutation: mutationOn(seed) })
      const landing = mutationPhrase(makeSeed(seed), 1)
      driveSession(driver, landing - 1)
      const [change] = settingsChanges(driver)
      const expected = mutatedMove(settings, context, makeSeed(seed), 1)
      expect(change).toMatchObject({
        phraseNumber: landing,
        cause: 'mutation',
        setting: expected.setting,
        from: expected.from,
        to: expected.to,
        settings: expected.settings,
      })
      expect(expected.setting).toBe('register')
      expect(scaleNeighbours(MUTATION_SCALES.register.scale, context.resolvedRegister)).toContain(
        expected.to,
      )
    },
  )
})
