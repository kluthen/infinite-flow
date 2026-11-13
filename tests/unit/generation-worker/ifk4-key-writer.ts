/**
 * A test-only writer of `ifk4.` keys, as v3.2 wrote them. Since v3.3 `src/` writes only `ifk5.`
 * keys, so the `ifk4.` decoding suites and the corpora build their `ifk4.` keys here: the first
 * nine entries of the `ifk5.` tuple, which keep the `ifk4.` order and meaning. Like v3.2's
 * encoder, it refuses an intent whose Seventh chords level is above Off, since an `ifk4.` key
 * decodes with it at Off, and, like every `ifk4.` decoder, a carry-in holding a carried seventh,
 * since an `ifk4.` key reads its carried chord as a triad only.
 */

import { isOffChordFamilies } from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  bytesToBase64Url,
  encodePhraseReplayKey,
  PHRASE_REPLAY_KEY_V4_PREFIX,
  PHRASE_REPLAY_KEY_V5_PREFIX,
  PhraseReplayKeyError,
} from '@/generation-worker/phrase-replay-key'

/** The number of entries an `ifk4.` tuple holds: the `ifk5.` tuple's without the chord families. */
const IFK4_TUPLE_LENGTH = 9

/** Intent: the JSON tuple of an `ifk5.` key, read back without the codec's decoder. */
function ifk5Tuple(key: string): unknown[] {
  const payload = key
    .slice(PHRASE_REPLAY_KEY_V5_PREFIX.length)
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
  const binary = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown[]
}

/**
 * Intent: encode an intent and its phrase number as the `ifk4.` key v3.2 wrote for it, refusing an
 * intent above Off or a carry-in holding a carried seventh, neither of which an `ifk4.` key can
 * hold, with the reason.
 */
export function encodeIfk4PhraseReplayKey(intent: GenerationIntent, phraseNumber: number): string {
  if (!isOffChordFamilies(intent.chordFamilies)) {
    throw new PhraseReplayKeyError(
      `Phrase replay key cannot hold the Seventh chords level ${JSON.stringify(intent.chordFamilies)}, which is above Off: an "ifk4" key decodes with it at Off.`,
    )
  }
  if (intent.carryIn?.finalHarmony?.seventh !== undefined) {
    throw new PhraseReplayKeyError(
      'Phrase replay key cannot hold a carried seventh chord: an "ifk4" key reads its carried chord as a triad only.',
    )
  }
  const tuple = ifk5Tuple(encodePhraseReplayKey(intent, phraseNumber)).slice(0, IFK4_TUPLE_LENGTH)
  const bytes = new TextEncoder().encode(JSON.stringify(tuple))
  return `${PHRASE_REPLAY_KEY_V4_PREFIX}${bytesToBase64Url(bytes)}`
}
