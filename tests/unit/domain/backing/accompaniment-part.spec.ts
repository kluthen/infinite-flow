/**
 * The part shape: every system voice's role and mix channel, the part note's checks (inside the
 * phrase, a positive length, a MIDI velocity, a known drum sound), the part's checks (start order,
 * drums only in the drum part) and the conversion of the backing renderer's and the guide
 * renderer's notes into parts, each note unchanged.
 */

import { describe, expect, it } from 'vitest'

import {
  ACCOMPANIMENT_VOICES,
  AccompanimentPartError,
  BACKING_PART_VELOCITY,
  GUIDE_PART_VELOCITY,
  VOICE_PLACES,
  backingParts,
  guideParts,
  makeAccompanimentPart,
  makePartNote,
  type DrumSound,
  type PartNote,
  type PartSound,
} from '@/domain/backing/accompaniment-part'
import { renderBacking } from '@/domain/backing/backing-renderer'
import { renderGuide } from '@/domain/backing/guide-renderer'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { makeRational, type Rational } from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }

/** A hand-built harmony event. */
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

/** C for six beats, F for two, then C for the last two measures. */
const HARMONY: readonly HarmonyEvent[] = [
  event(0, 0, 6, C_MAJOR),
  event(1, 2, 2, F_MAJOR),
  event(2, 0, 8, C_MAJOR),
]

/** A phrase of quarter notes and rests over `HARMONY`. */
const TIMELINE = makeConcertEventTimeline(
  [0, 1, 2, 3].map((index) =>
    makeMeasure(index, [
      makeNoteEvent({
        duration: r(1, 4),
        pitch: makeConcertPitch(64 + index),
        tieContinuation: false,
      }),
      makeRestEvent({ duration: r(1, 4) }),
      makeNoteEvent({ duration: r(1, 2), pitch: makeConcertPitch(60), tieContinuation: false }),
    ]),
  ),
)

/** A whole-note fraction. */
function r(numerator: number, denominator: number): Rational {
  return makeRational(numerator, denominator)
}

/** A pitched sound. */
function pitch(midi: number): PartSound {
  return { kind: 'pitch', pitch: makeConcertPitch(midi) }
}

/** A drum sound. */
function drum(sound: DrumSound): PartSound {
  return { kind: 'drum', drum: sound }
}

/** A part's notes back as the renderers' note shape, and their velocities. */
function asRendered(notes: readonly PartNote[]) {
  return notes.map((note) => {
    if (note.sound.kind !== 'pitch') throw new Error('Test setup: a drum note in a pitched part.')
    return { pitch: note.sound.pitch, start: note.start, duration: note.duration }
  })
}

describe('voice places', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[req_accompaniment_parts]]
  it('gives every voice its role and mix channel, the backing two voices on one channel', () => {
    expect(ACCOMPANIMENT_VOICES.map((voice) => [voice, VOICE_PLACES[voice]])).toEqual([
      ['bass', { role: 'foundation', channel: 'backing' }],
      ['chords', { role: 'foundation', channel: 'backing' }],
      ['melody-guide', { role: 'guide', channel: 'melody-guide' }],
      ['rhythm-guide', { role: 'guide', channel: 'rhythm-guide' }],
      ['thirds', { role: 'highlighting', channel: 'thirds' }],
      ['counter-melody', { role: 'contrasting', channel: 'counter-melody' }],
      ['fills', { role: 'responding', channel: 'fills' }],
      ['drums', { role: 'foundation', channel: 'drums' }],
    ])
  })
})

