/**
 * Fast scripted sessions brought to the state a settings-change spec needs: phrase 2 sounding and
 * phrase 3 requested (undecided) or decided, plus the settings to change to, the carry-in phrase 3
 * receives from phrase 2, and the generation request among a change's outputs.
 */

import { expect } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  fakeDisplay,
  sessionSettings,
  type GenerationRequestOutput,
  type SessionDriver,
} from './session-harness'
import { FAST_TEMPO, fastDriver, soundingAt } from './scripted-session'

/** Intent: fast-session settings with the given overrides. */
export function settingsWith(
  overrides: Partial<GenerationControls>,
): ReturnType<typeof sessionSettings> {
  return sessionSettings({ tempo: FAST_TEMPO, ...overrides })
}

/** Settings that differ from the chosen ones in one control the carry-in never depends on. */
export const SHAPED = settingsWith({ leapiness: 'Shaped' })

/** Intent: a fast session with phrase 2 sounding and phrase 3 requested, still undecided. */
export function threeRequested(onScreen = false): SessionDriver {
  const driver = fastDriver({ display: fakeDisplay(onScreen) })
  driver.accept(0.5)
  driver.countInOver(soundingAt(1))
  driver.sounding(soundingAt(2), 2)
  return driver
}

/** Intent: a fast session with phrase 2 sounding and phrase 3 decided, not yet sounding. */
export function threeDecided(onScreen = false): SessionDriver {
  const driver = threeRequested(onScreen)
  driver.accept(soundingAt(2) + 0.5)
  return driver
}

/** Intent: the carry-in phrase 3 receives from the phrase 2 a driver decided. */
export function carryFromTwo(driver: SessionDriver): CarryIn {
  const two = driver.all('phrase-ready')[0]!.phrase
  return deriveCarryIn({ intent: two.intent, outcome: two.outcome, phraseNumber: 2 })
}

/** Intent: the request among some outputs, failing the assertion when there is none. */
export function requestIn(outputs: readonly unknown[]): GenerationRequestOutput {
  const request = outputs.find(
    (output): output is GenerationRequestOutput =>
      (output as { kind: string }).kind === 'request-generation',
  )
  expect(request, 'a request among the outputs').toBeDefined()
  return request!
}
