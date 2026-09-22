// @test-link [[module_register_window_resolution_primitives]]
//
// Versioned golden fixture for register tie-key derivation. These are literal, pre-computed
// expected values (not derived from production code at test time) so that a cross-runtime/
// JS-engine drift in the hash arithmetic, the seed encoding, or the canonical intent
// serialization is caught by a diff against a committed constant, rather than silently passing
// because the test recomputed the "expected" value with the same (possibly now-drifted)
// implementation it is checking.
//
// Regenerate ONLY via a deliberate, reviewed fixture-regeneration step (never automatically),
// and bump REGISTER_TIE_KEY_GOLDEN_FIXTURE_VERSION whenever the FNV-1a hash, the register tie-
// key domain string, the seed encoding, or the canonical generation-affecting intent
// serialization changes in a way that changes output values.

export const REGISTER_TIE_KEY_GOLDEN_FIXTURE_VERSION = 1

export const REGISTER_TIE_KEY_GOLDEN_SEED = 0x1234abcd

export const REGISTER_TIE_KEY_GOLDEN_FIXTURES: Readonly<
  Record<'c-keyboard' | 'bb-tenor', Readonly<Record<'Low' | 'Middle' | 'High', number>>>
> = {
  'c-keyboard': { Low: 4190388763, Middle: 308442886, High: 920686647 },
  'bb-tenor': { Low: 2321994543, Middle: 2287071234, High: 2641261763 },
}
