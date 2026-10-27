/**
 * The prewarm trigger's own pieces: its dedupe key matches the worker memo's rhythm input for
 * every rhythm setting, the controls a prewarm for a doodle's rhythm is built from (the first-visit
 * values Jam's Idle warms before any doodle), and the page-URL switch reads `?prewarm=off` / `on`
 * and rejects anything else.
 */
import { describe, expect, it } from 'vitest'

import { prewarmPolicyFromSearch } from '@/components/workspace/prewarm-policy'
import {
  doodlePrewarmControls,
  FIRST_VISIT_RHYTHM_VALUES,
  rhythmSettingKeyOf,
} from '@/composables/generation-session-prewarm'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { rhythmDomainInputOf } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  allRhythmSettings,
  buildCatalogIntent,
} from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'

// @test-link [[module_generation_prewarm]]
describe('rhythmSettingKeyOf', () => {
  // @test-link [[module_generation_prewarm]]
  it("is the worker memo's rhythm input for every rhythm setting, and tells them all apart", () => {
    const settings = allRhythmSettings()
    const keys = new Set<string>()
    for (const setting of settings) {
      const intent = buildCatalogIntent(setting, 1)
      const key = rhythmSettingKeyOf(intent)
      expect(JSON.parse(key)).toEqual(rhythmDomainInputOf(intent))
      keys.add(key)
    }
    expect(keys.size).toBe(settings.length)
  })
})

// @test-link [[module_generation_prewarm]]
describe('doodlePrewarmControls', () => {
  // @test-link [[module_generation_prewarm]]
  it("puts the doodle's four rhythm values and Jam's tension in place, keeping every other control", () => {
    const controls = {
      ...DEFAULT_GENERATION_CONTROLS,
      tonalCenter: 'D',
      collection: 'Dorian',
      tension: 'Edge',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Active displacement',
      silenceDensity: 'Breath-heavy',
      instrumentProfileId: 'eb-alto',
    } as const

    expect(doodlePrewarmControls(controls, FIRST_VISIT_RHYTHM_VALUES, 'Lift')).toEqual({
      ...controls,
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      tension: 'Lift',
    })
  })

  // @test-link [[module_generation_prewarm]]
  it('holds the first-visit rhythm values, frozen', () => {
    expect(FIRST_VISIT_RHYTHM_VALUES).toEqual({
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
    })
    expect(Object.isFrozen(FIRST_VISIT_RHYTHM_VALUES)).toBe(true)
  })
})

// @test-link [[module_generation_prewarm]]
describe('prewarmPolicyFromSearch', () => {
  // @test-link [[module_generation_prewarm]]
  it('enables prewarm by default and with ?prewarm=on, disables it with ?prewarm=off', () => {
    expect(prewarmPolicyFromSearch('')).toBe('enabled')
    expect(prewarmPolicyFromSearch('?audio=real')).toBe('enabled')
    expect(prewarmPolicyFromSearch('?prewarm=on')).toBe('enabled')
    expect(prewarmPolicyFromSearch('?audio=real&prewarm=off')).toBe('disabled')
  })

  // @test-link [[module_generation_prewarm]]
  it('throws on any other prewarm value instead of guessing a mode', () => {
    expect(() => prewarmPolicyFromSearch('?prewarm=of')).toThrow(/Unknown prewarm mode "of"/)
    expect(() => prewarmPolicyFromSearch('?prewarm=')).toThrow(/Unknown prewarm mode ""/)
  })
})
