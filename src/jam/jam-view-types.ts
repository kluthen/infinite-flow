/**
 * The shapes the workspace and Jam's view share: what the shell gives Jam's view and the staff
 * state Jam's view reports back. Types only, so the workspace may import them (type-only imports of
 * src/jam/ are erased from the bundle) without pulling any of Jam's code into the first load.
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

/**
 * What Jam's staff shows at Idle: the empty system (`shown`), the no-room sentence instead
 * (`no-room`), or the notation error a retry can cure (`notation-error`).
 */
// @spec-link [[rule_jam_idle_shows_no_phrase]]
export type JamStaffState = 'shown' | 'no-room' | 'notation-error'

/**
 * What Jam's staff is drawn from. Until Jam has settings of its own, Jam's written key and
 * collection are session mode's; the instrument is the one shared choice, my instrument included.
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
 * What the workspace gives Jam's view: what its staff is drawn from, and what its Idle prewarm
 * reads: the generation worker's prewarm port (null while the prewarm policy is off) and session
 * mode's current controls and figure levels, which a prewarm intent carries beside the rhythm
 * values Jam's Idle prewarms.
 */
// @spec-link [[module_jam_code_boundary]]
// @spec-link [[module_generation_prewarm]]
export interface JamWorkspaceProps extends JamStaffProps {
  /** Where a prewarm goes; null while the prewarm policy is off. */
  readonly prewarm: PostPrewarm | null
  /** Session mode's current controls (the written key among them, not yet in concert pitch). */
  readonly controls: GenerationControls
  /** Session mode's current figure levels. */
  readonly figureLevels: FigureLevels
}
