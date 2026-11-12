// @vitest-environment node
/**
 * The seventh-ending renders (v3.3 listening check L1): the note moves on hand-built phrases with
 * seventh-form chords (the nearest seventh inside the window, a tied final note moved whole, every
 * other note kept), the moves the spec does not allow refused, the hand-built demonstration's MIDI
 * files read back (each phrase as generated, then altered, over the backing), and the script
 * writing them into its own folder only.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { notesOf, readSmf } from '../export/midi/smf-reader'
import { chordPlan } from '../domain/harmony/seventh-chord-fixtures'
import { buildSeventhEndingRenders, demonstrationSources, noteName } from './seventh-endings-plan'
import {
  endingOnSeventh,
  landingOnSeventh,
  nearestOfPitchClass,
  type RenderPhrase,
} from './seventh-endings-rewrite'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const WINDOW = { minMidi: 55, maxMidi: 79 }
const QUARTER = makeRational(1, 4)

/** One quarter-note event: a note at `midi` (tied on from the one before when `tied`), or a rest. */
type Quarter = number | 'rest' | readonly [number, 'tied']

/** Intent: a four-measure timeline of quarter notes, sixteen entries. */
function quarters(entries: readonly Quarter[]): RenderPhrase['timeline'] {
  const events = entries.map((entry) =>
    entry === 'rest'
      ? makeRestEvent({ duration: QUARTER })
      : makeNoteEvent({
          duration: QUARTER,
          pitch: makeConcertPitch(typeof entry === 'number' ? entry : entry[0]),
          tieContinuation: typeof entry !== 'number',
        }),
  )
  return makeConcertEventTimeline(
    [0, 1, 2, 3].map((index) => makeMeasure(index, events.slice(index * 4, index * 4 + 4))),
  )
}

/** C major: C for two bars, Fmaj7 for one, G7 for the last. */
const ENDING_PLAN = chordPlan([
  { degree: 1, beat: 0, beats: 8 },
  { degree: 4, beat: 8, beats: 4, seventh: true },
  { degree: 5, beat: 12, beats: 4, seventh: true },
])

/** Bars 1-3 on C E G, the last bar E D then G held over two quarters (a tie). */
const ENDING_NOTES: readonly Quarter[] = [
  ...[60, 64, 67, 64, 60, 64, 67, 64, 65, 69, 72, 69],
  64,
  62,
  67,
  [67, 'tied'],
]

/** Intent: a hand-built phrase at 90 BPM in the test window. */
function phrase(notes: readonly Quarter[], harmony: RenderPhrase['harmony']): RenderPhrase {
  return { timeline: quarters(notes), harmony, window: WINDOW, tempo: 90 }
}

/** Intent: the attack MIDIs of a timeline, tie continuations included. */
function pitches(timeline: RenderPhrase['timeline']): readonly number[] {
  return timeline.measures.flatMap((measure) =>
    measure.events.flatMap((event) => (event.kind === 'note' ? [event.pitch as number] : [])),
  )
}

