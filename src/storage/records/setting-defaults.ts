/**
 * The shape of every setting the app saves, the closed value catalogs of the settings that have no
 * catalog in the domain, and each setting's default: the value it takes on a first visit, and the
 * value a saved setting falls back to when it cannot be read. Pure data, no storage access.
 *
 * Where each default comes from in the running app: the 14 generation controls from
 * `src/domain/controls/profile-selection.ts`; the seven figure levels, Neutral's, from
 * `src/domain/figures/figure-levels.ts`; the preset selection, Neutral, from
 * `src/domain/presets/built-in-presets.ts`; the theme from the generation session's first state
 * (`System`); the audio mix from the design tokens, read at start-up, so it is passed in; the
 * three "During a session" options from the session controller's flags, all off;
 * the review's preferences from the review host (MusicXML, no backing track, Played notes hidden);
 * `Keep my played notes` is off, as the player's played notes are kept only after they opt in.
 */

import type { AudioMix } from '@/audio/audio-mix'
import type { GeneratedNotesFormat } from '@/components/review/review-types'
import type { ThemePreference } from '@/composables/generation-session-types'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS, type FigureLevels } from '@/domain/figures/figure-levels'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'

/** The three "During a session" options, each the player's own opt-in. */
// @spec-link [[rule_settings_saved_on_change]]
export interface SessionOptionChoices {
  readonly varySettings: boolean
  readonly tensionAcrossPhrases: boolean
  readonly risingTempo: boolean
}

/** The review's preferences: the generated-notes format, its backing track, the Played notes lane. */
// @spec-link [[rule_settings_saved_on_change]]
export interface ReviewPreferences {
  readonly format: GeneratedNotesFormat
  readonly backingTrack: boolean
  readonly playedNotesShown: boolean
}

/**
 * Every saved setting, each the value the player chose: the chosen controls and figure levels
 * (never the ones a phrase was generated with), the preset selection, and no tempo a Rising-tempo
 * session reached.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
export interface SavedSettings {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly presetSelection: PresetSelection
  readonly theme: ThemePreference
  readonly mix: AudioMix
  readonly sessionOptions: SessionOptionChoices
  readonly review: ReviewPreferences
  readonly keepPlayedNotes: boolean
}

/**
 * The theme's values, as a record over the theme type so the compiler refuses a missing or an
 * extra value; the catalog below is its keys.
 */
const THEME_VALUES: Readonly<Record<ThemePreference, true>> = {
  System: true,
  Light: true,
  Dark: true,
}

/** The theme's closed catalog: System, Light and Dark. */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export const THEME_PREFERENCES: readonly ThemePreference[] = deepFreeze(
  Object.keys(THEME_VALUES) as ThemePreference[],
)

/** The generated-notes formats, as a record over the format type (exhaustive, nothing extra). */
const FORMAT_VALUES: Readonly<Record<GeneratedNotesFormat, true>> = { musicxml: true, midi: true }

/** The generated-notes format's closed catalog: MusicXML and MIDI. */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export const GENERATED_NOTES_FORMATS: readonly GeneratedNotesFormat[] = deepFreeze(
  Object.keys(FORMAT_VALUES) as GeneratedNotesFormat[],
)

/** The theme on a first visit: follow the system's light or dark preference. */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export const DEFAULT_THEME: ThemePreference = 'System'

/** The "During a session" options on a first visit: all off, so each is the player's opt-in. */
// @spec-link [[rule_settings_saved_on_change]]
export const DEFAULT_SESSION_OPTIONS: SessionOptionChoices = deepFreeze({
  varySettings: false,
  tensionAcrossPhrases: false,
  risingTempo: false,
})

/** The review's preferences on a first visit: MusicXML, no backing track, Played notes hidden. */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export const DEFAULT_REVIEW_PREFERENCES: ReviewPreferences = deepFreeze({
  format: 'musicxml',
  backingTrack: false,
  playedNotesShown: false,
})

/** `Keep my played notes` is off until the player turns it on. */
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
export const DEFAULT_KEEP_PLAYED_NOTES = false

/**
 * Intent: every setting's default, with the audio mix's first-load levels passed in (they come
 * from the design tokens, read at start-up). What a first visit starts from, and what each
 * unreadable saved setting falls back to.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export function defaultSettings(mixDefaults: AudioMix): SavedSettings {
  return deepFreeze({
    controls: DEFAULT_GENERATION_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    presetSelection: DEFAULT_PRESET_SELECTION,
    theme: DEFAULT_THEME,
    mix: { ...mixDefaults },
    sessionOptions: DEFAULT_SESSION_OPTIONS,
    review: DEFAULT_REVIEW_PREFERENCES,
    keepPlayedNotes: DEFAULT_KEEP_PLAYED_NOTES,
  })
}
