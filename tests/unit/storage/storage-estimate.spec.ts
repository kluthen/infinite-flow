// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { databaseBytes } from '@/storage/storage-estimate'

/** Intent: a browser estimate carrying the usage details some browsers add to it. */
function estimateWith(usageDetails: Record<string, number>): StorageEstimate {
  return { usage: 9_000_000, quota: 50_000_000, usageDetails } as StorageEstimate
}

// @test-link [[req_your_data]]
describe("the database's part of the browser's storage estimate", () => {
  it("counts only the database's bytes, not the other stores the estimate details", () => {
    expect(databaseBytes(estimateWith({ indexedDB: 2_621_440, caches: 5_000_000 }))).toBe(2_621_440)
  })

  it('reads zero when the details name no database', () => {
    expect(databaseBytes(estimateWith({ caches: 5_000_000 }))).toBe(0)
  })

  it("can't say when the estimate carries no details", () => {
    expect(databaseBytes({ usage: 9_000_000, quota: 50_000_000 })).toBeNull()
  })
})
