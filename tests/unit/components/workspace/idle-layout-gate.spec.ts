/**
 * The gate in front of the Idle machinery: the staff's reports go straight on at Idle, go to the
 * session alone while it diverts them, and the gate always keeps the latest layout inputs. A
 * session staff failure only ever reaches the diverting session.
 */
import { describe, expect, it, vi, type Mock } from 'vitest'

import {
  createIdleLayoutGate,
  type SessionStaffReports,
  type StaffReports,
} from '@/components/workspace/idle-layout-gate'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'

const INPUTS: StaffLayoutInputs = {
  containerWidthPx: 900,
  viewport: { layout: 'one-system', heightBudgetPx: null },
}

/** The four spied report handlers a session diverts to (Idle has the first three). */
interface SpiedReports extends SessionStaffReports {
  readonly layoutInputs: Mock<StaffReports['layoutInputs']>
  readonly engraved: Mock<StaffReports['engraved']>
  readonly notationError: Mock<StaffReports['notationError']>
  readonly sessionStaffFailed: Mock<SessionStaffReports['sessionStaffFailed']>
}

/** Intent: four spied report handlers. */
function spiedReports(): SpiedReports {
  return {
    layoutInputs: vi.fn<StaffReports['layoutInputs']>(),
    engraved: vi.fn<StaffReports['engraved']>(),
    notationError: vi.fn<StaffReports['notationError']>(),
    sessionStaffFailed: vi.fn<SessionStaffReports['sessionStaffFailed']>(),
  }
}

/** Intent: send one of each report through `reports`. */
function reportAll(reports: StaffReports, error: NotationError): void {
  reports.layoutInputs(INPUTS)
  reports.engraved()
  reports.notationError(error)
}

// @test-link [[service_workspace_session_flow]]
describe('idle layout gate', () => {
  // @test-link [[service_workspace_session_flow]]
  it('passes every report straight to the Idle machinery and keeps the latest inputs', () => {
    const idle = spiedReports()
    const gate = createIdleLayoutGate(idle)
    const error = new NotationError('notation_no_room', 'no room', {})
    expect(gate.latestInputs()).toBeNull()

    reportAll(gate, error)

    expect(idle.layoutInputs).toHaveBeenCalledExactlyOnceWith(INPUTS)
    expect(idle.engraved).toHaveBeenCalledOnce()
    expect(idle.notationError).toHaveBeenCalledExactlyOnceWith(error)
    expect(gate.latestInputs()).toBe(INPUTS)
    expect(gate.idle).toBe(idle)
  })

  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('sends every report to the session alone while diverted, and back to Idle once released', () => {
    const idle = spiedReports()
    const session = spiedReports()
    const gate = createIdleLayoutGate(idle)
    const error = new NotationError('notation_notes_too_wide', 'too wide', {})

    const release = gate.divert(session)
    reportAll(gate, error)

    expect(idle.layoutInputs).not.toHaveBeenCalled()
    expect(idle.engraved).not.toHaveBeenCalled()
    expect(idle.notationError).not.toHaveBeenCalled()
    expect(session.layoutInputs).toHaveBeenCalledExactlyOnceWith(INPUTS)
    expect(session.engraved).toHaveBeenCalledOnce()
    expect(session.notationError).toHaveBeenCalledExactlyOnceWith(error)
    expect(gate.latestInputs()).toBe(INPUTS)

    release()
    gate.engraved()
    expect(idle.engraved).toHaveBeenCalledOnce()
    expect(session.engraved).toHaveBeenCalledOnce()
  })

  // @test-link [[module_session_rolling_display]]
  it('sends a session staff failure to the diverting session only, and nowhere once released', () => {
    const idle = spiedReports()
    const session = spiedReports()
    const gate = createIdleLayoutGate(idle)
    const error = new NotationError('notation_engraving_failed', 'failed', {})

    gate.sessionStaffFailed(error)
    const release = gate.divert(session)
    gate.sessionStaffFailed(error)
    release()
    gate.sessionStaffFailed(error)

    expect(session.sessionStaffFailed).toHaveBeenCalledExactlyOnceWith(error)
    expect(idle.sessionStaffFailed).not.toHaveBeenCalled()
    expect(idle.notationError).not.toHaveBeenCalled()
  })

  // @test-link [[service_workspace_session_flow]]
  it('throws on a second diversion and on a second release', () => {
    const gate = createIdleLayoutGate(spiedReports())
    const release = gate.divert(spiedReports())

    expect(() => gate.divert(spiedReports())).toThrow(/already diverted/)
    release()
    expect(() => release()).toThrow(/has ended/)
  })
})
