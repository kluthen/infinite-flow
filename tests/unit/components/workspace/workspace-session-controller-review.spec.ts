/**
 * The session controller's side of the last-session Review: a session that ended once phrase 1 had
 * sounded opens it, showing, over its closed history, makes that session the most recent one and
 * asks the Idle side for a fresh phrase; an end during the count-in opens none, asks for nothing and
 * leaves the most recent session as it was. No session starts while it shows, by the Start click or
 * by the starting note, and no starting note is named. Closing it keeps it, showing it again works
 * only at Idle, and the next accepted start hides it before anything else while the most recent
 * session stays (how it is kept, and the most recent session after a reload:
 * workspace-session-controller-most-recent.spec.ts). On the fake audio clock at 240 BPM from 5 s: the count-in runs from 5.1 s to 6.1 s, when phrase 1
 * starts sounding; phrase N starts at 6.1 + 4 (N - 1) s.
 */
import { describe, expect, it, vi } from 'vitest'

import { keptSessionKey } from '@/components/workspace/workspace-session-save'

import type { ReviewedHistory } from '@/components/workspace/workspace-session-controller-types'
import { controllerRig, playTo, RIG_TEMPO, type ControllerRig } from './session-controller-rig'
import { connectKeys, lift, press, rigStartingNote } from './session-controller-midi'

/** Intent: a rig whose first session sounded `phrases` phrases, then ended by Stop. */
async function afterSoundedEnd(phrases = 1): Promise<ControllerRig> {
  const rig = controllerRig()
  rig.controller.start()
  await playTo(rig, 6.1 + (phrases - 1) * 4 + 0.5)
  rig.controller.stop()
  expect(rig.controller.state.lastEnd?.soundedPhraseCount).toBe(phrases)
  return rig
}

/** Intent: the instrument's name a history's phrase 1 was generated with. */
function nameOf(history: ReviewedHistory | null): string {
  const first = history?.phrases()[0]
  if (first === undefined) throw new Error('the history holds no phrase')
  return first.intent.instrumentProfile.displayName
}

/** Intent: a rig whose first session ended by Stop during its count-in. */
async function afterCountInEnd(rig: ControllerRig = controllerRig()): Promise<ControllerRig> {
  rig.controller.start()
  await playTo(rig, rig.audioRig.now() + 0.4)
  expect(rig.controller.state.phase).toBe('count-in')
  rig.controller.stop()
  expect(rig.controller.state.lastEnd?.soundedPhraseCount).toBe(0)
  return rig
}

