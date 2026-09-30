import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { FIT_NO_ROOM } from '../../composables/fake-staff-fit'
import {
  ENGRAVED_PAYLOAD,
  mountHarness,
  phraseScore,
  reachTooManyNotesNotice,
} from './score-panel-harness'
import { createTestWorkspace, useCheapControls } from './test-workspace'

const EMPTY_INSTRUCTION = 'Generate a phrase to begin.'

/** Intent: the empty instruction's text on the staff, or null when it is not shown. */
function emptyInstruction(wrapper: ReturnType<typeof mountHarness>): string | null {
  const copy = wrapper.find('.phrase-score-stub .staff-empty-copy')
  return copy.exists() ? copy.text() : null
}

// @test-link [[rule_staff_needs_room_notice]]
describe('ScorePanel empty instruction', () => {
  // @test-link [[rule_staff_needs_room_notice]]
  it('shows the instruction in the Empty state', () => {
    const wrapper = mountHarness(createTestWorkspace())

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-empty')
    expect(emptyInstruction(wrapper)).toBe(EMPTY_INSTRUCTION)
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('keeps the instruction through the first Loading, while no phrase is shown yet', async () => {
    let releaseGenerate: () => void = () => undefined
    const workspace = createTestWorkspace(async (intent) => {
      await new Promise<void>((resolve) => {
        releaseGenerate = resolve
      })
      return buildWorkspaceSessionResult(intent.requestId, intent.seed)
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-loading')
    expect(phraseScore(wrapper).$props).toMatchObject({ phrase: null })
    expect(emptyInstruction(wrapper)).toBe(EMPTY_INSTRUCTION)

    releaseGenerate()
    await flushPromises()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await generated
    await flushPromises()
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('hides the instruction under the no-room notice', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    workspace.staff.queueFit(FIT_NO_ROOM)
    const wrapper = mountHarness(workspace)

    await workspace.session.actions.generate()
    await flushPromises()

    expect(workspace.session.state.roomNotice).toBe('no_room')
    expect(emptyInstruction(wrapper)).toBeNull()
  })

  // @test-link [[rule_staff_needs_room_notice]]
  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('hides the instruction under the too-many-notes notice, idle and during a round under it', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)
    await reachTooManyNotesNotice(workspace)

    expect(emptyInstruction(wrapper)).toBeNull()

    const round = workspace.session.actions.regenerate()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-loading')
    expect(emptyInstruction(wrapper)).toBeNull()
    await round
    await flushPromises()
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('hides the instruction while a phrase is shown', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    expect(phraseScore(wrapper).$props).not.toMatchObject({ phrase: null })
    expect(emptyInstruction(wrapper)).toBeNull()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await generated
    await flushPromises()

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')
    expect(emptyInstruction(wrapper)).toBeNull()
  })
})
