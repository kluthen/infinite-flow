import { describe, expect, it } from 'vitest'

import {
  awaitsLateRoomNotice,
  reviewCloseFocusTarget,
  sessionEndFocusTarget,
  type ReviewCloseFocusFacts,
} from '@/components/workspace/session-end-focus'

const IDLE_READY = { roomNotice: null, operation: 'idle' } as const

/** Every hidden Idle state a session end can find, the room notice under both causes included. */
const HIDDEN_IDLE_STATES = [
  IDLE_READY,
  { roomNotice: 'no_room', operation: 'idle' },
  { roomNotice: 'notes_too_wide', operation: 'idle' },
  { roomNotice: null, operation: 'generating' },
  { roomNotice: null, operation: 'notating' },
] as const

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_stop_ends_session]]
describe('sessionEndFocusTarget', () => {
  it('sends focus to the session action after an end during the count-in', () => {
    const end = { cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 } as const
    expect(sessionEndFocusTarget(end, IDLE_READY)).toBe('session-action')
  })

  it('sends focus to room-notice when the Idle rules show it after a count-in end', () => {
    const end = { cause: 'staff-not-shown', phase: 'count-in', soundedPhraseCount: 0 } as const
    expect(sessionEndFocusTarget(end, { roomNotice: 'no_room', operation: 'idle' })).toBe(
      'room-notice',
    )
  })

  it('sends focus to controller-status while phrase 1 regenerates after a count-in end', () => {
    const end = { cause: 'staff-not-shown', phase: 'count-in', soundedPhraseCount: 0 } as const
    expect(sessionEndFocusTarget(end, { roomNotice: null, operation: 'generating' })).toBe(
      'controller-status',
    )
  })

  // @test-link [[req_last_session_review]]
  it('sends focus to the session action, now Close review, once phrase 1 has sounded, whatever Idle hides', () => {
    for (const cause of ['stop', 'staff-not-shown', 'hidden-tab'] as const) {
      const end = { cause, phase: 'running', soundedPhraseCount: 2 } as const
      for (const idle of HIDDEN_IDLE_STATES) {
        expect(sessionEndFocusTarget(end, idle)).toBe('session-action')
      }
    }
  })
})

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_session_ends_when_staff_too_small]]
describe('awaitsLateRoomNotice', () => {
  it('waits for a late room notice only after a count-in window end that did not focus it already', () => {
    const windowEnd = {
      cause: 'staff-not-shown',
      phase: 'count-in',
      soundedPhraseCount: 0,
    } as const
    expect(awaitsLateRoomNotice(windowEnd, 'session-action')).toBe(true)
    expect(awaitsLateRoomNotice(windowEnd, 'controller-status')).toBe(true)
    expect(awaitsLateRoomNotice(windowEnd, 'room-notice')).toBe(false)
  })

  // @test-link [[req_last_session_review]]
  it('never waits once phrase 1 has sounded: the Review shows, the notice hidden with the staff', () => {
    const windowEnd = { cause: 'staff-not-shown', phase: 'running', soundedPhraseCount: 1 } as const
    expect(awaitsLateRoomNotice(windowEnd, 'session-action')).toBe(false)
  })

  it('never waits after Stop or a hidden tab: the window is as it was', () => {
    for (const cause of ['stop', 'hidden-tab'] as const) {
      const end = { cause, phase: 'count-in', soundedPhraseCount: 0 } as const
      expect(awaitsLateRoomNotice(end, 'session-action')).toBe(false)
    }
  })
})

/** The workspace as `Close review` finds it at Ready: Start enabled, no notice, phrase action live. */
const CLOSE_AT_READY: ReviewCloseFocusFacts = {
  sessionActionEnabled: true,
  roomNoticeShown: false,
  phraseActionEnabled: true,
}

// @test-link [[req_last_session_review]]
describe('reviewCloseFocusTarget', () => {
  it.each<[string, Partial<ReviewCloseFocusFacts>, string]>([
    ['Ready: Start session enabled', {}, 'session-action'],
    ['Needs more room', { sessionActionEnabled: false, roomNoticeShown: true }, 'room-notice'],
    [
      'Empty or an error: the phrase action enabled',
      { sessionActionEnabled: false },
      'phrase-action',
    ],
    [
      'Loading: both actions disabled',
      { sessionActionEnabled: false, phraseActionEnabled: false },
      'controller-status',
    ],
    [
      'Needs more room with the phrase action disabled',
      { sessionActionEnabled: false, roomNoticeShown: true, phraseActionEnabled: false },
      'room-notice',
    ],
  ])('%s (%o): focus goes to %s', (_state, facts, expected) => {
    expect(reviewCloseFocusTarget({ ...CLOSE_AT_READY, ...facts })).toBe(expected)
  })
})
