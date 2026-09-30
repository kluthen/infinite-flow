// @vitest-environment node
/**
 * Cold-generation catalog golden, Sixteenth / Strict slice (36 of the 324 rhythm settings): each setting
 * generates seeds 1..10 in order on one fresh canonical-rhythm-domain memo (seed 1 cold, 2..10
 * warm) and must reproduce the sha256 outcome hashes recorded once on the generator before the
 * rhythm enumeration/ranking speed-up. The golden is never regenerated.
 */

import { describe, expect, it } from 'vitest'

import {
  allRhythmSettings,
  catalogHashes,
  parseSettingKey,
  readGolden,
  settingKey,
  type CatalogGolden,
} from './cold-generation-golden-fixture'

const GOLDEN = readGolden<CatalogGolden>('catalog.golden.v1.json')

/** The settings of this slice, in catalog order. */
const SLICE_KEYS = allRhythmSettings()
  .filter((setting) => setting.noteDensity === 'Sixteenth' && setting.rhythmicVariety === 'Strict')
  .map(settingKey)

/** Per-setting timeout: the worst settings take seconds cold, far longer under suite load. */
const SETTING_TIMEOUT_MS = 180_000

// @test-link [[rule_seeded_phrase_reproduction]]
describe('cold-generation catalog golden: Sixteenth / Strict', () => {
  it('covers 36 settings', () => {
    expect(SLICE_KEYS).toHaveLength(36)
  })

  it.each(SLICE_KEYS)(
    '%s reproduces its seed 1..10 outcome hashes on one fresh memo',
    (key) => {
      expect(catalogHashes(parseSettingKey(key))).toEqual(GOLDEN.settings[key])
    },
    SETTING_TIMEOUT_MS,
  )
})
