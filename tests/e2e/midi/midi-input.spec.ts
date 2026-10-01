/**
 * MIDI controller input on the workspace harness (port 4175): the controller the workspace session
 * holds, driven through a fake Web MIDI access (`?midi=fake`, the default) on the fake audio clock,
 * where time moves only when the spec advances it and every message is stamped at an exact audio
 * time. It covers when access is asked for, the connection states, which messages count as played
 * notes, a lost controller coming back, and a scripted run giving the same recordings every time.
 * A best-effort smoke runs the browser's own Web MIDI (`?midi=real&audio=real`), and the production
 * app is checked to ask for no MIDI access at startup. No test may raise a page error.
 */
import { expect, test, type Page } from '@playwright/test'

import { advanceAudioTo, startAudio, stopAudio } from '../audio/audio-harness-helpers'
import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import {
  connectMidi,
  endedNotes,
  gotoMidiHarness,
  installMidiRequestSpy,
  midiDevices,
  midiState,
  noteOff,
  noteOn,
  playedNotes,
  plugDevice,
  readMidiRequestSpy,
  requestCount,
  selectDevice,
  sendBytes,
  stateLog,
  unplugDevice,
} from './midi-harness-helpers'

/** Two identical keyboards (same name and maker, distinct ids) and a different one. */
const KEYS: WorkspaceHarnessMidiDevice = { id: 'port-keys', name: 'Keys 49', manufacturer: 'Acme' }
const KEYS_TWIN: WorkspaceHarnessMidiDevice = {
  id: 'port-keys-2',
  name: 'Keys 49',
  manufacturer: 'Acme',
}
const PAD: WorkspaceHarnessMidiDevice = { id: 'port-pad', name: 'Pad 8', manufacturer: 'Beta' }

/** Middle C, the pitch most notes here play. */
const MIDDLE_C = 60

/** Audio times are compared to 6 digits. */
const DIGITS = 6

let pageErrors: string[] = []

test.beforeEach(({ page }) => {
  pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
})

test.afterEach(() => {
  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([])
})

/** Intent: land on the fake-MIDI harness with `devices` plugged in, then connect. */
async function connectWith(
  page: Page,
  devices: readonly WorkspaceHarnessMidiDevice[],
): Promise<void> {
  await gotoMidiHarness(page)
  for (const device of devices) await plugDevice(page, device)
  await connectMidi(page)
}

/** Intent: expect the played notes to be exactly these (pitch, velocity, onset to 6 digits). */
function expectPlayed(
  actual: readonly WorkspaceHarnessPlayedNote[],
  expected: readonly WorkspaceHarnessPlayedNote[],
): void {
  expect(actual.map(({ pitch, velocity }) => ({ pitch, velocity }))).toEqual(
    expected.map(({ pitch, velocity }) => ({ pitch, velocity })),
  )
  actual.forEach((note, k) => expect(note.onsetAt).toBeCloseTo(expected[k]!.onsetAt, DIGITS))
}

/** Intent: expect the ended notes to be exactly these (times to 6 digits). */
function expectEnded(
  actual: readonly WorkspaceHarnessEndedNote[],
  expected: readonly WorkspaceHarnessEndedNote[],
): void {
  expectPlayed(actual, expected)
  actual.forEach((note, k) => expect(note.releaseAt).toBeCloseTo(expected[k]!.releaseAt, DIGITS))
}

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_midi_never_blocks_session]]
// @test-link [[rule_controller_attached_definition]]
// @test-link [[rule_chromium_only_support]]
test.describe('MIDI access and connection', () => {
  // @test-link [[rule_controller_connects_between_sessions]]
  test('asks for no MIDI access at load; connecting with no device reads no-device', async ({
    page,
  }) => {
    await gotoMidiHarness(page)
    expect(await midiState(page)).toEqual({ kind: 'not-requested' })
    expect(await requestCount(page)).toBe(0)

    await connectMidi(page)

    expect(await midiState(page)).toEqual({ kind: 'no-device' })
    expect(await requestCount(page)).toBe(1)
    expect(await stateLog(page)).toEqual(['not-requested', 'requesting', 'no-device'])
  })

  // @test-link [[rule_chromium_only_support]]
  // @test-link [[rule_midi_never_blocks_session]]
  test('a browser without Web MIDI reads unsupported, asking for nothing', async ({ page }) => {
    await gotoMidiHarness(page, 'unsupported')

    expect(await midiState(page)).toEqual({ kind: 'unsupported' })
    expect(await requestCount(page)).toBe(0)
    expect(await stateLog(page)).toEqual(['unsupported'])
  })

  // @test-link [[rule_midi_never_blocks_session]]
  test('a denied request reads denied, and a later connect asks again', async ({ page }) => {
    await gotoMidiHarness(page)
    await plugDevice(page, KEYS)
    await page.evaluate(() => window.__workspaceHarness.midi.denyNextRequest())

    await connectMidi(page)
    expect(await midiState(page)).toEqual({ kind: 'denied' })
    expect(await requestCount(page)).toBe(1)

    await connectMidi(page)
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    expect(await requestCount(page)).toBe(2)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  test('reads requesting while the permission request is in flight', async ({ page }) => {
    await gotoMidiHarness(page)
    await plugDevice(page, KEYS)
    await page.evaluate(() => {
      window.__workspaceHarness.midi.holdNextRequest()
      void window.__workspaceHarness.midi.connect()
    })
    expect(await midiState(page)).toEqual({ kind: 'requesting' })

    await page.evaluate(() => window.__workspaceHarness.midi.releaseHeldRequest())

    await expect.poll(() => midiState(page)).toEqual({ kind: 'connected', device: KEYS })
  })

  // @test-link [[rule_controller_attached_definition]]
  test('the only device present is connected at once, with no note played', async ({ page }) => {
    await connectWith(page, [KEYS])

    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    expect(await stateLog(page)).toEqual(['not-requested', 'requesting', 'opening', 'connected'])
    expect(await playedNotes(page)).toEqual([])
    expect(await endedNotes(page)).toEqual([])
  })

  // @test-link [[rule_controller_attached_definition]]
  // @test-link [[req_midi_controller_input]]
  test('two identical devices make the player choose; the chosen one is connected', async ({
    page,
  }) => {
    await connectWith(page, [KEYS, KEYS_TWIN])
    expect(await midiState(page)).toEqual({ kind: 'choosing' })
    expect(await midiDevices(page)).toEqual([KEYS, KEYS_TWIN])

    await selectDevice(page, KEYS_TWIN.id)

    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS_TWIN })
    expect(await requestCount(page)).toBe(1)
  })
})

