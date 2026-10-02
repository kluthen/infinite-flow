import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  CHECK,
  KEYS,
  PAD,
  clickControllerStatus,
  connectThroughSheet,
  deviceOption,
  gotoControllerHarness,
  play,
  sheet,
  sheetAction,
  unplug,
} from './controller/controller-helpers'
import { generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './workspace/helpers'
import {
  failNextGeneration,
  failNextNotation,
  gotoWorkspaceHarness,
  harnessSnapshot,
  holdGeneration,
  queueSeeds,
  releaseGeneration,
} from './release/harness-helpers'
import {
  DESKTOP,
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  startSession,
  toRunning,
} from './session/session-helpers'
import { connectDevice, unplugNow } from './session/session-midi-helpers'
import {
  backingTrackToggle,
  exportButton,
  exportError,
  pickFormat,
  reviewItems,
  reviewLink,
  sessionEndedAfter,
} from './review/review-helpers'

/** A tablet in landscape, at bp-tablet-landscape (64rem = 1024 px): the one-system layout. */
const TABLET = { width: 1024, height: 768 } as const

/** Intent: format axe violations into a readable failure message rather than a raw object dump. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

test('has no detectable axe violations in the empty shell', async ({ page }) => {
  await page.goto('/')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

// @test-link [[req_session_audio_mix]]
test('has no detectable axe violations with the audio mix Volume popover open', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Volume', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Backing volume' })).toBeFocused()

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

test('has no detectable axe violations after generation, in Light and Dark theme', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  for (const theme of ['Light', 'Dark'] as const) {
    await radio(page, 'Presentation theme', theme).click()
    // Theme colours transition (e.g. `.btn-primary` over `--duration-feedback`); scanning
    // mid-transition would catch a transient blended colour, not the settled theme palette.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
    )
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations,
      `${theme} theme:\n${describeViolations(results.violations)}`,
    ).toEqual([])
  }
})

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
test('has no detectable axe violations in the unsupported-rhythm-setting state', async ({
  page,
}) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Silence density', 'Breath-heavy').click()
  await radio(page, 'Syncopation', 'Active displacement').click()
  await expect(
    page.getByRole('status').filter({ hasText: "can't form a four-bar phrase" }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

// The remaining states below need the real generation/notation failure seams the workspace harness
// (port 4175) exposes -- the production build (port 4173) has no way to force them deterministically.

// @test-link [[rule_readonly_controls_keep_contrast]]
test('has no detectable axe violations while a generation is gated in flight', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await holdGeneration(page)

  await primaryButton(page).click()
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('generating')

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])

  await releaseGeneration(page)
  await expect.poll(async () => (await harnessSnapshot(page)).operation).toBe('idle')
})

test('has no detectable axe violations in the generation-failed error state', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await failNextGeneration(page, 'no_legal_harmony_plan')

  await primaryButton(page).click()
  await expect(page.locator('.inline-alert.alert-error')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

test('has no detectable axe violations in the notation-failed error state', async ({ page }) => {
  await gotoWorkspaceHarness(page)
  await queueSeeds(page, [1])
  await generateAndAwaitReady(page)

  await failNextNotation(page)
  // No session action: force an out-of-band PhraseScore redraw (a resize) to fail on its own. Stays
  // above the 64rem phone-layout breakpoint so this is the only redraw trigger the resize fires --
  // crossing the breakpoint also fires the phone-layout `matchMedia` listener's own `scheduleRedraw`,
  // whose later, unarmed redraw would silently recover the just-armed failure before assertions run.
  await page.setViewportSize({ width: 1100, height: 720 })
  await expect(page.locator('.inline-alert.alert-error')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, describeViolations(results.violations)).toEqual([])
})

// The connection sheet, open in each of its states (chunk 13), on the workspace harness's fake
// MIDI access, in both themes. Each state is reached through the header's controller-status click.

/** One sheet state to scan: how to reach it from a fresh harness page, and its title. */
interface SheetScan {
  readonly name: string
  readonly midi?: 'fake' | 'unsupported'
  readonly reach: (page: Page) => Promise<void>
  readonly title: string
}

const SHEET_SCANS: readonly SheetScan[] = [
  {
    name: 'Requesting access, Checking',
    reach: async (page) => {
      await page.evaluate(() => {
        window.__workspaceHarness.midi.setPermission('granted')
        window.__workspaceHarness.midi.holdNextRequest()
      })
      await clickControllerStatus(page)
    },
    title: 'Connecting…',
  },
  {
    name: 'Requesting access, Waiting for your browser',
    reach: async (page) => {
      await page.evaluate(() => window.__workspaceHarness.midi.holdNextRequest())
      await clickControllerStatus(page)
    },
    title: 'Allow MIDI access',
  },
  {
    name: 'Unsupported browser',
    midi: 'unsupported',
    reach: (page) => clickControllerStatus(page),
    title: "Controller connection isn't available here",
  },
  {
    name: 'Permission denied',
    reach: async (page) => {
      await page.evaluate(() => window.__workspaceHarness.midi.denyNextRequest())
      await clickControllerStatus(page)
    },
    title: 'MIDI access is blocked',
  },
  {
    name: 'No device found',
    reach: (page) => clickControllerStatus(page),
    title: 'No controller found',
  },
  {
    name: 'Multi-device picker',
    reach: (page) => connectThroughSheet(page, [KEYS, PAD]),
    title: 'Choose a controller',
  },
  {
    name: 'Transposition check, Prompt',
    reach: async (page) => {
      await connectThroughSheet(page, [KEYS])
      await expect(sheet(page).locator('.check-note svg')).toHaveCount(1)
    },
    title: 'Check your controller',
  },
  {
    name: 'Transposition check, Result',
    reach: async (page) => {
      await connectThroughSheet(page, [KEYS])
      await play(page, KEYS, CHECK.tenor.written)
      await expect(sheetAction(page, 'Continue')).toBeFocused()
    },
    title: 'Check your controller',
  },
  {
    name: 'Connected',
    reach: async (page) => {
      await connectThroughSheet(page, [KEYS, PAD])
      await deviceOption(page, KEYS.name).click()
      await play(page, KEYS, CHECK.tenor.concert)
      await sheetAction(page, 'Continue').click()
    },
    title: 'Controller connected',
  },
  {
    name: 'Multi-device picker with the device in use',
    reach: async (page) => {
      await connectThroughSheet(page, [KEYS, PAD])
      await deviceOption(page, KEYS.name).click()
      await play(page, KEYS, CHECK.tenor.concert)
      await sheetAction(page, 'Continue').click()
      await sheetAction(page, 'Choose a different device').click()
      await expect(deviceOption(page, KEYS.name)).toHaveClass(/is-selected/)
    },
    title: 'Choose a controller',
  },
  {
    name: 'the device-change line',
    reach: async (page) => {
      await connectThroughSheet(page, [KEYS, PAD])
      await deviceOption(page, KEYS.name).click()
      await unplug(page, KEYS)
      await expect(sheet(page).locator('.sheet-body')).toContainText('Keys 49 was unplugged.')
    },
    title: 'Choose a controller',
  },
]

for (const scan of SHEET_SCANS) {
  for (const theme of ['Light', 'Dark'] as const) {
    // @test-link [[rule_controller_connects_between_sessions]]
    test(`has no detectable axe violations with the connection sheet at ${scan.name}, ${theme} theme`, async ({
      page,
    }) => {
      await gotoControllerHarness(page, { midi: scan.midi ?? 'fake' })
      await radio(page, 'Presentation theme', theme).click()

      await scan.reach(page)
      await expect(sheet(page).locator('#sheet-title')).toHaveText(scan.title)
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
      )

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, describeViolations(results.violations)).toEqual([])
    })
  }
}

