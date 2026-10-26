/**
 * The whole rhythm-render folder for v3.2 H1 and H2, as a list of files (path and content) the
 * render script writes: which doodle measures make the five H1 sets, which letter each band's candidate
 * gets, the H2 locked rhythms and their changes, each file's parts, and the Markdown beside them.
 * Deterministic: the same code and doodle set give byte-identical files. Test tooling: the render
 * script loads it through Vite's runnerImport, so it imports by relative path.
 */

import {
  RHYTHM_CHANGE_KINDS,
  type RhythmChangeKind,
} from '../../../src/domain/generation/request-rhythm-lock'
import { rhythmStarts, type MeasureStarts } from '../../../src/domain/rhythm/rhythm-bars'
import type { RhythmBand } from '../../../src/domain/rhythm/rhythm-distance'
import type { RhythmBar } from '../../../src/domain/rhythm/rhythm-types'
import { loadDoodleSet, type DoodleFixture } from '../jam/doodle-set'
import {
  BANDS,
  doodleMeasurePitches,
  doodleMeasureStarts,
  domainMeasurePool,
  noteCount,
  pickBands,
  seededShuffle,
  type BandPick,
  type PoolMeasure,
} from './rhythm-renders-h1'
import { drainDomain, planChanges, popSongRhythmSetting, type H2Plan } from './rhythm-renders-h2'
import { renderMidi, type RenderPart } from './rhythm-renders-midi'
import { h1Answers, h2Readme, KIND_WORDS, topReadme } from './rhythm-renders-docs'

/** How many H1 sets the folder holds. */
export const H1_SET_COUNT = 5

/** The letters candidates are named by, in order. */
export const LETTERS = ['A', 'B', 'C', 'D'] as const

/** The label the letters' seeded shuffle starts from; with the measure's label, one order per set. */
const LETTER_SEED = 'v3.2-H1-letters'

/**
 * H2's line: each measure's notes take it note by note, a stepwise walk in C major from middle C
 * (C D E F G F E D, twice), so only the rhythm differs between two phrases.
 */
export const H2_LINE: readonly number[] = [
  60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67, 65, 64, 62,
]

/** One file of the folder: its path inside the output directory and its bytes or text. */
export interface RenderOutput {
  readonly path: string
  readonly content: Uint8Array | string
}

/** One candidate of an H1 set: its letter and the band pick behind it. */
export interface H1Candidate {
  readonly letter: string
  readonly pick: BandPick
}

/** One measure of a doodle: the doodle, the measure's number (from 1), its start list and line. */
export interface DoodleMeasure {
  readonly doodle: DoodleFixture
  readonly measure: number
  readonly starts: MeasureStarts
  readonly line: readonly number[]
}

/** One H1 set: its number, its doodle measure, its folder and its lettered candidates. */
export interface H1Set extends DoodleMeasure {
  readonly number: number
  readonly folder: string
  readonly candidates: readonly H1Candidate[]
  /** Bands no domain measure falls in (Same then stands in from the doodle, never left out). */
  readonly missing: readonly RhythmBand[]
}

/** The fewest note starts a doodle measure needs to make an H1 set. */
const MIN_NOTE_STARTS = 2

/** Intent: how many bands of a set's picks come from a rhythm domain. */
function domainBands(picks: ReadonlyMap<RhythmBand, BandPick>): number {
  return [...picks.values()].filter((pick) => pick.source === 'domain').length
}

/** Intent: a doodle measure's label, e.g. `sparse-calls-m2`, which seeds its picks and letters. */
function measureLabel(measure: DoodleMeasure): string {
  return `${measure.doodle.name}-m${measure.measure}`
}

/**
 * Intent: every measure of every doodle, in doodle order then measure order, leaving out the
 * measures holding fewer than two note starts (no rhythm to compare).
 */
export function everyDoodleMeasure(doodles: readonly DoodleFixture[]): readonly DoodleMeasure[] {
  return doodles.flatMap((doodle) =>
    Array.from({ length: doodle.quantized.measureCount }, (_, index) => ({
      doodle,
      measure: index + 1,
      starts: doodleMeasureStarts(doodle.quantized, index),
      line: doodleMeasurePitches(doodle.quantized, index),
    })).filter((measure) => noteCount(measure.starts) >= MIN_NOTE_STARTS),
  )
}

/** A doodle measure with its band picks. */
interface ScoredMeasure {
  readonly measure: DoodleMeasure
  readonly picks: ReadonlyMap<RhythmBand, BandPick>
}

/**
 * Intent: order scored doodle measures for H1: most bands holding a domain measure first, then a
 * listening doodle's measure before another's, then by doodle name and measure number.
 */
function byH1Preference(a: ScoredMeasure, b: ScoredMeasure): number {
  return (
    domainBands(b.picks) - domainBands(a.picks) ||
    Number(b.measure.doodle.traits.listeningMeasure) -
      Number(a.measure.doodle.traits.listeningMeasure) ||
    a.measure.doodle.name.localeCompare(b.measure.doodle.name) ||
    a.measure.measure - b.measure.measure
  )
}

/**
 * Intent: the H1 sets. Of every measure of every doodle (two note starts or more), five, one per
 * doodle at most, taken in the order of `byH1Preference`; numbered in doodle-name order. Each
 * set's candidates are lettered A, B, ... in an order seeded by the doodle measure's label.
 */