describe('makePartNote', () => {
  // @test-link [[entity_accompaniment_part]]
  it('builds a frozen pitched or drum note inside the phrase', () => {
    const note = makePartNote(r(15, 4), r(1, 4), pitch(62), 1)
    expect(note).toEqual({ start: r(15, 4), duration: r(1, 4), sound: pitch(62), velocity: 1 })
    expect(Object.isFrozen(note)).toBe(true)
    expect(Object.isFrozen(note.sound)).toBe(true)
    expect(makePartNote(r(0, 1), r(1, 8), drum('closed-hi-hat'), 127).sound).toEqual(
      drum('closed-hi-hat'),
    )
  })

  // @test-link [[entity_accompaniment_part]]
  it.each([
    ['a start before the phrase', r(-1, 4), r(1, 4), pitch(60), 64],
    ['a length of zero', r(0, 1), r(0, 1), pitch(60), 64],
    ['a negative length', r(1, 1), r(-1, 4), pitch(60), 64],
    ['an end after the phrase', r(15, 4), r(1, 2), pitch(60), 64],
    ['a velocity of zero', r(0, 1), r(1, 4), pitch(60), 0],
    ['a velocity above 127', r(0, 1), r(1, 4), pitch(60), 128],
    ['a fractional velocity', r(0, 1), r(1, 4), pitch(60), 64.5],
    [
      'an unknown drum',
      r(0, 1),
      r(1, 4),
      { kind: 'drum', drum: 'cowbell' } as unknown as PartSound,
      64,
    ],
  ])('rejects %s', (_label, start, duration, sound, velocity) => {
    expect(() => makePartNote(start, duration, sound, velocity)).toThrow(AccompanimentPartError)
  })
})

describe('makeAccompanimentPart', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('builds a frozen part, an empty one included, with its voice role and channel', () => {
    const empty = makeAccompanimentPart('fills', [])
    expect(empty).toEqual({ voice: 'fills', role: 'responding', channel: 'fills', notes: [] })
    expect(Object.isFrozen(empty.notes)).toBe(true)
    const notes = [makePartNote(r(0, 1), r(1, 8), drum('kick'), 100)]
    expect(makeAccompanimentPart('drums', notes).notes).toEqual(notes)
  })

  // @test-link [[entity_accompaniment_part]]
  it('rejects notes out of start order, a pitch in the drums and a drum elsewhere', () => {
    const late = makePartNote(r(1, 2), r(1, 4), pitch(60), 64)
    const early = makePartNote(r(1, 4), r(1, 4), pitch(62), 64)
    const kick = makePartNote(r(0, 1), r(1, 4), drum('kick'), 100)
    expect(() => makeAccompanimentPart('thirds', [late, early])).toThrow(AccompanimentPartError)
    expect(() => makeAccompanimentPart('drums', [early])).toThrow(AccompanimentPartError)
    expect(() => makeAccompanimentPart('fills', [kick])).toThrow(AccompanimentPartError)
  })

  // @test-link [[entity_accompaniment_part]]
  it('keeps notes sharing a start, as a chord does', () => {
    const third = makePartNote(r(0, 1), r(1, 1), pitch(64), 72)
    const root = makePartNote(r(0, 1), r(1, 1), pitch(60), 72)
    expect(makeAccompanimentPart('chords', [third, root]).notes).toEqual([third, root])
  })
})

describe('backingParts and guideParts', () => {
  // @test-link [[entity_accompaniment_part]]
  // @test-link [[req_session_backing_track]]
  it("carry the backing renderer's bass and chords unchanged, at the backing velocity", () => {
    const backing = renderBacking(HARMONY, FOUR_FOUR_METER)
    const [bass, chords] = backingParts(backing)
    expect(bass.voice).toBe('bass')
    expect(chords.voice).toBe('chords')
    expect(asRendered(bass.notes)).toEqual(backing.bass)
    expect(asRendered(chords.notes)).toEqual(backing.chords)
    expect(backing.chords.length).toBeGreaterThan(backing.bass.length)
    for (const note of [...bass.notes, ...chords.notes]) {
      expect(note.velocity).toBe(BACKING_PART_VELOCITY)
    }
  })

  // @test-link [[entity_accompaniment_part]]
  // @test-link [[req_guide_playback]]
  it("carry the guide renderer's melody and rhythm guides unchanged, at the guide velocity", () => {
    const guide = renderGuide(TIMELINE, HARMONY)
    const [melody, rhythm] = guideParts(guide)
    expect([melody.voice, rhythm.voice]).toEqual(['melody-guide', 'rhythm-guide'])
    expect(asRendered(melody.notes)).toEqual(guide.melody)
    expect(asRendered(rhythm.notes)).toEqual(guide.rhythm)
    expect(guide.melody).toHaveLength(8)
    for (const note of [...melody.notes, ...rhythm.notes]) {
      expect(note.velocity).toBe(GUIDE_PART_VELOCITY)
    }
  })
})
