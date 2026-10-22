/**
 * The settings-mutation scale table: for every setting a mutation may change, the scale saying
 * which values are one grade away from the current one, where a step starts from, and how a step
 * is applied to the session settings, the selection after it included. The seven figure levels
 * share one entry, whose step moves one figure one level. The scales are data, so a new value for
 * a setting (a future `Custom` note density, D175) is an edit of its catalog or entry here, not
 * new code.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  makeGenerationControls,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
} from '../domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '../domain/controls/generated-note-density'
import { deepFreeze } from '../domain/events/deep-freeze'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  type FigureId,
  type FigureLevel,
} from '../domain/figures/figure-levels'
import { BUILT_IN_PRESETS } from '../domain/presets/built-in-presets'
import { selectionAfterChange, type PresetHeldControlKey } from '../domain/presets/preset-selection'
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

/** Every generation control a mutation may step: all of them but tempo and the instrument. */
// @spec-link [[module_settings_mutation]]
// @spec-link [[req_settings_mutation_flag]]
export type MutableControl = Exclude<keyof GenerationControls, 'tempo' | 'instrumentProfileId'>

/**
 * Every setting a mutation may change: each mutable control, and the seven figure levels as one
 * setting, in the place the musical profile had.
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_vary_settings_figure_step]]
export type MutableSetting = MutableControl | 'figureLevels'

/**
 * Vary settings' six groups, each switched on or off as a whole: Key and mode, Harmony, Tension,
 * Rhythm, Melody shape and Figures.
 */
// @spec-link [[rule_vary_settings_allowed_groups]]
export type VarySettingsGroup =
  'keyAndMode' | 'harmony' | 'tension' | 'rhythm' | 'melodyShape' | 'figures'

/** Vary settings' six groups, in the order the spec lists them. */
// @spec-link [[rule_vary_settings_allowed_groups]]
export const VARY_SETTINGS_GROUPS: readonly VarySettingsGroup[] = deepFreeze([
  'keyAndMode',
  'harmony',
  'tension',
  'rhythm',
  'melodyShape',
  'figures',
])

/** Which of Vary settings' six groups are on; a missing group is a type error. */
// @spec-link [[rule_vary_settings_allowed_groups]]
export type AllowedGroups = Readonly<Record<VarySettingsGroup, boolean>>

/** Intent: all six groups on, the default: Vary settings as before the groups existed. */
// @spec-link [[rule_vary_settings_allowed_groups]]
export const ALL_GROUPS_ALLOWED: AllowedGroups = deepFreeze({
  keyAndMode: true,
  harmony: true,
  tension: true,
  rhythm: true,
  melodyShape: true,
  figures: true,
})

/** The value type of one mutable setting: a control's value, or one figure's level. */
// @spec-link [[module_settings_mutation]]
export type MutableValue<K extends MutableSetting> = K extends keyof GenerationControls
  ? GenerationControls[K]
  : FigureLevel

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

/** One control's scale, the value a step starts from, and how a step is applied. */
// @spec-link [[module_settings_mutation]]
export interface MutationScaleEntry<T extends string> {
  readonly scale: MutationScale<T>
  readonly from: (settings: SessionSettings, context: MutationContext) => T
  readonly apply: (settings: SessionSettings, value: T) => SessionSettings
}

/**
 * The figure levels' one entry: the levels' scale, the figures a step may move in the order a
 * draw lists them, the level a figure's step starts from, and how setting one figure's level is
 * applied.
 */
// @spec-link [[module_settings_mutation]]
// @spec-link [[rule_vary_settings_figure_step]]
export interface FigureStepEntry {
  readonly scale: MutationScale<FigureLevel>
  readonly figures: readonly FigureId[]
  readonly from: (settings: SessionSettings, figure: FigureId) => FigureLevel
  readonly apply: (
    settings: SessionSettings,
    figure: FigureId,
    level: FigureLevel,
  ) => SessionSettings
}

/** One entry per mutable control; a missing or extra control is a type error. */
// @spec-link [[module_settings_mutation]]
export type ControlScaleTable = {
  readonly [K in MutableControl]: MutationScaleEntry<GenerationControls[K]>
}

/** One entry per mutable setting, the figure levels' one included; a missing one is a type error. */
// @spec-link [[module_settings_mutation]]
export type MutationScaleTable = ControlScaleTable & { readonly figureLevels: FigureStepEntry }

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

/** Intent: the settings with one control stepped to a value, the controls validated again. */
function withControl<K extends MutableControl>(
  settings: SessionSettings,
  key: K,
  value: GenerationControls[K],
): GenerationControls {
  return makeGenerationControls({ ...settings.controls, [key]: value })
}

/**
 * Intent: an entry for the written key or the collection: a step changes the control and keeps
 * the selection as it is, so a key or mode move never marks Custom.
 */
function keyOrModeEntry<K extends 'tonalCenter' | 'collection'>(
  key: K,
  scale: MutationScale<GenerationControls[K]>,
): MutationScaleEntry<GenerationControls[K]> {
  return {
    scale,
    from: (settings) => settings.controls[key],
    apply: (settings, value) => ({ ...settings, controls: withControl(settings, key, value) }),
  }
}

/**
 * Intent: an entry for one of the ten preset-held controls: a step changes the control and makes
 * the selection Custom based on the selected preset; Custom stays Custom with its base.
 */
