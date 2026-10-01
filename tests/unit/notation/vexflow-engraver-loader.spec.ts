import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked dynamic import fail or succeed on the next `import()`. */
const importState = vi.hoisted(() => ({ shouldFail: true }))

vi.mock('@/notation/vexflow-engraver', async (importOriginal) => {
  if (importState.shouldFail) throw new Error('chunk failed to fetch')
  return importOriginal()
})

beforeEach(() => {
  importState.shouldFail = true
  vi.resetModules()
})

// @test-link [[module_notation_layout_preflight]]
describe('loadVexflowEngraver', () => {
  it('wraps a rejected dynamic import as a retryable notation_engraving_failed NotationError', async () => {
    const { loadVexflowEngraver } = await import('@/notation/vexflow-engraver-loader')

    const rejection = loadVexflowEngraver()
    await expect(rejection).rejects.toMatchObject({
      kind: 'NotationError',
      code: 'notation_engraving_failed',
      cause: expect.any(Error),
    })
  })

  it('resets the memoized load after a failure, so a later call (a Retry) imports again and can succeed', async () => {
    const { loadVexflowEngraver } = await import('@/notation/vexflow-engraver-loader')

    await expect(loadVexflowEngraver()).rejects.toMatchObject({ kind: 'NotationError' })

    importState.shouldFail = false
    const loaded = await loadVexflowEngraver()
    expect(typeof loaded.engraveWrittenPhrase).toBe('function')
    expect(typeof loaded.engravePhraseSystem).toBe('function')
    expect(typeof loaded.ensureNotationFonts).toBe('function')
  })

  it('memoizes a successful load so concurrent and later callers share the same module instance', async () => {
    importState.shouldFail = false
    const { loadVexflowEngraver } = await import('@/notation/vexflow-engraver-loader')

    const [first, second] = await Promise.all([loadVexflowEngraver(), loadVexflowEngraver()])
    expect(second).toBe(first)
    expect(await loadVexflowEngraver()).toBe(first)
  })
})
