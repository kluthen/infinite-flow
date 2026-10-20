/**
 * The settings records: what is written for each saved setting, and how a load reads it back.
 * Each setting is its own record, so each loads, and fails to load, on its own. Every record
 * carries the data version of its own shape and the version of the app that wrote it: 1 for the
 * settings v3.0 already saved, 3 for the preset selection and the figure levels, introduced at
 * data version 3.
 *
 * Reading is tolerant, setting by setting, and this codec is the one place the app's "no silent
 * fallback" rule gives way: a saved value that is unknown, of the wrong type or out of range, a
 * damaged record, a setting saved twice, or a record written by a newer data version (which this
 * version must not misread) makes that one setting take its default, silently, while every other
 * saved setting keeps its value. Each value is checked by the validator the app itself uses for
 * that setting; an error those validators do not raise for a bad value is a defect and still
 * crashes. The decoded controls then go through the strict control builder once, so the app only
 * ever runs controls that builder accepts, and the saved preset selection is read against the
 * decoded values: when they no longer match the selected preset, the values win and the selection
 * loads as Custom.
 *
 * It also keeps a reader of v3.0's musical-profile selection record, at data version 1, for the
 * step that carries that record over to data version 3; the load itself never reads that record.
 *
 * Pure: no storage access. The caller reads the records and writes the ones this module encodes.
 */

