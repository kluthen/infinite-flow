// @vitest-environment node
/**
 * The v3.2 doodle set: every doodle's raw capture quantizes to the quantized doodle written by
 * hand in its file (this is how the set joins the quantizer's tests), every computable trait it
 * records holds, and the set as a whole covers what the Jam sweep, the doodle-to-controls
 * mapping's tests and the owner's listening check need: one to four measures, sparse, busy,
 * leaping and one-note doodles, a chord, a grace note, a stray note, last notes inside and outside
 * the keyboard's register windows, the rhythm settings C5.16.1 should read, Jam's tempos, and at
 * least five distinct one-measure listening rhythms. The loader refuses a malformed file.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { quantizeDoodle } from '@/jam/doodle-quantizer'

import { DOODLE_SET_DIR, loadDoodleSet, type DoodleFixture } from './doodle-set'
import { C_KEYBOARD_WINDOWS, computedTraits } from './doodle-traits'

const DOODLES = loadDoodleSet()

/** The fewest doodles whose first measure is a listening rhythm. */
const MIN_LISTENING_MEASURES = 5

/** Intent: the doodles for which a predicate on their traits holds. */
function withTraits(predicate: (doodle: DoodleFixture) => boolean): string[] {
  return DOODLES.filter(predicate).map((doodle) => doodle.name)
}

/** Intent: the rhythm of a doodle's first measure: each note's start and length, as text. */
function firstMeasureRhythm(doodle: DoodleFixture): string {
  return doodle.quantized.notes
    .filter((note) => note.startTick < 16)
    .map((note) => `${note.startTick}+${note.lengthTicks}`)
    .join(' ')
}

describe('the v3.2 doodle set', () => {
  it('holds about twelve doodles, each hand-written or recorded on the Travel Sax', () => {
    expect(DOODLES.length).toBeGreaterThanOrEqual(12)
    for (const doodle of DOODLES) expect(['hand-written', 'travel-sax']).toContain(doodle.source)
  })

  describe.each(DOODLES.map((doodle) => [doodle.name, doodle] as const))('%s', (_, doodle) => {
    it('quantizes to the quantized doodle written in its file', () => {
      expect(quantizeDoodle(doodle.capture)).toEqual(doodle.quantized)
    })

    it('records its computable traits', () => {
      const computed = computedTraits(doodle.capture, doodle.quantized)
      const { traits } = doodle
      expect({
        measureCount: traits.measureCount,
        noteCount: traits.noteCount,
        leaping: traits.leaping,
        oneNote: traits.oneNote,
        chord: traits.chord,
        graceNote: traits.graceNote,
        strayNote: traits.strayNote,
        lastNote: traits.lastNote,
        noteDensity: traits.aimedAt.noteDensity,
      }).toEqual(computed)
    })
  })
})

