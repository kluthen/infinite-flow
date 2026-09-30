/**
 * The score panel's generation-status region when a run is stopped at once by a width crossing
 * that blocks the rhythm combination: the run ends on Empty, with no phrase to call ready.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { TOO_WIDE } from '../../composables/fake-staff-fit'
import { createTestWorkspace, PHRASE_SCORE_STUB, type TestWorkspace } from './test-workspace'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/**
 * Intent: a workspace below `bp-tablet-landscape` under the combination blocked from it up, whose
 * generate call number `heldCall` waits until the test calls `release`.
 */
function heldWorkspace(heldCall: number) {
  let calls = 0
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const workspace = createTestWorkspace(async (intent: GenerationIntent) => {
    calls += 1
    if (calls === heldCall) await held
    return buildWorkspaceSessionResult(intent.requestId, intent.seed)
  })
  workspace.viewport.setWithoutNotifying(true)
  for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED)) {
    workspace.session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value)
  }
  return { workspace, release: () => release() }
}

/** Intent: mount the panel on the workspace, with no phrase pending (no attempt is ever drawn). */
function mountPanel(workspace: TestWorkspace) {
  return mount(ScorePanel, {
    props: {
      session: workspace.session,
      pendingPhrase: null,
      handleEngraved: workspace.handleEngraved,
      handleNotationError: workspace.handleNotationError,
      handleLayoutInputs: workspace.handleLayoutInputs,
      matchesPhoneLayout: () => false,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB } },
  })
}

/** Intent: record every text a live region shows, in order, as a screen reader would hear them. */
function recordTexts(element: Element): string[] {
  const texts: string[] = []
  new MutationObserver(() => texts.push(element.textContent?.trim() ?? '')).observe(element, {
    childList: true,
    characterData: true,
    subtree: true,
  })
  return texts
}

// @test-link [[module_idle_fit_round]]
// @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
describe('ScorePanel generation status for a run stopped by a blocking crossing', () => {
  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('never announces "Phrase ready" when a round under the notice stops to Empty', async () => {
    const { workspace, release } = heldWorkspace(5)
    const wrapper = mountPanel(workspace)
    const status = wrapper.get('.generation-status')
    workspace.staff.setFallbackFit(TOO_WIDE)
    await workspace.session.actions.generate()
    await flushPromises()
    expect(workspace.session.state.roomNotice).toBe('notes_too_wide')
    const announced = recordTexts(status.element)

    const round = workspace.session.actions.regenerate()
    await flushPromises()
    expect(workspace.session.state.operation).toBe('generating')
    workspace.viewport.cross(false)
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-empty')
    expect(status.text()).toBe('')
    release()
    await round
    await flushPromises()
    expect(announced).toEqual(['Generating phrase', ''])
    expect(status.text()).toBe('')
  })

  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('never announces "Phrase ready" when a first generation from Empty stops', async () => {
    const { workspace, release } = heldWorkspace(1)
    const wrapper = mountPanel(workspace)
    const announced = recordTexts(wrapper.get('.generation-status').element)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    workspace.viewport.cross(false)
    release()
    await generated
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-empty')
    expect(announced).toEqual(['Generating phrase', ''])
  })
})
