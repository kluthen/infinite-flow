/**
 * Tap tempo's stateful part (master spec C5.17; the Jam flow's handoff, Tap tempo): whether
 * `tap-tempo` listens, the taps of the current listening run, and what its field-note says. A press
 * of the button opens the audio output, taps at the audio clock's time and starts listening or
 * keeps it going; while it listens, controller notes are taps too (Jam's Idle note routing,
 * ./jam-idle-notes.ts, reports them at their onsets). From a run's fourth tap, Jam's tempo is set
 * as a change by hand would set it, each further tap setting it again. Listening ends two seconds
 * after the last tap on the audio clock (read lazily whenever someone asks, a wall-clock timer only
 * catching up, never ending a run early), or at once when anything else is used. It sets nothing
 * but the tempo: no count-in, no Jam, no sound. Built outside any component, so no Vue watcher:
 * plain refs and functions. Part of Jam's code (src/jam/), loaded on demand.
 */
import { shallowRef, type Ref } from 'vue'

import type { AudioTime } from '@/session/session-types'

import { JAM_TEMPO_VALUES } from './jam-settings'
import { TAP_LISTENING_SECONDS, tempoFromTaps, type TapTempoNote } from './tap-tempo'

const MILLISECONDS_PER_SECOND = 1000

const REST: TapTempoNote = Object.freeze({ kind: 'rest' })
const COUNTING: TapTempoNote = Object.freeze({ kind: 'counting' })

/** What tap tempo reads and sets, every reading current when called. */
// @spec-link [[rule_jam_tap_in_listening]]
export interface TapTempoDependencies {
  /** Open the audio output: called synchronously inside the press, before `now`. */
  readonly unlockAudio: () => void
  /**
   * The audio clock's time, seconds (the clock controller notes' onsets are on). Only read once
   * unlocked.
   */
  readonly now: () => AudioTime
  /** Set Jam's tempo, saved like a change by hand (one of JAM_TEMPO_VALUES). */
  readonly setTempo: (tempo: number) => void
  /** Jam's tempo now (to skip a set to the same value). */
  readonly tempo: () => number
}

/** Tap tempo: whether it listens, what its note says, and what taps, ends and rests it. */
// @spec-link [[rule_jam_tap_in_listening]]
export interface TapTempo {
  /** Listening now, for the view (reactive shallowRef). */
  readonly listening: Readonly<Ref<boolean>>
  /** What the field-note says (reactive). */
  readonly note: Readonly<Ref<TapTempoNote>>
  /**
   * Whether it listens at this instant on the audio clock: a run whose last tap is
   * TAP_LISTENING_SECONDS or more ago (now() >= last + 2) ends here first (listening, note
   * updated).
   */
  readonly isListening: () => boolean
  /** A press of the button: unlockAudio(), then a tap at now(); starts or keeps listening. */
  readonly press: () => void
  /** A controller tap at its onset (audio seconds); ignored unless isListening(). */
  readonly tap: (at: AudioTime) => void
  /** Listening ends now (anything else used, the button disabled): counting rests, set stays. */
  readonly end: () => void
  /** The tempo was changed another way: a "set" note rests unless it names `tempo`. */
  readonly tempoChanged: (tempo: number) => void
  /** Jam mode left: listening ends and the note rests. */
  readonly leave: () => void
  /** Clear the timer. */
  readonly dispose: () => void
}

/**
 * Intent: tap tempo over its readings. A press opens the audio output, then taps at the audio
 * clock's time; a controller tap counts only while listening. Taps of a run are kept in time order
 * (a held note is reported at its release with its onset, possibly before a later press). From a
 * run's fourth tap, each tap sets the tempo its last four give (never a set to the tempo Jam
 * already has) and the note names it; before that the note counts and nothing is set. A run ends
 * two seconds after its last tap on the audio clock, or at once on end(); a new run counts from
 * zero.
 */
// @spec-link [[rule_jam_tap_in_listening]]
// @spec-link [[rule_jam_tempo_from_taps]]
export function createTapTempo(deps: TapTempoDependencies): TapTempo {
  const listening = shallowRef(false)
  const note = shallowRef<TapTempoNote>(REST)
  /** The current run's taps, ascending, in audio seconds; empty while not listening. */
  let run: AudioTime[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  /** Intent: clear the end-of-listening timer, if any. */
  function clearTimer(): void {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
  }

  /** Intent: the audio time the current run ends at: its last tap plus the listening time. */
  function deadline(): AudioTime {
    return run[run.length - 1]! + TAP_LISTENING_SECONDS
  }

  /** Intent: end the current run now; a note still counting rests, a tempo set stays. */
  function finish(): void {
    clearTimer()
    run = []
    listening.value = false
    if (note.value.kind === 'counting') note.value = REST
  }

  /**
   * Intent: wait, on the wall clock, for the time left until the run's deadline on the audio clock;
   * then end the run if the audio clock has reached it, else wait again for what is left.
   */
  function arm(): void {
    clearTimer()
    const remaining = deadline() - deps.now()
    timer = setTimeout(
      () => {
        timer = null
        if (!listening.value) return
        if (deps.now() >= deadline()) finish()
        else arm()
      },
      Math.max(0, remaining) * MILLISECONDS_PER_SECOND,
    )
  }

  /** Intent: add a tap at `at` to the run in time order; from the fourth, set the run's tempo. */
  function addTap(at: AudioTime): void {
    const index = run.findIndex((each) => each > at)
    if (index === -1) run.push(at)
    else run.splice(index, 0, at)
    listening.value = true
    const tempo = tempoFromTaps(run, JAM_TEMPO_VALUES)
    if (tempo === null) {
      note.value = COUNTING
    } else {
      if (tempo !== deps.tempo()) deps.setTempo(tempo)
      note.value = Object.freeze({ kind: 'set', tempo })
    }
    arm()
  }

  /** Intent: whether it listens now, ending a run whose deadline the audio clock has reached. */
  function isListening(): boolean {
    if (!listening.value) return false
    if (deps.now() >= deadline()) {
      finish()
      return false
    }
    return true
  }

  /** Intent: a press: open the audio output, then tap now, starting or continuing a run. */
  function press(): void {
    deps.unlockAudio()
    isListening()
    addTap(deps.now())
  }

  /**
   * Intent: a controller tap at its onset, counted only while listening and only from the run's
   * first tap on (a run always starts with a press, so a note begun in an earlier run is not one
   * of its taps).
   */
  function tap(at: AudioTime): void {
    if (isListening() && at >= run[0]!) addTap(at)
  }

  /** Intent: a tempo changed another way: a note naming another tempo rests. */
  function tempoChanged(tempo: number): void {
    if (note.value.kind === 'set' && note.value.tempo !== tempo) note.value = REST
  }

  /** Intent: Jam mode left: the run ends and the note rests. */
  function leave(): void {
    finish()
    note.value = REST
  }

  return {
    listening,
    note,
    isListening,
    press,
    tap,
    end: finish,
    tempoChanged,
    leave,
    dispose: clearTimer,
  }
}