describe('the note moves onto a seventh', () => {
  it('picks the nearest pitch of the class inside the window, the lower at equal distance', () => {
    expect(nearestOfPitchClass(5, 67, WINDOW)).toBe(65)
    expect(nearestOfPitchClass(8, 62, WINDOW)).toBe(56)
    expect(() => nearestOfPitchClass(1, 60, { minMidi: 62, maxMidi: 72 })).toThrow(/no pitch/)
  })

  it('moves a tied final note whole onto the final chord seventh, keeping every other note', () => {
    const source = phrase(ENDING_NOTES, ENDING_PLAN)
    const { phrase: moved, moved: note } = endingOnSeventh(source)
    expect(note).toEqual({ beat: 14, from: 67, to: 65 })
    expect(pitches(moved.timeline)).toEqual([...pitches(source.timeline).slice(0, 14), 65, 65])
    expect(moved.harmony).toBe(source.harmony)
  })

  it('moves the first note of a next phrase onto the tonic chord seventh', () => {
    const plan = chordPlan([
      { degree: 1, beat: 0, beats: 4, seventh: true },
      { degree: 5, beat: 4, beats: 12 },
    ])
    const { phrase: moved, moved: note } = landingOnSeventh(phrase(ENDING_NOTES, plan))
    expect(note).toEqual({ beat: 0, from: 60, to: 59 })
    expect(pitches(moved.timeline).slice(0, 2)).toEqual([59, 64])
  })

  it('refuses the moves the spec does not ask to hear', () => {
    const triadEnding = chordPlan([
      { degree: 1, beat: 0, beats: 12 },
      { degree: 5, beat: 12, beats: 4 },
    ])
    expect(() => endingOnSeventh(phrase(ENDING_NOTES, triadEnding))).toThrow(/triad/)
    const restAtEnd = [...ENDING_NOTES.slice(0, 11), 69, 'rest', 'rest', 'rest', 'rest'] as const
    expect(() => endingOnSeventh(phrase(restAtEnd, ENDING_PLAN))).toThrow(/does not sound under/)
    const onSeventh = [...ENDING_NOTES.slice(0, 15), 65] as const
    expect(() => endingOnSeventh(phrase(onSeventh, ENDING_PLAN))).toThrow(/already/)
    expect(() => landingOnSeventh(phrase(ENDING_NOTES, ENDING_PLAN.slice(1)))).toThrow()
    const opensOnFive = chordPlan([
      { degree: 5, beat: 0, beats: 4, seventh: true },
      { degree: 1, beat: 4, beats: 12 },
    ])
    expect(() => landingOnSeventh(phrase(ENDING_NOTES, opensOnFive))).toThrow(/not the tonic/)
  })
})

describe('the hand-built demonstration renders', () => {
  it('writes an ending and a landing file over the backing, each altered phrase after its original', () => {
    const { outputs, summaries } = buildSeventhEndingRenders(demonstrationSources())
    expect(outputs.map((output) => output.path)).toEqual([
      '01-ending-demo-c-major-ending.mid',
      '02-landing-demo-c-major-landing.mid',
      'README.md',
    ])
    for (const [index, output] of outputs.slice(0, 2).entries()) {
      const file = readSmf(output.content as Uint8Array)
      expect(file.tracks).toHaveLength(3)
      const line = notesOf(file.tracks[1]!).map((note) => note.pitch)
      const backing = notesOf(file.tracks[2]!)
      expect(backing.length).toBeGreaterThan(0)
      const half = line.length / 2
      const [original, altered] = [line.slice(0, half), line.slice(half)]
      const { from, to } = summaries[index]!.moved
      expect(altered.filter((pitch, at) => pitch !== original[at])).toEqual(
        altered.filter((pitch, at) => pitch !== original[at]).map(() => to),
      )
      expect(original).toContain(from)
      expect(altered).not.toEqual(original)
    }
    expect(summaries.map(({ moved }) => moved.to % 12)).toEqual([5, 11])
    const index = outputs[2]!.content as string
    expect(index).toContain(`from ${noteName(summaries[0]!.moved.from)} to F`)
  })
})

describe('the render script', () => {
  const folders: string[] = []
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
  })

  /** Intent: run the script with some arguments from the repository root. */
  function runScript(args: readonly string[]): ReturnType<typeof spawnSync> {
    return spawnSync('node', ['scripts/render-seventh-endings.mjs', ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
  }

  it('writes the demonstration into its own folder and refuses any other non-empty one', () => {
    const out = mkdtempSync(join(tmpdir(), 'seventh-endings-'))
    folders.push(out)
    const run = runScript(['--out', out])
    expect(run.status, String(run.stderr)).toBe(0)
    expect(readdirSync(out).sort()).toEqual([
      '.seventh-endings',
      '01-ending-demo-c-major-ending.mid',
      '02-landing-demo-c-major-landing.mid',
      'README.md',
    ])
    expect(readFileSync(join(out, 'README.md'), 'utf8')).toContain('# Seventh-ending renders')
    const other = mkdtempSync(join(tmpdir(), 'seventh-endings-other-'))
    folders.push(other)
    writeFileSync(join(other, 'keep.txt'), 'mine')
    const refused = runScript(['--out', other])
    expect(refused.status).not.toBe(0)
    expect(readdirSync(other)).toEqual(['keep.txt'])
  })
})
