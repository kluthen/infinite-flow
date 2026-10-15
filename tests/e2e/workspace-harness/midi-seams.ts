/**
 * The workspace harness's MIDI seams: the MIDI controller handed to the workspace session, and the
 * `window.__workspaceHarness.midi` API. The URL chooses where MIDI access comes from: a fake Web
 * MIDI (`?midi=fake`, the default) the spec plugs devices into and plays on, a fake browser with
 * no Web MIDI (`?midi=unsupported`), or the browser's own (`?midi=real`). In every mode the
 * controller is the production one, reading the harness audio transport's clock anchor, and every
 * state change and played or ended note it reports is recorded. The fake browser's MIDI state at
 * load can be set from the URL, so it survives a reload as a browser's does: `?midiPermission=`
 * `granted|prompt|denied` and `?midiDevices=` a JSON array of devices plugged in before the load.
 */
import type { MidiAccessProvider, MidiPermissionState } from '../../../src/midi/midi-access-port'
import { createMidiController, type MidiController } from '../../../src/midi/midi-controller'
import type { MidiControllerState } from '../../../src/midi/midi-controller-state'
import { createWebMidiAccessProvider } from '../../../src/midi/web-midi-access'
import { createFakeMidiAccess, type FakeMidiAccess } from '../../unit/midi/fake-midi-access'
import type { HarnessAudio } from './audio-seams'

/** The harness's MIDI: the controller the workspace gets and the API published for specs. */
export interface HarnessMidi {
  readonly controller: MidiController
  readonly api: WorkspaceHarnessMidiApi
}

/** Where MIDI access comes from in a mode, and the fake behind it (none with real Web MIDI). */
interface MidiModeParts {
  readonly provider: MidiAccessProvider
  readonly fake: FakeMidiAccess | null
}

/** Intent: the MIDI mode the page URL asks for: `?midi=unsupported|real`, or the fake by default. */
// @test-link [[req_midi_controller_input]]
export function harnessMidiMode(search: string): WorkspaceHarnessMidiMode {
  const mode = new URLSearchParams(search).get('midi')
  if (mode === null || mode === 'fake') return 'fake'
  if (mode === 'unsupported' || mode === 'real') return mode
  throw new Error(
    `Workspace harness: unknown MIDI mode "${mode}"; use "fake", "unsupported" or "real"`,
  )
}

/** What the fake browser holds before the load: its MIDI permission and the devices plugged in. */
interface FakeMidiAtLoad {
  readonly permission: MidiPermissionState | null
  readonly devices: readonly WorkspaceHarnessMidiDevice[]
}

const PERMISSIONS: readonly MidiPermissionState[] = ['granted', 'prompt', 'denied']

/**
 * Intent: the fake browser's MIDI state at load from the URL (`?midiPermission=`, `?midiDevices=`
 * as a JSON array of `{ id, name, manufacturer }`); none given leaves the fake as a fresh browser.
 * A malformed value throws: a spec bug.
 */
export function fakeMidiAtLoad(search: string): FakeMidiAtLoad {
  const params = new URLSearchParams(search)
  const permission = params.get('midiPermission')
  if (permission !== null && !(PERMISSIONS as readonly string[]).includes(permission)) {
    throw new Error(`Workspace harness: ?midiPermission=${permission} is not granted|prompt|denied`)
  }
  const devices: unknown = JSON.parse(params.get('midiDevices') ?? '[]')
  // Intent: whether a parsed value is a device: an id, a name and a manufacturer, all strings.
  const valid = (device: unknown): device is WorkspaceHarnessMidiDevice =>
    typeof device === 'object' &&
    device !== null &&
    ['id', 'name', 'manufacturer'].every(
      (key) => typeof (device as Record<string, unknown>)[key] === 'string',
    )
  if (!Array.isArray(devices) || !devices.every(valid)) {
    throw new Error('Workspace harness: ?midiDevices= must be a JSON array of devices')
  }
  return { permission: permission as MidiPermissionState | null, devices }
}

/**
 * Intent: the access provider of `mode`: a fake with or without Web MIDI, set to the URL's state
 * at load, or the browser's.
 */
function midiModeParts(mode: WorkspaceHarnessMidiMode): MidiModeParts {
  if (mode === 'real') return { provider: createWebMidiAccessProvider(navigator), fake: null }
  const fake = createFakeMidiAccess({ supported: mode === 'fake' })
  const atLoad = fakeMidiAtLoad(window.location.search)
  if (atLoad.permission !== null) fake.setPermission(atLoad.permission)
  for (const device of atLoad.devices) fake.plug({ ...device })
  return { provider: fake, fake }
}

