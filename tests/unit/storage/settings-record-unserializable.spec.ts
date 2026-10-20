/**
 * The settings codec over stored control values no JSON encoder can write: IndexedDB keeps a
 * BigInt or a circular object as written, so a hand-edited or damaged record can hold one. That
 * control loads its first-load value, every other setting still loads, and neither the decode
 * nor the start-up load throws for it (ISS-014).
 */
import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { loadSavedData } from '@/storage-bootstrap'
import type { SavedSettings } from '@/storage/records/setting-defaults'
import {
  decodeSettings,
  encodeSettingRecord,
  encodeSettings,
  SETTING_KEYS,
  type SettingKey,
} from '@/storage/records/settings-record'

import { readyPort } from './save-policy-doubles'
import {
  APP_VERSION,
  CONTEXT,
  corrupt,
  DEFAULTS,
  MIX_DESIGN,
  NON_DEFAULT,
  rawRecords,
  type RawRecord,
} from './settings-record-fixtures'
import { freshFactory } from './storage-test-doubles'

/** Intent: an object that holds itself, which `JSON.stringify` refuses. */
function circularValue(): Record<string, unknown> {
  const circular: Record<string, unknown> = { label: 'Dorian' }
  circular.self = circular
  return circular
}

/** Each stored value no JSON encoder can write, by name. */
const UNSERIALIZABLE: readonly (readonly [string, () => unknown])[] = [
  ['a BigInt', () => 10n],
  ['a circular object', circularValue],
]

const CONTROL_PREFIX = 'controls.'

/** Every control's record key. */
const CONTROL_KEYS: readonly SettingKey[] = SETTING_KEYS.filter((key) =>
  key.startsWith(CONTROL_PREFIX),
)

/** Intent: the control field a control's record key names. */
function controlField(key: SettingKey): keyof GenerationControls {
  return key.slice(CONTROL_PREFIX.length) as keyof GenerationControls
}

/** Intent: NON_DEFAULT with only the control of `key` at its first-load value. */
function afterControlFallback(key: SettingKey): SavedSettings {
  const field = controlField(key)
  return {
    ...NON_DEFAULT,
    controls: { ...NON_DEFAULT.controls, [field]: DEFAULTS.controls[field] },
  }
}

describe('decodeSettings: a stored control value JSON cannot write', () => {
  for (const [name, make] of UNSERIALIZABLE) {
    // @test-link [[rule_saved_settings_load_tolerantly]]
    it(`reads ${name} as each control's first-load value, every other setting still loaded`, () => {
      for (const key of CONTROL_KEYS) {
        const records = corrupt(rawRecords(NON_DEFAULT), key, (record) => ({
          ...record,
          value: make(),
        }))

        expect(() => decodeSettings(records, CONTEXT), key).not.toThrow()
        expect(decodeSettings(records, CONTEXT), key).toEqual(afterControlFallback(key))
      }
    })
  }

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('reads every control holding such a value as the first-load controls, the rest loaded', () => {
    let records: unknown[] = rawRecords(NON_DEFAULT)
    CONTROL_KEYS.forEach((key, index) => {
      const [, make] = UNSERIALIZABLE[index % UNSERIALIZABLE.length]!
      records = corrupt(records, key, (record: RawRecord) => ({ ...record, value: make() }))
    })

    expect(decodeSettings(records, CONTEXT)).toEqual({
      ...NON_DEFAULT,
      controls: DEFAULTS.controls,
    })
  })
})

describe('loadSavedData: a stored control value JSON cannot write', () => {
  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('resolves with that control at its first-load value and every other setting loaded', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    for (const record of encodeSettings(NON_DEFAULT, APP_VERSION)) {
      await port.write('settings', record.key, record)
    }
    const unserializable = { ...encodeSettingRecord('controls.collection', 'Dorian', APP_VERSION) }
    await port.write('settings', unserializable.key, Object.assign(unserializable, { value: 10n }))

    const load = await loadSavedData({
      openPort: () => readyPort(factory),
      startupWait: () => new Promise<void>(() => {}),
      mixDesign: () => MIX_DESIGN,
    })

    expect(load.outcome).toBe('saved-data-read')
    expect(load.settings).toEqual(afterControlFallback('controls.collection'))
  })
})
