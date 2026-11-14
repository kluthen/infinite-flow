/**
 * The Seventh chords level as a dimension of the v3.3 measurements (measurement tooling, M1 and
 * M2): the four levels' names in the reports, the chord families of one level, the levels a run
 * may measure, and the levels a runner's environment variable names.
 *
 * Every level is measurable: the generator reads the level (v3.3 chunk 12: the per-event draw and
 * the plan variants) and the session carries it (chunk 16), so a phrase asked for at Sometimes is
 * generated at Sometimes. Chunk 18 opened the three levels above Off to the measurements.
 */

import {
  CHORD_FAMILY_LEVEL_IDS,
  parseChordFamilies,
  type ChordFamilies,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'

/** The levels a measurement generates at: all four, in increasing order. */
export const MEASURABLE_SEVENTH_LEVELS: readonly ChordFamilyLevel[] = CHORD_FAMILY_LEVEL_IDS

/** Each level's name in the reports: the spec's names (the interface's labels are ux-writer's). */
export const SEVENTH_LEVEL_NAMES: Readonly<Record<ChordFamilyLevel, string>> = {
  off: 'Off',
  sometimes: 'Sometimes',
  favored: 'Favored',
  stronglyFavored: 'Strongly favored',
}

/** Intent: the chord families with the seventh chords at `level`, through the domain's parser. */
export function chordFamiliesAt(level: ChordFamilyLevel): ChordFamilies {
  return parseChordFamilies({ 'seventh-chords': level })
}

/** Intent: crash unless a measurement can generate at `level` (MEASURABLE_SEVENTH_LEVELS). */
export function requireMeasurableSeventhLevel(level: ChordFamilyLevel): void {
  if (!MEASURABLE_SEVENTH_LEVELS.includes(level))
    throw new Error(
      `The Seventh chords level ${SEVENTH_LEVEL_NAMES[level]} is not measurable. Measurable: ${MEASURABLE_SEVENTH_LEVELS.join(', ')}.`,
    )
}

/**
 * Intent: the levels an environment variable names, comma-separated level ids (`all` for the four),
 * returned once each in increasing order; unset or empty, every measurable level (all four). An
 * unknown id, or a level not measurable, fails.
 */
export function seventhLevelsFrom(
  name: string,
  raw: string | undefined,
): readonly ChordFamilyLevel[] {
  if (raw === undefined || raw.trim() === '') return MEASURABLE_SEVENTH_LEVELS
  const wanted =
    raw.trim().toLowerCase() === 'all'
      ? CHORD_FAMILY_LEVEL_IDS
      : raw.split(',').map((part) => {
          const id = part.trim()
          const level = CHORD_FAMILY_LEVEL_IDS.find((known) => known === id)
          if (level === undefined)
            throw new Error(
              `${name} names an unknown level "${id}"; known: all, ${CHORD_FAMILY_LEVEL_IDS.join(', ')}.`,
            )
          return level
        })
  wanted.forEach(requireMeasurableSeventhLevel)
  return CHORD_FAMILY_LEVEL_IDS.filter((level) => wanted.includes(level))
}
