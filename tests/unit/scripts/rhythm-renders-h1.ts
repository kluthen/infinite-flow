/**
 * The choices behind the v3.2 H1 renders (drift's scale by ear): a doodle measure's start list,
 * the pool of measures the real rhythm domains write, and for each distance band one candidate
 * measure of that pool, chosen deterministically. Measures are compared as C8 says against the
 * doodle: as heard, a rest start right after another rest dropped. Test tooling: the render script
 * (`scripts/render-rhythm-examples.mjs`) loads it through Vite's runnerImport, so it imports by
 * relative path; nothing in the app reads it.
 */

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '../../../src/domain/controls/generation-controls'
import type { QuantizedDoodle } from '../../../src/domain/doodle/quantized-doodle'
import {
  measureStarts,
  type MeasureStarts,
  type RhythmStart,
} from '../../../src/domain/rhythm/rhythm-bars'
import {
  measureBand,
  measureEdits,
  type RhythmBand,
} from '../../../src/domain/rhythm/rhythm-distance'
import {
  isNoLegalRhythmPlan,
  makeRhythmCandidateDomain,
} from '../../../src/domain/rhythm/rhythm-planner'
import type { RhythmBar, RhythmExpansionInput } from '../../../src/domain/rhythm/rhythm-types'
import { TICKS_PER_BAR } from '../../../src/domain/time/ticks'

/** The four bands, closest first, in the order the answers list them. */
export const BANDS: readonly RhythmBand[] = ['Same', 'Close', 'Near', 'beyond']

/** One distinct measure of the pool: its start list as heard and its compact key. */
export interface PoolMeasure {
  readonly key: string
  readonly starts: MeasureStarts
}

/** The candidate chosen for one band: its start list, its edit count, and where it comes from. */
export interface BandPick {
  readonly band: RhythmBand
  readonly starts: MeasureStarts
  readonly edits: number
  /** `domain`: a measure some rhythm domain writes; `doodle`: the doodle's own rhythm (Same only). */
  readonly source: 'domain' | 'doodle'
}

/** Intent: one start, frozen. */
function start(tick: number, kind: RhythmStart['kind']): RhythmStart {
  return Object.freeze({ tick, kind })
}

/**
 * Intent: the start list of one measure of a doodle (`measureIndex` from 0), as C5.9 defines it: a
 * note start where each note starts, a rest start wherever a silence begins (where a note ends and
 * no note starts, and at tick 0 when the measure opens in silence). A note held across the barline
 * starts nothing more, so a measure under one held note holds no start.
 */
export function doodleMeasureStarts(doodle: QuantizedDoodle, measureIndex: number): MeasureStarts {
  const from = measureIndex * TICKS_PER_BAR
  const list: RhythmStart[] = []
  let soundingUntil = 0
  for (const note of doodle.notes) {
    const tick = note.startTick - from
    if (tick >= TICKS_PER_BAR) break
    if (tick >= 0) {
      if (tick > soundingUntil) list.push(start(soundingUntil, 'rest'))
      list.push(start(tick, 'note'))
    }
    soundingUntil = Math.max(soundingUntil, tick + note.lengthTicks)
  }
  if (soundingUntil < TICKS_PER_BAR) list.push(start(soundingUntil, 'rest'))
  return Object.freeze(list)
}

/** Intent: the pitches of the notes starting in one measure of a doodle, in order. */
export function doodleMeasurePitches(
  doodle: QuantizedDoodle,
  measureIndex: number,
): readonly number[] {
  const from = measureIndex * TICKS_PER_BAR
  return doodle.notes
    .filter((note) => note.startTick >= from && note.startTick < from + TICKS_PER_BAR)
    .map((note) => note.pitch)
}

/** Intent: a start list read as heard (C8): a rest start right after another rest is dropped. */
export function asHeard(starts: MeasureStarts): MeasureStarts {
  return Object.freeze(
    starts.filter((entry, index) => entry.kind === 'note' || starts[index - 1]?.kind !== 'rest'),
  )
}

/** Intent: a start list as compact text, e.g. `n0 n2 r6 n8`, used as its key and in the answers. */
export function startsKey(starts: MeasureStarts): string {
  return starts.map((entry) => `${entry.kind === 'note' ? 'n' : 'r'}${entry.tick}`).join(' ')
}

/** Intent: how many note starts a start list holds. */
export function noteCount(starts: MeasureStarts): number {
  return starts.filter((entry) => entry.kind === 'note').length
}

