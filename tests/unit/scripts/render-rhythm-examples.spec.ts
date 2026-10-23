// @vitest-environment node
/**
 * The rhythm renders for the v3.2 hand checks H1 and H2 (`npm run render:rhythms`): a doodle
 * measure's start list as C5.9 defines it, the band picks against a pool of measures, the H2
 * locked rhythm and its changes on the real Pop song domain, the MIDI files' structure read back
 * with the tests' own Standard MIDI File reader, and the script run end to end: deterministic, and
 * refusing to write into a folder that is not its own. Tooling: no business behaviour.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeBetween } from '@/domain/rhythm/rhythm-change-kinds'
import { measureBand } from '@/domain/rhythm/rhythm-distance'
import { metaTexts, notesOf, readSmf, tempoMap } from '../export/midi/smf-reader'
import { loadDoodleSet, type DoodleFixture } from '../jam/doodle-set'
import { DETACHED_NOTE, h1Answers, measureGrid, tickPlace } from './rhythm-renders-docs'
import {
  asHeard,
  doodleMeasurePitches,
  doodleMeasureStarts,
  pickBands,
  startsKey,
  type PoolMeasure,
} from './rhythm-renders-h1'
import { changesOffered, drainDomain, planChanges, popSongRhythmSetting } from './rhythm-renders-h2'
import { CLICK_CHANNEL, CLICK_PITCH, renderMidi } from './rhythm-renders-midi'
import { buildRenders, everyDoodleMeasure, h1Sets, LETTERS } from './rhythm-renders-plan'

/** The repository root the script runs from. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Generous timeout for the end-to-end run: it drains every rhythm domain, twice. */
const SCRIPT_TIMEOUT_MS = 180_000

/** MIDI ticks: one sixteenth and one measure at 960 per quarter note. */
const SIXTEENTH = 240
const MEASURE = 3840

/** Temporary directories made by a test, removed after it. */
const made: string[] = []

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Intent: a fresh empty directory, removed after the test. */
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rhythm-renders-'))
  made.push(dir)
  return dir
}

/** Intent: a start list from compact text, e.g. `n0 r4 n6`. */
function starts(text: string): MeasureStarts {
  return text.split(' ').map((token) => ({
    tick: Number(token.slice(1)),
    kind: token[0] === 'n' ? ('note' as const) : ('rest' as const),
  }))
}

/** Intent: a pool of measures from compact start lists. */
function pool(...texts: string[]): PoolMeasure[] {
  return texts.map((text) => ({ key: text, starts: starts(text) }))
}

/** Intent: a quantized doodle from (start, length, pitch) triples. */
function doodle(measureCount: number, notes: readonly [number, number, number][]) {
  return makeQuantizedDoodle({
    measureCount,
    notes: notes.map(([startTick, lengthTicks, pitch]) => ({ startTick, lengthTicks, pitch })),
  })
}

/** The doodle the synthetic fixtures copy their other fields from. */
const BASE_DOODLE = loadDoodleSet()[0]!

/** Intent: a doodle fixture named `name`, listening or not, with the given measures and notes. */
function fixture(
  name: string,
  listening: boolean,
  measureCount: 1 | 2,
  notes: readonly [number, number, number][],
): DoodleFixture {
  return {
    ...BASE_DOODLE,
    name,
    traits: { ...BASE_DOODLE.traits, listeningMeasure: listening },
    quantized: doodle(measureCount, notes),
  }
}

/** Intent: four quarter notes from `offset` (`n0 n4 n8 n12`). */
function quarterNotes(offset: number): [number, number, number][] {
  return [0, 4, 8, 12].map((tick, index) => [offset + tick, 4, 60 + index])
}

/** Intent: a measure from `offset` whose last note starts a sixteenth late (`n0 n4 n8 n14`). */
function lateLastNote(offset: number): [number, number, number][] {
  return [
    [offset, 4, 60],
    [offset + 4, 4, 62],
    [offset + 8, 6, 64],
    [offset + 14, 2, 65],
  ]
}

/**
 * The synthetic doodles of the H1 selection: against `SELECTION_POOL`, a quarter-note measure
 * finds all four bands, a late last note three (no Near), eight eighths one (beyond).
 */
