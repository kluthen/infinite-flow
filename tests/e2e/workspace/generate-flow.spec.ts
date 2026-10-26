/**
 * The core generate/regenerate flow: the generation-status announcement sequence, the engraved
 * score appearing, the primary action relabeling to Regenerate, a regenerated score differing from
 * its predecessor, and every configuration control staying read-only-but-focusable while a request
 * is in flight.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, primaryButton, radio } from './helpers'

// @test-link [[user_story_controlled_phrase_generation]]
test('generates a phrase: status announces, the score engraves, and the action becomes Regenerate', async ({
  page,
}) => {
  await gotoWorkspace(page)

  await generateAndAwaitReady(page)

  await expect(page.locator('svg.staff-svg')).toBeVisible()
  await expect(primaryButton(page)).toHaveText('Regenerate phrase')
})

// @test-link [[user_story_controlled_phrase_generation]]
test('regenerating replaces the score with a different phrase', async ({ page }) => {
  await gotoWorkspace(page)
  await generateAndAwaitReady(page)

  const firstScore = await page.locator('svg.staff-svg').innerHTML()

  await generateAndAwaitReady(page)

  const secondScore = await page.locator('svg.staff-svg').innerHTML()
  expect(secondScore).not.toBe(firstScore)
})

/** One workspace phrase's replay-key console line, its seed code and key captured. */
const WORKSPACE_REPLAY_KEY_LINE =
  /^\[Infinite Flow\] phrase replay key · workspace phrase · (seed1-[0-9a-f]{8}) · (ifk4\.[A-Za-z0-9_-]+)$/

/**
 * Intent: read a version-4 replay key's 9-tuple Node-side (unpadded base64url of UTF-8 JSON), so
 * the line's seed code can be checked against the seed the key itself holds.
 */
function replayKeyTuple(key: string): unknown[] {
  const json = Buffer.from(key.slice('ifk4.'.length), 'base64url').toString('utf8')
  const payload = JSON.parse(json) as unknown
  if (!Array.isArray(payload)) throw new Error(`Replay key payload is not a tuple: ${key}`)
  return payload
}

/** The default profile's (Neutral's) figure levels, by figure id in their fixed order. */
const DEFAULT_FIGURE_LEVELS = {
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
}

/**
 * Intent: check one workspace replay-key line, its key holding the line's seed, the default
 * profile's figure levels, phrase number 1, no carry-in, the built-in marker, no rhythm lock group
 * and no steering block, and return that key.
 */
function expectWorkspaceReplayKeyLine(line: string): string {
  const match = WORKSPACE_REPLAY_KEY_LINE.exec(line)
  if (match === null) throw new Error(`Not a workspace replay key line: ${line}`)
  const seedCode = match[1]!
  const key = match[2]!
  const tuple = replayKeyTuple(key)
  expect(tuple).toHaveLength(9)
  expect(tuple[1]).toBe(Number.parseInt(seedCode.slice('seed1-'.length), 16))
  expect(tuple[3]).toEqual(DEFAULT_FIGURE_LEVELS)
  expect(Object.keys(tuple[3] as object)).toEqual(Object.keys(DEFAULT_FIGURE_LEVELS))
  expect(tuple[4]).toBe(1)
  expect(tuple[5]).toBeNull()
  expect(tuple[6]).toBeNull()
  expect(tuple[7]).toBeNull()
  expect(tuple[8]).toBeNull()
  return key
}

// @test-link [[module_phrase_replay_key]]
test('announces one replay key line in the console per accepted phrase: Generate, then Regenerate', async ({
  page,
}) => {
  const lines: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'info' && message.text().includes('phrase replay key')) {
      lines.push(message.text())
    }
  })
  await gotoWorkspace(page)

  await generateAndAwaitReady(page)
  await expect.poll(() => lines.length).toBe(1)
  const firstKey = expectWorkspaceReplayKeyLine(lines[0]!)

  await generateAndAwaitReady(page)
  await expect.poll(() => lines.length).toBe(2)
  const secondKey = expectWorkspaceReplayKeyLine(lines[1]!)
  expect(secondKey).not.toBe(firstKey)
})

// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_readonly_controls_keep_contrast]]
test('controls stay read-only but focusable during generation: arrows move focus, not selection', async ({
  page,
}) => {
  await gotoWorkspace(page)
  // Sixteenth density + Heavily varied rhythmic variety widens the in-flight window (690
  // candidates at the default Sparse/Straight/Lift settings, comfortably more than the retired
  // Mixed density's 174) without approaching the documented worst case of 2,932 candidates at
  // Sparse/Active displacement/Build (ISS-004 feasibility review Sec 9-10).
  await radio(page, 'Note density', 'Sixteenth').click()
  await radio(page, 'Rhythmic variety', 'Heavily varied').click()

  await primaryButton(page).click()

  const contourGroup = page.getByRole('radiogroup', { name: 'Contour' })
  await expect(contourGroup).toHaveAttribute('aria-readonly', 'true')

  // D28: read-only controls keep full color (never dimmed) and signal "locked" only via the
  // dashed read-only ring on the wrapping `field-group`, not via opacity.
  const contourFieldGroup = page.locator('.field-group.is-readonly', { has: contourGroup })
  await expect(contourFieldGroup).toHaveCSS('opacity', '1')
  await expect(contourFieldGroup).toHaveCSS('outline-style', 'dashed')
  await expect(contourGroup).toHaveCSS('opacity', '1')

  const checked = contourGroup.getByRole('radio', { checked: true })
  const checkedLabel = await checked.textContent()
  await checked.focus()
  await page.keyboard.press('ArrowRight')

  const focused = page.locator(':focus')
  await expect(focused).not.toHaveText(checkedLabel ?? '')
  await expect(focused).toHaveAttribute('aria-checked', 'false')
  await expect(contourGroup.getByRole('radio', { name: checkedLabel ?? '' })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await expect(page.locator('.generation-status')).toHaveText('Phrase ready', { timeout: 30_000 })
})
