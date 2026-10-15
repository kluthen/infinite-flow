/**
 * The review area's session tools: a star marks or unmarks its phrase at once; `Pin` pins at once,
 * `Unpin` unpins at once without favorites and opens its confirmation with some; `Delete session`
 * opens its confirmation, naming what the session holds, offered only while saving is on; each
 * confirmation runs through the host's one open confirmation (confirmed, kept open after a refused
 * deletion, or cancelled), with its words; a comment saved for a session no longer held is dropped.
 */
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { sessionDate } from '@/components/review/session-date'
import { reviewConfirmationCopy } from '@/components/workspace/review-confirmation-copy'
import type { SessionReview } from '@/components/workspace/workspace-session-controller-types'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  FAKE_REVIEW_KEY,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
  type FakeSessionController,
} from './fake-session-controller'
import { reviewAreaRig } from './review-area-rig'

/** Intent: a fake controller showing a Review with `facts` applied to its session. */
function showing(facts: Partial<SessionReview> = {}, savingOff = false): FakeSessionController {
  const review: SessionReview = Object.freeze({
    ...fakeReview(fakeReviewHistory(recordedRecords()), true),
    ...facts,
  })
  return createFakeSessionController({ review, mostRecent: heldSessionOf(review), savingOff })
}

/** Intent: the review area over `fake`'s controller, and its host, inside their own effect scope. */
function areaOver(fake: FakeSessionController) {
  const { host: reviewHost, area } = reviewAreaRig(fake)
  return { ...area, showing: reviewHost.showing }
}

// @test-link [[req_favorite_phrases]]
// @test-link [[rule_favorite_pins_session]]
describe('the review area: favorite stars', () => {
  it("mark and unmark a phrase of the showing session through the controller, by the session's key", () => {
    const fake = showing()
    const built = areaOver(fake)

    built.toggleFavorite(2)
    expect(fake.setFavorite).toHaveBeenLastCalledWith(FAKE_REVIEW_KEY, 2, true)
    expect(built.favorites.value).toEqual([2])
    expect(built.pinned.value).toBe(true)

    built.toggleFavorite(2)
    expect(fake.setFavorite).toHaveBeenLastCalledWith(FAKE_REVIEW_KEY, 2, false)
    expect(built.favorites.value).toEqual([])
  })
})

// @test-link [[rule_pinned_session_kept]]
// @test-link [[rule_favorite_pins_session]]
describe('the review area: Pin and Unpin', () => {
  it('pins at once, and unpins at once a session without favorites', () => {
    const fake = showing()
    const built = areaOver(fake)

    built.togglePin()
    expect(fake.setPinned).toHaveBeenLastCalledWith(FAKE_REVIEW_KEY, true)
    built.togglePin()
    expect(fake.setPinned).toHaveBeenLastCalledWith(FAKE_REVIEW_KEY, false)
    expect(built.confirmation.value).toBeNull()
  })

  it('asks first for a session with favorites; Unpin unpins, Keep pinned changes nothing', async () => {
    const fake = showing({ pinned: true, keeping: 'pinned', favorites: [1, 3] })
    const built = areaOver(fake)

    built.togglePin()
    const open = built.confirmation.value
    expect(open).toEqual(expect.objectContaining({ kind: 'unpin', favoritesCount: 2 }))
    expect(reviewConfirmationCopy(open!)).toEqual({
      title: 'Unpin this session?',
      paragraphs: ['It will be deleted, with its 2 favorites, when your next session is saved.'],
      confirmLabel: 'Unpin',
      cancelLabel: 'Keep pinned',
      destructive: false,
      error: null,
    })
    built.cancel()
    expect(fake.setPinned).not.toHaveBeenCalled()

    built.togglePin()
    expect(await built.confirm()).toBe('deleted')
    expect(fake.setPinned).toHaveBeenCalledWith(FAKE_REVIEW_KEY, false)
    expect(built.confirmation.value).toBeNull()
  })

  it('names one favorite as "its favorite", and stays open while saving turns off', async () => {
    const fake = showing({ pinned: true, keeping: 'pinned', favorites: [1] })
    const built = areaOver(fake)

    built.togglePin()
    expect(reviewConfirmationCopy(built.confirmation.value!).paragraphs).toEqual([
      'It will be deleted, with its favorite, when your next session is saved.',
    ])
    fake.state.savingOff = true
    await nextTick()
    expect(built.confirmation.value?.kind).toBe('unpin')
  })
})

