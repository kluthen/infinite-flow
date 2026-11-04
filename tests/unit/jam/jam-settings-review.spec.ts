/**
 * Jam's settings made for a Jam session's Review before Jam mode first shows (change set W4,
 * option (a)): they save no first values when made; the review's `Jam in {answer}` saves Jam's key
 * and mode only; the first values still pending are saved once, as Jam mode first shows, never one
 * a change has saved since. Made as Jam mode first shows, they save their first values at once, as
 * before, and never again.
 */
import { describe, expect, it } from 'vitest'

import { createJamSettings, type SessionModeStart } from '@/jam/jam-settings'
import type { SettingChanges } from '@/storage/settings-saver'

/** Session mode's current values in these tests: C Major at 200 BPM, Jam's tempo kept at 180. */
const SESSION: SessionModeStart = { tempo: 200, tonalCenter: 'C', collection: 'Major' }

/** Intent: a saver that records every batch it is given, and writes nothing. */
function recordingSaver(): { save: (changes: SettingChanges) => void; batches: SettingChanges[] } {
  const batches: SettingChanges[] = []
  return { save: (changes) => batches.push(changes), batches }
}

// @test-link [[module_jam_settings]]
describe("Jam's settings made for a review", () => {
  // @test-link [[rule_jam_settings_first_values]]
  it('save no first values when made, and start from session mode’s current values', () => {
    const saver = recordingSaver()
    const store = createJamSettings({
      records: [],
      session: SESSION,
      saveSettings: saver.save,
      firstValuesDeferred: true,
    })

    expect(store.settings.value).toMatchObject({
      tempo: 180,
      tonalCenter: 'C',
      collection: 'Major',
    })
    expect(saver.batches).toEqual([])
  })

  // @test-link [[rule_suggestion_use_it]]
  // @test-link [[rule_jam_settings_saved_on_change]]
  it("save Jam's key and mode on Use it, then the first values still pending as Jam mode shows", () => {
    const saver = recordingSaver()
    const store = createJamSettings({
      records: [],
      session: SESSION,
      saveSettings: saver.save,
      firstValuesDeferred: true,
    })

    store.change({ tonalCenter: 'G', collection: 'Major' })
    expect(saver.batches).toEqual([{ 'jam.tonalCenter': 'G' }])

    store.saveFirstValues()
    expect(saver.batches).toEqual([
      { 'jam.tonalCenter': 'G' },
      { 'jam.tempo': 180, 'jam.collection': 'Major' },
    ])

    store.saveFirstValues()
    expect(saver.batches).toHaveLength(2)
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's settings made as Jam mode first shows", () => {
  // @test-link [[rule_jam_settings_first_values]]
  it('save their first values at once, and nothing more when asked again', () => {
    const saver = recordingSaver()
    const store = createJamSettings({ records: [], session: SESSION, saveSettings: saver.save })

    store.saveFirstValues()

    expect(saver.batches).toEqual([
      { 'jam.tempo': 180, 'jam.tonalCenter': 'C', 'jam.collection': 'Major' },
    ])
  })
})
