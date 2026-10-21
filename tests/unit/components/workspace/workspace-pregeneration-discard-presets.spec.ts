/**
 * The Idle pre-generation queue and the presets, each change made through the session's real
 * actions and the real player presets: choosing a preset whose values differ, or that moves the
 * key or mode, or whose restriction differs, any change of a figure's level, and any change of the
 * restriction in force (opting out, coming back inside, a save or a deletion that changes it),
 * Vary settings on or off, empty the queue. Saving, renaming or deleting a preset that changes
 * neither a setting nor the restriction in force, and choosing a preset identical in values and
 * restriction, keep it. No restriction in force and an "any" restriction count as one, as Start
 * takes them.
 */
import { describe, expect, it } from 'vitest'

import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import type { SessionSettings } from '@/session/session-types'
import { LATE_NIGHT, WARM_UP } from './player-presets-rig'
import {
  expectDiscarded,
  expectKept,
  MY_REEL,
  neutralCopy,
  presetRig,
  refill,
  settingsOf,
} from './pregeneration-presets-rig'

const NEUTRAL = builtInPreset('neutral')

/** Neutral's values in C Ionian, Neutral selected. */
const NEUTRAL_SELECTED = settingsOf(NEUTRAL, { kind: 'preset', presetId: 'neutral' })

/** Intent: My reel's values in C Mixolydian, selected as given. */
function myReelSettings(
  selection: PresetSelection = { kind: 'preset', presetId: MY_REEL.id },
): SessionSettings {
  return settingsOf(MY_REEL, selection, 'Mixolydian')
}

/** Intent: whether Vary settings is on, in words for a test title. */
function varyInWords(varySettings: boolean): string {
  return `Vary settings ${varySettings ? 'on' : 'off'}`
}

// @test-link [[rule_pregeneration_discarded_on_change]]
describe('Idle pre-generation queue and the presets: discards', () => {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('empties the queue on choosing a preset whose values differ', async () => {
    const { rig, actions } = await presetRig({ settings: NEUTRAL_SELECTED })

    await expectDiscarded(rig, () => actions.selectPreset('gentle'))
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('empties the queue on choosing a preset with the same values that moves the mode', async () => {
    const dorianOnly = neutralCopy('player-dorian', 'Dorian only', {
      keys: 'any',
      modes: ['Dorian'],
    })
    const { rig, actions } = await presetRig({
      settings: NEUTRAL_SELECTED,
      playerPresets: [dorianOnly],
    })

    await expectDiscarded(rig, () => actions.selectPreset(dorianOnly.id))
    expect(rig.idle.controls.collection).toBe('Dorian')
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it('empties the queue on choosing a preset with the same values whose restriction differs, the key and mode unmoved', async () => {
    const ionianOrDorian = neutralCopy('player-modes', 'Ionian or Dorian', {
      keys: 'any',
      modes: ['Ionian', 'Dorian'],
    })
    const { rig, actions } = await presetRig({
      settings: NEUTRAL_SELECTED,
      playerPresets: [ionianOrDorian],
    })
    const controls = rig.idle.controls

    await expectDiscarded(rig, () => actions.selectPreset(ionianOrDorian.id))
    expect(rig.idle.controls).toEqual(controls)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it("empties the queue on a change of a figure's level, a preset selected", async () => {
    const { rig, actions } = await presetRig({ settings: NEUTRAL_SELECTED })

    await expectDiscarded(rig, () => actions.setFigureLevel('appoggiatura', 'favored'))
    expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it("empties the queue on a change of a figure's level in Custom", async () => {
    const { rig, actions } = await presetRig({
      settings: settingsOf(NEUTRAL, { kind: 'custom', baseId: null }),
    })

    await expectDiscarded(rig, () => actions.setFigureLevel('passingTone', 'stronglyFavored'))
  })

  for (const varySettings of [true, false]) {
    // @test-link [[rule_pregeneration_discarded_on_change]]
    // @test-link [[rule_restriction_in_force]]
    it(`empties the queue on opting out of Reel's restriction, then on coming back inside (${varyInWords(varySettings)})`, async () => {
      const { rig, actions } = await presetRig({
        settings: settingsOf(
          builtInPreset('reel'),
          { kind: 'preset', presetId: 'reel' },
          'Mixolydian',
        ),
        varySettings,
      })

      await expectDiscarded(rig, () => actions.setControl('collection', 'Ionian'))
      expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: 'reel' })
      await refill(rig)

      await expectDiscarded(rig, () => actions.setControl('collection', 'Dorian'))
    })

    // @test-link [[rule_pregeneration_discarded_on_change]]
    // @test-link [[rule_restriction_in_force]]
    it(`empties the queue on saving changes that restrict a player preset to the key and mode now (${varyInWords(varySettings)})`, async () => {
      const { rig, actions, presets } = await presetRig({
        settings: myReelSettings(),
        playerPresets: [MY_REEL],
        varySettings,
      })
      await expectDiscarded(rig, () => actions.setControl('collection', 'Ionian'))
      await refill(rig)

      await expectDiscarded(rig, () => presets.saveChanges('onlyThisKeyAndMode'))
      expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: MY_REEL.id })
    })

    // @test-link [[rule_pregeneration_discarded_on_change]]
    // @test-link [[rule_restriction_in_force]]
    it(`empties the queue on deleting the selected player preset whose restriction is in force (${varyInWords(varySettings)})`, async () => {
      const { rig, presets } = await presetRig({
        settings: myReelSettings(),
        playerPresets: [MY_REEL],
        varySettings,
      })

      await expectDiscarded(rig, () => presets.deletePreset(MY_REEL.id))
      expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: null })
    })
  }

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it('empties the queue on saving as new restricted to the key and mode now, from any key and mode', async () => {
    const { rig, presets } = await presetRig({ settings: NEUTRAL_SELECTED })

    await expectDiscarded(rig, () => presets.saveAsNew('Mine', 'onlyThisKeyAndMode'))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
  })
})

// @test-link [[rule_pregeneration_discarded_on_change]]
describe('Idle pre-generation queue and the presets: keeps', () => {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on saving as new under any key and mode, from a preset allowing any', async () => {
    const { rig, presets } = await presetRig({ settings: NEUTRAL_SELECTED })

    await expectKept(rig, () => presets.saveAsNew('Mine', 'anyKeyAndMode'))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on saving changes that ask nothing, inside the restriction', async () => {
    const { rig, actions, presets } = await presetRig({
      settings: myReelSettings(),
      playerPresets: [MY_REEL],
    })
    await expectDiscarded(rig, () => actions.setControl('contour', 'Falling'))
    await refill(rig)
    expect(presets.saveChangesChoices.value).toBeNull()

    await expectKept(rig, () => presets.saveChanges())
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: MY_REEL.id })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on renaming the selected player preset', async () => {
    const { rig, presets } = await presetRig({
      settings: myReelSettings(),
      playerPresets: [MY_REEL],
    })

    await expectKept(rig, () => presets.rename('Reel two'))
    expect(presets.actedOn.value?.name).toBe('Reel two')
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it("keeps the queue on renaming Custom's base", async () => {
    const { rig, presets } = await presetRig({
      settings: myReelSettings({ kind: 'custom', baseId: MY_REEL.id }),
      playerPresets: [MY_REEL],
    })

    await expectKept(rig, () => presets.rename('Reel two'))
    expect(presets.actedOn.value?.name).toBe('Reel two')
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on deleting a player preset neither selected nor based on', async () => {
    const { rig, presets } = await presetRig({
      settings: NEUTRAL_SELECTED,
      playerPresets: [LATE_NIGHT, WARM_UP],
    })

    await expectKept(rig, () => presets.deletePreset(LATE_NIGHT.id))
    expect(presets.presets.value.map((preset) => preset.id)).not.toContain(LATE_NIGHT.id)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on choosing a preset identical in values and restriction', async () => {
    const { rig, actions } = await presetRig({
      settings: NEUTRAL_SELECTED,
      playerPresets: [WARM_UP],
    })

    await expectKept(rig, () => actions.selectPreset(WARM_UP.id))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: WARM_UP.id })
  })
})

