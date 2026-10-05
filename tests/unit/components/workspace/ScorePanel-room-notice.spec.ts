import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { FIT_NO_ROOM, FITS, TOO_WIDE } from '../../composables/fake-staff-fit'
import {
  ENGRAVED_PAYLOAD,
  mountHarness,
  phraseScore,
  reachTooManyNotesNotice,
} from './score-panel-harness'
import { createTestWorkspace, useCheapControls } from './test-workspace'

const WIDE_SENTENCE = 'The staff needs more room. Make the window larger.'
const NARROW_SENTENCE = 'This screen is too small to show the staff.'
const TOO_MANY_NOTES_SENTENCE =
  'These notes need more room. Make the window larger, or choose a lower note density.'

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

// @test-link [[rule_staff_needs_room_notice]]
// @test-link [[module_idle_room_notice]]
describe('ScorePanel room notice', () => {
  // @test-link [[module_idle_fit_round]]
  it("forwards PhraseScore's layout-inputs to the workspace", () => {
    const workspace = createTestWorkspace()
    const wrapper = mountHarness(workspace)
    const inputs: StaffLayoutInputs = {
      containerWidthPx: 900,
      viewport: { layout: 'one-system', heightBudgetPx: null },
    }

    phraseScore(wrapper).$emit('layout-inputs', inputs)

    expect(workspace.layoutReports).toEqual([inputs])
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('shows the no-room notice in place of the score: both sentences, the reserved positions kept, no error copy', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    workspace.staff.queueFit(FIT_NO_ROOM)
    const wrapper = mountHarness(workspace)

    await workspace.session.actions.generate()
    await flushPromises()

    const frame = wrapper.get('.staff-frame')
    expect(frame.classes()).toContain('staff-no-room')
    expect(frame.classes()).not.toContain('staff-loading')
    expect(frame.classes()).not.toContain('staff-error')
    expect(phraseScore(wrapper).$props).toMatchObject({ phrase: null })
    const notice = wrapper.get('.phrase-score-stub p.room-notice')
    expect(notice.attributes('tabindex')).toBe('-1')
    expect(notice.get('span.room-notice-wide').text()).toBe(WIDE_SENTENCE)
    expect(notice.get('span.room-notice-narrow').text()).toBe(NARROW_SENTENCE)
    expect(wrapper.find('.staff-frame .alert-error').exists()).toBe(false)
    expect(wrapper.find('.staff-empty-copy').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Notation error')
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('shows the too-many-notes notice as its own sentence, with no no-room span', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    await reachTooManyNotesNotice(workspace)

    expect(wrapper.get('.staff-frame').classes()).toContain('staff-no-room')
    const notice = wrapper.get('p.room-notice')
    expect(notice.attributes('tabindex')).toBe('-1')
    expect(notice.text()).toBe(TOO_MANY_NOTES_SENTENCE)
    expect(notice.find('span').exists()).toBe(false)
    expect(wrapper.find('.staff-frame .alert-error').exists()).toBe(false)
    expect(wrapper.find('.staff-empty-copy').exists()).toBe(false)
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('announces the wide no-room sentence from the tablet-landscape width up', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    workspace.staff.queueFit(FIT_NO_ROOM)
    const wrapper = mountHarness(workspace, false)

    await workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.notation-status').text()).toBe(WIDE_SENTENCE)
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('announces the narrow no-room sentence below the tablet-landscape width', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    workspace.staff.queueFit(FIT_NO_ROOM)
    const wrapper = mountHarness(workspace, true)

    await workspace.session.actions.generate()
    await flushPromises()

    expect(wrapper.get('.notation-status').text()).toBe(NARROW_SENTENCE)
  })

  // @test-link [[rule_staff_needs_room_notice]]
  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('dims the notice during a round under it, and announces it again when every attempt is too wide', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)
    await reachTooManyNotesNotice(workspace)
    expect(wrapper.get('.notation-status').text()).toBe(TOO_MANY_NOTES_SENTENCE)
    const announced = recordTexts(wrapper.get('.notation-status').element)

    const round = workspace.session.actions.regenerate()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.staff-frame').classes()).toEqual(
      expect.arrayContaining(['staff-no-room', 'staff-loading']),
    )
    expect(wrapper.get('p.room-notice').text()).toBe(TOO_MANY_NOTES_SENTENCE)
    await round
    await flushPromises()

    expect(workspace.session.state.roomNoticeAnnouncements).toBe(2)
    expect(wrapper.get('.staff-frame').classes()).not.toContain('staff-loading')
    expect(announced.at(-2)).toBe('')
    expect(announced.at(-1)).toBe(TOO_MANY_NOTES_SENTENCE)
  })

  // @test-link [[rule_staff_notice_gives_way_to_new_phrase]]
  it('clears the notice silently once a phrase that fits lands', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)
    await reachTooManyNotesNotice(workspace)
    workspace.staff.setFallbackFit(FITS)

    const round = workspace.session.actions.regenerate()
    await flushPromises()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await round
    await flushPromises()

    expect(workspace.session.state.roomNotice).toBeNull()
    expect(wrapper.find('.room-notice').exists()).toBe(false)
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-ready')
    expect(wrapper.get('.notation-status').text()).toBe('')
    expect(wrapper.get('.generation-status').text()).toBe('Phrase ready')
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('never shows or announces a notation error when a draw finds no room for the staff', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    phraseScore(wrapper).$emit(
      'notation-error',
      new NotationError('notation_no_room', 'no room for the staff', {}),
    )
    await generated
    await flushPromises()

    expect(workspace.session.state.roomNotice).toBe('no_room')
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-no-room')
    expect(wrapper.find('.staff-frame .alert-error').exists()).toBe(false)
    expect(wrapper.get('.notation-status').text()).toBe(WIDE_SENTENCE)
    expect(wrapper.text()).not.toContain('Notation error')
  })

  // @test-link [[module_idle_fit_round]]
  // @test-link [[rule_idle_phrase_too_dense_is_replaced]]
  it('announces "Generating phrase" once and "Phrase ready" once across a run of several attempts', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    // Attempt 1 is too wide by the check, attempt 2 passes it but its draw is too wide, attempt 3 lands.
    workspace.staff.queueFit(TOO_WIDE, FITS, FITS)
    const wrapper = mountHarness(workspace)
    const announced = recordTexts(wrapper.get('.generation-status').element)

    const generated = workspace.session.actions.generate()
    await flushPromises()
    phraseScore(wrapper).$emit(
      'notation-error',
      new NotationError('notation_notes_too_wide', 'too wide', {}),
    )
    await flushPromises()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await generated
    await flushPromises()

    expect(workspace.session.state.result?.intent.seed).toBe(3)
    expect(announced).toEqual(['Generating phrase', 'Phrase ready'])
  })

  // @test-link [[module_idle_fit_round]]
  it('does not announce "Phrase ready" for a run that ends in the notice', async () => {
    const workspace = createTestWorkspace()
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)
    const announced = recordTexts(wrapper.get('.generation-status').element)

    await reachTooManyNotesNotice(workspace)

    expect(announced).toEqual(['Generating phrase', ''])
  })

  // @test-link [[module_idle_room_notice]]
  // @test-link [[rule_idle_phrase_too_dense_is_replaced]]
  it('shows a Loading with no score and no notice when the phrase on screen stops fitting', async () => {
    let call = 0
    let releaseReplacement: () => void = () => undefined
    const workspace = createTestWorkspace(async (intent) => {
      call += 1
      if (call === 2) {
        await new Promise<void>((resolve) => {
          releaseReplacement = resolve
        })
      }
      return buildWorkspaceSessionResult(intent.requestId, intent.seed)
    })
    useCheapControls(workspace.session)
    const wrapper = mountHarness(workspace)
    const generated = workspace.session.actions.generate()
    await flushPromises()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await generated

    phraseScore(wrapper).$emit(
      'notation-error',
      new NotationError('notation_notes_too_wide', 'too wide after a resize', {}),
    )
    await flushPromises()

    const frame = wrapper.get('.staff-frame')
    expect(workspace.session.state.operation).toBe('generating')
    expect(frame.classes()).toContain('staff-loading')
    expect(frame.classes()).not.toContain('staff-no-room')
    expect(phraseScore(wrapper).$props).toMatchObject({ phrase: null })
    expect(wrapper.find('.room-notice').exists()).toBe(false)
    // As in v1, the instruction shows whenever no phrase is shown and no notice holds the staff.
    expect(wrapper.get('.staff-empty-copy').text()).toBe('Generate a phrase to begin.')
    expect(wrapper.find('.staff-frame .alert-error').exists()).toBe(false)

    releaseReplacement()
    await flushPromises()
    phraseScore(wrapper).$emit('engraved', ENGRAVED_PAYLOAD)
    await flushPromises()
  })
})
