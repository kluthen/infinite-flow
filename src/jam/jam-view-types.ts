/**
 * The shapes the workspace and Jam's view share: what the shell gives Jam's view and Jam's
 * controls, and the staff state Jam's view reports back. Types only, so the workspace may import
 * them (type-only imports of src/jam/ are erased from the bundle) without pulling any of Jam's code
 * into the first load.
 */
import type { PostPrewarm } from '@/composables/generation-session-prewarm'
import type {
  Collection,
  GenerationControls,
  PitchClass,
} from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'

import type { DoodleReadings } from './doodle-controls'
import type { JamSettings } from './jam-settings'

/**
 * What Jam's staff shows at Idle: the empty system (`shown`), the no-room sentence instead
 * (`no-room`), or the notation error a retry can cure (`notation-error`).
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export type JamStaffState = 'shown' | 'no-room' | 'notation-error'

/**
 * What Jam's staff is drawn from: Jam's own written key and collection; the instrument is the one
 * shared choice, my instrument included.
 */
// @spec-link [[module_jam_code_boundary]]
export interface JamStaffProps {
  /** Jam's written tonal center: the written key. */
  readonly tonalCenter: PitchClass
  /** Jam's collection: the mode. */
  readonly collection: Collection
  /** The selected instrument profile. */
  readonly instrumentProfileId: InstrumentProfileId
  /** My instrument, or null when none is saved. */
  readonly myInstrument: MyInstrument | null
  /** The shared system-position size, in engraving units (`planSystemPositionUnits`). */
  readonly systemPositionUnits: number
}

/**
 * Whether Jam's view leaves as a fresh Jam's phrase 1 enters the session's staff: its empty
 * system fades out (`is-fading-out`), and it reports `left` when the fade has ended; false (the
 * default) whenever no phrase 1 has entered.
 */
// @spec-link [[req_jam]]
export interface JamViewLeaving {
  readonly leaving?: boolean
}

/**
 * What the workspace gives Jam's view: what its staff is drawn from, and what its Idle prewarm
 * reads: the generation worker's prewarm port (null while the prewarm policy is off) and the
 * controls and figure levels a Jam is generated with (Jam's settings, ./jam-settings.ts), which a
 * prewarm intent carries beside the rhythm values Jam's Idle prewarms.
 */
// @spec-link [[module_jam_code_boundary]]
// @spec-link [[module_generation_prewarm]]
export interface JamWorkspaceProps extends JamStaffProps {
  /** Where a prewarm goes; null while the prewarm policy is off. */
  readonly prewarm: PostPrewarm | null
  /** Jam's controls (its written key among them, not yet in concert pitch). */
  readonly controls: GenerationControls
  /** Jam's figure levels: its one Embellishments level for every figure. */
  readonly figureLevels: FigureLevels
}

/**
 * What the workspace gives Jam's controls (`JamControls.vue`, in `control-section`'s place while
 * Jam mode shows): Jam's own settings, the shared instrument, whether they are read-only, and what
 * the doodle's readings show (null while no doodle is kept) at the window's width.
 */
// @spec-link [[req_jam_settings]]
export interface JamControlsProps {
  readonly settings: JamSettings
  /** The shared instrument: session mode's choice. */
  readonly instrumentProfileId: InstrumentProfileId
  /** My instrument, or null when none is saved. */
  readonly myInstrument: MyInstrument | null
  /** Read-only during Loading (opening Jam mode included) and for a whole session. */
  readonly readonly: boolean
  /** Whether `instrument-actions` is disabled: during a session and during Loading. */
  readonly instrumentActionsDisabled: boolean
  /** The kept doodle's readings; null while no doodle is kept. */
  readonly readings: DoodleReadings | null
  /** The window is narrower than `bp-tablet-landscape`. */
  readonly belowTabletLandscape: boolean
}
