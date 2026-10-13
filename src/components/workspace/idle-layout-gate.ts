/**
 * The gate the staff's reports pass through on their way to the Idle machinery: its layout inputs
 * and the outcome of each engraving, as `PhraseScore` emits them. At Idle they go straight on. While
 * a practice session runs, the session diverts them to itself, so the Idle fit retries, room notice,
 * regeneration and notation-error capture never act on phrase 1 during it; at its end the session
 * hands them back and re-applies what it held. The gate always keeps the latest layout inputs, and
 * tells its passive observers of each layout-input report, at Idle and during a session alike. A
 * session staff failure (the staff failing to show a running session) only ever goes to the
 * session, never to Idle. It lives in the entry chunk, so it holds no session logic: that is the
 * session controller's.
 */
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'

/** What the staff reports: its layout inputs and the outcome of each engraving. */
// @spec-link [[module_idle_layout_gate]]
export interface StaffReports {
  readonly layoutInputs: (inputs: StaffLayoutInputs) => void
  readonly engraved: () => void
  readonly notationError: (error: NotationError) => void
}

/** What a session hears from the staff: the Idle reports plus its own staff's failure. */
// @spec-link [[module_idle_layout_gate]]
// @spec-link [[module_session_staff_engraving_outcomes]]
export interface SessionStaffReports extends StaffReports {
  readonly sessionStaffFailed: (error: NotationError) => void
}

/** What a session uses of the gate: the latest inputs, the diversion, and the Idle handlers. */
// @spec-link [[module_idle_layout_gate]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export interface IdleLayoutPort {
  /** The staff's latest layout inputs, whoever received them; null before it reported any. */
  readonly latestInputs: () => StaffLayoutInputs | null
  /**
   * Send every report to `listener` instead of the Idle machinery until the returned function is
   * called. Diverting while already diverted, or releasing twice, throws.
   */
  readonly divert: (listener: SessionStaffReports) => () => void
  /** The Idle machinery's own handlers, for re-applying held reports at a session's end. */
  readonly idle: StaffReports
  /**
   * Tell `listener` of every later layout-input report, after its receiver, at Idle and during a
   * session alike, until the returned function is called; stopping twice throws, and a listener
   * already observing is not added again. It receives nothing else and changes nothing the gate
   * does.
   */
  // @spec-link [[module_idle_pregeneration_queue]]
  readonly observeInputs: (listener: (inputs: StaffLayoutInputs) => void) => () => void
}

/** The gate: the staff-facing handlers plus the session-facing port. */
export interface IdleLayoutGate extends SessionStaffReports, IdleLayoutPort {}

/**
 * Intent: a gate in front of the Idle machinery's `idle` handlers, passing reports straight on.
 * A session staff failure goes to the diverting session only; with none diverting it is dropped:
 * the staff stops showing a session when it ends, so an engraving of it still in flight then
 * belongs to no session and reports nowhere.
 */
// @spec-link [[module_idle_layout_gate]]
// @spec-link [[module_session_staff_engraving_outcomes]]
export function createIdleLayoutGate(idle: StaffReports): IdleLayoutGate {
  let latest: StaffLayoutInputs | null = null
  let diverted: SessionStaffReports | null = null
  const observers = new Set<(inputs: StaffLayoutInputs) => void>()

  /** Intent: whoever receives the staff's reports now. */
  const receiver = (): StaffReports => diverted ?? idle

  return {
    layoutInputs: (inputs) => {
      latest = inputs
      receiver().layoutInputs(inputs)
      for (const observer of [...observers]) observer(inputs)
    },
    engraved: () => receiver().engraved(),
    notationError: (error) => receiver().notationError(error),
    sessionStaffFailed: (error) => diverted?.sessionStaffFailed(error),
    latestInputs: () => latest,
    divert: (listener) => {
      if (diverted !== null) throw new Error('idle layout gate: the reports are already diverted')
      diverted = listener
      return () => {
        if (diverted !== listener) throw new Error('idle layout gate: this diversion has ended')
        diverted = null
      }
    },
    idle,
    observeInputs: (listener) => {
      observers.add(listener)
      return () => {
        if (!observers.delete(listener)) throw new Error('idle layout gate: observer stopped twice')
      }
    },
  }
}
