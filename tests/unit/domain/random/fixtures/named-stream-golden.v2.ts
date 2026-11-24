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

export const NAMED_STREAM_GOLDEN_FIXTURE_VERSION = 2

export const NAMED_STREAM_GOLDEN_SEED = 0x1234abcd

export const NAMED_STREAM_GOLDEN_SAMPLE_COUNT = 5

export const NAMED_STREAM_GOLDEN_FIXTURES: Readonly<Record<StreamLabel, readonly number[]>> = {
  harmony: [711196774, 112742845, 2322113317, 3837594523, 4257342392],
  rhythm: [4020567265, 1167554427, 3752091594, 1499725574, 835514149],
  pitch: [452967632, 3176598537, 1352174098, 3639791142, 4290082164],
  'register-resolution': [264369264, 2257113031, 2052351398, 2099049596, 340308962],
  'tie-breaking': [3045480581, 741867906, 177246850, 3583118991, 1377591645],
  'fill-shape': [2477204731, 4219893759, 265380102, 514623078, 3794550873],
}
