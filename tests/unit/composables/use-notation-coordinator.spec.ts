import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createNotationCoordinator,
  NotationCoordinatorUsageError,
} from '@/composables/use-notation-coordinator'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import {
  fakeEngraver,
  loadVexflowEngraver,
  resetFakeEngraver,
} from '../notation/fake-vexflow-engraver-loader'
import { buildWorkspaceSessionResult } from '../workspace-test-fixtures'

vi.mock(
  '@/notation/vexflow-engraver-loader',
  () => import('../notation/fake-vexflow-engraver-loader'),
)

beforeEach(() => {
  resetFakeEngraver()
})

/** Intent: build a coordinator with spy-wrapped reporter callbacks for assertion convenience. */
function buildCoordinator() {
  const reportNotationFailure = vi.fn(() => true)
  const reportNotationRecovered = vi.fn(() => true)
  const coordinator = createNotationCoordinator({ reportNotationFailure, reportNotationRecovered })
  return { coordinator, reportNotationFailure, reportNotationRecovered }
}

// @test-link [[module_notation_layout_preflight]]
// @test-link [[service_workspace_session_flow]]
describe('createNotationCoordinator', () => {
  it('publishes the transformed phrase and resolves once PhraseScore reports it engraved', async () => {
    const { coordinator, reportNotationFailure, reportNotationRecovered } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    expect(coordinator.pendingPhrase.value).toBeNull()
    const pending = coordinator.notate(result)
    expect(coordinator.pendingPhrase.value).not.toBeNull()

    coordinator.handleEngraved()
    await expect(pending).resolves.toBeUndefined()
    expect(reportNotationFailure).not.toHaveBeenCalled()
    expect(reportNotationRecovered).not.toHaveBeenCalled()
  })

  it('rejects the pending notate() call when PhraseScore reports a notation error', async () => {
    const { coordinator, reportNotationFailure, reportNotationRecovered } = buildCoordinator()
    const result = buildWorkspaceSessionResult()
    const error = new NotationError('notation_engraving_failed', 'boom', {})

    const pending = coordinator.notate(result)
    coordinator.handleNotationError(error)

    await expect(pending).rejects.toBe(error)
    expect(reportNotationFailure).not.toHaveBeenCalled()
    expect(reportNotationRecovered).not.toHaveBeenCalled()
  })

  it('crashes early when a second notate() call arrives before the first settles', () => {
    const { coordinator } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    void coordinator.notate(result).catch(() => {})
    expect(() => coordinator.notate(result)).toThrow(NotationCoordinatorUsageError)
  })

  it('reports nothing for an unsolicited engraved event when no phrase has ever been published', () => {
    const { coordinator, reportNotationRecovered } = buildCoordinator()

    coordinator.handleEngraved()

    expect(reportNotationRecovered).not.toHaveBeenCalled()
  })

  it('reports nothing for an unsolicited notation-error event when no phrase has ever been published', () => {
    const { coordinator, reportNotationFailure } = buildCoordinator()
    const error = new NotationError('notation_bounds_exceeded', 'boom', {})

    coordinator.handleNotationError(error)

    expect(reportNotationFailure).not.toHaveBeenCalled()
  })

  // @test-link [[service_workspace_session_flow]]
  it('routes an unsolicited engraved event to reportNotationRecovered once a phrase has settled', async () => {
    const { coordinator, reportNotationRecovered } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const pending = coordinator.notate(result)
    coordinator.handleEngraved()
    await pending

    coordinator.handleEngraved()

    expect(reportNotationRecovered).toHaveBeenCalledExactlyOnceWith()
  })

  // @test-link [[service_workspace_session_flow]]
  it('routes an unsolicited notation-error event to reportNotationFailure once a phrase has settled', async () => {
    const { coordinator, reportNotationFailure } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const pending = coordinator.notate(result)
    coordinator.handleEngraved()
    await pending

    const error = new NotationError('notation_bounds_exceeded', 'boom', {})
    coordinator.handleNotationError(error)

    expect(reportNotationFailure).toHaveBeenCalledExactlyOnceWith(error)
  })

  // @test-link [[service_workspace_session_flow]]
  it('keeps reporting on the latest notate() even when that request was itself rejected', async () => {
    const { coordinator, reportNotationFailure, reportNotationRecovered } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const first = coordinator.notate(result)
    coordinator.handleEngraved()
    await first

    const second = coordinator.notate(result)
    const rejection = new NotationError('notation_engraving_failed', 'boom', {})
    coordinator.handleNotationError(rejection)
    await expect(second).rejects.toBe(rejection)

    const unsolicitedErrorOne = new NotationError('notation_bounds_exceeded', 'boom-1', {})
    coordinator.handleNotationError(unsolicitedErrorOne)
    const unsolicitedErrorTwo = new NotationError('notation_bounds_exceeded', 'boom-2', {})
    coordinator.handleNotationError(unsolicitedErrorTwo)

    expect(reportNotationFailure).toHaveBeenNthCalledWith(1, unsolicitedErrorOne)
    expect(reportNotationFailure).toHaveBeenNthCalledWith(2, unsolicitedErrorTwo)

    coordinator.handleEngraved()

    expect(reportNotationRecovered).toHaveBeenCalledExactlyOnceWith()
  })

  // @test-link [[service_workspace_session_flow]]
  it('reports nothing for an unsolicited event after clearPresentedPhrase() drops the published phrase', async () => {
    const { coordinator, reportNotationFailure, reportNotationRecovered } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const pending = coordinator.notate(result)
    coordinator.handleEngraved()
    await pending
    coordinator.clearPresentedPhrase()

    coordinator.handleEngraved()
    coordinator.handleNotationError(new NotationError('notation_bounds_exceeded', 'boom', {}))

    expect(reportNotationRecovered).not.toHaveBeenCalled()
    expect(reportNotationFailure).not.toHaveBeenCalled()
  })

  it('allows a fresh notate() call once the previous one has settled', async () => {
    const { coordinator } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const first = coordinator.notate(result)
    coordinator.handleEngraved()
    await first

    const second = coordinator.notate(result)
    coordinator.handleEngraved()
    await expect(second).resolves.toBeUndefined()
    expect(coordinator.pendingPhrase.value).not.toBeNull()
  })

  it('clearPresentedPhrase drops a settled phrase back to null', async () => {
    const { coordinator } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    const pending = coordinator.notate(result)
    coordinator.handleEngraved()
    await pending
    expect(coordinator.pendingPhrase.value).not.toBeNull()

    coordinator.clearPresentedPhrase()
    expect(coordinator.pendingPhrase.value).toBeNull()
  })

  it('clearPresentedPhrase crashes early while a notate() call is still pending', () => {
    const { coordinator } = buildCoordinator()
    const result = buildWorkspaceSessionResult()

    void coordinator.notate(result).catch(() => {})

    expect(() => coordinator.clearPresentedPhrase()).toThrow(NotationCoordinatorUsageError)
  })
})

