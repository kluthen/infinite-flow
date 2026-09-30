// @vitest-environment node
/**
 * Cold-generation non-rhythm golden: six variations of the non-rhythm controls (tonal center,
 * collection, harmonic motion, contour, register including Varying, leapiness, arpeggio chaos,
 * tempo, instrument profile, and the Jazz musical profile) laid over four rhythm settings, the
 * three worst included, seeds 1..3 on one fresh memo each, must reproduce the sha256 outcome
 * hashes recorded once on the generator before the rhythm enumeration/ranking speed-up. The
 * golden is never regenerated.
 */

import { describe, expect, it } from 'vitest'

import {
  CONTROL_VARIATIONS,
  parseSettingKey,
  readGolden,
  VARIATION_SETTING_KEYS,
  variationHashes,
  variationKey,
  type VariationGolden,
} from './cold-generation-golden-fixture'

const GOLDEN = readGolden<VariationGolden>('non-rhythm-controls.golden.v1.json')

/** Every case of the sample as `[case key, variation, setting key]`, in golden order. */
const CASES = CONTROL_VARIATIONS.flatMap((variation) =>
  VARIATION_SETTING_KEYS.map((key) => [variationKey(variation, key), variation, key] as const),
)

/** Per-case timeout: a worst-setting case enumerates its rhythm domain cold. */
const CASE_TIMEOUT_MS = 180_000

// @test-link [[rule_seeded_phrase_reproduction]]
describe('cold-generation non-rhythm controls golden', () => {
  it('lists exactly the sampled cases', () => {
    expect(Object.keys(GOLDEN.cases)).toEqual(CASES.map(([name]) => name))
  })

  it.each(CASES)(
    '%s reproduces its seed 1..3 outcome hashes',
    (name, variation, key) => {
      expect(variationHashes(parseSettingKey(key), variation)).toEqual(GOLDEN.cases[name])
    },
    CASE_TIMEOUT_MS,
  )
})
