// @vitest-environment node
/**
 * The key and mode suggestion and the Seventh chords level: the suggestion scores the doodle's own
 * notes against the key and mode pairs, and no generated chord enters it, so for every doodle of
 * the golden list recorded on v3.2 the answer worked out at a doodle's end, from Jam's settings, is
 * the recorded one whatever level those settings hold.
 */
import { describe, expect, it } from 'vitest'

import { CHORD_FAMILY_LEVEL_IDS, type ChordFamilyLevel } from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { isBuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import { doodleSuggestion, type JamPhraseOneSettings } from '@/jam/jam-phrase-one-attempts'
import { jamFirstValues } from '@/jam/jam-settings'

import { loadKeySuggestionGolden } from './key-suggestion-golden'
import type { KeySuggestionGoldenCase } from './key-suggestion-golden-case'

/** Intent: Jam's settings for a golden case's key, mode and instrument, at the given level. */
function jamAt(golden: KeySuggestionGoldenCase, level: ChordFamilyLevel): JamPhraseOneSettings {
  const { instrumentProfileId } = golden
  if (!isBuiltInInstrumentProfileId(instrumentProfileId))
    throw new Error(`${golden.label}: no built-in instrument ${instrumentProfileId}.`)
  const controls = makeGenerationControls({
    ...DEFAULT_GENERATION_CONTROLS,
    tonalCenter: golden.jam.tonalCenter,
    collection: golden.jam.collection,
    instrumentProfileId,
  })
  const jam = freshJamSettings(
    { settings: jamFirstValues(controls), controls, figureLevels: NEUTRAL_FIGURE_LEVELS },
    null,
  )
  return { ...jam, settings: { ...jam.settings, chordFamilies: { 'seventh-chords': level } } }
}

// @test-link [[module_key_suggestion]]
// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe('the key and mode suggestion at every Seventh chords level', () => {
  const golden = loadKeySuggestionGolden()

  // @test-link [[module_key_suggestion]]
  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it.each(golden.cases.map((each) => [each.label, each] as const))(
    'answers %s as recorded, at every level',
    (_label, each) => {
      const doodle = makeQuantizedDoodle(each.doodle)
      for (const level of CHORD_FAMILY_LEVEL_IDS)
        expect(doodleSuggestion(doodle, jamAt(each, level)), level).toEqual(each.answer)
    },
  )
})
