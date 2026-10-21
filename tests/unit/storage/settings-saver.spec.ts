import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { builtInPreset, DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { makePreset, type PresetSelection } from '@/domain/presets/preset-selection'
import { CONTROLLER_RECORD_KEY, encodeControllerRecord } from '@/storage/records/controller-record'
import { encodePresetRecord } from '@/storage/records/preset-record'
import { settingDataVersion, type SettingKey } from '@/storage/records/settings-record'
import type { SavePolicy } from '@/storage/save-policy'
import {
  chosenControlChanges,
  createVisitSaves,
  type SettingChanges,
} from '@/storage/settings-saver'
import type { StorageChange } from '@/storage/storage-port'
import { notUsed, PAGE_STAYS, recordingPolicy } from './recording-save-policy'

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
    record: {
      key,
      dataVersion: settingDataVersion(key as SettingKey),
      appVersion: APP_VERSION,
      value,
    },
  } as StorageChange
}

/** Intent: visit saves over a policy already resolved and flushed. */
async function resolvedSaves() {
  const { policy, calls } = recordingPolicy()
  const saves = createVisitSaves(Promise.resolve(policy), APP_VERSION)
  await flushPromises()
  return { saves, calls }
}

// @test-link [[module_saved_data_loader]]
describe('saveSettings', () => {
  // @test-link [[rule_settings_saved_on_change]]
  it('submits the settings of one change as one batch of encoded setting records', async () => {
    const { saves, calls } = await resolvedSaves()

    saves.saveSettings({
      'controls.register': 'High',
      'figureLevels.appoggiatura': 'favored',
      presetSelection: { kind: 'custom', baseId: 'jazz' },
    })

    expect(calls).toEqual([
      {
        method: 'save',
        changes: [
          settingWrite('controls.register', 'High'),
          settingWrite('figureLevels.appoggiatura', 'favored'),
          settingWrite('presetSelection', { kind: 'custom', baseId: 'jazz' }),
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

// @test-link [[entity_remembered_controller_record]]
describe('the remembered controller', () => {
  // @test-link [[rule_last_controller_remembered]]
  it('is written as its one controller record, in the order the calls were made', async () => {
    const { policy, calls } = recordingPolicy()
    const pending = pendingPolicy(policy)
    const saves = createVisitSaves(pending.promise, APP_VERSION)

    saves.saveSettings({ theme: 'Dark' })
    saves.rememberController({ id: 'port-sax', name: 'Travel Sax', manufacturer: 'Odisei' })
    pending.resolve()
    await flushPromises()

    expect(calls).toEqual([
      { method: 'save', changes: [settingWrite('theme', 'Dark')] },
      {
        method: 'save',
        changes: [
          {
            kind: 'write',
            store: 'controller',
            key: CONTROLLER_RECORD_KEY,
            record: encodeControllerRecord(
              { id: 'port-sax', name: 'Travel Sax', manufacturer: 'Odisei' },
              APP_VERSION,
            ),
          },
        ],
      },
    ])
  })

  // @test-link [[rule_disconnect_forgets_controller]]
  it('is forgotten by deleting that record', async () => {
    const { saves, calls } = await resolvedSaves()

    saves.forgetController()

    expect(calls).toEqual([
      {
        method: 'save',
        changes: [{ kind: 'delete', store: 'controller', key: CONTROLLER_RECORD_KEY }],
      },
    ])
  })
})

// @test-link [[module_saved_data_loader]]
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

  // @test-link [[module_kept_session_save]]
  it("queues the session's save after the release and resolves the policy's outcome of it", async () => {
    const { policy, calls } = recordingPolicy()
    const pending = pendingPolicy(policy)
    const saves = createVisitSaves(pending.promise, APP_VERSION)
    /** Intent: the session save's changes, whatever was read. */
    const changes = () => [settingWrite('theme', 'Dark')]

    saves.hold()
    saves.release()
    const outcome = saves.saveSession(changes, PAGE_STAYS)
    await flushPromises()
    expect(calls).toEqual([])

    pending.resolve()

    expect(await outcome).toEqual({ status: 'refused', kind: 'quota' })
    expect(calls).toEqual([
      { method: 'hold' },
      { method: 'release' },
      { method: 'saveSession', changes, pageGoingAway: PAGE_STAYS },
    ])
  })
})

// @test-link [[module_player_presets]]
describe('the player presets among the visit saves', () => {
  // @test-link [[module_player_presets]]
  it('queue in call order, a record before the selection naming it, and resolve the outcomes', async () => {
    const { policy, calls } = recordingPolicy()
    const pending = pendingPolicy(policy)
    const saves = createVisitSaves(pending.promise, APP_VERSION)
    const selection: PresetSelection = { kind: 'preset', presetId: 'player-1' }
    const preset = makePreset({ ...builtInPreset('jazz'), id: 'player-1', kind: 'player' })

    const saved = saves.savePreset(preset)
    saves.saveSettings({ presetSelection: selection })
    const deleted = saves.deletePreset('player-1')
    await flushPromises()
    expect(calls).toEqual([])

    pending.resolve()

    expect(await saved).toBe('saved')
    expect(await deleted).toBe('saved')
    expect(calls).toEqual([
      {
        method: 'save',
        changes: [
          {
            kind: 'write',
            store: 'presets',
            key: 'player-1',
            record: encodePresetRecord(preset, APP_VERSION),
          },
        ],
      },
      { method: 'requestProtection' },
      { method: 'save', changes: [settingWrite('presetSelection', selection)] },
      { method: 'save', changes: [{ kind: 'delete', store: 'presets', key: 'player-1' }] },
    ])
  })
})

// @test-link [[module_kept_session_changes]]
describe('the changes to kept sessions', () => {
  it("queue in call order after the session's save and resolve the policy's outcomes", async () => {
    const { policy, calls } = recordingPolicy()
    const pending = pendingPolicy(policy)
    const saves = createVisitSaves(pending.promise, APP_VERSION)
    /** Intent: the session save's changes, whatever was read. */
    const changes = () => [settingWrite('theme', 'Dark')]
    /** Intent: a change that changes nothing. */
    const change = () => Promise.resolve([])
    /** Intent: a read that reads nothing. */
    const read = () => Promise.resolve(0)

    const saved = saves.saveSession(changes, PAGE_STAYS)
    const changed = saves.changeKept(change, 'caller')
    const counted = saves.readKept(read, 'notice')
    await flushPromises()
    expect(calls).toEqual([])

    pending.resolve()

    expect(await saved).toEqual({ status: 'refused', kind: 'quota' })
    expect(await changed).toEqual({ status: 'unchanged' })
    expect(await counted).toEqual({ status: 'saving-off' })
    expect(calls).toEqual([
      { method: 'saveSession', changes, pageGoingAway: PAGE_STAYS },
      { method: 'changeKept', changes: change, refusal: 'caller' },
      { method: 'readKept', read, refusal: 'notice' },
    ])
  })
})

/** The first-load controls with a built-in preset's ten controls. */
function controlsOf(presetId: 'neutral' | 'jazz' | 'reel') {
  return makeGenerationControls({
    ...DEFAULT_GENERATION_CONTROLS,
    ...builtInPreset(presetId).controls,
  })
}

const JAZZ: PresetSelection = { kind: 'preset', presetId: 'jazz' }
const REEL: PresetSelection = { kind: 'preset', presetId: 'reel' }

// @test-link [[module_saved_data_loader]]
// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe('chosenControlChanges', () => {
  const before = {
    controls: DEFAULT_GENERATION_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: DEFAULT_PRESET_SELECTION,
  }

  it('is empty when nothing changed', () => {
    expect(chosenControlChanges(before, { ...before })).toEqual({})
  })

  it('holds only the control a tempo edit changed', () => {
    const controls = makeGenerationControls({ ...before.controls, tempo: 120 })

    expect(chosenControlChanges(before, { ...before, controls })).toEqual({
      'controls.tempo': 120,
    })
  })

  it('holds the edited preset-held control and the Custom selection based on Neutral', () => {
    const controls = makeGenerationControls({ ...before.controls, register: 'High' })
    const selection: PresetSelection = { kind: 'custom', baseId: 'neutral' }

    expect(chosenControlChanges(before, { ...before, controls, selection })).toEqual({
      'controls.register': 'High',
      presetSelection: { kind: 'custom', baseId: 'neutral' },
    })
  })

  it('holds each figure level a level edit changed, keyed by its figure', () => {
    const figureLevels = { ...NEUTRAL_FIGURE_LEVELS, appoggiatura: 'favored' } as const
    const selection: PresetSelection = { kind: 'custom', baseId: 'neutral' }

    expect(chosenControlChanges(before, { ...before, figureLevels, selection })).toEqual({
      'figureLevels.appoggiatura': 'favored',
      presetSelection: { kind: 'custom', baseId: 'neutral' },
    })
  })

  it('holds the controls and levels a Jazz choice changed, and Jazz selected', () => {
    const jazz = { controls: controlsOf('jazz'), figureLevels: JAZZ_FIGURE_LEVELS, selection: JAZZ }

    expect(chosenControlChanges(before, jazz)).toEqual({
      'controls.noteDensity': 'Eighth',
      'controls.syncopation': 'Occasional offbeats',
      'controls.silenceDensity': 'Conversational',
      'controls.contour': 'Wandering',
      'controls.register': 'Varying',
      'figureLevels.chromaticApproach': 'asToday',
      'figureLevels.chromaticEnclosure': 'asToday',
      presetSelection: JAZZ,
    })
  })

  it('writes Custom based on Jazz once, when the selection becomes it', () => {
    const jazz = { controls: controlsOf('jazz'), figureLevels: JAZZ_FIGURE_LEVELS, selection: JAZZ }
    const custom = { ...jazz, selection: { kind: 'custom', baseId: 'jazz' } as PresetSelection }

    expect(chosenControlChanges(jazz, custom)).toEqual({
      presetSelection: { kind: 'custom', baseId: 'jazz' },
    })
    expect(chosenControlChanges(custom, { ...custom })).toEqual({})
  })

  it('writes any preset or Custom selection that differs, Reel and Custom with no base included', () => {
    const reel = { ...before, controls: controlsOf('reel'), selection: REEL }
    const customReel = { ...reel, selection: { kind: 'custom', baseId: 'reel' } as PresetSelection }
    const noBase = { ...before, selection: { kind: 'custom', baseId: null } as PresetSelection }

    expect(chosenControlChanges(before, reel).presetSelection).toEqual(REEL)
    expect(chosenControlChanges(reel, customReel)).toEqual({
      presetSelection: customReel.selection,
    })
    expect(chosenControlChanges(before, noBase)).toEqual({ presetSelection: noBase.selection })
    expect(chosenControlChanges(noBase, before)).toEqual({ presetSelection: before.selection })
  })

  it('compares the selection by its kind and the preset it names', () => {
    const custom = {
      ...before,
      selection: { kind: 'custom', baseId: 'neutral' } as PresetSelection,
    }
    const sameAgain = { ...before, selection: { kind: 'preset', presetId: 'neutral' } as const }

    expect(chosenControlChanges(before, sameAgain)).toEqual({})
    expect(chosenControlChanges(custom, before)).toEqual({ presetSelection: before.selection })
    expect(chosenControlChanges(before, custom)).toEqual({ presetSelection: custom.selection })
  })
})
