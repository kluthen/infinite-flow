/**
 * Shared helpers for the mode switch spec (v3.2 chunk 20): the header's `mode-switch` and its two
 * segments, what session mode and Jam mode show (the score title among it), the refusals of a
 * read-only switch, Jam's built code chunk (`assets/jam-mode-*.js`) watched, held then let through
 * or refused, or refused at once, on the network, a record of whether
 * the switch ever took `is-loading`, Jam's load-failure notice, and the wait for the production
 * build's service worker.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { phraseAction, sessionAction } from '../session/session-helpers'

declare global {
  interface Window {
    /** Whether `mode-switch` has taken `is-loading` since `watchOpening` was called. */
    __modeSwitchLoadingSeen?: boolean
  }
}

/** A segment of the mode switch, by its label. */
export type ModeLabel = 'Session' | 'Jam'

/** Jam's code chunk as the build names it, matched against a request's URL. */
export const JAM_CHUNK = /\/assets\/jam-mode-[\w-]+\.js(\?.*)?$/

/** Jam's load-failure notice's sentence. */
export const JAM_LOAD_FAILED =
  "Jam mode couldn't open because part of the app didn't load. Check that you're online, then try again."

/** Intent: the header's mode switch, the radiogroup "Mode". */
export function modeSwitch(page: Page): Locator {
  return page.getByRole('radiogroup', { name: 'Mode', exact: true })
}

/** Intent: one segment of the mode switch. */
export function modeSegment(page: Page, label: ModeLabel): Locator {
  return modeSwitch(page).getByRole('radio', { name: label, exact: true })
}

/** Intent: the other segment's label. */
export function otherMode(label: ModeLabel): ModeLabel {
  return label === 'Session' ? 'Jam' : 'Session'
}

/** Intent: assert `label` is the checked segment and the other is not. */
export async function expectChecked(page: Page, label: ModeLabel): Promise<void> {
  await expect(modeSegment(page, label)).toHaveAttribute('aria-checked', 'true')
  await expect(modeSegment(page, otherMode(label))).toHaveAttribute('aria-checked', 'false')
}

/**
 * Intent: session mode's staff viewport, the staff stack's first child (Jam's view and the kept
 * doodle's staff each have one of their own after it).
 */
export function sessionViewport(page: Page): Locator {
  return page
    .locator('.score-panel > div > .staff-viewport:first-child')
    .filter({ hasNot: page.locator('.staff-jam') })
}

/** Intent: session mode's staff frame. */
export function sessionFrame(page: Page): Locator {
  return sessionViewport(page).locator(':scope > .staff-frame')
}

/** Intent: the score panel's title, `h2#score-panel-title`, which also names the staff frame. */
export function scoreTitle(page: Page): Locator {
  return page.locator('.score-toolbar h2#score-panel-title')
}

/** Intent: Jam's staff frame, rendered only while Jam mode shows. */
export function jamFrame(page: Page): Locator {
  return page.locator('.score-panel .staff-frame.staff-jam')
}

/**
 * Intent: assert Jam mode shows: `Jam` checked and not loading, the score titled `Jam`, Jam's staff
 * frame in the staff's place with session mode's out of sight, `Generate phrase` disabled and
 * `Start Jam` as `startJam` says: disabled by default (no controller connected, or a fresh Jam
 * could not start), enabled while a fresh Jam could start.
 */
export async function expectJamModeShows(
  page: Page,
  startJam: 'enabled' | 'disabled' = 'disabled',
): Promise<void> {
  await expectChecked(page, 'Jam')
  await expect(scoreTitle(page)).toHaveText('Jam')
  await expect(modeSwitch(page)).not.toHaveClass(/is-loading/)
  await expect(modeSwitch(page)).not.toHaveAttribute('aria-busy')
  await expect(jamFrame(page)).toBeVisible()
  await expect(sessionViewport(page)).toHaveClass(/is-out-of-sight/)
  await expect(sessionAction(page)).toHaveText('Start Jam')
  if (startJam === 'enabled') await expect(sessionAction(page)).toBeEnabled()
  else await expect(sessionAction(page)).toBeDisabled()
  await expect(phraseAction(page)).toHaveText('Generate phrase')
  await expect(phraseAction(page)).toBeDisabled()
}

/**
 * Intent: assert session mode shows at Idle: `Session` checked and not loading, the score titled
 * `Four-measure phrase`, no Jam view, its staff in sight, the session action `Start session`.
 */
