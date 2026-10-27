/**
 * Jam's one loader over a mocked code entry: every caller shares one import and one promise, and a
 * failed import clears the memo, so the next call imports again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked import fail or succeed; counts the imports made. */
const importState = { shouldFail: false, imports: 0 }

// A fresh module registry and mock per test, so each test's loader starts with no memo and every
// import it makes runs the factory again.
beforeEach(() => {
  importState.shouldFail = false
  importState.imports = 0
  vi.resetModules()
  vi.doMock('@/jam/jam-mode', () => {
    importState.imports += 1
    if (importState.shouldFail) throw new Error('chunk failed to fetch')
    return { JamWorkspace: { name: 'JamWorkspaceStub' } }
  })
})

afterEach(() => {
  vi.doUnmock('@/jam/jam-mode')
})

// @test-link [[module_jam_code_boundary]]
describe('loadJamMode', () => {
  // @test-link [[module_jam_code_boundary]]
  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('imports Jam code once for every caller, sharing one promise', async () => {
    const { loadJamMode } = await import('@/components/workspace/load-jam-mode')

    const first = loadJamMode()
    const second = loadJamMode()

    expect(second).toBe(first)
    expect(await second).toMatchObject({ JamWorkspace: { name: 'JamWorkspaceStub' } })
    expect(loadJamMode()).toBe(first)
    expect(importState.imports).toBe(1)
  })

  // @test-link [[module_jam_code_boundary]]
  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('clears the memo on a failed import, so the next call imports again', async () => {
    importState.shouldFail = true
    const { loadJamMode } = await import('@/components/workspace/load-jam-mode')

    const failed = loadJamMode()
    // Vitest wraps the mock factory's throw in its own error, so only the rejection is checked.
    await expect(failed).rejects.toThrow()
    expect(importState.imports).toBe(1)

    importState.shouldFail = false
    const retried = loadJamMode()
    expect(retried).not.toBe(failed)
    expect(await retried).toMatchObject({ JamWorkspace: { name: 'JamWorkspaceStub' } })
    expect(importState.imports).toBe(2)
  })
})

// @test-link [[module_jam_code_boundary]]
describe('failedModuleUrl', () => {
  // @test-link [[module_jam_code_boundary]]
  it("reads the failed module's URL from Chromium's failure, without its query", async () => {
    const { failedModuleUrl } = await import('@/components/workspace/load-jam-mode')
    const url = 'http://127.0.0.1:4173/assets/jam-mode-BzoVMxZG.js'

    expect(
      failedModuleUrl(new TypeError(`Failed to fetch dynamically imported module: ${url}`)),
    ).toBe(url)
    expect(
      failedModuleUrl(new TypeError(`Failed to fetch dynamically imported module: ${url}?retry=2`)),
    ).toBe(url)
  })

  // @test-link [[module_jam_code_boundary]]
  it('names no URL for a failure that names none', async () => {
    const { failedModuleUrl } = await import('@/components/workspace/load-jam-mode')

    expect(failedModuleUrl(new Error('chunk failed to fetch'))).toBeNull()
    expect(failedModuleUrl('offline')).toBeNull()
  })
})
