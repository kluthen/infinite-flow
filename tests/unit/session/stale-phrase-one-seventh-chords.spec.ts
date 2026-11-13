/**
 * The Seventh chords level and a stale phrase 1: phrase 1's settings hold the level it was
 * generated with, as the Idle result recorded it, so after `Start with this phrase` phrase 1 keeps
 * its own level and the session's holds from the next phrase generated under the session's
 * settings.
 */
import { describe, expect, it } from 'vitest'

import { OFF_CHORD_FAMILIES, type ChordFamilies } from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { makeSeed } from '@/domain/random/seed'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import {
  isPhraseOneStale,
  phraseOneSettings,
  phraseOneSettingsAtStart,
  staleSettingsOf,
} from '@/session/stale-phrase-one'

const FAVORED: ChordFamilies = { 'seventh-chords': 'favored' }

/** Intent: the default settings at the given level, as a session or the current settings hold them. */
function settingsAt(chordFamilies: ChordFamilies): SessionSettings {
  return {
    controls: makeGenerationControls(DEFAULT_GENERATION_CONTROLS),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies,
    selection: DEFAULT_PRESET_SELECTION,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
    allowedRhythmChanges: [],
  }
}

/** Intent: phrase 1's settings as a session takes them from an Idle result at the given level. */
function phraseOneAt(chordFamilies: ChordFamilies): SessionSettings {
  const controls = makeGenerationControls(DEFAULT_GENERATION_CONTROLS)
  const intent = createGenerationIntent({
    requestId: makeRequestId('phrase-1'),
    seed: makeSeed(11),
    controls,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    chordFamilies,
  })
  return phraseOneSettings(
    {
      controls,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      chordFamilies,
      selection: DEFAULT_PRESET_SELECTION,
    },
    intent,
    controls.tempo,
  )
}

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[service_session_engine]]
describe("phrase 1's settings hold the level it was generated with", () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('are the recorded level, whatever the current one, and a start keeps them as phrase 1’s', () => {
    const phraseOne = phraseOneAt(FAVORED)
    expect(phraseOne.chordFamilies).toEqual(FAVORED)

    const atStart = phraseOneSettingsAtStart(settingsAt(OFF_CHORD_FAMILIES), phraseOne)
    expect(atStart.chordFamilies).toEqual(FAVORED)
    expect(phraseOneSettingsAtStart(settingsAt(FAVORED), undefined).chordFamilies).toEqual(FAVORED)
  })
})

// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('the level counts when phrase 1 is compared with the current settings', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('makes phrase 1 out of date once the level differs, naming the Seventh chords level', () => {
    const phraseOne = phraseOneAt(OFF_CHORD_FAMILIES)

    expect(isPhraseOneStale(phraseOne, settingsAt(FAVORED))).toBe(true)
    expect(staleSettingsOf(phraseOne, settingsAt(FAVORED))).toEqual(['seventh-chords'])
    expect(isPhraseOneStale(phraseOneAt(FAVORED), settingsAt(OFF_CHORD_FAMILIES))).toBe(true)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('keeps phrase 1 current at its own level, a level changed and changed back included', () => {
    const phraseOne = phraseOneAt(FAVORED)
    const changedBack = { ...settingsAt(OFF_CHORD_FAMILIES), chordFamilies: FAVORED }

    expect(isPhraseOneStale(phraseOne, settingsAt(FAVORED))).toBe(false)
    expect(isPhraseOneStale(phraseOne, changedBack)).toBe(false)
    expect(staleSettingsOf(phraseOne, changedBack)).toEqual([])
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('names the level beside the other settings that changed', () => {
    const current = {
      ...settingsAt(FAVORED),
      controls: { ...settingsAt(FAVORED).controls, tonalCenter: 'F#' as const },
    }

    expect(staleSettingsOf(phraseOneAt(OFF_CHORD_FAMILIES), current)).toEqual([
      'tonalCenter',
      'seventh-chords',
    ])
  })
})
