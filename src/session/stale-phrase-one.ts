/**
 * Phrase 1's own settings, and whether phrase 1 is stale. At Idle, ordinary edits never regenerate
 * the phrase on screen, so the settings phrase 1 was generated under can differ from the current
 * ones. This module builds those settings as a session takes them, from what the Idle result
 * recorded, and compares them by value with the current ones, over what the generation reads.
 * Pure: it reads no clock and holds no state.
 */

import type { IdlePhraseSettings } from '../composables/workspace-session-result'
import type { GenerationControls } from '../domain/controls/generation-controls'
import type { FigureId } from '../domain/figures/figure-levels'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import {
  figuresWithChangedLevels,
  freezeSessionSettings,
  sessionInstrumentProfile,
  sessionSettingsAtStart,
} from './session-intents'
import { SessionEngineError, type SessionSettings } from './session-types'

/**
 * Intent: the session settings phrase 1 was generated under, as a session takes them: the
 * recorded controls at the session's `tempo` (the tempo never affects generation), the recorded
 * figure levels and selection, my instrument's profile taken from phrase 1's intent, which embeds
 * it.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function phraseOneSettings(
  recorded: IdlePhraseSettings,
  phraseOne: GenerationIntent,
  tempo: number,
): SessionSettings {
  return sessionSettingsAtStart(
    {
      controls: { ...recorded.controls, tempo },
      figureLevels: recorded.figureLevels,
      selection: recorded.selection,
    },
    phraseOne,
  )
}

/**
 * Intent: the settings a session's phrase 1 was decided under, frozen: the chosen settings when
 * the start gives none, so phrase 2 then joins it as it always did; otherwise phrase 1's own,
 * which must hold the session's tempo and instrument (a session keeps both), or the start is a
 * caller bug.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[module_session_carry_in_after_change]]
export function phraseOneSettingsAtStart(
  chosen: SessionSettings,
  phraseOne: SessionSettings | undefined,
): SessionSettings {
  if (phraseOne === undefined) return chosen
  const frozen = freezeSessionSettings(phraseOne)
  const { tempo, instrumentProfileId } = chosen.controls
  if (frozen.controls.tempo !== tempo)
    throw new SessionEngineError(
      `Phrase 1's settings must carry the session's tempo ${tempo}, not ${frozen.controls.tempo}.`,
    )
  if (frozen.controls.instrumentProfileId !== instrumentProfileId)
    throw new SessionEngineError(
      `Phrase 1's settings name ${frozen.controls.instrumentProfileId}, the session ${instrumentProfileId}.`,
    )
  return frozen
}

/** Intent: whether any generation control but the tempo differs between the two controls. */
function controlsDiffer(before: GenerationControls, after: GenerationControls): boolean {
  const keys = Object.keys(before) as (keyof GenerationControls)[]
  return keys.some((key) => key !== 'tempo' && before[key] !== after[key])
}

/**
 * Intent: whether the instrument, as the generation reads it, differs: its concert range or its
 * transposition (its id is a control). My instrument's display name, a part of its profile, and
 * its clef, which is not, never count.
 */
function instrumentDiffers(before: SessionSettings, after: SessionSettings): boolean {
  const was = sessionInstrumentProfile(before)
  const is = sessionInstrumentProfile(after)
  return (
    was.concertRange.minMidi !== is.concertRange.minMidi ||
    was.concertRange.maxMidi !== is.concertRange.maxMidi ||
    was.transposition.chromatic !== is.transposition.chromatic ||
    was.transposition.diatonic !== is.transposition.diatonic
  )
}

/**
 * Intent: whether phrase 1 is stale: a setting the generation reads has a different value now
 * than when phrase 1 was generated. Values are compared, not edits. Every generation control
 * counts but the tempo, each figure's level counts (a change of the selection alone changes
 * none), and the instrument counts as the generation reads it; the session options, the mix, the
 * theme and the window never reach either side.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function isPhraseOneStale(phraseOne: SessionSettings, current: SessionSettings): boolean {
  return (
    controlsDiffer(phraseOne.controls, current.controls) ||
    figuresWithChangedLevels(phraseOne, current).length > 0 ||
    instrumentDiffers(phraseOne, current)
  )
}

/** A setting that can make phrase 1 stale: a generation control but the tempo, or a figure. */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export type StaleSetting = Exclude<keyof GenerationControls, 'tempo'> | FigureId

/**
 * Intent: every setting whose value differs from phrase 1's, over what the generation reads, as
 * `isPhraseOneStale` compares them, for the prompt to name: each generation control but the
 * tempo, the instrument's control also when my instrument's range or transposition differs, then
 * each figure whose level differs, in FIGURE_IDS order, the selection never named. None when
 * phrase 1 is not stale.
 */
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function staleSettingsOf(
  phraseOne: SessionSettings,
  current: SessionSettings,
): readonly StaleSetting[] {
  const keys = Object.keys(phraseOne.controls) as (keyof GenerationControls)[]
  const changed = keys.filter(
    (key): key is Exclude<keyof GenerationControls, 'tempo'> =>
      key !== 'tempo' && phraseOne.controls[key] !== current.controls[key],
  )
  if (!changed.includes('instrumentProfileId') && instrumentDiffers(phraseOne, current))
    changed.push('instrumentProfileId')
  return [...changed, ...figuresWithChangedLevels(phraseOne, current)]
}
