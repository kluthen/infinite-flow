/**
 * The pre-generation preset specs' shared rig: the pre-generation rig's orchestrator over an Idle
 * state the session's real control actions and the real player presets composable change (its
 * saves faked), started from given settings and player presets with phrase 1 generated under
 * them, its queue holding phrases 2 to 5, and the two checks every row ends with: the queue was
 * discarded, or kept.
 */
import { expect } from 'vitest'

import { usePlayerPresets, type PlayerPresets } from '@/components/workspace/use-player-presets'
import {
  createControlActions,
  type ControlActions,
} from '@/composables/generation-session-control-actions'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'
import { makeSeed } from '@/domain/random/seed'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import {
  answerAll,
  flush,
  idlePhraseFor,
  inFlight,
  pregenerationRig,
  takenNumbers,
  type PregenerationRig,
} from './pregeneration-rig'
import { fakePresetSaves } from './player-presets-rig'
import { sessionSettings } from '../../session/session-harness'

/** The session seed every phrase 1 of this rig is published with. */
const PRESET_RIG_SESSION_SEED = makeSeed(69)

/** A player copy of Reel: its values, the modes Mixolydian and Dorian only. */
export const MY_REEL: Preset = makePreset({
  ...builtInPreset('reel'),
  id: 'player-reel',
  name: 'My reel',
  kind: 'player',
})

/** Intent: a player preset holding Neutral's values under `restriction`. */
export function neutralCopy(id: string, name: string, restriction: Preset['restriction']): Preset {
  return makePreset({ ...builtInPreset('neutral'), id, name, restriction, kind: 'player' })
}

/** Intent: the settings `preset` holds in C, the mode its own, else Ionian, selected as given. */
export function settingsOf(
  preset: Preset,
  selection: SessionSettings['selection'],
  collection: SessionSettings['controls']['collection'] = 'Ionian',
): SessionSettings {
  return {
    controls: sessionSettings({ tempo: 60, ...preset.controls, tonalCenter: 'C', collection })
      .controls,
    figureLevels: preset.levels,
    selection,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
  }
}

/** The pre-generation rig with the real session actions and player presets over its Idle state. */
export interface PresetPregenerationRig {
  readonly rig: PregenerationRig
  readonly actions: ControlActions
  readonly presets: PlayerPresets
}

/** What a preset rig starts from. */
export interface PresetRigStart {
  readonly settings: SessionSettings
  readonly playerPresets?: readonly Preset[]
  readonly varySettings?: boolean
}

/**
 * Intent: the rig at Idle under `start`'s settings and player presets, phrase 1 generated under
 * them, Vary settings as asked (off unless said), its queue holding phrases 2 to 5.
 */
export async function presetRig(start: PresetRigStart): Promise<PresetPregenerationRig> {
  const { settings } = start
  const rig = pregenerationRig({ controls: settings.controls })
  const actions = createControlActions({
    state: rig.idle,
    readNoteDensityContext: () => rig.idle.noteDensityContext,
    prewarmCurrentRhythmSetting: () => undefined,
    afterGenerationSettingChange: () => undefined,
    saveSettings: () => undefined,
    presets: () => rig.idle.presets,
  })
  let ids = 0
  const presets = usePlayerPresets({
    session: { state: rig.idle, actions },
    controllerPhase: () => 'idle',
    savingOff: () => false,
    saves: fakePresetSaves().saves,
    nextPresetId: () => `new-${String(++ids)}`,
    tellRefusedSave: () => undefined,
  })
  actions.replacePlayerPresets(start.playerPresets ?? [], settings.selection)
  rig.idle.figureLevels = settings.figureLevels
  rig.idle.result = {
    ...idlePhraseFor(settings.controls, 11, PRESET_RIG_SESSION_SEED),
    settings,
  }
  rig.varySettings.value = start.varySettings ?? false
  await refill(rig)
  return { rig, actions, presets }
}

/** Intent: let the queue fill again: phrases 2 to 5 ready, nothing failed, nothing in flight. */
export async function refill(rig: PregenerationRig): Promise<void> {
  await flush()
  await answerAll(rig)
  expect(rig.failures).toEqual([])
  expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
}

/**
 * Intent: `change` empties the full queue: one new attempt, for phrase 2 from phrase 1, in
 * flight, and Start takes nothing.
 */
export async function expectDiscarded(rig: PregenerationRig, change: () => unknown): Promise<void> {
  const full = rig.calls.length
  await change()
  await flush()
  expect(rig.failures).toEqual([])
  expect(rig.calls).toHaveLength(full + 1)
  expect(inFlight(rig).intent.carryIn).toMatchObject({ phraseNumber: 1 })
  expect(rig.queue.take('one-system')).toEqual([])
}

/** Intent: `change` keeps the full queue: no new attempt, and Start takes the same phrases. */
export async function expectKept(rig: PregenerationRig, change: () => unknown): Promise<void> {
  const full = rig.calls.length
  const before = rig.queue.take('one-system')
  expect(before.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
  await change()
  await flush()
  expect(rig.failures).toEqual([])
  expect(rig.calls).toHaveLength(full)
  expect(rig.queue.take('one-system')).toEqual(before)
}
