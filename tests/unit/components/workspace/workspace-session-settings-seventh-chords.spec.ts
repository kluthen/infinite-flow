/**
 * Where session settings are built, the Seventh chords level goes in: Start's chosen settings (and
 * the Idle pre-generation's start, which shares them) take the Idle level, frozen there; a fresh
 * Jam's settings hold Off until Jam has a level of its own.
 */
import { describe, expect, it } from 'vitest'

import { chosenSessionSettings } from '@/components/workspace/workspace-session-lock-choices'
import { OFF_CHORD_FAMILIES, type ChordFamilies } from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { BUILT_IN_PRESETS, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { makeSeed } from '@/domain/random/seed'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import { jamFirstValues } from '@/jam/jam-settings'
import { freezeSessionSettings } from '@/session/session-intents'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'

const CONTROLS = makeGenerationControls(DEFAULT_GENERATION_CONTROLS)
const PHRASE_ONE = createGenerationIntent({
  requestId: makeRequestId('phrase-1'),
  seed: makeSeed(11),
  controls: CONTROLS,
  figureLevels: NEUTRAL_FIGURE_LEVELS,
  chordFamilies: OFF_CHORD_FAMILIES,
})

// @test-link [[service_session_engine]]
// @test-link [[rule_session_settings_locked]]
describe("Start's chosen settings", () => {
  // @test-link [[rule_session_settings_locked]]
  it.each<ChordFamilies>([
    OFF_CHORD_FAMILIES,
    { 'seventh-chords': 'sometimes' },
    { 'seventh-chords': 'stronglyFavored' },
  ])('hold the Idle level $seventh-chords, frozen with the session', (chordFamilies) => {
    const settings = chosenSessionSettings(
      {
        controls: CONTROLS,
        figureLevels: NEUTRAL_FIGURE_LEVELS,
        chordFamilies,
        selection: DEFAULT_PRESET_SELECTION,
        presets: BUILT_IN_PRESETS,
      },
      { rhythmLockOn: false, allowedRhythmChanges: [], allowedGroups: ALL_GROUPS_ALLOWED },
      PHRASE_ONE,
    )

    expect(settings.chordFamilies).toEqual(chordFamilies)
    const frozen = freezeSessionSettings(settings)
    expect(frozen.chordFamilies).toEqual(chordFamilies)
    expect(Object.isFrozen(frozen.chordFamilies)).toBe(true)
  })
})

// @test-link [[req_jam_settings]]
describe("a fresh Jam's settings", () => {
  // @test-link [[req_jam_settings]]
  it('hold the Seventh chords level at Off', () => {
    const { settings } = freshJamSettings(
      {
        settings: jamFirstValues(CONTROLS),
        controls: CONTROLS,
        figureLevels: NEUTRAL_FIGURE_LEVELS,
      },
      null,
    )

    expect(settings.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
  })
})
