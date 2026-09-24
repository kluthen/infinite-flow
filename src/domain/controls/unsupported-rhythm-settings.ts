import { deepFreeze } from '../events/deep-freeze'
import {
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  type NoteDensity,
  type SilenceDensity,
  type Syncopation,
} from './generation-controls'

// @spec-link [[module_generation_control_catalog]]
export interface RhythmSetting {
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
}

/**
 * Intent: name every note density + silence density + syncopation combination for which the
 * rhythm grammar has no legal four-bar plan under any tension arc, so the workspace can block
 * Generate/Regenerate up front instead of letting a generation attempt fail. This is a known
 * grammar limit, not a musical judgment: delete this constant and the UI block it powers once a
 * rhythm-grammar fix makes these six combinations playable.
 */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export const UNSUPPORTED_RHYTHM_SETTINGS: readonly RhythmSetting[] = deepFreeze([
  { noteDensity: 'Quarter', silenceDensity: 'Sparse', syncopation: 'Active displacement' },
  { noteDensity: 'Quarter', silenceDensity: 'Breath-heavy', syncopation: 'Active displacement' },
  { noteDensity: 'Sixteenth', silenceDensity: 'Sparse', syncopation: 'Active displacement' },
  {
    noteDensity: 'Sixteenth',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
  },
  { noteDensity: 'Sixteenth', silenceDensity: 'Breath-heavy', syncopation: 'Active displacement' },
])

/** True when the given note density + silence density + syncopation combination cannot form a phrase. */
// @spec-link [[rule_unsupported_rhythm_settings_block_generation]]
export function isUnsupportedRhythmSetting(setting: RhythmSetting): boolean {
  return UNSUPPORTED_RHYTHM_SETTINGS.some(
    (entry) =>
      entry.noteDensity === setting.noteDensity &&
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
