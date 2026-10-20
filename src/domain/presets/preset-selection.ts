/**
 * The preset model's core: what a preset holds, the selection (a preset or Custom), choosing a
 * preset, when Custom begins, the restriction in force and what deleting does to the selection.
 * Pure data and functions over plain values: no storage, interface, clock or random source.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  CONTOURS,
  GenerationControlError,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  validateControlValue,
  type Collection,
  type GenerationControls,
  type PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import {
  FigureLevelsError,
  parseFigureLevels,
  type FigureId,
  type FigureLevels,
} from '../figures/figure-levels'
import {
  allowsKeyAndMode,
  KeyAndModeRestrictionError,
  makeKeyAndModeRestriction,
  type KeyAndModeRestriction,
  type RestrictionHalf,
} from './key-and-mode-restriction'

/** Intent: the ten controls every preset holds, in the order presets list them. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_preset_contents]]
export const PRESET_HELD_CONTROL_KEYS = deepFreeze([
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
] as const satisfies readonly (keyof GenerationControls)[])

/** Intent: one of the ten preset-held controls. */
// @spec-link [[rule_preset_contents]]
export type PresetHeldControlKey = (typeof PRESET_HELD_CONTROL_KEYS)[number]

/** Intent: the values of the ten preset-held controls. */
// @spec-link [[rule_preset_contents]]
export type PresetHeldControls = Pick<GenerationControls, PresetHeldControlKey>

/** Intent: a preset is the project's (built-in) or the player's own. */
// @spec-link [[module_preset_model]]
export type PresetKind = 'builtIn' | 'player'

/** Intent: a preset's fixed identifier, never derived from its name. */
// @spec-link [[module_preset_model]]
export type PresetId = string

/**
 * A preset: an id, a name, the ten preset-held controls, the seven figure levels, a key and mode
 * restriction, and its kind. Never a tempo, an instrument, a key or mode value or a session option.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_preset_contents]]
export interface Preset {
  readonly id: PresetId
  readonly name: string
  readonly controls: PresetHeldControls
  readonly levels: FigureLevels
  readonly restriction: KeyAndModeRestriction
  readonly kind: PresetKind
}

/** A preset value that breaks the model: a bad field, or an act the model never allows. */
// @spec-link [[module_preset_model]]
export class PresetModelError extends Error {
  readonly kind = 'PresetModelError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PresetModelError'
  }
}

const PRESET_KINDS: readonly PresetKind[] = deepFreeze(['builtIn', 'player'])

/** Each preset-held control's catalog and its name in a refusal. */
const HELD_CONTROL_CATALOGS: {
  readonly [K in PresetHeldControlKey]: {
    readonly values: readonly PresetHeldControls[K][]
    readonly name: string
  }
} = deepFreeze({
  harmonicMotion: { values: HARMONIC_MOTIONS, name: 'Harmonic motion' },
  tension: { values: TENSION_ARCS, name: 'Tension arc' },
  noteDensity: { values: NOTE_DENSITIES, name: 'Note density' },
  rhythmicVariety: { values: RHYTHMIC_VARIETIES, name: 'Rhythmic variety' },
  syncopation: { values: SYNCOPATIONS, name: 'Syncopation' },
  silenceDensity: { values: SILENCE_DENSITIES, name: 'Silence density' },
  contour: { values: CONTOURS, name: 'Contour' },
  register: { values: REGISTER_CHOICES, name: 'Register' },
  leapiness: { values: LEAPINESS_VALUES, name: 'Leapiness' },
  arpeggioChaos: { values: ARPEGGIO_CHAOS_VALUES, name: 'Arpeggio chaos' },
})

/**
 * Intent: run one field's validation, turning its own refusal into a PresetModelError naming the
 * field; any other error is not a refusal and goes through unchanged.
 */
function readField<T>(field: string, read: () => T): T {
  try {
    return read()
  } catch (error) {
    const refused =
      error instanceof GenerationControlError ||
      error instanceof FigureLevelsError ||
      error instanceof KeyAndModeRestrictionError
    if (!refused) throw error
    throw new PresetModelError(`A preset's ${field} is refused: ${error.message}`)
  }
}

/** Intent: whether a value is a plain, non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Intent: read one preset-held control's value against its catalog. */
function readHeldControl(controls: Record<string, unknown>, key: PresetHeldControlKey): string {
  const { values, name } = HELD_CONTROL_CATALOGS[key]
  return readField('controls', () => validateControlValue<string>(values, controls[key], name))
}

/** Intent: read the ten preset-held controls, in order, dropping every other key. */
function readHeldControls(value: unknown): PresetHeldControls {
  if (!isPlainObject(value)) throw new PresetModelError("A preset's controls must be an object.")
  return Object.fromEntries(
    PRESET_HELD_CONTROL_KEYS.map((key) => [key, readHeldControl(value, key)]),
  ) as unknown as PresetHeldControls
}

/** Intent: read a non-empty string field of a preset. */
function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PresetModelError(`A preset's ${field} must be a non-empty string.`)
  }
  return value
}

