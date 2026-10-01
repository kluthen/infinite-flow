/**
 * v2.0 items 9 and 22, what a session locks and what it leaves live: every generation setting and
 * the tempo take the Loading read-only treatment with their colours kept at full strength, the
 * phrase action is disabled, while the theme, the audio mix and Stop stay usable. Also the screen
 * wake lock and the landscape orientation lock: requested in the Start click, released at every
 * end, and a refusal or an unsupported browser changes nothing on screen. Runs against the
 * workspace harness (port 4175).
 */
import { expect, test, type Page } from '@playwright/test'

import { advanceAudioTo, audioMix } from '../audio/audio-harness-helpers'
import {
  countInClickTimes,
  cueRow,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from './session-helpers'

/** How one musical control looks: its read-only marks and the colours its value shows in. */
interface ControlLook {
  readonly label: string
  readonly ariaReadonly: string | null
  readonly isReadonly: boolean
  readonly color: string
  readonly backgroundColor: string
  readonly opacity: string
  readonly valueColor: string
  readonly valueBackground: string
}

/** Intent: how every musical control looks now: each radiogroup of the control section, and tempo. */
function controlLooks(page: Page): Promise<ControlLook[]> {
  return page
    .locator('.control-section [role="radiogroup"], .control-section [role="spinbutton"]')
    .evaluateAll((controls) =>
      controls.map((control) => {
        const style = getComputedStyle(control)
        const value =
          control.querySelector<HTMLElement>('[aria-checked="true"]') ??
          control.querySelector<HTMLElement>('span') ??
          control
        const valueStyle = getComputedStyle(value)
        return {
          label: control.getAttribute('aria-label') ?? '',
          ariaReadonly: control.getAttribute('aria-readonly'),
          isReadonly:
            control.classList.contains('is-readonly') ||
            control.closest('.field-group')?.classList.contains('is-readonly') === true,
          color: style.color,
          backgroundColor: style.backgroundColor,
          opacity: style.opacity,
          valueColor: valueStyle.color,
          valueBackground: valueStyle.backgroundColor,
        }
      }),
    )
}

/** Intent: the colours of a look, without its read-only marks. */
function coloursOf(look: ControlLook) {
  const { label, color, backgroundColor, opacity, valueColor, valueBackground } = look
  return { label, color, backgroundColor, opacity, valueColor, valueBackground }
}

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_readonly_controls_keep_contrast]]
test('a session locks every musical control at full contrast; theme, mix and Stop stay live', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  const idleLooks = await controlLooks(page)
  expect(idleLooks.length).toBeGreaterThan(10)
  expect(idleLooks.map((look) => look.label)).toContain('Tempo')
  expect(idleLooks.every((look) => look.ariaReadonly === null)).toBe(true)

  await startSession(page)

  const sessionLooks = await controlLooks(page)
  for (const look of sessionLooks) {
    expect(look.ariaReadonly, look.label).toBe('true')
    expect(look.isReadonly, look.label).toBe(true)
  }
  expect(sessionLooks.map(coloursOf)).toEqual(idleLooks.map(coloursOf))
  await expect(page.locator('.tempo-readout')).toHaveText('90 BPM')
  await page.getByRole('button', { name: 'Increase tempo' }).click({ force: true })
  await expect(page.locator('.tempo-readout')).toHaveText('90 BPM')

  const phraseAction = page.locator('.header-actions > button:not(.session-action)')
  await expect(phraseAction).toBeDisabled()
  await expect(phraseAction).not.toHaveClass(/btn-primary/)

  // The theme switch still works.
  const theme = page.getByRole('radiogroup', { name: 'Presentation theme' })
  await expect(theme).not.toHaveAttribute('aria-readonly', 'true')
  await theme.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // The mix stays live.
  await page.getByRole('button', { name: 'Backing' }).click()
  await expect(page.getByRole('button', { name: 'Backing' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect((await audioMix(page)).backingOn).toBe(false)
  await page.getByRole('button', { name: 'Click', exact: true }).click()
  expect((await audioMix(page)).clickOn).toBe(false)
  expect((await sessionState(page)).phase).toBe('count-in')

  // And Stop ends it, unlocking the controls.
  await sessionAction(page).click()
  expect((await sessionState(page)).phase).toBe('idle')
  const after = await controlLooks(page)
  expect(after.every((look) => look.ariaReadonly === null)).toBe(true)
})

/** Intent: the wake lock's and the orientation lock's request/release/held counters. */
async function lockCounts(page: Page) {
  return page.evaluate(() => {
    const { wake, orientation } = window.__workspaceHarness.screenLocks
    return {
      wake: { requests: wake.requests(), releases: wake.releases(), held: wake.isHeld() },
      orientation: {
        requests: orientation.requests(),
        releases: orientation.releases(),
        held: orientation.isHeld(),
      },
    }
  })
}

// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
test('both screen locks are requested at Start and released at Stop, in the count-in and running', async ({
  page,
}) => {
  await gotoSessionHarness(page)
  await readyToStart(page)
  expect(await lockCounts(page)).toEqual({
    wake: { requests: 0, releases: 0, held: false },
    orientation: { requests: 0, releases: 0, held: false },
  })

  await startSession(page)
  await expect.poll(async () => (await lockCounts(page)).wake.held).toBe(true)
  await expect.poll(async () => (await lockCounts(page)).orientation.held).toBe(true)
  await sessionAction(page).click()
  expect(await lockCounts(page)).toEqual({
    wake: { requests: 1, releases: 1, held: false },
    orientation: { requests: 1, releases: 1, held: false },
  })

  await startSession(page)
  const [firstClick] = await countInClickTimes(page)
  await advanceAudioTo(page, (firstClick ?? 0) + 3)
  expect((await sessionState(page)).phase).toBe('running')
  const running = await lockCounts(page)
  expect(running.wake).toEqual({ requests: 2, releases: 1, held: true })
  expect(running.orientation).toEqual({ requests: 2, releases: 1, held: true })
  await sessionAction(page).click()
  expect(await lockCounts(page)).toEqual({
    wake: { requests: 2, releases: 2, held: false },
    orientation: { requests: 2, releases: 2, held: false },
  })
})

for (const behaviour of ['refuse', 'unsupported'] as const) {
  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_landscape_lock_during_session]]
  test(`with both locks answered "${behaviour}", the session runs the same and nothing extra shows`, async ({
    page,
  }) => {
    await gotoSessionHarness(page)
    await page.evaluate((b) => {
      window.__workspaceHarness.screenLocks.wake.setBehaviour(b)
      window.__workspaceHarness.screenLocks.orientation.setBehaviour(b)
    }, behaviour)
    await readyToStart(page)
    const alertsBefore = await page.locator('.inline-alert:visible, [role="alert"]').count()

    await startSession(page)
    await expect(page.locator('ol.count-in')).toBeVisible()
    const [firstClick] = await countInClickTimes(page)
    await advanceAudioTo(page, (firstClick ?? 0) + 3)

    expect((await sessionState(page)).phase).toBe('running')
    await expect(cueRow(page).locator('.session-alert')).toHaveCount(0)
    expect(await page.locator('.inline-alert:visible, [role="alert"]').count()).toBe(alertsBefore)
    const log = await page.evaluate(() => window.__workspaceHarness.screenLocks.wake.log())
    expect(log).toEqual(['request', behaviour])
    expect(await lockCounts(page)).toMatchObject({
      wake: { held: false },
      orientation: { held: false },
    })

    await sessionAction(page).click()
    expect((await sessionState(page)).lastEnd).toEqual({
      cause: 'stop',
      phase: 'running',
      soundedPhraseCount: 1,
    })
  })
}