import {
  validateBackingVolume,
  validateClickVolume,
  type AudioMix,
  type AudioMixDesign,
} from '@/audio/audio-mix'
import {
  ACCEPTED_INSTRUMENT_PROFILE_IDS,
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  GenerationControlError,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  makeGenerationControls,
  MUSICAL_PROFILES,
  normalizeTempo,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  validateControlValue,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { FIGURE_IDS, FIGURE_LEVEL_IDS, type FigureLevels } from '@/domain/figures/figure-levels'
import { allowsKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import {
  findPreset,
  PRESET_HELD_CONTROL_KEYS,
  type Preset,
  type PresetSelection,
} from '@/domain/presets/preset-selection'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { readEnvelope, type RecordVersions } from '@/storage/record-envelope'

import {
  defaultSettings,
  GENERATED_NOTES_FORMATS,
  THEME_PREFERENCES,
  type ReviewPreferences,
  type SavedSettings,
  type SessionOptionChoices,
} from './setting-defaults'

/**
 * The data version of the shape of every setting record v3.0 already saved; a higher one was
 * written by a newer app.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export const SETTINGS_DATA_VERSION = 1

/**
 * The data version of the preset selection's and the figure levels' records, the shape introduced
 * at data version 3; a higher one was written by a newer app.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[module_settings_upgrade_step]]
export const PRESET_SETTINGS_DATA_VERSION = 3

/** The key of v3.0's musical-profile selection record, read only to carry it over. */
// @spec-link [[module_settings_upgrade_step]]
export const V30_PROFILE_SELECTION_KEY = 'profileSelection'

/** My instrument's fixed id, re-exported for the settings records' readers. */
export { MY_INSTRUMENT_ID }

/** The settings stored as one record per field; the others are one record each. */
type SettingGroup = 'controls' | 'figureLevels' | 'mix' | 'sessionOptions' | 'review'

/**
 * The record key of each field of a group: `controls.tempo`, `figureLevels.passingTone`,
 * `mix.clickOn` and so on.
 */
type FieldKey<G extends SettingGroup> = `${G}.${keyof SavedSettings[G] & string}`

/** The key of one setting's record. There is one record per setting, and no other. */
// @spec-link [[rule_settings_saved_on_change]]
export type SettingKey =
  | FieldKey<'controls'>
  | FieldKey<'figureLevels'>
  | 'presetSelection'
  | 'theme'
  | FieldKey<'mix'>
  | FieldKey<'sessionOptions'>
  | FieldKey<'review'>
  | 'keepPlayedNotes'

/** The value a setting's record holds, by its key. */
// @spec-link [[rule_settings_saved_on_change]]
export type SettingValue<K extends SettingKey> = K extends `${infer G}.${infer F}`
  ? G extends SettingGroup
    ? F extends keyof SavedSettings[G]
      ? SavedSettings[G][F]
      : never
    : never
  : K extends keyof SavedSettings
    ? SavedSettings[K]
    : never

/** One saved setting: its key, its value and the versions it was written with. */
// @spec-link [[rule_settings_saved_on_change]]
export interface SettingRecord<K extends SettingKey = SettingKey> extends RecordVersions {
  readonly key: K
  readonly value: SettingValue<K>
}

/** What decoding needs besides the records. */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export interface SettingsDecodeContext {
  /** The audio mix's first-load levels and volume range, read from the design tokens. */
  readonly mixDesign: AudioMixDesign
  /** Whether my instrument itself loaded; a saved selection of it is kept only then. */
  readonly myInstrumentLoaded: boolean
  /** The presets the saved preset selection is judged against: the built-ins and the player's. */
  readonly presets: readonly Preset[]
}

/** What a value that cannot be read decodes to, before its setting takes its default. */
const UNREADABLE: unique symbol = Symbol('unreadable setting')
type Unreadable = typeof UNREADABLE

/** Reads one stored value as a setting's value, or finds it unreadable; never throws for it. */
type Parse<T> = (value: unknown, context: SettingsDecodeContext) => T | Unreadable

/** One parser per field of a group. */
type GroupParsers<T> = { readonly [F in keyof T]: Parse<T[F]> }

/**
 * Intent: run a strict validator and turn the one refusal it raises for a bad value into
 * "unreadable". Any other error is a defect, not a bad saved value, and is rethrown.
 */
function refusedAs<T>(
  validate: () => T,
  refusal: abstract new (message: string) => Error,
): T | Unreadable {
  try {
    return validate()
  } catch (error) {
    if (error instanceof refusal) return UNREADABLE
    throw error
  }
}

/** Intent: a parser accepting only a value of one control's closed catalog. */
function controlValue<T extends string>(catalog: readonly T[], name: string): Parse<T> {
  return (value) =>
    refusedAs(() => validateControlValue(catalog, value, name), GenerationControlError)
}

/** Intent: a parser accepting only a member of a closed catalog that has no domain validator. */
function oneOf<T extends string>(catalog: readonly T[]): Parse<T> {
  return (value) => (catalog.includes(value as T) ? (value as T) : UNREADABLE)
}

/** Intent: accept only a boolean, so an on/off choice is never guessed from another type. */
const readBoolean: Parse<boolean> = (value) => (typeof value === 'boolean' ? value : UNREADABLE)

/** Intent: accept only a tempo the tempo control offers: 60 to 240 BPM in steps of 10. */
const readTempo: Parse<number> = (value) =>
  refusedAs(() => normalizeTempo(value), GenerationControlError)

/**
 * Intent: accept a built-in instrument, or my instrument's fixed id (never its display name) only
 * while my instrument itself loads; a selection of an instrument that did not load falls back.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
const readInstrument: Parse<GenerationControls['instrumentProfileId']> = (value, context) => {
  if (value === MY_INSTRUMENT_ID && !context.myInstrumentLoaded) return UNREADABLE
  return controlValue(ACCEPTED_INSTRUMENT_PROFILE_IDS, 'Instrument profile')(value, context)
}

/**
 * Intent: a parser accepting only a number its volume validator, which refuses with a
 * RangeError, accepts in the design's range.
 */
function volume(validate: typeof validateClickVolume): Parse<number> {
  return (value, context) => {
    if (typeof value !== 'number') return UNREADABLE
    return refusedAs(() => {
      validate(value, context.mixDesign.range)
      return value
    }, RangeError)
  }
}

/** Intent: whether a value is a plain object, as a stored record or object value is. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Intent: whether a plain object has exactly the given fields, no more and no fewer. */
function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(record)
  return own.length === keys.length && keys.every((key) => Object.hasOwn(record, key))
}

/**
 * Intent: the tolerant twin of the generation worker's strict musical profile parser: the same
 * shape (exactly a known profile and a boolean "customized"), read as unreadable instead of
 * rejected. Only v3.0's record of it is read, to carry it over.
 */
function readProfileSelection(value: unknown): ProfileSelection | Unreadable {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['musicalProfile', 'isCustom'])) {
    return UNREADABLE
  }
  const { musicalProfile, isCustom } = value
  if (!MUSICAL_PROFILES.includes(musicalProfile as MusicalProfile)) return UNREADABLE
  if (typeof isCustom !== 'boolean') return UNREADABLE
  return { musicalProfile: musicalProfile as MusicalProfile, isCustom }
}

