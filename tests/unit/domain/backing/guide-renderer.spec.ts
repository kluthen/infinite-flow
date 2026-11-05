/**
 * The guide renderer: the melody guide plays a phrase's attacks at concert pitch with their tied
 * lengths, the rhythm guide the same starts and lengths on the root of the chord holding each
 * start, in C4-B4. Checked on generated phrases for two instruments and on hand-built phrases for
 * the shapes the generator does not write (a tie across a barline, triplets); malformed ties and
 * harmony that does not hold a start are rejected.
 */

import { describe, expect, it } from 'vitest'

import {
  GuideRenderError,
  RHYTHM_GUIDE_REGISTER,
  renderGuide,
  type GuideNote,
} from '@/domain/backing/guide-renderer'
import { deriveExpectedNotes } from '@/domain/acknowledgement/expected-note'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { makeSeed } from '@/domain/random/seed'
import { addRational, makeRational, type Rational } from '@/domain/time/rational'
import { phraseFromBars } from '../acknowledgement/acknowledgement-fixtures'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }
const A_MINOR: DiatonicTriad = { degree: 6, pitchClasses: [9, 0, 4], quality: 'minor' }
const B_DIMINISHED: DiatonicTriad = { degree: 7, pitchClasses: [11, 2, 5], quality: 'diminished' }

/** Intent: a hand-built harmony event; role, template and bar roles do not affect the guides. */
function event(
  barIndex: 0 | 1 | 2 | 3,
  startBeat: 0 | 2,
  durationBeats: number,
  triad: DiatonicTriad,
): HarmonyEvent {
  return {
    barIndex,
    startBeat,
    durationBeats,
    triad,
    role: 'tonic',
    templateId: 'test',
    barRoles: [],
  }
}

/** One chord for the whole phrase. */
const ONE_CHORD: readonly HarmonyEvent[] = [event(0, 0, 16, C_MAJOR)]

/** Intent: a guide note from a MIDI pitch and a start and length as whole-note fractions. */
function guideNote(
  pitch: number,
  [startN, startD]: readonly [number, number],
  [lengthN, lengthD]: readonly [number, number],
): GuideNote {
  return {
    pitch: makeConcertPitch(pitch),
    start: makeRational(startN, startD),
    duration: makeRational(lengthN, lengthD),
  }
}

/** Intent: a note event of `length` whole notes, fresh or a tie continuation. */
function noteOf(pitch: number, length: Rational, tieContinuation = false): MeasureEvent {
  return makeNoteEvent({ duration: length, pitch: makeConcertPitch(pitch), tieContinuation })
}

/** Intent: a rest event of `length` whole notes. */
function restOf(length: Rational): MeasureEvent {
  return makeRestEvent({ duration: length })
}

/** Intent: a four-measure timeline from each measure's events. */
function timelineOf(
  bars: readonly [MeasureEvent[], MeasureEvent[], MeasureEvent[], MeasureEvent[]],
): ConcertEventTimeline {
  return makeConcertEventTimeline(bars.map((events, index) => makeMeasure(index, events)))
}

/** Intent: what `run` throws, or undefined when it returns. */
function thrownBy(run: () => unknown): unknown {
  try {
    run()
    return undefined
  } catch (error) {
    return error
  }
}

const WHOLE = makeRational(1, 1)
const HALF = makeRational(1, 2)
const QUARTER = makeRational(1, 4)
const EIGHTH_TRIPLET = makeRational(1, 12)
const SIXTEENTH_TRIPLET = makeRational(1, 24)

/** A generated phrase and its harmony. */
interface GeneratedPhrase {
  readonly timeline: ConcertEventTimeline
  readonly harmony: readonly HarmonyEvent[]
}

const GENERATED_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8] as const
const INSTRUMENTS = ['c-keyboard', 'eb-alto'] as const

/**
 * Intent: one real phrase with displaced rhythms and some silence, so it holds ties, rests and
 * offbeat eighths, for an instrument and a seed.
 */
