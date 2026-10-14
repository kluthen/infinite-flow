/**
 * The session date: a session's start in local time, written with the browser's locale as the
 * short weekday, the day, the short month, the year, then the hour and minutes ("Tue, Oct 6, 2026,
 * 6:42 PM" in US English). The one way a session's start is written, in a review's title or
 * summary and in the session list's rows.
 */

/** The fields of the session date, in the locale's own order and punctuation. */
const SESSION_DATE_FIELDS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/**
 * Intent: the session date of a session that started at `startedAtMs` (epoch milliseconds), in
 * `locale` (the browser's by default) and the time zone the runtime is in; throws on a start that
 * is not a finite time.
 */
// @spec-link [[req_kept_session_review]]
export function sessionDate(startedAtMs: number, locale?: string): string {
  if (!Number.isFinite(startedAtMs)) {
    throw new Error(`session date: the start must be finite epoch milliseconds, got ${startedAtMs}`)
  }
  return new Intl.DateTimeFormat(locale, SESSION_DATE_FIELDS).format(startedAtMs)
}
