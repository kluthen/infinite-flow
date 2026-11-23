/**
 * The lexicon page's states under axe (v3.4 chunk 2), in both themes, as accessibility.spec.ts
 * checks the sheets' states: the footer with `Lexicon`; the page browsing; searching, a lone match
 * open with its related links; the no-match state; and the lexicon's load-failure notice. The
 * notice is reached on the workspace harness (port 4175), which has no service worker, so the
 * page's words can be refused on the network; the rest on the production build (port 4173).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { gotoWorkspaceHarness } from './release/harness-helpers'
import { gotoWorkspace, radio } from './workspace/helpers'
import {
  LEXICON_WORDS_CHUNK,
  entryOf,
  lexiconButton,
  lexiconNoticeButton,
  lexiconView,
  openLexicon,
  refuseFile,
  searchField,
} from './workspace/lexicon-page-helpers'

/** Format axe violations into a readable failure message rather than a raw object dump. */
function describeViolations(violations: readonly { id: string; help: string }[]): string {
  return violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')
}

/** One lexicon state to scan: where it is reached, and how from the workspace at Idle. */
interface LexiconScan {
  readonly name: string
  readonly on: 'app' | 'harness'
  readonly reach: (page: Page) => Promise<void>
}

const LEXICON_SCANS: readonly LexiconScan[] = [
  {
    name: 'the footer with Lexicon',
    on: 'app',
    reach: (page) => expect(lexiconButton(page)).toBeEnabled(),
  },
  { name: 'the lexicon page browsing', on: 'app', reach: openLexicon },
  {
    name: 'the lexicon page searching, a match open with its related links',
    on: 'app',
    reach: async (page) => {
      await openLexicon(page)
      await searchField(page).fill('semitone')
      const entry = entryOf(page, 'half-step')
      await expect(entry.locator('details.lexicon-more')).toHaveAttribute('open', '')
      await expect(entry.locator('a.lexicon-link').first()).toBeVisible()
    },
  },
  {
    name: 'the lexicon page with no match',
    on: 'app',
    reach: async (page) => {
      await openLexicon(page)
      await searchField(page).fill('zzqx')
      await expect(lexiconView(page).locator('.lexicon-empty')).toBeVisible()
    },
  },
  {
    name: "the lexicon's load-failure notice",
    on: 'harness',
    reach: async (page) => {
      await refuseFile(page, LEXICON_WORDS_CHUNK)
      await lexiconButton(page).click()
      await expect(lexiconNoticeButton(page, 'Try again')).toBeFocused()
    },
  },
]

for (const scan of LEXICON_SCANS) {
  for (const theme of ['Light', 'Dark'] as const) {
    // @test-link [[req_lexicon_page]]
    test(`has no detectable axe violations with ${scan.name}, ${theme} theme`, async ({ page }) => {
      if (scan.on === 'app') await gotoWorkspace(page)
      else await gotoWorkspaceHarness(page)
      await radio(page, 'Presentation theme', theme).click()

      await scan.reach(page)
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
      )

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, describeViolations(results.violations)).toEqual([])
    })
  }
}
