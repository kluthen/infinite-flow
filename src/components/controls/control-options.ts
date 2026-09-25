/**
 * Builds every SegmentedControl option list this workspace renders directly from the domain
 * catalogs in generation-controls.ts, in catalog order, so a catalog addition or reorder needs no
 * parallel edit here. Most catalog values double as their own display label; a handful of values
 * carry a friendlier or enharmonic label instead, listed in the small override maps below.
 */
import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import type { SegmentedControlOption } from './segmented-control-option'

/** Intent: build the twelve tonal-center options with their sharp/flat enharmonic labels. */
// @spec-link [[module_generation_control_catalog]]
export function tonalCenterOptions(): readonly SegmentedControlOption[] {
  const labels: Readonly<Record<(typeof PITCH_CLASSES)[number], string>> = {
    C: 'C',
    'C#': 'C-sharp/D-flat',
    D: 'D',
    'D#': 'D-sharp/E-flat',
    E: 'E',
    F: 'F',
    'F#': 'F-sharp/G-flat',
    G: 'G',
    'G#': 'G-sharp/A-flat',
    A: 'A',
    'A#': 'A-sharp/B-flat',
    B: 'B',
  }
  return PITCH_CLASSES.map((value) => ({ value, label: labels[value] }))
}

/** Intent: build the nine-collection options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function collectionOptions(): readonly SegmentedControlOption[] {
  return COLLECTIONS.map((value) => ({ value, label: value }))
}

/** Intent: build the three instrument-profile options with their player-facing instrument names. */
// @spec-link [[module_generation_control_catalog]]
export function instrumentProfileOptions(): readonly SegmentedControlOption[] {
  const labels: Readonly<Record<(typeof INSTRUMENT_PROFILE_IDS)[number], string>> = {
    'c-keyboard': 'C MIDI keyboard',
    'bb-tenor': 'B-flat tenor saxophone',
    'eb-alto': 'E-flat alto saxophone',
  }
  return INSTRUMENT_PROFILE_IDS.map((value) => ({ value, label: labels[value] }))
}

/** Intent: build the Neutral/Jazz musical-profile-preset options. */
// @spec-link [[module_generation_control_catalog]]
export function musicalProfileOptions(): readonly SegmentedControlOption[] {
  return MUSICAL_PROFILES.map((value) => ({ value, label: value }))
}

/** Intent: build the harmonic-motion options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function harmonicMotionOptions(): readonly SegmentedControlOption[] {
  return HARMONIC_MOTIONS.map((value) => ({ value, label: value }))
}

/** Intent: build the tension-arc options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function tensionOptions(): readonly SegmentedControlOption[] {
  return TENSION_ARCS.map((value) => ({ value, label: value }))
}

/** Intent: build the note-density options with their fuller rhythmic-value labels. */
// @spec-link [[module_generation_control_catalog]]
export function noteDensityOptions(): readonly SegmentedControlOption[] {
  const labels: Readonly<Record<(typeof NOTE_DENSITIES)[number], string>> = {
    Quarter: 'Quarter notes',
    Eighth: 'Eighth notes',
    Sixteenth: 'Sixteenth',
    Mixed: 'Mixed',
  }
  return NOTE_DENSITIES.map((value) => ({ value, label: labels[value] }))
}

/** Intent: build the syncopation options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function syncopationOptions(): readonly SegmentedControlOption[] {
  return SYNCOPATIONS.map((value) => ({ value, label: value }))
}

/** Intent: build the silence-density options, spelling out the conversational middle value. */
// @spec-link [[module_generation_control_catalog]]
export function silenceDensityOptions(): readonly SegmentedControlOption[] {
  const labels: Readonly<Record<(typeof SILENCE_DENSITIES)[number], string>> = {
    Sparse: 'Sparse',
    Conversational: 'Conversational space',
    'Breath-heavy': 'Breath-heavy',
  }
  return SILENCE_DENSITIES.map((value) => ({ value, label: labels[value] }))
}

/** Intent: build the contour options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function contourOptions(): readonly SegmentedControlOption[] {
  return CONTOURS.map((value) => ({ value, label: value }))
}

/** Intent: build the register options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function registerOptions(): readonly SegmentedControlOption[] {
  return REGISTER_CHOICES.map((value) => ({ value, label: value }))
}

/** Intent: build the leapiness options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function leapinessOptions(): readonly SegmentedControlOption[] {
  return LEAPINESS_VALUES.map((value) => ({ value, label: value }))
}

/** Intent: build the arpeggio-chaos options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function arpeggioChaosOptions(): readonly SegmentedControlOption[] {
  return ARPEGGIO_CHAOS_VALUES.map((value) => ({ value, label: value }))
}

/** Intent: find one option's display label by its catalog value, or fail fast if none exists. */
function labelFor(options: readonly SegmentedControlOption[], value: string): string {
  const found = options.find((option) => option.value === value)
  if (found === undefined) {
    throw new Error(`No option exists for value ${JSON.stringify(value)}.`)
  }
  return found.label
}

/**
 * Intent: the muted `control-summary` copy per D25 -- tonal center and collection labels
 * separated by a plain space, then the musical-profile state (preset name, or `Custom ({grammar}
 * grammar)` during a custom edit), tension arc, and leapiness, each segment separated by ` · `.
 */
// @spec-link [[module_generation_control_catalog]]
export function controlSummaryText(
  controls: GenerationControls,
  profileSelection: ProfileSelection,
): string {
  const tonalCenterLabel = labelFor(tonalCenterOptions(), controls.tonalCenter)
  const collectionLabel = labelFor(collectionOptions(), controls.collection)
  const tensionLabel = labelFor(tensionOptions(), controls.tension)
  const leapinessLabel = labelFor(leapinessOptions(), controls.leapiness)
  const profileLabel = profileSelection.isCustom
    ? `Custom (${profileSelection.musicalProfile} grammar)`
    : profileSelection.musicalProfile
  return `${tonalCenterLabel} ${collectionLabel} · ${profileLabel} · ${tensionLabel} · ${leapinessLabel}`
}
