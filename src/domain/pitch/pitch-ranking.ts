import type { ArpeggioChaos } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { FIGURE_IDS, type FigureId, type FigureLevels } from '../figures/figure-levels'
import { isFavoredLevel, isFigureDrawn, type FavoredLevel } from './figure-draw'
import type {
  FavoredEntry,
  FreeToneResolution,
  PitchAttack,
  PitchCandidate,
  PitchSearchEntry,
} from './pitch-types'
import { compareUnsignedTieKeys, type PitchTieKeyFactory } from './pitch-tie-key'

/** A favored entry's first rank component: below every unheld one, the higher level lower. */
const FAVORED_PRIORITY: Readonly<Record<FavoredLevel, number>> = deepFreeze({
  stronglyFavored: -2,
  favored: -1,
})

/**
 * Musical rank tuple, lexicographic and lower first:
 * 1. a favored entry first, Strongly favored (-2) before Favored (-1); then, for every unheld
 *    candidate, chord-tone priority on beat 1 and at a harmony change (0 for chord tones, 1 for
 *    other candidates there, 0 elsewhere);
 * 2. chord tones before every non-chord candidate, so chaos can never interleave the two groups;
 * 3. arpeggio chaos, applied only to chord tones: Predictable prefers the nearest tone, Chaotic the
 *    farthest, Varied leaves chord tones to the seeded tie key.
 * Without `favored` the tuple is the one used before the figure levels existed.
 */
// @spec-link [[rule_arpeggio_chaos_respects_constraints]]
// @spec-link [[module_favored_figure_draw]]
// @spec-link [[rule_figure_level_orders_search]]
export function pitchRank(
  chaos: ArpeggioChaos,
  attack: Pick<PitchAttack, 'isBeatOne' | 'isFirstUnderHarmonyChange'>,
  candidate: Pick<PitchCandidate, 'role' | 'midi'>,
  priorMidi: number | undefined,
  favored?: Pick<FavoredEntry, 'level'>,
): readonly number[] {
  const chord = candidate.role === 'chord_tone'
  const priority =
    favored !== undefined
      ? FAVORED_PRIORITY[favored.level]
      : (attack.isBeatOne || attack.isFirstUnderHarmonyChange) && !chord
        ? 1
        : 0
  const distance = priorMidi === undefined ? 0 : Math.abs(candidate.midi - priorMidi)
  const chaosKey = !chord
    ? 0
    : chaos === 'Predictable'
      ? distance
      : chaos === 'Chaotic'
        ? -distance
        : 0
  return deepFreeze([priority, chord ? 0 : 1, chaosKey])
}

/** Lexicographic comparison of two rank tuples of equal length. */
function compareRank(a: readonly number[], b: readonly number[]): number {
  for (let index = 0; index < a.length; index += 1)
    if (a[index] !== b[index]) return a[index]! - b[index]!
  return 0
}

/** The resolution a drawn free diatonic figure holds its tone to. */
const FREE_TONE_HOLDS: Readonly<Partial<Record<FigureId, FreeToneResolution>>> = deepFreeze({
  passingTone: 'passing',
  accentedPassingTone: 'passing',
  neighborTone: 'neighbor',
})

/**
 * The figures drawn at an attack among those its candidates name, with their level; each figure's
 * draw is computed at most once, and only at Favored and Strongly favored.
 */
function drawnFigures(
  candidates: readonly PitchCandidate[],
  figureLevels: FigureLevels,
  seed: number,
  noteIdentity: string,
): ReadonlyMap<FigureId, FavoredLevel> {
  const drawn = new Map<FigureId, FavoredLevel>()
  const decided = new Set<FigureId>()
  for (const candidate of candidates)
    for (const figure of candidate.figures ?? []) {
      if (decided.has(figure)) continue
      decided.add(figure)
      const level = figureLevels[figure]
      if (isFavoredLevel(level) && isFigureDrawn(seed, noteIdentity, figure, level))
        drawn.set(figure, level)
    }
  return drawn
}

/** The resolution a drawn figure holds a free diatonic tone to; any other figure is a caller bug. */
function freeToneHold(figure: FigureId): FreeToneResolution {
  const hold = FREE_TONE_HOLDS[figure]
  if (hold === undefined) throw new Error(`A free diatonic tone cannot name ${figure}.`)
  return hold
}

