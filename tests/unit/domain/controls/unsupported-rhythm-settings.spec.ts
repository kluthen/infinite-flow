import { describe, expect, it } from 'vitest'

import { DEFAULT_GENERATION_CONTROLS, PROFILE_BUNDLES } from '@/domain/controls/profile-selection'
import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import {
  UNSUPPORTED_RHYTHM_SETTINGS,
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
  UnsupportedRhythmSettingSuggestionError,
  describeRhythmSettingSuggestion,
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('unsupported rhythm settings', () => {
  it('matches the rhythm planner no-legal-plan result across every control combination', () => {
    for (const noteDensity of NOTE_DENSITIES)
      for (const rhythmicVariety of RHYTHMIC_VARIETIES)
        for (const silenceDensity of SILENCE_DENSITIES)
          for (const syncopation of SYNCOPATIONS) {
            const setting = { noteDensity, rhythmicVariety, silenceDensity, syncopation }
            const expectedUnsupported = isUnsupportedRhythmSetting(setting)
            for (const tensionArc of TENSION_ARCS) {
              const result = makeRhythmCandidateDomain({
                noteDensity,
                rhythmicVariety,
                silenceDensity,
                syncopation,
                tensionArc,
              })
              expect(
                isNoLegalRhythmPlan(result),
                `${noteDensity}/${rhythmicVariety}/${silenceDensity}/${syncopation}/${tensionArc}`,
              ).toBe(expectedUnsupported)
            }
          }
  }, 120_000)

  it('has exactly 10 unique entries: 6 Strict, 4 Slightly varied, 0 Heavily varied', () => {
    expect(UNSUPPORTED_RHYTHM_SETTINGS).toHaveLength(10)
    const keys = new Set(
      UNSUPPORTED_RHYTHM_SETTINGS.map(
        (setting) =>
          `${setting.noteDensity}/${setting.rhythmicVariety}/${setting.silenceDensity}/${setting.syncopation}`,
      ),
    )
    expect(keys.size).toBe(10)
    expect(
      UNSUPPORTED_RHYTHM_SETTINGS.filter((setting) => setting.rhythmicVariety === 'Strict'),
    ).toHaveLength(6)
    expect(
      UNSUPPORTED_RHYTHM_SETTINGS.filter(
        (setting) => setting.rhythmicVariety === 'Slightly varied',
      ),
    ).toHaveLength(4)
    expect(
      UNSUPPORTED_RHYTHM_SETTINGS.filter((setting) => setting.rhythmicVariety === 'Heavily varied'),
    ).toHaveLength(0)
  })

  it('is frozen', () => {
    expect(Object.isFrozen(UNSUPPORTED_RHYTHM_SETTINGS)).toBe(true)
    expect(Object.isFrozen(UNSUPPORTED_RHYTHM_SETTINGS[0])).toBe(true)
  })

  // @test-link [[rule_profile_presets_apply_defined_controls]]
  it('never lands presets or the default controls on an unsupported setting', () => {
    expect(isUnsupportedRhythmSetting(PROFILE_BUNDLES.Neutral)).toBe(false)
    expect(isUnsupportedRhythmSetting(PROFILE_BUNDLES.Jazz)).toBe(false)
    expect(isUnsupportedRhythmSetting(DEFAULT_GENERATION_CONTROLS)).toBe(false)
  })

  it('suggests the pinned nearest supported change for each unsupported Strict setting', () => {
    const expected = [
      {
        setting: {
          noteDensity: 'Quarter',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Sparse',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Quarter',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Sparse',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Conversational',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Occasional offbeats',
        },
        suggestion: { control: 'syncopation', from: 'Occasional offbeats', to: 'Straight' },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Strict',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Active displacement',
        },
        suggestion: { control: 'syncopation', from: 'Active displacement', to: 'Straight' },
      },
      {
        setting: {
          noteDensity: 'Quarter',
          rhythmicVariety: 'Slightly varied',
          silenceDensity: 'Sparse',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Quarter',
          rhythmicVariety: 'Slightly varied',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Active displacement',
        },
        suggestion: {
          control: 'syncopation',
          from: 'Active displacement',
          to: 'Occasional offbeats',
        },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Slightly varied',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Occasional offbeats',
        },
        suggestion: { control: 'syncopation', from: 'Occasional offbeats', to: 'Straight' },
      },
      {
        setting: {
          noteDensity: 'Sixteenth',
          rhythmicVariety: 'Slightly varied',
          silenceDensity: 'Breath-heavy',
          syncopation: 'Active displacement',
        },
        suggestion: { control: 'syncopation', from: 'Active displacement', to: 'Straight' },
      },
    ] as const

    expect(UNSUPPORTED_RHYTHM_SETTINGS).toEqual(expected.map(({ setting }) => setting))

    for (const { setting, suggestion } of expected) {
      const actual = suggestNearestSupportedRhythmChange(setting)
      expect(actual).toEqual(suggestion)
      expect(actual.from).toBe(setting[actual.control])
      expect(isUnsupportedRhythmSetting({ ...setting, [actual.control]: actual.to })).toBe(false)
    }
  })

  it('throws for a supported setting', () => {
    expect(() => suggestNearestSupportedRhythmChange(DEFAULT_GENERATION_CONTROLS)).toThrow(
      UnsupportedRhythmSettingSuggestionError,
    )
  })

  it('renders the calm blocking message and the suggestion sentence', () => {
    expect(UNSUPPORTED_RHYTHM_SETTING_MESSAGE).toBe(
      "This mix of note density, silence, and syncopation can't form a four-bar phrase yet. Try a lighter syncopation, a different note density, or another silence setting.",
    )
    expect(
      describeRhythmSettingSuggestion({
        control: 'syncopation',
        from: 'Active displacement',
        to: 'Occasional offbeats',
      }),
    ).toBe('Suggested change: Occasional offbeats instead of Active displacement.')
  })
})
