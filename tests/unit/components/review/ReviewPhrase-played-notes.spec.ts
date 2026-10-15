/**
 * A Review phrase's played-notes lanes on the fake engraver (which reports tick-spaced anchors):
 * none while Played notes is off; one lane per reserved position while on, named for its phrase
 * (and its bars in the split layout), not focusable; a bar per played note placed by the lane
 * geometry and shifted by its system's offset; every bar alike, matched or not; dividers only in an
 * empty lane; the lanes' block space reserved whether drawn, blank or replaced by the phrase's note;
 * the lanes drawn on toggling without engraving again, blanked on release; and the engraver handed
 * the same thing whether the lanes are on or off.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPhrase from '@/components/review/ReviewPhrase.vue'
import {
  playedNotesLanes,
  playedNotesPitchScale,
  type PlayedNotesPitchScale,
} from '@/components/review/played-notes-lane-geometry'
import type { ReviewStaffReservation } from '@/components/review/review-types'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { NotationError } from '@/notation/notation-error'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import { fakePhraseEngraver, resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords } from './review-fixtures'

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }
const SPLIT: StaffViewport = { layout: 'split', heightBudgetPx: 300 }
const ONE_POSITION: ReviewStaffReservation = { positionCount: 1, positionBlockPx: 192 }
const TWO_POSITIONS: ReviewStaffReservation = { positionCount: 2, positionBlockPx: 150 }

/** Each system SVG starts this far into its reserved position (and so into its lane). */
const SVG_LEFT_PX = 57
const POSITION_LEFT_PX = 12
const OFFSET_PX = SVG_LEFT_PX - POSITION_LEFT_PX

const STYLE_NAMES = ['inset-inline-start', 'inline-size', '--played-note-pitch']

const mounted: VueWrapper[] = []

/** The props a test may override; the rest take the defaults below. */
interface PhraseOptions {
  readonly record?: SessionHistoryRecord
  readonly split?: boolean
  readonly playedNotesShown?: boolean
  readonly pitchScale?: PlayedNotesPitchScale | null
}

/** Intent: the session's first recorded phrase (240 BPM: one beat is 0.25 s). */
function firstRecord(): SessionHistoryRecord {
  return recordedRecords()[0]!
}

/** Intent: the first record holding the given played notes, `[onset, release]` in beats. */
function recordPlaying(
  notes: readonly (readonly [number, number, number?])[],
): SessionHistoryRecord {
  const record = firstRecord()
  const secondsPerBeat = 60 / record.tempo
  const playedNotes: RecordedPlayedNote[] = notes.map(([onset, release, pitch = 61]) => ({
    pitch: makeConcertPitch(pitch),
    velocity: 80,
    onsetAt: record.startedAt + onset * secondsPerBeat,
    releaseAt: record.startedAt + release * secondsPerBeat,
  }))
  return { ...record, playedNotes }
}

