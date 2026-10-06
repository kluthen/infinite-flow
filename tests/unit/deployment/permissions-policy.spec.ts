// @vitest-environment node
/**
 * The production container's Permissions-Policy header (docker/security-headers.conf, included in
 * every nginx location): Web MIDI must stay allowed for the app's own origin, or the browser blocks
 * every controller on the deployed site whatever the player's site permission says. The optional
 * capabilities the app never uses stay disabled.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const securityHeadersPath = fileURLToPath(
  new URL('../../../docker/security-headers.conf', import.meta.url),
)

/** Reads the Permissions-Policy value of the conf file and splits it into its directives. */
function permissionsPolicyDirectives(): Map<string, string> {
  const conf = readFileSync(securityHeadersPath, 'utf8')
  const matches = [...conf.matchAll(/^\s*add_header\s+Permissions-Policy\s+"([^"]*)"\s+always;/gm)]
  expect(matches).toHaveLength(1)
  const value = matches[0]?.[1]
  if (value === undefined) {
    throw new Error('No Permissions-Policy header in docker/security-headers.conf')
  }
  const directives = new Map<string, string>()
  for (const directive of value.split(',')) {
    const [feature, allowlist] = directive.trim().split('=')
    if (feature === undefined || allowlist === undefined) {
      throw new Error(`Malformed Permissions-Policy directive: "${directive}"`)
    }
    directives.set(feature, allowlist)
  }
  return directives
}

// @test-link [[req_midi_controller_input]]
describe('Permissions-Policy of the production container', () => {
  it('allows Web MIDI for the app origin', () => {
    expect(permissionsPolicyDirectives().get('midi')).toBe('(self)')
  })

  it('keeps every capability the app does not use disabled', () => {
    const directives = permissionsPolicyDirectives()
    for (const feature of [
      'microphone',
      'camera',
      'geolocation',
      'usb',
      'serial',
      'bluetooth',
      'payment',
    ]) {
      expect(directives.get(feature), feature).toBe('()')
    }
  })

  it('restricts nothing the app needs: screen wake lock and fullscreen stay at their defaults', () => {
    const directives = permissionsPolicyDirectives()
    expect(directives.has('screen-wake-lock')).toBe(false)
    expect(directives.has('fullscreen')).toBe(false)
  })
})
