import { describe, expect, it } from 'vitest'

import {
  applyControlledCustomValue,
  applyMusicalProfile,
  applyNonProfileControlValue,
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { SETTINGS_DATA_VERSION } from '@/storage/records/settings-record'
import type { SavePolicy } from '@/storage/save-policy'
import {
  chosenControlChanges,
  createVisitSaves,
  type SettingChanges,
} from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'
import { notUsed, recordingPolicy } from './recording-save-policy'

const APP_VERSION = '3.0.0-test'

/** Intent: a promise of `policy` the test resolves when it chooses. */
function pendingPolicy(policy: SavePolicy): {
  readonly promise: Promise<SavePolicy>
  readonly resolve: () => void
} {
  let resolve: (value: SavePolicy) => void = notUsed('resolve before the promise exists')
  const promise = new Promise<SavePolicy>((settle) => {
    resolve = settle
  })
  return { promise, resolve: () => resolve(policy) }
}

/** Intent: let every pending promise callback run. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: the batch one saved setting change is written as. */
function settingWrite(key: string, value: unknown): StorageChange {
  return {
    kind: 'write',
    store: 'settings',
    key,
    record: { key, dataVersion: SETTINGS_DATA_VERSION, appVersion: APP_VERSION, value },
  } as StorageChange
}

/** Intent: visit saves over a policy already resolved and flushed. */
async function resolvedSaves() {
  const { policy, calls } = recordingPolicy()
  const saves = createVisitSaves(Promise.resolve(policy), APP_VERSION)
  await flushPromises()
  return { saves, calls }
}

describe('saveSettings', () => {
  // @test-link [[rule_settings_saved_on_change]]
  it('submits the settings of one change as one batch of encoded setting records', async () => {
    const { saves, calls } = await resolvedSaves()

    saves.saveSettings({
      'controls.register': 'High',
      profileSelection: { musicalProfile: 'Jazz', isCustom: true },
    })

    expect(calls).toEqual([
      {
        method: 'save',
        changes: [
          settingWrite('controls.register', 'High'),
          settingWrite('profileSelection', { musicalProfile: 'Jazz', isCustom: true }),
        ],
      },
    ])
  })

  // @test-link [[rule_settings_saved_on_change]]
  it('saves nothing for a change that changed no setting', async () => {
    const { saves, calls } = await resolvedSaves()

    saves.saveSettings({})

    expect(calls).toEqual([])
  })

  it('throws for a key that names no setting', async () => {
    const { saves, calls } = await resolvedSaves()
    const unknown: Record<string, unknown> = { 'sessionOptions.reachedTempo': 180 }

    expect(() => saves.saveSettings(unknown as SettingChanges)).toThrow(/reachedTempo/)
    expect(calls).toEqual([])
  })
})

describe('the order calls reach the policy in', () => {
  it('queues calls made before the policy loads and runs them in order once it does', async () => {
    const { policy, calls } = recordingPolicy()
    const pending = pendingPolicy(policy)
    const saves = createVisitSaves(pending.promise, APP_VERSION)

    saves.saveSettings({ theme: 'Dark' })
    saves.hold()
    saves.saveSettings({ 'controls.tempo': 120 })
    saves.release()
    await flushPromises()
    expect(calls).toEqual([])

    pending.resolve()
    await flushPromises()

    expect(calls).toEqual([
      { method: 'save', changes: [settingWrite('theme', 'Dark')] },
      { method: 'hold' },
      { method: 'save', changes: [settingWrite('controls.tempo', 120)] },
      { method: 'release' },
    ])
  })

  // @test-link [[rule_no_save_during_session]]
  it('forwards a hold to the loaded policy before its caller goes on', async () => {
    const { saves, calls } = await resolvedSaves()

    saves.hold()
    expect(calls).toEqual([{ method: 'hold' }])

    saves.saveSettings({ theme: 'Light' })
    saves.release()
    expect(calls).toEqual([
      { method: 'hold' },
      { method: 'save', changes: [settingWrite('theme', 'Light')] },
      { method: 'release' },
    ])
  })
})

describe('chosenControlChanges', () => {
  const before = {
    controls: DEFAULT_GENERATION_CONTROLS,
    profileSelection: DEFAULT_PROFILE_SELECTION,
  }

  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('is empty when nothing changed', () => {
    expect(chosenControlChanges(before, { ...before })).toEqual({})
  })

  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('holds only the control a non-profile edit changed', () => {
    const [controls, profileSelection] = applyNonProfileControlValue(
      before.controls,
      before.profileSelection,
      'tempo',
      120,
    )

    expect(chosenControlChanges(before, { controls, profileSelection })).toEqual({
      'controls.tempo': 120,
    })
  })

  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('holds the edited profile-controlled value and the now customized selection', () => {
    const [controls, profileSelection] = applyControlledCustomValue(
      before.controls,
      before.profileSelection,
      'register',
      'High',
    )

    expect(chosenControlChanges(before, { controls, profileSelection })).toEqual({
      'controls.register': 'High',
      profileSelection: { musicalProfile: 'Neutral', isCustom: true },
    })
  })

  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[rule_saved_setting_is_players_choice]]
  it('holds the controlled values a preset switch changed and the new selection', () => {
    const [controls, profileSelection] = applyMusicalProfile(before.controls, 'Jazz')

    expect(chosenControlChanges(before, { controls, profileSelection })).toEqual({
      'controls.noteDensity': 'Eighth',
      'controls.syncopation': 'Occasional offbeats',
      'controls.silenceDensity': 'Conversational',
      'controls.contour': 'Wandering',
      'controls.register': 'Varying',
      profileSelection: { musicalProfile: 'Jazz', isCustom: false },
    })
  })
})
