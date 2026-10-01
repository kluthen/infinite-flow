/**
 * Shared helpers for the audio transport specs: navigation to the workspace harness in its fake or
 * real audio mode, the harness's Start audio click, a generated phrase for the backing to follow,
 * thin wrappers around the typed
 * `window.__workspaceHarness.audio` API, and a spy on every Web Audio context the page creates.
 */
import { expect, type Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'

/** The tempo of the scripted runs, and its beat length in seconds. */
export const TEMPO = 120
export const BEAT_SECONDS = 60 / TEMPO

type AudioSpyWindow = Window & {
  __audioSpy: { installed: boolean; constructions: number; suspends: number; closes: number }
}

/** What the audio spy counted on the page. */
export interface AudioSpyCounts {
  readonly installed: boolean
  readonly constructions: number
  readonly suspends: number
  readonly closes: number
}

/**
 * Intent: before any page script runs, wrap `window.AudioContext` in a Proxy that counts every
 * construction, and count every `suspend` and `close` call on any audio context. `installed`
 * proves the spy was armed rather than passing because the constructor was missing.
 */
// @test-link [[rule_audio_unlocked_by_player_click]]
export async function installAudioSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { installed: false, constructions: 0, suspends: 0, closes: 0 }
    ;(window as unknown as AudioSpyWindow).__audioSpy = spy
    const Original = window.AudioContext
    if (typeof Original !== 'function') return
    const proto = Original.prototype
    const suspend = proto.suspend
    const close = proto.close
    proto.suspend = function (this: AudioContext) {
      spy.suspends += 1
      return suspend.call(this)
    }
    proto.close = function (this: AudioContext) {
      spy.closes += 1
      return close.call(this)
    }
    window.AudioContext = new Proxy(Original, {
      construct(target, args) {
        spy.constructions += 1
        return Reflect.construct(target, args) as object
      },
    })
    spy.installed = true
  })
}

/** Intent: the audio spy's counts, read from the page. */
export function readAudioSpy(page: Page): Promise<AudioSpyCounts> {
  return page.evaluate(() => ({ ...(window as unknown as AudioSpyWindow).__audioSpy }))
}

/** Intent: land on the workspace harness in `mode`, with its audio API ready. */
export async function gotoAudioHarness(
  page: Page,
  mode: WorkspaceHarnessAudioMode = 'fake',
): Promise<void> {
  await page.goto(mode === 'real' ? `${WORKSPACE_HARNESS_URL}?audio=real` : WORKSPACE_HARNESS_URL)
  await page.waitForFunction(() => typeof window.__workspaceHarness?.audio !== 'undefined')
}

/** Intent: the harness's Start audio button, which stands in for chunk 15's Start button. */
export function startAudioButton(page: Page) {
  return page.getByRole('button', { name: 'Start audio (harness)' })
}

/**
 * Intent: arm `tempo`, then start a session with a real click on the Start audio button, and
 * return the timeline it started.
 */
// @test-link [[rule_audio_unlocked_by_player_click]]
export async function startAudio(
  page: Page,
  tempo = TEMPO,
): Promise<WorkspaceHarnessAudioTimeline> {
  await page.evaluate((t) => window.__workspaceHarness.audio.armStart({ tempo: t }), tempo)
  await startAudioButton(page).click()
  const timeline = await page.evaluate(() => window.__workspaceHarness.audio.timeline())
  if (timeline === null) throw new Error('The Start audio click started no session')
  return timeline
}

/** Intent: move the fake audio clock forward by `seconds`. */
export function advanceAudio(page: Page, seconds: number): Promise<void> {
  return page.evaluate((s) => window.__workspaceHarness.audio.advance(s), seconds)
}

/** Intent: move the fake audio clock forward to audio time `t`. */
export async function advanceAudioTo(page: Page, t: number): Promise<void> {
  await advanceAudio(page, t - (await audioNow(page)))
}

/** Intent: the audio clock's time. */
export function audioNow(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.audio.now())
}

/** Intent: every call the transport made on its audio output, in order. */
export function audioEvents(page: Page): Promise<readonly WorkspaceHarnessAudioEvent[]> {
  return page.evaluate(() => window.__workspaceHarness.audio.events())
}

