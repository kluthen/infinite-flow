/**
 * The channel of the reports of the deletions of damaged kept sessions, built with the workspace:
 * a report reaches every listener attached when it is told, a stopped listener hears no more, and
 * a count below 1 is a defect.
 */
import { describe, expect, it } from 'vitest'

import {
  createDamagedSessionReports,
  type DamagedSessionsReport,
} from '@/components/workspace/workspace-kept-sessions-seam'

// @test-link [[module_kept_session_save]]
describe("the damaged sessions' reports", () => {
  it('reach every listener attached when told, and none after it stopped', () => {
    const reports = createDamagedSessionReports()
    const first: DamagedSessionsReport[] = []
    const second: DamagedSessionsReport[] = []
    reports.tell({ status: 'deleted', count: 1 })
    const stop = reports.listen((report) => first.push(report))
    reports.listen((report) => second.push(report))

    reports.tell({ status: 'deleted', count: 2 })
    stop()
    reports.tell({ status: 'refused', kind: 'quota', count: 1 })

    expect(first).toEqual([{ status: 'deleted', count: 2 }])
    expect(second).toEqual([
      { status: 'deleted', count: 2 },
      { status: 'refused', kind: 'quota', count: 1 },
    ])
  })

  it('refuses a count below 1, the defect it is', () => {
    const reports = createDamagedSessionReports()

    expect(() => reports.tell({ status: 'deleted', count: 0 })).toThrow('no count')
    expect(() => reports.tell({ status: 'refused', kind: 'other', count: 1.5 })).toThrow()
  })
})
