/**
 * Jam's Idle prewarm: at Jam mode's Idle the generation worker is warmed for the rhythm domain of
 * the controls Jam last took from a doodle, so a Jam's phrase 1 does not wait for it. No doodle
 * exists yet (chunk 28), so it always warms the first-visit rhythm values with Jam's tension. It
 * posts through the same prewarm port and policy as session mode (none while the policy is off),
 * under the same fixed seed and request id; the worker's memo keeps every domain it builds, so
 * this costs session mode nothing. Nothing else is generated or prepared at Jam mode's Idle.
 * Part of Jam's code (src/jam/), loaded on demand.
 */
import {
  createRhythmPrewarmTrigger,
  doodlePrewarmControls,
  FIRST_VISIT_RHYTHM_VALUES,
  type PostPrewarm,
} from '@/composables/generation-session-prewarm'
import type { GenerationControls, TensionArc } from '@/domain/controls/generation-controls'
import type { FigureLevels } from '@/domain/figures/figure-levels'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import type { MyInstrument } from '@/domain/profile/my-instrument'

/**
 * Jam's tension, transitional: the first value of Jam's Tension (`Lift`), used until Jam's own
 * settings arrive. Replaced by Jam's settings in chunk 31.
 */
// @spec-link [[module_generation_prewarm]]
export const JAM_TRANSITIONAL_TENSION: TensionArc = 'Lift'

/** What one Jam Idle prewarm reads: session mode's current controls, figure levels and instrument. */
// @spec-link [[module_generation_prewarm]]
export interface JamIdlePrewarmInputs {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly myInstrument: MyInstrument | null
}

/** Asks for Jam's Idle prewarm for the inputs now; posts only when its rhythm setting changed. */
export type JamIdlePrewarm = (inputs: JamIdlePrewarmInputs) => void

/**
 * Intent: Jam's Idle prewarm over the prewarm port, with a rhythm prewarm trigger of its own: each
 * call builds the controls of the first-visit rhythm values with Jam's tension, my instrument's
 * profile as data while it is selected, and posts one prewarm when that rhythm setting differs from
 * the last this trigger posted (the first call always posts).
 */
// @spec-link [[module_generation_prewarm]]
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export function createJamIdlePrewarm(post: PostPrewarm): JamIdlePrewarm {
  const trigger = createRhythmPrewarmTrigger(post)
  return ({ controls, figureLevels, myInstrument }) => {
    const mine = controls.instrumentProfileId === MY_INSTRUMENT_ID ? myInstrument : null
    trigger(
      doodlePrewarmControls(controls, FIRST_VISIT_RHYTHM_VALUES, JAM_TRANSITIONAL_TENSION),
      figureLevels,
      mine?.profile,
    )
  }
}
