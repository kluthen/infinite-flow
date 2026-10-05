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
  generatedRhythmSetting,
  isRhythmSettingBlocked,
  isUnsupportedRhythmSetting,
  suggestNearestSupportedRhythmChange,
} from '@/domain/controls/unsupported-rhythm-settings'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('unsupported rhythm settings', () => {
  it('matches the rhythm planner no-legal-plan result across every control combination', () => {
    for (const setting of everyRhythmSetting()) {
      const { noteDensity, rhythmicVariety, silenceDensity, syncopation } = setting
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

const WIDE: NoteDensityContext = { belowTabletLandscape: false, sessionSteppedDown: false }
const NARROW: NoteDensityContext = { belowTabletLandscape: true, sessionSteppedDown: false }

/** Intent: every chosen rhythm setting the four rhythm controls can form. */
function everyRhythmSetting() {
  return NOTE_DENSITIES.flatMap((noteDensity) =>
    RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
      SILENCE_DENSITIES.flatMap((silenceDensity) =>
        SYNCOPATIONS.map((syncopation) => ({
          noteDensity,
          rhythmicVariety,
          silenceDensity,
          syncopation,
        })),
      ),
    ),
  )
}

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('unsupported rhythm settings judged on the density a phrase is generated with', () => {
  const sixteenthEntries = UNSUPPORTED_RHYTHM_SETTINGS.filter(
    (setting) => setting.noteDensity === 'Sixteenth',
  )
  const quarterEntries = UNSUPPORTED_RHYTHM_SETTINGS.filter(
    (setting) => setting.noteDensity === 'Quarter',
  )

  it.each(sixteenthEntries)(
    'blocks the Sixteenth combination %j from bp-tablet-landscape up and allows it below',
    (setting) => {
      expect(isRhythmSettingBlocked(setting, WIDE)).toBe(true)
      expect(isRhythmSettingBlocked(setting, NARROW)).toBe(false)
    },
  )

  it.each(quarterEntries)('blocks the Quarter combination %j at every width', (setting) => {
    expect(isRhythmSettingBlocked(setting, WIDE)).toBe(true)
    expect(isRhythmSettingBlocked(setting, NARROW)).toBe(true)
  })

  it('judges every chosen setting exactly as the list judges its generated setting', () => {
    for (const setting of everyRhythmSetting())
      for (const context of [WIDE, NARROW]) {
        const generated = generatedRhythmSetting(setting, context)
        expect(generated.noteDensity).toBe(
          context.belowTabletLandscape && setting.noteDensity === 'Sixteenth'
            ? 'Eighth'
            : setting.noteDensity,
        )
        expect(isRhythmSettingBlocked(setting, context)).toBe(isUnsupportedRhythmSetting(generated))
      }
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('never blocks a chosen Sixteenth in a session that stepped down, whatever the width', () => {
    for (const setting of everyRhythmSetting().filter((s) => s.noteDensity === 'Sixteenth'))
      for (const belowTabletLandscape of [false, true])
        expect(
          isRhythmSettingBlocked(setting, { belowTabletLandscape, sessionSteppedDown: true }),
        ).toBe(false)
  })

  it('never suggests Sixteenth for a combination blocked below bp-tablet-landscape', () => {
    for (const setting of everyRhythmSetting()) {
      if (!isRhythmSettingBlocked(setting, NARROW)) continue
      const suggestion = suggestNearestSupportedRhythmChange(
        generatedRhythmSetting(setting, NARROW),
      )
      expect(suggestion.to).not.toBe('Sixteenth')
    }
  })
})
