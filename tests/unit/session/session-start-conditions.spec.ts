/**
 * The start conditions at Idle: a phrase shown, no Idle generation running, no notation error, no
 * generation-failure banner, a supported rhythm combination, the staff shown (no rotate-device
 * notice, no room notice), no session running, and the last session's Review not showing. No MIDI
 * fact is an input.
 */

import { describe, expect, it } from 'vitest'

import {
  canStartSession,
  sessionStartBlocker,
  type SessionStartBlocker,
  type SessionStartFacts,
} from '@/session/session-start-conditions'

/** The facts of a Ready workspace: every start condition holds. */
const READY: SessionStartFacts = {
  phraseShown: true,
  generationRunning: false,
  notationError: false,
  generationFailureShown: false,
  rhythmUnsupported: false,
  orientationNoticeShown: false,
  roomNoticeShown: false,
  sessionActive: false,
  reviewShowing: false,
}

// @test-link [[rule_session_start_conditions]]
describe('when a session can start', () => {
  // @test-link [[rule_session_start_conditions]]
  it('starts when every condition holds', () => {
    expect(sessionStartBlocker(READY)).toBeNull()
    expect(canStartSession(READY)).toBe(true)
  })

  const blocking: readonly [string, Partial<SessionStartFacts>, SessionStartBlocker][] = [
    ['no phrase is shown yet', { phraseShown: false }, 'no_phrase'],
    [
      'an Idle generation is running (generate, regenerate or fit retries)',
      { generationRunning: true },
      'generation_running',
    ],
    ['the notation error shows', { notationError: true }, 'notation_error'],
    ['the generation-failure banner shows', { generationFailureShown: true }, 'generation_failure'],
    ['the rhythm combination is unsupported', { rhythmUnsupported: true }, 'rhythm_unsupported'],
    ['the rotate-device notice shows', { orientationNoticeShown: true }, 'orientation_notice'],
    ['the room notice shows', { roomNoticeShown: true }, 'room_notice'],
    ['a session is already running', { sessionActive: true }, 'session_active'],
    ["the last session's Review shows", { reviewShowing: true }, 'review_showing'],
  ]

  for (const [condition, change, blocker] of blocking) {
    // @test-link [[rule_session_start_conditions]]
    it(`does not start while ${condition}`, () => {
      const facts = { ...READY, ...change }
      expect(sessionStartBlocker(facts)).toBe(blocker)
      expect(canStartSession(facts)).toBe(false)
    })
  }

  // @test-link [[rule_session_start_conditions]]
  // @test-link [[req_last_session_review]]
  it('names the Review right after a running session, before every Idle condition', () => {
    const everyIdleBlocker: SessionStartFacts = {
      ...READY,
      reviewShowing: true,
      phraseShown: false,
      generationRunning: true,
      roomNoticeShown: true,
      orientationNoticeShown: true,
    }
    expect(sessionStartBlocker(everyIdleBlocker)).toBe('review_showing')
    expect(sessionStartBlocker({ ...everyIdleBlocker, sessionActive: true })).toBe('session_active')
  })

  // @test-link [[rule_session_start_conditions]]
  it('does not start while a generation runs under a failure banner with the old phrase shown', () => {
    const facts = { ...READY, generationRunning: true, generationFailureShown: true }
    expect(canStartSession(facts)).toBe(false)
  })
})

// @test-link [[rule_midi_never_blocks_session]]
describe('MIDI never blocks a start', () => {
  // @test-link [[rule_midi_never_blocks_session]]
  it('takes no MIDI fact as an input', () => {
    expect(Object.keys(READY).filter((key) => /midi/iu.test(key))).toEqual([])
  })

  // @test-link [[rule_midi_never_blocks_session]]
  it('ignores any MIDI state a caller happens to carry along', () => {
    const withMidi = { ...READY, midiAccess: 'denied', midiDeviceConnected: false }
    const facts: SessionStartFacts = withMidi
    expect(canStartSession(facts)).toBe(true)
  })
})
