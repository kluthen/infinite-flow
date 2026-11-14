/**
 * The Seventh chords level at the workspace's composition root: the workspace starts from the
 * level the load gave (Off on a first visit or a visit started from the defaults), and the Idle
 * result records the level its phrase was generated with, read at the generate seam with the
 * other chosen settings, the request built from the same level.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'
import { fakeDependencies, fakeSavedData, generateAndEngrave } from './fake-workspace-dependencies'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

// The fit and room checks plan through the lazy engraver loader; a fake planner answers here.
vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

// @test-link [[service_idle_generation_session]]
describe('composeWorkspaceSession: the Seventh chords level', () => {
  // @test-link [[service_idle_generation_session]]
  it('starts at Off, and phrase 1 generated at Off records Off', async () => {
    const workspace = composeWorkspaceSession(fakeDependencies())

    expect(workspace.session.state.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
    expect(await generateAndEngrave(workspace)).toBe(true)
    expect(workspace.session.state.result?.settings.chordFamilies).toEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[req_seventh_chords_level]]
  // @test-link [[service_idle_generation_session]]
  it('starts from the level the load gave, and phrase 1 is generated at it', async () => {
    const deps = {
      ...fakeDependencies(),
      savedData: fakeSavedData({
        chordFamilies: { 'seventh-chords': 'sometimes' },
        presetSelection: { kind: 'custom', baseId: 'neutral' },
      }),
    }
    const workspace = composeWorkspaceSession(deps)

    expect(workspace.session.state.chordFamilies).toEqual({ 'seventh-chords': 'sometimes' })
    expect(await generateAndEngrave(workspace)).toBe(true)
    expect(deps.generateMock.mock.calls.at(-1)?.[0].chordFamilies).toEqual({
      'seventh-chords': 'sometimes',
    })
  })

  // @test-link [[req_seventh_chords_level]]
  // @test-link [[rule_preset_load_values_win]]
  it('starts with a player preset holding Always selected at Always, the selection kept', () => {
    const mostly = makePreset({
      ...builtInPreset('neutral'),
      id: 'player-1',
      name: 'Neutral sevenths',
      chordFamilies: { 'seventh-chords': 'stronglyFavored' },
      kind: 'player',
    })
    const savedData = {
      ...fakeSavedData({
        chordFamilies: mostly.chordFamilies,
        presetSelection: { kind: 'preset', presetId: 'player-1' },
      }),
      playerPresets: [mostly],
    }
    const workspace = composeWorkspaceSession({ ...fakeDependencies(), savedData })

    expect(workspace.session.state.chordFamilies).toEqual({ 'seventh-chords': 'stronglyFavored' })
    expect(workspace.session.state.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
  })

  // @test-link [[service_idle_generation_session]]
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it("records in the Idle result the level phrase 1 was generated with, the request's own", async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    expect(workspace.session.actions.setChordFamilyLevel('seventh-chords', 'favored')).toBe(true)
    expect(await generateAndEngrave(workspace)).toBe(true)

    const result = workspace.session.state.result
    expect(result?.settings.chordFamilies).toEqual({ 'seventh-chords': 'favored' })
    expect(result?.intent.chordFamilies).toEqual({ 'seventh-chords': 'favored' })
    expect(deps.generateMock.mock.calls.at(-1)?.[0].chordFamilies).toEqual({
      'seventh-chords': 'favored',
    })
  })
})
