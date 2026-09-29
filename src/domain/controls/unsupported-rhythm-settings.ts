import { deepFreeze } from '../events/deep-freeze'
import {
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
} from './generation-controls'
import { resolveGeneratedNoteDensity, type NoteDensityContext } from './generated-note-density'

// @spec-link [[module_generation_control_catalog]]
export interface RhythmSetting {
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
}

/**
 * Intent: name every rhythmic variety + note density + silence density + syncopation combination
 * for which the rhythm grammar has no legal four-bar plan under any tension arc, so the workspace
 * can block Generate/Regenerate up front instead of letting a generation attempt fail. The note
 * density here is the one a phrase is generated with, which is what the rhythm grammar receives:
 * below the tablet-landscape width a chosen `Sixteenth` is generated, and so judged, as `Eighth`
 * (see `isRhythmSettingBlocked`). This is a known grammar limit, not a musical judgment: delete
 * this constant and the UI block it powers once a rhythm-grammar fix makes these combinations
 * playable.
 *
 * `Strict` keeps the six settings blocked before rhythmic variety existed. `Slightly varied`
 * unblocks two of them (the eighth-bearing cells it adds rescue the attack band under Active
 * displacement). `Heavily varied` blocks nothing (§4, ISS-004 feasibility review).
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export const UNSUPPORTED_RHYTHM_SETTINGS: readonly RhythmSetting[] = deepFreeze([
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Sparse',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Sparse',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
  },
])

/**
 * True when the given rhythmic variety + note density + silence density + syncopation combination
 * cannot form a phrase. The setting is taken as generated: its note density is the one the rhythm
 * grammar would receive. To judge the player's chosen setting, call `isRhythmSettingBlocked`.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function isUnsupportedRhythmSetting(setting: RhythmSetting): boolean {
  return UNSUPPORTED_RHYTHM_SETTINGS.some(
    (entry) =>
      entry.noteDensity === setting.noteDensity &&
      entry.rhythmicVariety === setting.rhythmicVariety &&
      entry.silenceDensity === setting.silenceDensity &&
      entry.syncopation === setting.syncopation,
  )
}

export type RhythmSettingSuggestion =
  | { readonly control: 'syncopation'; readonly from: Syncopation; readonly to: Syncopation }
  | {
      readonly control: 'silenceDensity'
      readonly from: SilenceDensity
      readonly to: SilenceDensity
    }
  | { readonly control: 'noteDensity'; readonly from: NoteDensity; readonly to: NoteDensity }

export class UnsupportedRhythmSettingSuggestionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedRhythmSettingSuggestionError'
  }
}

/** Values ordered nearest-first by catalog distance from `currentIndex`, ties broken by lower index. */
function orderedByDistance<T>(catalog: readonly T[], currentIndex: number): readonly T[] {
  return catalog
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.index !== currentIndex)
    .sort(
      (left, right) =>
        Math.abs(left.index - currentIndex) - Math.abs(right.index - currentIndex) ||
        left.index - right.index,
    )
    .map((entry) => entry.value)
}

function syncopationCandidates(setting: RhythmSetting): readonly RhythmSettingSuggestion[] {
  const currentIndex = SYNCOPATIONS.indexOf(setting.syncopation)
  return SYNCOPATIONS.map((value, index) => ({ value, index }))
    .filter((entry) => entry.index < currentIndex)
    .sort((left, right) => right.index - left.index)
    .map((entry) => ({
      control: 'syncopation' as const,
      from: setting.syncopation,
      to: entry.value,
    }))
}

function silenceDensityCandidates(setting: RhythmSetting): readonly RhythmSettingSuggestion[] {
  const currentIndex = SILENCE_DENSITIES.indexOf(setting.silenceDensity)
  return orderedByDistance(SILENCE_DENSITIES, currentIndex).map((to) => ({
    control: 'silenceDensity' as const,
    from: setting.silenceDensity,
    to,
  }))
}

function noteDensityCandidates(setting: RhythmSetting): readonly RhythmSettingSuggestion[] {
  const currentIndex = NOTE_DENSITIES.indexOf(setting.noteDensity)
  return orderedByDistance(NOTE_DENSITIES, currentIndex).map((to) => ({
    control: 'noteDensity' as const,
    from: setting.noteDensity,
    to,
  }))
}

function applySuggestion(
  setting: RhythmSetting,
  suggestion: RhythmSettingSuggestion,
): RhythmSetting {
  return { ...setting, [suggestion.control]: suggestion.to }
}

/**
 * Intent: name the deterministic single-control nearest supported change for an unsupported
 * rhythm setting, without mutating or applying anything. Tries syncopation one step lighter at a
 * time first, then silence density by catalog distance, then note density by catalog distance,
 * returning the first candidate whose resulting setting is supported. Crashes rather than
 * guessing a suggestion for a setting that is already supported.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function suggestNearestSupportedRhythmChange(
  setting: RhythmSetting,
): RhythmSettingSuggestion {
  if (!isUnsupportedRhythmSetting(setting))
    throw new UnsupportedRhythmSettingSuggestionError(
      'Cannot suggest a rhythm change for a setting that is already supported.',
    )
  const candidates = [
    ...syncopationCandidates(setting),
    ...silenceDensityCandidates(setting),
    ...noteDensityCandidates(setting),
  ]
  for (const candidate of candidates)
    if (!isUnsupportedRhythmSetting(applySuggestion(setting, candidate))) return candidate
  throw new UnsupportedRhythmSettingSuggestionError(
    'No single-control change makes this rhythm setting supported.',
  )
}

/** Intent: the calm inline explanation shown next to the rhythm controls when generation is blocked. */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export const UNSUPPORTED_RHYTHM_SETTING_MESSAGE =
  "This mix of note density, silence, and syncopation can't form a four-bar phrase yet. Try a lighter syncopation, a different note density, or another silence setting."

/** Intent: render a nearest-supported-change suggestion as a single sentence for the live region. */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function describeRhythmSettingSuggestion(suggestion: RhythmSettingSuggestion): string {
  return `Suggested change: ${suggestion.to} instead of ${suggestion.from}.`
}

/**
 * Intent: the rhythm setting a phrase would be generated from: the chosen setting with its note
 * density resolved for the window's width and the session's step-down (a chosen `Sixteenth` counts
 * as `Eighth` below the tablet-landscape width). Every other rhythm control is kept as chosen.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function generatedRhythmSetting(
  chosen: RhythmSetting,
  context: NoteDensityContext,
): RhythmSetting {
  return {
    noteDensity: resolveGeneratedNoteDensity(chosen.noteDensity, context),
    rhythmicVariety: chosen.rhythmicVariety,
    silenceDensity: chosen.silenceDensity,
    syncopation: chosen.syncopation,
  }
}

/**
 * Intent: whether the player's chosen rhythm setting blocks generation, judged on the note
 * density a phrase would be generated with. Below the tablet-landscape width a combination
 * unsupported only because of a chosen `Sixteenth` therefore blocks nothing, and a crossing of
 * that width can block or unblock the same chosen setting. `Eighth` is never blocked, so a session
 * whose density has stepped down can never be blocked by a change of window.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function isRhythmSettingBlocked(
  chosen: RhythmSetting,
  context: NoteDensityContext,
): boolean {
  return isUnsupportedRhythmSetting(generatedRhythmSetting(chosen, context))
}
