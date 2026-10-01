import { describe, expect, it } from 'vitest'

import {
  primaryHeaderAction,
  type HeaderActionFacts,
} from '@/components/workspace/session-action-policy'

/** Ready: a phrase shown, nothing running, no error, no notice, no session. */
const READY: HeaderActionFacts = {
  sessionActive: false,
  operationRunning: false,
  generationErrorShown: false,
  notationErrorShown: false,
  roomNoticeShown: false,
  phraseShown: true,
  phrasePlayedByLastSession: false,
}

// @test-link [[rule_session_start_conditions]]
describe('primaryHeaderAction (the handoff action table)', () => {
  it.each<[string, Partial<HeaderActionFacts>, 'phrase' | 'session']>([
    ['Ready', {}, 'session'],
    ['Empty', { phraseShown: false }, 'phrase'],
    ['Initial generation error', { phraseShown: false, generationErrorShown: true }, 'phrase'],
    ['Generation error, phrase retained', { generationErrorShown: true }, 'phrase'],
    ['Loading over a phrase', { operationRunning: true }, 'session'],
    ['Loading from Empty', { operationRunning: true, phraseShown: false }, 'session'],
    ['Notation error', { notationErrorShown: true }, 'phrase'],
    [
      'Notation error over a retained generation failure',
      { notationErrorShown: true, generationErrorShown: true },
      'phrase',
    ],
    ['Needs more room', { roomNoticeShown: true, phraseShown: false }, 'session'],
    [
      'Needs more room under a generation-failure banner',
      { roomNoticeShown: true, phraseShown: false, generationErrorShown: true },
      'phrase',
    ],
    ['a session running', { sessionActive: true }, 'session'],
    [
      'the phrase the last session played (interim D-A)',
      { phrasePlayedByLastSession: true },
      'phrase',
    ],
  ])('%s (%o): the %s action carries the primary emphasis', (_state, facts, expected) => {
    expect(primaryHeaderAction({ ...READY, ...facts })).toBe(expected)
  })
})
