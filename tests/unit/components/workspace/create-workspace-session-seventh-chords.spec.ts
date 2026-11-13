/**
 * The Seventh chords level at the workspace's composition root: the workspace starts at Off (no
 * record holds the level before data version 5), and the Idle result records the level its phrase
 * was generated with, read at the generate seam with the other chosen settings, the request built
 * from the same level.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composeWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { resetFakeEngraver } from '../../notation/fake-vexflow-engraver-loader'
import { fakeDependencies, generateAndEngrave } from './fake-workspace-dependencies'

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