// @test-link [[rule_pregeneration_discarded_on_change]]
// @test-link [[rule_restriction_in_force]]
describe('Idle pre-generation queue and the presets: no restriction in force counts as any', () => {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it("keeps the queue on choosing Neutral from Custom with no base holding Neutral's values", async () => {
    const { rig, actions } = await presetRig({
      settings: settingsOf(NEUTRAL, { kind: 'custom', baseId: null }),
    })

    await expectKept(rig, () => actions.selectPreset('neutral'))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it('keeps the queue on deleting the selected player preset that allows any key and mode', async () => {
    const { rig, presets } = await presetRig({
      settings: settingsOf(WARM_UP, { kind: 'preset', presetId: WARM_UP.id }),
      playerPresets: [WARM_UP],
    })

    await expectKept(rig, () => presets.deletePreset(WARM_UP.id))
    expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: null })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it('keeps the queue on saving as new under any key and mode from Custom with no base', async () => {
    const { rig, presets } = await presetRig({
      settings: settingsOf(NEUTRAL, { kind: 'custom', baseId: null }),
    })

    await expectKept(rig, () => presets.saveAsNew('Mine', 'anyKeyAndMode'))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_restriction_in_force]]
  it('keeps the queue on saving changes that let a player preset allow any key and mode, after opting out of it', async () => {
    const { rig, actions, presets } = await presetRig({
      settings: myReelSettings(),
      playerPresets: [MY_REEL],
    })
    await expectDiscarded(rig, () => actions.setControl('collection', 'Ionian'))
    await refill(rig)

    await expectKept(rig, () => presets.saveChanges('anyKeyAndMode'))
    expect(presets.actedOn.value?.restriction).toEqual(ANY_KEY_AND_MODE)
  })
})
