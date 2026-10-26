/**
 * Shared fixtures of the settings codec's specs: the mix design the tokens give today, the decode
 * context over the built-in presets, a full set of settings differing from every default, and
 * helpers that encode a set as plain records a test may corrupt.
 */

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import {
  encodeSettings,
  type SettingKey,
  type SettingsDecodeContext,
} from '@/storage/records/settings-record'

/** The mix design as the stylesheet's `--mix-*` tokens give it today. */
export const MIX_DESIGN: AudioMixDesign = readAudioMixDesign({
  getPropertyValue: (name: string) =>
    ({
      '--mix-click-volume-default': '0.8',
      '--mix-backing-volume-default': '0.8',
      '--mix-click-volume-min': '0.2',
      '--mix-backing-volume-min': '0',
      '--mix-volume-max': '1',
    })[name] ?? '',
})

/** The decode context of a visit without my instrument, judging against the built-ins. */
export const CONTEXT: SettingsDecodeContext = {
  mixDesign: MIX_DESIGN,
  myInstrumentLoaded: false,
  presets: BUILT_IN_PRESETS,
}

export const APP_VERSION = '3.0.0-test'

export const DEFAULTS: SavedSettings = defaultSettings(MIX_DESIGN.defaults)

/**
 * A full set of settings in which every value differs from that setting's default; its selection
 * is Custom based on Jazz, which a load keeps whatever the values.
 */
export const NON_DEFAULT: SavedSettings = {
  controls: {
    tempo: 150,
    tonalCenter: 'F#',
    collection: 'Dorian',
    harmonicMotion: 'Active diatonic',
    tension: 'Edge',
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    syncopation: 'Active displacement',
    silenceDensity: 'Breath-heavy',
    contour: 'Falling',
    register: 'High',
    leapiness: 'Angular',
    arpeggioChaos: 'Chaotic',
    instrumentProfileId: 'eb-alto',
  },
  figureLevels: {
    passingTone: 'favored',
    accentedPassingTone: 'off',
    neighborTone: 'stronglyFavored',
    appoggiatura: 'asToday',
    diatonicEnclosure: 'favored',
    chromaticApproach: 'stronglyFavored',
    chromaticEnclosure: 'asToday',
  },
  presetSelection: { kind: 'custom', baseId: 'jazz' },
  theme: 'Dark',
  mix: { clickOn: false, clickVolume: 0.35, backingOn: false, backingVolume: 0.15 },
  sessionOptions: {
    varySettings: true,
    tensionAcrossPhrases: true,
    risingTempo: true,
    rhythmLockOn: true,
    allowedRhythmChanges: ['move_rest', 'merge_notes'],
    allowedGroups: {
      keyAndMode: true,
      harmony: false,
      tension: true,
      rhythm: false,
      melodyShape: true,
      figures: true,
    },
  },
  review: { format: 'midi', backingTrack: true, playedNotesShown: true },
  keepPlayedNotes: true,
}

/** Intent: read one setting's value out of a full set, by its record key. */
export function settingAt(settings: SavedSettings, key: SettingKey): unknown {
  const [group, field] = key.split('.') as [string, string | undefined]
  const top = (settings as unknown as Record<string, unknown>)[group]
  return field === undefined ? top : (top as Record<string, unknown>)[field]
}

export type RawRecord = Record<string, unknown>

/** Intent: the encoded records of a full set, as plain mutable copies a test may corrupt. */
export function rawRecords(settings: SavedSettings): RawRecord[] {
  return encodeSettings(settings, APP_VERSION).map((record) => ({ ...record }))
}

/** Intent: replace the record of `key` in `records` with what `change` makes of a copy of it. */
export function corrupt(
  records: readonly unknown[],
  key: SettingKey,
  change: (record: RawRecord) => unknown,
): unknown[] {
  return records.map((record) =>
    (record as RawRecord).key === key ? change({ ...(record as RawRecord) }) : record,
  )
}
