import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked dynamic import fail or succeed on the next `import()`. */
const importState = vi.hoisted(() => ({ shouldFail: true }))

vi.mock('@/export/generated-notes-file', async (importOriginal) => {
  if (importState.shouldFail) throw new Error('chunk failed to fetch')
  return importOriginal()
})

beforeEach(() => {
  importState.shouldFail = true
  vi.resetModules()
})

// @test-link [[req_session_export]]
describe('loadGeneratedNotesExport', () => {
  // @test-link [[req_session_export]]
  it('wraps a rejected dynamic import as a typed GeneratedNotesExportLoadError', async () => {
    const { loadGeneratedNotesExport } = await import('@/export/load-generated-notes-export')

    await expect(loadGeneratedNotesExport()).rejects.toMatchObject({
      kind: 'GeneratedNotesExportLoadError',
      cause: expect.any(Error),
    })
  })

  // @test-link [[req_session_export]]
  it('clears the memo after a failure, so the next export imports again and can succeed', async () => {
    const { loadGeneratedNotesExport } = await import('@/export/load-generated-notes-export')

    await expect(loadGeneratedNotesExport()).rejects.toMatchObject({
      kind: 'GeneratedNotesExportLoadError',
    })

    importState.shouldFail = false
    const loaded = await loadGeneratedNotesExport()
    expect(typeof loaded.buildGeneratedNotesFile).toBe('function')
    expect(typeof loaded.generatedNotesFileName).toBe('function')
  })

  // @test-link [[req_session_export]]
  it('memoizes a successful load so concurrent and later exports share one module', async () => {
    importState.shouldFail = false
    const { loadGeneratedNotesExport } = await import('@/export/load-generated-notes-export')

    const first = loadGeneratedNotesExport()
    expect(loadGeneratedNotesExport()).toBe(first)
    const [one, two] = await Promise.all([first, loadGeneratedNotesExport()])
    expect(two).toBe(one)
    expect(await loadGeneratedNotesExport()).toBe(one)
  })
})
