/**
 * The contract between the workspace, which opens the connection sheet from the header's
 * `controller-status` click, and ConnectionSheet.vue, loaded lazily as its own chunk. Types only:
 * nothing here reaches the entry chunk.
 */
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { MidiController } from '@/midi/midi-controller-state'
import type { MidiPermissionState } from '@/midi/midi-access-port'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { MyInstrument } from '@/domain/profile/my-instrument'

/** A connect attempt started by the player's click, before the sheet module loaded. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface SheetConnecting {
  readonly settled: Promise<void>
  readonly permission: Promise<MidiPermissionState>
}

/** Where the sheet opens: `requesting` (Connect controller, no-controller or MIDI-blocked badge) or `connected` (connected badge). */
// @spec-link [[rule_controller_connects_between_sessions]]
export type SheetOpenAt = 'requesting' | 'connected'

/** ConnectionSheet.vue's props. `connecting` is null when no request was made (unsupported browser, or opened at connected). */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface ConnectionSheetProps {
  readonly midi: MidiController
  readonly openAt: SheetOpenAt
  readonly connecting: SheetConnecting | null
  readonly profile: InstrumentProfile
  /** The current instrument's clef, the staff the check's note is drawn on. */
  readonly clef: InstrumentClef
  /** The instrument profiles a check may suggest; passed by the host so the lazy chunk imports no profile table. */
  readonly profiles: readonly InstrumentProfile[]
  readonly seenDeviceCount: number
  /** The saved my instrument, or null: what `Use this for my instrument` changes or creates. */
  readonly myInstrument: MyInstrument | null
}

// emits: close() — the host hides the sheet and runs the close-focus order.
// emits: use-for-my-instrument(instrument) — the confirmed `Use for my instrument`: the host saves
// `instrument` and selects it, replacing the phrase; the sheet goes on to Connected by itself.
