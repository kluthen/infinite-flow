/**
 * The score panel while the last session's Review shows: the lazily loaded `ReviewPanel` (here
 * its stand-in) takes the staff area's place after the toolbar; the generation-failure banner, the
 * cue row and the score title are hidden, and the staff viewport stays laid out, out of sight and
 * inert; the panel is given the session's phrases, its instrument, the staff's viewport and
 * no-room state live, the page-session export choices, the export action, and the played-notes
 * tools (whether the session holds a played note, the Played notes switch held for the page
 * session and the played-notes export); both live regions stay silent while it shows and when it
 * closes; a session's start warms the panel's chunk.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, type Component } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { ExportRequest } from '@/components/review/review-types'
import type { ReviewExportPorts } from '@/components/workspace/review-export'
import type { ExportFile } from '@/export/generated-notes-file'
import { loadGeneratedNotesExport } from '@/export/load-generated-notes-export'
import type { GenerationSession } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { transportRig } from '../../audio/transport-rig'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  showingWith,
  type FakeSessionController,
} from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'

const loader = vi.hoisted(() => ({
  load: vi.fn<() => Promise<Component>>(),
  loadArea: vi.fn<() => Promise<Component>>(),
}))

// The confirmation sheet's real component, settling within one flush, as a warmed chunk does; the
// review area's real component the same way (imported below, once this mock is in place).
vi.mock('@/components/review/load-review-panel', async () => {
  const { default: sheet } = await import('@/components/workspace/ReviewConfirmationSheet.vue')
  return {
    loadReviewPanel: loader.load,
    loadReviewConfirmationSheet: () => Promise.resolve(sheet),
    loadReviewArea: loader.loadArea,
  }
})

beforeEach(async () => {
  // Imported up front, so the panel's and the area's loads settle within one flush, as warmed
  // chunks do.
  const { default: stub } = await import('./review-panel-stub')
  const { default: area } = await import('@/components/workspace/ReviewArea.vue')
  loader.load.mockReset()
  loader.load.mockImplementation(() => Promise.resolve(stub))
  loader.loadArea.mockReset()
  loader.loadArea.mockImplementation(() => Promise.resolve(area))
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** The staff's inputs in a desktop window. */
const WIDE_STAFF: StaffLayoutInputs = {
  containerWidthPx: 1100,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** Intent: export ports over the real lazy export code, recording each download. */
function recordingPorts() {
  const downloads: ExportFile[] = []
  const ports: ReviewExportPorts = {
    load: loadGeneratedNotesExport,
    download: (file) => downloads.push(file),
  }
  return { ports, downloads }
}

/** Intent: mount the panel over `session` and `fake`, attached so focus can move. */
function mountPanel(
  session: GenerationSession<WorkspaceSessionResult>,
  fake: FakeSessionController,
  reviewExportPorts: ReviewExportPorts = recordingPorts().ports,
) {
  return mount(ScorePanel, {
    props: {
      session,
      pendingPhrase: null,
      handleEngraved: vi.fn(),
      handleNotationError: vi.fn(),
      handleSessionStaffFailed: vi.fn(),
      handleLayoutInputs: vi.fn(),
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      controller: fake.controller,
      matchesPhoneLayout: () => false,
      reviewExportPorts,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

/** Intent: a fake controller whose Review of the recorded session shows, on the E-flat alto. */
function showingReview(): FakeSessionController {
  return createFakeSessionController({
    canStart: false,
    startBlocker: 'review_showing',
    ...showingWith(fakeReview(fakeReviewHistory(recordedRecords(), 'eb-alto'), true)),
  })
}

/** Intent: the Review panel's stand-in, mounted once its lazy load has settled. */
function reviewPanel(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.getComponent({ name: 'ReviewPanel' })
}

/** Intent: the class names of the score panel's children, in order. */
function panelChildren(wrapper: ReturnType<typeof mountPanel>): string[] {
  return [...wrapper.get('.score-panel').element.children].map((element) => element.className)
}

/** Intent: the text of both live regions. */
function liveRegions(wrapper: ReturnType<typeof mountPanel>) {
  return {
    generation: wrapper.get('.generation-status').text(),
    notation: wrapper.get('.notation-status').text(),
  }
}

// @test-link [[req_last_session_review]]
describe('ScorePanel while the Review shows', () => {
  // @test-link [[req_last_session_review]]
  it('renders nothing of the Review while it is kept, not showing', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()

    expect(panelChildren(wrapper)).toEqual(['score-toolbar', 'session-cue-row', 'staff-viewport'])
    expect(wrapper.findComponent({ name: 'ReviewPanel' }).exists()).toBe(false)
    expect(loader.load).not.toHaveBeenCalled()
    expect(loader.loadArea).not.toHaveBeenCalled()
  })

  // @test-link [[req_last_session_review]]
  it('puts the panel after the toolbar, hides the banner, cue row and title, and keeps the staff laid out out of sight', async () => {
    const { session } = fakeGenerationSession({ generationError: new Error('boom') })
    const fake = showingReview()
    const wrapper = mountPanel(session, fake)
    await flushPromises()

    expect(panelChildren(wrapper)).toEqual([
      'score-toolbar',
      'review-panel',
      'inline-alert alert-error',
      'session-cue-row',
      'staff-viewport is-out-of-sight',
    ])
    expect(wrapper.get('.score-panel > .inline-alert').attributes('hidden')).toBeDefined()
    expect(wrapper.get('.session-cue-row').attributes('hidden')).toBeDefined()
    expect(wrapper.get('#score-panel-title').attributes('hidden')).toBeDefined()
    expect(wrapper.get('.staff-viewport').attributes('inert')).toBeDefined()
    expect(wrapper.get('.staff-viewport').attributes('hidden')).toBeUndefined()
    expect(wrapper.findComponent({ name: 'PhraseScore' }).exists()).toBe(true)
    expect(wrapper.find('.mix-controls').exists()).toBe(true)

    fake.controller.closeReview()
    await nextTick()

    expect(panelChildren(wrapper)).toEqual([
      'score-toolbar',
      'inline-alert alert-error',
      'session-cue-row',
      'staff-viewport',
    ])
    expect(wrapper.get('.score-panel > .inline-alert').attributes('hidden')).toBeUndefined()
    expect(wrapper.get('.session-cue-row').attributes('hidden')).toBeUndefined()
    expect(wrapper.get('#score-panel-title').attributes('hidden')).toBeUndefined()
    expect(wrapper.get('.staff-viewport').attributes('inert')).toBeUndefined()
  })

  // @test-link [[req_last_session_review]]
  it("gives the panel the session's phrases and instrument, the staff's viewport, and its no-room state live", async () => {
    const { session, state } = fakeGenerationSession(readyState())
    const wrapper = mountPanel(session, showingReview())
    await flushPromises()

    expect(reviewPanel(wrapper).props()).toMatchObject({
      records: recordedRecords(),
      instrumentName: 'E-flat alto saxophone',
      viewport: null,
      noRoom: false,
    })

    wrapper.getComponent({ name: 'PhraseScore' }).vm.$emit('layout-inputs', WIDE_STAFF)
    state.roomNotice = 'no_room'
    await nextTick()

    expect(wrapper.props('handleLayoutInputs')).toHaveBeenCalledExactlyOnceWith(WIDE_STAFF)
    expect(reviewPanel(wrapper).props()).toMatchObject({
      viewport: WIDE_STAFF.viewport,
      noRoom: true,
    })

    state.roomNotice = 'notes_too_wide'
    await nextTick()
    expect(reviewPanel(wrapper).props('noRoom')).toBe(false)
  })

  // @test-link [[req_session_export]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('holds Format and Backing track for the page session, across a close and a reopening', async () => {
    const fake = showingReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    expect(reviewPanel(wrapper).props()).toMatchObject({ format: 'musicxml', backingTrack: false })

    reviewPanel(wrapper).vm.$emit('update:format', 'midi')
    reviewPanel(wrapper).vm.$emit('update:backingTrack', true)
    await nextTick()
    expect(reviewPanel(wrapper).props()).toMatchObject({ format: 'midi', backingTrack: true })

    fake.controller.closeReview()
    await nextTick()
    fake.controller.showReview()
    await flushPromises()

    expect(reviewPanel(wrapper).props()).toMatchObject({ format: 'midi', backingTrack: true })
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[rule_export_contents_never_merged]]
  it('gives the played-notes tools: the switch held across a close and a reopening, the played file its own', async () => {
    const { ports, downloads } = recordingPorts()
    const fake = showingReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake, ports)
    await flushPromises()
    expect(reviewPanel(wrapper).props()).toMatchObject({
      holdsPlayedNote: true,
      playedNotesShown: false,
    })

    reviewPanel(wrapper).vm.$emit('update:playedNotesShown', true)
    await nextTick()
    fake.controller.closeReview()
    await nextTick()
    fake.controller.showReview()
    await flushPromises()
    expect(reviewPanel(wrapper).props('playedNotesShown')).toBe(true)

    const exportPlayedNotes = reviewPanel(wrapper).props('exportPlayedNotes') as () => Promise<void>
    await exportPlayedNotes()
    expect(downloads.map((file) => file.fileName)).toEqual([
      expect.stringMatching(/^infinite-flow-\d{4}-\d{2}-\d{2}-\d{6}-played\.mid$/),
    ])
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('gives Include very short notes, held across a close and a reopening, and whether the file holds a note', async () => {
    const fake = showingReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    expect(reviewPanel(wrapper).props()).toMatchObject({
      includeVeryShortNotes: false,
      playedNotesUnavailable: null,
    })

    reviewPanel(wrapper).vm.$emit('update:includeVeryShortNotes', true)
    await nextTick()
    fake.controller.closeReview()
    await nextTick()
    fake.controller.showReview()
    await flushPromises()

    expect(reviewPanel(wrapper).props()).toMatchObject({
      includeVeryShortNotes: true,
      playedNotesUnavailable: null,
    })
  })

  // @test-link [[req_session_export]]
  it("exports the showing Review's history: one download, the same bytes each time", async () => {
    const { ports, downloads } = recordingPorts()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, showingReview(), ports)
    await flushPromises()
    const exportFile = reviewPanel(wrapper).props('exportFile') as (
      request: ExportRequest,
    ) => Promise<void>

    await exportFile({ format: 'midi', backingTrack: true, scope: 'wholeSession' })
    await exportFile({ format: 'midi', backingTrack: true, scope: 'wholeSession' })

    expect(downloads).toHaveLength(2)
    expect(downloads[0]?.fileName).toMatch(/^infinite-flow-\d{4}-\d{2}-\d{2}-\d{6}-generated\.mid$/)
    expect([...(downloads[1]?.bytes ?? [])]).toEqual([...(downloads[0]?.bytes ?? [])])
  })

  // @test-link [[req_session_export]]
  it('rejects the export, for the panel to show its error, when the export code fails to load', async () => {
    const failure = new Error('chunk failed to fetch')
    const ports: ReviewExportPorts = {
      load: () => Promise.reject(failure),
      download: vi.fn(),
    }
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, showingReview(), ports)
    await flushPromises()
    const exportFile = reviewPanel(wrapper).props('exportFile') as (
      request: ExportRequest,
    ) => Promise<void>

    const request = { format: 'musicxml', backingTrack: false, scope: 'wholeSession' } as const
    await expect(exportFile(request)).rejects.toBe(failure)
    expect(ports.download).not.toHaveBeenCalled()
  })

  // @test-link [[req_last_session_review]]
  it('keeps both live regions silent while the Review shows, and says nothing as it closes', async () => {
    const { session, state } = fakeGenerationSession(readyState())
    const fake = createFakeSessionController()
    const wrapper = mountPanel(session, fake)
    state.operation = 'generating'
    state.notationError = new Error('drawing failed')
    await nextTick()
    expect(liveRegions(wrapper)).toEqual({
      generation: 'Generating phrase',
      notation: 'Notation error. Try again.',
    })

    Object.assign(fake.state, showingWith(fakeReview(fakeReviewHistory(recordedRecords()), true)))
    await nextTick()
    expect(liveRegions(wrapper)).toEqual({ generation: '', notation: '' })

    state.operation = 'idle'
    state.notationError = null
    await nextTick()
    state.operation = 'generating'
    await nextTick()
    state.operation = 'idle'
    state.result = null
    state.roomNotice = 'no_room'
    state.roomNoticeAnnouncements += 1
    await flushPromises()
    state.notationError = new Error('drawing failed again')
    await flushPromises()
    expect(liveRegions(wrapper)).toEqual({ generation: '', notation: '' })

    fake.controller.closeReview()
    await flushPromises()
    expect(liveRegions(wrapper)).toEqual({ generation: '', notation: '' })

    state.notationError = null
    state.roomNotice = null
    state.operation = 'generating'
    await nextTick()
    expect(liveRegions(wrapper).generation).toBe('Generating phrase')
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[rule_session_start_conditions]]
  it("warms the area's and the panel's chunks when a session starts, without waiting on them", async () => {
    const fake = createFakeSessionController()
    mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    expect(loader.load).not.toHaveBeenCalled()
    expect(loader.loadArea).not.toHaveBeenCalled()

    fake.controller.start()
    await nextTick()

    expect(loader.load).toHaveBeenCalledTimes(1)
    expect(loader.loadArea).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_last_session_review]]
  it("fetches the panel's chunk as the Review shows, alongside the area's, not after it", async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()
    loader.loadArea.mockImplementation(() => new Promise(() => {}))

    fake.controller.showReview()
    await nextTick()

    expect(loader.loadArea).toHaveBeenCalledTimes(1)
    expect(loader.load).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_last_session_review]]
  it('passes Review last session on as a show-review request', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake)

    await wrapper.get('.review-link').trigger('click')

    expect(wrapper.emitted('show-review')).toHaveLength(1)
  })

  // @test-link [[req_last_session_review]]
  it('focuses review-title on request, once the lazily loaded panel has mounted', async () => {
    const fake = showingReview()
    fake.controller.closeReview()
    const wrapper = mountPanel(fakeGenerationSession(readyState()).session, fake)
    await flushPromises()

    fake.controller.showReview()
    ;(wrapper.vm as unknown as { focusReviewTitle: () => void }).focusReviewTitle()
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })
})
