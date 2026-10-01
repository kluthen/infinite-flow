/**
 * The connection sheet's driver: it owns the sheet model, opens it where the host asked, feeds the
 * reducer the controller's changes, played notes and connect outcomes, and runs the effects the
 * reducer returns on the controller. On the step into `closed` it tells the host, once. Nothing
 * it starts outlives the sheet: once unmounted it unsubscribes and ignores late connect outcomes.
 */
import { onBeforeUnmount, shallowRef, type ShallowRef } from 'vue'

import type { MidiControllerChange } from '@/midi/midi-controller-state'
import type { ConnectionSheetProps, SheetConnecting } from './connection-sheet-contract'
import {
  initialSheetModel,
  reduceSheet,
  type SheetEffect,
  type SheetEvent,
  type SheetModel,
} from './connection-sheet-model'

/** The sheet model and the one way to change it. */
export interface ConnectionSheetDriver {
  readonly model: Readonly<ShallowRef<SheetModel>>
  readonly dispatch: (event: SheetEvent) => void
}

/** What the driver reads from the host: the controller, where the sheet opens, the click's attempt. */
type DriverProps = Pick<ConnectionSheetProps, 'midi' | 'openAt' | 'connecting'>

/**
 * Intent: drive the sheet over `props.midi`. Opened at Requesting access, it follows the click's
 * connect attempt (the permission first, so a browser prompt shows its waiting sub-state); with no
 * attempt (a browser without Web MIDI) it settles at once. Opened at Connected, it asks nothing.
 * `onClosed` runs exactly once, on the step into `closed`, after that step's effects: what the
 * controller reports afterwards (a Disconnect reporting synchronously, a change, a played note, a
 * late connect outcome) while the sheet is still mounted only updates the closed model.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_controller_transposition_check]]
// @spec-link [[rule_same_controller_reattaches]]
export function useConnectionSheetDriver(
  props: DriverProps,
  onClosed: () => void,
): ConnectionSheetDriver {
  const midi = props.midi
  let mounted = true

  /** Intent: the controller's current state and devices, as the reducer takes them. */
  function snapshot(): MidiControllerChange {
    return { state: midi.state(), devices: midi.devices() }
  }

  const model = shallowRef<SheetModel>(
    reduceSheet(initialSheetModel(snapshot()), {
      kind: props.openAt === 'requesting' ? 'open-requesting' : 'open-connected',
      controller: snapshot(),
    }).model,
  )

  /** Intent: one reducer step: store the model, run its effects, tell the host if it just closed. */
  function dispatch(event: SheetEvent): void {
    const wasClosed = model.value.stage.kind === 'closed'
    const step = reduceSheet(model.value, event)
    model.value = step.model
    step.effects.forEach(runEffect)
    if (!wasClosed && step.model.stage.kind === 'closed') onClosed()
  }

  /** Intent: run one effect on the controller; a rejected select propagates, unhandled. */
  function runEffect(effect: SheetEffect): void {
    switch (effect.kind) {
      case 'connect':
        follow({ permission: midi.permission(), settled: midi.connect() })
        return
      case 'select':
        void midi.select(effect.deviceId)
        return
      case 'disconnect':
        midi.disconnect()
        return
      case 'abandon-connect':
        midi.abandonConnect()
        return
    }
  }

  /**
   * Intent: feed a connect attempt's permission, then its outcome, to the reducer while the sheet
   * is mounted. A rejected attempt propagates, unhandled (crash early).
   */
  function follow(connecting: SheetConnecting): void {
    void connecting.permission.then((permission) => {
      if (mounted) dispatch({ kind: 'permission-known', permission })
    })
    void connecting.settled.then(() => {
      if (mounted) dispatch({ kind: 'connect-settled', controller: snapshot() })
    })
  }

  if (props.openAt === 'requesting') {
    if (props.connecting === null) dispatch({ kind: 'connect-settled', controller: snapshot() })
    else follow(props.connecting)
  }

  const unsubscribeChanges = midi.subscribe((controller) => {
    dispatch({ kind: 'controller-changed', controller })
  })
  const unsubscribeNotes = midi.onPlayedNote((event) => {
    if (event.kind === 'played') dispatch({ kind: 'note-played', pitch: event.note.pitch })
  })

  /** Intent: stop listening to the controller and ignore late outcomes once the sheet is gone. */
  onBeforeUnmount(() => {
    mounted = false
    unsubscribeChanges()
    unsubscribeNotes()
  })

  return { model, dispatch }
}
