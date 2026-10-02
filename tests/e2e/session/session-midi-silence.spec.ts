/**
 * v2.0 chunk 17, §7's silence rule, on the workspace harness's fake audio clock and fake MIDI
 * access: with a controller connected, a session ends on its own after more than 30 s without a
 * played note, counted from the last note played (the starting note included): still running at
 * 29.9 s, ended by 30.1 s, like Stop. A session started with Start and no note played yet never
 * times out, nor does a session with no controller.
 */
import { expect, test, type Page } from '@playwright/test'

import { audioNow } from '../audio/audio-harness-helpers'
import { watchPageErrors } from '../controller/controller-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from './session-helpers'
import {
  KEYS,
  clockTo,
  connectDevice,
  expectEndedBetween,
  expectStillRunning,
  tap,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: on a fresh page with the keyboard connected, start a session with the starting note. */
async function startByStartingNote(page: Page): Promise<number> {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const starting = (await sessionState(page)).startingNote
  if (starting === null) throw new Error('no starting note is named')
  const at = await tap(page, KEYS, starting.concertPitch)
  expect((await sessionState(page)).phase).toBe('count-in')
  return at
}

// @test-link [[rule_silence_timeout_ends_session]]
test.describe('with a controller: more than 30 s without a note ends the session', () => {
  // @test-link [[rule_silence_timeout_ends_session]]
  test('counted from the starting note: running at 29.9 s, ended by 30.1 s', async ({ page }) => {
    test.setTimeout(90_000)
    const startedAt = await startByStartingNote(page)

    await clockTo(page, startedAt + 29.9)
    await expectStillRunning(page, 'at 29.9 s')
    await clockTo(page, startedAt + 30)
    await expectStillRunning(page, 'at exactly 30 s')

    await clockTo(page, startedAt + 30.1)

    await expectEndedBetween(page, 'silence-timeout', startedAt + 30, startedAt + 30.1)
    expect((await sessionState(page)).lastHistoryPhraseCount).toBeGreaterThanOrEqual(3)
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  test('any later note, even a wrong one, counts again from its onset', async ({ page }) => {
    test.setTimeout(90_000)
    const startedAt = await startByStartingNote(page)
    await clockTo(page, startedAt + 20)
    // No phrase expects this pitch: any played note counts.
    const lastAt = await tap(page, KEYS, 20)

    await clockTo(page, startedAt + 30.1)
    await expectStillRunning(page, '30.1 s after the starting note')
    await clockTo(page, lastAt + 29.9)
    await expectStillRunning(page, '29.9 s after the last note')

    await clockTo(page, lastAt + 30.1)

    await expectEndedBetween(page, 'silence-timeout', lastAt + 30, lastAt + 30.1)
  })
})

// @test-link [[rule_silence_timeout_ends_session]]
test.describe('sessions that never time out', () => {
  // @test-link [[rule_silence_timeout_ends_session]]
  test('started with Start and no note played: still running after 61 s', async ({ page }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await connectDevice(page, KEYS)
    await readyToStart(page)
    await startSession(page)
    const startedAt = await audioNow(page)
    expect((await sessionState(page)).sessionHasController).toBe(true)

    await clockTo(page, startedAt + 61)

    await expectStillRunning(page, 'after 61 s with no note')
    await sessionAction(page).click()
    expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  test('with no controller: still running after 61 s', async ({ page }) => {
    test.setTimeout(90_000)
    await gotoSessionHarness(page)
    await readyToStart(page)
    await startSession(page)
    const startedAt = await audioNow(page)
    expect((await sessionState(page)).sessionHasController).toBe(false)

    await clockTo(page, startedAt + 61)

    await expectStillRunning(page, 'after 61 s with no controller')
    await sessionAction(page).click()
    expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  })
})
