/**
 * v3.0 chunk 7b, the settings saved around a session, on the workspace harness (port 4175) with
 * its fake audio clock and fake MIDI access, over the browser's real IndexedDB; each test starts
 * from an empty browser context and changes settings through the controls as the player does:
 *
 * - the review's preferences (the format, the backing track, the `Played notes` switch) come back
 *   in the next session's Review after a reload;
 * - a Rising-tempo session's reached tempo is not saved: after a reload the tempo control shows
 *   the player's tempo and no "Last session reached" note;
 * - after a session in which `Vary settings` changed a setting and `Rising tempo` raised the tempo,
 *   the stored settings are exactly the player's choices: nothing the app set during the session,
 *   nor the end-of-session restore, was written, and a reload shows the player's own values;
 * - a write spy on IndexedDB sees no write from Start to the session's end, then exactly the theme
 *   and mix changes the player made during it, and the session itself (chunk 10a).
 *
 * A save is asynchronous, so before reading what a session's end wrote, a test makes one more
 * change (the theme) and waits until it is stored: saves are written in order, so every write
 * made before it has landed by then.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  queueSessionSeeds,
  sessionSeedsDrawn,
  settingsMutationSeed,
} from '../release/harness-helpers'
import {
  backingTrackToggle,
  formatOption,
  pickFormat,
  playedNotesToggle,
  reviewOfSession,
} from '../review/review-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  sessionTimeline,
  setRisingTempo,
  startSession,
  toRunning,
} from '../session/session-helpers'
import { KEYS, clockTo, connectDevice, phraseStartsAt } from '../session/session-midi-helpers'
import { radio } from '../workspace/helpers'
import {
  reloadHarness,
  shownControls,
  storedSettings,
  untilStored,
  type ShownControls,
} from './storage-helpers'

/** One measure at `bpm`, in seconds. */
function measure(bpm: number): number {
  return (4 * 60) / bpm
}

/** The Vary settings mutation seed that steps a Jazz `Varying` register on phrase 3. */
const REGISTER_ON_PHRASE_3 = 25

/** Intent: whether a radio is the checked option of its group. */
async function expectChecked(page: Page, group: string, option: string): Promise<void> {
  await expect(radio(page, group, option)).toHaveAttribute('aria-checked', 'true')
}

/** Intent: the tempo stepper. */
function tempoStepper(page: Page): Locator {
  return page.getByRole('spinbutton', { name: 'Tempo' })
}

/** Intent: the tempo field's notes (the reached-tempo note, when one shows). */
function tempoFieldNotes(page: Page): Locator {
  return page
    .locator('.field-group')
    .filter({ has: tempoStepper(page) })
    .locator('.field-note')
}

/**
 * Intent: make one more change, the theme `Dark`, and wait until it is stored: saves are written
 * in order, so every save made before it has landed too.
 */
async function afterEarlierSaves(page: Page): Promise<void> {
  await radio(page, 'Presentation theme', 'Dark').click()
  await untilStored(page, { theme: 'Dark' })
}

/** Intent: run the session clock until phrase 3 sounds, phrases 1 and 2 at 90 BPM. */
async function toPhraseThree(page: Page): Promise<void> {
  const { countInEndsAt } = await sessionTimeline(page)
  await clockTo(page, countInEndsAt + 7 * measure(90) + 0.1)
  await clockTo(page, (await phraseStartsAt(page, 3)) + 0.1)
}

/**
 * Intent: the controls a reload compares, without the ones a reload with no controller attached
 * shows otherwise (`Rising tempo`) and the theme a test changes to wait for the saves.
 */
function comparedControls(shown: ShownControls) {
  return {
    radiogroups: shown.radiogroups.filter(
      (group) => !/^(Rising tempo|Presentation theme):/.test(group),
    ),
    spinbuttons: shown.spinbuttons,
  }
}

// @test-link [[rule_settings_saved_on_change]]
test("the review's format, backing track and Played notes switch come back in the next session's Review after a reload", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await reviewOfSession(page, true)
  await expect(formatOption(page, 'MusicXML')).toHaveAttribute('aria-checked', 'true')
  await pickFormat(page, 'MIDI')
  await backingTrackToggle(page).click()
  await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
  await playedNotesToggle(page).click()
  await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
  await untilStored(page, {
    'review.format': 'midi',
    'review.backingTrack': true,
    'review.playedNotesShown': true,
  })

  // The same session again on a freshly loaded page (the helper navigates to the harness again).
  await reviewOfSession(page, true)
  await expect(formatOption(page, 'MIDI')).toHaveAttribute('aria-checked', 'true')
  await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(playedNotesToggle(page)).toHaveAttribute('aria-pressed', 'true')
})

// @test-link [[rule_saved_setting_is_players_choice]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
test("a Rising-tempo session's reached tempo does not come back after a reload", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await readyToStart(page)
  await connectDevice(page, KEYS)
  await setRisingTempo(page, true)
  await untilStored(page, { 'sessionOptions.risingTempo': true })
  const chosen = await storedSettings(page)
  expect(chosen).toEqual({ 'sessionOptions.risingTempo': true })

  await startSession(page)
  await toPhraseThree(page)
  expect((await sessionState(page)).sessionTempo).toBe(95)
  await sessionAction(page).click()
  await expect(tempoFieldNotes(page)).toHaveText(['Last session reached 95 BPM.'])
  await afterEarlierSaves(page)
  expect(await storedSettings(page)).toEqual({ ...chosen, theme: 'Dark' })

  await reloadHarness(page)
  await expect(tempoStepper(page)).toHaveAttribute('aria-valuenow', '90')
  await expect(tempoFieldNotes(page)).toHaveCount(0)
})

