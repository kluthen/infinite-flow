/**
 * v2.0 chunk 13, leaving the connection sheet and what it never does to the workspace
 * (flows/controller-connection/handoff.md, Routing rules), on the workspace harness with the fake
 * MIDI access: every close path (Close, Escape, a backdrop click, Continue without a controller)
 * and where focus lands after it (the session action, else the phrase action, else
 * `controller-status`); a close while the browser's own prompt waits abandons the attempt; and
 * item 17: no note played while the sheet is open, phrase 1's first note included, starts a
 * session or changes the workspace.
 */
import { expect, test, type Page } from '@playwright/test'

import { audioEvents } from '../audio/audio-harness-helpers'
import { holdGeneration, releaseGeneration } from '../release/harness-helpers'
import { phraseAction, readyToStart, sessionAction, sessionState } from '../session/session-helpers'
import {
  CHECK,
  CONTINUE_WITHOUT,
  FORM,
  KEYS,
  clickControllerStatus,
  controllerStatus,
  gotoControllerHarness,
  midiState,
  play,
  plug,
  requestCount,
  sheet,
  sheetAction,
  sheetClose,
  statusForm,
  watchPageErrors,
} from './controller-helpers'

/** The four ways to close the sheet from No device found. */
const CLOSE_PATHS = ['Close', 'Escape', 'backdrop', CONTINUE_WITHOUT] as const

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/** Intent: close the open sheet by one path. */
async function closeBy(page: Page, path: (typeof CLOSE_PATHS)[number]): Promise<void> {
  if (path === 'Close') await sheetClose(page).click()
  else if (path === 'Escape') await page.keyboard.press('Escape')
  // The backdrop's padding, outside the centered sheet.
  else if (path === 'backdrop') await page.mouse.click(4, 4)
  else await sheetAction(page, path).click()
  await expect(sheet(page)).toBeHidden()
}

/**
 * Intent: what the workspace shows and holds, to compare before and after: the phrase and its
 * seed, the operation, how many engravings ran, the checked radios, the header actions and the
 * session phase.
 */
async function workspaceState(page: Page): Promise<unknown> {
  const snapshot = await page.evaluate(() => window.__workspaceHarness.snapshot())
  return {
    seed: snapshot.seed,
    requestId: snapshot.requestId,
    timeline: snapshot.timeline,
    operation: snapshot.operation,
    engravings: await page.evaluate(() => window.__workspaceHarness.engravings()),
    checked: await page.locator('[role="radio"][aria-checked="true"]').allTextContents(),
    phraseAction: await phraseAction(page).textContent(),
    sessionAction: await sessionAction(page).textContent(),
    phase: (await sessionState(page)).phase,
  }
}

/** Intent: phrase 1's first sounding note's concert pitch, read from the shown timeline. */
async function firstNotePitch(page: Page): Promise<number> {
  const { timeline } = await page.evaluate(() => window.__workspaceHarness.snapshot())
  if (timeline === null) throw new Error('no phrase is shown')
  const parsed = JSON.parse(timeline) as {
    measures: { events: { kind: string; pitch?: number }[] }[]
  }
  const first = parsed.measures.flatMap((m) => m.events).find((e) => e.kind === 'note')
  if (first?.pitch === undefined) throw new Error('phrase 1 has no note')
  return first.pitch
}

