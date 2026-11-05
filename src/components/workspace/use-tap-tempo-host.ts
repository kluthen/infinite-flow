/**
 * Where the workspace holds Jam's tap tempo (master spec C5.17; the Jam flow's handoff, Tap tempo):
 * the one tap tempo of Jam's code (src/jam/use-tap-tempo.ts), made once Jam's code has loaded in
 * the visit, on the audio transport's unlock and clock, setting Jam's tempo as a change by hand
 * would. Here listening ends as the controls become read-only (Loading, a session), Jam mode
 * leaving rests it, and a tempo changed another way reaches it. It gives `tap-tempo`'s view, the
 * press and end the button reports, and, for Jam's Idle note routing, whether it listens and the
 * controller's taps. Jam's code is reached through its loaded module only.
 */
import { computed, onScopeDispose, shallowRef, watch, type ComputedRef } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import type { JamTapTempoView } from '@/jam/jam-view-types'
import type { TapTempo } from '@/jam/use-tap-tempo'
import type { AudioTime } from '@/session/session-types'
import type { JamModeModule } from './load-jam-mode'

/** What the workspace's tap tempo reads and sets, every reading current when called. */
// @spec-link [[rule_jam_tap_in_listening]]
export interface TapTempoHostSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** Jam's controls are read-only (Loading, a session): `tap-tempo` is disabled. */
  readonly readonly: () => boolean
  /** Whether a controller is connected now. */
  readonly controllerConnected: () => boolean
  /** The audio output's unlock and clock. */
  readonly audio: Pick<AudioTransport, 'unlock' | 'now'>
  /** Jam's tempo now; null before Jam's settings exist. */
  readonly tempo: () => number | null
  /** Set Jam's tempo, saved like a change by hand. */
  readonly setTempo: (tempo: number) => void
}

/** The workspace's tap tempo: what `tap-tempo` shows, and its press, end, listening and taps. */
// @spec-link [[rule_jam_tap_in_listening]]
export interface WorkspaceTapTempo {
  /** What `tap-tempo` shows; null before Jam's code loads. */
  readonly view: ComputedRef<JamTapTempoView | null>
  /** A press of `tap-tempo`: a tap. */
  readonly press: () => void
  /** Listening ends now (anything else used, the page hidden or left). */
  readonly end: () => void
  /** Whether tap tempo listens at this instant; false before Jam's code loads. */
  readonly isListening: () => boolean
  /** A controller tap at its onset on the audio clock; nothing unless listening. */
  readonly tap: (at: AudioTime) => void
}

/**
 * Intent: the workspace's tap tempo over its seams: Jam's tap tempo made once, as Jam's code
 * loads; listening ended as the controls become read-only, and ended with its note rested as Jam
 * mode stops showing; a tempo changed another way told to it, so a note naming another tempo
 * rests. Its timer is cleared with the workspace.
 */
// @spec-link [[rule_jam_tap_in_listening]]
export function useTapTempoHost(seams: TapTempoHostSeams): WorkspaceTapTempo {
  const tapTempo = shallowRef<TapTempo | null>(null)

  /** Intent: Jam's tempo now; asked for before Jam's settings exist, a defect. */
  function currentTempo(): number {
    const tempo = seams.tempo()
    if (tempo === null) throw new Error("workspace tap tempo: Jam's tempo read before it exists")
    return tempo
  }

  watch(
    seams.jamModule,
    (loaded) => {
      if (loaded === null || tapTempo.value !== null) return
      tapTempo.value = loaded.createTapTempo({
        unlockAudio: () => seams.audio.unlock(),
        now: () => seams.audio.now(),
        setTempo: seams.setTempo,
        tempo: currentTempo,
      })
    },
    { flush: 'sync', immediate: true },
  )

  // Leaving Jam mode ends listening and rests the note.
  watch(
    seams.jamShowing,
    (showing) => {
      if (!showing) tapTempo.value?.leave()
    },
    { flush: 'sync' },
  )

  // The controls becoming read-only (Loading, a session) end listening.
  watch(
    seams.readonly,
    (readonly) => {
      if (readonly) tapTempo.value?.end()
    },
    { flush: 'sync' },
  )

  // A tempo changed another way: a note naming another tempo rests.
  watch(
    seams.tempo,
    (tempo) => {
      if (tempo !== null) tapTempo.value?.tempoChanged(tempo)
    },
    { flush: 'sync' },
  )

  onScopeDispose(() => tapTempo.value?.dispose())

  return {
    view: computed(() => {
      const shown = tapTempo.value
      if (shown === null) return null
      return {
        listening: shown.listening.value,
        note: shown.note.value,
        controllerConnected: seams.controllerConnected(),
      }
    }),
    press: () => tapTempo.value?.press(),
    end: () => tapTempo.value?.end(),
    isListening: () => tapTempo.value?.isListening() ?? false,
    tap: (at) => tapTempo.value?.tap(at),
  }
}