const SELECTION_DOODLES: readonly DoodleFixture[] = [
  fixture('a-plain', false, 1, quarterNotes(0)),
  fixture('b-listen', true, 1, quarterNotes(0)),
  fixture('c-twice', true, 2, [...quarterNotes(0), ...quarterNotes(16)]),
  fixture('e-plain', false, 1, lateLastNote(0)),
  fixture('f-late', true, 2, [[0, 16, 60], ...quarterNotes(16)]),
  fixture('g-solo', true, 1, [[0, 4, 60]]),
  fixture(
    'j-listen',
    true,
    1,
    Array.from({ length: 8 }, (_, index): [number, number, number] => [2 * index, 2, 60]),
  ),
  fixture('k-listen', true, 1, lateLastNote(0)),
]

/** The pool the synthetic selection is scored against. */
const SELECTION_POOL = pool('n0 n4 n8 n12', 'n0 n4 n8 n14', 'n0 n4 n10 n12', 'n2 n6 n10 n14')

/** Intent: every file under a directory, as paths relative to it, sorted. */
function filesUnder(root: string, dir = root): string[] {
  return readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? filesUnder(root, path) : [path.slice(root.length + 1)]
    })
    .sort()
}

/** Intent: run the render script with arguments from the repository root. */
function runScript(args: readonly string[]) {
  return spawnSync('node', ['scripts/render-rhythm-examples.mjs', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
}

describe('a doodle measure as start lists (C5.9) and as heard (C8)', () => {
  it('puts a rest start where each silence begins, the barline closing the last one', () => {
    const steps = doodle(1, [
      [0, 4, 60],
      [4, 4, 62],
      [8, 4, 64],
      [12, 3, 65],
    ])
    expect(startsKey(doodleMeasureStarts(steps, 0))).toBe('n0 n4 n8 n12 r15')
  })

  it('opens with a rest start when the measure opens in silence', () => {
    expect(startsKey(doodleMeasureStarts(doodle(1, [[4, 6, 64]]), 0))).toBe('r0 n4 r10')
  })

  it('reads one measure only; a note held across the barline adds no rest', () => {
    const held = doodle(2, [
      [0, 4, 60],
      [12, 8, 67],
      [20, 2, 64],
    ])
    expect(startsKey(doodleMeasureStarts(held, 0))).toBe('n0 r4 n12')
    expect(doodleMeasurePitches(held, 0)).toEqual([60, 67])
  })

  it('reads a later measure from its barline: a held note starts nothing, a silence restarts', () => {
    const held = doodle(2, [
      [0, 4, 60],
      [12, 8, 67],
      [20, 2, 64],
      [24, 4, 65],
    ])
    expect(startsKey(doodleMeasureStarts(held, 1))).toBe('n4 r6 n8 r12')
    expect(doodleMeasurePitches(held, 1)).toEqual([64, 65])
    const crossing = doodle(2, [
      [0, 4, 60],
      [18, 4, 62],
    ])
    expect(startsKey(doodleMeasureStarts(crossing, 1))).toBe('r0 n2 r6')
    expect(startsKey(doodleMeasureStarts(doodle(2, [[8, 24, 62]]), 1))).toBe('')
  })

  it('drops a rest start right after another rest when read as heard', () => {
    expect(startsKey(asHeard(starts('n0 r2 r4 n8 r12 r14')))).toBe('n0 r2 n8 r12')
  })
})

describe('the band picks', () => {
  const quarters = starts('n0 n4 n8 n12')

  it('picks one measure per band, each truly in its band', () => {
    const picks = pickBands(
      quarters,
      pool('n0 n4 n8 n12', 'n0 n4 n8 n14', 'n0 n4 n10 n12', 'n2 n6 n10 n14'),
      'x',
    )
    expect([...picks.keys()]).toEqual(['Same', 'Close', 'Near', 'beyond'])
    for (const [band, pick] of picks) {
      expect(measureBand(quarters, pick.starts)).toBe(band)
      expect(pick.source).toBe('domain')
    }
  })

  it('prefers the nearest note count to the fewest edits, so beyond is not trivially far', () => {
    const picks = pickBands(quarters, pool('n0 n1 n2 n3 n4 n8 n12', 'n2 n6 n10 n14'), 'x')
    expect(startsKey(picks.get('beyond')!.starts)).toBe('n2 n6 n10 n14')
    expect(picks.get('beyond')!.edits).toBe(4)
  })

  it("stands the doodle's own rhythm in for Same, and leaves an empty band out", () => {
    const picks = pickBands(quarters, pool('n0 n4 n8 n14'), 'x')
    expect(picks.get('Same')).toEqual({
      band: 'Same',
      starts: quarters,
      edits: 0,
      source: 'doodle',
    })
    expect(picks.has('Near')).toBe(false)
    expect(picks.has('beyond')).toBe(false)
  })

  it('reads every measure of every doodle holding at least two note starts', () => {
    expect(
      everyDoodleMeasure(SELECTION_DOODLES).map(
        (measure) => `${measure.doodle.name}-m${measure.measure}`,
      ),
    ).toEqual([
      'a-plain-m1',
      'b-listen-m1',
      'c-twice-m1',
      'c-twice-m2',
      'e-plain-m1',
      'f-late-m2',
      'j-listen-m1',
      'k-listen-m1',
    ])
  })

  it('chooses five measures by bands found, then listening doodles, one per doodle, then name', () => {
    const sets = h1Sets(SELECTION_DOODLES, SELECTION_POOL)
    expect(sets.map((set) => set.folder)).toEqual([
      'set-1-a-plain-m1',
      'set-2-b-listen-m1',
      'set-3-c-twice-m1',
      'set-4-f-late-m2',
      'set-5-k-listen-m1',
    ])
    expect(sets.map((set) => set.missing)).toEqual([[], [], [], [], ['Near']])
    expect(startsKey(sets[3]!.starts)).toBe('n0 n4 n8 n12')
    expect(sets[3]!.line).toEqual([60, 61, 62, 63])
    for (const set of sets) {
      expect(set.candidates.map((candidate) => candidate.letter)).toEqual(
        LETTERS.slice(0, set.candidates.length),
      )
      expect(new Set(set.candidates.map((candidate) => candidate.pick.band)).size).toBe(
        set.candidates.length,
      )
    }
  })

  it('takes measures from distinct doodles of the real doodle set, numbered in name order', () => {
    const sets = h1Sets(loadDoodleSet(), SELECTION_POOL)
    expect(sets.map((set) => set.number)).toEqual([1, 2, 3, 4, 5])
    const names = sets.map((set) => set.doodle.name)
    expect(new Set(names).size).toBe(5)
    expect(names).toEqual([...names].sort())
    for (const set of sets)
      expect(set.folder).toBe(`set-${set.number}-${set.doodle.name}-m${set.measure}`)
  })
})

describe('the H2 locked rhythms and their changes, on the Pop song domain', () => {
  const setting = popSongRhythmSetting()
  const candidates = drainDomain(setting)
  const plan = planChanges(setting, candidates)

  it("reads the Pop song preset's rhythm settings", () => {
    expect(setting).toMatchObject({
      noteDensity: 'Eighth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      tensionArc: 'Lift',
    })
  })

  it('first locks a rhythm offering the most kinds, and each change is one change of its kind', () => {
    const most = Math.max(...changesOffered(candidates).map((offer) => offer.size))
    expect(plan.locks[0]!.changes.size).toBe(most)
    for (const lock of plan.locks)
      for (const [kind, pick] of lock.changes)
        expect(rhythmChangeBetween(lock.locked.bars, pick.candidate.bars)?.kind).toBe(kind)
  })

  it('covers every kind some locked rhythm offers, each once, and reports the rest', () => {
    const covered = plan.locks.flatMap((lock) => [...lock.changes.keys()])
    expect(new Set(covered).size).toBe(covered.length)
    expect([...covered, ...plan.missing].sort()).toEqual([...RHYTHM_CHANGE_KINDS].sort())
    const offeredAnywhere = new Set(
      changesOffered(candidates).flatMap((offer) => [...offer.keys()]),
    )
    expect(plan.missing.filter((kind) => offeredAnywhere.has(kind))).toEqual([])
  })
})

describe('a render file', () => {
  const bytes = renderMidi({
    name: 'Example',
    parts: [
      { kind: 'rhythm', label: 'First', measures: [starts('n0 r2 n4 n8 n12')], line: [60, 62] },
      { kind: 'silence', label: 'Gap', measureCount: 1 },
      { kind: 'rhythm', label: 'Second', measures: [starts('n0 n4')], line: [64] },
    ],
  })
  const smf = readSmf(bytes)

  it('is a type 1 file at 960 ticks per quarter with a conductor, a melody and a click track', () => {
    expect(smf.format).toBe(1)
    expect(smf.division).toBe(960)
    expect(smf.tracks).toHaveLength(3)
    expect(tempoMap(smf.tracks[0]!)).toEqual([{ tick: 0, microsecondsPerQuarter: 666_667 }])
  })

  it('names each part with a marker at its first measure, after the count-in', () => {
    expect(metaTexts(smf.tracks[0]!, 0x06)).toEqual([
      { tick: 0, text: 'Count-in' },
      { tick: MEASURE, text: 'First' },
      { tick: 2 * MEASURE, text: 'Gap' },
      { tick: 3 * MEASURE, text: 'Second' },
    ])
  })

  it('plays each note until the next start, the line note by note, its last pitch repeated', () => {
    const notes = notesOf(smf.tracks[1]!)
    expect(notes.map((note) => note.pitch)).toEqual([60, 62, 62, 62, 64, 64])
    expect(notes.map((note) => note.startTick)).toEqual([
      MEASURE,
      MEASURE + 4 * SIXTEENTH,
      MEASURE + 8 * SIXTEENTH,
      MEASURE + 12 * SIXTEENTH,
      3 * MEASURE,
      3 * MEASURE + 4 * SIXTEENTH,
    ])
    expect(notes[0]!.endTick).toBe(MEASURE + 2 * SIXTEENTH - 20)
    expect(notes.at(-1)!.endTick).toBe(4 * MEASURE - 20)
  })

  it('clicks a side stick on every beat, the count-in included, beat 1 a little louder', () => {
    const clicks = notesOf(smf.tracks[2]!)
    expect(clicks.map((click) => click.startTick)).toEqual(
      Array.from({ length: 16 }, (_, beat) => beat * 960),
    )
    expect(
      clicks.every((click) => click.channel === CLICK_CHANNEL && click.pitch === CLICK_PITCH),
    ).toBe(true)
    expect(clicks[0]!.velocity).toBeGreaterThan(clicks[1]!.velocity)
  })
})

describe('the answers text', () => {
  it("names each set's doodle measure and says why detached playing was left out", () => {
    const answers = h1Answers(h1Sets(SELECTION_DOODLES, SELECTION_POOL))
    expect(answers).toContain(
      '## Set 4: f-late, measure 2\n\nThis set is measure 2 of the doodle `f-late`.',
    )
    expect(answers).toContain(DETACHED_NOTE)
  })

  it('draws a measure as a grid of sixteenths and names places by counting', () => {
    expect(measureGrid(starts('n0 n2 n6 n8 n12 r15'))).toBe('x-x- --x- x--- x--.')
    expect(tickPlace(0)).toBe('beat 1')
    expect(tickPlace(6)).toBe('the "and" of beat 2')
    expect(tickPlace(15)).toBe('the "a" of beat 4')
  })
})

describe('the render script', () => {
  it(
    'writes the same folder as the plan, every MIDI file readable, the answers apart',
    () => {
      const out = join(tempDir(), 'renders')
      const result = runScript(['--out', out])
      expect(result.status, result.stderr).toBe(0)
      const build = buildRenders()
      expect(filesUnder(out)).toEqual(
        ['.rhythm-renders', ...build.outputs.map((output) => output.path)].sort(),
      )
      for (const output of build.outputs) {
        const written = readFileSync(join(out, output.path))
        if (typeof output.content === 'string')
          expect(written.toString('utf8')).toBe(output.content)
        else {
          expect(Buffer.compare(written, Buffer.from(output.content))).toBe(0)
          expect(readSmf(new Uint8Array(written)).tracks).toHaveLength(3)
        }
      }
      expect(filesUnder(out)).toContain('h1-drift/ANSWERS.md')
      expect(readFileSync(join(out, 'README.md'), 'utf8')).not.toMatch(/\| [A-D] \|/)
    },
    SCRIPT_TIMEOUT_MS,
  )

  it('refuses a non-empty folder that is not its own, leaving it untouched', () => {
    const out = tempDir()
    writeFileSync(join(out, 'keep.txt'), 'mine')
    const result = runScript(['--out', out])
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('refusing to write')
    expect(readdirSync(out)).toEqual(['keep.txt'])
  })
})
