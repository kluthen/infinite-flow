// Versioned golden fixture for named-stream pseudorandomness. These are literal,
// pre-computed expected values (not derived from production code at test time) so that a
// cross-runtime/JS-engine drift in the PRNG or the stream-mixing arithmetic is caught by a
// diff against a committed constant, rather than silently passing because the test recomputed
// the "expected" value with the same (possibly now-drifted) implementation it is checking.
//
// Regenerate ONLY via a deliberate, reviewed fixture-regeneration step (never automatically),
// and bump NAMED_STREAM_GOLDEN_FIXTURE_VERSION whenever the PRNG algorithm, the stream label
// mixing scheme, or the registry version changes in a way that changes output sequences.

import type { StreamLabel } from '@/domain/random/streams'

export const NAMED_STREAM_GOLDEN_FIXTURE_VERSION = 1

export const NAMED_STREAM_GOLDEN_SEED = 0x1234abcd

export const NAMED_STREAM_GOLDEN_SAMPLE_COUNT = 5

export const NAMED_STREAM_GOLDEN_FIXTURES: Readonly<Record<StreamLabel, readonly number[]>> = {
  harmony: [1680310244, 3185319125, 1430103550, 2780318614, 2168552878],
  rhythm: [3441169262, 4237793605, 1676291964, 1728079717, 1325006525],
  pitch: [2180913855, 2440382921, 1412645726, 2501447643, 2264208929],
  'register-resolution': [1591951288, 4163074448, 1772240474, 2989130524, 4064024624],
  'tie-breaking': [1834654625, 2854165865, 2841082586, 1567264470, 2615847475],
}
