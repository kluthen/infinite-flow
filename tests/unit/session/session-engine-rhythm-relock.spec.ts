/**
 * The rhythm lock's re-lock after a narrow-window step-down, on the fake clock with real
 * generation: with phrase 1's bars using sixteenth notes, the first phrase generated with Eighth
 * once the window narrows carries, on every rung, the old bars and no allowed change, draws no
 * change, is marked as the re-lock in the session and its history, and its bars are locked from
 * then on, the allowed changes back. A repeat, or a settings change discarding the decided re-lock
 * phrase, leaves the re-lock pending; bars without sixteenth notes are never re-locked.
 */

import { describe, expect, it } from 'vitest'

import {
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
} from '@/domain/generation/request-rhythm-lock'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { makeSeed } from '@/domain/random/seed'
import { phraseRhythmLockRecord } from '@/session/rhythm-lock-session'
import type { SessionPhrase, SessionSettings, SessionStart } from '@/session/session-types'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import { soundingAt } from './scripted-session'
import { SessionDriver, fakeViewport, phraseOneFor } from './session-harness'
import {
  barsOf,
  decidedPhrases,
  expectedGroup,
  expectedTenser,
  historyOf,
  lockSettings,
} from './rhythm-lock-sessions'

/** The chosen settings: Sixteenth with the lock on and every change allowed, at the fast tempo. */
const SETTINGS: SessionSettings = lockSettings(RHYTHM_CHANGE_KINDS, {
  noteDensity: 'Sixteenth',
  tension: 'Lift',
})

/** Intent: whether bars hold a note or rest starting or lasting off the two-tick grid. */
function offEighthGrid(bars: readonly LockedRhythmMeasure[]): boolean {
  return bars.some((measure) =>
    measure.some((event) => event.startTick % 2 === 1 || event.durationTicks % 2 === 1),
  )
}

/**
 * Intent: the first phrase 1 from Idle seed 1 on whose bars use sixteenth notes, or do not, as
 * asked; a deterministic search over real generation. A phrase 1 at Sixteenth always uses them
 * with these controls, so one without is the Idle phrase a narrow window gave at Eighth, which
 * Start takes stale, the window wide again.
 */
function phraseOneWith(sixteenthNotes: boolean): SessionStart['phraseOne'] {
  const noteDensity = sixteenthNotes ? 'Sixteenth' : 'Eighth'
  for (let seed = 1; seed <= 50; seed += 1) {
    const phraseOne = phraseOneFor(SETTINGS, { seed, controls: { noteDensity } })
    if (offEighthGrid(barsOf(phraseOne.outcome)) === sixteenthNotes) return phraseOne
  }
  throw new Error(`No Idle seed up to 50 gives a phrase 1 with sixteenthNotes ${sixteenthNotes}.`)
}

/**
 * Intent: a session at the fast tempo, wide at Start, whose phrase 2 is generated at Sixteenth and
 * decided in the count-in; the window narrows before phrase 2 sounds, so phrase 3 is requested
 * with Eighth.
 */
function relockSession(sixteenthNotes: boolean): SessionDriver {
  const viewport = fakeViewport(false)
  const driver = new SessionDriver({
    at: 0,
    settings: SETTINGS,
    phraseOne: phraseOneWith(sixteenthNotes),
    viewport,
    sessionSeed: makeSeed(0x4e1_0c00),
    multiPhraseTensionArc: true,
  })
  driver.settle(0.5)
  driver.tick(1)
  driver.countInOver(soundingAt(1))
  viewport.below = true
  driver.sounding(soundingAt(2), 2)
  return driver
}

/** Intent: let phrases `from` to `to` start sounding, each answering the phrase after it. */
function soundAndSettle(driver: SessionDriver, from: number, to: number): void {
  for (let phraseNumber = from; phraseNumber <= to; phraseNumber += 1) {
    const at = soundingAt(phraseNumber)
    driver.sounding(at, phraseNumber)
    driver.settle(at + 0.5)
    driver.tick(at + 3)
  }
}

/** Intent: the decided phrase with this number (the last decided, if several). */
function decided(driver: SessionDriver, phraseNumber: number): SessionPhrase {
  const phrase = decidedPhrases(driver)
    .filter((entry) => entry.phraseNumber === phraseNumber)
    .at(-1)
  expect(phrase, `phrase ${phraseNumber} was decided`).toBeDefined()
  return phrase!
}

