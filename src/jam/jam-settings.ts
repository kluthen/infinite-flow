/**
 * Jam's own settings (master spec C5.16, C10.2): the small set a Jam is shaped with, apart from
 * session mode's. Its written key and collection, its tempo (60 to 180 BPM in steps of 10),
 * harmonic motion, tension, one Embellishments level for all seven figures, its own Seventh chords
 * level (never session mode's), its drift, its rhythm lock and the lock's allowed rhythm changes.
 * The instrument is shared and stays session mode's;
 * arpeggio chaos is held at Varied and the rhythm and shape controls come from the doodle, so none
 * of them is a Jam setting.
 *
 * Each setting is one record of the `jam` group in the settings store (its keys are listed by
 * src/storage/records/settings-record.ts, which stores their values as given). The load hands the
 * records on undecoded, and they are decoded here, each on its own, when Jam's settings are first
 * needed: a missing, damaged, newer or invalid record gives that setting its first value and
 * touches no other. The first values of the key, the mode and the tempo come from session mode's
 * current values (the tempo kept inside 60 to 180 BPM) and are saved as Jam mode first shows, so a
 * later visit finds the same ones; made earlier for a Jam session's Review, they save none until
 * then. A change is saved at once through the visit's saver, one record per setting it
 * changed; a visit that saves nothing keeps them in memory, as its saver writes nothing. Saving a
 * Jam setting never writes a session-mode record. Part of Jam's code (src/jam/), loaded on demand.
 */
import { shallowRef, type ShallowRef } from 'vue'

import { CHORD_FAMILY_LEVEL_IDS, type ChordFamilyLevel } from '@/domain/chords/chord-families'
import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  makeGenerationControls,
  PITCH_CLASSES,
  TENSION_ARCS,
  type Collection,
  type GenerationControls,
  type HarmonicMotion,
  type PitchClass,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { readEnvelope } from '@/storage/record-envelope'
import {
  JAM_SETTING_FIELDS,
  SETTINGS_DATA_VERSION,
  type JamSettingField,
  type JamSettingKey,
  type JamSettingStoredValue,
} from '@/storage/records/settings-record'
import type { SaveSettings, SettingChanges } from '@/storage/settings-saver'

import { JAM_DRIFTS, type JamDrift } from './steering-block-builder'

/** The tempos Jam's control offers: 60 to 180 BPM in steps of 10. */
// @spec-link [[rule_jam_tempo_range]]
export const JAM_TEMPO_VALUES: readonly number[] = deepFreeze(
  Array.from({ length: 13 }, (_, index) => 60 + index * 10),
)

/** Jam's own settings, one value each. */
// @spec-link [[req_jam_settings]]
// @spec-link [[module_jam_settings]]
// @spec-link [[rule_jam_has_own_seventh_chords_level]]
export interface JamSettings {
  /** Jam's tempo, one of JAM_TEMPO_VALUES. */
  readonly tempo: number
  /** Jam's written key. */
  readonly tonalCenter: PitchClass
  /** Jam's collection: the mode. */
  readonly collection: Collection
  readonly harmonicMotion: HarmonicMotion
  readonly tension: TensionArc
  /** The one Embellishments level, given to all seven figures alike. */
  readonly embellishments: FigureLevel
  readonly drift: JamDrift
  readonly rhythmLockOn: boolean
  /** The rhythm changes the lock allows, in RHYTHM_CHANGE_KINDS order; kept while it is off. */
  readonly allowedRhythmChanges: readonly RhythmChangeKind[]
  /**
   * Jam's own Seventh chords level, held by its chord family's capability name; Jam's alone,
   * never session mode's level.
   */
  readonly 'seventh-chords': ChordFamilyLevel
}

/** Session mode's current values Jam's key, mode and tempo start from. */
// @spec-link [[rule_jam_settings_first_values]]
export type SessionModeStart = Pick<GenerationControls, 'tempo' | 'tonalCenter' | 'collection'>

/** A change of the player's to some of Jam's settings. */
// @spec-link [[rule_jam_settings_saved_on_change]]
export type JamSettingsChange = Partial<JamSettings>

