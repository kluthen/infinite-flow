/**
 * The player preset record: one record of the `presets` store per player preset, under the
 * preset's internal id, which the record also holds, in the record envelope: the preset's name,
 * its ten preset-held controls, its seven figure levels by figure id, and its key and mode
 * restriction. A built-in preset is never stored, and neither is the restriction in force. Each
 * save writes the whole record. Pure: no browser API.
 *
 * Reading is tolerant, record by record and field by field, like the settings records: an unknown
 * or invalid control, level or name takes that setting's first-load value, a missing name a
 * numbered one, and an unknown key or mode is dropped from its restriction list. A record that
 * cannot be read at all (not a record, damaged, written by a newer data version, or not under its
 * own id) is not listed, and the store keeps it as it is. Reading never throws for what was
 * stored, and never changes it.
 */

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  GenerationControlError,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  validateControlValue,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, isBuiltInPresetId } from '@/domain/presets/built-in-presets'
import {
  ANY_KEY_AND_MODE,
  type KeyAndModeRestriction,
  type RestrictionHalf,
} from '@/domain/presets/key-and-mode-restriction'
import { checkPresetName, suggestedPresetName } from '@/domain/presets/preset-names'
import {
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  type Preset,
  type PresetHeldControlKey,
  type PresetHeldControls,
  type PresetId,
} from '@/domain/presets/preset-selection'

import type { StoredEntry } from '../database'
import { readEnvelope, type RecordVersions } from '../record-envelope'

/** The data version at which the player preset record's shape was introduced. */
// @spec-link [[entity_player_preset_record]]
export const PRESET_RECORD_DATA_VERSION = 3

/**
 * The preset-record data version at which each figure first existed. A level a record lacks for a
 * figure introduced after the record's data version reads Off.
 */
// @spec-link [[entity_player_preset_record]]
// @spec-link [[rule_presets_load_tolerantly]]
export const FIGURE_INTRODUCED_AT: Readonly<Record<FigureId, number>> = deepFreeze({
  passingTone: 3,
  accentedPassingTone: 3,
  neighborTone: 3,
  appoggiatura: 3,
  diatonicEnclosure: 3,
  chromaticApproach: 3,
  chromaticEnclosure: 3,
})

/**
 * One stored player preset: the envelope's two versions, its id (the record's key too), its name,
 * its ten controls, its seven levels and its restriction. No kind: only player presets are stored.
 */
// @spec-link [[entity_player_preset_record]]
export interface PresetRecord extends RecordVersions {
  readonly id: PresetId
  readonly name: string
  readonly controls: PresetHeldControls
  readonly levels: FigureLevels
  readonly restriction: KeyAndModeRestriction
}

/** Intent: a restriction half copied: "any", or a fresh list in the same order. */
function copiedHalf<T>(half: RestrictionHalf<T>): RestrictionHalf<T> {
  return half === 'any' ? 'any' : [...half]
}

/**
 * Intent: the whole record of a player preset, written by the app at `appVersion`: its id and
 * name, the ten controls in preset order, the seven levels in figure order and its restriction.
 * A built-in preset or an empty app version is a caller defect and throws: a built-in is never
 * stored, and no app could read a record without its app version.
 */
// @spec-link [[entity_player_preset_record]]
// @spec-link [[rule_player_presets_saved_on_device]]
export function encodePresetRecord(preset: Preset, appVersion: string): PresetRecord {
  if (preset.kind !== 'player') throw new Error('preset record: only a player preset is stored')
  if (appVersion === '') throw new Error('preset record: the app version must not be empty')
  return {
    dataVersion: PRESET_RECORD_DATA_VERSION,
    appVersion,
    id: preset.id,
    name: preset.name,
    controls: Object.fromEntries(
      PRESET_HELD_CONTROL_KEYS.map((key) => [key, preset.controls[key]]),
    ) as unknown as PresetHeldControls,
    levels: Object.fromEntries(
      FIGURE_IDS.map((figure) => [figure, preset.levels[figure]]),
    ) as FigureLevels,
    restriction: {
      keys: copiedHalf(preset.restriction.keys),
      modes: copiedHalf(preset.restriction.modes),
    },
  }
}

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

/** Intent: whether a value is a plain object, as a stored record or object field is. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Intent: one stored control's value when its catalog holds it, else that control's first-load
 * value. A value that is not a string is in no catalog, and falls back before the validator,
 * whose refusal message would fail to write a circular or BigInt value. Only the catalog's own
 * refusal falls back; any other error is a defect and is rethrown.
 */
function heldControl(stored: unknown, key: PresetHeldControlKey): string {
  const { values, name } = HELD_CONTROL_CATALOGS[key]
  if (typeof stored !== 'string') return DEFAULT_GENERATION_CONTROLS[key]
  try {
    return validateControlValue<string>(values, stored, name)
  } catch (error) {
    if (!(error instanceof GenerationControlError)) throw error
    // The refusal of an unknown or ill-typed stored value: that control takes its first-load
    // value, and every other field still loads.
    return DEFAULT_GENERATION_CONTROLS[key]
  }
}

/**
 * Intent: the ten controls of a stored record, each read on its own; a missing or invalid one,
 * or every one when the field is not an object, takes its first-load value.
 */