describe('what the doodle set covers', () => {
  it('spans one, two, three and four measures', () => {
    const counts = new Set(DOODLES.map((doodle) => doodle.traits.measureCount))
    expect([...counts].sort()).toEqual([1, 2, 3, 4])
  })

  it('holds sparse, busy, leaping and one-note doodles', () => {
    expect(withTraits((doodle) => doodle.traits.density === 'sparse')).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.density === 'busy')).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.leaping)).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.oneNote)).not.toEqual([])
  })

  it('holds a chord, a dropped grace note and a very short stray note', () => {
    expect(withTraits((doodle) => doodle.traits.chord)).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.graceNote)).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.strayNote)).not.toEqual([])
  })

  it('ends inside the keyboard register windows, and outside them and the range', () => {
    expect(withTraits((doodle) => doodle.traits.lastNote === 'inside-windows')).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.lastNote !== 'inside-windows')).not.toEqual([])
    expect(withTraits((doodle) => doodle.traits.lastNote === 'outside-range')).not.toEqual([])
  })

  it('has no last note outside the windows but inside the range: the keyboard windows cover it', () => {
    const covered = new Set(
      C_KEYBOARD_WINDOWS.flatMap(({ window }) =>
        Array.from({ length: window.maxMidi - window.minMidi + 1 }, (_, i) => window.minMidi + i),
      ),
    )
    const { minMidi, maxMidi } = C_KEYBOARD_PROFILE.concertRange
    expect(covered.size).toBe(maxMidi - minMidi + 1)
    expect(Math.min(...covered)).toBe(minMidi)
  })

  it('aims at the rhythm settings C5.16.1 should read', () => {
    /** Intent: the doodles aimed at one note density, syncopation and silence density. */
    const aimed = (density: string, syncopation: string, silence: string): string[] =>
      withTraits(({ traits: { aimedAt } }) => {
        return (
          aimedAt.noteDensity === density &&
          aimedAt.syncopation === syncopation &&
          aimedAt.silenceDensity === silence
        )
      })
    expect(aimed('Quarter', 'Straight', 'Sparse')).not.toEqual([])
    expect(aimed('Eighth', 'Occasional offbeats', 'Conversational')).not.toEqual([])
    expect(aimed('Sixteenth', 'Active displacement', 'Breath-heavy')).not.toEqual([])
    const heavilyVaried = withTraits(
      (doodle) => doodle.traits.aimedAt.rhythmicVariety === 'Heavily varied',
    )
    expect(heavilyVaried).not.toEqual([])
  })

  it("is played at Jam's sweep tempos, 60, 120 and 180 BPM, and at 90 or 150 BPM", () => {
    const tempos = new Set(DOODLES.map((doodle) => doodle.capture.tempoBpm))
    for (const tempo of [60, 120, 180]) expect(tempos).toContain(tempo)
    expect(tempos.has(90) || tempos.has(150)).toBe(true)
  })

  it('places every hand-written grid origin away from zero, as a real audio clock would', () => {
    for (const doodle of DOODLES.filter((each) => each.source === 'hand-written')) {
      expect(doodle.capture.gridOriginAt, doodle.name).toBeGreaterThan(0)
    }
  })

  it('offers at least five listening measures, each a different one-measure rhythm', () => {
    const listening = DOODLES.filter((doodle) => doodle.traits.listeningMeasure)
    expect(listening.length).toBeGreaterThanOrEqual(MIN_LISTENING_MEASURES)
    const rhythms = listening.map(firstMeasureRhythm)
    expect(new Set(rhythms).size).toBe(rhythms.length)
  })
})

describe('the doodle set loader', () => {
  let directory: string | null = null

  /** Intent: a scratch directory holding one copy of a real doodle file, changed by `edit`. */
  function scratchSet(edit: (fixture: Record<string, unknown>) => void): string {
    directory = mkdtempSync(join(tmpdir(), 'doodle-set-'))
    const fixture = JSON.parse(
      readFileSync(join(DOODLE_SET_DIR, 'one-note.json'), 'utf8'),
    ) as Record<string, unknown>
    edit(fixture)
    writeFileSync(join(directory, 'one-note.json'), JSON.stringify(fixture))
    return directory
  }

  afterEach(() => {
    if (directory !== null) rmSync(directory, { recursive: true })
    directory = null
  })

  it('reads a well-formed file', () => {
    expect(loadDoodleSet(scratchSet(() => {}))).toHaveLength(1)
  })

  it('crashes, naming the file, on an unknown field', () => {
    const dir = scratchSet((fixture) => {
      fixture.tempo = 120
    })
    expect(() => loadDoodleSet(dir)).toThrow('one-note.json has an unknown field "tempo"')
  })

  it('crashes on a source other than hand-written or travel-sax', () => {
    const dir = scratchSet((fixture) => {
      fixture.source = 'microphone'
    })
    expect(() => loadDoodleSet(dir)).toThrow('one-note.json.source must be one of')
  })

  it('asks for the hand-judged traits when one is still null', () => {
    const dir = scratchSet((fixture) => {
      ;(fixture.traits as Record<string, unknown>).density = null
    })
    expect(() => loadDoodleSet(dir)).toThrow('fill the hand-judged traits')
  })

  it('crashes on a quantized doodle the app would refuse', () => {
    const dir = scratchSet((fixture) => {
      fixture.quantized = { measureCount: 5, notes: [] }
    })
    expect(() => loadDoodleSet(dir)).toThrow('one-note.json.quantized')
  })

  it('crashes when the name does not match the file name', () => {
    const dir = scratchSet((fixture) => {
      fixture.name = 'another-name'
    })
    expect(() => loadDoodleSet(dir)).toThrow('must match the file name')
  })
})
