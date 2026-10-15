/**
 * The notation coordinator draws and checks each phrase in the clef of the instrument its intent
 * names (my instrument's own clef, treble for a built-in), and checks the staff's room in the
 * selected instrument's clef: no built-in clef stands in for my instrument's.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createNotationCoordinator } from '@/composables/use-notation-coordinator'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { fakeEngraver, resetFakeEngraver } from '../notation/fake-vexflow-engraver-loader'
import { buildWorkspaceSessionResult } from '../workspace-test-fixtures'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../notation/fake-vexflow-engraver-loader'),
)

const INPUTS: StaffLayoutInputs = {
  containerWidthPx: 900,
  viewport: { layout: 'split', heightBudgetPx: 300 },
}

beforeEach(() => {
  resetFakeEngraver()
})

/** Intent: a coordinator drawing every instrument in `clef`, whose reports do nothing. */
function coordinatorIn(clef: InstrumentClef) {
  const of = vi.fn(() => clef)
  const coordinator = createNotationCoordinator(
    { reportNotationFailure: () => true, reportNotationRecovered: () => true },
    { of, selected: () => clef },
  )
  return { coordinator, of }
}

// @test-link [[entity_my_instrument]]
// @test-link [[module_idle_fit_round]]
describe('the coordinator draws and checks in the instrument clef', () => {
  // @test-link [[entity_my_instrument]]
  it('writes a phrase in the clef of the instrument its intent names', async () => {
    const { coordinator, of } = coordinatorIn('bass')
    const result = buildWorkspaceSessionResult()
    coordinator.handleLayoutInputs(INPUTS)

    void coordinator.notate(result)
    expect(coordinator.pendingPhrase.value?.clef).toBe('bass')
    expect(of).toHaveBeenCalledWith(result.intent.controls.instrumentProfileId)
    coordinator.handleEngraved()

    await coordinator.checkFit(result)
    expect(fakeEngraver.planWrittenPhraseFit.mock.calls[0]?.[0].clef).toBe('bass')
  })

  // @test-link [[entity_my_instrument]]
  // @test-link [[rule_staff_needs_room_notice]]
  it("checks the staff's room in the selected instrument's clef", async () => {
    const { coordinator } = coordinatorIn('bass')
    const result = buildWorkspaceSessionResult()
    coordinator.handleLayoutInputs(INPUTS)
    void coordinator.notate(result)
    const signature = coordinator.pendingPhrase.value!.key.signature

    await coordinator.checkRoom(signature)

    expect(fakeEngraver.planStaffRoomForKey).toHaveBeenCalledExactlyOnceWith(
      'bass',
      signature,
      900,
      INPUTS.viewport,
    )
  })
})
