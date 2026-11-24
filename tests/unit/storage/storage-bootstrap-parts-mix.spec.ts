/**
 * The four accompaniment parts' mix settings in the saved data: a store saved by v3.4, which has
 * none of their records, loads every setting unchanged with the four parts off at their first-load
 * levels, and a part setting the player changes is saved through the visit's saves and reloads.
 * Storage runs on fake-indexeddb; the data is seeded through the settings codec and the port.
 */

import { describe, expect, it, vi } from 'vitest'

import { loadSavedData, type SavedDataLoadDependencies } from '@/storage-bootstrap'
import { encodeSettings, SETTINGS_DATA_VERSION } from '@/storage/records/settings-record'
import { createVisitSaves } from '@/storage/settings-saver'
import type { StoragePort } from '@/storage/storage-port'

import { readyPort } from './save-policy-doubles'
import { CONTEXT, DEFAULTS, MIX_DESIGN, NON_DEFAULT } from './settings-record-fixtures'
import { freshFactory, TEST_APP_VERSION } from './storage-test-doubles'

/** The eight records of the four parts' switches and volumes; v3.4 saved none of them. */
const PART_KEYS: readonly string[] = [
  'mix.thirdsOn',
  'mix.thirdsVolume',
  'mix.counterMelodyOn',
  'mix.counterMelodyVolume',
  'mix.fillsOn',
  'mix.fillsVolume',
  'mix.drumsOn',
  'mix.drumsVolume',
]

/** A start-up wait that never ends, so every read finishes within it. */
const neverEnds = (): Promise<void> => new Promise<void>(() => {})

/** The dependencies of a load over `factory`, every read within the start-up wait. */
function dependencies(factory: IDBFactory): SavedDataLoadDependencies {
  return {
    openPort: () => readyPort(factory),
    startupWait: neverEnds,
    mixDesign: () => CONTEXT.mixDesign,
  }
}

/** Write what v3.4 saved for NON_DEFAULT: every setting record but the parts'. */
async function seedV34Settings(port: StoragePort): Promise<void> {
  for (const record of encodeSettings(NON_DEFAULT, TEST_APP_VERSION)) {
    if (PART_KEYS.includes(record.key)) continue
    await port.write('settings', record.key, record)
  }
}

// @test-link [[rule_parts_off_by_default]]
// @test-link [[rule_saved_settings_load_tolerantly]]
describe("the parts' mix settings in the saved data", () => {
  it('loads a v3.4 store unchanged, with the four parts off at their first-load levels', async () => {
    const factory = freshFactory()
    await seedV34Settings(await readyPort(factory))

    const load = await loadSavedData(dependencies(factory))

    expect(load.outcome).toBe('saved-data-read')
    expect(load.settings).toEqual({
      ...NON_DEFAULT,
      mix: {
        ...NON_DEFAULT.mix,
        thirdsOn: false,
        thirdsVolume: 0.5,
        counterMelodyOn: false,
        counterMelodyVolume: 0.5,
        fillsOn: false,
        fillsVolume: 0.6,
        drumsOn: false,
        drumsVolume: 0.6,
      },
    })
    expect(MIX_DESIGN.defaults).toMatchObject({
      thirdsVolume: 0.5,
      counterMelodyVolume: 0.5,
      fillsVolume: 0.6,
      drumsVolume: 0.6,
    })
  })

  it('starts a first visit with the four parts off and the backing on', async () => {
    const load = await loadSavedData(dependencies(freshFactory()))

    expect(load.settings.mix).toEqual(DEFAULTS.mix)
    expect(load.settings.mix).toMatchObject({
      backingOn: true,
      thirdsOn: false,
      counterMelodyOn: false,
      fillsOn: false,
      drumsOn: false,
    })
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('saves a changed part switch and volume at data version 1, and loads them back', async () => {
    const factory = freshFactory()
    await seedV34Settings(await readyPort(factory))
    const first = await loadSavedData(dependencies(factory))
    const saves = createVisitSaves(first.savePolicy, TEST_APP_VERSION)

    saves.saveSettings({ 'mix.thirdsOn': true, 'mix.drumsVolume': 0.25 })

    const port = await readyPort(factory)
    await vi.waitFor(async () => {
      expect(await port.read('settings', 'mix.drumsVolume')).toBeDefined()
    })
    expect(await port.read('settings', 'mix.thirdsOn')).toMatchObject({
      dataVersion: SETTINGS_DATA_VERSION,
      value: true,
    })
    const reloaded = await loadSavedData(dependencies(factory))
    expect(reloaded.settings.mix).toEqual({
      ...first.settings.mix,
      thirdsOn: true,
      drumsVolume: 0.25,
    })
    expect(reloaded.settings.controls).toEqual(NON_DEFAULT.controls)
  })
})
