/**
 * v2 browser boundaries, verified against the production preview build (port 4173) across every
 * interaction the workspace offers today (load, generate, control changes, regenerate, instrument
 * profile switch, theme): no Web Audio context is created and no MIDI access is requested until the
 * player clicks Start or "Connect controller", the microphone is never requested, no request ever
 * leaves the page's own origin, and nothing plays the generated phrase back or scores the player.
 */
import { type Page, expect, test } from '@playwright/test'

import {
  generateAndAwaitReady,
  gotoWorkspace,
  observeGenerationStatus,
  primaryButton,
  radio,
  readGenerationStatusLog,
} from '../workspace/helpers'

type CapabilitySpyWindow = Window & {
  __capabilitySpy: { installed: string[]; calls: string[] }
}

/**
 * Intent: before any page script runs, wrap every Web Audio context constructor, Web MIDI access
 * and microphone access the browser exposes, so each construction or request is recorded in
 * `window.__capabilitySpy.calls`. `installed` names each wrapper actually put in place, so a test
 * can prove the spy was armed rather than passing because a constructor was missing.
 */
async function installCapabilitySpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { installed: [] as string[], calls: [] as string[] }
    ;(window as unknown as CapabilitySpyWindow).__capabilitySpy = spy

    const globalWindow = window as unknown as Record<string, unknown>
    for (const ctorName of ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext']) {
      const OriginalCtor = globalWindow[ctorName] as
        (new (...args: unknown[]) => unknown) | undefined
      if (OriginalCtor === undefined) continue
      globalWindow[ctorName] = new Proxy(OriginalCtor, {
        construct(target, args) {
          spy.calls.push(ctorName)
          return Reflect.construct(target, args) as object
        },
      })
      spy.installed.push(ctorName)
    }

    if (typeof navigator.requestMIDIAccess === 'function') {
      const original = navigator.requestMIDIAccess.bind(navigator)
      navigator.requestMIDIAccess = (...args: Parameters<typeof original>) => {
        spy.calls.push('requestMIDIAccess')
        return original(...args)
      }
      spy.installed.push('requestMIDIAccess')
    }

    if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = (...args: Parameters<typeof original>) => {
        spy.calls.push('getUserMedia')
        return original(...args)
      }
      spy.installed.push('getUserMedia')
    }
  })
}

/** Intent: the capability spy's installed wrappers and recorded calls, read from the page. */
async function readCapabilitySpy(page: Page): Promise<{ installed: string[]; calls: string[] }> {
  return page.evaluate(() => (window as unknown as CapabilitySpyWindow).__capabilitySpy)
}

/**
 * Intent: every interaction the workspace offers today, on a page already at the workspace:
 * generate, change several controls, regenerate, switch the instrument profile (which regenerates
 * the shown phrase) and change the theme.
 */
async function exerciseCurrentInteractions(page: Page): Promise<void> {
  await generateAndAwaitReady(page)
  await radio(page, 'Written key', 'D').click()
  await radio(page, 'Register', 'Low').click()
  await radio(page, 'Musical profile preset', 'Jazz').click()
  await expect(primaryButton(page)).toHaveText('Regenerate phrase')
  await generateAndAwaitReady(page)

  await observeGenerationStatus(page)
  await radio(page, 'Instrument profile', 'E-flat alto saxophone').click()
  await expect
    .poll(
      async () => {
        const log = await readGenerationStatusLog(page)
        return log.length > 1 && log.at(-1) === 'Phrase ready'
      },
      { timeout: 30_000 },
    )
    .toBe(true)

  await radio(page, 'Presentation theme', 'Dark').click()
}

// This test drives every current interaction except clicking Start and "Connect controller", and
// none of them creates an audio context or requests MIDI access or the microphone. What those two
// clicks do is covered elsewhere: the audio context in tests/e2e/audio/* and
// tests/e2e/controller/controller-connection-states.spec.ts, MIDI access in 'the production app
// asks for no MIDI access at startup' (tests/e2e/midi/midi-input.spec.ts).
// @test-link [[rule_audio_unlocked_by_player_click]]
// @test-link [[specification_browser_only_operation_verification]]
test('no audio context, MIDI access or microphone request happens across every current interaction', async ({
  page,
}) => {
  await installCapabilitySpy(page)

  await gotoWorkspace(page)
  await exerciseCurrentInteractions(page)

  const spy = await readCapabilitySpy(page)
  expect(spy.installed).toEqual(
    expect.arrayContaining([
      'AudioContext',
      'OfflineAudioContext',
      'requestMIDIAccess',
      'getUserMedia',
    ]),
  )
  expect(spy.calls).toEqual([])
})

// @test-link [[rule_session_data_never_sent_or_stored]]
// @test-link [[specification_browser_only_operation_verification]]
test('no request leaves the page origin, and none is XHR, fetch, WebSocket or SSE', async ({
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
  await exerciseCurrentInteractions(page)

  expect(offendingRequests).toEqual([])
  expect(crossOriginRequests).toEqual([])
})

// The generated lead line is never played back and the player is never scored. A MIDI control is
// allowed: v2 adds one.
// @test-link [[req_four_measure_phrase]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
// @test-link [[specification_browser_only_operation_verification]]
test('no playback or scoring control is ever rendered', async ({ page }) => {
  await gotoWorkspace(page)
  await exerciseCurrentInteractions(page)

  const disallowedNamePattern = /\bplay\b|\bplayback\b|\blisten\b|\brecord\b|\bscoring\b/i
  const buttons = await page.getByRole('button').all()
  for (const button of buttons) {
    const name = await button.getAttribute('aria-label')
    const text = await button.textContent()
    const accessibleName = (name ?? text ?? '').trim()
    expect(accessibleName).not.toMatch(disallowedNamePattern)
  }
})
