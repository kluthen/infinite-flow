import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked dynamic import fail or succeed on the next `import()`. */
const importState = vi.hoisted(() => ({ shouldFail: true }))

vi.mock('@/components/workspace/ReviewArea.vue', async () => {
  if (importState.shouldFail) throw new Error('chunk failed to fetch')
  return { default: { name: 'ReviewArea' } }
})

beforeEach(() => {
  importState.shouldFail = true
  vi.resetModules()
})

// @test-link [[req_last_session_review]]
describe('loadReviewArea', () => {
  // @test-link [[req_last_session_review]]
  it('rejects with the import failure, then imports again on the next call and can succeed', async () => {
    const { loadReviewArea } = await import('@/components/review/load-review-panel')

    // Vitest wraps the mock factory's throw in its own error, so only the rejection is checked.
    await expect(loadReviewArea()).rejects.toThrow()

    importState.shouldFail = false
    const area = await loadReviewArea()
    expect(area).toMatchObject({ name: 'ReviewArea' })
  })

  // @test-link [[req_last_session_review]]
  it("memoizes a successful load, so a session's warm-up and the Review's mount share one fetch", async () => {
    importState.shouldFail = false
    const { loadReviewArea } = await import('@/components/review/load-review-panel')

    const first = loadReviewArea()
    expect(loadReviewArea()).toBe(first)
    expect(await loadReviewArea()).toBe(await first)
  })
})
