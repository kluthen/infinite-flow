/**
 * v2.0 items 9 and 22 below bp-tablet-landscape (a 740 x 360 landscape phone): the Start click's
 * jump puts the whole cue row and staff in view, the cue row holds the compact `Stop` and the
 * phone's `Volume` for the whole session, count-in included, and the compact `Stop` ends it like
 * the header's. Runs against the workspace harness (port 4175).
 */
import { expect, test } from '@playwright/test'

import { advanceAudioTo } from '../audio/audio-harness-helpers'
import {
  PHONE,
  countInClickTimes,
  cueRow,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
  whollyInViewport,
} from './session-helpers'

// @test-link [[req_landscape_phrase_workspace]]
// @test-link [[rule_stop_ends_session]]
// @test-link [[service_workspace_session_flow]]
test('on a landscape phone the jump shows cue row and staff, and the compact Stop ends the session', async ({
  page,
}) => {
  await gotoSessionHarness(page, PHONE)
  await readyToStart(page)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(cueRow(page).locator('.session-cue-actions')).toHaveCount(0)

  await startSession(page)
  expect((await sessionState(page)).heldLayout).toBe('split')

  expect(await whollyInViewport(cueRow(page))).toBe(true)
  expect(await whollyInViewport(page.locator('.staff-viewport'))).toBe(true)
  await expect(sessionAction(page)).toBeFocused()

  const actions = cueRow(page).locator('.session-cue-actions')
  const compactStop = actions.getByRole('button', { name: 'Stop' })
  const compactVolume = actions.getByRole('button', { name: 'Volume' })
  await expect(compactStop).toBeVisible()
  await expect(compactVolume).toBeVisible()
  await expect(compactVolume).toHaveAttribute('aria-controls', 'mix-volume-popover')
  await expect(cueRow(page).locator('ol.count-in')).toBeVisible()

  // Still there once phrase 1 runs.
  const [firstClick] = await countInClickTimes(page)
  await advanceAudioTo(page, (firstClick ?? 0) + 2)
  await expect(compactStop).toBeVisible()
  await expect(compactVolume).toBeVisible()

  await compactStop.click()

  expect((await sessionState(page)).lastEnd).toEqual({
    cause: 'stop',
    phase: 'count-in',
    soundedPhraseCount: 0,
  })
  await expect(cueRow(page).locator('.session-cue-actions')).toHaveCount(0)
  await expect(sessionAction(page)).toHaveText('Start session')
  await expect(sessionAction(page)).toBeFocused()
})

// @test-link [[req_session_audio_mix]]
test('a popover opened from the compact Volume closes with the session end', async ({ page }) => {
  await gotoSessionHarness(page, PHONE)
  await readyToStart(page)
  await startSession(page)

  const compactVolume = cueRow(page).getByRole('button', { name: 'Volume' })
  await compactVolume.click()
  await expect(page.locator('#mix-volume-popover')).toBeVisible()

  await cueRow(page).getByRole('button', { name: 'Stop' }).click()

  await expect(page.locator('#mix-volume-popover')).toBeHidden()
  await expect(
    page.locator('.mix-controls').getByRole('button', { name: 'Volume' }),
  ).toHaveAttribute('aria-expanded', 'false')
})