// @test-link [[req_last_session_review]]
describe('session controller: the Review opens at a session end', () => {
  // @test-link [[req_last_session_review]]
  it('has no Review before any session ends', () => {
    const rig = controllerRig()

    expect(rig.controller.state.review).toBeNull()
    expect(() => rig.controller.closeReview()).toThrow(/no Review shows/)
    expect(() => rig.controller.showReview()).toThrow(/no Review exists/)
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[rule_stop_ends_session]]
  it('opens the Review, showing, over the closed history once phrase 1 has sounded', async () => {
    const rig = await afterSoundedEnd(3)

    const { review, lastHistory } = rig.controller.state
    expect(review).toEqual({
      history: lastHistory,
      instrumentName: nameOf(lastHistory),
      presetLabel: 'Custom, based on Neutral',
      tempoReached: RIG_TEMPO,
      keeping: 'not-pinned',
      key: keptSessionKey(lastHistory!),
      playedNotesKept: false,
      pinned: false,
      favorites: [],
      comment: '',
      showing: true,
    })
    expect(review?.history.phrases().map((record) => record.phraseNumber)).toEqual([1, 2, 3])
    expect(Object.isFrozen(review)).toBe(true)
    expect(rig.controller.state.mostRecent).toEqual({
      kind: 'held',
      session: {
        history: lastHistory,
        instrumentName: nameOf(lastHistory),
        presetLabel: 'Custom, based on Neutral',
        tempoReached: RIG_TEMPO,
        keeping: 'not-pinned',
        key: keptSessionKey(lastHistory!),
        playedNotesKept: false,
        pinned: false,
        favorites: [],
        comment: '',
      },
    })
  })

  // @test-link [[req_last_session_review]]
  it('opens the Review whatever ended the session once phrase 1 has sounded', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 6.6)

    rig.browser.pageVisibility.setHidden(true)

    expect(rig.controller.state.lastEnd?.cause).toBe('hidden-tab')
    expect(rig.controller.state.review?.showing).toBe(true)
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('opens none, and asks for no fresh phrase, at an end during the count-in', async () => {
    const rig = await afterCountInEnd()

    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBeNull()
    expect(rig.freshPhraseRequests).toEqual([])
    expect(rig.controller.state.canStart).toBe(true)
  })
})

// @test-link [[rule_session_end_generates_next_phrase_one]]
describe('session controller: the next phrase at a session end', () => {
  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('asks the Idle side for a fresh phrase once, after the teardown handed the reports back, with the Review showing', async () => {
    const rig = await afterSoundedEnd()

    expect(rig.freshPhraseRequests).toHaveLength(1)
    expect(rig.freshPhraseRequests[0]).toEqual({
      phase: 'idle',
      review: rig.controller.state.review,
      idleReports: 1,
      shownSettings: null,
    })
    expect(rig.freshPhraseRequests[0]?.review?.showing).toBe(true)
  })

  // @test-link [[rule_session_end_generates_next_phrase_one]]
  it('asks again at every later end once phrase 1 has sounded, and never at a count-in end', async () => {
    const rig = await afterSoundedEnd()
    rig.controller.closeReview()

    await afterCountInEnd(rig)
    expect(rig.freshPhraseRequests).toHaveLength(1)

    rig.controller.start()
    await playTo(rig, rig.audioRig.now() + 1.5)
    expect(rig.controller.state.phase).toBe('running')
    rig.controller.stop()

    expect(rig.freshPhraseRequests).toHaveLength(2)
  })
})

// @test-link [[req_last_session_review]]
// @test-link [[rule_session_start_conditions]]
describe('session controller: no start while the Review shows', () => {
  // @test-link [[rule_session_start_conditions]]
  it('blocks Start with review_showing, touching nothing, until the Review is closed', async () => {
    const rig = await afterSoundedEnd()
    const unlock = vi.spyOn(rig.transport, 'unlock')

    expect(rig.controller.state.startBlocker).toBe('review_showing')
    expect(rig.controller.state.canStart).toBe(false)
    expect(() => rig.controller.start()).toThrow(/cannot start: review_showing/)
    expect(unlock).not.toHaveBeenCalled()
    expect(rig.runnerInputs).toHaveLength(1)

    rig.controller.closeReview()

    expect(rig.controller.state.startBlocker).toBeNull()
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_midi_starting_note]]
  // @test-link [[rule_starting_note_named]]
  it('names no starting note and starts nothing on it while the Review shows; names it again once closed at Ready', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const starting = rigStartingNote(rig)
    rig.controller.start()
    await playTo(rig, 6.6)
    rig.controller.stop()
    expect(rig.controller.state.review?.showing).toBe(true)

    expect(rig.controller.state.startingNote).toBeNull()
    press(rig, starting.concertPitch)
    lift(rig, starting.concertPitch)

    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.runnerInputs).toHaveLength(1)
    expect(rig.transport.isRunning()).toBe(false)

    rig.controller.closeReview()

    expect(rig.controller.state.startingNote).toEqual(starting)
    rig.controller.dispose()
  })
})

