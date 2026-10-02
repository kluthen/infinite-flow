/**
 * Shared helpers for the MIDI-in-the-session specs (chunk 17), on the workspace harness's fake
 * audio clock and fake MIDI access: connecting a fake device without the sheet, playing notes at
 * audio times, phrase 1's (and any readied phrase's) expected notes on the audio clock read from
 * its concert timeline, the start line and the staff's acknowledged notes, and a stable screenshot
 * of the workspace for byte equality.
 */
import { expect, type Locator, type Page } from '@playwright/test'

import { advanceAudioTo, audioNow } from '../audio/audio-harness-helpers'
import { settleFrames } from '../release/harness-helpers'
import { cueRow, sessionState } from './session-helpers'

export { KEYS, PAD } from '../controller/controller-helpers'

/** The default tempo the session specs run at, in BPM. */
export const TEMPO = 90

/** One expected note of a phrase on the audio clock: which note, its concert pitch, its onset. */
export interface ExpectedNoteAt {
  readonly identity: WorkspaceHarnessNoteIdentity
  readonly pitch: number
  readonly onsetAt: number
}

/** A concert timeline as `snapshot().timeline` serialises it. */
interface TimelineJson {
  readonly measures: readonly {
    readonly measureIndex: number
    readonly events: readonly {
      readonly kind: 'note' | 'rest'
      readonly pitch?: number
      readonly tieContinuation?: boolean
      readonly duration: { readonly numerator: number; readonly denominator: number }
    }[]
  }[]
}

/**
 * Intent: a phrase's expected notes (every fresh attack, never a tie continuation or a rest), in
 * time order, placed from `startAt` at `tempo`: a whole note lasts four beats.
 */
export function expectedNotesOf(
  timeline: string,
  phraseNumber: number,
  startAt: number,
  tempo = TEMPO,
): ExpectedNoteAt[] {
  const parsed = JSON.parse(timeline) as TimelineJson
  const wholeNoteSeconds = (4 * 60) / tempo
  const notes: ExpectedNoteAt[] = []
  let position = 0
  for (const measure of parsed.measures) {
    measure.events.forEach((event, eventIndex) => {
      if (event.kind === 'note' && event.tieContinuation !== true && event.pitch !== undefined) {
        notes.push({
          identity: { phraseNumber, measureIndex: measure.measureIndex, eventIndex },
          pitch: event.pitch,
          onsetAt: startAt + position * wholeNoteSeconds,
        })
      }
      position += event.duration.numerator / event.duration.denominator
    })
  }
  return notes
}

/** Intent: the Idle phrase's concert timeline, read from the harness snapshot. */
export async function idleTimeline(page: Page): Promise<string> {
  const { timeline } = await page.evaluate(() => window.__workspaceHarness.snapshot())
  if (timeline === null) throw new Error('no phrase is shown')
  return timeline
}

/** Intent: phrase 1's first attacked note: its identity and concert pitch (placed at time 0). */
export async function firstAttack(page: Page): Promise<ExpectedNoteAt> {
  const [first] = expectedNotesOf(await idleTimeline(page), 1, 0)
  if (first === undefined) throw new Error('phrase 1 has no attacked note')
  return first
}

/**
 * Intent: plug `device` in and connect it through the harness (the "Connect controller" click's
 * work, then the device selected), with no sheet and no check, until the controller is connected.
 */
export async function connectDevice(page: Page, device: WorkspaceHarnessMidiDevice): Promise<void> {
  await page.evaluate(async (d) => {
    window.__workspaceHarness.midi.plug(d)
    await window.__workspaceHarness.midi.connect()
    await window.__workspaceHarness.midi.select(d.id)
  }, device)
  await expect
    .poll(() => page.evaluate(() => window.__workspaceHarness.midi.state()))
    .toEqual({ kind: 'connected', device })
}

/** Intent: a note-on on a fake device at audio time `at` (now by default). */
export async function noteOn(
  page: Page,
  device: WorkspaceHarnessMidiDevice,
  pitch: number,
  options: { readonly velocity?: number; readonly at?: number } = {},
): Promise<number> {
  const at = options.at ?? (await audioNow(page))
  await page.evaluate(([id, p, v, t]) => window.__workspaceHarness.midi.noteOn(id, p, v, t), [
    device.id,
    pitch,
    options.velocity ?? 100,
    at,
  ] as const)
  return at
}

/** Intent: a note-off on a fake device at audio time `at` (now by default). */
export async function noteOff(
  page: Page,
  device: WorkspaceHarnessMidiDevice,
  pitch: number,
  at?: number,
): Promise<number> {
  const time = at ?? (await audioNow(page))
  await page.evaluate(([id, p, t]) => window.__workspaceHarness.midi.noteOff(id, p, t), [
    device.id,
    pitch,
    time,
  ] as const)
  return time
}

