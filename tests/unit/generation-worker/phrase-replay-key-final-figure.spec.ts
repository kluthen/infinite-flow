// @vitest-environment node
/**
 * ISS-019's key: a joined B major phrase 2, built-in Bebop's figure levels at Seventh chords
 * Strongly favored, whose last bar sounds F#7. Its search once ended the phrase with a chromatic
 * enclosure onto F#7's seventh, E, which the validator reads as a tense note and not as a chord tone
 * on the final attack, and refused it (`result_validation_failed`). A figure aimed at the final
 * attack now reads its triad, as the validator does, so the key replays to a phrase.
 */

import { describe, expect, it } from 'vitest'

import { replayPhraseKey } from '@/generation-worker/phrase-replay'

/** Generous timeout: the replay runs a whole cold generation. */
const TIMEOUT_MS = 120_000

/** ISS-019's replay key, as the cost runner's distinct-intent failures recorded it. */
const ISS_019_KEY =
  'ifk5.WyJzZXNzaW9uLTEiLDEyMjYyNDEyMTQsWzYwLCJCIiwiTWFqb3IiLCJBY3RpdmUgZGlhdG9uaWMiLCJFZGdlIiwiRWlnaHRoIiwiU3RyaWN0IiwiT2NjYXNpb25hbCBvZmZiZWF0cyIsIlNwYXJzZSIsIldhbmRlcmluZyIsIlZhcnlpbmciLCJMZWFwaW5nIiwiVmFyaWVkIiwiYy1rZXlib2FyZCJdLHsicGFzc2luZ1RvbmUiOiJhc1RvZGF5IiwiYWNjZW50ZWRQYXNzaW5nVG9uZSI6ImFzVG9kYXkiLCJuZWlnaGJvclRvbmUiOiJhc1RvZGF5IiwiYXBwb2dnaWF0dXJhIjoib2ZmIiwiZGlhdG9uaWNFbmNsb3N1cmUiOiJmYXZvcmVkIiwiY2hyb21hdGljQXBwcm9hY2giOiJzdHJvbmdseUZhdm9yZWQiLCJjaHJvbWF0aWNFbmNsb3N1cmUiOiJzdHJvbmdseUZhdm9yZWQifSwyLHsibGFzdFBpdGNoIjp7Im1pZGkiOjYxLCJhcnJpdmluZ0ludGVydmFsIjotMSwicmVjb3ZlcnkiOnsia2luZCI6InNldHRsZWQifX0sInJlZ2lzdGVyV2luZG93Ijp7ImtpbmQiOiJSZWdpc3RlcldpbmRvdyIsIm1pbk1pZGkiOjU0LCJtYXhNaWRpIjo2Nn0sImZpbmFsSGFybW9ueSI6eyJ0cmlhZCI6eyJkZWdyZWUiOjUsInBpdGNoQ2xhc3NlcyI6WzYsMTAsMV0sInF1YWxpdHkiOiJtYWpvciJ9LCJzZXZlbnRoIjp7InBpdGNoQ2xhc3MiOjQsInF1YWxpdHkiOiJkb21pbmFudC1zZXZlbnRoIn0sInJvbGUiOiJvcGVuX2Fycml2YWwiLCJlbmRwb2ludCI6eyJraW5kIjoidG9uYWxfZGVncmVlX2ZpdmVfY2hvcmRfdG9uZSIsImRlZ3JlZSI6NX19LCJwaHJhc2VOdW1iZXIiOjF9LG51bGwsbnVsbCxudWxsLHsic2V2ZW50aC1jaG9yZHMiOiJzdHJvbmdseUZhdm9yZWQifV0'

describe("ISS-019's key: a figure onto a joined phrase's final seventh", () => {
  // @test-link [[module_pitch_search_context]]
  it(
    'replays to a phrase the validator accepts',
    () => {
      const report = replayPhraseKey(ISS_019_KEY)
      expect(report.keyVersion).toBe('ifk5')
      expect(report.phraseNumber).toBe(2)
      expect(report.output.kind).toBe('generation_success')
    },
    TIMEOUT_MS,
  )
})