// @test-link [[req_midi_controller_input]]
// @test-link [[rule_only_note_on_counts_as_played]]
test.describe('Played notes', () => {
  // @test-link [[rule_only_note_on_counts_as_played]]
  test('a note-on is played at its onset and ends at its note-off, on the audio clock', async ({
    page,
  }) => {
    await connectWith(page, [KEYS])

    await advanceAudioTo(page, 1.0)
    await noteOn(page, KEYS.id, { pitch: MIDDLE_C, velocity: 100, at: 1.0 })
    expectPlayed(await playedNotes(page), [{ pitch: MIDDLE_C, velocity: 100, onsetAt: 1.0 }])
    expect(await endedNotes(page)).toEqual([])

    await advanceAudioTo(page, 1.5)
    await noteOff(page, KEYS.id, { pitch: MIDDLE_C, at: 1.5 })
    expectEnded(await endedNotes(page), [
      { pitch: MIDDLE_C, velocity: 100, onsetAt: 1.0, releaseAt: 1.5 },
    ])
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  test('a note-on with velocity 0 ends the note instead of playing one', async ({ page }) => {
    await connectWith(page, [KEYS])

    await noteOn(page, KEYS.id, { pitch: MIDDLE_C, velocity: 80, at: 0.25 })
    await noteOn(page, KEYS.id, { pitch: MIDDLE_C, velocity: 0, at: 0.75 })

    expect(await playedNotes(page)).toHaveLength(1)
    expectEnded(await endedNotes(page), [
      { pitch: MIDDLE_C, velocity: 80, onsetAt: 0.25, releaseAt: 0.75 },
    ])
  })

  // @test-link [[rule_only_note_on_counts_as_played]]
  test('control change, pitch bend, aftertouch and SysEx produce nothing', async ({ page }) => {
    await connectWith(page, [KEYS])

    await sendBytes(page, KEYS.id, [0xb0, 64, 127], 0.1)
    await sendBytes(page, KEYS.id, [0xe0, 0, 64], 0.2)
    await sendBytes(page, KEYS.id, [0xd0, 50], 0.3)
    await sendBytes(page, KEYS.id, [0xa0, MIDDLE_C, 30], 0.4)
    await sendBytes(page, KEYS.id, [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7], 0.5)

    expect(await playedNotes(page)).toEqual([])
    expect(await endedNotes(page)).toEqual([])
  })

  // @test-link [[req_midi_controller_input]]
  test('notes on channel 16 count like any other channel', async ({ page }) => {
    await connectWith(page, [KEYS])

    await noteOn(page, KEYS.id, { pitch: 67, velocity: 90, at: 0.5 }, 15)
    await noteOff(page, KEYS.id, { pitch: 67, at: 0.9 }, 15)

    expectEnded(await endedNotes(page), [{ pitch: 67, velocity: 90, onsetAt: 0.5, releaseAt: 0.9 }])
  })

  // @test-link [[req_midi_controller_input]]
  test('a device no longer selected produces nothing; the selected one plays', async ({ page }) => {
    await connectWith(page, [KEYS, PAD])
    await selectDevice(page, PAD.id)
    await selectDevice(page, KEYS.id)

    await noteOn(page, PAD.id, { pitch: 36, velocity: 120, at: 0.2 })
    expect(await playedNotes(page)).toEqual([])

    await noteOn(page, KEYS.id, { pitch: MIDDLE_C, velocity: 70, at: 0.4 })
    expectPlayed(await playedNotes(page), [{ pitch: MIDDLE_C, velocity: 70, onsetAt: 0.4 }])
  })
})

// @test-link [[rule_same_controller_reattaches]]
// @test-link [[rule_controller_attached_definition]]
test.describe('A lost controller', () => {
  // @test-link [[rule_same_controller_reattaches]]
  test('unplugged reads away and ends the held note; the same device comes back by itself', async ({
    page,
  }) => {
    await connectWith(page, [KEYS])
    await advanceAudioTo(page, 1.0)
    await noteOn(page, KEYS.id, { pitch: MIDDLE_C, velocity: 100, at: 1.0 })

    await advanceAudioTo(page, 1.25)
    await unplugDevice(page, KEYS.id, 1.25)
    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })
    expectEnded(await endedNotes(page), [
      { pitch: MIDDLE_C, velocity: 100, onsetAt: 1.0, releaseAt: 1.25 },
    ])

    await plugDevice(page, KEYS)
    expect(await midiState(page)).toEqual({ kind: 'connected', device: KEYS })
    expect(await requestCount(page)).toBe(1)

    await advanceAudioTo(page, 2.0)
    await noteOn(page, KEYS.id, { pitch: 64, velocity: 90, at: 2.0 })
    await noteOff(page, KEYS.id, { pitch: 64, at: 2.5 })
    expectEnded(await endedNotes(page), [
      { pitch: MIDDLE_C, velocity: 100, onsetAt: 1.0, releaseAt: 1.25 },
      { pitch: 64, velocity: 90, onsetAt: 2.0, releaseAt: 2.5 },
    ])
  })

  // @test-link [[rule_same_controller_reattaches]]
  test('a different device plugged in while away is listed but never picked up', async ({
    page,
  }) => {
    await connectWith(page, [KEYS])
    await unplugDevice(page, KEYS.id, 0.5)

    await plugDevice(page, PAD)

    expect(await midiState(page)).toEqual({ kind: 'away', device: KEYS })
    expect(await midiDevices(page)).toEqual([PAD])
  })
})

