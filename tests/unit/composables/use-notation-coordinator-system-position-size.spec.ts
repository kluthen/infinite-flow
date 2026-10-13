/**
 * The notation coordinator's two pre-draw checks plan with the shared system-position size the
 * staff reported with its layout inputs, so a check always agrees with what the staff draws; with
 * none reported, the engraver's built-in size applies.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createNotationCoordinator } from '@/composables/use-notation-coordinator'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { fakeEngraver, resetFakeEngraver } from '../notation/fake-vexflow-engraver-loader'
import { buildWorkspaceSessionResult } from '../workspace-test-fixtures'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../notation/fake-vexflow-engraver-loader'),
)

const GROWN_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 900,
  viewport: { layout: 'split', heightBudgetPx: 300 },
  systemPositionUnits: 170,
}

beforeEach(() => {
  resetFakeEngraver()
})

/** Intent: a coordinator whose reporter callbacks do nothing. */
function buildCoordinator() {
  return createNotationCoordinator({
    reportNotationFailure: () => true,
    reportNotationRecovered: () => true,
  })
}

// @test-link [[module_idle_fit_round]]
// @test-link [[module_notation_layout_preflight]]
describe('the coordinator checks in the shared system-position size', () => {
  it('checks a phrase fit with the size the staff reported', async () => {
    const coordinator = buildCoordinator()
    const result = buildWorkspaceSessionResult()
    coordinator.handleLayoutInputs(GROWN_INPUTS)

    await coordinator.checkFit(result)

    expect(fakeEngraver.planWrittenPhraseFit).toHaveBeenCalledExactlyOnceWith(
      transformToWrittenPhrase(
        notationInputFromOutcome(result.outcome, result.intent, BUILT_IN_INSTRUMENT_CLEF),
      ),
      900,
      GROWN_INPUTS.viewport,
      170,
    )
  })

  it('checks the room for a key signature with the size the staff reported', async () => {
    const coordinator = buildCoordinator()
    const result = buildWorkspaceSessionResult()
    const signature = transformToWrittenPhrase(
      notationInputFromOutcome(result.outcome, result.intent, BUILT_IN_INSTRUMENT_CLEF),
    ).key.signature
    coordinator.handleLayoutInputs(GROWN_INPUTS)

    await coordinator.checkRoom(signature)

    expect(fakeEngraver.planStaffRoomForKey).toHaveBeenCalledExactlyOnceWith(
      signature,
      900,
      GROWN_INPUTS.viewport,
      170,
    )
  })
})
