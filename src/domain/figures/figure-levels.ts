/**
 * The seven embellishment figures and their four levels: the one internal vocabulary the
 * generation request, the replay key and the stored records hold, and the allowance the generator
 * reads from them. Pure data and functions: no storage, interface, clock or random source.
 */

import type { MusicalProfile } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'

/**
 * Intent: the seven figures' internal ids, in the fixed order every value, key and record listing
 * them follows. Internal and never changed, since replay keys and stored records hold them.
 */
// @spec-link [[module_figure_levels]]
// @spec-link [[rule_embellishment_figures_defined]]
export const FIGURE_IDS = deepFreeze([
  'passingTone',
  'accentedPassingTone',
  'neighborTone',
  'appoggiatura',
  'diatonicEnclosure',
  'chromaticApproach',
  'chromaticEnclosure',
] as const)

/** Intent: one figure's internal id. */
// @spec-link [[module_figure_levels]]
export type FigureId = (typeof FIGURE_IDS)[number]

/**
 * Intent: the four levels' internal ids, in increasing order. The interface's labels and the
 * spec's working names can change without touching them.
 */
// @spec-link [[module_figure_levels]]
// @spec-link [[req_embellishment_figure_levels]]
export const FIGURE_LEVEL_IDS = deepFreeze([
  'off',
  'asToday',
  'favored',
  'stronglyFavored',
] as const)

/** Intent: one figure's level. */
// @spec-link [[module_figure_levels]]
// @spec-link [[req_embellishment_figure_levels]]
export type FigureLevel = (typeof FIGURE_LEVEL_IDS)[number]

/** Intent: exactly one level for each of the seven figures, no more and no fewer. */
// @spec-link [[module_figure_levels]]
// @spec-link [[req_embellishment_figure_levels]]
export type FigureLevels = { readonly [F in FigureId]: FigureLevel }

/** Intent: Neutral's levels: passing, accented passing and neighbor tones as today, others off. */
// @spec-link [[module_figure_levels]]
// @spec-link [[rule_neutral_and_jazz_figure_levels]]
export const NEUTRAL_FIGURE_LEVELS: FigureLevels = deepFreeze({
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'off',
  chromaticEnclosure: 'off',
})

/** Intent: Jazz's levels: Neutral's, with the chromatic approach and enclosure as today. */
// @spec-link [[module_figure_levels]]
// @spec-link [[rule_neutral_and_jazz_figure_levels]]
export const JAZZ_FIGURE_LEVELS: FigureLevels = deepFreeze({
  passingTone: 'asToday',
  accentedPassingTone: 'asToday',
  neighborTone: 'asToday',
  appoggiatura: 'off',
  diatonicEnclosure: 'off',
  chromaticApproach: 'asToday',
  chromaticEnclosure: 'asToday',
})

const LEVELS_BY_PROFILE: Readonly<Record<MusicalProfile, FigureLevels>> = deepFreeze({
  Neutral: NEUTRAL_FIGURE_LEVELS,
  Jazz: JAZZ_FIGURE_LEVELS,
})

/**
 * Intent: the one mapping from a musical profile to levels, wherever a profile still stands for
 * them. It takes the profile's name alone, since being customized never changed the figures, and
 * returns a fresh frozen copy, keys in FIGURE_IDS order.
 */
// @spec-link [[module_figure_levels]]
// @spec-link [[rule_neutral_and_jazz_figure_levels]]
export function levelsForProfile(profile: MusicalProfile): FigureLevels {
  return copyLevels(LEVELS_BY_PROFILE[profile])
}

/** Intent: a fresh deep-frozen copy of levels, keys in FIGURE_IDS order. */
function copyLevels(levels: FigureLevels): FigureLevels {
  return deepFreeze(
    Object.fromEntries(FIGURE_IDS.map((figure) => [figure, levels[figure]])) as FigureLevels,
  )
}

/** Intent: whether the levels let the generator write the figure as a free figure: not off. */
// @spec-link [[module_figure_levels]]
export function allowsFreeFigure(levels: FigureLevels, figure: FigureId): boolean {
  return levels[figure] !== 'off'
}

/**
 * Intent: whether the levels let the generator write a note from outside the key and mode:
 * exactly when the chromatic approach or the chromatic enclosure is not off.
 */
// @spec-link [[module_figure_levels]]
// @spec-link [[rule_chromatic_notes_need_a_chromatic_figure]]
export function allowsChromaticNotes(levels: FigureLevels): boolean {
  return (
    allowsFreeFigure(levels, 'chromaticApproach') || allowsFreeFigure(levels, 'chromaticEnclosure')
  )
}

/** A figure-levels value that is not exactly one known level for each of the seven figures. */
// @spec-link [[module_figure_levels]]
export class FigureLevelsError extends Error {
  readonly kind = 'FigureLevelsError' as const

  constructor(message: string) {
    super(message)
    this.name = 'FigureLevelsError'
  }
}

/** Intent: whether a value is a plain, non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Intent: what a value that is not a plain object is, for a refusal's message. */
function describeNonObject(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return typeof value
}

/**
 * Intent: read an untrusted figure-levels value: a plain object holding exactly the seven figure
 * ids, each a known level. A non-object, a missing figure, an unknown or extra key, or an unknown
 * level throws a FigureLevelsError naming the cause; nothing is defaulted. Returns a fresh
 * deep-frozen value, keys in FIGURE_IDS order.
 */
// @spec-link [[module_figure_levels]]
export function parseFigureLevels(value: unknown): FigureLevels {
  if (!isPlainObject(value)) {
    throw new FigureLevelsError(
      `Figure levels must be a plain object, got ${describeNonObject(value)}.`,
    )
  }
  for (const key of Object.keys(value)) {
    if (!(FIGURE_IDS as readonly string[]).includes(key)) {
      throw new FigureLevelsError(`Figure levels name an unknown figure "${key}".`)
    }
  }
  const parsed: Partial<Record<FigureId, FigureLevel>> = {}
  for (const figure of FIGURE_IDS) {
    if (!Object.hasOwn(value, figure)) {
      throw new FigureLevelsError(`Figure levels are missing the figure "${figure}".`)
    }
    const level = value[figure]
    const known = FIGURE_LEVEL_IDS.find((id) => id === level)
    if (known === undefined) {
      throw new FigureLevelsError(
        `Figure levels give "${figure}" the unknown level ${JSON.stringify(level)}; expected one of ${JSON.stringify(FIGURE_LEVEL_IDS)}.`,
      )
    }
    parsed[figure] = known
  }
  return copyLevels(parsed as FigureLevels)
}
