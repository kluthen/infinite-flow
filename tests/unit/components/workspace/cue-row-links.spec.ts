/**
 * When the cue row's links show: `review-link` while a most recent session exists, `sessions-link`
 * while the session list has a row, each only at Idle and never while the review mode shows.
 */
import { describe, expect, it } from 'vitest'

import { reviewLinkShown, sessionsLinkShown } from '@/components/workspace/cue-row-links'
import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import type { SessionControllerState } from '@/components/workspace/workspace-session-controller-types'

const ROW: KeptSessionRow = { kind: 'newer', key: 'n', readable: {}, failedToOpen: false }

/** Intent: the link facts at Idle, no review mode, with `edit` applied. */
function facts(
  edit: Partial<SessionControllerState> = {},
): Pick<SessionControllerState, 'phase' | 'review' | 'listShowing' | 'mostRecent' | 'keptRows'> {
  return {
    phase: 'idle',
    review: null,
    listShowing: false,
    mostRecent: { kind: 'kept', key: 'k' },
    keptRows: [ROW],
    ...edit,
  }
}

// @test-link [[req_kept_session_list]]
describe('the cue row links', () => {
  // @test-link [[req_kept_session_list]]
  it('show both at Idle, sessions-link for any row, a newer one included', () => {
    expect(reviewLinkShown(facts())).toBe(true)
    expect(sessionsLinkShown(facts())).toBe(true)
  })

  // @test-link [[req_kept_session_list]]
  it('show sessions-link alone with no most recent session, and neither with no row and none', () => {
    expect(reviewLinkShown(facts({ mostRecent: null }))).toBe(false)
    expect(sessionsLinkShown(facts({ mostRecent: null }))).toBe(true)
    expect(sessionsLinkShown(facts({ mostRecent: null, keptRows: [] }))).toBe(false)
  })

  // @test-link [[req_last_session_review]]
  it('show neither during a session or while the list shows', () => {
    for (const edit of [{ phase: 'count-in' as const }, { listShowing: true }]) {
      expect(reviewLinkShown(facts(edit))).toBe(false)
      expect(sessionsLinkShown(facts(edit))).toBe(false)
    }
  })
})
