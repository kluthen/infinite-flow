import { describe, expect, it } from 'vitest'

import {
  awaitsLateRoomNotice,
  sessionEndFocusTarget,
} from '@/components/workspace/session-end-focus'

const IDLE_READY = { roomNotice: null, operation: 'idle' } as const

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

  it('sends focus to the phrase action once phrase 1 has sounded (interim D-A)', () => {
    const end = { cause: 'stop', phase: 'running', soundedPhraseCount: 3 } as const
    expect(sessionEndFocusTarget(end, IDLE_READY)).toBe('phrase-action')
  })

  it('sends focus to room-notice when the Idle rules show it after a sounded end', () => {
    const end = { cause: 'staff-not-shown', phase: 'running', soundedPhraseCount: 2 } as const
    expect(sessionEndFocusTarget(end, { roomNotice: 'no_room', operation: 'idle' })).toBe(
      'room-notice',
    )
    expect(sessionEndFocusTarget(end, { roomNotice: 'notes_too_wide', operation: 'idle' })).toBe(
      'room-notice',
    )
  })
})

// @test-link [[rule_count_in_ending_returns_to_idle]]
// @test-link [[rule_session_ends_when_staff_too_small]]
describe('awaitsLateRoomNotice', () => {
  it('waits for a late room notice only after a window end that did not focus it already', () => {
    const windowEnd = {
      cause: 'staff-not-shown',
      phase: 'count-in',
      soundedPhraseCount: 0,
    } as const
    expect(awaitsLateRoomNotice(windowEnd, 'session-action')).toBe(true)
    expect(awaitsLateRoomNotice(windowEnd, 'controller-status')).toBe(true)
    expect(awaitsLateRoomNotice({ ...windowEnd, phase: 'running' }, 'phrase-action')).toBe(true)
    expect(awaitsLateRoomNotice(windowEnd, 'room-notice')).toBe(false)
  })

  it('never waits after Stop or a hidden tab: the window is as it was', () => {
    for (const cause of ['stop', 'hidden-tab'] as const) {
      const end = { cause, phase: 'running', soundedPhraseCount: 1 } as const
      expect(awaitsLateRoomNotice(end, 'phrase-action')).toBe(false)
    }
  })
})