/** Intent: a 32-bit FNV-1a hash of a text, the stable seeded order the picks break ties with. */
export function seededHash(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

/** Intent: a copy of a list in a stable order seeded by a label: by each item's hash, then name. */
export function seededShuffle<T>(
  items: readonly T[],
  label: string,
  name: (item: T) => string,
): T[] {
  return [...items].sort(
    (a, b) =>
      seededHash(`${label}|${name(a)}`) - seededHash(`${label}|${name(b)}`) ||
      name(a).localeCompare(name(b)),
  )
}

/** Intent: whether a measure opens with a tie continuation, which sounds as nothing on its own. */
function opensWithTie(bar: RhythmBar): boolean {
  return bar.events[0]?.tieContinuation === true
}

/**
 * Intent: every distinct measure (as heard) that the rhythm domain of some supported rhythm
 * setting writes, over all four tensions, in the order first met. A measure that opens with a tie
 * continuation is left out: played alone, its first beat would be a silence its start list does
 * not hold.
 */
export function domainMeasurePool(): readonly PoolMeasure[] {
  const pool = new Map<string, PoolMeasure>()
  for (const setting of everyRhythmSetting()) {
    const domain = makeRhythmCandidateDomain(setting)
    if (isNoLegalRhythmPlan(domain)) continue
    for (const candidate of domain.candidates()) addBars(pool, candidate.bars)
  }
  return Object.freeze([...pool.values()])
}

/** Intent: every rhythm setting at every tension: 3 x 3 x 3 x 3 x 4 = 324, in catalog order. */
function everyRhythmSetting(): readonly RhythmExpansionInput[] {
  return NOTE_DENSITIES.flatMap((noteDensity) =>
    RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
      SILENCE_DENSITIES.flatMap((silenceDensity) =>
        SYNCOPATIONS.flatMap((syncopation) =>
          TENSION_ARCS.map((tensionArc) => ({
            noteDensity,
            rhythmicVariety,
            silenceDensity,
            syncopation,
            tensionArc,
          })),
        ),
      ),
    ),
  )
}

/** Intent: add a rhythm's measures to the pool, once per distinct start list as heard. */
function addBars(pool: Map<string, PoolMeasure>, bars: readonly RhythmBar[]): void {
  for (const bar of bars) {
    if (opensWithTie(bar)) continue
    const starts = asHeard(measureStarts(bar))
    const key = startsKey(starts)
    if (!pool.has(key)) pool.set(key, Object.freeze({ key, starts }))
  }
}

/** A pool measure scored against the doodle measure. */
interface Scored {
  readonly measure: PoolMeasure
  readonly band: RhythmBand
  readonly edits: number
  readonly noteGap: number
  readonly order: number
}

/** Intent: order scored measures: nearest note count, then fewest edits, then seeded order. */
function byPreference(a: Scored, b: Scored): number {
  return (
    a.noteGap - b.noteGap ||
    a.edits - b.edits ||
    a.order - b.order ||
    a.measure.key.localeCompare(b.measure.key)
  )
}

/**
 * Intent: one candidate per band for a doodle measure. Among the pool measures in a band, the one
 * whose note count is nearest the doodle's (so beyond is not trivially far), then with the fewest
 * edits, then first in an order seeded by `label`. When no pool measure is Same, the doodle's own
 * rhythm stands in for Same; a band left empty otherwise is absent from the result.
 */
export function pickBands(
  doodle: MeasureStarts,
  pool: readonly PoolMeasure[],
  label: string,
): ReadonlyMap<RhythmBand, BandPick> {
  const best = new Map<RhythmBand, Scored>()
  const notes = noteCount(doodle)
  for (const measure of pool) {
    const scored: Scored = {
      measure,
      band: measureBand(doodle, measure.starts),
      edits: measureEdits(doodle, measure.starts).edits,
      noteGap: Math.abs(noteCount(measure.starts) - notes),
      order: seededHash(`${label}|${measure.key}`),
    }
    const held = best.get(scored.band)
    if (held === undefined || byPreference(scored, held) < 0) best.set(scored.band, scored)
  }
  const picks = new Map<RhythmBand, BandPick>()
  for (const band of BANDS) {
    const found = best.get(band)
    if (found !== undefined)
      picks.set(band, { band, starts: found.measure.starts, edits: found.edits, source: 'domain' })
    else if (band === 'Same') picks.set(band, { band, starts: doodle, edits: 0, source: 'doodle' })
  }
  return picks
}
