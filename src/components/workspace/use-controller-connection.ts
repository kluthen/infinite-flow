/**
 * The workspace shell's side of the MIDI controller: the header's `controller-status`, the
 * connection sheet it opens (its lazily loaded chunk warmed once the workspace mounts), the
 * sheet's open flag reported to the workspace at every change, and the remembered controller:
 * reselected at setup from what the load read, then saved whenever it changes. Where focus goes
 * once the sheet closes is the shell's (./use-workspace-focus.ts).
 */
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { onMounted, onScopeDispose, watch } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import { loadConnectionSheet } from '@/components/controller-connection/load-connection-sheet'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { MidiController, MidiDevice } from '@/midi/midi-controller-state'
import { useConnectionSheet, type ConnectionSheetHost } from './use-connection-sheet'
import { useControllerStatus, type ControllerStatusView } from './use-controller-status'

/**
 * The remembered controller as the visit keeps it: the one the load read (none when there was
 * none, it could not be read, or the visit started from the defaults), and its saves, which go
 * through the visit's save policy, so a visit that saves nothing neither remembers nor forgets.
 */
// @spec-link [[rule_last_controller_remembered]]
// @spec-link [[entity_remembered_controller_record]]
export interface RememberedControllerStore {
  readonly loaded: MidiDevice | null
  /** Save `device` as the remembered controller. */
  readonly remember: (device: MidiDevice) => void
  /** Forget the remembered controller. */
  readonly forget: () => void
}

/** What the controller's side reads and reports through; every getter is read reactively. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ControllerConnectionDeps {
  readonly midi: MidiController
  readonly audio: AudioTransport
  /** The current instrument profile, which the sheet's transposition check reads in. */
  readonly profile: () => InstrumentProfile
  /** The current instrument's clef, the staff the check's note is drawn on. */
  readonly clef: () => InstrumentClef
  /** The saved my instrument, or null: what the check's Use this for my instrument changes. */
  readonly myInstrument: () => MyInstrument | null
  /** True while a session runs, count-in included. */
  readonly sessionActive: () => boolean
  /** True while a running session's controller is lost (its countdown runs). */
  readonly controllerLost: () => boolean
  /** Told the sheet's open flag synchronously at every change, and once at setup (closed). */
  readonly onOpenChange: (open: boolean) => void
  /** The remembered controller the load read, and where it is saved. */
  readonly rememberedController: RememberedControllerStore
}

/** The header's `controller-status` and the connection sheet's host. */
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ControllerConnection extends ConnectionSheetHost {
  readonly controllerStatus: ControllerStatusView
}

/** Intent: whether two remembered controllers are the same record: the same port and names. */
function sameDevice(a: MidiDevice | null, b: MidiDevice | null): boolean {
  if (a === null || b === null) return a === b
  return a.id === b.id && a.name === b.name && a.manufacturer === b.manufacturer
}

/**
 * Intent: keep the saved remembered controller in step with the controller's: saved when a
 * different device counts as connected, forgotten by the player's Disconnect; an unplug, or the
 * same device reattaching, saves nothing. Then reselect the loaded one; with nothing loaded, no
 * permission is read and nothing is requested. Follows `midi` for as long as the scope lives.
 */
// @spec-link [[rule_last_controller_remembered]]
// @spec-link [[rule_disconnect_forgets_controller]]
// @spec-link [[entity_remembered_controller_record]]
function useRememberedController(midi: MidiController, store: RememberedControllerStore): void {
  let saved = store.loaded
  const unsubscribe = midi.subscribe(({ remembered }) => {
    if (sameDevice(remembered, saved)) return
    saved = remembered
    if (remembered === null) store.forget()
    else store.remember(remembered)
  })
  onScopeDispose(unsubscribe)
  // A broken load request is not caught: it surfaces as the unhandled rejection it is.
  if (store.loaded !== null) void midi.reselect(store.loaded)
}

/**
 * Intent: the controller's side over `deps`, for as long as the calling scope lives (a component's
 * setup): the status follows `midi`, the sheet starts closed, its chunk is warmed on mount, and
 * the remembered controller is reselected and kept saved.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_last_controller_remembered]]
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
    clef: deps.clef,
    myInstrument: deps.myInstrument,
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

  useRememberedController(deps.midi, deps.rememberedController)

  return { ...sheet, controllerStatus }
}
