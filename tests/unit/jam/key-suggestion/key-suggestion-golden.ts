/**
 * The key and mode suggestion's golden list, `tests/fixtures/key-suggestion/golden-answers.json`:
 * a fixed list of doodles (the doodle set's, the research note's worked examples, a few edge
 * doodles), each with Jam's written key and Collection and an instrument, and the seed, kept
 * candidates and answer recorded for it. Read Node-side by the unit spec and the in-browser spec,
 * which compares Chrome's answers to it. Never re-recorded: a changed answer is a changed method.
 * Test plumbing: nothing in the app reads it.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { KeySuggestionGoldenCase } from './key-suggestion-golden-case'

export { describeKeySuggestion } from './key-suggestion-golden-case'

/** The golden list's file, found from this file's own location. */
export const KEY_SUGGESTION_GOLDEN_PATH = fileURLToPath(
  new URL('../../../fixtures/key-suggestion/golden-answers.json', import.meta.url),
)

/** The golden list as recorded. */
export interface KeySuggestionGolden {
  readonly about: string
  readonly cases: readonly KeySuggestionGoldenCase[]
}

/** Intent: the golden list, read and checked for its top-level shape; crashes on a malformed file. */
export function loadKeySuggestionGolden(path = KEY_SUGGESTION_GOLDEN_PATH): KeySuggestionGolden {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('cases' in parsed) ||
    !Array.isArray(parsed.cases) ||
    parsed.cases.length === 0
  ) {
    throw new Error(`${path} holds no golden case list.`)
  }
  return parsed as KeySuggestionGolden
}
