// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { APP_VERSION } from '@/storage/app-version'

/** Intent: the version field of the repository's package.json, read from disk. */
function packageVersion(): unknown {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
  )
  return (manifest as { version?: unknown }).version
}

describe('the app version records are written with', () => {
  // @test-link [[module_on_device_database]]
  it("is package.json's version, injected at build time", () => {
    expect(APP_VERSION).toBe(packageVersion())
    expect(APP_VERSION).not.toBe('')
  })
})