/** Intent: whether a value is a non-empty string, as a preset id is. */
function isPresetId(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

/**
 * Intent: read a saved preset selection: exactly a preset by its non-empty id, or exactly Custom
 * with a non-empty base id or none. Whether the id names a known preset is the load's to judge.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
const readPresetSelection: Parse<PresetSelection> = (value) => {
  if (!isPlainRecord(value)) return UNREADABLE
  if (value.kind === 'preset' && hasExactKeys(value, ['kind', 'presetId'])) {
    return isPresetId(value.presetId) ? { kind: 'preset', presetId: value.presetId } : UNREADABLE
  }
  if (value.kind === 'custom' && hasExactKeys(value, ['kind', 'baseId'])) {
    const { baseId } = value
    if (baseId === null || isPresetId(baseId)) return { kind: 'custom', baseId }
  }
  return UNREADABLE
}

/** Each control's parser, through the control catalog's own validators. */
const CONTROL_PARSERS: GroupParsers<GenerationControls> = {
  tempo: readTempo,
  tonalCenter: controlValue(PITCH_CLASSES, 'Written tonal center'),
  collection: controlValue(COLLECTIONS, 'Collection'),
  harmonicMotion: controlValue(HARMONIC_MOTIONS, 'Harmonic motion'),
  tension: controlValue(TENSION_ARCS, 'Tension arc'),
  noteDensity: controlValue(NOTE_DENSITIES, 'Note density'),
  rhythmicVariety: controlValue(RHYTHMIC_VARIETIES, 'Rhythmic variety'),
  syncopation: controlValue(SYNCOPATIONS, 'Syncopation'),
  silenceDensity: controlValue(SILENCE_DENSITIES, 'Silence density'),
  contour: controlValue(CONTOURS, 'Contour'),
  register: controlValue(REGISTER_CHOICES, 'Register'),
  leapiness: controlValue(LEAPINESS_VALUES, 'Leapiness'),
  arpeggioChaos: controlValue(ARPEGGIO_CHAOS_VALUES, 'Arpeggio chaos'),
  instrumentProfileId: readInstrument,
}

/** Each figure's level parser, in FIGURE_IDS order: one of the four known levels. */
const LEVEL_PARSERS: GroupParsers<FigureLevels> = Object.fromEntries(
  FIGURE_IDS.map((figure) => [figure, oneOf(FIGURE_LEVEL_IDS)]),
) as GroupParsers<FigureLevels>

/** Each audio mix control's parser: two switches and two volumes. */
const MIX_PARSERS: GroupParsers<AudioMix> = {
  clickOn: readBoolean,
  clickVolume: volume(validateClickVolume),
  backingOn: readBoolean,
  backingVolume: volume(validateBackingVolume),
}

/** Each "During a session" option's parser. */
const SESSION_OPTION_PARSERS: GroupParsers<SessionOptionChoices> = {
  varySettings: readBoolean,
  tensionAcrossPhrases: readBoolean,
  risingTempo: readBoolean,
}

/** Each review preference's parser. */
const REVIEW_PARSERS: GroupParsers<ReviewPreferences> = {
  format: oneOf(GENERATED_NOTES_FORMATS),
  backingTrack: readBoolean,
  playedNotesShown: readBoolean,
}

/** Intent: the record keys of one group's fields, in the group's parser order. */
function fieldKeys<G extends SettingGroup>(group: G, parsers: object): FieldKey<G>[] {
  return Object.keys(parsers).map((field) => `${group}.${field}` as FieldKey<G>)
}

/**
 * Every setting's record key, in a fixed order. The tempo a Rising-tempo session reached is not
 * among them: it belongs to that session.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
export const SETTING_KEYS: readonly SettingKey[] = deepFreeze([
  ...fieldKeys('controls', CONTROL_PARSERS),
  ...fieldKeys('figureLevels', LEVEL_PARSERS),
  'presetSelection',
  'theme',
  ...fieldKeys('mix', MIX_PARSERS),
  ...fieldKeys('sessionOptions', SESSION_OPTION_PARSERS),
  ...fieldKeys('review', REVIEW_PARSERS),
  'keepPlayedNotes',
] as const)

const SETTING_KEY_SET: ReadonlySet<string> = new Set(SETTING_KEYS)

const LEVEL_KEY_PREFIX = 'figureLevels.'

/**
 * Intent: the data version of one setting's record shape: 3 for the preset selection and each
 * figure level, introduced at data version 3; 1 for every setting v3.0 already saved.
 */
// @spec-link [[module_settings_upgrade_step]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function settingDataVersion(key: SettingKey): number {
  return key === 'presetSelection' || key.startsWith(LEVEL_KEY_PREFIX)
    ? PRESET_SETTINGS_DATA_VERSION
    : SETTINGS_DATA_VERSION
}

