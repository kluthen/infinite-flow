/**
 * The Review panel's phrases on a fake engraver: each `review-staff` reserves the workspace
 * staff's system positions before anything is engraved; phrases are engraved lazily as they come
 * near the visible area and released far from it, so a 2 000-phrase review engraves (and writes
 * out) only the phrases near the window; a phrase that cannot be drawn shows its note, the
 * "wider window" one retried on a width change; a repeat looks like any other phrase; and nothing
 * of the session (start marker, playhead, acknowledged or played notes) is ever drawn on the staff
 * or handed to the engraver, even with the played-notes lanes on (the lanes themselves are covered
 * in ReviewPhrase-played-notes.spec.ts).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { NotationError } from '@/notation/notation-error'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { SessionHistoryRecord } from '@/session/session-history'
import { fakePhraseEngraver, resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import {
  deliverIntersections,
  deliverResize,
  intersectionObservers,
  itemsWithin,
  longHistory,
  page,
  recordedRecords,
  stubReviewBrowser,
} from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))
vi.mock('@/domain/notation/written-phrase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/notation/written-phrase')>()
  return { ...actual, transformToWrittenPhrase: vi.fn(actual.transformToWrittenPhrase) }
})

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }
const SPLIT: StaffViewport = { layout: 'split', heightBudgetPx: 300 }

const mounted: VueWrapper[] = []

/**
 * Intent: mount the panel on the given records and viewport, attached to the document, its
 * played-notes tools shown when the records hold a played note and its lanes off unless asked.
 */
function mountPanel(
  records: readonly SessionHistoryRecord[],
  viewport: StaffViewport | null = ONE_SYSTEM,
  playedNotesShown = false,
) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records,
      instrumentName: 'B-flat tenor saxophone',
      startedAt: 0,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport,
      noRoom: false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: () => Promise.resolve(),
      holdsPlayedNote: records.some((record) => record.playedNotes.length > 0),
      playedNotesShown,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/**
 * Intent: let every engraving the panel scheduled run to the end: rounds of a timer turn (the
 * panel's turn between two engravings) and settled promises, until three rounds engrave nothing.
 */
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

/** Intent: scroll the page to put `index` at the top of the window, then deliver what changed. */
async function scrollToItem(index: number): Promise<void> {
  page.scrollTopPx = index * page.itemHeightPx
  deliverIntersections()
  await settle()
}

/** Intent: the phrase numbers the fake engraver was called for, in call order. */
function engravedPhraseNumbers(): number[] {
  return fakePhraseEngraver.engraveWrittenPhrase.mock.calls.map((call) => call[2])
}

/** Intent: the items of the list holding an engraving now. */
function engravedItems(wrapper: VueWrapper): number[] {
  const items = (wrapper.element as Element).querySelectorAll<HTMLElement>('.review-phrase')
  return Array.from(items).flatMap((item, index) =>
    item.querySelector('.staff-svg') === null ? [] : [index],
  )
}

const transformSpy = vi.mocked(transformToWrittenPhrase)

