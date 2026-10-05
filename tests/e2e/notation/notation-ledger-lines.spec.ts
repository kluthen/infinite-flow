/**
 * End-to-end coverage of the ledger lines' colour wherever a score is engraved: a ledger line is a
 * bare path in its note's `g.vf-stavenote` group, and it must carry no stroke of its own, so it
 * inherits the staff colour the stylesheet sets, like the staff lines and the noteheads, in the
 * light and the dark theme. VexFlow's default ledger line style would otherwise write its own grey
 * on every ledger line, which the stylesheet's inherited colour cannot override, leaving dark grey
 * lines on the dark theme's dark staff. The Idle staff is checked on the notation harness
 * (PhraseScore in a real `staff-frame`); the session's rolling staff and the Review, which engrave
 * their own systems, on the workspace harness.
 */
import { expect, test, type Page } from '@playwright/test'

import { expectReviewShowing, playUntilPhrase } from '../review/review-helpers'
import { settledStaff, untilReady } from '../session/rolling-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  startSession,
} from '../session/session-helpers'
import { radio } from '../workspace/helpers'
import { DESKTOP_VIEWPORT, openHarness } from './overlay-harness'

test.use({ baseURL: 'http://127.0.0.1:4174' })

/** Notation-harness fixtures whose phrases reach above or below the staff. */
const LEDGER_FIXTURES = ['simple', 'denseTie'] as const

/** A workspace harness seed whose phrase 1, generated in the High register, draws ledger lines. */
const LEDGER_SEED = 5

/** The session's rolling-staff system SVGs: its settled units, not the ones fading out. */
const SESSION_SYSTEMS = '.staff-content[data-system-part]:not(.is-fading-out) svg.staff-svg'

/** The Review's engraved system SVGs. */
const REVIEW_SYSTEMS = '.review-staff svg.staff-svg'

/** What a staff's ledger lines are drawn with, and the staff colour they should resolve to. */
interface LedgerReading {
  readonly staff: string
  readonly lines: readonly {
    readonly ownStroke: string | null
    readonly stroke: string
    readonly width: string | null
  }[]
}

/**
 * Intent: read every ledger line (a note's bare path) in the staff SVGs `svgs` selects, and the
 * `--color-staff` token resolved to rgb inside the staff element `scope` holding them.
 */
function readLedgerLines(page: Page, scope: string, svgs: string): Promise<LedgerReading> {
  return page.evaluate(
    ([scopeSelector, svgSelector]) => {
      const root = document.querySelector(scopeSelector!)
      if (root === null) throw new Error(`readLedgerLines: no ${scopeSelector}`)
      const probe = document.createElement('div')
      probe.style.color = 'var(--color-staff)'
      root.appendChild(probe)
      const staff = getComputedStyle(probe).color
      probe.remove()
      const paths = root.querySelectorAll(`${svgSelector} g.vf-stavenote > path`)
      return {
        staff,
        lines: Array.from(paths).map((path) => ({
          ownStroke: path.getAttribute('stroke'),
          stroke: getComputedStyle(path).stroke,
          width: path.getAttribute('stroke-width'),
        })),
      }
    },
    [scope, svgs] as const,
  )
}

/** Intent: assert a staff draws ledger lines and every one carries the staff colour only. */
function expectStaffColouredLedgers(reading: LedgerReading): void {
  expect(reading.lines.length).toBeGreaterThan(0)
  for (const line of reading.lines) {
    expect(line.ownStroke).toBeNull()
    expect(line.stroke).toBe(reading.staff)
    // VexFlow's ledger line width is kept: only the colour changed.
    expect(line.width).toBe('2')
  }
}

/** Intent: pick a theme with the app's own theme control. */
async function pickTheme(page: Page, theme: 'Light' | 'Dark'): Promise<void> {
  await radio(page, 'Presentation theme', theme).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
}

// @test-link [[module_notation_note_identity_overlays]]
test.describe('ledger lines take the staff colour on the Idle staff', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const fixture of LEDGER_FIXTURES) {
      test(`${fixture}, ${theme} theme`, async ({ page }) => {
        await openHarness(page, DESKTOP_VIEWPORT, `fixture=${fixture}&width=1200&theme=${theme}`)
        expectStaffColouredLedgers(await readLedgerLines(page, '.staff-frame', 'svg.staff-svg'))
      })
    }
  }
})

// @test-link [[module_notation_note_identity_overlays]]
test('ledger lines take the staff colour on the session staff and the Review, in both themes', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await gotoSessionHarness(page)
  await radio(page, 'Register', 'High').click()
  await readyToStart(page, LEDGER_SEED)
  await startSession(page)
  // In the count-in the rolling staff holds the session's own systems, phrase 1's among them.
  await untilReady(page, 2)
  await settledStaff(page)
  for (const theme of ['Dark', 'Light'] as const) {
    await pickTheme(page, theme)
    expectStaffColouredLedgers(await readLedgerLines(page, '.staff-frame', SESSION_SYSTEMS))
  }

  // Stop once phrase 1 has sounded: the Review lists it.
  await playUntilPhrase(page, 1)
  await sessionAction(page).click()
  await expectReviewShowing(page, 1)
  await expect(page.locator(REVIEW_SYSTEMS).first()).toBeAttached({ timeout: 30_000 })
  for (const theme of ['Dark', 'Light'] as const) {
    await pickTheme(page, theme)
    expectStaffColouredLedgers(await readLedgerLines(page, '.review-panel', REVIEW_SYSTEMS))
  }
})