export function h1Sets(
  doodles: readonly DoodleFixture[],
  pool: readonly PoolMeasure[],
): readonly H1Set[] {
  const ranked = everyDoodleMeasure(doodles)
    .map((measure) => ({ measure, picks: pickBands(measure.starts, pool, measureLabel(measure)) }))
    .sort(byH1Preference)
  const chosen: ScoredMeasure[] = []
  for (const scored of ranked) {
    if (chosen.length === H1_SET_COUNT) break
    if (chosen.every((held) => held.measure.doodle !== scored.measure.doodle)) chosen.push(scored)
  }
  if (chosen.length < H1_SET_COUNT)
    throw new Error(
      `H1 needs ${H1_SET_COUNT} doodles with a usable measure; found ${chosen.length}.`,
    )
  chosen.sort(
    (a, b) =>
      a.measure.doodle.name.localeCompare(b.measure.doodle.name) ||
      a.measure.measure - b.measure.measure,
  )
  return chosen.map(({ measure, picks }, index) => {
    const order = seededShuffle(
      [...picks.values()],
      `${LETTER_SEED}|${measureLabel(measure)}`,
      (pick) => pick.band,
    )
    return {
      ...measure,
      number: index + 1,
      folder: `set-${index + 1}-${measureLabel(measure)}`,
      candidates: order.map((pick, position) => ({ letter: LETTERS[position]!, pick })),
      missing: BANDS.filter((band) => picks.get(band)?.source !== 'domain'),
    }
  })
}

/** Intent: one rhythm part. */
function rhythm(
  label: string,
  measures: readonly MeasureStarts[],
  line: readonly number[],
): RenderPart {
  return { kind: 'rhythm', label, measures, line }
}

/** One silent measure between two rhythms. */
const SILENT_MEASURE: RenderPart = { kind: 'silence', label: 'Silent measure', measureCount: 1 }

/** Intent: the MIDI files of the H1 sets: each doodle measure alone, then one file per candidate. */
export function h1Outputs(sets: readonly H1Set[]): readonly RenderOutput[] {
  return sets.flatMap((set) => {
    const doodle = rhythm('Doodle measure', [set.starts], set.line)
    const dir = `h1-drift/${set.folder}`
    return [
      {
        path: `${dir}/doodle.mid`,
        content: renderMidi({ name: `Set ${set.number} doodle`, parts: [doodle] }),
      },
      ...set.candidates.map(({ letter, pick }) => ({
        path: `${dir}/${letter}.mid`,
        content: renderMidi({
          name: `Set ${set.number} candidate ${letter}`,
          parts: [doodle, SILENT_MEASURE, rhythm(`Candidate ${letter}`, [pick.starts], set.line)],
        }),
      })),
    ]
  })
}

/** Intent: a change kind's file stem: its number in the canonical order and its name. */
export function kindFileStem(kind: RhythmChangeKind): string {
  return `${RHYTHM_CHANGE_KINDS.indexOf(kind) + 1}-${kind.replaceAll('_', '-')}`
}

/** Intent: the locked file of the plan's lock at `index`: `locked.mid`, then `locked-2.mid`... */
export function lockedFileName(index: number): string {
  return index === 0 ? 'locked.mid' : `locked-${index + 1}.mid`
}

/** Intent: an H2 phrase part: the bars' start lists as written, on H2's line. */
function phrase(label: string, bars: readonly RhythmBar[]): RenderPart {
  return rhythm(label, rhythmStarts(bars), H2_LINE)
}

/** Intent: the MIDI files of H2: each locked rhythm alone, then one file per kind found. */
export function h2Outputs(plan: H2Plan): readonly RenderOutput[] {
  return plan.locks.flatMap((lock, index) => [
    {
      path: `h2-changes/${lockedFileName(index)}`,
      content: renderMidi({
        name: `Locked rhythm ${index + 1}`,
        parts: [phrase('Locked rhythm', lock.locked.bars)],
      }),
    },
    ...[...lock.changes].map(([kind, pick]) => ({
      path: `h2-changes/${kindFileStem(kind)}.mid`,
      content: renderMidi({
        name: `Change: ${KIND_WORDS[kind].name}`,
        parts: [
          phrase('Locked rhythm', lock.locked.bars),
          SILENT_MEASURE,
          phrase(`Changed rhythm (${KIND_WORDS[kind].name})`, pick.candidate.bars),
        ],
      }),
    })),
  ])
}

/** What a whole build of the folder holds, for the script's summary. */
export interface RenderBuild {
  readonly outputs: readonly RenderOutput[]
  readonly sets: readonly H1Set[]
  readonly plan: H2Plan
  readonly poolSize: number
}

/** Intent: build every file of the folder from the doodle set and the real rhythm domains. */
export function buildRenders(): RenderBuild {
  const pool = domainMeasurePool()
  const sets = h1Sets(loadDoodleSet(), pool)
  const setting = popSongRhythmSetting()
  const plan = planChanges(setting, drainDomain(setting))
  const outputs: RenderOutput[] = [
    { path: 'README.md', content: topReadme(sets, plan, pool.length) },
    ...h1Outputs(sets),
    { path: 'h1-drift/ANSWERS.md', content: h1Answers(sets) },
    ...h2Outputs(plan),
    { path: 'h2-changes/README.md', content: h2Readme(plan) },
  ]
  return { outputs, sets, plan, poolSize: pool.length }
}
