import { describe, expect, it, vi } from 'vitest'

import {
  createNotationCoordinator,
  NotationCoordinatorUsageError,
} from '@/composables/use-notation-coordinator'
import { NotationError } from '@/notation/notation-error'
import { buildWorkspaceSessionResult } from '../workspace-test-fixtures'

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