// The MIDI session states (chunk 17), on the workspace harness's fake MIDI access and fake audio
// clock, in both themes: the start line with the start marker at Ready, and the disconnect banner
// with the disconnected badge while a lost controller's countdown runs.

/** One MIDI session state to scan: how to reach it from Ready with the keyboard connected. */
interface MidiSessionScan {
  readonly name: string
  readonly reach: (page: Page) => Promise<void>
}

const MIDI_SESSION_SCANS: readonly MidiSessionScan[] = [
  {
    name: 'the start line at Ready',
    reach: async (page) => {
      await expect(page.locator('.session-cue-row p.start-note-line')).toBeVisible()
      await expect(page.locator('.staff-frame .start-note-marker')).toHaveCount(1)
    },
  },
  {
    name: 'the disconnect banner mid-session',
    reach: async (page) => {
      await startSession(page)
      await toRunning(page)
      await unplugNow(page, KEYS)
      await expect(page.locator('.session-cue-row .session-alert-countdown')).toHaveText('30 s')
    },
  },
]

for (const scan of MIDI_SESSION_SCANS) {
  for (const theme of ['Light', 'Dark'] as const) {
    // @test-link [[rule_starting_note_named]]
    // @test-link [[rule_controller_loss_mid_session]]
    test(`has no detectable axe violations with ${scan.name}, ${theme} theme`, async ({ page }) => {
      await gotoSessionHarness(page)
      await radio(page, 'Presentation theme', theme).click()
      await connectDevice(page, KEYS)
      await readyToStart(page)

      await scan.reach(page)
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
      )

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, describeViolations(results.violations)).toEqual([])
    })
  }
}

