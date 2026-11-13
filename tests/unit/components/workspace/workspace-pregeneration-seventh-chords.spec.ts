/**
 * The Idle pre-generation queue and session mode's Seventh chords level, each change made through
 * the session's real actions: a level change through the routing point, at Idle (a preset selected
 * or in Custom) and while a review shows, discards every prepared phrase, as a figure level does,
 * the queue then preparing at the new level; choosing a preset that differs only in the level
 * discards them, and choosing one identical in every value, the level included, keeps them.
 */
import { describe, expect, it } from 'vitest'

import type { ChordFamilies } from '@/domain/chords/chord-families'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'
import { flush, inFlight } from './pregeneration-rig'
import { expectDiscarded, expectKept, presetRig, settingsOf } from './pregeneration-presets-rig'

const FAVORED: ChordFamilies = { 'seventh-chords': 'favored' }

/** Intent: a player preset holding Neutral's values and any key and mode, at the given level. */
function neutralAtLevel(id: string, name: string, chordFamilies: ChordFamilies): Preset {
  return makePreset({ ...builtInPreset('neutral'), id, name, chordFamilies, kind: 'player' })
}

/** Neutral's values with seventh chords Often, as a player keeps them. */
const NEUTRAL_SEVENTHS = neutralAtLevel('player-sevenths', 'Neutral sevenths', FAVORED)

/** The same values and level under another name. */
const NEUTRAL_SEVENTHS_COPY = neutralAtLevel('player-sevenths-2', 'Neutral sevenths 2', FAVORED)

/** Neutral's values in C Ionian at Off, Neutral selected. */
const NEUTRAL_SELECTED = settingsOf(builtInPreset('neutral'), {
  kind: 'preset',
  presetId: 'neutral',
})

// @test-link [[rule_pregeneration_discarded_on_change]]
// @test-link [[module_idle_pregeneration_queue]]
describe('Idle pre-generation queue and the Seventh chords level', () => {
  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('empties the queue on a level change at Idle, a preset selected, and prepares again at the new level', async () => {
    const { rig, actions } = await presetRig({ settings: NEUTRAL_SELECTED })

    await expectDiscarded(rig, () => actions.setChordFamilyLevel('seventh-chords', 'favored'))
    expect(rig.idle.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(inFlight(rig).intent.chordFamilies).toEqual(FAVORED)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('empties the queue on a level change in Custom, Vary settings on', async () => {
    const { rig, actions } = await presetRig({
      settings: settingsOf(builtInPreset('neutral'), { kind: 'custom', baseId: 'neutral' }),
      varySettings: true,
    })

    await expectDiscarded(rig, () =>
      actions.setChordFamilyLevel('seventh-chords', 'stronglyFavored'),
    )
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('drops the prepared phrases on a level change while a review shows, preparing again from phrase 2 at the new level once it closes', async () => {
    const { rig, actions } = await presetRig({ settings: NEUTRAL_SELECTED })
    rig.blocker.value = 'review_showing'
    await flush()
    const stopped = rig.calls.length

    expect(actions.setChordFamilyLevel('seventh-chords', 'favored')).toBe(true)
    await flush()
    expect(rig.calls).toHaveLength(stopped)
    expect(rig.queue.take('one-system')).toEqual([])

    rig.blocker.value = null
    await flush()
    expect(rig.calls).toHaveLength(stopped + 1)
    expect(inFlight(rig).intent.carryIn).toMatchObject({ phraseNumber: 1 })
    expect(inFlight(rig).intent.chordFamilies).toEqual(FAVORED)
    expect(rig.queue.take('one-system')).toEqual([])
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('empties the queue on choosing a preset that differs from the current settings only in the level', async () => {
    const { rig, actions } = await presetRig({
      settings: NEUTRAL_SELECTED,
      playerPresets: [NEUTRAL_SEVENTHS],
    })

    await expectDiscarded(rig, () => actions.selectPreset(NEUTRAL_SEVENTHS.id))
    expect(rig.idle.chordFamilies).toEqual(FAVORED)
    expect(inFlight(rig).intent.chordFamilies).toEqual(FAVORED)
  })

  // @test-link [[rule_pregeneration_discarded_on_change]]
  it('keeps the queue on choosing a preset identical in every value, the level included', async () => {
    const { rig, actions } = await presetRig({
      settings: settingsOf(NEUTRAL_SEVENTHS, { kind: 'preset', presetId: NEUTRAL_SEVENTHS.id }),
      playerPresets: [NEUTRAL_SEVENTHS, NEUTRAL_SEVENTHS_COPY],
    })

    await expectKept(rig, () => actions.selectPreset(NEUTRAL_SEVENTHS_COPY.id))
    expect(rig.idle.selection).toEqual({ kind: 'preset', presetId: NEUTRAL_SEVENTHS_COPY.id })
  })
})