export async function expectSessionModeShows(page: Page): Promise<void> {
  await expectChecked(page, 'Session')
  await expect(scoreTitle(page)).toHaveText('Four-measure phrase')
  await expect(modeSwitch(page)).not.toHaveClass(/is-loading/)
  await expect(modeSwitch(page)).not.toHaveAttribute('aria-busy')
  await expect(jamFrame(page)).toHaveCount(0)
  await expect(sessionViewport(page)).toBeVisible()
  await expect(sessionViewport(page)).not.toHaveClass(/is-out-of-sight/)
  await expect(sessionAction(page)).toHaveText('Start session')
}

/**
 * Intent: assert the switch is read-only with `checked` checked, and that a click on the other
 * segment and an arrow key from the checked one change nothing. A read-only switch takes no
 * pointer events, so the click is made twice: where the pointer lands (the header under it), and
 * dispatched on the segment itself, which its script refuses.
 */
export async function expectSwitchRefuses(page: Page, checked: ModeLabel): Promise<void> {
  await expect(modeSwitch(page)).toHaveAttribute('aria-readonly', 'true')
  await expectChecked(page, checked)
  await modeSegment(page, otherMode(checked)).click({ force: true })
  await modeSegment(page, otherMode(checked)).dispatchEvent('click')
  await expectChecked(page, checked)
  await modeSegment(page, checked).focus()
  await modeSegment(page, checked).press(checked === 'Session' ? 'ArrowRight' : 'ArrowLeft')
  await expectChecked(page, checked)
  await expect(modeSwitch(page)).not.toHaveClass(/is-loading/)
}

/** Intent: record the URL of every request for Jam's code chunk the page makes from now on. */
export function watchJamChunk(page: Page): string[] {
  const urls: string[] = []
  page.on('request', (request) => {
    if (JAM_CHUNK.test(request.url())) urls.push(request.url())
  })
  return urls
}

/** Jam's code chunk held on the network until the test lets it through or refuses it. */
export interface HeldJamChunk {
  /** How many requests for it reached the route. */
  readonly requests: () => number
  /** Let every held request through to the server; resolves once its response has finished. */
  readonly release: () => Promise<void>
  /** Refuse every held request, as a network gone away does; resolves once it has failed. */
  readonly refuse: () => Promise<void>
}

/** Intent: hold every request for Jam's code chunk until `release` or `refuse`. */
export async function holdJamChunk(page: Page): Promise<HeldJamChunk> {
  let requests = 0
  let settle!: (outcome: 'release' | 'refuse') => void
  const settled = new Promise<'release' | 'refuse'>((resolve) => (settle = resolve))
  await page.route(JAM_CHUNK, async (route) => {
    requests += 1
    if ((await settled) === 'release') await route.continue()
    else await route.abort('internetdisconnected')
  })
  return {
    requests: () => requests,
    release: async () => {
      const finished = page.waitForEvent('requestfinished', (request) =>
        JAM_CHUNK.test(request.url()),
      )
      settle('release')
      await finished
    },
    refuse: async () => {
      const failed = page.waitForEvent('requestfailed', (request) => JAM_CHUNK.test(request.url()))
      settle('refuse')
      await failed
    },
  }
}

/** Intent: refuse every request for Jam's code chunk, as a network gone away does. */
export async function refuseJamChunk(page: Page): Promise<void> {
  await page.route(JAM_CHUNK, (route) => route.abort('internetdisconnected'))
}

/** Intent: from now on, record whether `mode-switch` ever takes `is-loading`. */
export async function watchOpening(page: Page): Promise<void> {
  await page.evaluate(() => {
    const element = document.querySelector('.mode-switch')
    if (element === null) throw new Error('mode-switch not found')
    window.__modeSwitchLoadingSeen = element.classList.contains('is-loading')
    new MutationObserver(() => {
      if (element.classList.contains('is-loading')) window.__modeSwitchLoadingSeen = true
    }).observe(element, { attributes: true, attributeFilter: ['class'] })
  })
}

/** Intent: whether `mode-switch` has taken `is-loading` since `watchOpening`. */
export function openingSeen(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__modeSwitchLoadingSeen === true)
}

/** Intent: Jam's load-failure notice in the notice row. */
export function jamNotice(page: Page): Locator {
  return page.locator('.app-notice-row .app-notice').filter({ hasText: JAM_LOAD_FAILED })
}

/** Intent: one of Jam's load-failure notice's buttons. */
export function jamNoticeButton(page: Page, name: 'Try again' | 'Dismiss'): Locator {
  return jamNotice(page).getByRole('button', { name, exact: true })
}

/** Intent: wait until this page's own service worker has installed and taken control. */
export async function waitForServiceWorkerReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('service worker registered without an active worker')
  })
}
