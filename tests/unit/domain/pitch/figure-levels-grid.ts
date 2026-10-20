/**
 * The small fixed grid the end-to-end figure-level specs generate standalone phrases over (test
 * plumbing): two seeds, Varied and Chaotic arpeggio chaos, three note densities, two collections
 * and the four tension arcs, each point turned into a real intent under chosen figure levels.
 */

import type {
  ArpeggioChaos,
  Collection,
  NoteDensity,
  TensionArc,
} from '@/domain/controls/generation-controls'
import { FIGURE_IDS, type FigureLevel, type FigureLevels } from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { buildIntent } from '../generation/carry-in/carry-in-fixture'

export const SEEDS = [7, 13] as const
/** Varied and Chaotic arpeggio chaos: Predictable keeps almost every note a chord tone. */
export const ARPEGGIO_CHAOS: readonly ArpeggioChaos[] = ['Varied', 'Chaotic']
export const DENSITIES: readonly NoteDensity[] = ['Quarter', 'Eighth', 'Sixteenth']
export const COLLECTIONS: readonly Collection[] = ['Major', 'Dorian']
export const TENSIONS: readonly TensionArc[] = ['Settled', 'Lift', 'Build', 'Edge']

/** One grid point: a seed and the controls it is generated with. */
export interface GridPoint {
  readonly seed: number
  readonly arpeggioChaos: ArpeggioChaos
  readonly noteDensity: NoteDensity
  readonly collection: Collection
  readonly tension: TensionArc
}

/** Every grid point, seed first and Tension last. */
export const GRID: readonly GridPoint[] = SEEDS.flatMap((seed) =>
  ARPEGGIO_CHAOS.flatMap((arpeggioChaos) =>
    DENSITIES.flatMap((noteDensity) =>
      COLLECTIONS.flatMap((collection) =>
        TENSIONS.map((tension) => ({ seed, arpeggioChaos, noteDensity, collection, tension })),
      ),
    ),
  ),
)

/** Levels giving every figure the same level. */
export function everyFigureAt(level: FigureLevel): FigureLevels {
  return Object.fromEntries(FIGURE_IDS.map((figure) => [figure, level])) as FigureLevels
}

/** The intent of one grid point under the levels, its request labelled `label`. */
export function gridIntent(
  point: GridPoint,
  figureLevels: FigureLevels,
  label: string,
): GenerationIntent {
  const { seed, tension, ...controls } = point
  const built = buildIntent({ seed, controls: { ...controls, tension }, label })
  return { ...built, figureLevels }
}