function generated(
  instrumentProfileId: (typeof INSTRUMENTS)[number],
  seed: number,
): GeneratedPhrase {
  const outcome = generatePhrase(
    createGenerationIntent({
      requestId: makeRequestId(`guide-${instrumentProfileId}-${seed}`),
      seed: makeSeed(seed),
      controls: makeGenerationControls({
        ...DEFAULT_GENERATION_CONTROLS,
        instrumentProfileId,
        noteDensity: 'Eighth',
        syncopation: 'Active displacement',
        silenceDensity: 'Conversational',
      }),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
    }),
  )
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Fixture setup: ${instrumentProfileId} seed ${seed} gave ${outcome.kind}.`)
  }
  return { timeline: outcome.result.timeline, harmony: outcome.provenance.harmony.events }
}

/** The rhythmic shapes a phrase holds. */
interface PhraseShapes {
  readonly tie: boolean
  readonly tieAcrossBarline: boolean
  readonly rest: boolean
  readonly offbeatEighth: boolean
}

/** Intent: which shapes a timeline holds; an offbeat eighth is an attack on an eighth's "and". */
function shapesOf(timeline: ConcertEventTimeline): PhraseShapes {
  let position = makeRational(0, 1)
  let tie = false
  let tieAcrossBarline = false
  let rest = false
  let offbeatEighth = false
  for (const measure of timeline.measures) {
    measure.events.forEach((measureEvent, index) => {
      if (measureEvent.kind === 'rest') rest = true
      else if (measureEvent.tieContinuation) {
        tie = true
        if (index === 0) tieAcrossBarline = true
      } else if (position.denominator === 8) offbeatEighth = true
      position = addRational(position, measureEvent.duration)
    })
  }
  return { tie, tieAcrossBarline, rest, offbeatEighth }
}

/** Intent: a whole-note position as quarter beats, exact on the generator's sixteenth grid. */
function beatsOf(time: Rational): number {
  return (time.numerator * 4) / time.denominator
}

/** Intent: the harmony event whose span holds `beat`, read straight off the events. */
function eventHolding(harmony: readonly HarmonyEvent[], beat: number): HarmonyEvent {
  const holding = harmony.find((candidate) => {
    const start = candidate.barIndex * 4 + candidate.startBeat
    return start <= beat && beat < start + candidate.durationBeats
  })
  if (holding === undefined) throw new Error(`Test setup: no harmony event holds beat ${beat}.`)
  return holding
}

/**
 * Intent: check one phrase's guides against acknowledgement's expected notes (at 240 BPM a whole
 * note lasts one second, so onsets and ends are the whole-note positions) and its harmony.
 */
function expectGuidesFollow(phrase: GeneratedPhrase): void {
  const guide = renderGuide(phrase.timeline, phrase.harmony)
  const expected = deriveExpectedNotes(phrase.timeline, {
    phraseNumber: 1,
    startSeconds: 0,
    tempoBpm: 240,
  })
  expect(guide.melody).toHaveLength(expected.length)
  guide.melody.forEach((note, index) => {
    const attack = expected[index]!
    expect(note.pitch).toBe(attack.pitch)
    expect(note.start.numerator / note.start.denominator).toBe(attack.onsetSeconds)
    const end = addRational(note.start, note.duration)
    expect(end.numerator / end.denominator).toBe(attack.soundingEndSeconds)
  })
  expect(guide.rhythm).toHaveLength(guide.melody.length)
  guide.rhythm.forEach((note, index) => {
    const melodyNote = guide.melody[index]!
    expect(note.start).toEqual(melodyNote.start)
    expect(note.duration).toEqual(melodyNote.duration)
    const root = eventHolding(phrase.harmony, beatsOf(note.start)).triad.pitchClasses[0]
    expect(note.pitch).toBe(60 + root)
    expect(note.pitch).toBeGreaterThanOrEqual(RHYTHM_GUIDE_REGISTER.lowest)
    expect(note.pitch).toBeLessThanOrEqual(RHYTHM_GUIDE_REGISTER.highest)
  })
}

// @test-link [[rule_melody_guide_notes]]
// @test-link [[rule_rhythm_guide_notes]]
describe.each(INSTRUMENTS)('the guides of generated phrases for %s', (instrumentProfileId) => {
  const phrases = GENERATED_SEEDS.map((seed) => generated(instrumentProfileId, seed))

  // @test-link [[rule_melody_guide_notes]]
  // @test-link [[rule_rhythm_guide_notes]]
  it('includes a phrase holding a tie, a rest and an offbeat eighth', () => {
    const shaped = phrases.filter((phrase) => {
      const shapes = shapesOf(phrase.timeline)
      return shapes.tie && shapes.rest && shapes.offbeatEighth
    })
    expect(shaped.length).toBeGreaterThan(0)
  })

  // @test-link [[rule_melody_guide_notes]]
  // @test-link [[rule_rhythm_guide_notes]]
  it.each(GENERATED_SEEDS.map((seed, index) => [seed, index] as const))(
    'plays seed %s: the attacks at concert pitch, tied lengths, roots in C4-B4',
    (_seed, index) => {
      expectGuidesFollow(phrases[index]!)
    },
  )
})

// @test-link [[rule_melody_guide_notes]]
describe('the melody guide on hand-built phrases', () => {
  // @test-link [[rule_melody_guide_notes]]
  it('sounds a note tied across a barline once, for its whole tied length', () => {
    const timeline = phraseFromBars(['h h', '~:q q h', 'w', 'w'], [60, 64, 67, 65, 62, 60])
    expect(shapesOf(timeline).tieAcrossBarline).toBe(true)
    expect(renderGuide(timeline, ONE_CHORD).melody).toEqual([
      guideNote(60, [0, 1], [1, 2]),
      guideNote(64, [1, 2], [3, 4]),
      guideNote(67, [5, 4], [1, 4]),
      guideNote(65, [3, 2], [1, 2]),
      guideNote(62, [2, 1], [1, 1]),
      guideNote(60, [3, 1], [1, 1]),
    ])
  })

  // @test-link [[rule_melody_guide_notes]]
  it('starts no note in a rest, and the note before the rest keeps its own length', () => {
    const timeline = phraseFromBars(['q r:q h', 'r:h h', 'w', 'w'], [60, 62, 64, 65, 67])
    expect(renderGuide(timeline, ONE_CHORD).melody).toEqual([
      guideNote(60, [0, 1], [1, 4]),
      guideNote(62, [1, 2], [1, 2]),
      guideNote(64, [3, 2], [1, 2]),
      guideNote(65, [2, 1], [1, 1]),
      guideNote(67, [3, 1], [1, 1]),
    ])
  })

  // @test-link [[rule_melody_guide_notes]]
  it('plays offbeat eighths on their offbeats', () => {
    const timeline = phraseFromBars(['e q q q e', 'w', 'w', 'w'], [60, 62, 64, 65, 67])
    const starts = renderGuide(timeline, ONE_CHORD).melody.map((note) => note.start)
    expect(starts.slice(0, 5)).toEqual([
      makeRational(0, 1),
      makeRational(1, 8),
      makeRational(3, 8),
      makeRational(5, 8),
      makeRational(7, 8),
    ])
  })

  // @test-link [[rule_melody_guide_notes]]
  // @test-link [[rule_rhythm_guide_notes]]
  it('plays eighth and sixteenth triplets at their exact positions and lengths', () => {
    const triplets = [
      ...[60, 62, 64].map((pitch) => noteOf(pitch, EIGHTH_TRIPLET)),
      ...[65, 67, 69, 71, 72, 71].map((pitch) => noteOf(pitch, SIXTEENTH_TRIPLET)),
      noteOf(69, HALF),
    ]
    const timeline = timelineOf([
      triplets,
      [noteOf(67, WHOLE)],
      [noteOf(65, WHOLE)],
      [restOf(WHOLE)],
    ])
    const harmony = [event(0, 0, 2, C_MAJOR), event(0, 2, 6, F_MAJOR), event(2, 0, 8, G_MAJOR)]
    const guide = renderGuide(timeline, harmony)
    expect(guide.melody).toEqual([
      guideNote(60, [0, 1], [1, 12]),
      guideNote(62, [1, 12], [1, 12]),
      guideNote(64, [2, 12], [1, 12]),
      guideNote(65, [6, 24], [1, 24]),
      guideNote(67, [7, 24], [1, 24]),
      guideNote(69, [8, 24], [1, 24]),
      guideNote(71, [9, 24], [1, 24]),
      guideNote(72, [10, 24], [1, 24]),
      guideNote(71, [11, 24], [1, 24]),
      guideNote(69, [1, 2], [1, 2]),
      guideNote(67, [1, 1], [1, 1]),
      guideNote(65, [2, 1], [1, 1]),
    ])
    // The last sixteenth triplet ends exactly on beat 3, where F takes over; it is still on C.
    expect(guide.rhythm.map((note) => Number(note.pitch))).toEqual([
      60, 60, 60, 60, 60, 60, 60, 60, 60, 65, 65, 67,
    ])
  })
})

// @test-link [[rule_rhythm_guide_notes]]
describe('the rhythm guide on hand-built phrases', () => {
  // @test-link [[rule_rhythm_guide_notes]]
  it('keeps the root a note started on when it is held across a chord change', () => {
    const timeline = phraseFromBars(['q h q', '~:h h', 'w', 'w'], [64, 67, 72, 71, 69, 67])
    const harmony = [
      event(0, 0, 2, C_MAJOR),
      event(0, 2, 6, F_MAJOR),
      event(2, 0, 4, A_MINOR),
      event(3, 0, 4, G_MAJOR),
    ]
    const guide = renderGuide(timeline, harmony)
    expect(guide.rhythm).toEqual([
      guideNote(60, [0, 1], [1, 4]),
      guideNote(60, [1, 4], [1, 2]),
      guideNote(65, [3, 4], [3, 4]),
      guideNote(65, [3, 2], [1, 2]),
      guideNote(69, [2, 1], [1, 1]),
      guideNote(67, [3, 1], [1, 1]),
    ])
    expect(guide.rhythm.map((note) => [note.start, note.duration])).toEqual(
      guide.melody.map((note) => [note.start, note.duration]),
    )
  })

  // @test-link [[rule_rhythm_guide_notes]]
  it('puts every root in the octave from middle C, C4 to B4', () => {
    const timeline = phraseFromBars(['w', 'w', 'w', 'w'])
    const harmony = [
      event(0, 0, 4, C_MAJOR),
      event(1, 0, 4, B_DIMINISHED),
      event(2, 0, 4, A_MINOR),
      event(3, 0, 4, G_MAJOR),
    ]
    expect(renderGuide(timeline, harmony).rhythm.map((note) => Number(note.pitch))).toEqual([
      60, 71, 69, 67,
    ])
  })
})

// @test-link [[rule_melody_guide_notes]]
// @test-link [[rule_rhythm_guide_notes]]
describe('what the guide renderer refuses', () => {
  const quarters = (pitch: number): MeasureEvent[] => [0, 1, 2, 3].map(() => noteOf(pitch, QUARTER))

  // @test-link [[rule_melody_guide_notes]]
  it.each<[string, () => ConcertEventTimeline]>([
    [
      'a tie continuation opening the phrase',
      () =>
        timelineOf([
          [noteOf(60, HALF, true), noteOf(62, HALF)],
          quarters(64),
          quarters(65),
          quarters(67),
        ]),
    ],
    [
      'a tie continuation after a rest',
      () =>
        timelineOf([
          [noteOf(60, QUARTER), restOf(QUARTER), noteOf(60, HALF, true)],
          quarters(64),
          quarters(65),
          quarters(67),
        ]),
    ],
    [
      'a tie continuation at another pitch than the note it continues',
      () =>
        timelineOf([
          [noteOf(60, HALF), noteOf(62, HALF)],
          [noteOf(64, HALF, true), noteOf(65, HALF)],
          quarters(65),
          quarters(67),
        ]),
    ],
  ])('throws a typed GuideRenderError on %s', (_name, timeline) => {
    const error = thrownBy(() => renderGuide(timeline(), ONE_CHORD))
    expect(error).toBeInstanceOf(GuideRenderError)
    expect(error).toMatchObject({ kind: 'GuideRenderError', name: 'GuideRenderError' })
  })

  // @test-link [[rule_rhythm_guide_notes]]
  it('throws a GuideRenderError on a note start no harmony event holds', () => {
    const timeline = phraseFromBars(['w', 'w', 'w', 'w'])
    const harmony = [event(0, 0, 8, C_MAJOR), event(3, 0, 4, G_MAJOR)]
    expect(() => renderGuide(timeline, harmony)).toThrow(GuideRenderError)
  })

  // @test-link [[rule_rhythm_guide_notes]]
  it.each([12, -1, 0.5])('throws a GuideRenderError on a chord root of %s', (root) => {
    const badTriad: DiatonicTriad = {
      ...C_MAJOR,
      pitchClasses: [root, 4, 7] as unknown as DiatonicTriad['pitchClasses'],
    }
    const timeline = phraseFromBars(['w', 'w', 'w', 'w'])
    expect(() => renderGuide(timeline, [event(0, 0, 16, badTriad)])).toThrow(GuideRenderError)
  })
})

// @test-link [[rule_melody_guide_notes]]
// @test-link [[rule_rhythm_guide_notes]]
describe('the rendered guide', () => {
  // @test-link [[rule_melody_guide_notes]]
  // @test-link [[rule_rhythm_guide_notes]]
  it('is frozen, down to each note and its rationals', () => {
    const guide = renderGuide(phraseFromBars(['h ~:q q', 'w', 'w', 'w']), ONE_CHORD)
    expect(Object.isFrozen(guide)).toBe(true)
    expect(Object.isFrozen(guide.melody)).toBe(true)
    expect(Object.isFrozen(guide.rhythm)).toBe(true)
    for (const note of [...guide.melody, ...guide.rhythm]) {
      expect(Object.isFrozen(note)).toBe(true)
      expect(Object.isFrozen(note.start)).toBe(true)
      expect(Object.isFrozen(note.duration)).toBe(true)
    }
  })
})
