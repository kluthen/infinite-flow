import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked dynamic import fail or succeed on the next `import()`. */
const importState = vi.hoisted(() => ({ shouldFail: true }))

vi.mock('@/components/review/ReviewPanel.vue', async () => {
  if (importState.shouldFail) throw new Error('chunk failed to fetch')
  return import('../workspace/review-panel-stub')
})

beforeEach(() => {
  importState.shouldFail = true
  vi.resetModules()
})

// @test-link [[req_last_session_review]]
describe('loadReviewPanel', () => {
  // @test-link [[req_last_session_review]]
  it('rejects with the import failure, then imports again on the next call and can succeed', async () => {
    const { loadReviewPanel } = await import('@/components/review/load-review-panel')

    // Vitest wraps the mock factory's throw in its own error, so only the rejection is checked.
    await expect(loadReviewPanel()).rejects.toThrow()

    importState.shouldFail = false
    const panel = await loadReviewPanel()
    expect(panel).toMatchObject({ name: 'ReviewPanel' })
  })

  // @test-link [[req_last_session_review]]
  it('memoizes a successful load, so the warm-up and the mount share one fetch', async () => {
    importState.shouldFail = false
    const { loadReviewPanel } = await import('@/components/review/load-review-panel')

    const first = loadReviewPanel()
    expect(loadReviewPanel()).toBe(first)
    expect(await loadReviewPanel()).toBe(await first)
  })
})