/**
 * The search entries of one candidate at a note where `drawn` figures are drawn: a free chromatic
 * path's first member naming a drawn figure is one favored entry in place of its usual one (its
 * path already holds it); a free diatonic tone has one held entry per drawn figure it names, plus
 * its usual unheld entry; every other candidate keeps its usual entry.
 */
function candidateEntries(
  candidate: PitchCandidate,
  drawn: ReadonlyMap<FigureId, FavoredLevel>,
): readonly PitchSearchEntry[] {
  const figures = (candidate.figures ?? []).filter((figure) => drawn.has(figure))
  if (figures.length === 0) return [{ candidate }]
  if (candidate.reservation !== undefined) {
    // A path's first member names exactly its own figure.
    const figure = figures[0]!
    return [{ candidate, favored: { figure, level: drawn.get(figure)! } }]
  }
  return [
    ...figures.map((figure): PitchSearchEntry => ({
      candidate,
      favored: { figure, level: drawn.get(figure)!, hold: freeToneHold(figure) },
    })),
    { candidate },
  ]
}

/** The index of an entry's favored figure in FIGURE_IDS; -1 for an unheld entry. */
function figureIndex(entry: PitchSearchEntry): number {
  return entry.favored === undefined ? -1 : FIGURE_IDS.indexOf(entry.favored.figure)
}

/**
 * Order one attack's candidates for depth-first search: musical rank first, then the unsigned
 * seeded tie key, then MIDI, then enumeration index, then the favored figure's index, so the order
 * is total. Pure and seed-derived; no mutable PRNG. Each entry's rank tuple and tie key are
 * computed once before sorting, so the tie-key hash runs once per entry rather than twice per
 * comparison.
 *
 * At a note where a Favored or Strongly favored figure some candidate names is drawn, the
 * candidates that may start it come first, as that figure (see `candidateEntries`), higher level
 * first, their tie key seeded over the candidate and the figure. Where no named figure is drawn,
 * or no levels are given, every candidate is one unheld entry in exactly the order used before
 * the figure levels existed.
 */
// @spec-link [[rule_arpeggio_chaos_respects_constraints]]
// @spec-link [[module_favored_figure_draw]]
// @spec-link [[rule_figure_level_orders_search]]
export function orderCandidates(input: {
  readonly chaos: ArpeggioChaos
  readonly seed: number
  readonly attack: PitchAttack
  readonly candidates: readonly PitchCandidate[]
  readonly priorMidi: number | undefined
  readonly key: PitchTieKeyFactory
  /**
   * The levels whose drawn figures go first; omitted where no figure may start, and then the
   * order is the one before the levels existed.
   */
  readonly figureLevels?: FigureLevels
}): readonly PitchSearchEntry[] {
  const drawn =
    input.figureLevels === undefined
      ? undefined
      : drawnFigures(input.candidates, input.figureLevels, input.seed, input.attack.identity)
  const entries =
    drawn === undefined || drawn.size === 0
      ? input.candidates.map((candidate): PitchSearchEntry => ({ candidate }))
      : input.candidates.flatMap((candidate) => candidateEntries(candidate, drawn))
  const ranked = entries.map((entry) => ({
    entry,
    rank: pitchRank(input.chaos, input.attack, entry.candidate, input.priorMidi, entry.favored),
    tieKey: input.key({
      seed: input.seed,
      decisionIdentity: input.attack.identity,
      candidateStableIdentity:
        entry.favored === undefined
          ? entry.candidate.identity
          : `${entry.candidate.identity}|${entry.favored.figure}`,
    }),
    figureIndex: figureIndex(entry),
  }))
  ranked.sort(
    (a, b) =>
      compareRank(a.rank, b.rank) ||
      compareUnsignedTieKeys(
        a.tieKey,
        b.tieKey,
        a.entry.candidate.midi,
        b.entry.candidate.midi,
        a.entry.candidate.enumerationIndex,
        b.entry.candidate.enumerationIndex,
      ) ||
      a.figureIndex - b.figureIndex,
  )
  return ranked.map((item) => item.entry)
}