// @test-link [[req_last_session_review]]
describe('session controller: closing and showing the Review again', () => {
  // @test-link [[req_last_session_review]]
  it('keeps the Review, not showing, on close, and shows the very same history again', async () => {
    const rig = await afterSoundedEnd()
    const history = rig.controller.state.lastHistory
    const shown = rig.controller.state.review

    rig.controller.closeReview()

    const drawn = {
      history,
      instrumentName: nameOf(history),
      presetLabel: 'Custom, based on Neutral',
      tempoReached: RIG_TEMPO,
      keeping: 'not-pinned',
      key: keptSessionKey(history!),
      playedNotesKept: false,
      pinned: false,
      favorites: [],
      comment: '',
    }
    const kept = rig.controller.state.review
    expect(kept).toEqual({ ...drawn, showing: false })
    expect(kept).not.toBe(shown)
    expect(Object.isFrozen(kept)).toBe(true)
    expect(shown?.showing).toBe(true)

    await expect(rig.controller.showReview()).resolves.toBe('shown')

    expect(rig.controller.state.review).toEqual({ ...drawn, showing: true })
    expect(rig.controller.state.startBlocker).toBe('review_showing')
  })

  // @test-link [[req_last_session_review]]
  it('throws on closing a Review that does not show, and on showing one already showing', async () => {
    const rig = await afterSoundedEnd()

    expect(() => rig.controller.showReview()).toThrow(/already shows/)
    rig.controller.closeReview()
    expect(() => rig.controller.closeReview()).toThrow(/no Review shows/)
    expect(rig.controller.state.review?.showing).toBe(false)
  })
})

// @test-link [[rule_new_session_discards_review]]
// @test-link [[rule_most_recent_session_kept]]
describe('session controller: the next session hides the Review, and the most recent session stays', () => {
  // @test-link [[rule_new_session_discards_review]]
  it('hides the kept Review at the very start of an accepted start, before anything else, keeping the most recent session', async () => {
    const rig = await afterSoundedEnd()
    rig.controller.closeReview()
    const recent = rig.controller.state.mostRecent
    let reviewAtUnlock: unknown = 'not unlocked'
    vi.spyOn(rig.transport, 'unlock').mockImplementation(() => {
      reviewAtUnlock = rig.controller.state.review
    })

    rig.controller.start()

    expect(reviewAtUnlock).toBeNull()
    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBe(recent)
    expect(rig.controller.state.phase).toBe('count-in')
    expect(() => rig.controller.showReview()).toThrow(/during a session/)
  })

  // @test-link [[module_kept_session_save]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('shows the same session again after that next session ends during its count-in', async () => {
    const rig = await afterSoundedEnd(2)
    const history = rig.controller.state.lastHistory
    rig.controller.closeReview()
    const recent = rig.controller.state.mostRecent

    await afterCountInEnd(rig)

    expect(rig.controller.state.review).toBeNull()
    expect(rig.controller.state.mostRecent).toBe(recent)
    expect(rig.controller.state.canStart).toBe(true)
    await expect(rig.controller.showReview()).resolves.toBe('shown')
    expect(rig.controller.state.review?.history).toBe(history)
    expect(rig.controller.state.review?.showing).toBe(true)
  })

  // @test-link [[rule_most_recent_session_kept]]
  it('replaces the most recent session with the next one that ends with a review', async () => {
    const rig = await afterSoundedEnd()
    rig.controller.closeReview()

    rig.controller.start()
    await playTo(rig, rig.audioRig.now() + 1.5)
    rig.controller.stop()

    const recent = rig.controller.state.mostRecent
    expect(recent?.kind === 'held' && recent.session.history).toBe(rig.controller.state.lastHistory)
  })

  // @test-link [[rule_new_session_discards_review]]
  it('keeps the Review when a start is refused', async () => {
    const rig = await afterSoundedEnd()
    rig.controller.closeReview()
    rig.idle.operation = 'generating'

    expect(() => rig.controller.start()).toThrow(/cannot start: generation_running/)

    expect(rig.controller.state.review?.showing).toBe(false)
  })

  // @test-link [[req_last_session_review]]
  it('refuses to show a Review during a session', async () => {
    const rig = controllerRig()
    rig.controller.start()

    expect(() => rig.controller.showReview()).toThrow(/no Review exists/)
  })
})