/** Intent: the Jam tempo nearest `tempo` inside 60 to 180 BPM: kept, or brought to an end. */
// @spec-link [[rule_jam_tempo_range]]
// @spec-link [[rule_jam_settings_first_values]]
function keptInJamRange(tempo: number): number {
  const lowest = JAM_TEMPO_VALUES[0]!
  const highest = JAM_TEMPO_VALUES[JAM_TEMPO_VALUES.length - 1]!
  return Math.min(highest, Math.max(lowest, tempo))
}

/**
 * Intent: Jam's first values: the key, the mode and the tempo from session mode's current values,
 * the tempo kept inside 60 to 180 BPM; Gentle diatonic, Lift, Embellishments Rarely (the level
 * `asToday`), the Seventh chords level Off, drift Near, the lock off and every allowed rhythm
 * change off.
 */
// @spec-link [[rule_jam_settings_first_values]]
export function jamFirstValues(session: SessionModeStart): JamSettings {
  return deepFreeze({
    tempo: keptInJamRange(session.tempo),
    tonalCenter: session.tonalCenter,
    collection: session.collection,
    harmonicMotion: 'Gentle diatonic',
    tension: 'Lift',
    embellishments: 'asToday',
    drift: 'Near',
    rhythmLockOn: false,
    allowedRhythmChanges: [],
    'seventh-chords': 'off',
  })
}

/** Intent: whether a value is a plain object, as a stored record is. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Intent: a reader accepting only a member of a closed catalog of strings. */
function oneOf<T extends string>(catalog: readonly T[]): (value: unknown) => T | undefined {
  return (value) =>
    typeof value === 'string' && catalog.includes(value as T) ? (value as T) : undefined
}

/**
 * Intent: accept only a list of known rhythm change kinds, each once, in RHYTHM_CHANGE_KINDS
 * order, as the app writes it; any other list is unreadable, never repaired.
 */
function readAllowedRhythmChanges(value: unknown): readonly RhythmChangeKind[] | undefined {
  if (!Array.isArray(value)) return undefined
  const indexes = value.map((kind: unknown) =>
    RHYTHM_CHANGE_KINDS.indexOf(kind as RhythmChangeKind),
  )
  const canonical = indexes.every(
    (index, at) => index !== -1 && (at === 0 || index > indexes[at - 1]!),
  )
  return canonical ? indexes.map((index) => RHYTHM_CHANGE_KINDS[index]!) : undefined
}

/** Each Jam setting's reader: its value when valid, undefined otherwise; never throws. */
const READERS: { readonly [F in JamSettingField]: (value: unknown) => JamSettings[F] | undefined } =
  {
    tempo: (value) =>
      typeof value === 'number' && JAM_TEMPO_VALUES.includes(value) ? value : undefined,
    tonalCenter: oneOf(PITCH_CLASSES),
    collection: oneOf(COLLECTIONS),
    harmonicMotion: oneOf(HARMONIC_MOTIONS),
    tension: oneOf(TENSION_ARCS),
    embellishments: oneOf(FIGURE_LEVEL_IDS),
    drift: oneOf(JAM_DRIFTS),
    rhythmLockOn: (value) => (typeof value === 'boolean' ? value : undefined),
    allowedRhythmChanges: readAllowedRhythmChanges,
    'seventh-chords': oneOf(CHORD_FAMILY_LEVEL_IDS),
  }

const RECORD_FIELDS = ['key', 'dataVersion', 'appVersion', 'value'] as const

/**
 * Intent: the stored value of each Jam setting whose one record is well formed at the settings'
 * data version, by field; a setting with two records, a record with a missing or extra field, or
 * one written by a newer or an older data version, is left out (unreadable).
 */
