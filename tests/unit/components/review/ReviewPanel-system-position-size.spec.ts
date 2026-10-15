/**
 * The Review's phrases in the workspace staff's shared system-position size: each phrase reserves
 * its positions at that size and is engraved in it, and a new size re-engraves the phrases near
 * the window. From the breakpoint up a position is its size times the 1.2 maximum scale: 170
 * units give 204 px, 200 give 240. On the fake engraver.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import { fakePhraseEngraver, resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import {
  deliverIntersections,
  recordedRecords,
  stubReviewBrowser,
  SESSION_TOOL_PROPS,
} from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }

const mounted: VueWrapper[] = []

/** Intent: mount the panel on the recorded phrases at the given size, attached to the document. */
function mountPanel(systemPositionUnits: number) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records: recordedRecords(),
      instrumentName: 'B-flat tenor saxophone',
      startedAt: 0,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport: ONE_SYSTEM,
      noRoom: false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: () => Promise.resolve(),
      holdsPlayedNote: false,
      playedNotesShown: false,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      includeVeryShortNotes: false,
      ...SESSION_TOOL_PROPS,
      systemPositionUnits,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: let every scheduled engraving run: timer turns and settled promises, until it rests. */
async function settle(): Promise<void> {
  let calls = -1
  let stableRounds = 0
  while (stableRounds < 3) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushPromises()
    const now = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.length
    stableRounds = now === calls ? stableRounds + 1 : 0
    calls = now
  }
}

/** Intent: the first review staff's position block sizes. */
function blockSizes(wrapper: VueWrapper): string[] {
  return wrapper
    .get('.review-staff')
    .findAll('[data-system-position]')
    .map((position) => (position.element as HTMLElement).style.getPropertyValue('block-size'))
}

beforeEach(() => {
  stubReviewBrowser()
  resetFakePhraseEngraver()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// @test-link [[req_last_session_review]]
// @test-link [[module_notation_layout_preflight]]
describe('the Review in the shared system-position size', () => {
  it('reserves and engraves each phrase in the size it is given', async () => {
    const wrapper = mountPanel(170)
    expect(blockSizes(wrapper)).toEqual(['204px'])

    deliverIntersections()
    await settle()

    const calls = fakePhraseEngraver.engraveWrittenPhrase.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every((call) => call[5] === 170)).toBe(true)
  })

  it('re-reserves and re-engraves the near phrases when the size changes', async () => {
    const wrapper = mountPanel(170)
    deliverIntersections()
    await settle()
    const engravedBefore = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.length

    await wrapper.setProps({ systemPositionUnits: 200 })
    await settle()

    expect(blockSizes(wrapper)).toEqual(['240px'])
    const later = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.slice(engravedBefore)
    expect(later.length).toBeGreaterThan(0)
    expect(later.every((call) => call[5] === 200)).toBe(true)
  })
})