beforeEach(() => {
  stubReviewBrowser()
  resetFakePhraseEngraver()
  transformSpy.mockClear()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// @test-link [[req_last_session_review]]
describe('the review staff reservation', () => {
  // @test-link [[req_last_session_review]]
  it('reserves one system position at the workspace size from the breakpoint up, blank before engraving', () => {
    const wrapper = mountPanel(recordedRecords())
    const staff = wrapper.get('.review-staff')
    const positions = staff.findAll('[data-system-position]')

    expect(positions).toHaveLength(1)
    expect((positions[0]!.element as HTMLElement).style.getPropertyValue('block-size')).toBe(
      '192px',
    )
    expect((staff.element as HTMLElement).style.getPropertyValue('block-size')).toBe('192px')
    expect(staff.find('.staff-content').exists()).toBe(false)
    expect(fakePhraseEngraver.engraveWrittenPhrase).not.toHaveBeenCalled()
  })

  // @test-link [[req_last_session_review]]
  it('reserves two positions in the split layout, sized in the height budget', () => {
    const wrapper = mountPanel(recordedRecords(), SPLIT)
    const staff = wrapper.get('.review-staff')
    const positions = staff.findAll('[data-system-position]')

    expect(
      positions.map((p) => (p.element as HTMLElement).style.getPropertyValue('block-size')),
    ).toEqual(['150px', '150px'])
    expect((staff.element as HTMLElement).style.getPropertyValue('block-size')).toBe('300px')
  })

  // @test-link [[req_last_session_review]]
  it('engraves nothing without a viewport, then the near phrases once one comes', async () => {
    const wrapper = mountPanel(recordedRecords(), null)
    deliverIntersections()
    await settle()
    expect(fakePhraseEngraver.engraveWrittenPhrase).not.toHaveBeenCalled()

    await wrapper.setProps({ viewport: ONE_SYSTEM })
    await settle()
    expect(engravedPhraseNumbers()).toEqual([1, 2, 3])
  })
})

// @test-link [[req_last_session_review]]
describe('engraving the review phrases', () => {
  // @test-link [[req_last_session_review]]
  it('engraves each near phrase into staff-content in its reserved positions, with no animation class', async () => {
    const wrapper = mountPanel(recordedRecords(), SPLIT)
    deliverIntersections()
    await settle()

    const positions = wrapper.findAll('.review-phrase')[0]!.findAll('[data-system-position]')
    expect(
      positions.map((p) => p.findAll(':scope > .staff-content > svg.staff-svg').length),
    ).toEqual([1, 1])
    const call = fakePhraseEngraver.engraveWrittenPhrase.mock.calls[0]!
    expect(call[2]).toBe(1)
    expect(call[3]).toBe(page.listWidthPx)
    expect(call[4]).toEqual(SPLIT)
    expect(wrapper.find('.is-fading-out').exists()).toBe(false)
  })

  // @test-link [[req_last_session_review]]
  it('engraves a phrase at its own session phrase number and from its stored timeline', async () => {
    const records = recordedRecords()
    mountPanel(records)
    deliverIntersections()
    await settle()

    expect(transformSpy).toHaveBeenCalledTimes(3)
    const phrases = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.map((call) => call[1])
    records.forEach((record, index) => {
      expect(phrases[index]!.measures).toHaveLength(4)
      expect(transformSpy.mock.results[index]!.value).toBe(phrases[index])
      expect(transformSpy.mock.calls[index]![0].timeline).toBe(record.outcome.result.timeline)
    })
  })

  // @test-link [[req_last_session_review]]
  it('says a phrase needs a wider window when its notes do not fit, and retries it on a width change', async () => {
    fakePhraseEngraver.engraveWrittenPhrase.mockImplementationOnce(() => {
      throw new NotationError('notation_notes_too_wide', 'too wide', {})
    })
    const wrapper = mountPanel(recordedRecords().slice(0, 1))
    deliverIntersections()
    await settle()

    const staff = wrapper.get('.review-staff')
    expect(staff.get('p.review-phrase-note').text()).toBe('This phrase needs a wider window.')
    expect(staff.find('.staff-content').exists()).toBe(false)
    expect((staff.element as HTMLElement).style.getPropertyValue('block-size')).toBe('192px')

    page.listWidthPx = 1200
    deliverResize()
    await settle()
    expect(staff.find('.review-phrase-note').exists()).toBe(false)
    expect(staff.findAll('.staff-svg')).toHaveLength(1)
    expect(fakePhraseEngraver.engraveWrittenPhrase.mock.calls.at(-1)![3]).toBe(1200)
  })

  // @test-link [[req_last_session_review]]
  it('says a phrase needs a wider window when the staff has no room at this width', async () => {
    fakePhraseEngraver.engraveWrittenPhrase.mockImplementationOnce(() => {
      throw new NotationError('notation_no_room', 'no room', {})
    })
    const wrapper = mountPanel(recordedRecords().slice(0, 1))
    deliverIntersections()
    await settle()
    expect(wrapper.get('.review-phrase-note').text()).toBe('This phrase needs a wider window.')
  })

  // @test-link [[req_last_session_review]]
  it("says a phrase couldn't be drawn on any other failure, and does not retry it on a width change", async () => {
    fakePhraseEngraver.engraveWrittenPhrase.mockImplementationOnce(() => {
      throw new NotationError('notation_engraving_failed', 'vexflow failed', {})
    })
    const wrapper = mountPanel(recordedRecords().slice(0, 1))
    deliverIntersections()
    await settle()
    expect(wrapper.get('.review-phrase-note').text()).toBe("This phrase couldn't be drawn.")

    page.listWidthPx = 1200
    deliverResize()
    await settle()
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.review-phrase-note').text()).toBe("This phrase couldn't be drawn.")
  })

  // @test-link [[req_last_session_review]]
  it("says every near phrase couldn't be drawn when the engraver fails to load", async () => {
    const { loadVexflowEngraver } = await import('../notation/fake-phrase-engraver')
    loadVexflowEngraver.mockRejectedValue(
      new NotationError('notation_engraving_failed', 'chunk failed', {}),
    )
    const wrapper = mountPanel(recordedRecords())
    deliverIntersections()
    await settle()
    expect(wrapper.findAll('.review-phrase-note').map((note) => note.text())).toEqual([
      "This phrase couldn't be drawn.",
      "This phrase couldn't be drawn.",
      "This phrase couldn't be drawn.",
    ])
  })

  // @test-link [[req_last_session_review]]
  it('re-engraves the engraved phrases when the viewport changes', async () => {
    const wrapper = mountPanel(recordedRecords())
    deliverIntersections()
    await settle()
    await wrapper.setProps({ viewport: SPLIT })
    await settle()

    expect(engravedPhraseNumbers()).toEqual([1, 2, 3, 1, 2, 3])
    expect(wrapper.findAll('.review-phrase')[0]!.findAll('.staff-svg')).toHaveLength(2)
  })

  // @test-link [[req_last_session_review]]
  it('observes the items with a near and a far margin, and stops observing when unmounted', () => {
    const wrapper = mountPanel(recordedRecords())
    expect(intersectionObservers.map((observer) => observer.rootMargin).sort()).toEqual([
      '100% 0px',
      '300% 0px',
    ])
    intersectionObservers.forEach((observer) => expect(observer.observed.size).toBe(3))
    wrapper.unmount()
    mounted.splice(0)
    intersectionObservers.forEach((observer) => expect(observer.disconnected).toBe(true))
  })
})

// @test-link [[rule_repeat_phrase_marked_internally_only]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
// @test-link [[rule_optional_midi_privacy]]
describe('what the review never shows', () => {
  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('renders a repeat exactly like any other phrase', async () => {
    const records = recordedRecords()
    expect(records[1]!.isRepeat).toBe(true)
    const wrapper = mountPanel(records)
    deliverIntersections()
    await settle()

    const markup = wrapper.findAll('.review-phrase').map((item) => item.html())
    const normalise = (html: string, n: number): string =>
      html.replaceAll(`Phrase ${n}`, 'Phrase N').replace(/data-note-id="\d+:/gu, 'data-note-id="N:')
    expect(normalise(markup[1]!, 2)).toBe(normalise(markup[0]!, 1))
    expect(wrapper.html()).not.toMatch(/repeat/iu)
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  // @test-link [[rule_optional_midi_privacy]]
  it('draws no start marker, playhead, acknowledgement or played note on the staff, nor hands them to the engraver, though the records hold them and the lanes are on', async () => {
    const records = recordedRecords()
    expect(records.every((record) => record.acknowledgements.length > 0)).toBe(true)
    expect(records.every((record) => record.playedNotes.length > 0)).toBe(true)
    const wrapper = mountPanel(records, ONE_SYSTEM, true)
    deliverIntersections()
    await settle()

    expect(wrapper.findAll('.staff-svg')).toHaveLength(3)
    expect(wrapper.findAll('.played-notes-lane')).toHaveLength(3)
    expect(wrapper.find('.start-note-marker, .playhead-band, .note-ack').exists()).toBe(false)
    // The engraver is handed the stored phrase only, never the played notes or acknowledgements.
    fakePhraseEngraver.engraveWrittenPhrase.mock.calls.forEach((call) =>
      expect(Object.keys(call[1]).sort()).toEqual(
        Object.keys(transformSpy.mock.results[0]!.value as object).sort(),
      ),
    )
    expect(transformSpy.mock.calls.every((call) => !('playedNotes' in call[0]))).toBe(true)
    const staffMarkup = wrapper.findAll('.staff-content').map((content) => content.html())
    expect(staffMarkup).toHaveLength(3)
    staffMarkup.forEach((html) => expect(html).not.toMatch(/played|velocity|acknowledg/iu))
  })
})

// @test-link [[req_last_session_review]]
describe('a review of 2 000 phrases', () => {
  // @test-link [[req_last_session_review]]
  it('engraves and writes out only the phrases near the window as it scrolls, and releases the far ones', async () => {
    const records = longHistory(2000)
    const wrapper = mountPanel(records)
    expect(wrapper.findAll('.review-list > li.review-phrase')).toHaveLength(2000)

    // At the top, three items show; the near area adds one window height below: items 0 to 5.
    deliverIntersections()
    await settle()
    expect(engravedPhraseNumbers()).toEqual([1, 2, 3, 4, 5, 6])
    expect(transformSpy).toHaveBeenCalledTimes(6)
    expect(engravedItems(wrapper)).toEqual([0, 1, 2, 3, 4, 5])

    // At item 1 000, items 997 to 1005 are near; everything from the top is released.
    await scrollToItem(1000)
    expect(itemsWithin(1, 2000)).toEqual([997, 998, 999, 1000, 1001, 1002, 1003, 1004, 1005])
    expect(
      engravedPhraseNumbers()
        .slice(6)
        .sort((a, b) => a - b),
    ).toEqual([998, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006])
    expect(engravedItems(wrapper)).toEqual(itemsWithin(1, 2000))

    // At the end, items 1994 to 1999 are near.
    await scrollToItem(2000 - 3)
    expect(engravedPhraseNumbers()).toHaveLength(6 + 9 + 6)
    expect(transformSpy).toHaveBeenCalledTimes(21)
    expect(engravedItems(wrapper)).toEqual([1994, 1995, 1996, 1997, 1998, 1999])
    expect(wrapper.findAll('.staff-svg').length).toBeLessThanOrEqual(itemsWithin(1, 2000).length)
  }, 30_000)

  // @test-link [[req_last_session_review]]
  it('scrolling one item at a time, engraves each phrase once and keeps only the retained window engraved', async () => {
    // Far enough for the first items to leave the retained window (more than 3 heights away).
    const STEPS = 24
    const wrapper = mountPanel(longHistory(2000))
    deliverIntersections()
    await settle()
    let maxEngraved = 0
    for (let index = 1; index <= STEPS; index++) {
      await scrollToItem(index)
      const engraved = engravedItems(wrapper)
      const retained = itemsWithin(3, 2000)
      engraved.forEach((item) => expect(retained).toContain(item))
      itemsWithin(1, 2000).forEach((item) => expect(engraved).toContain(item))
      maxEngraved = Math.max(maxEngraved, engraved.length)
    }

    // The first items went more than three window heights away and were released.
    expect(engravedItems(wrapper)[0]).toBe(STEPS - 9)
    const calls = engravedPhraseNumbers()
    expect(new Set(calls).size).toBe(calls.length)
    expect(calls).toHaveLength(STEPS + 6)
    expect(maxEngraved).toBeLessThanOrEqual(itemsWithin(3, 2000).length)
  }, 30_000)
})
