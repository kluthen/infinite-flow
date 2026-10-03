/**
 * A scripted session that follows its own tempo map, for the adaptive-tempo tests: each phrase
 * starts four measures of the phrase before after it, at that phrase's own tempo, read from the
 * engine's phrase-tempo outputs; every phrase is answered with real outcomes half a measure after
 * it is requested, the clock reaches each deadline, and controller events land where the script
 * places them.
 */

import { measureSeconds } from '@/session/session-timing'
import type { AudioTime } from '@/session/session-types'
import { SessionDriver, phraseOneFor, sessionSettings, type DriverOptions } from './session-harness'

/**
 * A controller event placed on a session's timeline: during the count-in (`during` 0) or phrase
 * `during`, `measures` measures (at that phrase's tempo) after it starts.
 */
export interface ControllerStep {
  readonly during: number
  readonly measures: number
  readonly attached: boolean
}

/** What a scripted tempo session does besides answering every phrase. */
export interface TempoScript {
  readonly failFirst?: (phraseNumber: number) => boolean
  readonly controller?: readonly ControllerStep[]
}

/** What a tempo driver starts from: its starting tempo, whether adaptive tempo runs, and more. */
export interface TempoDriverOptions extends Omit<DriverOptions, 'settings' | 'phraseOne'> {
  readonly tempo: number
  readonly adaptiveTempo: boolean
  readonly phraseOneSeed?: number
}

/** Intent: a driver started at 0 at the given starting tempo, adaptive tempo on or off. */
export function tempoDriver(options: TempoDriverOptions): SessionDriver {
  const { tempo, phraseOneSeed, ...rest } = options
  const settings = sessionSettings({ tempo })
  const seed = phraseOneSeed === undefined ? {} : { seed: phraseOneSeed }
  return new SessionDriver({ at: 0, ...rest, settings, phraseOne: phraseOneFor(settings, seed) })
}

/** Intent: the tempo of phrase N: the starting tempo for phrase 1, else its phrase-tempo output. */
export function phraseTempoOf(driver: SessionDriver, phraseNumber: number): number {
  if (phraseNumber === 1) return driver.settings.controls.tempo
  const fixed = driver.all('phrase-tempo').filter((output) => output.phraseNumber === phraseNumber)
  if (fixed.length !== 1)
    throw new Error(`Phrase ${phraseNumber} has ${fixed.length} phrase-tempo outputs, not one.`)
  return fixed[0]!.tempo
}

/** Intent: the moment phrase N starts sounding: after the count-in and every phrase before it. */
export function phraseStartAt(driver: SessionDriver, phraseNumber: number): AudioTime {
  let at = driver.start.at + measureSeconds(driver.settings.controls.tempo)
  for (let earlier = 1; earlier < phraseNumber; earlier += 1)
    at += 4 * measureSeconds(phraseTempoOf(driver, earlier))
  return at
}

/** Intent: answer the latest requested phrase, failing its first attempt if the script says so. */
function answer(driver: SessionDriver, at: AudioTime, failFirst: boolean): void {
  if (failFirst) driver.fail(at)
  driver.settle(at)
}

/** A step of one phrase's script, at its time. */
interface TimedAction {
  readonly at: AudioTime
  readonly run: () => void
}

/** Intent: run a phrase's actions in time order, the earlier-listed first at equal times. */
function runInOrder(actions: readonly TimedAction[]): void {
  for (const action of [...actions].sort((a, b) => a.at - b.at)) action.run()
}

/** Intent: the script's controller events during the count-in (0) or one phrase, placed in time. */
function controllerActions(
  driver: SessionDriver,
  script: TempoScript,
  during: number,
  startsAt: AudioTime,
  measure: number,
): readonly TimedAction[] {
  return (script.controller ?? [])
    .filter((step) => step.during === during)
    .map((step) => {
      const at = startsAt + step.measures * measure
      return { at, run: () => void driver.controller(at, step.attached) }
    })
}

/**
 * Intent: run a session until phrase `lastSounding` has started sounding and the deadline of the
 * phrase after it has passed: phrase 2 answered during the count-in, each later phrase answered
 * half a measure after the phrase before starts sounding, the clock reaching each deadline, and
 * the script's controller events in between.
 */
export function driveTempoSession(
  driver: SessionDriver,
  lastSounding: number,
  script: TempoScript = {},
): void {
  const failFirst = script.failFirst ?? (() => false)
  const countInAt = driver.start.at
  const countIn = measureSeconds(driver.settings.controls.tempo)
  runInOrder([
    {
      at: countInAt + countIn / 2,
      run: () => answer(driver, countInAt + countIn / 2, failFirst(2)),
    },
    ...controllerActions(driver, script, 0, countInAt, countIn),
    { at: countInAt + countIn, run: () => void driver.tick(countInAt + countIn) },
  ])
  driver.countInOver(phraseStartAt(driver, 1))
  for (let phraseNumber = 1; phraseNumber <= lastSounding; phraseNumber += 1) {
    const at = phraseStartAt(driver, phraseNumber)
    const measure = measureSeconds(phraseTempoOf(driver, phraseNumber))
    if (phraseNumber > 1) driver.sounding(at, phraseNumber)
    const answering: readonly TimedAction[] =
      phraseNumber > 1
        ? [
            {
              at: at + measure / 2,
              run: () => answer(driver, at + measure / 2, failFirst(phraseNumber + 1)),
            },
            { at: at + 3 * measure, run: () => void driver.tick(at + 3 * measure) },
          ]
        : []
    runInOrder([...answering, ...controllerActions(driver, script, phraseNumber, at, measure)])
  }
}

/** Intent: the tempo of phrases 1 to `count`, as the session fixed them. */
export function tempoMap(driver: SessionDriver, count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => phraseTempoOf(driver, index + 1))
}
