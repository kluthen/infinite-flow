/**
 * Step 10 release: the first-release "no optional scope" boundary, verified against the production
 * preview build (port 4173) -- the required controls/generate/regenerate/notation-mode workflow
 * never requests MIDI, audio, or microphone access, never makes a network request beyond this
 * origin's own static build output, and never renders a playback, scoring, or MIDI control.
 */
import { expect, test } from '@playwright/test'

import { generateAndAwaitReady, gotoWorkspace, radio } from '../workspace/helpers'

/**
 * Intent: a full control/generate/regenerate/notation-switch pass through the required workflow,
 * on a page that has already navigated to the workspace.
 */
async function exerciseRequiredWorkflow(page: import('@playwright/test').Page): Promise<void> {
  await generateAndAwaitReady(page)
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await generateAndAwaitReady(page)
  await radio(page, 'Display notation', 'Concert').click()
  await radio(page, 'Presentation theme', 'Dark').click()
}

// @test-link [[rule_optional_midi_privacy]]
// @test-link [[specification_browser_only_operation_verification]]
test.describe('optional browser scope is never requested by the required workflow', () => {
  test('MIDI, audio, and microphone access are never requested', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: string[] = []
      ;(window as unknown as { __optionalScopeCalls: string[] }).__optionalScopeCalls = calls
      const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<unknown> }
      if (typeof nav.requestMIDIAccess === 'function') {
        const original = nav.requestMIDIAccess.bind(nav)
        nav.requestMIDIAccess = (...args: Parameters<typeof original>) => {
          calls.push('requestMIDIAccess')
          return original(...args)
        }
      }
      if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
        const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        navigator.mediaDevices.getUserMedia = (...args: Parameters<typeof original>) => {
          calls.push('getUserMedia')
          return original(...args)
        }
      }
      for (const ctorName of ['AudioContext', 'webkitAudioContext'] as const) {
        const globalWindow = window as unknown as Record<string, unknown>
        const OriginalCtor = globalWindow[ctorName] as (new () => unknown) | undefined
        if (OriginalCtor) {
          globalWindow[ctorName] = new Proxy(OriginalCtor, {
            construct(target, args) {
              calls.push(ctorName)
              return Reflect.construct(target as new () => unknown, args)
            },
          })
        }
      }
    })

    await gotoWorkspace(page)
    await exerciseRequiredWorkflow(page)

    const calls = await page.evaluate(
      () => (window as unknown as { __optionalScopeCalls: string[] }).__optionalScopeCalls,
    )
    expect(calls).toEqual([])
  })

  test('no network request travels beyond this origin, and none is XHR, fetch, WebSocket, or SSE', async ({
    page,
  }) => {
    const offendingRequests: string[] = []
    const disallowedResourceTypes = new Set(['xhr', 'fetch', 'websocket', 'eventsource'])
    const crossOriginRequests: string[] = []
    let origin: string | null = null
    page.on('request', (request) => {
      if (disallowedResourceTypes.has(request.resourceType())) {
        offendingRequests.push(`${request.resourceType()}: ${request.url()}`)
      }
      if (origin !== null && new URL(request.url()).origin !== origin) {
        crossOriginRequests.push(request.url())
      }
    })

    await gotoWorkspace(page)
    origin = new URL(page.url()).origin
    await exerciseRequiredWorkflow(page)

    expect(offendingRequests).toEqual([])
    expect(crossOriginRequests).toEqual([])
  })

  test('no playback, scoring, or MIDI control is ever rendered', async ({ page }) => {
    await gotoWorkspace(page)
    await exerciseRequiredWorkflow(page)

    const disallowedNamePattern =
      /\bplay\b|\bplayback\b|\blisten\b|\brecord\b|\bmidi\b|\bscoring\b/i
    const buttons = await page.getByRole('button').all()
    for (const button of buttons) {
      const name = await button.getAttribute('aria-label')
      const text = await button.textContent()
      const accessibleName = (name ?? text ?? '').trim()
      expect(accessibleName).not.toMatch(disallowedNamePattern)
    }
  })
})