// The last-session Review (chunk 20), on the workspace harness's fake audio clock, in both themes:
// showing after a session end at desktop and tablet widths, with its export error, and closed,
// with `review-link` in the cue row at Idle.

/** One Review state to scan: the viewport, and how to reach it from a Review just opened. */
interface ReviewScan {
  readonly name: string
  readonly size: { readonly width: number; readonly height: number }
  readonly reach: (page: Page) => Promise<void>
}

const REVIEW_SCANS: readonly ReviewScan[] = [
  { name: 'the Review showing at desktop width', size: DESKTOP, reach: async () => {} },
  { name: 'the Review showing at tablet width', size: TABLET, reach: async () => {} },
  {
    name: 'the Review with MIDI and the backing track picked',
    size: DESKTOP,
    reach: async (page) => {
      await pickFormat(page, 'MIDI')
      await backingTrackToggle(page).click()
      await expect(backingTrackToggle(page)).toHaveAttribute('aria-pressed', 'true')
    },
  },
  {
    name: 'the Review export error',
    size: DESKTOP,
    reach: async (page) => {
      await page.evaluate(() => window.__workspaceHarness.failNextExport())
      await exportButton(page).click()
      await expect(exportError(page)).toBeVisible()
    },
  },
  {
    name: 'review-link at Idle',
    size: DESKTOP,
    reach: async (page) => {
      await sessionAction(page).click()
      await expect(reviewLink(page)).toBeVisible()
      await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/, { timeout: 30_000 })
    },
  },
]

for (const scan of REVIEW_SCANS) {
  for (const theme of ['Light', 'Dark'] as const) {
    // @test-link [[req_last_session_review]]
    // @test-link [[req_session_export]]
    test(`has no detectable axe violations with ${scan.name}, ${theme} theme`, async ({ page }) => {
      test.setTimeout(90_000)
      await gotoSessionHarness(page, scan.size)
      await radio(page, 'Presentation theme', theme).click()
      await sessionEndedAfter(page, 2)
      await expect(reviewItems(page).first().locator('.review-staff svg').first()).toBeAttached({
        timeout: 30_000,
      })

      await scan.reach(page)
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
      )

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, describeViolations(results.violations)).toEqual([])
    })
  }
}