// @test-link [[req_kept_session_list]]
describe('the review area: Delete session', () => {
  it('is offered only while saving is on', () => {
    expect(areaOver(showing()).canDeleteSession.value).toBe(true)
    expect(areaOver(showing({}, true)).canDeleteSession.value).toBe(false)
  })

  it('asks first, naming the session by its date and what it holds, then deletes it', async () => {
    const fake = showing({ favorites: [1, 2], pinned: true, comment: 'Mine.' })
    const built = areaOver(fake)

    built.askDeleteSession()
    const copy = reviewConfirmationCopy(built.confirmation.value!)
    const startedAt = fake.state.review!.history.startedAt
    expect(copy).toEqual({
      title: 'Delete this session?',
      paragraphs: [
        `This deletes the session from ${sessionDate(startedAt)}, with its 2 favorite phrases, its comment and its played notes.`,
        "This can't be undone.",
      ],
      confirmLabel: 'Delete session',
      cancelLabel: 'Cancel',
      destructive: true,
      error: null,
    })

    // The deletion takes the Review away, and its sheet with it.
    expect(await built.confirm()).toBe('closed')
    expect(fake.deleteSession).toHaveBeenCalledWith(FAKE_REVIEW_KEY)
    expect(built.showing.value).toBe(false)
    expect(built.confirmation.value).toBeNull()
  })

  it('words what the session holds in order, joined with commas and "and", or nothing', () => {
    const fake = showing()
    const built = areaOver(fake)
    built.askDeleteSession()
    const open = built.confirmation.value
    if (open?.kind !== 'delete-session') throw new Error('no deletion is asked')
    const date = sessionDate(open.startedAt)

    const first = (holds: Partial<typeof open>) =>
      reviewConfirmationCopy({ ...open, playedNotes: false, ...holds }).paragraphs[0]
    expect(first({})).toBe(`This deletes the session from ${date}.`)
    expect(first({ favoritesCount: 1, comment: true, playedNotes: true })).toBe(
      `This deletes the session from ${date}, with its favorite phrase, its comment and its played notes.`,
    )
    expect(first({ playedNotes: true })).toBe(
      `This deletes the session from ${date}, with its played notes.`,
    )
  })

  it('refused, keeps its sheet open with its error; it closes, deleting nothing, when saving turns off', async () => {
    const fake = showing()
    fake.deleteSession.mockImplementationOnce(() => Promise.resolve('refused'))
    const built = areaOver(fake)

    built.askDeleteSession()
    expect(await built.confirm()).toBe('failed')
    expect(reviewConfirmationCopy(built.confirmation.value!).error).toBe(
      "That couldn't be deleted. Try again.",
    )

    fake.state.savingOff = true
    await nextTick()
    expect(built.confirmation.value).toBeNull()
  })
})

// @test-link [[rule_session_comment]]
describe('the review area: the comment', () => {
  it('is saved for the showing session by its key, and dropped once that session is no longer held', () => {
    const fake = showing()
    const built = areaOver(fake)

    built.saveComment(FAKE_REVIEW_KEY, 'Mine.')
    expect(fake.setComment).toHaveBeenCalledWith(FAKE_REVIEW_KEY, 'Mine.')
    expect(built.comment.value).toBe('Mine.')

    fake.state.review = null
    built.saveComment(FAKE_REVIEW_KEY, 'Too late.')
    expect(fake.setComment).toHaveBeenCalledTimes(1)
  })
})
