/**
 * Shared helpers for the release journey specs that need the workspace harness's deterministic
 * seams (tests/e2e/workspace-harness) rather than the production build's real crypto seed and
 * request-id providers: navigation to the harness's own origin (port 4175, a second Playwright
 * webServer entry) and thin wrappers around its typed `window.__workspaceHarness` API.
 */
import { type Locator, type Page, expect } from '@playwright/test'

import { primaryButton } from '../workspace/helpers'

export const WORKSPACE_HARNESS_URL = 'http://127.0.0.1:4175/'

/** Intent: land on the harness's empty workspace state with its deterministic API ready. */
export async function gotoWorkspaceHarness(page: Page, search = ''): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}${search}`)
  await page.waitForFunction(() => typeof window.__workspaceHarness !== 'undefined')
}

/** Intent: read the harness's current session snapshot (requestId/seed/timeline/operation/mode). */
export function harnessSnapshot(page: Page): Promise<WorkspaceHarnessSnapshot> {
  return page.evaluate(() => window.__workspaceHarness.snapshot())
}

/** Intent: queue the exact seeds the next N generations must draw, in order. */
export function queueSeeds(page: Page, seeds: readonly number[]): Promise<void> {
  return page.evaluate((values) => window.__workspaceHarness.queueSeeds(values), seeds)
}

/**
 * Intent: queue the exact session seeds the next published phrase 1s must draw, in order; every
 * seed a session then uses derives from the one drawn with its phrase 1.
 */
export function queueSessionSeeds(page: Page, seeds: readonly number[]): Promise<void> {
  return page.evaluate((values) => window.__workspaceHarness.queueSessionSeeds(values), seeds)
}

/**
 * Intent: the session seed plan's seed of rung `rung` of phrase `phraseNumber`, computed in the
 * page; its own inverse, so given a wanted attempt seed it is the session seed to queue.
 */
export function phraseAttemptSeed(
  page: Page,
  seed: number,
  phraseNumber: number,
  rung: number,
): Promise<number> {
  return page.evaluate(([s, n, r]) => window.__workspaceHarness.phraseAttemptSeed(s, n, r), [
    seed,
    phraseNumber,
    rung,
  ] as const)
}

/**
 * Intent: the session seed plan's Vary settings mutation seed, computed in the page; its own
 * inverse, so given a wanted mutation seed it is the session seed to queue.
 */
export function settingsMutationSeed(page: Page, seed: number): Promise<number> {
  return page.evaluate((s) => window.__workspaceHarness.settingsMutationSeed(s), seed)
}

/**
 * Intent: replay a phrase replay key in the page: decoded by the app's decoder, replayed through
 * the real browser generation worker, answered as its timeline's JSON text or a failure's description.
 */
export function replayKeyInBrowser(page: Page, key: string): Promise<WorkspaceHarnessReplayAnswer> {
  return page.evaluate((value) => window.__workspaceHarness.replay.replayKey(value), key)
}

/** Intent: a phrase replay key's `ifk4.` re-encoding, decoded and encoded again in the page. */
export function reEncodeKeyInBrowser(page: Page, key: string): Promise<string> {
  return page.evaluate((value) => window.__workspaceHarness.replay.reEncodeKey(value), key)
}

/** Intent: hold every subsequent generate() call before it reaches the real worker. */
export function holdGeneration(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.holdGeneration())
}

/** Intent: release a hold; every gated generate() call resumes immediately. */
export function releaseGeneration(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.releaseGeneration())
}

/**
 * Intent: arm forced generation failures with a real orchestration failure code, for the `count`
 * (default 1) generate() calls in a row after `skip` more (default 0) have gone through for real.
 */
export function failNextGeneration(
  page: Page,
  code: WorkspaceHarnessGenerationFailureCode,
  skip = 0,
  count = 1,
): Promise<void> {
  return page.evaluate(([c, n, k]) => window.__workspaceHarness.failNextGeneration(c, n, k), [
    code,
    skip,
    count,
  ] as const)
}

/** Intent: how many generate() calls have returned (forced failures and answers) since load. */
export function generationsSettled(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.generationsSettled())
}

/**
 * Intent: arm exactly one forced notation failure on the next engraving, with this code (the
 * retryable `notation_engraving_failed` by default, or a staff layout failure).
 */
export function failNextNotation(
  page: Page,
  code?: WorkspaceHarnessNotationFailureCode,
): Promise<void> {
  return page.evaluate((c) => window.__workspaceHarness.failNextNotation(c), code)
}

/** Intent: force the next pre-draw fit checks' verdicts, in order; the real planner answers after. */
export function queueFitVerdicts(
  page: Page,
  verdicts: readonly WorkspaceHarnessFitVerdict[],
): Promise<void> {
  return page.evaluate((values) => window.__workspaceHarness.queueFitVerdicts(values), verdicts)
}

/** Intent: how many phrase seeds have been drawn since the page loaded (one per Idle attempt). */
export function seedsDrawn(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.seedsDrawn())
}

/** Intent: how many session seeds have been drawn since the page loaded (one per phrase 1). */
export function sessionSeedsDrawn(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.sessionSeedsDrawn())
}

/** Intent: how many pre-draw fit checks have run since the page loaded, forced or real. */
export function fitChecks(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.fitChecks())
}

/** Intent: how many engravings (draws and redraws) have been attempted since the page loaded. */
export function engravings(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.engravings())
}

/** Intent: how many phrase-independent room checks have run since the page loaded. */
export function roomChecks(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.roomChecks())
}

/** Intent: let two animation frames pass: a media-query change, then the coalesced staff redraw. */
export async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/** Intent: resize the window and let every redraw and run it causes settle to an idle session. */
export async function resizeAndSettle(
  page: Page,
  size: { readonly width: number; readonly height: number },
): Promise<void> {
  await page.setViewportSize(size)
  await settleFrames(page)
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')
}

/** Intent: wait until the session is idle again after an action, however long its run takes. */
export async function awaitIdle(page: Page): Promise<void> {
  await expect
    .poll(async () => (await harnessSnapshot(page)).operation, { timeout: 30_000 })
    .toBe('idle')
}

/** Intent: the "staff needs more room" notice inside the staff frame. */
export function roomNotice(page: Page): Locator {
  return page.locator('.staff-frame p.room-notice')
}

/** Intent: the notice's visible sentence, as assistive technology reads it (hidden spans excluded). */
export function roomNoticeSentence(page: Page): Promise<string> {
  return roomNotice(page).evaluate((notice) => {
    const spans = [...notice.querySelectorAll<HTMLElement>('span')]
    const visible = spans.filter((span) => getComputedStyle(span).display !== 'none')
    const text =
      spans.length === 0 ? notice.textContent : visible.map((s) => s.textContent).join('')
    return (text ?? '').trim()
  })
}

/** The two persistent live regions a spec of the idle fit run listens to. */
export type LiveRegion = '.generation-status' | '.notation-status'

declare global {
  interface Window {
    __liveRegionLogs?: Partial<Record<LiveRegion, string[]>>
    __liveRegionObservers?: Partial<Record<LiveRegion, MutationObserver>>
  }
}

/** The too-many-notes cause's sentence, `room-notice`'s own text at every breakpoint. */
export const TOO_MANY_NOTES_SENTENCE =
  'These notes need more room. Make the window larger, or choose a lower note density.'

/** The no-room cause's sentence at `bp-tablet-landscape` and up (`room-notice-wide`). */
export const NO_ROOM_WIDE_SENTENCE = 'The staff needs more room. Make the window larger.'

/** The no-room cause's sentence below `bp-tablet-landscape` (`room-notice-narrow`). */
export const NO_ROOM_NARROW_SENTENCE = 'This screen is too small to show the staff.'

/**
 * Intent: record every text value one live region takes on from now: one entry per change, the
 * value it had before excluded. Observing a region again replaces its previous observer, so no
 * change is ever logged twice (a sentence announced again is still a change: it is emptied first).
 */
export async function observeLiveRegion(page: Page, region: LiveRegion): Promise<void> {
  await page.evaluate((selector) => {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`${selector} region not found`)
    const logs = (window.__liveRegionLogs ??= {})
    const observers = (window.__liveRegionObservers ??= {})
    observers[selector]?.disconnect()
    const log: string[] = []
    logs[selector] = log
    const observer = new MutationObserver(() => log.push((el.textContent ?? '').trim()))
    observer.observe(el, { childList: true, characterData: true, subtree: true })
    observers[selector] = observer
  }, region)
}

/** Intent: every text value the region has taken on since it was last observed. */
export function readLiveRegionLog(page: Page, region: LiveRegion): Promise<string[]> {
  return page.evaluate((selector) => window.__liveRegionLogs?.[selector] ?? [], region)
}

/** Intent: how many times the region has changed to exactly this text since it was observed. */
export async function announcedCount(
  page: Page,
  region: LiveRegion,
  text: string,
): Promise<number> {
  const log = await readLiveRegionLog(page, region)
  return log.filter((entry) => entry === text).length
}

/**
 * Intent: assert the staff shows neither a score nor the notation error: no engraved staff, no
 * `staff-error` frame, and no "Notation error" wording announced or shown anywhere.
 */
export async function expectNoScoreAndNoNotationError(page: Page): Promise<void> {
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
  await expectNoNotationError(page)
}

/** Intent: assert the notation error shows nowhere: not as a frame state, text or announcement. */
export async function expectNoNotationError(page: Page): Promise<void> {
  await expect(page.locator('.staff-frame')).not.toHaveClass(/staff-error/)
  await expect(page.getByText('Notation error', { exact: false })).toHaveCount(0)
  await expect(page.locator('.notation-status')).not.toHaveText(/Notation error/)
}

/** Intent: the unsupported-rhythm alert in the rhythm controls. */
export function unsupportedRhythmAlert(page: Page): Locator {
  return page
    .locator('.inline-alert.alert-notice')
    .filter({ hasText: "can't form a four-bar phrase" })
}

/**
 * Intent: assert the workspace shows **Empty** with the unsupported-rhythm alert: no phrase, no
 * notice, no generation-failure banner, and `Generate phrase` disabled.
 */
export async function expectEmptyWithUnsupportedAlert(page: Page): Promise<void> {
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-empty/)
  await expect(roomNotice(page)).toHaveCount(0)
  await expect(page.locator('.inline-alert.alert-error')).toHaveCount(0)
  await expect(unsupportedRhythmAlert(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate phrase' })).toBeDisabled()
  await expectNoScoreAndNoNotationError(page)
  const snap = await harnessSnapshot(page)
  expect(snap.roomNotice).toBeNull()
  expect(snap.seed).toBeNull()
}

/**
 * Intent: from Empty or Ready, reach the too-many-notes notice: queue four seeds, force all four
 * attempts too wide, click the phrase action, and wait for the run to end under the notice.
 */
export async function showTooManyNotesNotice(page: Page, seeds: readonly number[]): Promise<void> {
  if (seeds.length !== 4) throw new Error('A run makes exactly four attempts: queue four seeds.')
  await queueSeeds(page, seeds)
  await queueFitVerdicts(page, [
    'notes_too_wide',
    'notes_too_wide',
    'notes_too_wide',
    'notes_too_wide',
  ])
  await primaryButton(page).click()
  await expect
    .poll(async () => (await harnessSnapshot(page)).roomNotice, { timeout: 30_000 })
    .toBe('notes_too_wide')
  await awaitIdle(page)
}