/**
 * Intent: a note-on and its note-off at the same audio time, now by default: a tap. Before the
 * audio is unlocked the clock cannot be read, so such a tap gives `at` (0: no session runs).
 */
export async function tap(
  page: Page,
  device: WorkspaceHarnessMidiDevice,
  pitch: number,
  at?: number,
): Promise<number> {
  const time = await noteOn(page, device, pitch, at === undefined ? {} : { at })
  await noteOff(page, device, pitch, time)
  return time
}

/** Intent: unplug a fake device at the audio clock's time now. */
export async function unplugNow(page: Page, device: WorkspaceHarnessMidiDevice): Promise<number> {
  const at = await audioNow(page)
  await page.evaluate(([id, t]) => window.__workspaceHarness.midi.unplug(id, t), [
    device.id,
    at,
  ] as const)
  return at
}

/** Intent: plug a fake device (back) in. */
export function plugIn(page: Page, device: WorkspaceHarnessMidiDevice): Promise<void> {
  return page.evaluate((d) => window.__workspaceHarness.midi.plug(d), device)
}

/** Intent: the MIDI controller's state kind now. */
export async function midiKind(page: Page): Promise<WorkspaceHarnessMidiStateKind> {
  return (await page.evaluate(() => window.__workspaceHarness.midi.state())).kind
}

/** Intent: the cue row's start line. */
export function startLine(page: Page): Locator {
  return cueRow(page).locator('p.start-note-line')
}

/** Intent: the cue row's disconnect banner. */
export function disconnectBanner(page: Page): Locator {
  return cueRow(page).locator('p.inline-alert.alert-error.session-alert')
}

/** Intent: the note ids of every staff glyph that carries `note-ack`, deduplicated, sorted. */
export function ackedNoteIds(page: Page): Promise<string[]> {
  return page
    .locator('.staff-frame .note-ack')
    .evaluateAll((parts) =>
      [...new Set(parts.map((part) => part.getAttribute('data-note-id') ?? ''))].sort(),
    )
}

/** Intent: the `data-note-id` key of a note identity. */
export function noteKey(identity: WorkspaceHarnessNoteIdentity): string {
  return `${identity.phraseNumber}:${identity.measureIndex}:${identity.eventIndex}`
}

/** Intent: move the fake audio clock to `at`, in steps of at most one second. */
export async function clockTo(page: Page, at: number): Promise<void> {
  let now = await audioNow(page)
  while (now < at) {
    await advanceAudioTo(page, Math.min(at, now + 1))
    now = await audioNow(page)
  }
}

/** Intent: when the running session's phrase `phraseNumber` starts, on the audio clock. */
export function phraseStartsAt(page: Page, phraseNumber: number): Promise<number> {
  return page.evaluate((n) => window.__workspaceHarness.audio.phraseStartsAt(n), phraseNumber)
}

/** Intent: wait until no animation of any kind runs and two frames have passed. */
export async function settleScreen(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  )
  await settleFrames(page)
}

/** Intent: a full-viewport PNG of the workspace (header, cue row and staff), once settled. */
export async function workspaceShot(page: Page): Promise<Buffer> {
  await settleScreen(page)
  return page.screenshot({ caret: 'hide' })
}

/** Intent: the concert timeline of every successful generation since the page loaded, in order. */
export function generatedTimelines(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => window.__workspaceHarness.generatedTimelines())
}

/** Intent: assert the session is still running and no session has ended yet. */
export async function expectStillRunning(page: Page, message: string): Promise<void> {
  const state = await sessionState(page)
  expect(state.phase, message).toBe('running')
  expect(state.lastEnd, message).toBeNull()
}

/**
 * Intent: assert the session ended on its own for `cause` while running, like Stop (the transport
 * faded out and stopped, both screen locks released), its fade scheduled at an audio time in
 * `[from, to]`.
 */
export async function expectEndedBetween(
  page: Page,
  cause: WorkspaceHarnessSessionEndCause,
  from: number,
  to: number,
): Promise<void> {
  const state = await sessionState(page)
  expect(state.phase).toBe('idle')
  expect(state.lastEnd?.cause).toBe(cause)
  expect(state.lastEnd?.phase).toBe('running')
  const harness = await page.evaluate(() => ({
    running: window.__workspaceHarness.audio.isRunning(),
    events: window.__workspaceHarness.audio.events(),
    wakeHeld: window.__workspaceHarness.screenLocks.wake.isHeld(),
    orientationHeld: window.__workspaceHarness.screenLocks.orientation.isHeld(),
  }))
  expect(harness.running).toBe(false)
  expect(harness.wakeHeld).toBe(false)
  expect(harness.orientationHeld).toBe(false)
  const fade = harness.events.filter((event) => event.kind === 'fade').at(-1)
  expect(fade?.scheduledAt).toBeGreaterThanOrEqual(from)
  expect(fade?.scheduledAt).toBeLessThanOrEqual(to)
}
