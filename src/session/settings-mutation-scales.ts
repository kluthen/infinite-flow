/**
 * The settings-mutation scale table: for every setting a mutation may change, the scale saying
 * which values are one grade away from the current one, where a step starts from, and how a step
 * is applied to the session settings. The scales are data, so a new value for a setting (a future
 * `Custom` note density, D175) is an edit of its catalog or entry here, not new code.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
  type MusicalProfile,
} from '../domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '../domain/controls/generated-note-density'
import {
  applyControlledCustomValue,
  applyNonProfileControlValue,
  type ProfileControlledValues,
  type ProfileSelection,
} from '../domain/controls/profile-selection'
import { deepFreeze } from '../domain/events/deep-freeze'
import { CANONICAL_REGISTER_ORDER, type RegisterId } from '../domain/profile/register-id'
import type { SessionSettings } from './session-types'

/** Typed failure for a caller that breaks the settings-mutation contract, or a mutation that cannot be drawn. */
// @spec-link [[module_settings_mutation]]
export class SettingsMutationError extends Error {
  readonly kind = 'SettingsMutationError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SettingsMutationError'
  }
}

/** Every generation setting except tempo and the instrument, plus the musical-profile identity. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[req_settings_mutation_flag]]
export type MutableSetting =
  Exclude<keyof GenerationControls, 'tempo' | 'instrumentProfileId'> | 'musicalProfile'

/** The value type of one mutable setting. */
// @spec-link [[module_settings_mutation]]
export type MutableValue<K extends MutableSetting> = K extends keyof GenerationControls
  ? GenerationControls[K]
  : MusicalProfile

/** What the session knows, when a mutation is decided, that the chosen settings do not say. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_density_mutation_steps_from_generated_density]]
export interface MutationContext {
  /** The window is narrower than `bp-tablet-landscape` when the mutation is decided. */
  readonly belowTabletLandscape: boolean
  /** The session has generated with `Eighth` for a chosen `Sixteenth` (its step-down memory). */
  readonly sessionSteppedDown: boolean
  /** The register the session resolved; a step from a chosen `Varying` starts here. */
  readonly resolvedRegister: RegisterId
}

/**
 * The kinds of scale: ordered with no wrap; circular, stepping `step` places either way; split
 * into separate ordered groups never crossed; nominal, every other value one grade away.
 */
// @spec-link [[rule_mutation_setting_scales]]
export type MutationScale<T extends string> =
  | { readonly kind: 'ordered'; readonly values: readonly T[] }
  | { readonly kind: 'circular'; readonly values: readonly T[]; readonly step: number }
  | { readonly kind: 'separate'; readonly groups: readonly (readonly T[])[] }
  | { readonly kind: 'nominal'; readonly values: readonly T[] }

/** One setting's scale, the value a step starts from, and how a step is applied. */
// @spec-link [[module_settings_mutation]]
export interface MutationScaleEntry<T extends string> {
  readonly scale: MutationScale<T>
  readonly from: (settings: SessionSettings, context: MutationContext) => T
  readonly apply: (settings: SessionSettings, value: T) => SessionSettings
}

/** One entry per mutable setting; a missing or extra setting is a type error. */
// @spec-link [[module_settings_mutation]]
export type MutationScaleTable = {
  readonly [K in MutableSetting]: MutationScaleEntry<MutableValue<K>>
}

/** Intent: the value at an index of a scale, crashing on an index the scale does not hold. */
function valueAt<T>(values: readonly T[], index: number): T {
  const value = values[index]
  if (value === undefined)
    throw new SettingsMutationError(`A scale has no value at index ${index}.`)
  return value
}

/** Intent: the index of a value on a scale, crashing when the value is not on it. */
function indexOn<T extends string>(values: readonly T[], value: T): number {
  const index = values.indexOf(value)
  if (index < 0)
    throw new SettingsMutationError(`${JSON.stringify(value)} is not on the mutation scale.`)
  return index
}

/** Intent: the lower then the upper neighbour of a value on an ordered scale with no wrap. */
function orderedNeighbours<T extends string>(values: readonly T[], value: T): readonly T[] {
  const index = indexOn(values, value)
  return [index - 1, index + 1]
    .filter((at) => at >= 0 && at < values.length)
    .map((at) => valueAt(values, at))
}

/**
 * Intent: the values one grade away from `value` on a scale, in a fixed order (lower first, then
 * higher; a circular scale's step down first). A value that is not on the scale is a caller bug.
 */
// @spec-link [[rule_mutation_setting_scales]]
// @spec-link [[module_settings_mutation]]
export function scaleNeighbours<T extends string>(scale: MutationScale<T>, value: T): readonly T[] {
  switch (scale.kind) {
    case 'ordered':
      return orderedNeighbours(scale.values, value)
    case 'separate': {
      const group = scale.groups.find((values) => values.includes(value))
      if (group === undefined)
        throw new SettingsMutationError(`${JSON.stringify(value)} is not on the mutation scale.`)
      return orderedNeighbours(group, value)
    }
    case 'circular': {
      const { values, step } = scale
      const index = indexOn(values, value)
      const steps = [index - step, index + step].map((at) =>
        valueAt(values, ((at % values.length) + values.length) % values.length),
      )
      return steps.filter((to, at) => to !== value && steps.indexOf(to) === at)
    }
    case 'nominal':
      indexOn(scale.values, value)
      return scale.values.filter((other) => other !== value)
  }
}

