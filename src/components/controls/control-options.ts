/**
 * Builds every SegmentedControl option list this workspace renders directly from the domain
 * catalogs in generation-controls.ts, in catalog order, so a catalog addition or reorder needs no
 * parallel edit here. Most catalog values double as their own display label; a handful of values
 * carry a friendlier or enharmonic label instead, listed in the small override maps below.
 */
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { RegisterId } from '@/domain/profile/register-id'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { presetLabel } from '@/domain/controls/preset-label'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  listInWords,
  type KeyAndModeRestriction,
  type RestrictionHalf,
} from '@/domain/presets/key-and-mode-restriction'
import type { Preset, PresetSelection } from '@/domain/presets/preset-selection'
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

/**
 * Intent: a profile's range summary, as the instrument control and the My instrument sheet show
 * it: its active concert range and its Low, Middle and High whole-phrase windows, derived from it.
 */
// @spec-link [[req_my_instrument]]
export function profileRangeSummaryText(profile: InstrumentProfile): string {
  const candidates = deriveRegisterWindowCandidates(profile.concertRange, profile.registerWindows)
  const windowOf = (id: RegisterId): string => {
    const found = candidates.find((candidate) => candidate.id === id)
    if (found === undefined) throw new Error(`No "${id}" register window was derived.`)
    return `${found.window.minMidi}-${found.window.maxMidi}`
  }
  const range = profile.concertRange
  return `Active range ${range.minMidi}-${range.maxMidi}. Whole-phrase windows: Low ${windowOf('Low')}, Middle ${windowOf('Middle')}, High ${windowOf('High')}.`
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
 * Intent: the muted `control-summary` copy per D25 -- tonal center and collection labels
 * separated by a plain space, then the preset label of the selection, named from the presets the
 * session knows (the preset's name, or `Custom, based on {name}` naming Custom's base, or `Custom`
 * alone with none), tension arc, and leapiness, each segment separated by ` · `.
 */
// @spec-link [[module_generation_control_catalog]]
// @spec-link [[rule_custom_names_its_base]]
export function controlSummaryText(
  controls: GenerationControls,
  selection: PresetSelection,
  presets: readonly Preset[],
): string {
  const tonalCenterLabel = labelFor(tonalCenterOptions(), controls.tonalCenter)
  const collectionLabel = labelFor(collectionOptions(), controls.collection)
  const tensionLabel = labelFor(tensionOptions(), controls.tension)
  const leapinessLabel = labelFor(leapinessOptions(), controls.leapiness)
  const selectionLabel = presetLabel(selection, presets)
  return `${tonalCenterLabel} ${collectionLabel} · ${selectionLabel} · ${tensionLabel} · ${leapinessLabel}`
}

/** The marks of one control: the option values marked, and the note saying what they mean. */
// @spec-link [[module_key_and_mode_marks]]
export interface ControlMarks {
  readonly marked: readonly string[]
  readonly note: string | null
}

/** The key and mode marks: those of Written key and those of Collection. */
// @spec-link [[module_key_and_mode_marks]]
export interface KeyAndModeMarks {
  readonly writtenKey: ControlMarks
  readonly collection: ControlMarks
}

/**
 * Intent: one control's marks from one half of a restriction: "any" marks nothing and gives no
 * note; a list marks exactly its values and gives the note naming the preset and the list, in the
 * control's own labels, `what` naming what any value of the control is ("key", "mode").
 */
function halfMarks(
  half: RestrictionHalf<string>,
  options: readonly SegmentedControlOption[],
  presetName: string,
  what: 'key' | 'mode',
): ControlMarks {
  if (half === 'any') return { marked: [], note: null }
  const list = listInWords(half.map((value) => labelFor(options, value)))
  return {
    marked: [...half],
    note: `${presetName} is meant for ${list}, marked. Any ${what} works; another one makes your settings Custom.`,
  }
}

/**
 * Intent: the key and mode marks, a pure function of a restriction, or none, and the name of the
 * preset the notes name. The keys half marks Written key and the modes half Collection: a list
 * marks exactly its values, with that control's note; "any", or no restriction, marks nothing and
 * gives no note. It never disables an option and decides nothing else about the controls.
 */
// @spec-link [[module_key_and_mode_marks]]
// @spec-link [[rule_restriction_highlight_never_blocks]]
export function keyAndModeMarks(
  restriction: KeyAndModeRestriction | null,
  presetName: string,
): KeyAndModeMarks {
  return deepFreeze({
    writtenKey: halfMarks(restriction?.keys ?? 'any', tonalCenterOptions(), presetName, 'key'),
    collection: halfMarks(restriction?.modes ?? 'any', collectionOptions(), presetName, 'mode'),
  })
}

/**
 * Intent: a control's options with the segmented control's `marked` flag on the marked values,
 * every option kept and none disabled; with nothing marked, the options as they are.
 */
// @spec-link [[module_key_and_mode_marks]]
// @spec-link [[rule_restriction_highlight_never_blocks]]
export function withMarks(
  options: readonly SegmentedControlOption[],
  marked: readonly string[],
): readonly SegmentedControlOption[] {
  if (marked.length === 0) return options
  return options.map((option) =>
    marked.includes(option.value) ? { ...option, marked: true } : option,
  )
}