/** Intent: the scheduled clicks alone, in order. */
export async function scheduledClicks(
  page: Page,
): Promise<Extract<WorkspaceHarnessAudioEvent, { kind: 'click' }>[]> {
  return (await audioEvents(page)).filter(
    (event): event is Extract<WorkspaceHarnessAudioEvent, { kind: 'click' }> =>
      event.kind === 'click',
  )
}

/** Intent: the clicks that sound, with the gain they sound at. */
export function audibleClicks(page: Page): Promise<readonly WorkspaceHarnessAudibleClick[]> {
  return page.evaluate(() => window.__workspaceHarness.audio.audibleClicks())
}

/**
 * Intent: generate one phrase in the harness's workspace from a real Generate click, seeded with
 * `seed` first, and wait until the session is idle with a phrase shown.
 */
// @test-link [[req_session_backing_track]]
export async function generateShownPhrase(page: Page, seed: number): Promise<void> {
  await page.evaluate((s) => window.__workspaceHarness.queueSeeds([s]), seed)
  await page.getByRole('button', { name: 'Generate phrase' }).click()
  await expect
    .poll(
      async () => {
        const { operation, timeline } = await page.evaluate(() =>
          window.__workspaceHarness.snapshot(),
        )
        return operation === 'idle' && timeline !== null
      },
      { timeout: 30_000 },
    )
    .toBe(true)
}

/** Intent: queue phrase `phraseNumber`'s backing from the shown phrase; returns its harmony. */
export function queueBacking(
  page: Page,
  phraseNumber: number,
): Promise<readonly WorkspaceHarnessQueuedHarmonyEvent[]> {
  return page.evaluate((n) => window.__workspaceHarness.audio.queueBacking(n), phraseNumber)
}

/** Intent: every scheduled backing note, in order. */
export function backingNotes(page: Page): Promise<readonly WorkspaceHarnessBackingNote[]> {
  return page.evaluate(() => window.__workspaceHarness.audio.backingNotes())
}

/** Intent: the backing notes that sound, with the gain they sound at. */
export function audibleBacking(page: Page): Promise<readonly WorkspaceHarnessAudibleBackingNote[]> {
  return page.evaluate(() => window.__workspaceHarness.audio.audibleBacking())
}

/** Intent: set the backing volume. */
export function setBackingVolume(page: Page, level: number): Promise<void> {
  return page.evaluate((value) => window.__workspaceHarness.audio.setBackingVolume(value), level)
}

/** Intent: turn the click on or off. */
export function setClickOn(page: Page, on: boolean): Promise<void> {
  return page.evaluate((value) => window.__workspaceHarness.audio.setClickOn(value), on)
}

/** Intent: set the click volume. */
export function setClickVolume(page: Page, level: number): Promise<void> {
  return page.evaluate((value) => window.__workspaceHarness.audio.setClickVolume(value), level)
}

/** Intent: turn the backing on or off. */
export function setBackingOn(page: Page, on: boolean): Promise<void> {
  return page.evaluate((value) => window.__workspaceHarness.audio.setBackingOn(value), on)
}

/** Intent: stop the running session, returning when its fade reaches silence. */
export function stopAudio(page: Page): Promise<{ readonly fadeEndsAt: number }> {
  return page.evaluate(() => window.__workspaceHarness.audio.stop())
}

/** Intent: whether a session is running. */
export function isAudioRunning(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__workspaceHarness.audio.isRunning())
}

/** Intent: whether the audio is unlocked. */
export function isAudioUnlocked(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__workspaceHarness.audio.isUnlocked())
}

/** Intent: the mix's design range and first-load levels. */
export function mixDesign(page: Page): Promise<WorkspaceHarnessMixDesign> {
  return page.evaluate(() => window.__workspaceHarness.audio.mixDesign())
}

/** Intent: the transport's mix now, as the toolbar's audio mix left it. */
export function audioMix(page: Page): Promise<WorkspaceHarnessMixDesign['defaults']> {
  return page.evaluate(() => window.__workspaceHarness.audio.mix())
}