/** Intent: session settings from the pair the profile-selection edits return. */
function settingsOf([controls, musicalProfile]: readonly [
  GenerationControls,
  ProfileSelection,
]): SessionSettings {
  return { controls, musicalProfile }
}

/** Intent: an entry for a value the musical profile does not control: the selection is kept. */
function freeEntry<
  K extends Exclude<MutableSetting, keyof ProfileControlledValues | 'musicalProfile'>,
>(key: K, scale: MutationScale<GenerationControls[K]>): MutationScaleEntry<GenerationControls[K]> {
  return {
    scale,
    from: (settings) => settings.controls[key],
    apply: (settings, value) =>
      settingsOf(
        applyNonProfileControlValue(settings.controls, settings.musicalProfile, key, value),
      ),
  }
}

/** Intent: the chosen controls seen as the values a musical profile controls. */
function controlledValues(settings: SessionSettings): ProfileControlledValues {
  return settings.controls
}

/** Intent: an entry for a value the musical profile controls: a step marks the profile customized. */
function profileControlledEntry<K extends keyof ProfileControlledValues>(
  key: K,
  scale: MutationScale<ProfileControlledValues[K]>,
  from: (settings: SessionSettings, context: MutationContext) => ProfileControlledValues[K] = (
    settings,
  ) => controlledValues(settings)[key],
): MutationScaleEntry<ProfileControlledValues[K]> {
  return {
    scale,
    from,
    apply: (settings, value) =>
      settingsOf(
        applyControlledCustomValue(settings.controls, settings.musicalProfile, key, value),
      ),
  }
}

/** Intent: an ordered scale over a catalog, in the catalog's order. */
function ordered<T extends string>(values: readonly T[]): MutationScale<T> {
  return { kind: 'ordered', values }
}

/** The step of the circle of fifths in semitones: one accidental more or fewer. */
const CIRCLE_OF_FIFTHS_STEP = 7

/** The modes from brightest to darkest, one note changing at each step. */
const MODES_BY_BRIGHTNESS: readonly Collection[] = [
  'Lydian',
  'Ionian',
  'Mixolydian',
  'Dorian',
  'Aeolian',
  'Phrygian',
  'Locrian',
]

/**
 * Intent: the scale of every mutable setting, as data. The ordered settings follow the catalog
 * order the settings controls show. Note density steps from the density the session generates
 * with (D177); a `Varying` register steps from the register the session resolved, and the scale
 * holds no `Varying`, so a step always lands on a concrete register. The musical profile is
 * nominal, so with two profiles a step flips Neutral and Jazz; the flip changes the identity only,
 * keeps every control, never applies a bundle and marks the profile customized.
 */
// @spec-link [[rule_mutation_setting_scales]]
// @spec-link [[rule_mutation_profile_flip_keeps_controls]]
// @spec-link [[rule_mutation_marks_profile_customized]]
// @spec-link [[rule_density_mutation_steps_from_generated_density]]
// @spec-link [[module_settings_mutation]]
export const MUTATION_SCALES: MutationScaleTable = deepFreeze({
  tonalCenter: freeEntry('tonalCenter', {
    kind: 'circular',
    values: PITCH_CLASSES,
    step: CIRCLE_OF_FIFTHS_STEP,
  }),
  collection: freeEntry('collection', {
    kind: 'separate',
    groups: [['Major', 'Minor'], MODES_BY_BRIGHTNESS],
  }),
  harmonicMotion: profileControlledEntry('harmonicMotion', ordered(HARMONIC_MOTIONS)),
  tension: freeEntry('tension', ordered(TENSION_ARCS)),
  noteDensity: profileControlledEntry('noteDensity', ordered(NOTE_DENSITIES), (settings, context) =>
    resolveGeneratedNoteDensity(settings.controls.noteDensity, context),
  ),
  rhythmicVariety: profileControlledEntry('rhythmicVariety', ordered(RHYTHMIC_VARIETIES)),
  syncopation: profileControlledEntry('syncopation', ordered(SYNCOPATIONS)),
  silenceDensity: profileControlledEntry('silenceDensity', ordered(SILENCE_DENSITIES)),
  contour: profileControlledEntry('contour', { kind: 'nominal', values: CONTOURS }),
  register: profileControlledEntry(
    'register',
    ordered(CANONICAL_REGISTER_ORDER),
    (settings, context) =>
      settings.controls.register === 'Varying'
        ? context.resolvedRegister
        : settings.controls.register,
  ),
  leapiness: freeEntry('leapiness', ordered(LEAPINESS_VALUES)),
  arpeggioChaos: freeEntry('arpeggioChaos', ordered(ARPEGGIO_CHAOS_VALUES)),
  musicalProfile: {
    scale: { kind: 'nominal', values: MUSICAL_PROFILES },
    from: (settings) => settings.musicalProfile.musicalProfile,
    apply: (settings, musicalProfile) => ({
      controls: settings.controls,
      musicalProfile: { musicalProfile, isCustom: true },
    }),
  },
})

/** Intent: the mutable settings in the order a draw lists them: catalog order, then the profile. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[req_settings_mutation_flag]]
export const MUTABLE_SETTINGS: readonly MutableSetting[] = deepFreeze([
  'tonalCenter',
  'collection',
  'harmonicMotion',
  'tension',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
  'leapiness',
  'arpeggioChaos',
  'musicalProfile',
])
