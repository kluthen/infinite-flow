// @vitest-environment node
/**
 * The workspace's `Jam again on this doodle` (master spec C5.11; rule_jam_again_on_this_doodle):
 * over Jam mode, the reviewed session's doodle kept in place of any other, then the review closed;
 * over session mode, the review closed, Jam mode entered between, then the doodle kept; and, the
 * reviewed session being the one the kept doodle comes from, the review closed and the doodle kept
 * as it is.
 */
import { describe, expect, it } from 'vitest'

import { workspaceReviewJamPorts } from '@/components/workspace/review-jam-ports'
import type { ReviewedJamPart } from '@/components/workspace/session-jam-part'
import type { WorkspaceMode } from '@/components/workspace/use-workspace-mode'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'

import { reviewedJamPart } from './reviewed-jam-part-fixture'

/** The ports over a logged workspace, in `mode`, the kept doodle from `keptFrom` (or none). */
function ports(mode: WorkspaceMode, keptFrom: string | null = null) {
  const log: string[] = []
  const kept: { jam: ReviewedJamPart; sessionKey: string }[] = []
  const made = workspaceReviewJamPorts({
    jamSettings: {
      reviewKeyAndMode: () => ({ tonalCenter: 'C', collection: 'Major' }),
      changeFromReview: () => {},
    },
    instrument: () => C_KEYBOARD_PROFILE,
    settingChanged: () => {},
    mode: () => mode,
    selectJam: () => log.push('select Jam'),
    jamShown: () => {
      log.push('Jam shown')
      return Promise.resolve()
    },
    closeReview: async (between) => {
      log.push('close review')
      await between?.()
    },
    keptDoodleSession: () => keptFrom,
    keepDoodle: (jam, sessionKey) => {
      log.push(`keep ${sessionKey}`)
      kept.push({ jam, sessionKey })
    },
  })
  return { ports: made, log, kept }
}

// @test-link [[rule_jam_again_on_this_doodle]]
// @test-link [[module_kept_doodle]]
describe('Jam again on this doodle', () => {
  it("over Jam mode, keeps the reviewed session's doodle in place of any other, then closes the review", async () => {
    const run = ports('jam', 'session-other')
    const jam = reviewedJamPart()

    await run.ports.jamAgain({ jam, sessionKey: 'session-1' })

    expect(run.log).toEqual(['keep session-1', 'close review'])
    expect(run.kept[0]?.jam).toBe(jam)
  })

  it('over session mode, closes the review, enters Jam mode, then keeps the doodle', async () => {
    const run = ports('session')
    const jam = reviewedJamPart()

    await run.ports.jamAgain({ jam, sessionKey: 'session-1' })

    expect(run.log).toEqual(['close review', 'select Jam', 'Jam shown', 'keep session-1'])
    expect(run.kept[0]?.jam).toBe(jam)
  })

  it('on the session the kept doodle comes from, closes the review and keeps that doodle as it is', async () => {
    const run = ports('jam', 'session-1')

    await run.ports.jamAgain({ jam: reviewedJamPart(), sessionKey: 'session-1' })

    expect(run.log).toEqual(['close review'])
  })
})
