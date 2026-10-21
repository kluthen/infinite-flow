/**
 * The Embellishments group's option model: for each of the seven figures, in the fixed figure
 * order, its field label, its note, and its four options, each valued by a level id and labelled
 * for the player. Pure data and functions: no storage, session or rendering state. The labels
 * belong to the interface and can change without touching the level ids, which the generation
 * request, the replay key and the stored records hold. No option is ever disabled: every level of
 * every figure stays selectable in any combination, every figure Off included (spec D378).
 */
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  type FigureId,
  type FigureLevel,
} from '@/domain/figures/figure-levels'
import type { SegmentedControlOption } from './segmented-control-option'

/** One figure's level control: its figure, its field label, its note and its four options. */
// @spec-link [[module_figure_level_options]]
export interface FigureLevelField {
  readonly figure: FigureId
  readonly label: string
  readonly note: string
  readonly options: readonly SegmentedControlOption[]
}

/** The player-facing label of each level, as the phrase-workspace handoff words them. */
const LEVEL_LABELS: Readonly<Record<FigureLevel, string>> = deepFreeze({
  off: 'Off',
  asToday: 'Rarely',
  favored: 'Often',
  stronglyFavored: 'Very often',
})

/** Each figure's field label and note, as the phrase-workspace handoff's table words them. */
const FIGURE_TEXTS: Readonly<Record<FigureId, { readonly label: string; readonly note: string }>> =
  deepFreeze({
    passingTone: {
      label: 'Passing tone',
      note: 'A scale note filling the gap between two notes, like C–D–E. Needs three notes in a row.',
    },
    accentedPassingTone: {
      label: 'Accented passing tone',
      note: 'The same, landing on beat 1 or 3, so it sounds tenser. Needs a note on beat 1 or 3.',
    },
    neighborTone: {
      label: 'Neighbor tone',
      note: 'A step away from a note and straight back, like E–F–E. Needs three notes in a row.',
    },
    appoggiatura: {
      label: 'Appoggiatura',
      note: 'A leap to a note outside the chord on beat 1 or 3, then a step down or up onto a chord note. Needs a note just before beat 1 or 3.',
    },
    diatonicEnclosure: {
      label: 'Diatonic enclosure',
      note: "The scale notes just above and below a chord note, then that note, like F–D–E. Needs three back-to-back notes under one chord, so it's rare with quarter notes.",
    },
    chromaticApproach: {
      label: 'Chromatic approach',
      note: 'A note from outside the key, a half step from the next note, like D♯–E. Needs two back-to-back notes.',
    },
    chromaticEnclosure: {
      label: 'Chromatic enclosure',
      note: "Notes a half step above and below a chord note, then that note, like F–D♯–E. Needs three back-to-back notes under one chord, so it's rare with quarter notes.",
    },
  })

/** The four options every figure offers, in increasing level order; none is ever disabled. */
const LEVEL_OPTIONS: readonly SegmentedControlOption[] = deepFreeze(
  FIGURE_LEVEL_IDS.map((level) => ({ value: level, label: LEVEL_LABELS[level] })),
)

/**
 * Intent: the seven figure level controls, in the fixed figure order, each with the same four
 * options (Off, Rarely, Often, Very often) and none of them disabled, whatever the levels.
 */
// @spec-link [[module_figure_level_options]]
// @spec-link [[req_embellishment_figure_levels]]
export const FIGURE_LEVEL_FIELDS: readonly FigureLevelField[] = deepFreeze(
  FIGURE_IDS.map((figure) => ({ figure, ...FIGURE_TEXTS[figure], options: LEVEL_OPTIONS })),
)

/**
 * Intent: the level a segment of a figure's control stands for. A value that is no level is a
 * defect, refused with the figure's label.
 */
// @spec-link [[module_figure_level_options]]
export function figureLevelOfSegment(field: FigureLevelField, value: string): FigureLevel {
  const level = FIGURE_LEVEL_IDS.find((candidate) => candidate === value)
  if (level === undefined) {
    throw new Error(`${field.label} has no level ${JSON.stringify(value)}.`)
  }
  return level
}
