/**
 * Shared helpers for the MIDI input specs: navigation to the workspace harness in a MIDI and audio
 * mode, thin wrappers around the typed `window.__workspaceHarness.midi` API, and a spy on the
 * page's `navigator.requestMIDIAccess` for pages that run the production MIDI provider.
 */
import type { Page } from '@playwright/test'

import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'

type MidiSpyWindow = Window & { __midiSpy: { installed: boolean; requests: number } }

/** Intent: land on the workspace harness in these MIDI and audio modes, with its MIDI API ready. */
export async function gotoMidiHarness(
  page: Page,
  midi: WorkspaceHarnessMidiMode = 'fake',
  audio: WorkspaceHarnessAudioMode = 'fake',
): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}?audio=${audio}&midi=${midi}`)
  await page.waitForFunction(() => typeof window.__workspaceHarness?.midi !== 'undefined')
}

/**
 * Intent: before any page script runs, wrap `navigator.requestMIDIAccess` so every call is
 * counted. `installed` proves the spy was armed rather than passing because the browser lacked it.
 */
// @test-link [[rule_controller_connects_between_sessions]]
export async function installMidiRequestSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { installed: false, requests: 0 }
    ;(window as unknown as MidiSpyWindow).__midiSpy = spy
    const original = navigator.requestMIDIAccess
    if (typeof original !== 'function') return
    navigator.requestMIDIAccess = function (this: Navigator, options?: MIDIOptions) {
      spy.requests += 1
      return original.call(this, options)
    }
    spy.installed = true
  })
}

/** Intent: the MIDI request spy's reading, from the page. */
export function readMidiRequestSpy(
  page: Page,
): Promise<{ readonly installed: boolean; readonly requests: number }> {
  return page.evaluate(() => ({ ...(window as unknown as MidiSpyWindow).__midiSpy }))
}

/** Intent: the "Connect controller" click's work: unlock the audio, then connect the controller. */
export function connectMidi(page: Page): Promise<void> {
  return page.evaluate(() => window.__workspaceHarness.midi.connect())
}

/** Intent: select the present input with this id. */
export function selectDevice(page: Page, id: string): Promise<void> {
  return page.evaluate((deviceId) => window.__workspaceHarness.midi.select(deviceId), id)
}

/** Intent: the controller's state. */
export function midiState(page: Page): Promise<WorkspaceHarnessMidiState> {
  return page.evaluate(() => window.__workspaceHarness.midi.state())
}

/** Intent: the MIDI inputs present, as the controller lists them. */
export function midiDevices(page: Page): Promise<readonly WorkspaceHarnessMidiDevice[]> {
  return page.evaluate(() => window.__workspaceHarness.midi.devices())
}

/** Intent: plug a fake device in. */
export function plugDevice(page: Page, device: WorkspaceHarnessMidiDevice): Promise<void> {
  return page.evaluate((d) => window.__workspaceHarness.midi.plug(d), device)
}

/** Intent: unplug a fake device at audio time `at`. */
export function unplugDevice(page: Page, id: string, at: number): Promise<void> {
  return page.evaluate(([deviceId, t]) => window.__workspaceHarness.midi.unplug(deviceId, t), [
    id,
    at,
  ] as const)
}

/** Intent: play a note-on on a fake device at audio time `at`, on `channel` (default 0). */
export function noteOn(
  page: Page,
  id: string,
  note: { readonly pitch: number; readonly velocity: number; readonly at: number },
  channel = 0,
): Promise<void> {
  return page.evaluate(
    ({ deviceId, n, c }) =>
      window.__workspaceHarness.midi.noteOn(deviceId, n.pitch, n.velocity, n.at, c),
    { deviceId: id, n: note, c: channel },
  )
}

/** Intent: play a note-off on a fake device at audio time `at`, on `channel` (default 0). */
export function noteOff(
  page: Page,
  id: string,
  note: { readonly pitch: number; readonly at: number },
  channel = 0,
): Promise<void> {
  return page.evaluate(
    ({ deviceId, n, c }) => window.__workspaceHarness.midi.noteOff(deviceId, n.pitch, n.at, c),
    { deviceId: id, n: note, c: channel },
  )
}

/** Intent: send raw message bytes from a fake device at audio time `at`. */
export function sendBytes(
  page: Page,
  id: string,
  bytes: readonly number[],
  at: number,
): Promise<void> {
  return page.evaluate(
    ({ deviceId, b, t }) => window.__workspaceHarness.midi.send(deviceId, b, t),
    { deviceId: id, b: bytes, t: at },
  )
}

/** Intent: how many times MIDI access was requested since the page loaded. */
export function requestCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__workspaceHarness.midi.requestCount())
}

/** Intent: every note the controller reported played, in order. */
export function playedNotes(page: Page): Promise<readonly WorkspaceHarnessPlayedNote[]> {
  return page.evaluate(() => window.__workspaceHarness.midi.playedNotes())
}

/** Intent: every note the controller reported ended, in order. */
export function endedNotes(page: Page): Promise<readonly WorkspaceHarnessEndedNote[]> {
  return page.evaluate(() => window.__workspaceHarness.midi.endedNotes())
}

/** Intent: the controller's state kinds since the page loaded, in order. */
export function stateLog(page: Page): Promise<readonly WorkspaceHarnessMidiStateKind[]> {
  return page.evaluate(() => window.__workspaceHarness.midi.stateLog())
}
