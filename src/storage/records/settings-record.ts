/**
 * The settings records: what is written for each saved setting, and how a load reads it back.
 * Each setting is its own record, so each loads, and fails to load, on its own. Every record
 * carries the data version of its shape (1) and the version of the app that wrote it.
 *
 * Reading is tolerant, setting by setting, and this codec is the one place the app's "no silent
 * fallback" rule gives way: a saved value that is unknown, of the wrong type or out of range, a
 * damaged record, a setting saved twice, or a record written by a newer data version (which this
 * version must not misread) makes that one setting take its default, silently, while every other
 * saved setting keeps its value. Each value is checked by the validator the app itself uses for
 * that setting; an error those validators do not raise for a bad value is a defect and still
 * crashes. The decoded controls then go through the strict control builder once, so the app only
 * ever runs controls that builder accepts.
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
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  GenerationControlError,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
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

import {
  defaultSettings,
  GENERATED_NOTES_FORMATS,
  THEME_PREFERENCES,
  type ReviewPreferences,
  type SavedSettings,
  type SessionOptionChoices,
} from './setting-defaults'

/** The data version of the settings records' shape; a higher one was written by a newer app. */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export const SETTINGS_DATA_VERSION = 1

/**
 * The fixed id a saved instrument selection names my instrument by, never its display name. The
 * selection is kept only when my instrument itself loads.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
export const MY_INSTRUMENT_ID = 'my-instrument'

/** The settings stored as one record per field; the others are one record each. */
type SettingGroup = 'controls' | 'mix' | 'sessionOptions' | 'review'

/** The record key of each field of a group: `controls.tempo`, `mix.clickOn` and so on. */
type FieldKey<G extends SettingGroup> = `${G}.${keyof SavedSettings[G] & string}`

/** The key of one setting's record. There is one record per setting, and no other. */
// @spec-link [[rule_settings_saved_on_change]]
export type SettingKey =
  | FieldKey<'controls'>
  | 'profileSelection'
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

/**
 * The two fields every stored record carries, whatever it holds: the data version of its shape
 * and the version of the app that wrote it.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export interface RecordVersions {
  readonly dataVersion: number
  readonly appVersion: string
}

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
 * Intent: accept a built-in instrument, or my instrument's fixed id only while my instrument
 * itself loads; a selection of an instrument that did not load falls back.
 */
const readInstrument: Parse<GenerationControls['instrumentProfileId']> = (value, context) => {
  if (value === MY_INSTRUMENT_ID && !context.myInstrumentLoaded) return UNREADABLE
  return controlValue(INSTRUMENT_PROFILE_IDS, 'Instrument profile')(value, context)
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
 * rejected.
 */
const readProfileSelection: Parse<ProfileSelection> = (value) => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ['musicalProfile', 'isCustom'])) {
    return UNREADABLE
  }
  const { musicalProfile, isCustom } = value
  if (!MUSICAL_PROFILES.includes(musicalProfile as MusicalProfile)) return UNREADABLE
  if (typeof isCustom !== 'boolean') return UNREADABLE
  return { musicalProfile: musicalProfile as MusicalProfile, isCustom }
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
  'profileSelection',
  'theme',
  ...fieldKeys('mix', MIX_PARSERS),
  ...fieldKeys('sessionOptions', SESSION_OPTION_PARSERS),
  ...fieldKeys('review', REVIEW_PARSERS),
  'keepPlayedNotes',
] as const)

const SETTING_KEY_SET: ReadonlySet<string> = new Set(SETTING_KEYS)

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
  return { key, dataVersion: SETTINGS_DATA_VERSION, appVersion, value }
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
 * Intent: the stored value of a well-formed record of this data version. A record written by a
 * newer data version is left unread, as this version cannot know what its value means; a record
 * with a missing, extra or ill-typed field, or an older data version than any this app wrote, is
 * damaged. Both are unreadable.
 */
function storedValue(record: Record<string, unknown>): unknown {
  if (!hasExactKeys(record, RECORD_FIELDS)) return UNREADABLE
  const { dataVersion, appVersion } = record
  if (typeof dataVersion !== 'number' || !Number.isInteger(dataVersion)) return UNREADABLE
  if (dataVersion !== SETTINGS_DATA_VERSION) return UNREADABLE
  if (typeof appVersion !== 'string' || appVersion === '') return UNREADABLE
  return record.value
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
 * Intent: every saved setting from the stored records, each read on its own: a missing,
 * damaged, newer or invalid record gives that setting its default, silently, and never disturbs
 * another setting. Never throws for what was stored. The decoded controls are rebuilt by the
 * strict control builder, so what the app runs is still guarded by it.
 */
// @spec-link [[rule_saved_settings_load_tolerantly]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[rule_played_notes_kept_only_after_opt_in]]
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
    const stored = storedValue(record)
    const parsed = stored === UNREADABLE ? UNREADABLE : parse(stored, context)
    return parsed === UNREADABLE ? fallback : parsed
  }
  return deepFreeze({
    controls: makeGenerationControls(
      decodeGroup('controls', CONTROL_PARSERS, defaults.controls, read),
    ),
    profileSelection: read('profileSelection', readProfileSelection, defaults.profileSelection),
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
