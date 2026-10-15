import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Toggled per test to make the mocked dynamic import fail or succeed on the next `import()`. */
const importState = vi.hoisted(() => ({ shouldFail: true }))

vi.mock('@/components/workspace/ReviewConfirmationSheet.vue', async () => {
  if (importState.shouldFail) throw new Error('chunk failed to fetch')
  return { default: { name: 'ReviewConfirmationSheet' } }
})

beforeEach(() => {
  importState.shouldFail = true
  vi.resetModules()
})

// @test-link [[rule_kept_played_notes_deletable]]
describe('loadReviewConfirmationSheet', () => {
  // @test-link [[rule_kept_played_notes_deletable]]
  it('rejects with the import failure, then imports again on the next call and can succeed', async () => {
    const { loadReviewConfirmationSheet } = await import('@/components/review/load-review-panel')

    // Vitest wraps the mock factory's throw in its own error, so only the rejection is checked.
    await expect(loadReviewConfirmationSheet()).rejects.toThrow()

    importState.shouldFail = false
    const sheet = await loadReviewConfirmationSheet()
    expect(sheet).toMatchObject({ name: 'ReviewConfirmationSheet' })
  })

  // @test-link [[rule_kept_played_notes_deletable]]
  it('memoizes a successful load, so the warm-up and the opening share one fetch', async () => {
    importState.shouldFail = false
    const { loadReviewConfirmationSheet } = await import('@/components/review/load-review-panel')

    const first = loadReviewConfirmationSheet()
    expect(loadReviewConfirmationSheet()).toBe(first)
    expect(await loadReviewConfirmationSheet()).toBe(await first)
  })
})
