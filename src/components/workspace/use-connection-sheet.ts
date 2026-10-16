/**
 * The workspace's side of the connection sheet: the header `controller-status` click, run
 * synchronously inside the click (the audio unlock, then the MIDI permission read and the
 * request), which sheet state it opens at, and the lazily loaded sheet component and props the
 * shell renders. The shell moves focus once the sheet closes.
 */
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { computed, shallowRef, type Component, type ComputedRef, type ShallowRef } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import type {
  ConnectionSheetProps,
  SheetConnecting,
  SheetOpenAt,
} from '@/components/controller-connection/connection-sheet-contract'
import { loadConnectionSheet } from '@/components/controller-connection/load-connection-sheet'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { ADOPTED_INSTRUMENT_PROFILES } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { MidiController } from '@/midi/midi-controller-state'
import type { ControllerStatusView } from './use-controller-status'

/** What the connection sheet's host needs. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ConnectionSheetDeps {
  readonly midi: MidiController
  readonly audio: AudioTransport
  readonly status: ControllerStatusView
  /** The current instrument profile, which the sheet's transposition check reads in. */
  readonly profile: () => InstrumentProfile
  /** The current instrument's clef, the staff the check's note is drawn on. */
  readonly clef: () => InstrumentClef
  /** The saved my instrument, or null: what the check's Use this for my instrument changes. */
  readonly myInstrument: () => MyInstrument | null
  readonly sessionActive: () => boolean
}

/** The sheet's host state and the click and close that drive it. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ConnectionSheetHost {
  /**
   * True from the `controller-status` click until the sheet closes, the module's load included.
   * Chunk 17 reads it so that no MIDI note starts a session or its count-in while the sheet is open.
   */
  readonly connectionSheetOpen: ComputedRef<boolean>
  /** The loaded sheet component; null until its chunk has loaded. */
  readonly sheetComponent: Readonly<ShallowRef<Component | null>>
  /** The open sheet's props; null while it is closed. */
  readonly sheetProps: ComputedRef<ConnectionSheetProps | null>
  /** The `controller-status` click. */
  readonly open: () => void
  /** The sheet's close, by any path. */
  readonly close: () => void
}

/** Where an open sheet started: its state, and the connect attempt the click made, if any. */
interface OpenedSheet {
  readonly openAt: SheetOpenAt
  readonly connecting: SheetConnecting | null
}

/**
 * Intent: build the connection sheet's host over `deps`, closed. The sheet component is loaded on
 * the first open (memoized; the shell warms it after mount).
 */
// @spec-link [[rule_controller_connects_between_sessions]]
export function useConnectionSheet(deps: ConnectionSheetDeps): ConnectionSheetHost {
  const opened = shallowRef<OpenedSheet | null>(null)
  const sheetComponent = shallowRef<Component | null>(null)

  /** Intent: start the MIDI request, its permission read first (the sheet tells prompt from checking). */
  function startConnecting(): SheetConnecting {
    const permission = deps.midi.permission()
    const settled = deps.midi.connect()
    return { permission, settled }
  }

  /**
   * Intent: the `controller-status` click, synchronously. The connected badge opens the sheet at
   * Connected and asks nothing. Every other form is the page's audio-unlock click and the MIDI
   * request in one: unlock first, then request (no request where the browser has no Web MIDI),
   * and open at Requesting access. The sheet then loads; a load failure closes it and propagates,
   * abandoning this click's request if it is still in flight, so the next click adopts it.
   */
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  // @spec-link [[rule_controller_connects_between_sessions]]
  function open(): void {
    if (deps.sessionActive()) throw new Error('connection sheet: opened during a session')
    if (opened.value !== null) throw new Error('connection sheet: opened while already open')
    if (deps.status.form.value.kind === 'connected') {
      opened.value = { openAt: 'connected', connecting: null }
    } else {
      deps.audio.unlock()
      const unsupported = deps.midi.state().kind === 'unsupported'
      opened.value = { openAt: 'requesting', connecting: unsupported ? null : startConnecting() }
    }
    const requested = opened.value.connecting !== null
    void loadConnectionSheet().then(
      (component) => {
        sheetComponent.value = component
      },
      (cause: unknown) => {
        opened.value = null
        if (requested && deps.midi.state().kind === 'requesting') deps.midi.abandonConnect()
        throw cause
      },
    )
  }

  /** Intent: hide the sheet; the shell then moves focus. */
  function close(): void {
    if (opened.value === null) throw new Error('connection sheet: closed while not open')
    opened.value = null
  }

  const sheetProps = computed<ConnectionSheetProps | null>(() => {
    const sheet = opened.value
    if (sheet === null) return null
    return {
      midi: deps.midi,
      openAt: sheet.openAt,
      connecting: sheet.connecting,
      profile: deps.profile(),
      clef: deps.clef(),
      profiles: ADOPTED_INSTRUMENT_PROFILES,
      seenDeviceCount: deps.status.seenDeviceCount.value,
      myInstrument: deps.myInstrument(),
    }
  })

  return {
    connectionSheetOpen: computed(() => opened.value !== null),
    sheetComponent,
    sheetProps,
    open,
    close,
  }
}
