/**
 * What the workspace gives Jam's view and Jam's controls (`JamControls.vue`, in
 * `control-section`'s place while Jam mode shows): Jam's view's props (its staff's written key and
 * collection, the shared instrument and system-position size, and what its Idle prewarm reads);
 * the controls' component, from Jam's loaded code only, once Jam's settings exist, and their props
 * (Jam's settings, the shared instrument, the read-only states as session mode's, the doodle
 * readings and `tap-tempo`'s view); and Jam's tempo, which the header's `tempo-readout` reads
 * while Jam mode shows.
 */
import { computed, type ComputedRef } from 'vue'

import type { PostPrewarm } from '@/composables/generation-session-prewarm'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'
import type { DoodleReadings } from '@/jam/doodle-controls'
import type { JamControlsProps, JamTapTempoView, JamWorkspaceProps } from '@/jam/jam-view-types'
import type { JamModeModule } from './load-jam-mode'
import type { JamSettingsView } from './use-jam-settings'

/** What Jam's view and controls are made from, every reading current when called. */
export interface JamViewPropsSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** Jam's settings; null until Jam mode first shows in the visit. */
  readonly jam: () => JamSettingsView | null
  /** Session mode's controls and figure levels, which stand in before Jam's settings exist. */
  readonly sessionControls: () => GenerationControls
  readonly sessionFigureLevels: () => FigureLevels
  /** The shared instrument: the selected profile, and my instrument when one is saved. */
  readonly instrument: () => {
    readonly instrumentProfileId: InstrumentProfileId
    readonly myInstrument: MyInstrument | null
  }
  /** The shared system-position size, in engraving units. */
  readonly systemPositionUnits: () => number
  /** Where a prewarm goes; null while the prewarm policy is off. */
  readonly prewarm: () => PostPrewarm | null
  /** Whether Jam's staff shows `jam-notice` (after a fresh Jam that made no doodle). */
  readonly noticeShown: () => boolean
  /** What `tap-tempo` shows; null before Jam's code loads. */
  readonly tapTempo: () => JamTapTempoView | null
  /** The controls are read-only (a session, Jam opening, the Loading of Jam's phrase 1). */
  readonly readonly: () => boolean
  /** Session mode's operation is running (not idle). */
  readonly operationRunning: () => boolean
  /** A running fresh Jam's doodle readings once phrase 1 enters; null otherwise. */
  readonly freshReadings: () => DoodleReadings | null
  /** The kept doodle's readings; null while no doodle is kept. */
  readonly keptReadings: () => DoodleReadings | null
  /** The window is narrower than `bp-tablet-landscape`. */
  readonly belowTabletLandscape: () => boolean
}

/** What the workspace gives Jam's view and controls, and Jam's tempo for the header. */
export interface WorkspaceJamViewProps {
  /** What Jam's view is given. */
  readonly view: ComputedRef<JamWorkspaceProps>
  /** Jam's tempo while Jam mode shows, which the header's `tempo-readout` reads; null otherwise. */
  readonly tempo: ComputedRef<number | null>
  /** Jam's controls while Jam mode shows with its settings made; null otherwise. */
  readonly controls: ComputedRef<JamModeModule['JamControls'] | null>
  /** What Jam's controls are given; null before Jam's settings and `tap-tempo` exist. */
  readonly controlsProps: ComputedRef<JamControlsProps | null>
}

/**
 * Intent: what Jam's view is given: Jam's written key and collection, the shared instrument choice
 * (my instrument included), the shared system-position size, and what Jam's Idle prewarm reads:
 * the prewarm port and the controls and figure levels a Jam is generated with. Session mode's
 * values stand in only before Jam's settings exist, while Jam's view does not show.
 */
// @spec-link [[module_workspace_mode]]
function jamViewProps(seams: JamViewPropsSeams): JamWorkspaceProps {
  const jam = seams.jam()
  const controls = jam?.controls ?? seams.sessionControls()
  const { instrumentProfileId, myInstrument } = seams.instrument()
  return {
    tonalCenter: controls.tonalCenter,
    collection: controls.collection,
    instrumentProfileId,
    myInstrument,
    systemPositionUnits: seams.systemPositionUnits(),
    prewarm: seams.prewarm(),
    controls,
    figureLevels: jam?.figureLevels ?? seams.sessionFigureLevels(),
    notice: seams.noticeShown(),
  }
}

/**
 * Intent: what Jam's controls are given: Jam's settings, the shared instrument, the controls'
 * read-only state and `instrument-actions`' as session mode's, and the doodle readings: a running
 * fresh Jam's once phrase 1 enters, else the kept doodle's, none with no doodle kept.
 */
// @spec-link [[module_workspace_mode]]
function jamControlsProps(seams: JamViewPropsSeams): JamControlsProps | null {
  const jam = seams.jam()
  const tapTempo = seams.tapTempo()
  if (jam === null || tapTempo === null) return null
  const readonly = seams.readonly()
  const { instrumentProfileId, myInstrument } = seams.instrument()
  return {
    settings: jam.settings,
    instrumentProfileId,
    myInstrument,
    readonly,
    instrumentActionsDisabled: readonly || seams.operationRunning(),
    readings: seams.freshReadings() ?? seams.keptReadings() ?? null,
    belowTabletLandscape: seams.belowTabletLandscape(),
    tapTempo,
  }
}

/**
 * Intent: Jam's view's and controls' props over their seams, and the controls' component and
 * Jam's tempo only while Jam mode shows.
 */
// @spec-link [[module_workspace_mode]]
export function useJamViewProps(seams: JamViewPropsSeams): WorkspaceJamViewProps {
  return {
    view: computed(() => jamViewProps(seams)),
    tempo: computed(() => (seams.jamShowing() ? (seams.jam()?.settings.tempo ?? null) : null)),
    controls: computed(() =>
      seams.jamShowing() && seams.jam() !== null ? (seams.jamModule()?.JamControls ?? null) : null,
    ),
    controlsProps: computed(() => jamControlsProps(seams)),
  }
}
