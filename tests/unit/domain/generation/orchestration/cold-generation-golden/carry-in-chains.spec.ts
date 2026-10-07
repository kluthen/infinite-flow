// @vitest-environment node
/**
 * Cold-generation carry-in golden: three-phrase chains (phrase 1 without carry-in, phrases 2 and 3
 * carrying in from the phrase before) on eight rhythm settings, the three worst included, for
 * three first-phrase seeds, must reproduce the sha256 outcome hashes recorded once on the
 * generator before the rhythm enumeration/ranking speed-up. The hashes of phrases 2 and 3 were
 * recorded again once, when generation with carry-in moved to its own search policy: that change
 * was proven to alter only each window's diagnostic ledger version and fuel allowance, never the
 * request, result, provenance or fuel used. The golden is otherwise never regenerated.
 */

import { describe, expect, it } from 'vitest'

import {
  CARRY_IN_SEEDS,
  CARRY_IN_SETTING_KEYS,
  carryInChainHashes,
  chainKey,
  parseSettingKey,
  readGolden,
  type CarryInGolden,
} from './cold-generation-golden-fixture'

const GOLDEN = readGolden<CarryInGolden>('carry-in-chains.golden.v1.json')

/** Every chain of the sample as `[chain key, setting key, first seed]`, in golden order. */
const CHAINS = CARRY_IN_SETTING_KEYS.flatMap((key) =>
  CARRY_IN_SEEDS.map((seed) => [chainKey(key, seed), key, seed] as const),
)

/** Per-chain timeout: a worst-setting chain enumerates its rhythm domain cold. */
const CHAIN_TIMEOUT_MS = 180_000

// @test-link [[rule_seeded_phrase_reproduction]]
// @test-link [[rule_no_carry_in_output_matches_v1]]
describe('cold-generation carry-in chain golden', () => {
  it('lists exactly the sampled chains', () => {
    expect(Object.keys(GOLDEN.chains)).toEqual(CHAINS.map(([name]) => name))
  })

  it.each(CHAINS)(
    '%s reproduces its three chained outcome hashes',
    (name, key, seed) => {
      expect(carryInChainHashes(parseSettingKey(key), seed)).toEqual(GOLDEN.chains[name])
    },
    CHAIN_TIMEOUT_MS,
  )
})
