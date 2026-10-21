/**
 * The preset bar model: everything the preset box and its description line show, worked out from
 * the presets the session knows (the eight built-ins, then the player's) and a selection, in one
 * pure place, so the box and the control summary name the selection the same way. It holds no
 * selection, reads no storage, renders nothing and announces nothing.
 */
import { presetLabel } from '@/domain/controls/preset-label'
import { isBuiltInPresetId, type BuiltInPresetId } from '@/domain/presets/built-in-presets'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  isAnyKeyAndMode,
  restrictionInWords,
  type KeyAndModeRestriction,
  type RestrictionLabels,
} from '@/domain/presets/key-and-mode-restriction'
import {
  findPreset,
  type Preset,
  type PresetId,
  type PresetSelection,
} from '@/domain/presets/preset-selection'
import { collectionOptions, tonalCenterOptions } from './control-options'

/**
 * The part of a session's start settings the preset bar reads: the selection the session started
 * with and the restriction frozen at its start, if any. A session's `SessionSettings` is one.
 */
// @spec-link [[module_preset_bar_model]]
export interface SessionStartSettings {
  readonly selection: PresetSelection
  readonly restriction?: KeyAndModeRestriction
}

/** One of the four preset actions of `preset-actions`, which the button pressed asks for. */
// @spec-link [[module_preset_bar_model]]
export type PresetActionKind = 'save-as-new' | 'save-changes' | 'rename' | 'delete'

/**
 * The buttons `preset-actions` holds besides `Save as new preset`, always there: whether it offers
 * `Save changes`, `Rename preset` and `Delete preset`, and whether 50 or more player presets are
 * kept, which disables `Save as new preset` and shows its note.
 */
// @spec-link [[module_preset_bar_model]]
export interface PresetActionsRow {
  readonly saveChanges: boolean
  readonly rename: boolean
  readonly delete: boolean
  readonly limitReached: boolean
}

/** One option of the box: a preset, valued by its id and labelled by its name. */
// @spec-link [[module_preset_bar_model]]
export interface PresetBarOption {
  readonly value: PresetId
  readonly label: string
}

/** One `optgroup` of the box. */
// @spec-link [[module_preset_bar_model]]
export interface PresetBarGroup {
  readonly label: 'Practice' | 'Styles' | 'Your presets'
  readonly options: readonly PresetBarOption[]
}

/** The built-ins of each built-in group, by fixed id, in the order the box lists them. */
const BUILT_IN_GROUPS: readonly {
  readonly label: 'Practice' | 'Styles'
  readonly ids: readonly BuiltInPresetId[]
}[] = deepFreeze([
  { label: 'Practice', ids: ['neutral', 'gentle', 'speed-drill'] },
  { label: 'Styles', ids: ['jazz', 'bebop', 'pop-song', 'reel', 'modal-dorian'] },
])

/** Each built-in's own description sentence, by fixed id. */
const BUILT_IN_DESCRIPTIONS: Readonly<Record<BuiltInPresetId, string>> = deepFreeze({
  neutral: "Plain lines in the key, in quarter notes: the app's starting point.",
  gentle:
    'One chord, quarter notes, steps only, nothing tense. A warm-up, or a first try at improvising.',
  'speed-drill':
    'Dense, changing rhythms with most embellishments favored, to read fast in any key.',
  jazz: 'Eighth notes and offbeats, now and then with a short note from outside the key.',
  bebop:
    'Fast jazz lines that circle chord notes from outside the key. It uses Major rather than Ionian: the same notes, with chords that lead home through the chord on the 5th note.',
  'pop-song':
    'Song-like phrases over familiar chords. It uses Major rather than Ionian: the same notes, with chords that lead home the way songs do.',
  reel: 'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).',
  'modal-dorian': 'A steady two-chord bed in Dorian, so its color note is heard in the melody.',
})

const NO_BASE_DESCRIPTION = 'Your own settings. Save them as a preset to keep them under a name.'

/** Intent: a preset as the box's option. */
function optionOf(preset: Preset): PresetBarOption {
  return { value: preset.id, label: preset.name }
}

/** Intent: the built-in with a fixed id among `presets`; one missing is a defect and throws. */
function requireBuiltIn(presets: readonly Preset[], id: BuiltInPresetId): Preset {
  const preset = findPreset(presets, id)
  if (preset === undefined) throw new Error(`preset bar: no built-in preset has the id "${id}"`)
  return preset
}

