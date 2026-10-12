/**
 * A scripted fast session for the settings-change and mutation tests: 240 BPM (a 1 s measure),
 * started at 0, every phrase answered with real outcomes half a measure after it is requested and
 * repeated at its deadline when none of them is valid, so a long session runs on its own.
 */

import { measureSeconds } from '@/session/session-timing'
import type { Seed } from '@/domain/random/seed'
import type { SessionSettings } from '@/session/session-types'
import type { SettingsMutationFlag } from '@/session/settings-mutation'
import {
  SessionDriver,
  phraseOneFor,
  sessionSettings,
  type FakeDisplay,
  type FakeViewport,
  type GenerationRequestOutput,
  type OutputOf,
} from './session-harness'

/** The fast tempo every scripted session runs at: one measure is one second. */
export const FAST_TEMPO = 240

/** Intent: the moment phrase N (1 or more) starts sounding in a fast session started at 0. */
export function soundingAt(phraseNumber: number): number {
  return measureSeconds(FAST_TEMPO) * (1 + 4 * (phraseNumber - 1))
}

/** What a fast driver starts from besides its tempo. */
export interface FastDriverOptions {
  readonly settings?: SessionSettings
  readonly mutation?: SettingsMutationFlag
  readonly viewport?: FakeViewport
  readonly display?: FakeDisplay
  readonly phraseOneDensity?: SessionSettings['controls']['noteDensity']
  readonly sessionSeed?: Seed
  readonly multiPhraseTensionArc?: boolean
}

/** Intent: a driver at 240 BPM started at 0, so phrase 2's deadline is 1 s and N+1's is 3 s on. */
export function fastDriver(options: FastDriverOptions = {}): SessionDriver {
  const settings = options.settings ?? sessionSettings({ tempo: FAST_TEMPO })
  const phraseOne = phraseOneFor(
    settings,
    options.phraseOneDensity === undefined
      ? {}
      : { controls: { noteDensity: options.phraseOneDensity } },
  )
  return new SessionDriver({
    at: 0,
    settings,
    phraseOne,
    ...(options.mutation === undefined ? {} : { mutation: options.mutation }),
    ...(options.viewport === undefined ? {} : { viewport: options.viewport }),
    ...(options.display === undefined ? {} : { display: options.display }),
    ...(options.sessionSeed === undefined ? {} : { sessionSeed: options.sessionSeed }),
    ...(options.multiPhraseTensionArc === undefined
      ? {}
      : { multiPhraseTensionArc: options.multiPhraseTensionArc }),
  })
}

/** Intent: answer the latest phrase, failing its first attempt when the script says so. */
function answer(driver: SessionDriver, at: number, failFirst: boolean): void {
  if (failFirst) driver.fail(at)
  driver.settle(at)
}

/**
 * Intent: run a fast session until phrase `lastSounding` has started sounding (and phrase
 * `lastSounding + 1` has been answered): phrase 2 during the count-in, then each phrase N+1 half a
 * measure after N starts sounding, any phrase still undecided repeated at its deadline. The
 * script may fail the first attempt of chosen phrases.
 */
export function driveSession(
  driver: SessionDriver,
  lastSounding: number,
  failFirst: (phraseNumber: number) => boolean = () => false,
): void {
  const measure = measureSeconds(FAST_TEMPO)
  answer(driver, measure / 2, failFirst(2))
  driver.tick(measure)
  driver.countInOver(soundingAt(1))
  for (let phraseNumber = 2; phraseNumber <= lastSounding; phraseNumber += 1) {
    const at = soundingAt(phraseNumber)
    driver.sounding(at, phraseNumber)
    answer(driver, at + measure / 2, failFirst(phraseNumber + 1))
    driver.tick(at + 3 * measure)
  }
}

/** Intent: every settings-changed output a driver logged. */
export function settingsChanges(driver: SessionDriver): readonly OutputOf<'settings-changed'>[] {
  return driver.all('settings-changed')
}

/**
 * Intent: the settings in effect for each requested phrase, from the chosen settings and every
 * settings-changed output logged so far.
 */
export function settingsFor(
  driver: SessionDriver,
  request: GenerationRequestOutput,
): SessionSettings {
  const changes = settingsChanges(driver).filter(
    (change) => change.phraseNumber <= request.phraseNumber,
  )
  return changes.at(-1)?.settings ?? driver.settings
}
