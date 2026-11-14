// @vitest-environment node
/**
 * The workspace's Jam settings as a Jam session's Review reads and changes them (master spec C6.4,
 * C6.5; change set W4, option (a)): before Jam's settings exist, Jam's key and mode are what the
 * load's records give, or session mode's current ones for want of a record, following session
 * mode, nothing saved; the review's `Jam in {answer}` makes Jam's settings, saving Jam's key and
 * mode only, never a session-mode record and no first value; Jam mode showing later starts from
 * them and saves the first values still pending, once.
 */
import { describe, expect, it } from 'vitest'
import { nextTick, shallowRef } from 'vue'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { JamModeModule } from '@/components/workspace/load-jam-mode'
import { useJamSettings } from '@/components/workspace/use-jam-settings'
import * as jamMode from '@/jam/jam-mode'
import type { SettingChanges } from '@/storage/settings-saver'

import { TEST_APP_VERSION } from '../../storage/storage-test-doubles'

/** Jam's code entry, as Jam's loader gives it once loaded. */
const JAM_MODULE: JamModeModule = jamMode

/** Intent: the workspace's Jam settings over a session mode, a Jam mode and records the test sets. */
function jamSettingsRig(records: readonly unknown[] = []) {
  const controls = shallowRef<GenerationControls>({
    ...DEFAULT_GENERATION_CONTROLS,
    tempo: 100,
    tonalCenter: 'C',
    collection: 'Major',
  })
  const workspaceModule = shallowRef<JamModeModule | null>(null)
  const jamShowing = shallowRef(false)
  const batches: SettingChanges[] = []
  const jam = useJamSettings({
    jamModule: () => workspaceModule.value,
    jamShowing: () => jamShowing.value,
    records: () => records,
    sessionControls: () => controls.value,
    instrumentProfileId: () => controls.value.instrumentProfileId,
    saveSettings: (changes) => batches.push(changes),
  })
  /** Intent: Jam mode shows, its code loaded. */
  const showJam = async (): Promise<void> => {
    workspaceModule.value = JAM_MODULE
    jamShowing.value = true
    await nextTick()
  }
  return { controls, jam, batches, showJam }
}

// @test-link [[module_jam_settings]]
describe("Jam's key and mode for a review", () => {
  // @test-link [[rule_jam_settings_first_values]]
  it("are session mode's current ones before Jam's settings exist, following them, nothing saved", () => {
    const { controls, jam, batches } = jamSettingsRig()

    expect(jam.reviewKeyAndMode(JAM_MODULE)).toEqual({ tonalCenter: 'C', collection: 'Major' })
    controls.value = { ...controls.value, tonalCenter: 'F', collection: 'Dorian' }
    expect(jam.reviewKeyAndMode(JAM_MODULE)).toEqual({ tonalCenter: 'F', collection: 'Dorian' })
    expect(batches).toEqual([])
  })

  // @test-link [[module_jam_settings]]
  it("are the saved ones when the load handed Jam's records", () => {
    const records = [
      { key: 'jam.tonalCenter', dataVersion: 1, appVersion: TEST_APP_VERSION, value: 'A' },
      { key: 'jam.collection', dataVersion: 1, appVersion: TEST_APP_VERSION, value: 'Minor' },
    ]
    const { jam } = jamSettingsRig(records)

    expect(jam.reviewKeyAndMode(JAM_MODULE)).toEqual({ tonalCenter: 'A', collection: 'Minor' })
  })
})

// @test-link [[rule_suggestion_use_it]]
describe("the review's Jam in {answer}", () => {
  // @test-link [[rule_suggestion_use_it]]
  it("saves Jam's key and mode only before Jam mode shows, then Jam mode saves its pending first values", async () => {
    const { controls, jam, batches, showJam } = jamSettingsRig()

    jam.changeFromReview(JAM_MODULE, { tonalCenter: 'G', collection: 'Major' })

    expect(batches).toEqual([{ 'jam.tonalCenter': 'G' }])
    expect(jam.reviewKeyAndMode(JAM_MODULE)).toEqual({ tonalCenter: 'G', collection: 'Major' })
    expect(controls.value.tonalCenter).toBe('C')
    expect(jam.view.value).toBeNull()

    await showJam()
    expect(jam.view.value?.settings).toMatchObject({ tonalCenter: 'G', collection: 'Major' })
    expect(batches).toEqual([
      { 'jam.tonalCenter': 'G' },
      { 'jam.tempo': 100, 'jam.collection': 'Major' },
    ])
  })

  // @test-link [[rule_suggestion_use_it]]
  it("changes Jam's settings as a change at Jam's Idle once they exist", async () => {
    const { jam, batches, showJam } = jamSettingsRig()
    await showJam()

    jam.changeFromReview(JAM_MODULE, { tonalCenter: 'D', collection: 'Dorian' })

    expect(batches).toEqual([
      { 'jam.tempo': 100, 'jam.tonalCenter': 'C', 'jam.collection': 'Major' },
      { 'jam.tonalCenter': 'D', 'jam.collection': 'Dorian' },
    ])
    expect(jam.view.value?.settings).toMatchObject({ tonalCenter: 'D', collection: 'Dorian' })
  })
})

// @test-link [[module_jam_settings]]
describe("Jam's Seventh chords level at Jam's Idle", () => {
  // @test-link [[rule_jam_settings_saved_on_change]]
  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  it('starts Off and saves a change as its one record, no session-mode record', async () => {
    const { jam, batches, showJam } = jamSettingsRig()
    await showJam()
    expect(jam.view.value?.settings['seventh-chords']).toBe('off')

    jam.change({ 'seventh-chords': 'favored' })

    expect(batches.slice(1)).toEqual([{ 'jam.seventh-chords': 'favored' }])
    expect(
      batches.flatMap((batch) => Object.keys(batch)).every((key) => key.startsWith('jam.')),
    ).toBe(true)
    expect(jam.view.value?.settings['seventh-chords']).toBe('favored')
  })
})
