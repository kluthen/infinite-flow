import { describe, expect, it } from 'vitest'

import {
  phraseActionDisabled,
  primaryHeaderAction,
  type HeaderActionFacts,
  type PhraseActionFacts,
} from '@/components/workspace/session-action-policy'

/** Ready: a phrase shown, nothing running, no error, no notice, no session. */
const READY: HeaderActionFacts = {
  sessionActive: false,
  operationRunning: false,
  generationErrorShown: false,
  notationErrorShown: false,
  roomNoticeShown: false,
  phraseShown: true,
  reviewShowing: false,
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
    ['the Review showing over Ready', { reviewShowing: true }, 'session'],
    ['the Review showing over Empty', { reviewShowing: true, phraseShown: false }, 'session'],
    [
      'the Review showing over a generation-failure banner',
      { reviewShowing: true, phraseShown: false, generationErrorShown: true },
      'session',
    ],
    [
      'the Review showing over a notation error',
      { reviewShowing: true, notationErrorShown: true },
      'session',
    ],
  ])('%s (%o): the %s action carries the primary emphasis', (_state, facts, expected) => {
    expect(primaryHeaderAction({ ...READY, ...facts })).toBe(expected)
  })
})

/** The phrase action's facts at Ready: nothing running, a supported rhythm, no session, no Review. */
const PHRASE_READY: PhraseActionFacts = {
  operationRunning: false,
  blockedByUnsupportedRhythm: false,
  sessionActive: false,
  reviewShowing: false,
}

// @test-link [[req_last_session_review]]
// @test-link [[rule_session_settings_locked]]
describe('phraseActionDisabled', () => {
  it.each<[string, Partial<PhraseActionFacts>, boolean]>([
    ['Ready', {}, false],
    ['an operation running', { operationRunning: true }, true],
    ['an unsupported rhythm', { blockedByUnsupportedRhythm: true }, true],
    ['a session running', { sessionActive: true }, true],
    ['the Review showing', { reviewShowing: true }, true],
  ])('%s (%o): disabled is %s', (_state, facts, expected) => {
    expect(phraseActionDisabled({ ...PHRASE_READY, ...facts })).toBe(expected)
  })
})