/** Intent: expect every request of a phrase to carry this group, given its own tenser flag. */
function expectRequestsCarry(
  driver: SessionDriver,
  phraseNumber: number,
  bars: readonly LockedRhythmMeasure[],
  allowed: readonly (typeof RHYTHM_CHANGE_KINDS)[number][],
): void {
  const requests = driver.requests(phraseNumber)
  expect(requests.length, `phrase ${phraseNumber} was requested`).toBeGreaterThan(0)
  const group = expectedGroup(bars, allowed, expectedTenser(true, phraseNumber, 'Lift'))
  for (const request of requests)
    expect(request.intent.rhythmLock, `phrase ${phraseNumber}`).toEqual(group)
}

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_rhythm_lock_relocks_after_step_down]]
describe('the re-lock after a narrow-window step-down', () => {
  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  // @test-link [[entity_request_rhythm_lock]]
  it("re-locks on the first Eighth phrase, on every rung, then locks that phrase's bars", () => {
    const driver = relockSession(true)
    const phraseOneBars = barsOf(driver.phraseOne.outcome)
    expect(offEighthGrid(phraseOneBars)).toBe(true)
    expectRequestsCarry(driver, 2, phraseOneBars, RHYTHM_CHANGE_KINDS)
    expect(decided(driver, 2).relock).toBeUndefined()
    const at = soundingAt(2) + 0.5
    driver.fail(at)
    driver.crash(at)
    driver.settle(at)
    driver.tick(soundingAt(2) + 3)
    const densities = driver.requests(3).map((request) => request.intent.controls.noteDensity)
    expect(densities.length).toBeGreaterThanOrEqual(3)
    expect(new Set(densities)).toEqual(new Set(['Eighth']))
    expectRequestsCarry(driver, 3, phraseOneBars, [])
    const relock = decided(driver, 3)
    expect(relock.relock).toBe(true)
    expect(relock.outcome.provenance.rhythmChange).toBeUndefined()
    const relockedBars = barsOf(relock.outcome)
    expect(offEighthGrid(relockedBars)).toBe(false)
    soundAndSettle(driver, 3, 8)
    for (let phraseNumber = 4; phraseNumber <= 9; phraseNumber += 1) {
      expectRequestsCarry(driver, phraseNumber, relockedBars, RHYTHM_CHANGE_KINDS)
      expect(decided(driver, phraseNumber).relock).toBeUndefined()
    }
    driver.end(soundingAt(9) + 1)
    const history = historyOf(driver)
    const records = history.phrases()
    expect(records.map((record) => record.relock === true)).toEqual(
      records.map((record) => record.phraseNumber === 3),
    )
    expect(phraseRhythmLockRecord(records[2]!)?.lock).toBe('relock')
    const facts = {
      pinned: false,
      favorites: [],
      comment: '',
      playedNotesKept: false,
      presets: BUILT_IN_PRESETS,
    }
    expect(JSON.stringify(encodeKeptSession(history, facts, '3.2.0-test'))).not.toContain('relock')
  })

  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('leaves the re-lock pending through a repeat: the next generated phrase re-locks', () => {
    const driver = relockSession(true)
    const phraseOneBars = barsOf(driver.phraseOne.outcome)
    driver.exhaust(soundingAt(2) + 0.5)
    driver.tick(soundingAt(2) + 3)
    expect(driver.requests(3).map((request) => request.step)).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'standalone',
    ])
    expectRequestsCarry(driver, 3, phraseOneBars, [])
    const repeat = decided(driver, 3)
    expect(repeat.origin).toBe('repeat')
    expect(repeat.relock).toBeUndefined()
    soundAndSettle(driver, 3, 3)
    expectRequestsCarry(driver, 4, phraseOneBars, [])
    const relock = decided(driver, 4)
    expect(relock.relock).toBe(true)
    soundAndSettle(driver, 4, 4)
    expectRequestsCarry(driver, 5, barsOf(relock.outcome), RHYTHM_CHANGE_KINDS)
  })

  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  // @test-link [[rule_session_change_applies_at_phrase_boundary]]
  it('leaves the re-lock pending when a settings change discards the decided re-lock phrase', () => {
    const driver = relockSession(true)
    const phraseOneBars = barsOf(driver.phraseOne.outcome)
    driver.settle(soundingAt(2) + 0.5)
    const discarded = decided(driver, 3)
    expect(discarded.relock).toBe(true)
    const requestsBefore = driver.requests(3).length
    const changed = lockSettings(RHYTHM_CHANGE_KINDS, {
      noteDensity: 'Sixteenth',
      tension: 'Lift',
      contour: 'Arch',
    })
    expect(driver.change(soundingAt(2) + 1, changed).map((output) => output.kind)).toContain(
      'phrase-discarded',
    )
    const again = driver.requests(3).slice(requestsBefore)
    expect(again.length).toBeGreaterThan(0)
    for (const request of again)
      expect(request.intent.rhythmLock).toEqual(
        expectedGroup(phraseOneBars, [], expectedTenser(true, 3, 'Lift')),
      )
    driver.settle(soundingAt(2) + 1.5)
    driver.tick(soundingAt(2) + 3)
    const relock = decided(driver, 3)
    expect(relock.relock).toBe(true)
    soundAndSettle(driver, 3, 3)
    expectRequestsCarry(driver, 4, barsOf(relock.outcome), RHYTHM_CHANGE_KINDS)
  })

  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  it('keeps bars without sixteenth notes locked through the step-down, the changes allowed', () => {
    const driver = relockSession(false)
    const phraseOneBars = barsOf(driver.phraseOne.outcome)
    expect(offEighthGrid(phraseOneBars)).toBe(false)
    driver.settle(soundingAt(2) + 0.5)
    driver.tick(soundingAt(2) + 3)
    soundAndSettle(driver, 3, 8)
    expect(driver.requests(3)[0]?.intent.controls.noteDensity).toBe('Eighth')
    for (let phraseNumber = 2; phraseNumber <= 9; phraseNumber += 1) {
      expectRequestsCarry(driver, phraseNumber, phraseOneBars, RHYTHM_CHANGE_KINDS)
      expect(decided(driver, phraseNumber).relock).toBeUndefined()
    }
    for (const record of historyOf(driver).phrases()) expect(record.relock).toBeUndefined()
  })
})