function storedValues(records: readonly unknown[]): Map<JamSettingField, unknown> {
  const byField = new Map<JamSettingField, unknown>()
  const seen = new Set<JamSettingField>()
  const twice = new Set<JamSettingField>()
  for (const record of records) {
    if (!isPlainRecord(record) || typeof record.key !== 'string') continue
    const field = record.key.slice('jam.'.length) as JamSettingField
    if (record.key !== `jam.${field}` || !JAM_SETTING_FIELDS.includes(field)) continue
    if (seen.has(field)) twice.add(field)
    seen.add(field)
    const exact =
      Object.keys(record).length === RECORD_FIELDS.length &&
      RECORD_FIELDS.every((name) => Object.hasOwn(record, name))
    if (exact && readEnvelope(record, SETTINGS_DATA_VERSION) === 'current') {
      byField.set(field, record.value)
    }
  }
  for (const field of twice) byField.delete(field)
  return byField
}

/** What decoding Jam's records gives: the settings, and the first values to save now. */
// @spec-link [[rule_jam_settings_load_tolerantly]]
export interface DecodedJamSettings {
  readonly settings: JamSettings
  /**
   * The key, the mode and the tempo taken from session mode for want of a readable record, to
   * save at once, so a later visit starts from the same values.
   */
  readonly startedFromSessionMode: SettingChanges
}

/** The settings whose first values come from session mode's current values. */
const FROM_SESSION_MODE: readonly JamSettingField[] = ['tempo', 'tonalCenter', 'collection']

/**
 * Intent: Jam's settings from their stored records, each read on its own: a missing, damaged,
 * newer or invalid record gives that setting its first value, silently, and never disturbs
 * another. Never throws for what was stored.
 */
// @spec-link [[rule_jam_settings_load_tolerantly]]
// @spec-link [[rule_jam_settings_first_values]]
// @spec-link [[module_jam_settings]]
export function decodeJamSettings(
  records: readonly unknown[],
  session: SessionModeStart,
): DecodedJamSettings {
  const first = jamFirstValues(session)
  const stored = storedValues(records)
  const decoded: Record<string, unknown> = {}
  const fromSessionMode: [JamSettingKey, JamSettingStoredValue][] = []
  for (const field of JAM_SETTING_FIELDS) {
    const value = stored.has(field) ? READERS[field](stored.get(field)) : undefined
    decoded[field] = value ?? first[field]
    if (value === undefined && FROM_SESSION_MODE.includes(field)) {
      fromSessionMode.push([`jam.${field}`, first[field] as JamSettingStoredValue])
    }
  }
  return {
    settings: deepFreeze(decoded as unknown as JamSettings),
    startedFromSessionMode: Object.fromEntries(fromSessionMode) as SettingChanges,
  }
}

/**
 * Intent: refuse a change naming a value Jam's controls never offer: a defect of its caller,
 * never a stored value, so it throws.
 */
function checkedChange(change: JamSettingsChange): JamSettingsChange {
  for (const [field, value] of Object.entries(change)) {
    const reader = READERS[field as JamSettingField] as ((stored: unknown) => unknown) | undefined
    if (reader === undefined || reader(value) === undefined) {
      throw new Error(`Jam's settings: ${String(value)} is not a value of ${field}.`)
    }
  }
  return change
}

/**
 * Intent: the records one change saves: one per setting whose value it changed, none for a
 * setting it left as it was.
 */
// @spec-link [[rule_jam_settings_saved_on_change]]
export function jamSettingChanges(before: JamSettings, after: JamSettings): SettingChanges {
  const changed = JAM_SETTING_FIELDS.filter((field) =>
    field === 'allowedRhythmChanges'
      ? before.allowedRhythmChanges.join() !== after.allowedRhythmChanges.join()
      : before[field] !== after[field],
  )
  return Object.fromEntries(
    changed.map((field) => [`jam.${field}`, after[field] as JamSettingStoredValue]),
  ) as SettingChanges
}

/** Intent: the seven figure levels a Jam is generated with: its one level for every figure. */
// @spec-link [[rule_jam_embellishments_one_level]]
export function jamFigureLevels(level: FigureLevel): FigureLevels {
  return deepFreeze(
    Object.fromEntries(FIGURE_IDS.map((figure) => [figure, level])) as unknown as FigureLevels,
  )
}

