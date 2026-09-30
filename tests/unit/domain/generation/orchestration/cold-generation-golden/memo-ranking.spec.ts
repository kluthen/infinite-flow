// @vitest-environment node
/**
 * Cold-generation memo and ranking golden: for ten rhythm settings (the three worst, one no-plan
 * setting, and small and mid-size ones), a fresh memo's materialized canonical candidate list
 * (kind, count, sha256 of its JSON) and, for seeds 1..20, the seeded ranked order as candidateIndex
 * values (sha256 of the sequence plus its first five) must match what was recorded once on the
 * generator before the rhythm enumeration/ranking speed-up. The golden is never regenerated.
 */

import { describe, expect, it } from 'vitest'

import {
  domainFacts,
  freshCanonicalDomain,
  MEMO_SETTING_KEYS,
  parseSettingKey,
  rankingFacts,
  readGolden,
  type MemoGolden,
} from './cold-generation-golden-fixture'

const GOLDEN = readGolden<MemoGolden>('memo-ranking.golden.v1.json')

/** Per-setting timeout: the worst settings enumerate thousands of candidates cold. */
const SETTING_TIMEOUT_MS = 180_000

// @test-link [[entity_rhythm_candidate_domain]]
describe('cold-generation canonical rhythm domain golden', () => {
  it('lists exactly the sampled settings', () => {
    expect(Object.keys(GOLDEN.settings)).toEqual(MEMO_SETTING_KEYS)
  })

  it.each(MEMO_SETTING_KEYS)(
    '%s materializes the recorded candidate list',
    (key) => {
      const { kind, count, candidatesHash } = GOLDEN.settings[key]!
      expect(domainFacts(freshCanonicalDomain(parseSettingKey(key)))).toEqual({
        kind,
        count,
        candidatesHash,
      })
    },
    SETTING_TIMEOUT_MS,
  )
})

// @test-link [[module_ranked_candidate_ordering]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('cold-generation seeded rhythm ranking golden', () => {
  it.each(MEMO_SETTING_KEYS)(
    '%s ranks into the recorded candidateIndex order for seeds 1..20',
    (key) => {
      expect(rankingFacts(freshCanonicalDomain(parseSettingKey(key)))).toEqual(
        GOLDEN.settings[key]!.rankings,
      )
    },
    SETTING_TIMEOUT_MS,
  )
})