// @spec-link [[rule_vary_settings_marks_custom]]
// @spec-link [[rule_mutation_marks_profile_customized]]
function presetHeldEntry<K extends PresetHeldControlKey>(
  key: K,
  scale: MutationScale<GenerationControls[K]>,
  from: (settings: SessionSettings, context: MutationContext) => GenerationControls[K] = (
    settings,
  ) => settings.controls[key],
): MutationScaleEntry<GenerationControls[K]> {
  return {
    scale,
    from,
    apply: (settings, value) => ({
      ...settings,
      controls: withControl(settings, key, value),
      selection: selectionAfterChange(
        settings.selection,
        { kind: 'presetHeldControl', control: key },
        BUILT_IN_PRESETS,
      ),
    }),
  }
}

/**
 * Intent: the figure levels' one entry: one figure's level steps one level on the ordered scale
 * Off, As today, Favored, Strongly favored, never past either end; every other level stays, and
 * the step makes the selection Custom based on the selected preset, as a preset-held control's
 * does. The figures are listed in FIGURE_IDS order.
 */
// @spec-link [[rule_vary_settings_figure_step]]
// @spec-link [[rule_vary_settings_marks_custom]]
function figureStepEntry(): FigureStepEntry {
  return {
    scale: ordered(FIGURE_LEVEL_IDS),
    figures: FIGURE_IDS,
    from: (settings, figure) => settings.figureLevels[figure],
    apply: (settings, figure, level) => ({
      ...settings,
      figureLevels: { ...settings.figureLevels, [figure]: level },
      selection: selectionAfterChange(
        settings.selection,
        { kind: 'figureLevel', figure },
        BUILT_IN_PRESETS,
      ),
    }),
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
 * holds no `Varying`, so a step always lands on a concrete register. A step of any of the ten
 * preset-held controls (Tension, Leapiness and Arpeggio chaos among them) marks the selection
 * Custom; a key or mode step never does. The seven figure levels hold one entry, in the place the
 * musical profile had: a step moves one figure one level.
 */
// @spec-link [[rule_mutation_setting_scales]]
// @spec-link [[rule_vary_settings_figure_step]]
// @spec-link [[rule_vary_settings_marks_custom]]
// @spec-link [[rule_density_mutation_steps_from_generated_density]]
// @spec-link [[module_settings_mutation]]
export const MUTATION_SCALES: MutationScaleTable = deepFreeze({
  tonalCenter: keyOrModeEntry('tonalCenter', {
    kind: 'circular',
    values: PITCH_CLASSES,
    step: CIRCLE_OF_FIFTHS_STEP,
  }),
  collection: keyOrModeEntry('collection', {
    kind: 'separate',
    groups: [['Major', 'Minor'], MODES_BY_BRIGHTNESS],
  }),
  harmonicMotion: presetHeldEntry('harmonicMotion', ordered(HARMONIC_MOTIONS)),
  tension: presetHeldEntry('tension', ordered(TENSION_ARCS)),
  noteDensity: presetHeldEntry('noteDensity', ordered(NOTE_DENSITIES), (settings, context) =>
    resolveGeneratedNoteDensity(settings.controls.noteDensity, context),
  ),
  rhythmicVariety: presetHeldEntry('rhythmicVariety', ordered(RHYTHMIC_VARIETIES)),
  syncopation: presetHeldEntry('syncopation', ordered(SYNCOPATIONS)),
  silenceDensity: presetHeldEntry('silenceDensity', ordered(SILENCE_DENSITIES)),
  contour: presetHeldEntry('contour', { kind: 'nominal', values: CONTOURS }),
  register: presetHeldEntry('register', ordered(CANONICAL_REGISTER_ORDER), (settings, context) =>
    settings.controls.register === 'Varying'
      ? context.resolvedRegister
      : settings.controls.register,
  ),
  leapiness: presetHeldEntry('leapiness', ordered(LEAPINESS_VALUES)),
  arpeggioChaos: presetHeldEntry('arpeggioChaos', ordered(ARPEGGIO_CHAOS_VALUES)),
  figureLevels: figureStepEntry(),
})

/**
 * Intent: the mutable settings in the order a draw lists them: catalog order, then the figure
 * levels, in the musical profile's former place, so the draw keeps its 13 places.
 */
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
  'figureLevels',
])

/**
 * The group each mutable setting belongs to: Key and mode (the written tonal center and the
 * collection), Harmony (harmonic motion), Tension (tension arc), Rhythm (note density, rhythmic
 * variety, syncopation and silence density), Melody shape (contour, register, leapiness and
 * arpeggio chaos) and Figures (the figure levels' entry). A missing setting is a type error.
 */
// @spec-link [[rule_vary_settings_allowed_groups]]
// @spec-link [[module_settings_mutation]]
export const MUTABLE_SETTING_GROUPS: Readonly<Record<MutableSetting, VarySettingsGroup>> =
  deepFreeze({
    tonalCenter: 'keyAndMode',
    collection: 'keyAndMode',
    harmonicMotion: 'harmony',
    tension: 'tension',
    noteDensity: 'rhythm',
    rhythmicVariety: 'rhythm',
    syncopation: 'rhythm',
    silenceDensity: 'rhythm',
    contour: 'melodyShape',
    register: 'melodyShape',
    leapiness: 'melodyShape',
    arpeggioChaos: 'melodyShape',
    figureLevels: 'figures',
  })

/**
 * Intent: whether Vary settings may move a group's settings under these settings: its switch is
 * on, and the Rhythm group counts as not allowed while the rhythm lock is on.
 */
// @spec-link [[rule_vary_settings_allowed_groups]]
export function isGroupAllowed(
  group: VarySettingsGroup,
  settings: Pick<SessionSettings, 'allowedGroups' | 'rhythmLockOn'>,
): boolean {
  if (group === 'rhythm' && settings.rhythmLockOn) return false
  return settings.allowedGroups[group]
}
