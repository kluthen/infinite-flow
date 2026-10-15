/**
 * The score panel's Review host on its own, what the page keeps of the Review: the export choices
 * and the Played notes switch start from the saved review preferences (MusicXML, backing track
 * off, switch off on a first visit), are saved as the player changes them, and the Played notes
 * switch is held for the page session. What the Review is given beyond these is the review area's
 * (use-review-area.spec.ts).
 */
import { describe, expect, it } from 'vitest'

import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { reviewAreaRig } from './review-area-rig'

// @test-link [[req_last_session_review]]
describe('useReviewHost', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[module_review_played_notes_lane]]
  it('starts the export choices and the Played notes switch from the saved preferences', () => {
    const { host, stop } = reviewAreaRig(createFakeSessionController(), {
      format: 'midi',
      backingTrack: true,
      playedNotesShown: true,
    })

    expect(host.format.value).toBe('midi')
    expect(host.backingTrack.value).toBe(true)
    expect(host.playedNotesShown.value).toBe(true)
    stop()
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('holds the Played notes switch for the page session: across a close, a reopening and a later session', () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { host, stop } = reviewAreaRig(fake)

    host.setPlayedNotesShown(true)
    fake.controller.closeReview()
    expect(host.playedNotesShown.value).toBe(true)
    fake.controller.showReview()
    expect(host.playedNotesShown.value).toBe(true)

    fake.controller.start()
    fake.state.phase = 'running'
    fake.controller.stop()
    fake.state.review = fakeReview(fakeReviewHistory(recordedRecords().slice(0, 1)), true)
    expect(host.showing.value).toBe(true)
    expect(host.playedNotesShown.value).toBe(true)
    stop()
  })
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe("useReviewHost: saving the player's choices", () => {
  it('sets and saves the export format, the backing track and the Played notes switch', () => {
    const { host, saves, stop } = reviewAreaRig()

    host.setFormat('midi')
    host.setBackingTrack(true)
    host.setPlayedNotesShown(true)

    expect(host.format.value).toBe('midi')
    expect(host.backingTrack.value).toBe(true)
    expect(host.playedNotesShown.value).toBe(true)
    expect(saves).toEqual([
      { 'review.format': 'midi' },
      { 'review.backingTrack': true },
      { 'review.playedNotesShown': true },
    ])
    stop()
  })
})
