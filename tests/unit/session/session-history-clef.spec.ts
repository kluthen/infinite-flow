/**
 * The clef the session history records: every phrase of a session carries the clef its
 * instrument's written phrase was drawn in at Start (treble for a built-in, treble or bass for my
 * instrument), as display data beside the phrase, never in its intent. A built-in instrument in
 * any clef but treble, or a clef that is none, is refused at creation.
 */

import { describe, expect, it } from 'vitest'

import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { createSessionHistory, SessionHistoryError } from '@/session/session-history'
import { lowHorn, recordedMyInstrumentSession } from './my-instrument-session'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from './session-harness'

// @test-link [[service_session_history]]
describe("each recorded phrase's clef", () => {
  // @test-link [[service_session_history]]
  // @test-link [[req_my_instrument]]
  it('is the clef my instrument was drawn in at Start, on every phrase, outside the intent', async () => {
    const history = await recordedMyInstrumentSession(lowHorn('bass'), 3)

    const phrases = history.phrases()
    expect(phrases.map((record) => record.clef)).toEqual(['bass', 'bass', 'bass'])
    for (const record of phrases) {
      expect(record.intent.instrumentProfile).toStrictEqual(lowHorn('bass').profile)
      expect(JSON.stringify(record.intent)).not.toContain('bass')
    }
  })

  // @test-link [[service_session_history]]
  it('is treble on every phrase of a built-in session', () => {
    const settings = sessionSettings({ tempo: 240, instrumentProfileId: 'bb-tenor' })
    const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
    driver.tick(1)
    driver.countInOver(1)
    driver.sounding(5, 2)
    driver.end(6)
    const history = createSessionHistory(settings, fixedWallClock, DEFAULT_SESSION_SEED, 'treble')
    for (const output of driver.log) history.record(output)

    expect(history.phrases().map((record) => record.clef)).toEqual(['treble', 'treble'])
  })

  // @test-link [[service_session_history]]
  it.each([
    ['a built-in instrument in bass clef', 'bass'],
    ['a clef that is none', 'alto'],
  ])('refuses %s', (_, clef) => {
    expect(() =>
      createSessionHistory(
        sessionSettings({ instrumentProfileId: 'eb-alto' }),
        fixedWallClock,
        DEFAULT_SESSION_SEED,
        clef as InstrumentClef,
      ),
    ).toThrow(SessionHistoryError)
  })
})
