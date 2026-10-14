/**
 * The workspace harness's audio seams: the audio transport handed to the workspace session, the
 * harness's own "Start audio" button standing in for chunk 15's Start click, and the
 * `window.__workspaceHarness.audio` API. The URL chooses the mode: by default the transport runs on
 * the fake audio rig (a clock only `advance` moves), and with `?audio=real` it runs on the real
 * Web Audio output and the real wake-up Worker. Both modes record what the transport schedules
 * with the same recorder, as the same `FakeAudioEvent` shape, and read audible clicks and backing
 * notes the same way. The backing a spec queues is the harmony of the phrase the workspace shows,
 * read by the harness page from its own session (no production hook).
 */
import {
  readAudioMixDesign,
  type AudioMix,
  type AudioMixDesign,
} from '../../../src/audio/audio-mix'
import type { AudioOutput, DisposableWakeTimer, WakeTimer } from '../../../src/audio/audio-ports'
import {
  createAudioTransport,
  type AudioTransport,
  type TransportTimeline,
} from '../../../src/audio/audio-transport'
import { openWebAudioOutput } from '../../../src/audio/web-audio-output'
import {
  createBrowserWakeTimerWorker,
  createWorkerWakeTimer,
} from '../../../src/audio/worker-wake-timer'
import type { HarmonyEvent } from '../../../src/domain/harmony/harmony-types'
import {
  audibleBackingOf,
  audibleClicksOf,
  createFakeAudioRig,
  recordAudioOutput,
  type FakeAudioEvent,
  type FakeBackingEvent,
  type RecordedAudioOutput,
} from '../../unit/audio/fake-audio'

/**
 * The harness's audio: the transport the workspace gets, the API published for specs, the Start
 * button's click handler, the fake performance.now() time of an audio time, which stamps the
 * harness's fake MIDI messages (throws with `?audio=real`, whose clocks cannot be predicted), and
 * the session controller's wake-up timer on the same clock: with the fake rig it is stepped by
 * `advance` right after the transport's, with `?audio=real` it is a real wake-up Worker.
 */
export interface HarnessAudio {
  readonly transport: AudioTransport
  readonly createSessionWakeTimer: () => DisposableWakeTimer
  readonly api: WorkspaceHarnessAudioApi
  readonly startFromClick: () => void
  readonly performanceTimeAt: (audioTime: number) => number
}

/** What differs between the modes: the transport's seams, the event log and the clock control. */
interface AudioModeParts {
  readonly openOutput: () => AudioOutput
  readonly createWakeTimer: () => WakeTimer
  readonly createSessionWakeTimer: () => DisposableWakeTimer
  readonly events: () => readonly FakeAudioEvent[]
  readonly advance: (seconds: number) => void
  readonly performanceTimeAt: (audioTime: number) => number
}

/** Intent: the audio mode the page URL asks for: `?audio=real`, or the fake rig by default. */
// @test-link [[rule_audio_unlocked_by_player_click]]
export function harnessAudioMode(search: string): WorkspaceHarnessAudioMode {
  const mode = new URLSearchParams(search).get('audio')
  if (mode === null || mode === 'fake') return 'fake'
  if (mode === 'real') return 'real'
  throw new Error(`Workspace harness: unknown audio mode "${mode}"; use "fake" or "real"`)
}

/** Intent: the fake rig's seams: its recording output, its hand-stepped timer and clock. */
function fakeModeParts(): AudioModeParts {
  const rig = createFakeAudioRig()
  return {
    openOutput: rig.openOutput,
    createWakeTimer: rig.createWakeTimer,
    createSessionWakeTimer: rig.createExtraWakeTimer,
    events: rig.events,
    advance: rig.advance,
    performanceTimeAt: rig.performanceTimeAt,
  }
}

/**
 * Intent: the production seams, with the real Web Audio output wrapped by the recorder when the
 * player's click opens it. The clock is the real audio clock, so it cannot be advanced by hand.
 */
function realModeParts(): AudioModeParts {
  let recorded: RecordedAudioOutput | null = null
  return {
    openOutput: () => {
      recorded = recordAudioOutput(openWebAudioOutput())
      return recorded.output
    },
    createWakeTimer: () => createWorkerWakeTimer(createBrowserWakeTimerWorker()),
    createSessionWakeTimer: () => createWorkerWakeTimer(createBrowserWakeTimerWorker()),
    events: () => recorded?.events() ?? [],
    advance: () => {
      throw new Error('Workspace harness: advance() needs the fake audio clock, not ?audio=real')
    },
    performanceTimeAt: () => {
      throw new Error(
        'Workspace harness: stamping a MIDI message at an audio time needs the fake audio clock, not ?audio=real',
      )
    },
  }
}

