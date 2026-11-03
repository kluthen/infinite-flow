/**
 * v3.2 chunk 14: the key and mode suggestion computed in Chrome. Every case of the suggestion's
 * golden list (tests/fixtures/key-suggestion/golden-answers.json, read Node-side) is computed in
 * the workspace harness's page by the app's own functions, and its seed, kept candidates and
 * answer must equal the ones recorded in Node, which the Node spec checks too: the same doodle
 * gives the same suggestion in both runtimes, whole numbers only. On the workspace harness (port
 * 4175).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { gotoWorkspaceHarness } from '../release/harness-helpers'

/** A recorded case: its input and the seed, kept candidates and answer recorded in Node. */
type GoldenCase = WorkspaceHarnessKeySuggestionCase & WorkspaceHarnessKeySuggestionDescription

/** Intent: the golden list's cases, read Node-side from the fixture. */
function goldenCases(): readonly GoldenCase[] {
  const path = fileURLToPath(
    new URL('../../fixtures/key-suggestion/golden-answers.json', import.meta.url),
  )
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { cases?: readonly GoldenCase[] }
  if (parsed.cases === undefined || parsed.cases.length === 0) {
    throw new Error(`${path} holds no golden case list.`)
  }
  return parsed.cases
}

// @test-link [[rule_suggestion_same_doodle_same_answer]]
test('computes every golden case in Chrome exactly as recorded in Node', async ({ page }) => {
  const cases = goldenCases()
  await gotoWorkspaceHarness(page)
  const inputs: WorkspaceHarnessKeySuggestionCase[] = cases.map(
    ({ label, doodle, jam, instrumentProfileId }) => ({ label, doodle, jam, instrumentProfileId }),
  )
  const computed = await page.evaluate(
    (given) => window.__workspaceHarness.keySuggestion.describe(given),
    inputs,
  )
  expect(computed).toHaveLength(cases.length)
  cases.forEach((golden, index) => {
    expect(computed[index], golden.label).toEqual({
      seed: golden.seed,
      kept: golden.kept,
      answer: golden.answer,
    })
  })
})