/** Intent: one scripted run: connect, play, lose and get back the controller, play again. */
async function scriptedRun(page: Page): Promise<{
  readonly played: readonly WorkspaceHarnessPlayedNote[]
  readonly ended: readonly WorkspaceHarnessEndedNote[]
  readonly log: readonly WorkspaceHarnessMidiStateKind[]
}> {
  await connectWith(page, [KEYS, PAD])
  await selectDevice(page, KEYS.id)
  const script: readonly (readonly [number, number, number])[] = [
    [0.5, MIDDLE_C, 90],
    [0.75, 64, 70],
    [1.0, 67, 110],
  ]
  for (const [at, pitch, velocity] of script) {
    await advanceAudioTo(page, at)
    await noteOn(page, KEYS.id, { pitch, velocity, at })
  }
  await noteOff(page, KEYS.id, { pitch: MIDDLE_C, at: 1.1 })
  await advanceAudioTo(page, 1.3)
  await unplugDevice(page, KEYS.id, 1.3)
  await plugDevice(page, KEYS)
  await advanceAudioTo(page, 2.0)
  await noteOn(page, KEYS.id, { pitch: 72, velocity: 60, at: 2.0 })
  await noteOn(page, KEYS.id, { pitch: 72, velocity: 0, at: 2.4 })
  return {
    played: await playedNotes(page),
    ended: await endedNotes(page),
    log: await stateLog(page),
  }
}

// @test-link [[req_midi_controller_input]]
// @test-link [[rule_only_note_on_counts_as_played]]
test('the same scripted run gives the same recordings every time', async ({ page }) => {
  const first = await scriptedRun(page)
  await page.reload()
  const second = await scriptedRun(page)

  expect(first.played).toHaveLength(4)
  expect(first.ended).toHaveLength(4)
  expect(second).toEqual(first)
})

// @test-link [[rule_controller_connects_between_sessions]]
test('the production app asks for no MIDI access at startup', async ({ page }) => {
  await installMidiRequestSpy(page)
  await page.goto('/')
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()

  expect(await readMidiRequestSpy(page)).toEqual({ installed: true, requests: 0 })
})

/** The typed states a real browser may answer a connect with, whatever MIDI hardware it has. */
const REAL_CONNECT_STATES: readonly WorkspaceHarnessMidiStateKind[] = [
  'no-device',
  'choosing',
  'connected',
  'unsupported',
  'denied',
]

// @test-link [[rule_chromium_only_support]]
// @test-link [[rule_midi_never_blocks_session]]
test("real Chromium's Web MIDI answers a connect after the audio click with a typed state", async ({
  page,
  context,
}) => {
  await context.grantPermissions(['midi'], { origin: new URL(WORKSPACE_HARNESS_URL).origin })
  await gotoMidiHarness(page, 'real', 'real')
  expect(await midiState(page)).toEqual({ kind: 'not-requested' })

  await startAudio(page)
  await connectMidi(page)

  expect(REAL_CONNECT_STATES).toContain((await midiState(page)).kind)
  await stopAudio(page)
})