/**
 * Intent: the record of one setting, holding the value the player chose and the versions it is
 * written with. Throws on an empty app version: the record would be written unreadable.
 */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
export function encodeSettingRecord<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  appVersion: string,
): SettingRecord<K> {
  if (appVersion === '') throw new Error('settings record: the app version must not be empty')
  return { key, dataVersion: settingDataVersion(key), appVersion, value }
}

/** Intent: the value one setting holds in a full set, read by its record key. */
function settingValueAt<K extends SettingKey>(settings: SavedSettings, key: K): SettingValue<K> {
  const [name, field] = key.split('.') as [keyof SavedSettings, string | undefined]
  const top: unknown = settings[name]
  return (field === undefined ? top : (top as Record<string, unknown>)[field]) as SettingValue<K>
}

/** Intent: one record per setting for a full set of the player's chosen settings, in key order. */
// @spec-link [[rule_settings_saved_on_change]]
// @spec-link [[rule_saved_setting_is_players_choice]]
export function encodeSettings(settings: SavedSettings, appVersion: string): SettingRecord[] {
  return SETTING_KEYS.map((key) =>
    encodeSettingRecord(key, settingValueAt(settings, key), appVersion),
  )
}

/**
 * Intent: the stored records by setting key. A record that is not an object, or names no setting,
 * is no setting's record and is skipped; a setting with two records is unreadable, since which
 * one is the player's cannot be told.
 */
function indexRecords(
  records: readonly unknown[],
): Map<string, Record<string, unknown> | Unreadable> {
  const byKey = new Map<string, Record<string, unknown> | Unreadable>()
  for (const record of records) {
    if (!isPlainRecord(record) || typeof record.key !== 'string') continue
    if (!SETTING_KEY_SET.has(record.key)) continue
    byKey.set(record.key, byKey.has(record.key) ? UNREADABLE : record)
  }
  return byKey
}

const RECORD_FIELDS = ['key', 'dataVersion', 'appVersion', 'value'] as const

/**
 * Intent: the stored value of a well-formed record at its setting's own data version. A record
 * written by a newer data version is left unread, as this version cannot know what its value
 * means; a record with a missing, extra or ill-typed field, or an older data version than its
 * setting's shape, is damaged. Both are unreadable.
 */
function storedValue(record: Record<string, unknown>, dataVersion: number): unknown {
  if (!hasExactKeys(record, RECORD_FIELDS)) return UNREADABLE
  if (readEnvelope(record, dataVersion) !== 'current') return UNREADABLE
  return record.value
}

/**
 * Intent: v3.0's musical-profile selection from its stored record, for the step that carries it
 * over to data version 3: exactly the four record fields, its key, data version 1 and a readable
 * selection; null for anything else, a newer record included. Never throws for what was stored.
 */
// @spec-link [[module_settings_upgrade_step]]
// @spec-link [[rule_saved_profile_becomes_preset]]
export function decodeV30ProfileSelectionRecord(stored: unknown): ProfileSelection | null {
  if (!isPlainRecord(stored) || stored.key !== V30_PROFILE_SELECTION_KEY) return null
  const value = storedValue(stored, SETTINGS_DATA_VERSION)
  if (value === UNREADABLE) return null
  const selection = readProfileSelection(value)
  return selection === UNREADABLE ? null : selection
}

/** Reads one setting from the indexed records, its default when it cannot. */
type ReadSetting = <T>(key: SettingKey, parse: Parse<T>, fallback: T) => T

