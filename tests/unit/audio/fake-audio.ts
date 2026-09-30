/**
 * The fake clock and fake audio output the audio transport is tested on: an audio clock the test
 * advances by hand, a wake-up timer that fires on every `WAKE_INTERVAL_SECONDS` step of that clock,
 * and an audio output that records every call it gets, stamped with the clock time it was made at.
 * It then answers what the player would actually hear: which clicks sound, and at which gain. The
 * recorder (`recordAudioOutput`) and the audible-click reading (`audibleClicksOf`) work on any
 * audio output, so the workspace harness also records the real Web Audio output with them. It
 * imports no Node module, so the browser workspace harness can reuse it.
 */

import {
  WAKE_INTERVAL_SECONDS,
  type AudioOutput,
  type AudioTime,
  type ClickRoute,
  type MixGain,
  type SessionBus,
  type WakeTimer,
} from '../../../src/audio/audio-ports'

/** Two times this close are the same step boundary; it absorbs the float error of `k * interval`. */
const SAME_TIME_EPSILON = 1e-9

/** One click scheduled on a session bus. `bus` numbers buses from 1 in the order they opened. */
export interface FakeClickEvent {
  readonly kind: 'click'
  readonly bus: number
  readonly at: AudioTime
  readonly accent: boolean
  readonly route: ClickRoute
  readonly scheduledAt: AudioTime
}

/** One mix gain set to `value` from `at` on. */
export interface FakeGainEvent {
  readonly kind: 'gain'
  readonly gain: MixGain
  readonly value: number
  readonly at: AudioTime
  readonly scheduledAt: AudioTime
}

/** One session bus faded out from `at` over `duration` seconds. */
export interface FakeFadeEvent {
  readonly kind: 'fade'
  readonly bus: number
  readonly at: AudioTime
  readonly duration: number
  readonly scheduledAt: AudioTime
}

/** One session bus opened. */
export interface FakeOpenBusEvent {
  readonly kind: 'open-bus'
  readonly bus: number
  readonly scheduledAt: AudioTime
}

/** Every call the fake output records, in call order. */
export type FakeAudioEvent = FakeClickEvent | FakeGainEvent | FakeFadeEvent | FakeOpenBusEvent

/** A click that sounds, with the click-volume gain it sounds at. */
export interface AudibleClick extends FakeClickEvent {
  readonly gain: number
}

/** Where the fake clock starts and the output latency it reports; both default to 0. */
export interface FakeAudioRigOptions {
  readonly startTime?: number
  readonly outputLatency?: number
}

/** The fake clock, wake-up timer and audio output, with the controls and queries a test needs. */
export interface FakeAudioRig {
  /** The fake output itself; `openOutput` returns this same object. */
  readonly output: AudioOutput
  /** The fake wake-up timer; `createWakeTimer` returns this same object. */
  readonly timer: WakeTimer
  /** Return the fake output and count the call. */
  readonly openOutput: () => AudioOutput
  /** How many times `openOutput` was called. */
  readonly openOutputCalls: () => number
  /** Return the fake timer. */
  readonly createWakeTimer: () => WakeTimer
  /** Whether the timer is started. */
  readonly timerRunning: () => boolean
  /** The fake clock's current time. */
  readonly now: () => AudioTime
  /** Move the clock forward by `seconds`, waking the timer after every step. */
  readonly advance: (seconds: number) => void
  /** Move the clock forward to `t`, waking the timer after every step. */
  readonly advanceTo: (t: AudioTime) => void
  /** Every recorded call, in order. */
  readonly events: () => readonly FakeAudioEvent[]
  /** Every scheduled click, in order. */
  readonly clicks: () => readonly FakeClickEvent[]
  /** The value of one gain at time `t`. */
  readonly gainAt: (gain: MixGain, t: AudioTime) => number
  /** The clicks that actually sound, with the gain they sound at. */
  readonly audibleClicks: () => readonly AudibleClick[]
  /** Report an interruption to every `onInterrupted` listener, as the browser would. */
  readonly interrupt: () => void
  /** Change the output latency the output reports from now on. */
  readonly setOutputLatency: (seconds: number) => void
}

/** The fake timer plus the hook the clock uses to wake it. */
interface FakeTimer extends WakeTimer {
  readonly wake: () => void
  readonly running: () => boolean
}

/**
 * Intent: a wake-up timer that fires only when the fake clock steps. It throws on a start while
 * started and on a stop while stopped, so a scheduler that loses track of it fails loudly.
 */
function createFakeTimer(): FakeTimer {
  let onWake: (() => void) | null = null
  return {
    start: (listener) => {
      if (onWake !== null) throw new Error('fake wake timer: start while already started')
      onWake = listener
    },
    stop: () => {
      if (onWake === null) throw new Error('fake wake timer: stop while not started')
      onWake = null
    },
    wake: () => onWake?.(),
    running: () => onWake !== null,
  }
}

/**
 * Intent: the value one gain holds at `t`, Web Audio style: the value set with the latest `at`
 * not after `t`, a later call winning a tie. Throws if the gain was never set by `t`, because a
 * click heard through an unset gain would mean the transport forgot to apply the mix.
 */
function gainValueAt(events: readonly FakeAudioEvent[], gain: MixGain, t: AudioTime): number {
  let found: FakeGainEvent | null = null
  for (const event of events) {
    if (event.kind !== 'gain' || event.gain !== gain || event.at > t) continue
    if (found === null || event.at >= found.at) found = event
  }
  if (found === null) throw new Error(`fake audio: gain ${gain} was never set by ${t}`)
  return found.value
}

