/**
 * The doodle as a Jam's review engraves it: a four-measure written phrase whose first measures are
 * the doodle's, spelled in the written key and collection the Jam started with, for the session's
 * instrument (a B-flat instrument writes its written pitch) and clef, its later measures a whole
 * rest each and no chord symbol anywhere; a note crossing a barline becomes a tie. Then each drawn
 * system is cut at the doodle's last barline in it, on SVGs sized as the engraver sizes them, and
 * the note identities the engraver tagged are removed.
 */
import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import type {
  WrittenEvent,
  WrittenMeasure,
  WrittenNote,
} from '@/domain/notation/written-phrase-types'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { BuiltInInstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { makeSeed } from '@/domain/random/seed'
import {
  cutSystemsAtDoodleEnd,
  doodleEngravingContext,
  doodleMeasureAnchors,
  doodleWrittenPhrase,
} from '@/jam/doodle-engraving'
import type { MeasureAnchors } from '@/notation/engraving-anchors'
import type { ReviewedPhrase } from '@/session/session-history'
import { doodleOf, legatoDoodle } from './doodle-builders'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Intent: phrase 1's record as the doodle reads it: its intent for a written key, and its clef. */
function phraseOne(
  tonalCenter: PitchClass,
  collection: Collection,
  instrumentProfileId: BuiltInInstrumentProfileId,
  clef: InstrumentClef = 'treble',
): Pick<ReviewedPhrase, 'intent' | 'clef'> {
  const intent = createGenerationIntent({
    requestId: makeRequestId('phrase-1'),
    seed: makeSeed(1),
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter,
      collection,
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId,
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
  return { intent, clef }
}

const G_MAJOR_KEYBOARD = doodleEngravingContext(phraseOne('G', 'Major', 'c-keyboard'))

/** Intent: whether a measure is one whole rest, as a measure after the doodle is. */
function isWholeRest(measure: WrittenMeasure): boolean {
  const [only, ...others] = measure.events
  return (
    others.length === 0 &&
    only !== undefined &&
    only.kind === 'rest' &&
    only.duration.value === 'whole' &&
    only.duration.ticks === 16
  )
}

/** Intent: the note glyphs of a measure. */
function notesOf(measure: WrittenMeasure): WrittenNote[] {
  return measure.events.filter((event: WrittenEvent): event is WrittenNote => event.kind === 'note')
}

// @test-link [[rule_review_opens_with_doodle]]
describe('doodleWrittenPhrase', () => {
  // @test-link [[rule_review_opens_with_doodle]]
  it('writes a doodle of one, two or four measures as four measures, whole rests after it', () => {
    const cases: readonly DoodleMeasureCount[] = [1, 2, 4]
    for (const measureCount of cases) {
      const starts = Array.from({ length: measureCount * 4 }, (_, beat) => beat * 4)
      const doodle = legatoDoodle(
        measureCount,
        starts,
        [60, 62, 64, 65].flatMap((p) => [p, p]),
      )

      const phrase = doodleWrittenPhrase(doodle, G_MAJOR_KEYBOARD)

      expect(phrase.measures, `${measureCount} measures`).toHaveLength(4)
      phrase.measures.forEach((measure, index) => {
        const label = `${measureCount}-measure doodle, measure ${index + 1}`
        expect(measure.chords, label).toEqual([])
        if (index < measureCount) {
          expect(
            notesOf(measure).map((note) => note.startTick),
            label,
          ).toEqual([0, 4, 8, 12])
        } else {
          expect(isWholeRest(measure), label).toBe(true)
        }
      })
    }
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('fills the gaps of a measure with rests and keeps each note where it was played', () => {
    const doodle = doodleOf(2, [
      [2, 2, 60],
      [8, 4, 62],
      [20, 4, 64],
    ])

    const phrase = doodleWrittenPhrase(doodle, G_MAJOR_KEYBOARD)

    const [first, second] = phrase.measures
    expect(notesOf(first!).map((note) => [note.startTick, note.duration.ticks])).toEqual([
      [2, 2],
      [8, 4],
    ])
    expect(first!.events.some((event) => event.kind === 'rest' && event.startTick === 0)).toBe(true)
    expect(notesOf(second!).map((note) => [note.startTick, note.duration.ticks])).toEqual([[4, 4]])
    expect(isWholeRest(phrase.measures[2]!)).toBe(true)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('writes a note crossing a barline as two notes tied over it', () => {
    const doodle = doodleOf(2, [
      [0, 12, 60],
      [12, 8, 62],
      [20, 12, 64],
    ])

    const phrase = doodleWrittenPhrase(doodle, G_MAJOR_KEYBOARD)

    const last = notesOf(phrase.measures[0]!).at(-1)!
    const next = notesOf(phrase.measures[1]!)[0]!
    expect(last).toMatchObject({ startTick: 12, tieToNext: true })
    expect(next).toMatchObject({ startTick: 0, tieFromPrevious: true })
    expect(next.pitch).toEqual(last.pitch)
    expect(notesOf(phrase.measures[0]!)[0]!.tieFromPrevious).toBe(false)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it("carries the key signature of the Jam's written key and collection, G major: one sharp", () => {
    const phrase = doodleWrittenPhrase(doodleOf(1, [[0, 4, 66]]), G_MAJOR_KEYBOARD)

    expect(phrase.key.signature).toMatchObject({ accidental: 'sharp', count: 1, letters: ['F'] })
    expect(phrase.clef).toBe('treble')
    // F♯4, concert 66, is in the key: no accidental is drawn beside it.
    expect(notesOf(phrase.measures[0]!)[0]).toMatchObject({
      pitch: { letter: 'F', alter: 1, octave: 4 },
      accidental: null,
    })
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it("writes a B-flat instrument's written pitch, a major ninth above the concert pitch played", () => {
    const context = doodleEngravingContext(phraseOne('G', 'Major', 'bb-tenor'))

    // Concert F4 (65) is the B-flat tenor's written G5, in its written key, G major.
    const phrase = doodleWrittenPhrase(doodleOf(1, [[0, 4, 65]]), context)

    expect(phrase.key.signature).toMatchObject({ accidental: 'sharp', count: 1 })
    expect(notesOf(phrase.measures[0]!)[0]!.pitch).toEqual({ letter: 'G', alter: 0, octave: 5 })
  })
})

// @test-link [[rule_review_opens_with_doodle]]
describe('doodleEngravingContext', () => {
  // @test-link [[rule_review_opens_with_doodle]]
  it("takes the written key, collection, instrument and clef from phrase 1's record", () => {
    const record = phraseOne('D', 'Dorian', 'bb-tenor', 'bass')

    const context = doodleEngravingContext(record)

    expect(context).toEqual({
      tonalCenter: 'D',
      collection: 'Dorian',
      transposition: record.intent.instrumentProfile.transposition,
      concertRange: record.intent.instrumentProfile.concertRange,
      clef: 'bass',
    })
    // The concert tonal center the generator read is not the written one on a B-flat instrument.
    expect(record.intent.controls.tonalCenter).not.toBe('D')
  })
})

/** Anchors of a split engraving: measures 1–2 on system 0, 3–4 on system 1, 200 px each. */
const SPLIT_ANCHORS: readonly MeasureAnchors[] = [0, 1, 2, 3].map((measureIndex) => ({
  measureIndex,
  systemIndex: measureIndex < 2 ? 0 : 1,
  eventStartsPx: [(measureIndex % 2) * 200 + 30],
  barlinePx: (measureIndex % 2) * 200 + 220,
}))

/** Anchors of a one-system engraving: four measures of 200 px from 20 px. */
const WHOLE_ANCHORS: readonly MeasureAnchors[] = [0, 1, 2, 3].map((measureIndex) => ({
  measureIndex,
  systemIndex: 0,
  eventStartsPx: [measureIndex * 200 + 30],
  barlinePx: measureIndex * 200 + 220,
}))

/**
 * Intent: a system SVG sized as the engraver sizes it (its width in CSS px, a viewBox in engraving
 * units from 0 0, here twice as many units as px), drawing a stave and two tagged noteheads.
 */
function systemSvg(widthPx: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', String(widthPx))
  svg.setAttribute('viewBox', `0 0 ${widthPx * 2} 300`)
  const stave = document.createElementNS(SVG_NS, 'path')
  stave.setAttribute('class', 'stave')
  const slot = document.createElementNS(SVG_NS, 'g')
  for (const id of ['1:0:0', '1:1:0']) {
    const head = document.createElementNS(SVG_NS, 'path')
    head.setAttribute('data-note-id', id)
    head.setAttribute('data-note-part', 'notehead')
    slot.append(head)
  }
  svg.append(stave, slot)
  return svg
}

/** Intent: the right edge of an SVG's doodle clip, in engraving units. */
function clipEndUnits(svg: SVGSVGElement): number {
  const group = svg.querySelector(':scope > g[clip-path]')
  const id = /^url\(#(.+)\)$/u.exec(group?.getAttribute('clip-path') ?? '')?.[1]
  const rect = svg.querySelector(`clipPath[id="${id}"] > rect`)
  if (rect === null) throw new Error('The SVG holds no doodle clip.')
  return Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))
}

// @test-link [[rule_review_opens_with_doodle]]
describe('cutSystemsAtDoodleEnd', () => {
  // @test-link [[rule_review_opens_with_doodle]]
  it("cuts a one-system drawing at the doodle's last barline, in engraving units", () => {
    const svg = systemSvg(860)

    cutSystemsAtDoodleEnd([svg], WHOLE_ANCHORS, 2)

    // Measure 2's barline is at 420 px; the viewBox holds two units per px.
    expect(clipEndUnits(svg)).toBe(840)
    const drawing = svg.querySelector(':scope > g[clip-path]')!
    expect(drawing.querySelector('path.stave')).not.toBeNull()
    expect(Array.from(svg.children).map((child) => child.localName)).toEqual(['defs', 'g'])
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it("cuts each split system at the doodle's last barline in it, each with its own clip", () => {
    const top = systemSvg(430)
    const bottom = systemSvg(430)

    cutSystemsAtDoodleEnd([top, bottom], SPLIT_ANCHORS, 3)

    expect(clipEndUnits(top)).toBe(840)
    expect(clipEndUnits(bottom)).toBe(440)
    const ids = [top, bottom].map((svg) => svg.querySelector('clipPath')!.getAttribute('id'))
    expect(new Set(ids).size).toBe(2)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('removes the note identities the engraver tagged the doodle with', () => {
    const svg = systemSvg(860)

    cutSystemsAtDoodleEnd([svg], WHOLE_ANCHORS, 4)

    expect(svg.querySelectorAll('[data-note-id], [data-note-part]')).toHaveLength(0)
    expect(svg.querySelectorAll('path')).toHaveLength(3)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it("keeps one measure slot per doodle measure, the whole rests' slots after it removed", () => {
    const svg = systemSvg(860)
    for (const index of [0, 1, 2, 3]) {
      const slot = document.createElementNS(SVG_NS, 'g')
      slot.setAttribute('class', 'measure-slot')
      slot.setAttribute('data-measure-index', String(index))
      svg.append(slot)
    }

    cutSystemsAtDoodleEnd([svg], WHOLE_ANCHORS, 2)

    const kept = Array.from(svg.querySelectorAll('g.measure-slot'))
    expect(kept.map((slot) => slot.getAttribute('data-measure-index'))).toEqual(['0', '1'])
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('refuses a system that holds none of the doodle', () => {
    expect(() => cutSystemsAtDoodleEnd([systemSvg(430), systemSvg(430)], SPLIT_ANCHORS, 2)).toThrow(
      /system 1 holds none of the doodle/u,
    )
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('refuses a system SVG without a usable viewBox or width', () => {
    const noViewBox = systemSvg(860)
    noViewBox.removeAttribute('viewBox')
    const noWidth = systemSvg(860)
    noWidth.removeAttribute('width')

    expect(() => cutSystemsAtDoodleEnd([noViewBox], WHOLE_ANCHORS, 1)).toThrow(/viewBox/u)
    expect(() => cutSystemsAtDoodleEnd([noWidth], WHOLE_ANCHORS, 1)).toThrow(/width/u)
  })
})

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe('doodleMeasureAnchors', () => {
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("keeps the anchors of the doodle's own measures only, in order", () => {
    expect(doodleMeasureAnchors(SPLIT_ANCHORS, 1)).toEqual([SPLIT_ANCHORS[0]])
    expect(doodleMeasureAnchors(SPLIT_ANCHORS, 3)).toEqual(SPLIT_ANCHORS.slice(0, 3))
    expect(doodleMeasureAnchors(WHOLE_ANCHORS, 4)).toEqual(WHOLE_ANCHORS)
  })
})