/** Intent: decode every field of one group, each on its own. */
function decodeGroup<G extends SettingGroup>(
  group: G,
  parsers: GroupParsers<SavedSettings[G]>,
  fallback: SavedSettings[G],
  read: ReadSetting,
): SavedSettings[G] {
  const fields = Object.keys(parsers) as (keyof SavedSettings[G] & string)[]
  const entries = fields.map((field) => [
    field,
    read(`${group}.${field}` as SettingKey, parsers[field], fallback[field]),
  ])
  return Object.fromEntries(entries) as SavedSettings[G]
}

/**
 * Intent: whether the loaded values still match a preset: its ten preset-held controls, its seven
 * levels, and the loaded written key and mode inside its restriction.
 */
function matchesPreset(preset: Preset, controls: GenerationControls, levels: FigureLevels) {
  return (
    PRESET_HELD_CONTROL_KEYS.every((key) => controls[key] === preset.controls[key]) &&
    FIGURE_IDS.every((figure) => levels[figure] === preset.levels[figure]) &&
    allowsKeyAndMode(preset.restriction, controls.tonalCenter, controls.collection)
  )
}

/**
 * Intent: the preset selection a load gives, judged against the loaded values: the values win. A
 * selected preset that no longer exists loads as Custom with no base; one whose values or
 * restriction the loaded values no longer match (a value fell back, a built-in was retuned, a
 * player preset changed in another tab) loads as Custom based on it. Custom keeps its base while
 * that preset exists, and has none otherwise. It never changes a control or a level, so loading
 * never moves the key or mode. Silent, like every fallback here.
 */
// @spec-link [[rule_preset_load_values_win]]
// @spec-link [[rule_saved_settings_load_tolerantly]]
function loadedPresetSelection(
  selection: PresetSelection,
  controls: GenerationControls,
  figureLevels: FigureLevels,
  presets: readonly Preset[],
): PresetSelection {
  if (selection.kind === 'custom') {
    if (selection.baseId === null || findPreset(presets, selection.baseId) !== undefined) {
      return selection
    }
    return { kind: 'custom', baseId: null }
  }
  const preset = findPreset(presets, selection.presetId)
  if (preset === undefined) return { kind: 'custom', baseId: null }
  return matchesPreset(preset, controls, figureLevels)
    ? selection
    : { kind: 'custom', baseId: preset.id }
}

/**
 * Intent: every saved setting from the stored records, each read on its own: a missing,
 * damaged, newer or invalid record gives that setting its default, silently, and never disturbs
 * another setting. Never throws for what was stored. The decoded controls are rebuilt by the
 * strict control builder, so what the app runs is still guarded by it, and the preset selection
 * is then judged against them and the decoded levels: a preset they no longer match loads Custom.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
// @spec-link [[rule_preset_load_values_win]]
export function decodeSettings(
  records: readonly unknown[],
  context: SettingsDecodeContext,
): SavedSettings {
  const byKey = indexRecords(records)
  const defaults = defaultSettings(context.mixDesign.defaults)
  /** Intent: one setting's stored value when its record is readable and valid, else its default. */
  const read: ReadSetting = (key, parse, fallback) => {
    const record = byKey.get(key)
    if (record === undefined || record === UNREADABLE) return fallback
    const stored = storedValue(record, settingDataVersion(key))
    const parsed = stored === UNREADABLE ? UNREADABLE : parse(stored, context)
    return parsed === UNREADABLE ? fallback : parsed
  }
  const controls = makeGenerationControls(
    decodeGroup('controls', CONTROL_PARSERS, defaults.controls, read),
  )
  const figureLevels = decodeGroup('figureLevels', LEVEL_PARSERS, defaults.figureLevels, read)
  return deepFreeze({
    controls,
    figureLevels,
    presetSelection: loadedPresetSelection(
      read('presetSelection', readPresetSelection, defaults.presetSelection),
      controls,
      figureLevels,
      context.presets,
    ),
    theme: read('theme', oneOf(THEME_PREFERENCES), defaults.theme),
    mix: decodeGroup('mix', MIX_PARSERS, defaults.mix, read),
    sessionOptions: decodeGroup(
      'sessionOptions',
      SESSION_OPTION_PARSERS,
      defaults.sessionOptions,
      read,
    ),
    review: decodeGroup('review', REVIEW_PARSERS, defaults.review, read),
    keepPlayedNotes: read('keepPlayedNotes', readBoolean, defaults.keepPlayedNotes),
  })
}