/**
 * Intent: build a preset from its six fields: every control checked against its catalog, the
 * levels and the restriction parsed, id and name non-empty strings, the kind known. A refusal
 * throws a PresetModelError; nothing is defaulted. Returns a fresh deep-frozen preset holding
 * exactly those six fields, no other key carried over.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_preset_contents]]
export function makePreset(input: Preset): Preset {
  if (!isPlainObject(input)) throw new PresetModelError('A preset must be a plain object.')
  const kind = PRESET_KINDS.find((candidate) => candidate === input.kind)
  if (kind === undefined) {
    throw new PresetModelError(`A preset's kind ${JSON.stringify(input.kind)} is unknown.`)
  }
  return deepFreeze({
    id: readText(input.id, 'id'),
    name: readText(input.name, 'name'),
    controls: readHeldControls(input.controls),
    levels: readField('levels', () => parseFigureLevels(input.levels)),
    restriction: readField('restriction', () => makeKeyAndModeRestriction(input.restriction)),
    kind,
  })
}

/** The selection: a preset by its id, or Custom naming the preset it is based on, or none. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_custom_selection]]
export type PresetSelection =
  | { readonly kind: 'preset'; readonly presetId: PresetId }
  | { readonly kind: 'custom'; readonly baseId: PresetId | null }

/** The player's current settings: the written key is `tonalCenter`, the mode `collection`. */
// @spec-link [[module_preset_model]]
export interface PresetSettings {
  readonly controls: GenerationControls
  readonly levels: FigureLevels
}

/** Intent: the preset with an id, or undefined when none has it. */
// @spec-link [[module_preset_model]]
export function findPreset(presets: readonly Preset[], id: PresetId): Preset | undefined {
  return presets.find((preset) => preset.id === id)
}

/** Intent: the current value kept when the half allows it, otherwise the half's first entry. */
function keptOrFirst<T>(half: RestrictionHalf<T>, current: T): T {
  return half === 'any' || half.includes(current) ? current : half[0]
}

/**
 * Intent: choose a preset. The ten preset-held controls and the seven levels take its values;
 * each half of its restriction separately keeps the current written key (collection) when it
 * allows it, otherwise sets the half's first entry; the tempo and the instrument never change,
 * and the selection becomes that preset. Choosing the preset already selected, outside Custom,
 * returns the same settings and selection, untouched (never frozen, so a caller's own state stays
 * its own); from Custom, choosing its base applies it.
 */
// @spec-link [[rule_choosing_preset_sets_its_settings]]
// @spec-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
export function choosePreset(
  settings: PresetSettings,
  selection: PresetSelection,
  preset: Preset,
): { readonly settings: PresetSettings; readonly selection: PresetSelection } {
  if (selection.kind === 'preset' && selection.presetId === preset.id) {
    return { settings, selection }
  }
  const { controls } = settings
  return deepFreeze({
    settings: {
      controls: {
        ...controls,
        ...preset.controls,
        tonalCenter: keptOrFirst(preset.restriction.keys, controls.tonalCenter),
        collection: keptOrFirst(preset.restriction.modes, controls.collection),
      },
      levels: preset.levels,
    },
    selection: { kind: 'preset', presetId: preset.id },
  })
}

/** One change the player made to a setting, as the selection needs to know it. */
// @spec-link [[rule_custom_selection]]
export type SettingChange =
  | { readonly kind: 'presetHeldControl'; readonly control: PresetHeldControlKey }
  | { readonly kind: 'figureLevel'; readonly figure: FigureId }
  /** The written key and collection after the change. */
  | { readonly kind: 'keyOrMode'; readonly key: PitchClass; readonly mode: Collection }
  /** Tempo, instrument, theme, audio mix or a session option. */
  | { readonly kind: 'notPresetHeld' }

/**
 * Intent: the selection after a change of setting, never comparing values. Custom stays Custom
 * with the same base. With a preset selected, a preset-held control or figure level makes Custom
 * based on it, and so does a key and mode outside its restriction; a key and mode inside it, or a
 * setting no preset holds, change nothing. A selected id no preset has puts no restriction in
 * force, so a key or mode leaves it as it is.
 */
// @spec-link [[rule_custom_selection]]
// @spec-link [[rule_restriction_in_force]]
// @spec-link [[rule_profile_control_customization]]
export function selectionAfterChange(
  selection: PresetSelection,
  change: SettingChange,
  presets: readonly Preset[],
): PresetSelection {
  if (selection.kind === 'custom') return selection
  const custom: PresetSelection = deepFreeze({ kind: 'custom', baseId: selection.presetId })
  switch (change.kind) {
    case 'presetHeldControl':
    case 'figureLevel':
      return custom
    case 'keyOrMode': {
      const selected = findPreset(presets, selection.presetId)
      const outside =
        selected !== undefined && !allowsKeyAndMode(selected.restriction, change.key, change.mode)
      return outside ? custom : selection
    }
    case 'notPresetHeld':
      return selection
  }
}

/**
 * Intent: the restriction in force, worked out and never stored: the selected preset's, or in
 * Custom its base's, while the written key and the collection are both inside it; otherwise null.
 * Custom with no base, or an id no preset has, has none.
 */
// @spec-link [[rule_restriction_in_force]]
export function restrictionInForce(
  selection: PresetSelection,
  key: PitchClass,
  mode: Collection,
  presets: readonly Preset[],
): KeyAndModeRestriction | null {
  const id = selection.kind === 'preset' ? selection.presetId : selection.baseId
  const preset = id === null ? undefined : findPreset(presets, id)
  if (preset === undefined) return null
  return allowsKeyAndMode(preset.restriction, key, mode) ? preset.restriction : null
}

/**
 * Intent: the selection after a preset is deleted: Custom with no base when it was the selected
 * preset or Custom's base, otherwise the same selection. Settings are never touched by deleting.
 */
// @spec-link [[rule_deleting_base_preset_leaves_custom]]
export function selectionAfterDeleting(
  selection: PresetSelection,
  deletedId: PresetId,
): PresetSelection {
  const id = selection.kind === 'preset' ? selection.presetId : selection.baseId
  if (id !== deletedId) return selection
  return deepFreeze({ kind: 'custom', baseId: null })
}
