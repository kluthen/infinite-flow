/**
 * The Review's pure transitions: the session an end opens, named from its own data and kept as
 * its save allows; opened showing, closed and kept, shown again only at Idle; each a new frozen
 * object, and every out-of-turn request a SessionControllerError. The save's outcome settles how
 * the session is kept.
 */
import { describe, expect, it } from 'vitest'

import {
  assertReviewMayShow,
  closedReview,
  endedSession,
  openedReview,
  settledKeeping,
  shownReview,
} from '@/components/workspace/session-review-state'
import {
  SessionControllerError,
  type MostRecentSession,
} from '@/components/workspace/workspace-session-controller-types'
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
import { myInstrumentHistory } from './my-instrument-history'

/** Intent: the closed history of a driven session, fed every output the driver logged. */
function historyOf(driver: SessionDriver): SessionHistory {
  const history = createSessionHistory(
    driver.settings,
    fixedWallClock,
    DEFAULT_SESSION_SEED,
    'treble',
  )
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
  // @test-link [[module_kept_session_save]]
  it('opens showing, closes kept, and shows again at Idle, each time a new frozen Review', () => {
    const held = history()
    const session = endedSession(held, 'not-pinned')

    const opened = openedReview(session)
    const closed = closedReview(opened)
    const shown = shownReview(session)

    const drawn = {
      history: held,
      instrumentName: 'C MIDI keyboard',
      tempoReached: 240,
      keeping: 'not-pinned',
    }
    expect(session).toEqual(drawn)
    expect([opened, closed, shown]).toEqual([
      { ...drawn, showing: true },
      { ...drawn, showing: false },
      { ...drawn, showing: true },
    ])
    expect(new Set([opened, closed, shown]).size).toBe(3)
    expect([session, opened, closed, shown].every((value) => Object.isFrozen(value))).toBe(true)
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[rule_new_session_discards_review]]
  it('throws on every request out of turn', () => {
    const session = endedSession(history(), 'not-pinned')
    const opened = openedReview(session)
    const kept = closedReview(opened)
    const recent: MostRecentSession = { kind: 'held', session }

    expect(() => closedReview(null)).toThrow(SessionControllerError)
    expect(() => closedReview(kept)).toThrow(/no Review shows/)
    expect(() => assertReviewMayShow(null, null, 'idle', false)).toThrow(/no Review exists/)
    expect(() => assertReviewMayShow(recent, opened, 'idle', false)).toThrow(/already shows/)
    expect(() => assertReviewMayShow(recent, kept, 'count-in', false)).toThrow(/during a session/)
    expect(() => assertReviewMayShow(recent, null, 'running', false)).toThrow(
      SessionControllerError,
    )
    expect(() => assertReviewMayShow(recent, null, 'idle', true)).toThrow(/being read/)
    expect(assertReviewMayShow(recent, kept, 'idle', false)).toBe(recent)
    expect(assertReviewMayShow(recent, null, 'idle', false)).toBe(recent)
  })

  // @test-link [[req_last_session_review]]
  it('refuses to open over a history in which no phrase sounded', () => {
    const empty = createSessionHistory(
      sessionSettings(),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    expect(() => endedSession(empty, 'not-pinned')).toThrow(/no phrase sounded/)
  })
})

// @test-link [[req_last_session_review]]
describe("the instrument's name in the Review", () => {
  // @test-link [[req_last_session_review]]
  it("reads my instrument's name from the phrases' own profile, never by id", () => {
    const session = endedSession(myInstrumentHistory('Grandpa’s tenor'), 'not-saved')

    expect(session.instrumentName).toBe('Grandpa’s tenor')
  })
})

// @test-link [[module_kept_session_save]]
// @test-link [[rule_failed_save_never_disturbs_session]]
describe("how the session is kept, once its save's outcome is known", () => {
  // @test-link [[module_kept_session_save]]
  it('stays not pinned once saved, and becomes not saved once refused or skipped', () => {
    const session = endedSession(history(), 'not-pinned')

    expect(settledKeeping(session, { status: 'saved' })).toBe(session)
    for (const outcome of [
      { status: 'refused', kind: 'quota' },
      { status: 'refused', kind: 'other' },
      { status: 'saving-off' },
    ] as const) {
      const settled = settledKeeping(session, outcome)
      expect(settled).toEqual({ ...session, keeping: 'not-saved' })
      expect(Object.isFrozen(settled)).toBe(true)
    }
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

    const session = endedSession(held, 'not-pinned')
    const opened = openedReview(session)
    closedReview(opened)
    const shown = shownReview(session)

    expect(opened.tempoReached).toBe(100)
    expect(shown.tempoReached).toBe(100)
    expect(driver.settings.controls.tempo).toBe(90)
  })
})