/**
 * Intent: whether a click is silenced by its bus's fade. Simplification: any click at or after
 * the start of a fade on its bus counts as silent, rather than sounding at a partial gain.
 */
function fadedOut(events: readonly FakeAudioEvent[], click: FakeClickEvent): boolean {
  return events.some((e) => e.kind === 'fade' && e.bus === click.bus && e.at <= click.at)
}

/**
 * Intent: the clicks the player hears. A click sounds when the click volume is above zero at its
 * time, its route is `count-in` or the click is enabled at its time, and its bus has not started
 * fading by then (see `fadedOut`).
 */
// @test-link [[rule_count_in_always_clicks]]
export function audibleClicksOf(events: readonly FakeAudioEvent[]): AudibleClick[] {
  const audible: AudibleClick[] = []
  for (const event of events) {
    if (event.kind !== 'click' || fadedOut(events, event)) continue
    const gain = gainValueAt(events, 'click-volume', event.at)
    const enabled =
      event.route === 'count-in' || gainValueAt(events, 'click-enable', event.at) === 1
    if (gain > 0 && enabled) audible.push({ ...event, gain })
  }
  return audible
}

/** An audio output that records every call it passes on, and the log it writes. */
export interface RecordedAudioOutput {
  /** The recording output: hand this to the transport in place of the inner one. */
  readonly output: AudioOutput
  /** Every recorded call, in call order. */
  readonly events: () => readonly FakeAudioEvent[]
}

/**
 * Intent: wrap `inner` so every gain change, bus opening, scheduled click and fade is passed on
 * and then recorded as a `FakeAudioEvent`, stamped with `inner.now()` at the call. Buses are
 * numbered from 1 in opening order. A call the inner output rejects throws and is not recorded.
 */
// @test-link [[rule_playhead_follows_audio_clock]]
export function recordAudioOutput(inner: AudioOutput): RecordedAudioOutput {
  const log: FakeAudioEvent[] = []
  let busCount = 0

  /** Intent: open one bus on `inner`, numbered in opening order, recording what it schedules. */
  function openSessionBus(): SessionBus {
    const innerBus = inner.openSessionBus()
    busCount += 1
    const bus = busCount
    log.push({ kind: 'open-bus', bus, scheduledAt: inner.now() })
    return {
      scheduleClick: (click) => {
        innerBus.scheduleClick(click)
        log.push({ kind: 'click', bus, ...click, scheduledAt: inner.now() })
      },
      fadeOut: (at, duration) => {
        innerBus.fadeOut(at, duration)
        log.push({ kind: 'fade', bus, at, duration, scheduledAt: inner.now() })
      },
    }
  }

  return {
    output: {
      now: () => inner.now(),
      outputLatency: () => inner.outputLatency(),
      setGain: (gain, value, at) => {
        inner.setGain(gain, value, at)
        log.push({ kind: 'gain', gain, value, at, scheduledAt: inner.now() })
      },
      openSessionBus,
      onInterrupted: (listener) => inner.onInterrupted(listener),
    },
    events: () => [...log],
  }
}

/** A session bus that makes no sound: the fake output's buses, whose calls the recorder logs. */
const SILENT_BUS: SessionBus = { scheduleClick: () => {}, fadeOut: () => {} }

/**
 * Intent: build a fake audio rig whose clock starts at `startTime` and only moves when the test
 * advances it. The clock steps on the grid `startTime + k * WAKE_INTERVAL_SECONDS`, so long runs
 * do not drift; an advance that ends between two grid points takes a shorter last step.
 */
// @test-link [[rule_playhead_follows_audio_clock]]
export function createFakeAudioRig(options: FakeAudioRigOptions = {}): FakeAudioRig {
  const startTime = options.startTime ?? 0
  let latency = options.outputLatency ?? 0
  let current = startTime
  let ticks = 0
  let openCalls = 0
  const interruptListeners: (() => void)[] = []
  const timer = createFakeTimer()
  const recorded = recordAudioOutput({
    now: () => current,
    outputLatency: () => latency,
    setGain: () => {},
    openSessionBus: () => SILENT_BUS,
    onInterrupted: (listener) => interruptListeners.push(listener),
  })
  const output = recorded.output

  /** Intent: step the clock to `target`, one wake-up interval at a time, waking after each step. */
  function advanceTo(target: AudioTime): void {
    if (!Number.isFinite(target)) throw new Error(`fake clock: target ${target} is not finite`)
    if (target < current)
      throw new Error(`fake clock: cannot move back from ${current} to ${target}`)
    while (current < target) {
      const boundary = startTime + (ticks + 1) * WAKE_INTERVAL_SECONDS
      if (boundary <= target + SAME_TIME_EPSILON) {
        ticks += 1
        current = Math.abs(boundary - target) <= SAME_TIME_EPSILON ? target : boundary
      } else {
        current = target
      }
      timer.wake()
    }
  }

  return {
    output,
    timer,
    openOutput: () => {
      openCalls += 1
      return output
    },
    openOutputCalls: () => openCalls,
    createWakeTimer: () => timer,
    timerRunning: () => timer.running(),
    now: () => current,
    advance: (seconds) => {
      if (!(seconds >= 0)) throw new Error(`fake clock: cannot advance by ${seconds}`)
      advanceTo(current + seconds)
    },
    advanceTo,
    events: recorded.events,
    clicks: () => recorded.events().filter((e): e is FakeClickEvent => e.kind === 'click'),
    gainAt: (gain, t) => gainValueAt(recorded.events(), gain, t),
    audibleClicks: () => audibleClicksOf(recorded.events()),
    interrupt: () => interruptListeners.forEach((listener) => listener()),
    setOutputLatency: (seconds) => {
      latency = seconds
    },
  }
}