const WIDE_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 1200,
  viewport: { layout: 'one-system' },
}
const PHONE_INPUTS: StaffLayoutInputs = {
  containerWidthPx: 390,
  viewport: { layout: 'split', heightBudgetPx: 300 },
}

/** Intent: the key signature a real written phrase carries, as the session passes to checkRoom. */
function realSignature() {
  const result = buildWorkspaceSessionResult()
  return transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent)).key
    .signature
}

// @test-link [[module_idle_fit_round]]
describe('createNotationCoordinator staff layout reports and fit checks', () => {
  // @test-link [[module_idle_fit_round]]
  it('forwards every reported layout input to each subscriber until it unsubscribes', () => {
    const { coordinator } = buildCoordinator()
    const first = vi.fn()
    const second = vi.fn()
    const stopFirst = coordinator.staffLayout.subscribe(first)
    coordinator.staffLayout.subscribe(second)

    coordinator.handleLayoutInputs(WIDE_INPUTS)
    stopFirst()
    coordinator.handleLayoutInputs(PHONE_INPUTS)

    expect(first.mock.calls).toEqual([[WIDE_INPUTS]])
    expect(second.mock.calls).toEqual([[WIDE_INPUTS], [PHONE_INPUTS]])
  })

  // @test-link [[module_idle_fit_round]]
  it('checks a result with its own written phrase against the latest layout inputs', async () => {
    const { coordinator } = buildCoordinator()
    const result = buildWorkspaceSessionResult()
    fakeEngraver.planWrittenPhraseFit.mockReturnValue({ kind: 'notes_too_wide' })
    coordinator.handleLayoutInputs(WIDE_INPUTS)
    coordinator.handleLayoutInputs(PHONE_INPUTS)

    await expect(coordinator.checkFit(result)).resolves.toEqual({ kind: 'notes_too_wide' })

    expect(fakeEngraver.ensureNotationFonts).toHaveBeenCalled()
    expect(fakeEngraver.planWrittenPhraseFit).toHaveBeenCalledExactlyOnceWith(
      transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent)),
      PHONE_INPUTS.containerWidthPx,
      PHONE_INPUTS.viewport,
    )
  })

  // @test-link [[module_idle_fit_round]]
  it('plans with the inputs reported while the engraver module was still loading', async () => {
    const { coordinator } = buildCoordinator()
    let finishLoad: (module: typeof fakeEngraver) => void = () => undefined
    loadVexflowEngraver.mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoad = resolve
      }),
    )
    coordinator.handleLayoutInputs(WIDE_INPUTS)

    const checking = coordinator.checkFit(buildWorkspaceSessionResult())
    coordinator.handleLayoutInputs(PHONE_INPUTS)
    finishLoad(fakeEngraver)
    await checking

    expect(fakeEngraver.planWrittenPhraseFit).toHaveBeenCalledWith(
      expect.anything(),
      PHONE_INPUTS.containerWidthPx,
      PHONE_INPUTS.viewport,
    )
  })

  // @test-link [[module_idle_fit_round]]
  it('checks the room for a key signature against the latest layout inputs', async () => {
    const { coordinator } = buildCoordinator()
    fakeEngraver.planStaffRoomForKey.mockReturnValue({ kind: 'no_room', cause: 'too_short' })
    coordinator.handleLayoutInputs(PHONE_INPUTS)

    const signature = realSignature()

    await expect(coordinator.checkRoom(signature)).resolves.toEqual({
      kind: 'no_room',
      cause: 'too_short',
    })

    expect(fakeEngraver.planStaffRoomForKey).toHaveBeenCalledExactlyOnceWith(
      signature,
      PHONE_INPUTS.containerWidthPx,
      PHONE_INPUTS.viewport,
    )
  })

  // @test-link [[module_idle_fit_round]]
  it('rejects both checks with a retryable container-unavailable error before any inputs arrive', async () => {
    const { coordinator } = buildCoordinator()

    await expect(coordinator.checkFit(buildWorkspaceSessionResult())).rejects.toMatchObject({
      kind: 'NotationError',
      code: 'notation_container_unavailable',
    })
    await expect(coordinator.checkRoom(realSignature())).rejects.toMatchObject({
      kind: 'NotationError',
      code: 'notation_container_unavailable',
    })
    expect(fakeEngraver.planWrittenPhraseFit).not.toHaveBeenCalled()
    expect(fakeEngraver.planStaffRoomForKey).not.toHaveBeenCalled()
  })

  // @test-link [[module_idle_fit_round]]
  it("lets the loader's and the fonts' own notation errors through unchanged", async () => {
    const { coordinator } = buildCoordinator()
    coordinator.handleLayoutInputs(WIDE_INPUTS)
    const loadFailure = new NotationError('notation_engraving_failed', 'chunk failed', {})
    loadVexflowEngraver.mockRejectedValueOnce(loadFailure)
    const fontFailure = new NotationError('notation_font_unavailable', 'no Bravura', {})
    fakeEngraver.ensureNotationFonts.mockRejectedValueOnce(fontFailure)

    await expect(coordinator.checkFit(buildWorkspaceSessionResult())).rejects.toBe(loadFailure)
    await expect(coordinator.checkRoom(realSignature())).rejects.toBe(fontFailure)
  })
})