/**
 * Intent: the controls a Jam is generated with before the doodle's readings replace its rhythm
 * and shape: Jam's tempo, key, mode, harmonic motion and tension, the shared instrument, the
 * first-visit value of each control the doodle sets, and arpeggio chaos held at Varied.
 */
// @spec-link [[req_jam_settings]]
export function jamGenerationControls(
  settings: JamSettings,
  instrumentProfileId: InstrumentProfileId,
): GenerationControls {
  return makeGenerationControls({
    ...DEFAULT_GENERATION_CONTROLS,
    tempo: settings.tempo,
    tonalCenter: settings.tonalCenter,
    collection: settings.collection,
    harmonicMotion: settings.harmonicMotion,
    tension: settings.tension,
    arpeggioChaos: 'Varied',
    instrumentProfileId,
  })
}

/** Intent: the first values still to save once a change has saved `saved`: none it saved. */
function withoutSaved(pending: SettingChanges, saved: SettingChanges): SettingChanges {
  return Object.fromEntries(
    Object.entries(pending).filter(([key]) => !Object.hasOwn(saved, key)),
  ) as SettingChanges
}

/** What Jam's settings are made from: the load's records, session mode's values, the saver. */
// @spec-link [[module_jam_settings]]
export interface JamSettingsDependencies {
  /** Jam's settings records as the load handed them, undecoded; none in a visit from defaults. */
  readonly records: readonly unknown[]
  /** Session mode's current key, mode and tempo, read once, now. */
  readonly session: SessionModeStart
  /** The visit's saver; it writes nothing in a visit that saves nothing. */
  readonly saveSettings: SaveSettings
  /**
   * Made for a Jam session's Review before Jam mode first shows: the first values taken from
   * session mode are not saved now, but by `saveFirstValues` as Jam mode first shows.
   */
  readonly firstValuesDeferred?: boolean
}

/** Jam's settings for the visit: what they are now, and the player's changes to them. */
// @spec-link [[module_jam_settings]]
export interface JamSettingsStore {
  readonly settings: Readonly<ShallowRef<JamSettings>>
  /**
   * Apply a change of the player's (at Jam's Idle, or the review's `Jam in {answer}`), and save
   * each setting it changed.
   */
  readonly change: (change: JamSettingsChange) => void
  /**
   * Save the first values taken from session mode that no change has saved since, as Jam mode
   * first shows; once only, so a later call saves nothing.
   */
  readonly saveFirstValues: () => void
}

/**
 * Intent: Jam's settings for the visit, made when they are first needed: decoded from the load's
 * records, the key, mode and tempo taken from session mode saved when none was readable, at once,
 * or, made for a Jam session's Review, only as Jam mode first shows (never one a change has saved
 * meanwhile); each change then saved at once, one record per setting it changed.
 */
// @spec-link [[module_jam_settings]]
// @spec-link [[rule_jam_settings_saved_on_change]]
// @spec-link [[rule_jam_in_visits_that_save_nothing]]
// @spec-link [[rule_jam_settings_first_values]]
export function createJamSettings(deps: JamSettingsDependencies): JamSettingsStore {
  const decoded = decodeJamSettings(deps.records, deps.session)
  const settings = shallowRef(decoded.settings)
  /** The first values taken from session mode not saved yet; null once they have been. */
  let pendingFirstValues: SettingChanges | null = decoded.startedFromSessionMode
  /** Intent: save the first values still pending, once; nothing after that. */
  const saveFirstValues = (): void => {
    if (pendingFirstValues === null) return
    const pending = pendingFirstValues
    pendingFirstValues = null
    deps.saveSettings(pending)
  }
  if (deps.firstValuesDeferred !== true) saveFirstValues()
  return {
    settings,
    change: (change) => {
      const before = settings.value
      const after = deepFreeze({ ...before, ...checkedChange(change) })
      const changes = jamSettingChanges(before, after)
      if (Object.keys(changes).length === 0) return
      settings.value = after
      if (pendingFirstValues !== null) {
        pendingFirstValues = withoutSaved(pendingFirstValues, changes)
      }
      deps.saveSettings(changes)
    },
    saveFirstValues,
  }
}
