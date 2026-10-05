/**
 * The workspace shell's side of the MIDI controller: the header's `controller-status`, the
 * connection sheet it opens (its lazily loaded chunk warmed once the workspace mounts), and the
 * sheet's open flag reported to the workspace at every change. Where focus goes once the sheet
 * closes is the shell's (./use-workspace-focus.ts).
 */
import { onMounted, watch } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import { loadConnectionSheet } from '@/components/controller-connection/load-connection-sheet'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { MidiController } from '@/midi/midi-controller-state'
import { useConnectionSheet, type ConnectionSheetHost } from './use-connection-sheet'
import { useControllerStatus, type ControllerStatusView } from './use-controller-status'

/** What the controller's side reads and reports through; every getter is read reactively. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ControllerConnectionDeps {
  readonly midi: MidiController
  readonly audio: AudioTransport
  /** The current instrument profile, which the sheet's transposition check reads in. */
  readonly profile: () => InstrumentProfile
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
  /** True while a running session's controller is lost (its countdown runs). */
  readonly controllerLost: () => boolean
  /** Told the sheet's open flag synchronously at every change, and once at setup (closed). */
  readonly onOpenChange: (open: boolean) => void
}

/** The header's `controller-status` and the connection sheet's host. */
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ControllerConnection extends ConnectionSheetHost {
  readonly controllerStatus: ControllerStatusView
}

/**
 * Intent: the controller's side over `deps`, for as long as the calling scope lives (a component's
 * setup): the status follows `midi`, the sheet starts closed, and its chunk is warmed on mount.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_starting_note]]
export function useControllerConnection(deps: ControllerConnectionDeps): ControllerConnection {
  /**
   * Warm the lazy connection sheet chunk once the workspace mounts, so a `controller-status` click
   * opens it without waiting on its fetch. A failure here is not reported: the click retries the
   * same memoized loader, and a failure then propagates.
   */
  onMounted(() => {
    void loadConnectionSheet().catch(() => {})
  })

  // The header's `controller-status`, frozen at its form while a session runs, except that it shows
  // the disconnected badge while a lost controller's countdown runs.
  // @spec-link [[rule_same_controller_reattaches]]
  // @spec-link [[rule_controller_loss_mid_session]]
  const controllerStatus = useControllerStatus(deps.midi, deps.sessionActive, deps.controllerLost)

  // @spec-link [[rule_controller_connects_between_sessions]]
  const sheet = useConnectionSheet({
    midi: deps.midi,
    audio: deps.audio,
    status: controllerStatus,
    profile: deps.profile,
    sessionActive: deps.sessionActive,
  })

  /**
   * Intent: report the sheet's open flag to the workspace at once, synchronously, at every change:
   * a MIDI note can arrive right after the click, and none may start a session while it is open.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  // @spec-link [[rule_midi_starting_note]]
  function reportSheetOpen(open: boolean): void {
    deps.onOpenChange(open)
  }

  watch(sheet.connectionSheetOpen, reportSheetOpen, { flush: 'sync', immediate: true })

  return { ...sheet, controllerStatus }
}
