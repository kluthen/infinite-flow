/**
 * The session date: a session's start in local time, in the browser's locale, as the short
 * weekday, the day, the short month, the year, then the hour and minutes.
 */
import { describe, expect, it } from 'vitest'

import { sessionDate } from '@/components/review/session-date'

/** 6 October 2026, 18:42 local time. */
const STARTED_AT = new Date(2026, 9, 6, 18, 42).getTime()

// @test-link [[req_kept_session_review]]
describe('the session date', () => {
  // @test-link [[req_kept_session_review]]
  it("writes the start's weekday, day, month, year, hour and minutes in the locale's own way", () => {
    expect(sessionDate(STARTED_AT, 'en-US')).toMatch(/^Tue, Oct 6, 2026, 6:42\sPM$/u)
    expect(sessionDate(STARTED_AT, 'en-GB')).toMatch(/^Tue,? 6 Oct 2026, 18:42$/u)
  })

  // @test-link [[req_kept_session_review]]
  it('refuses a start that is not a finite time', () => {
    expect(() => sessionDate(Number.NaN)).toThrow(/finite epoch milliseconds/)
  })
})