/** Intent: a plain copy of the controller's state, for the page boundary. */
function stateView(state: MidiControllerState): WorkspaceHarnessMidiState {
  return 'device' in state
    ? { kind: state.kind, device: { ...state.device } }
    : { kind: state.kind }
}

/**
 * Intent: build the harness's MIDI in `mode`: the production controller on that mode's access,
 * reading `audio`'s transport clock, with its states and notes recorded, and the API a spec drives
 * it through. `connect` does the "Connect controller" click's work: on the fake audio clock it
 * unlocks the audio first; with `?audio=real` a real click must have unlocked it already. The
 * fake-only controls throw with `?midi=real`, and stamp messages at an audio time through the fake
 * audio clock's performance.now() timeline (so they also throw with `?audio=real`).
 */
// @test-link [[req_midi_controller_input]]
// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_only_note_on_counts_as_played]]
// @test-link [[rule_same_controller_reattaches]]
export function createHarnessMidi(
  mode: WorkspaceHarnessMidiMode,
  audio: HarnessAudio,
): HarnessMidi {
  const { provider, fake } = midiModeParts(mode)
  const controller = createMidiController({
    provider,
    // As in the app: no audio clock until the audio is unlocked.
    clock: {
      anchor: () => (audio.transport.isUnlocked() ? audio.transport.clockAnchor() : null),
    },
  })
  const played: WorkspaceHarnessPlayedNote[] = []
  const ended: WorkspaceHarnessEndedNote[] = []
  const log: WorkspaceHarnessMidiStateKind[] = [controller.state().kind]
  controller.subscribe(({ state }) => {
    if (state.kind !== log.at(-1)) log.push(state.kind)
  })
  controller.onPlayedNote((event) => {
    if (event.kind === 'played') played.push({ ...event.note })
    else ended.push({ ...event.note })
  })

  /** Intent: the fake MIDI access, or a clear failure for a fake-only control with real MIDI. */
  function fakeAccess(control: string): FakeMidiAccess {
    if (fake === null) {
      throw new Error(`Workspace harness: midi.${control}() needs the fake MIDI, not ?midi=real`)
    }
    return fake
  }

  /** Intent: the "Connect controller" click's audio unlock; real audio needs a real click first. */
  function unlockAudioForConnect(): void {
    if (audio.api.mode() === 'fake') {
      audio.transport.unlock()
      return
    }
    if (!audio.transport.isUnlocked()) {
      throw new Error(
        'Workspace harness: with ?audio=real, click Start audio (harness) before midi.connect()',
      )
    }
  }

  const api: WorkspaceHarnessMidiApi = {
    mode: () => mode,
    connect: async () => {
      unlockAudioForConnect()
      await controller.connect()
    },
    select: (deviceId) => controller.select(deviceId),
    state: () => stateView(controller.state()),
    devices: () => controller.devices().map((device) => ({ ...device })),
    plug: (device) => fakeAccess('plug').plug({ ...device }),
    unplug: (deviceId, at) => fakeAccess('unplug').unplug(deviceId, audio.performanceTimeAt(at)),
    noteOn: (deviceId, pitch, velocity, at, channel) =>
      fakeAccess('noteOn').noteOn(deviceId, pitch, velocity, audio.performanceTimeAt(at), channel),
    noteOff: (deviceId, pitch, at, channel) =>
      fakeAccess('noteOff').noteOff(deviceId, pitch, audio.performanceTimeAt(at), channel),
    send: (deviceId, bytes, at) =>
      fakeAccess('send').send(deviceId, bytes, audio.performanceTimeAt(at)),
    denyNextRequest: () => fakeAccess('denyNextRequest').denyNextRequest(),
    holdNextRequest: () => fakeAccess('holdNextRequest').holdNextRequest(),
    releaseHeldRequest: () => fakeAccess('releaseHeldRequest').releaseHeldRequest(),
    setPermission: (state) => fakeAccess('setPermission').setPermission(state),
    requestCount: () => fakeAccess('requestCount').requestCount(),
    playedNotes: () => played.map((note) => ({ ...note })),
    endedNotes: () => ended.map((note) => ({ ...note })),
    stateLog: () => [...log],
  }
  return { controller, api }
}