/** Intent: assert no session started: idle, no count-in shown or scheduled, the audio not running. */
async function expectNoSessionStarted(page: Page): Promise<void> {
  expect((await sessionState(page)).phase).toBe('idle')
  await expect(page.locator('.count-in')).toHaveCount(0)
  expect((await audioEvents(page)).filter((event) => event.kind === 'click')).toEqual([])
  expect(await page.evaluate(() => window.__workspaceHarness.audio.isRunning())).toBe(false)
  await expect(sessionAction(page)).toHaveText('Start session')
}

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('closing the sheet', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('every close path returns to the workspace as it was, focus on Start session', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await readyToStart(page)
    const before = await workspaceState(page)

    for (const path of CLOSE_PATHS) {
      await clickControllerStatus(page)
      await expect(sheet(page).locator('#sheet-title')).toHaveText('No controller found')

      await closeBy(page, path)

      await expect(sessionAction(page), `after ${path}`).toBeFocused()
      expect(await workspaceState(page), `after ${path}`).toEqual(before)
      await expect.poll(() => statusForm(page)).toEqual(FORM.connect)
    }
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('with Start session disabled (an empty workspace), focus goes to the phrase action', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await expect(sessionAction(page)).toBeDisabled()

    await clickControllerStatus(page)
    await closeBy(page, 'Escape')

    await expect(phraseAction(page)).toHaveText('Generate phrase')
    await expect(phraseAction(page)).toBeFocused()
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('with both header actions disabled (Loading), focus goes back to controller-status', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await holdGeneration(page)
    await phraseAction(page).click()
    await expect
      .poll(async () => (await page.evaluate(() => window.__workspaceHarness.snapshot())).operation)
      .toBe('generating')
    await expect(phraseAction(page)).toBeDisabled()
    await expect(sessionAction(page)).toBeDisabled()

    await clickControllerStatus(page)
    await closeBy(page, 'Close')

    await expect(controllerStatus(page)).toBeFocused()
    await releaseGeneration(page)
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
test.describe('closing while the browser prompt waits abandons the attempt', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('a later Allow selects nothing and opens nothing; the next click asks nothing', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await plug(page, KEYS)
    await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Allow MIDI access')
    await closeBy(page, 'Close')

    await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

    await expect.poll(() => midiState(page)).toEqual({ kind: 'choosing' })
    await expect(sheet(page)).toBeHidden()
    expect(await statusForm(page)).toEqual(FORM.connect)

    // The next click resolves without a new request (no browser prompt).
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
    expect(await requestCount(page)).toBe(1)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('a later Block, between sessions, shows the MIDI-blocked badge and opens nothing', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Allow MIDI access')
    await closeBy(page, 'Escape')

    await page.evaluate(() => {
      window.__workspaceHarness.midi.denyNextRequest()
      window.__workspaceHarness.midi.releaseHeldRequest()
    })

    await expect.poll(() => statusForm(page)).toEqual(FORM.blocked)
    await expect(sheet(page)).toBeHidden()
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('a click again before the answer waits on the same prompt, then resolves', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await plug(page, KEYS)
    await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())
    await clickControllerStatus(page)
    await closeBy(page, 'Close')

    await clickControllerStatus(page)

    // The browser still asks: the same request, shown waiting again.
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Allow MIDI access')
    await expect(sheetClose(page)).toBeFocused()
    expect(await requestCount(page)).toBe(1)

    await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

    await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')
    await expect.poll(() => statusForm(page)).toEqual(FORM.connected(KEYS.name))
    expect(await requestCount(page)).toBe(1)
  })
})

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_controller_transposition_check]]
test.describe('item 17: notes played while the sheet is open', () => {
  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_controller_connects_between_sessions]]
  // @test-link [[rule_controller_transposition_check]]
  test('neither the check note nor phrase 1 first note starts a session or changes anything', async ({
    page,
  }) => {
    await gotoControllerHarness(page)
    await readyToStart(page)
    const firstNote = await firstNotePitch(page)
    const before = await workspaceState(page)
    await plug(page, KEYS)
    await clickControllerStatus(page)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Check your controller')

    // In the check's Prompt: phrase 1's first note first, then others.
    for (const pitch of [firstNote, CHECK.tenor.concert, CHECK.tenor.written, firstNote + 12]) {
      await play(page, KEYS, pitch)
    }
    await expect(sheetAction(page, 'Continue')).toBeFocused()
    expect(await page.evaluate(() => window.__workspaceHarness.midi.playedNotes().length)).toBe(4)
    await expectNoSessionStarted(page)
    expect(await workspaceState(page)).toEqual(before)

    // At Connected: the same.
    await sheetAction(page, 'Continue').click()
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
    for (const pitch of [firstNote, firstNote - 1, firstNote]) await play(page, KEYS, pitch)
    expect(await page.evaluate(() => window.__workspaceHarness.midi.playedNotes().length)).toBe(7)
    await expect(sheet(page).locator('#sheet-title')).toHaveText('Controller connected')
    await expectNoSessionStarted(page)
    expect(await workspaceState(page)).toEqual(before)

    await sheetAction(page, 'Done').click()
    await expect(sessionAction(page)).toBeFocused()
    await expectNoSessionStarted(page)
  })
})
