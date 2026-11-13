/**
 * The Idle session's Seventh chords level: held in its state beside the figure levels, first-load
 * Off, carried by every intent it builds, set by choosing a preset and kept by Regenerate, and
 * changed through the routing point's level action, which makes Custom like a figure level, is
 * refused while a generation is in flight, saves nothing (no record holds the level yet) and posts
 * no rhythm-domain prewarm.
 */
import { describe, expect, it } from 'vitest'

import { SessionUsageError } from '@/composables/use-generation-session'

import {
  OFF_CHORD_FAMILIES,
  type ChordFamilies,
  type ChordFamilyId,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset, type PresetSelection } from '@/domain/presets/preset-selection'
import {
  createDeferred,
  createFitSession,
  flushAsync,
  type FitSessionOptions,
} from './fit-session-harness'

const FAVORED: ChordFamilies = { 'seventh-chords': 'favored' }
const NEUTRAL: PresetSelection = { kind: 'preset', presetId: 'neutral' }

/** A player preset holding Neutral's values with the Seventh chords level at Often. */
const NEUTRAL_SEVENTHS: Preset = makePreset({
  id: 'player-7',
  name: 'Neutral sevenths',
  controls: builtInPreset('neutral').controls,
  levels: builtInPreset('neutral').levels,
  chordFamilies: FAVORED,
  restriction: { keys: 'any', modes: 'any' },
  kind: 'player',
})

/** Intent: a fit session started at Neutral, with the given level and player presets. */
function sessionAt(
  chordFamilies: ChordFamilies,
  options: FitSessionOptions = {},
  selection: PresetSelection = NEUTRAL,
) {
  return createFitSession({
    ...options,
    initialSettings: {
      controls: makeGenerationControls(DEFAULT_GENERATION_CONTROLS),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      chordFamilies,
      selection,
      playerPresets: [NEUTRAL_SEVENTHS],
      theme: 'System',
      myInstrument: null,
    },
  })
}

/** Intent: the level of the latest generated intent. */
function lastLevel(generated: readonly GenerationIntent[]): ChordFamilyLevel | undefined {
  return generated.at(-1)?.chordFamilies['seventh-chords']
}

// @test-link [[module_generation_request_construction]]
// @test-link [[module_generative_profile_selection]]
describe('createGenerationSession: the Seventh chords level at Idle', () => {
  // @test-link [[module_generation_request_construction]]
  it('starts at Off with no settings given, and the request built carries Off', async () => {
    const { session, generated } = createFitSession()

    expect(session.state.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    await session.actions.generate()
    await flushAsync()
    expect(lastLevel(generated)).toBe('off')
  })

  // @test-link [[module_generation_request_construction]]
  // @test-link [[module_generative_profile_selection]]
  it('starts from the level given, and every request built at Idle carries it, Regenerate and Retry included', async () => {
    let fail = true
    const { session, generated } = sessionAt(FAVORED, {
      generate: () => {
        if (!fail) return undefined
        fail = false
        return Promise.reject(new Error('failed once'))
      },
    })

    expect(session.state.chordFamilies).toEqual(FAVORED)
    await session.actions.generate()
    await flushAsync()
    expect(session.state.generationError).not.toBeNull()
    await session.actions.retryGeneration()
    await flushAsync()
    await session.actions.regenerate()
    await flushAsync()

    expect(generated.length).toBeGreaterThanOrEqual(3)
    expect(generated.every((intent) => intent.chordFamilies['seventh-chords'] === 'favored')).toBe(
      true,
    )
  })

  // @test-link [[rule_choosing_preset_sets_its_settings]]
  // @test-link [[module_generative_profile_selection]]
  it("choosing a preset sets the level to the preset's, the request built next carries it, and Regenerate keeps it", async () => {
    const { session, generated } = sessionAt(OFF_CHORD_FAMILIES)

    expect(session.actions.selectPreset('player-7')).toBe(true)
    expect(session.state.chordFamilies).toEqual(FAVORED)
    await session.actions.generate()
    await flushAsync()
    expect(lastLevel(generated)).toBe('favored')
    await session.actions.regenerate()
    await flushAsync()
    expect(lastLevel(generated)).toBe('favored')
    expect(session.state.chordFamilies).toEqual(FAVORED)

    expect(session.actions.selectPreset('jazz')).toBe(true)
    expect(session.state.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    await session.actions.regenerate()
    await flushAsync()
    expect(lastLevel(generated)).toBe('off')
  })

  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('choosing a preset that differs from the current settings only in the level sets the level, and saves the selection alone', () => {
    const { session, saves } = sessionAt(OFF_CHORD_FAMILIES)

    expect(session.actions.selectPreset('player-7')).toBe(true)

    expect(session.state.chordFamilies).toEqual(FAVORED)
    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'player-7' })
    expect(saves.at(-1)).toEqual({ presetSelection: { kind: 'preset', presetId: 'player-7' } })
  })
})

