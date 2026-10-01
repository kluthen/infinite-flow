/**
 * Headless replay of a phrase replay key: decode the key, send the rebuilt generate request
 * through the same generation worker runtime the browser worker runs (after a JSON round trip
 * standing in for the worker message's structured clone), and turn its answer into the readable
 * replay report. Also picks the one key token out of a whole copied console line.
 */

import { createGenerationWorkerRuntime } from './generation-worker-runtime'
import type { GenerationWorkerRequest } from './generation-worker-protocol'
import { PhraseReplayKeyError } from './phrase-replay-key'
import { decodePhraseReplayKey, type DecodedPhraseReplayKey } from './phrase-replay-key-decode'
import { buildPhraseReplayReport, type PhraseReplayReport } from './phrase-replay-report'

// @spec-link [[service_headless_phrase_replay]]
export { decodePhraseReplayKey, PhraseReplayKeyError }

/** The worker envelope id replay always uses; it never affects the outcome. */
const REPLAY_MESSAGE_ID = 1

/** A key-shaped token: `ifk<version>.` followed by base64url characters. */
const KEY_TOKEN_PATTERN = /(?<![A-Za-z0-9_.-])ifk\d+\.[A-Za-z0-9_-]+(?![A-Za-z0-9_-])/gu

/**
 * Intent: return the single phrase replay key token in a text, which may be the bare key or a
 * whole copied console line. Strict: a text holding no key token, or more than one, is rejected
 * as a PhraseReplayKeyError rather than guessed at.
 */
// @spec-link [[service_headless_phrase_replay]]
// @spec-link [[module_phrase_replay_key]]
export function extractPhraseReplayKey(text: string): string {
  const tokens = text.match(KEY_TOKEN_PATTERN) ?? []
  if (tokens.length === 0) {
    throw new PhraseReplayKeyError('No phrase replay key (an "ifk<N>." token) found in the input.')
  }
  if (tokens.length > 1) {
    throw new PhraseReplayKeyError(
      `Found ${tokens.length} phrase replay keys in the input; give exactly one.`,
    )
  }
  return tokens[0]!
}

/**
 * Intent: replay an already-decoded key through the generation worker runtime: build the generate
 * envelope, round-trip it through JSON as a worker message's structured clone would, hand it to a
 * fresh runtime's message handler (cold memo; replay never prewarms) and report its answer. A
 * generate message that yields no response breaks the worker protocol and throws.
 */
// @spec-link [[service_headless_phrase_replay]]
export function replayDecodedPhraseKey(
  key: string,
  decoded: DecodedPhraseReplayKey,
): PhraseReplayReport {
  const request: GenerationWorkerRequest = {
    type: 'generate',
    id: REPLAY_MESSAGE_ID,
    intent: decoded.intent,
  }
  const clone: unknown = JSON.parse(JSON.stringify(request))
  const runtime = createGenerationWorkerRuntime({
    now: () => performance.now(),
    scheduleSlice: () => {
      throw new Error('Phrase replay never prewarms, so no prewarm slice may be scheduled.')
    },
  })
  const response = runtime.handleMessage(clone)
  if (response === undefined) {
    throw new Error('The generation worker runtime gave no response to a generate request.')
  }
  return buildPhraseReplayReport(key, decoded, request, response)
}

/**
 * Intent: decode a phrase replay key and replay it through the generation worker runtime,
 * returning the full report. A malformed or unsupported key throws its typed error before any
 * generation runs.
 */
// @spec-link [[service_headless_phrase_replay]]
export function replayPhraseKey(key: string): PhraseReplayReport {
  const trimmed = key.trim()
  return replayDecodedPhraseKey(trimmed, decodePhraseReplayKey(trimmed))
}