// @test-link [[rule_saved_setting_is_players_choice]]
// @test-link [[rule_mutation_reverts_at_session_end]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
test("after a session in which Vary settings changed a setting and Rising tempo raised the tempo, a reload shows the player's own values", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await queueSessionSeeds(page, [await settingsMutationSeed(page, REGISTER_ON_PHRASE_3)])
  await readyToStart(page)
  await connectDevice(page, KEYS)
  await radio(page, 'Vary settings', 'On').click()
  await setRisingTempo(page, true)
  // The queued session seed is the one drawn with the phrase 1 the session starts from.
  expect(await sessionSeedsDrawn(page)).toBe(1)
  await untilStored(page, {
    profileSelection: { musicalProfile: 'Jazz', isCustom: false },
    'controls.register': 'Varying',
    'sessionOptions.varySettings': true,
    'sessionOptions.risingTempo': true,
  })
  const chosen = await storedSettings(page)
  expect(chosen).not.toHaveProperty('controls.tempo')
  const players = comparedControls(await shownControls(page))

  await startSession(page)
  await toPhraseThree(page)
  expect((await sessionState(page)).sessionTempo).toBe(95)
  await expect
    .poll(async () => radio(page, 'Register', 'Varying').getAttribute('aria-checked'))
    .toBe('false')
  await expect(page.locator('.preset-status-text:not(.is-reserve)')).toHaveText(
    /^Custom configuration - Jazz grammar retained/,
  )

  await sessionAction(page).click()
  expect((await sessionState(page)).lastEnd?.cause).toBe('stop')
  await expectChecked(page, 'Register', 'Varying')
  await expectChecked(page, 'Musical profile preset', 'Jazz')
  await afterEarlierSaves(page)
  expect(await storedSettings(page)).toEqual({ ...chosen, theme: 'Dark' })

  await reloadHarness(page)
  await expect(tempoFieldNotes(page)).toHaveCount(0)
  expect(comparedControls(await shownControls(page))).toEqual(players)
  await expectChecked(page, 'Musical profile preset', 'Jazz')
  await expect(tempoStepper(page)).toHaveAttribute('aria-valuenow', '90')
})

/** One IndexedDB write the spy saw: its method, store, key and the test's phase at the time. */
interface SeenWrite {
  readonly method: string
  readonly store: string
  readonly key: string
  readonly phase: string
}

declare global {
  interface Window {
    __phase?: string
    __writes?: SeenWrite[]
  }
}

/**
 * Intent: before any page script runs, wrap every IndexedDB object store write (`put`, `add`,
 * `delete`, `clear`) so each is recorded in `window.__writes` with the phase the test set in
 * `window.__phase` when it was made.
 */
async function installWriteSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__phase = 'load'
    window.__writes = []
    for (const method of ['put', 'add', 'delete', 'clear'] as const) {
      const original = IDBObjectStore.prototype[method] as (...args: unknown[]) => IDBRequest
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          const key = method === 'put' || method === 'add' ? args[1] : args[0]
          window.__writes?.push({
            method,
            store: this.name,
            key: String(key),
            phase: window.__phase ?? '',
          })
          return original.apply(this, args)
        },
      })
    }
  })
}

/** Intent: mark the writes made from now on with `phase`. */
function setPhase(page: Page, phase: string): Promise<void> {
  return page.evaluate((value) => {
    window.__phase = value
  }, phase)
}

/**
 * Intent: the writes the spy saw in `phase`, ordered by store and key, a kept session's key
 * written as its form, `session-{startedAt}-{sessionSeed}`.
 */
async function writesIn(page: Page, phase: string): Promise<string[]> {
  const writes = await page.evaluate(() => window.__writes ?? [])
  return writes
    .filter((write) => write.phase === phase)
    .map((write) => {
      const key = write.key.replace(/^session-\d+-\d+$/, 'session-{startedAt}-{sessionSeed}')
      return `${write.method} ${write.store} ${key}`
    })
    .sort()
}

// @test-link [[rule_no_save_during_session]]
test("a write spy on IndexedDB sees no write from Start to the session's end, then the theme and mix changes made during it and the session", async ({
  page,
}) => {
  test.setTimeout(90_000)
  await installWriteSpy(page)
  await gotoSessionHarness(page)
  await readyToStart(page)

  await setPhase(page, 'session')
  await startSession(page)
  await toRunning(page)
  await radio(page, 'Presentation theme', 'Dark').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const click = page.locator('.score-toolbar').getByRole('button', { name: 'Click', exact: true })
  await click.click()
  await expect(click).toHaveAttribute('aria-pressed', 'false')
  await clockTo(page, (await sessionTimeline(page)).countInEndsAt + 4)
  // A write the hold failed to hold would land within a few milliseconds of its change.
  await page.waitForTimeout(500)
  expect(await writesIn(page, 'session')).toEqual([])

  await setPhase(page, 'ended')
  await sessionAction(page).click()
  await expect
    .poll(() => writesIn(page, 'ended'))
    .toEqual([
      'put sessionBodies session-{startedAt}-{sessionSeed}',
      'put sessionSummaries session-{startedAt}-{sessionSeed}',
      'put settings mix.clickOn',
      'put settings theme',
    ])
  await untilStored(page, { theme: 'Dark', 'mix.clickOn': false })
  expect(await writesIn(page, 'session')).toEqual([])
})
