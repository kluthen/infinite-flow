/**
 * The Seventh chords level as a dimension of the v3.3 measurements (measurement tooling, M1 and
 * M2): the four levels' names in the reports, the chord families of one level, the levels a run
 * may measure today, and the levels a runner's environment variable names.
 *
 * Only Off can be measured until the generator reads the level (v3.3 chunk 12: the per-event draw
 * and the plan variants) and the session carries it (chunk 16): before that, a phrase asked for at
 * Sometimes is generated exactly as at Off, so a figure "at Sometimes" would be Off's under another
 * name. A level outside `MEASURABLE_SEVENTH_LEVELS` is refused, never measured as Off. The chunk
 * that wires the last of those two in (chunk 18 at the latest) adds the three other levels here.
 */

import {
  CHORD_FAMILY_LEVEL_IDS,
  parseChordFamilies,
  type ChordFamilies,
  type ChordFamilyLevel,
} from '@/domain/chords/chord-families'

/** The levels a measurement generates at today: Off only, until chunks 12 and 16 are in. */
export const MEASURABLE_SEVENTH_LEVELS: readonly ChordFamilyLevel[] = ['off']

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

/** Intent: crash unless a measurement can generate at `level` today (MEASURABLE_SEVENTH_LEVELS). */
export function requireMeasurableSeventhLevel(level: ChordFamilyLevel): void {
  if (!MEASURABLE_SEVENTH_LEVELS.includes(level))
    throw new Error(
      `The Seventh chords level ${SEVENTH_LEVEL_NAMES[level]} cannot be measured yet: until the generator reads the level (v3.3 chunk 12) and the session carries it (chunk 16), every phrase is generated at Off. Measurable today: ${MEASURABLE_SEVENTH_LEVELS.join(', ')}.`,
    )
}

/**
 * Intent: the levels an environment variable names, comma-separated level ids (`all` for the four),
 * returned once each in increasing order; unset or empty, every measurable level. An unknown id,
 * or a level not measurable today, fails.
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
