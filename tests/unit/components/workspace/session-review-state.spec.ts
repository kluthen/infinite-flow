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
import { createSessionHistory, type SessionHistory } from '@/session/session-history'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  fixedWallClock,
  sessionSettings,
} from '../../session/session-harness'
import {
  driveTempoSession,
  phraseStartAt,
  tempoDriver,
  tempoMap,
} from '../../session/tempo-session'

/** Intent: the closed history of a driven session, fed every output the driver logged. */
function historyOf(driver: SessionDriver): SessionHistory {
  const history = createSessionHistory(driver.settings, fixedWallClock, DEFAULT_SESSION_SEED)
  for (const output of driver.log) history.record(output)
  return history
}

/** Intent: the closed history of a session at 240 BPM stopped once phrase 1 has sounded. */
function history(): SessionHistory {
  const driver = new SessionDriver({ at: 0, settings: sessionSettings({ tempo: 240 }) })
  driver.countInOver(1)
  driver.end(2)
  return historyOf(driver)
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
      { history: held, showing: true, tempoReached: 240 },
      { history: held, showing: false, tempoReached: 240 },
      { history: held, showing: true, tempoReached: 240 },
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

  // @test-link [[req_last_session_review]]
  it('refuses to open over a history in which no phrase sounded', () => {
    const empty = createSessionHistory(sessionSettings(), fixedWallClock, DEFAULT_SESSION_SEED)
    expect(() => openedReview(empty)).toThrow(/no phrase sounded/)
  })
})

// @test-link [[rule_adaptive_tempo_resets_after_session]]
describe('the tempo reached in the Review', () => {
  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it("records the last sounded phrase's tempo, and keeps it through close and show", () => {
    const driver = tempoDriver({ tempo: 90, adaptiveTempo: true })
    driveTempoSession(driver, 5)
    driver.end(phraseStartAt(driver, 6) - 0.01)
    const held = historyOf(driver)
    expect(tempoMap(driver, 5)).toEqual([90, 90, 95, 95, 100])

    const opened = openedReview(held)
    const shown = shownReview(closedReview(opened), 'idle')

    expect(opened.tempoReached).toBe(100)
    expect(shown.tempoReached).toBe(100)
    expect(driver.settings.controls.tempo).toBe(90)
  })
})