function readHeldControls(stored: unknown): PresetHeldControls {
  const controls: Record<string, unknown> = isPlainRecord(stored) ? stored : {}
  return Object.fromEntries(
    PRESET_HELD_CONTROL_KEYS.map((key) => [key, heldControl(controls[key], key)]),
  ) as unknown as PresetHeldControls
}

/**
 * Intent: the level a record lacks for a figure: Off when the figure did not exist yet at the
 * record's data version (as for an older phrase replay key), otherwise the figure's first-load
 * level, since its absence then makes the field invalid.
 */
// @spec-link [[entity_player_preset_record]]
// @spec-link [[rule_presets_load_tolerantly]]
export function missingLevel(figure: FigureId, recordDataVersion: number): FigureLevel {
  return recordDataVersion < FIGURE_INTRODUCED_AT[figure] ? 'off' : NEUTRAL_FIGURE_LEVELS[figure]
}

/**
 * Intent: the seven levels of a stored record, each read on its own: a known level is kept, an
 * unknown or ill-typed one takes its first-load level, and a missing one (every one when the
 * field is not an object) reads as `missingLevel` says. Other keys are ignored.
 */
function readLevels(stored: unknown, recordDataVersion: number): FigureLevels {
  const levels: Record<string, unknown> = isPlainRecord(stored) ? stored : {}
  return Object.fromEntries(
    FIGURE_IDS.map((figure) => {
      if (!Object.hasOwn(levels, figure)) return [figure, missingLevel(figure, recordDataVersion)]
      const known = FIGURE_LEVEL_IDS.find((level) => level === levels[figure])
      return [figure, known ?? NEUTRAL_FIGURE_LEVELS[figure]]
    }),
  ) as FigureLevels
}

/**
 * Intent: one stored restriction half: "any", or the known entries of a stored list, the first
 * occurrence of each kept in order; an empty result, or anything else, reads "any".
 */
function readHalf<T extends string>(catalog: readonly T[], stored: unknown): RestrictionHalf<T> {
  if (!Array.isArray(stored)) return 'any'
  const kept: T[] = []
  for (const entry of stored) {
    const known = catalog.find((candidate) => candidate === entry)
    if (known !== undefined && !kept.includes(known)) kept.push(known)
  }
  const [first, ...rest] = kept
  return first === undefined ? 'any' : [first, ...rest]
}

/** Intent: a stored restriction, half by half; a missing or ill-typed one reads any key and mode. */
function readRestriction(stored: unknown): KeyAndModeRestriction {
  if (!isPlainRecord(stored)) return ANY_KEY_AND_MODE
  return { keys: readHalf(PITCH_CLASSES, stored.keys), modes: readHalf(COLLECTIONS, stored.modes) }
}

/** Intent: a stored name when it is one a player could save, trimmed; null for a missing one. */
function readName(stored: unknown): string | null {
  if (typeof stored !== 'string') return null
  const check = checkPresetName(stored, [])
  return check.ok ? check.name : null
}

/** A readable record's fields, its name still null when it has to be numbered. */
type ReadRecord = Omit<Preset, 'name' | 'kind'> & { readonly name: string | null }

/**
 * Intent: the fields of one stored entry, or null when it cannot be read at all: not a record, a
 * damaged or newer envelope, or an id that is missing, not the entry's key or a built-in's.
 */
function readRecord(entry: StoredEntry): ReadRecord | null {
  const { value } = entry
  if (!isPlainRecord(value)) return null
  if (readEnvelope(value, PRESET_RECORD_DATA_VERSION) !== 'current') return null
  const { id } = value
  if (typeof id !== 'string' || id === '' || id !== entry.key || isBuiltInPresetId(id)) {
    return null
  }
  return {
    id,
    name: readName(value.name),
    controls: readHeldControls(value.controls),
    // A current record's data version is the shape's.
    levels: readLevels(value.levels, PRESET_RECORD_DATA_VERSION),
    restriction: readRestriction(value.restriction),
  }
}

/** Intent: the player preset of a readable record, under the name it loads with. */
function playerPreset(record: ReadRecord, name: string): Preset {
  return makePreset({ ...record, name, kind: 'player' })
}

/**
 * Intent: the player presets of the `presets` store's entries, in entry order, each read on its
 * own and field by field. An entry that cannot be read at all is not listed, with no notice, and
 * is never changed. A missing name becomes a numbered one: each nameless preset, in entry order,
 * takes the first suggested name no built-in, named or already numbered preset has. Never throws
 * for what was stored.
 */
// @spec-link [[entity_player_preset_record]]
// @spec-link [[rule_presets_load_tolerantly]]
export function decodePlayerPresets(entries: readonly StoredEntry[]): readonly Preset[] {
  const records = entries.flatMap((entry) => {
    const record = readRecord(entry)
    return record === null ? [] : [record]
  })
  const named = new Map<ReadRecord, Preset>()
  for (const record of records) {
    if (record.name !== null) named.set(record, playerPreset(record, record.name))
  }
  const numbered: Preset[] = []
  const presets = records.map((record) => {
    const preset = named.get(record)
    if (preset !== undefined) return preset
    const taken = [...BUILT_IN_PRESETS, ...named.values(), ...numbered]
    const given = playerPreset(record, suggestedPresetName(taken))
    numbered.push(given)
    return given
  })
  return deepFreeze(presets)
}