/**
 * Intent: the player presets in the box's Your presets order: alphabetical ignoring case, duplicate
 * names kept in their given order (a stable sort), every built-in left out. Your data lists them so.
 */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_player_preset_names]]
export function playerPresetsInBoxOrder(presets: readonly Preset[]): readonly Preset[] {
  return presets
    .filter((preset) => preset.kind === 'player')
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'accent' }))
}

/**
 * Intent: the box's groups in order: Practice and Styles, their built-ins placed by fixed id,
 * never by name; then Your presets, every player preset alphabetical ignoring case, duplicate
 * names kept in their given order (a stable sort), the group absent while there are none.
 */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_player_preset_names]]
// @spec-link [[req_presets]]
export function presetBarGroups(presets: readonly Preset[]): readonly PresetBarGroup[] {
  const builtIns: PresetBarGroup[] = BUILT_IN_GROUPS.map(({ label, ids }) => ({
    label,
    options: ids.map((id) => optionOf(requireBuiltIn(presets, id))),
  }))
  const players = playerPresetsInBoxOrder(presets)
  const groups =
    players.length === 0
      ? builtIns
      : [...builtIns, { label: 'Your presets' as const, options: players.map(optionOf) }]
  return deepFreeze(groups)
}

/**
 * Intent: the Custom option's label, only in Custom: the preset label, "Custom, based on {name}"
 * or "Custom" alone with no base or a base no preset has; null outside Custom.
 */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_custom_names_its_base]]
// @spec-link [[rule_custom_selection]]
export function presetBarCustomOption(
  selection: PresetSelection,
  presets: readonly Preset[],
): string | null {
  return selection.kind === 'custom' ? presetLabel(selection, presets) : null
}

/** Intent: the box's full text, for its `title`: the Custom label, or the selected preset's name. */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_custom_names_its_base]]
export function presetBarFullText(selection: PresetSelection, presets: readonly Preset[]): string {
  return presetLabel(selection, presets)
}

/**
 * The controls' own written-key and mode labels, which the restriction in words uses here and in
 * the preset sheet.
 */
// @spec-link [[module_preset_bar_model]]
export const RESTRICTION_LABELS: RestrictionLabels = {
  key: (key) => labelOf(tonalCenterOptions(), key),
  mode: (mode) => labelOf(collectionOptions(), mode),
}

/** Intent: the label of one option by its value; a value no option has is a defect and throws. */
function labelOf(options: readonly { value: string; label: string }[], value: string): string {
  const found = options.find((option) => option.value === value)
  if (found === undefined) throw new Error(`preset bar: no option has the value "${value}"`)
  return found.label
}

/** Intent: a player preset's description: "Your preset.", then what its restriction is meant for. */
function playerDescription(preset: Preset): string {
  if (isAnyKeyAndMode(preset.restriction)) return 'Your preset.'
  const meantFor = restrictionInWords(preset.restriction, RESTRICTION_LABELS, { only: false })
  return `Your preset. Meant for ${meantFor}.`
}

/** Intent: Custom's description, by its base: a built-in, a player preset, or none found. */
function customDescription(baseId: PresetId | null, presets: readonly Preset[]): string {
  const base = baseId === null ? undefined : findPreset(presets, baseId)
  if (base === undefined) return NO_BASE_DESCRIPTION
  const keep = `Changed from ${base.name}. Save as a new preset to keep these settings under a name`
  return base.kind === 'player' ? `${keep}, or save the changes into ${base.name}.` : `${keep}.`
}

/**
 * Intent: the description line's text for a selection: a built-in's own sentence by its id; a
 * player preset's "Your preset." and, unless its restriction is any, what it is meant for;
 * Custom's by its base. During a session the caller passes the start settings' selection, so the
 * line keeps its text. A selected id no preset has is a defect and throws.
 */
// @spec-link [[module_preset_bar_model]]
// @spec-link [[rule_custom_names_its_base]]
export function presetDescription(selection: PresetSelection, presets: readonly Preset[]): string {
  if (selection.kind === 'custom') return customDescription(selection.baseId, presets)
  const preset = findPreset(presets, selection.presetId)
  if (preset === undefined)
    throw new Error(`preset bar: no preset has the selected id "${selection.presetId}"`)
  if (preset.kind === 'player') return playerDescription(preset)
  if (!isBuiltInPresetId(preset.id))
    throw new Error(`preset bar: the built-in preset "${preset.id}" has no description`)
  return BUILT_IN_DESCRIPTIONS[preset.id]
}