// @test-link [[module_profile_control_customization]]
describe('createGenerationSession: the routing point changes the Seventh chords level', () => {
  // @test-link [[module_profile_control_customization]]
  // @test-link [[rule_custom_selection]]
  it('a level change at Idle sets the level, makes Custom based on the selected preset, and saves nothing', async () => {
    const { session, saves, generated } = sessionAt(OFF_CHORD_FAMILIES)

    expect(session.actions.setChordFamilyLevel('seventh-chords', 'stronglyFavored')).toBe(true)

    expect(session.state.chordFamilies).toEqual({ 'seventh-chords': 'stronglyFavored' })
    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(saves).toEqual([])
    await session.actions.generate()
    await flushAsync()
    expect(lastLevel(generated)).toBe('stronglyFavored')
  })

  // @test-link [[module_profile_control_customization]]
  // @test-link [[rule_custom_selection]]
  it('in Custom a level change keeps Custom with the same base', () => {
    const { session } = sessionAt(OFF_CHORD_FAMILIES, {}, { kind: 'custom', baseId: 'jazz' })

    expect(session.actions.setChordFamilyLevel('seventh-chords', 'sometimes')).toBe(true)

    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'jazz' })
  })

  // @test-link [[module_profile_control_customization]]
  it('is refused while a generation is in flight, the level and selection unchanged', async () => {
    const pending = createDeferred<GenerationIntent>()
    const { session, saves } = sessionAt(OFF_CHORD_FAMILIES, { generate: () => pending.promise })

    void session.actions.generate()
    await flushAsync()
    expect(session.state.operation).toBe('generating')
    expect(session.actions.setChordFamilyLevel('seventh-chords', 'favored')).toBe(false)

    expect(session.state.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    expect(session.state.selection).toEqual(NEUTRAL)
    expect(saves).toEqual([])
  })

  // @test-link [[module_profile_control_customization]]
  it('refuses a family or a level that is not one as a defect', () => {
    const { session } = sessionAt(OFF_CHORD_FAMILIES)

    expect(() =>
      session.actions.setChordFamilyLevel('ninth-chords' as ChordFamilyId, 'favored'),
    ).toThrow(SessionUsageError)
    expect(() =>
      session.actions.setChordFamilyLevel('seventh-chords', 'always' as ChordFamilyLevel),
    ).toThrow(SessionUsageError)
    expect(session.state.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[module_generation_prewarm]]
  it('a level change posts no rhythm-domain prewarm, and the prewarm intent holds Off', () => {
    const posted: GenerationIntent[] = []
    const { session } = sessionAt(FAVORED, { prewarm: (intent) => posted.push(intent) })

    expect(posted).toHaveLength(1)
    expect(posted[0]!.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    expect(session.actions.setChordFamilyLevel('seventh-chords', 'off')).toBe(true)
    expect(session.actions.setChordFamilyLevel('seventh-chords', 'stronglyFavored')).toBe(true)

    expect(posted).toHaveLength(1)
  })
})
