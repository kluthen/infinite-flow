/**
 * A session started with a player preset selected, through the session controller over real
 * runners: the restriction in force is that player preset's, judged against the presets Idle
 * knows, and the session that ended is reviewed and kept under that preset's name. On the fake
 * audio clock at 240 BPM from 5 s: phrase 1 starts sounding at 6.1 s.
 */
import { describe, expect, it, vi } from 'vitest'

import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import {
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  type Preset,
  type PresetHeldControls,
} from '@/domain/presets/preset-selection'
import type { KeptSessionSummaryRecord } from '@/storage/records/kept-session-record'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'

/**
 * Intent: a rig whose Idle knows a player preset holding its own controls and levels, Dorian or
 * its own mode only, and has it selected; the player preset is returned with it.
 */
function rigWithPlayerPreset(): { readonly rig: ControllerRig; readonly preset: Preset } {
  const rig = controllerRig()
  const controls = Object.fromEntries(
    PRESET_HELD_CONTROL_KEYS.map((key) => [key, rig.idle.controls[key]]),
  ) as unknown as PresetHeldControls
  const preset = makePreset({
    id: 'player-1',
    name: 'Late night',
    controls,
    levels: rig.idle.figureLevels,
    restriction: { keys: 'any', modes: [rig.idle.controls.collection, 'Dorian'] },
    kind: 'player',
  })
  rig.idle.presets = [...BUILT_IN_PRESETS, preset]
  rig.idle.selection = { kind: 'preset', presetId: 'player-1' }
  return { rig, preset }
}

/** Intent: start a session, using phrase 1 as it is when the start asks. */
function start(rig: ControllerRig): void {
  if (rig.controller.start() === 'asked') expect(rig.controller.useStalePhrase()).toBe(true)
}

// @test-link [[rule_restriction_in_force]]
// @test-link [[rule_preset_label_kept_with_session]]
describe('session controller: a session started with a player preset selected', () => {
  // @test-link [[rule_restriction_in_force]]
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  it("freezes that player preset's restriction in the session's settings", () => {
    const { rig, preset } = rigWithPlayerPreset()

    start(rig)

    const settings = rig.runnerInputs.at(-1)?.start.settings
    expect(settings?.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
    expect(settings?.restriction).toStrictEqual(preset.restriction)
  })

  // @test-link [[rule_preset_label_kept_with_session]]
  // @test-link [[module_kept_session_save]]
  it("is reviewed and kept under that player preset's name", async () => {
    const { rig } = rigWithPlayerPreset()
    start(rig)
    await playTo(rig, 6.6)
    rig.controller.stop()

    expect(rig.controller.state.review?.presetLabel).toBe('Late night')
    await vi.waitFor(() => expect(rig.sessionSaves).toHaveLength(1))
    const summary = rig.sessionSaves[0]!([]).find(
      (change) => change.kind === 'write' && change.store === 'sessionSummaries',
    )
    if (summary?.kind !== 'write') throw new Error('the save wrote no session-wide record')
    expect((summary.record as KeptSessionSummaryRecord).presetLabel).toBe('Late night')
  })
})
