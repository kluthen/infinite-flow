/**
 * The Review panel and very short notes: the lanes' session-wide pitch scale is made from the
 * notes the lanes show, so a very short note never widens it, and a session whose every played
 * note is very short has no scale while it keeps its played-notes tools.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import ReviewPhrase from '@/components/review/ReviewPhrase.vue'
import { playedNotesPitchScale } from '@/components/review/played-notes-lane-geometry'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const mounted: VueWrapper[] = []

/** Intent: mount the panel of `records`, a session holding played notes, its lanes on. */
function mountPanel(records: readonly SessionHistoryRecord[]) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records,
      instrumentName: 'B-flat tenor saxophone',
      startedAt: 0,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport: { layout: 'one-system', heightBudgetPx: null },
      noRoom: false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: () => Promise.resolve(),
      holdsPlayedNote: true,
      playedNotesShown: true,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      ...SESSION_TOOL_PROPS,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: a played note of `pitch` from `onsetAt`, lasting `seconds`. */
function played(pitch: number, onsetAt: number, seconds: number): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity: 127, onsetAt, releaseAt: onsetAt + seconds }
}

/** Intent: the recorded session with `extra(record)` added to each phrase's played notes. */
function withPlayedNotes(
  extra: (record: SessionHistoryRecord) => readonly RecordedPlayedNote[],
  keep = true,
): SessionHistoryRecord[] {
  return recordedRecords().map((record) => ({
    ...record,
    playedNotes: [...(keep ? record.playedNotes : []), ...extra(record)],
  }))
}

/** Intent: the pitch scale each phrase of the panel is given. */
function phraseScales(wrapper: VueWrapper) {
  return wrapper.findAllComponents(ReviewPhrase).map((phrase) => phrase.props('pitchScale'))
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

// @test-link [[rule_stray_notes_filtered_on_reading]]
// @test-link [[module_review_played_notes_lane]]
describe("the lanes' pitch scale and very short notes", () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('leaves out very short notes: a highest note that is very short scales the lanes as without it', () => {
    const plain = recordedRecords()
    const records = withPlayedNotes((record) =>
      record.phraseNumber === 1 ? [played(84, record.startedAt + 0.5, 0.012)] : [],
    )
    const without = playedNotesPitchScale(plain)

    const wrapper = mountPanel(records)

    expect(without).not.toBeNull()
    expect(playedNotesPitchScale(records)).not.toEqual(without)
    expect(phraseScales(wrapper)).toEqual(plain.map(() => without))
  })

  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('has no scale when every played note is very short, the played-notes tools still shown', () => {
    const records = withPlayedNotes((record) => [played(55, record.startedAt + 0.5, 0.005)], false)

    const wrapper = mountPanel(records)

    expect(phraseScales(wrapper)).toEqual(records.map(() => null))
    expect(wrapper.find('.review-view').exists()).toBe(true)
    expect(wrapper.findAll('.review-export-action').map((button) => button.text())).toEqual([
      'Export generated notes',
      'Export played notes',
    ])
  })
})
