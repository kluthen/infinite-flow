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
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { ADOPTED_INSTRUMENT_PROFILES, MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
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

/**
 * Intent: build the instrument-profile options from the single declarative profile table
 * (`ADOPTED_INSTRUMENT_PROFILES`), reading each option's player-facing label straight off the
 * profile's own `displayName` rather than a hand-maintained parallel id-to-label map -- so adding a
 * profile to that table needs no edit here.
 */
// @spec-link [[module_generation_control_catalog]]
// @spec-link [[entity_instrument_profile]]
export function instrumentProfileOptions(): readonly SegmentedControlOption[] {
  return ADOPTED_INSTRUMENT_PROFILES.map((profile) => ({
    value: profile.id,
    label: profile.displayName,
  }))
}

/**
 * Intent: the instrument control's options: the three built-in profiles, then, while my
 * instrument exists, a fourth labelled with its name, its value the fixed `my-instrument` id.
 */
// @spec-link [[req_my_instrument]]
export function instrumentChoiceOptions(
  myInstrumentName: string | null,
): readonly SegmentedControlOption[] {
  const builtIns = instrumentProfileOptions()
  if (myInstrumentName === null) return builtIns
  return [...builtIns, { value: MY_INSTRUMENT_ID, label: myInstrumentName }]
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
  }
  return NOTE_DENSITIES.map((value) => ({ value, label: labels[value] }))
}

/** Intent: build the rhythmic-variety options; every catalog value is already its own label. */
// @spec-link [[module_generation_control_catalog]]
export function rhythmicVarietyOptions(): readonly SegmentedControlOption[] {
  return RHYTHMIC_VARIETIES.map((value) => ({ value, label: value }))
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
 * Intent: the musical-profile state as `control-summary` writes it: the preset name, or
 * `Custom ({grammar} grammar)` during a custom edit.
 */
// @spec-link [[module_generation_control_catalog]]
export function profileSelectionLabel(profileSelection: ProfileSelection): string {
  return profileSelection.isCustom
    ? `Custom (${profileSelection.musicalProfile} grammar)`
    : profileSelection.musicalProfile
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
  const profileLabel = profileSelectionLabel(profileSelection)
  return `${tonalCenterLabel} ${collectionLabel} · ${profileLabel} · ${tensionLabel} · ${leapinessLabel}`
}
