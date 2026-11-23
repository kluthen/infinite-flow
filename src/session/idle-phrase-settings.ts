/**
 * The settings an Idle phrase was generated under, as the session reads them: the workspace
 * records them with each generated phrase (`src/composables/workspace-session-result.ts`), and a
 * session started on that phrase takes them as phrase 1's own and tells a stale phrase 1 by them.
 */
import type { ChordFamilies } from '../domain/chords/chord-families'
import type { GenerationControls } from '../domain/controls/generation-controls'
import type { FigureLevels } from '../domain/figures/figure-levels'
import type { PresetSelection } from '../domain/presets/preset-selection'

/**
 * The settings an Idle phrase's fit run was built from: the chosen controls (the note density as
 * the player chose it, never the one the window's width gave the intent), the seven figure levels,
 * the Seventh chords level and the preset selection. A stale phrase 1 is told by them, and phrase
 * 1 played after `Start with this phrase` keeps them.
 */
// @spec-link [[service_idle_generation_session]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export interface IdlePhraseSettings {
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly chordFamilies: ChordFamilies
  readonly selection: PresetSelection
}