/** Intent: the mix design, read from the harness page's production stylesheet tokens. */
function pageMixDesign(): AudioMixDesign {
  return readAudioMixDesign(getComputedStyle(document.documentElement))
}

/** Intent: the harness's plain-JSON view of the harmony events `queueBacking` queued. */
function queuedHarmonyView(harmony: readonly HarmonyEvent[]): WorkspaceHarnessQueuedHarmonyEvent[] {
  return harmony.map(({ barIndex, startBeat, durationBeats, triad }) => ({
    barIndex,
    startBeat,
    durationBeats,
    pitchClasses: [...triad.pitchClasses],
  }))
}

/**
 * Intent: build the harness's audio in `mode`: a transport on that mode's seams, and the API a
 * spec drives it through. `start` is not on the API: only the harness's Start button starts a
 * session, from a real click, at the tempo `armStart` set beforehand. `shownHarmony` reads the
 * harmony of the phrase the workspace shows, which `queueBacking` hands to the transport at the
 * tempo the last session started at. `loadedMix` reads the mix the saved-data load gave, on the
 * transport's first use, as the app's transport does.
 */
// @test-link [[rule_audio_unlocked_by_player_click]]
// @test-link [[rule_playhead_follows_audio_clock]]
// @test-link [[req_session_backing_track]]
export function createHarnessAudio(
  mode: WorkspaceHarnessAudioMode,
  shownHarmony: () => readonly HarmonyEvent[],
  loadedMix: () => AudioMix,
): HarnessAudio {
  const parts = mode === 'real' ? realModeParts() : fakeModeParts()
  const transport = createAudioTransport({
    openOutput: parts.openOutput,
    createWakeTimer: parts.createWakeTimer,
    readMixDesign: pageMixDesign,
    loadedMix,
  })
  let armedTempo: number | null = null
  let startedTempo: number | null = null
  let timeline: TransportTimeline | null = null

  /** Intent: the Start click: unlock, then start at the armed tempo, synchronously. One shot. */
  function startFromClick(): void {
    if (armedTempo === null) {
      throw new Error('Workspace harness: click Start audio only after audio.armStart({ tempo })')
    }
    const tempo = armedTempo
    armedTempo = null
    transport.unlock()
    timeline = transport.start({ tempo })
    startedTempo = tempo
  }

  /** Intent: the tempo the Start click last started a session at; throws before any start. */
  function sessionTempo(): number {
    if (startedTempo === null) {
      throw new Error('Workspace harness: audio.queueBacking() needs a session started first')
    }
    return startedTempo
  }

  const api: WorkspaceHarnessAudioApi = {
    mode: () => mode,
    armStart: ({ tempo }) => {
      armedTempo = tempo
    },
    timeline: () => (timeline === null ? null : { ...timeline }),
    isUnlocked: () => transport.isUnlocked(),
    isRunning: () => transport.isRunning(),
    now: () => transport.now(),
    outputLatency: () => transport.outputLatency(),
    clockAnchor: () => ({ ...transport.clockAnchor() }),
    phraseStartsAt: (phraseNumber) => transport.phraseStartsAt(phraseNumber),
    advance: (seconds) => parts.advance(seconds),
    events: () => [...parts.events()],
    audibleClicks: () => audibleClicksOf(parts.events()),
    queueBacking: (phraseNumber) => {
      const harmony = shownHarmony()
      transport.queueBacking(phraseNumber, harmony, sessionTempo())
      return queuedHarmonyView(harmony)
    },
    backingNotes: () => parts.events().filter((e): e is FakeBackingEvent => e.kind === 'backing'),
    audibleBacking: () => audibleBackingOf(parts.events()),
    mix: () => ({ ...transport.mix() }),
    setClickOn: (on) => transport.setClickOn(on),
    setClickVolume: (level) => transport.setClickVolume(level),
    setBackingOn: (on) => transport.setBackingOn(on),
    setBackingVolume: (level) => transport.setBackingVolume(level),
    stop: () => ({ ...transport.stop() }),
    mixDesign: () => {
      const { defaults, range } = pageMixDesign()
      return { defaults: { ...defaults }, range: { ...range } }
    },
  }
  return {
    transport,
    createSessionWakeTimer: parts.createSessionWakeTimer,
    api,
    startFromClick,
    performanceTimeAt: parts.performanceTimeAt,
  }
}

/** Intent: make the harness's Start audio button, found by its data attribute, start audio. */
// @test-link [[rule_audio_unlocked_by_player_click]]
export function bindHarnessAudioStart(root: ParentNode, startFromClick: () => void): void {
  const button = root.querySelector<HTMLButtonElement>('[data-harness-audio-start]')
  if (button === null) throw new Error('Workspace harness: the Start audio button is missing')
  button.addEventListener('click', startFromClick)
}