/** Intent: mount one phrase, attached to the document; the lanes are on unless asked otherwise. */
function mountPhrase(options: PhraseOptions = {}) {
  const record = options.record ?? firstRecord()
  const split = options.split ?? false
  const wrapper = mount(ReviewPhrase, {
    props: {
      record,
      viewport: split ? SPLIT : ONE_SYSTEM,
      reservation: split ? TWO_POSITIONS : ONE_POSITION,
      playedNotesShown: options.playedNotesShown ?? true,
      pitchScale:
        options.pitchScale === undefined
          ? playedNotesPitchScale(recordedRecords())
          : options.pitchScale,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: the mounted phrase's exposed API. */
function api(wrapper: VueWrapper): InstanceType<typeof ReviewPhrase> {
  return wrapper.vm as unknown as InstanceType<typeof ReviewPhrase>
}

/** Intent: engrave the mounted phrase on the fake engraver. */
async function engrave(wrapper: VueWrapper): Promise<void> {
  await api(wrapper).engrave(fakePhraseEngraver)
  await wrapper.vm.$nextTick()
}

/** Intent: the lanes, top first. */
function lanes(wrapper: VueWrapper): HTMLElement[] {
  return Array.from(
    (wrapper.element as Element).querySelectorAll<HTMLElement>('.played-notes-lane'),
  )
}

/** Intent: the review staff's inline block size. */
function staffBlockSize(wrapper: VueWrapper): string {
  return (wrapper.get('.review-staff').element as HTMLElement).style.getPropertyValue('block-size')
}

/** Intent: the lanes the geometry draws for the last engraving, for this record. */
function expectedLanes(record: SessionHistoryRecord, scale: PlayedNotesPitchScale) {
  const call = fakePhraseEngraver.engraveWrittenPhrase.mock.calls.at(-1)!
  const result = fakePhraseEngraver.engraveWrittenPhrase.mock.results.at(-1)!
  if (result.type !== 'return') throw new Error('The last engraving did not return.')
  return playedNotesLanes({ record, phrase: call[1], anchors: result.value.measureAnchors, scale })
}

/** Intent: an element's inline style property names, in order. */
function styleNames(element: HTMLElement): string[] {
  return Array.from({ length: element.style.length }, (_, i) => element.style.item(i))
}

beforeEach(() => {
  resetFakePhraseEngraver()
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('staff-svg')) return new DOMRect(SVG_LEFT_PX, 0, 600, 80)
    if (this.hasAttribute('data-system-position')) return new DOMRect(POSITION_LEFT_PX, 0, 800, 80)
    return new DOMRect(0, 0, 0, 0)
  })
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

// @test-link [[rule_review_played_notes_toggle]]
// @test-link [[module_review_played_notes_lane]]
describe('the played-notes lanes of a review phrase', () => {
  // @test-link [[rule_review_played_notes_toggle]]
  it('renders no lane and reserves no lane space while Played notes is off', async () => {
    const wrapper = mountPhrase({ playedNotesShown: false })
    await engrave(wrapper)

    expect(lanes(wrapper)).toHaveLength(0)
    expect(wrapper.findAll('.played-note, .played-notes-divider')).toHaveLength(0)
    expect(staffBlockSize(wrapper)).toBe('192px')
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[module_review_played_notes_lane]]
  it('follows each reserved position with one named, non-focusable lane, in both layouts', async () => {
    const one = mountPhrase()
    await engrave(one)
    const split = mountPhrase({ split: true })
    await engrave(split)

    expect(lanes(one).map((lane) => lane.getAttribute('aria-label'))).toEqual([
      'Played notes, phrase 1',
    ])
    expect(lanes(split).map((lane) => lane.getAttribute('aria-label'))).toEqual([
      'Played notes, phrase 1, bars 1–2',
      'Played notes, phrase 1, bars 3–4',
    ])
    for (const wrapper of [one, split]) {
      const children = Array.from(wrapper.get('.review-staff').element.children)
      expect(
        children.map((child) => child.getAttribute('data-system-position') ?? child.className),
      ).toEqual(
        wrapper === one
          ? ['top', 'played-notes-lane']
          : ['top', 'played-notes-lane', 'bottom', 'played-notes-lane'],
      )
      lanes(wrapper).forEach((lane) => {
        expect(lane.getAttribute('role')).toBe('img')
        expect(lane.hasAttribute('tabindex')).toBe(false)
        expect(lane.textContent).toBe('')
      })
    }
  })

  // @test-link [[module_review_played_notes_lane]]
  it('draws a bar per played note at the geometry place, shifted by its system offset', async () => {
    const record = recordPlaying([
      [0, 1, 55],
      [2.5, 3.25, 61],
      [3.5, 5.5, 67],
      // A sixteenth note: short, and still drawn (a note under 38 ms never is).
      [9, 9.25, 64],
    ])
    const scale = playedNotesPitchScale([record])!
    const wrapper = mountPhrase({ record, pitchScale: scale })
    await engrave(wrapper)

    const [lane] = expectedLanes(record, scale)
    expect(lane!.bars).toHaveLength(4)
    const bars = wrapper.findAll<HTMLElement>('.played-notes-lane > .played-note')
    expect(bars.map((bar) => bar.element.style.getPropertyValue('inset-inline-start'))).toEqual(
      lane!.bars.map((bar) => `${OFFSET_PX + bar.startPx}px`),
    )
    expect(bars.map((bar) => bar.element.style.getPropertyValue('inline-size'))).toEqual(
      lane!.bars.map((bar) => `${bar.sizePx}px`),
    )
    expect(bars.map((bar) => bar.element.style.getPropertyValue('--played-note-pitch'))).toEqual([
      '0',
      '0.5',
      '1',
      '0.75',
    ])
    const dividers = wrapper.findAll<HTMLElement>('.played-notes-lane > .played-notes-divider')
    expect(dividers.map((divider) => divider.element.style.cssText)).toEqual(
      lane!.dividersPx.map((px) => `inset-inline-start: ${OFFSET_PX + px}px;`),
    )
  })

  // @test-link [[module_review_played_notes_lane]]
  it('draws a note crossing the split layout break in both lanes', async () => {
    const record = recordPlaying([[7, 9]])
    const wrapper = mountPhrase({ record, split: true })
    await engrave(wrapper)

    expect(lanes(wrapper).map((lane) => lane.querySelectorAll('.played-note').length)).toEqual([
      1, 1,
    ])
    expect(
      lanes(wrapper).map((lane) => lane.querySelectorAll('.played-notes-divider').length),
    ).toEqual([1, 1])
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('draws a matched and an unmatched note exactly alike, with no text, velocity or mark', async () => {
    const base = recordPlaying([
      [0, 1, 61],
      [1.37, 1.9, 50],
    ])
    expect(base.acknowledgements.length).toBeGreaterThan(0)
    const wrapper = mountPhrase({ record: base, pitchScale: playedNotesPitchScale([base]) })
    await engrave(wrapper)

    const bars = Array.from(lanes(wrapper)[0]!.querySelectorAll<HTMLElement>('.played-note'))
    expect(bars).toHaveLength(2)
    bars.forEach((bar) => {
      expect(bar.getAttributeNames().sort()).toEqual(['class', 'style'])
      expect(bar.className).toBe('played-note')
      expect(styleNames(bar)).toEqual(STYLE_NAMES)
      expect(bar.textContent).toBe('')
    })
    expect(lanes(wrapper)[0]!.outerHTML).not.toMatch(/match|ack|velocity|wrong|right/iu)
  })

  // @test-link [[module_review_played_notes_lane]]
  it('shows only the dividers in the lane of a phrase where nothing was played', async () => {
    const wrapper = mountPhrase({ record: recordPlaying([]) })
    await engrave(wrapper)

    const [lane] = lanes(wrapper)
    expect(lane!.querySelectorAll('.played-note')).toHaveLength(0)
    expect(lane!.querySelectorAll('.played-notes-divider')).toHaveLength(3)
    expect(lane!.textContent).toBe('')
  })

  // @test-link [[module_review_played_notes_lane]]
  it('reserves each lane and its gap while on, drawn, before drawing and with the note', async () => {
    const reserved = (positions: string, n: number) =>
      `calc(${positions} + ${n} * (var(--played-notes-lane-block-size) + var(--spacing-2)))`
    const drawn = mountPhrase({ split: true })
    expect(staffBlockSize(drawn)).toBe(reserved('300px', 2))
    await engrave(drawn)
    expect(staffBlockSize(drawn)).toBe(reserved('300px', 2))

    fakePhraseEngraver.engraveWrittenPhrase.mockImplementationOnce(() => {
      throw new NotationError('notation_notes_too_wide', 'too wide', {})
    })
    const noted = mountPhrase()
    await engrave(noted)
    expect(noted.find('.review-phrase-note').exists()).toBe(true)
    expect(lanes(noted)).toHaveLength(0)
    expect(staffBlockSize(noted)).toBe(reserved('192px', 1))
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[module_review_played_notes_lane]]
  it('draws the lanes at once when switched on after engraving, without engraving again', async () => {
    const wrapper = mountPhrase({ playedNotesShown: false })
    await engrave(wrapper)
    const staffMarkup = wrapper.get('.staff-content').html()
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ playedNotesShown: true })
    expect(lanes(wrapper)).toHaveLength(1)
    expect(lanes(wrapper)[0]!.querySelectorAll('.played-note')).toHaveLength(1)
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.staff-content').html()).toBe(staffMarkup)

    await wrapper.setProps({ playedNotesShown: false })
    expect(lanes(wrapper)).toHaveLength(0)
    expect(wrapper.get('.staff-content').html()).toBe(staffMarkup)
  })

  // @test-link [[module_review_played_notes_lane]]
  it('blanks the lanes on release, keeping their space, and draws them again with the engraving', async () => {
    const wrapper = mountPhrase({ split: true })
    await engrave(wrapper)
    const size = staffBlockSize(wrapper)
    expect(wrapper.findAll('.played-notes-divider').length).toBeGreaterThan(0)

    api(wrapper).release()
    await wrapper.vm.$nextTick()
    expect(lanes(wrapper)).toHaveLength(2)
    lanes(wrapper).forEach((lane) => expect(lane.children).toHaveLength(0))
    expect(staffBlockSize(wrapper)).toBe(size)

    await engrave(wrapper)
    expect(wrapper.findAll('.played-note')).toHaveLength(1)
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  // @test-link [[rule_review_played_notes_toggle]]
  it('hands the engraver the same stored phrase whether the lanes are on or off', async () => {
    const on = mountPhrase({ playedNotesShown: true })
    await engrave(on)
    const off = mountPhrase({ playedNotesShown: false })
    await engrave(off)

    const [onCall, offCall] = fakePhraseEngraver.engraveWrittenPhrase.mock.calls
    expect(onCall!.slice(1)).toEqual(offCall!.slice(1))
    expect(on.get('.staff-content').html()).toBe(off.get('.staff-content').html())
  })
})
