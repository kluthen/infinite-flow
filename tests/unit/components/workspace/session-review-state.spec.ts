/**
 * The Review's pure transitions: opened showing, closed and kept, shown again only at Idle; each a
 * new frozen object, and every out-of-turn request a SessionControllerError.
 */
import { describe, expect, it } from 'vitest'

import {
  closedReview,
  openedReview,
  shownReview,
} from '@/components/workspace/session-review-state'
import { SessionControllerError } from '@/components/workspace/workspace-session-controller-types'
import { createSessionHistory } from '@/session/session-history'
import { fixedWallClock, sessionSettings } from '../../session/session-harness'

/** Intent: an empty session history to hang a Review on. */
function history() {
  return createSessionHistory(sessionSettings(), fixedWallClock)
}

// @test-link [[req_last_session_review]]
describe('the Review transitions', () => {
  // @test-link [[req_last_session_review]]
  it('opens showing, closes kept, and shows again at Idle, each time a new frozen Review', () => {
    const held = history()

    const opened = openedReview(held)
    const closed = closedReview(opened)
    const shown = shownReview(closed, 'idle')

    expect([opened, closed, shown]).toEqual([
      { history: held, showing: true },
      { history: held, showing: false },
      { history: held, showing: true },
    ])
    expect(new Set([opened, closed, shown]).size).toBe(3)
    expect([opened, closed, shown].every((review) => Object.isFrozen(review))).toBe(true)
  })

  // @test-link [[req_last_session_review]]
  it('throws on every request out of turn', () => {
    const opened = openedReview(history())
    const kept = closedReview(opened)

    expect(() => closedReview(null)).toThrow(SessionControllerError)
    expect(() => closedReview(kept)).toThrow(/no Review shows/)
    expect(() => shownReview(null, 'idle')).toThrow(/no Review exists/)
    expect(() => shownReview(opened, 'idle')).toThrow(/already shows/)
    expect(() => shownReview(kept, 'count-in')).toThrow(/during a session/)
    expect(() => shownReview(kept, 'running')).toThrow(SessionControllerError)
  })
})
