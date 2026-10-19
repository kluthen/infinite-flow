/**
 * The backing renderer: a bass line and close-position block chords rendered from a phrase's
 * harmony events, re-attacked at every chord change and every downbeat, with the bass adding the
 * fifth on beat 3 of a whole measure under one chord. Pure and deterministic; invalid harmony or a
 * meter other than 4/4 is rejected.
 */

import { describe, expect, it } from 'vitest'

import {
  BACKING_REGISTER,
  BackingRenderError,
  renderBacking,
  type BackingNote,
  type RenderedBacking,
} from '@/domain/backing/backing-renderer'
import {
  COLLECTIONS,
  type Collection,
  type HarmonicMotion,
} from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { FOUR_FOUR_METER, type Meter } from '@/domain/generation/generation-request'
import {
  isNoLegalHarmonyPlan,
  makeHarmonyCandidateDomain,
  type HarmonyCandidateDomain,
} from '@/domain/harmony/harmony-planner'
import type { DiatonicTriad, HarmonyEvent, PitchClassNumber } from '@/domain/harmony/harmony-types'
import { makeRational, type Rational } from '@/domain/time/rational'
import type { MidiBackingNote } from '@/export/midi/midi-export-input'

const PHRASE_BEATS = 16

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const D_MINOR: DiatonicTriad = { degree: 2, pitchClasses: [2, 5, 9], quality: 'minor' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }
const A_MINOR: DiatonicTriad = { degree: 6, pitchClasses: [9, 0, 4], quality: 'minor' }
const B_DIMINISHED: DiatonicTriad = { degree: 7, pitchClasses: [11, 2, 5], quality: 'diminished' }

/** Intent: a hand-built harmony event; role, template and bar roles do not affect the backing. */
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

/** Intent: a beat count as whole notes (a quarter note is 1/4). */
function beats(count: number): Rational {
  return makeRational(count, 4)
}

/** Intent: an expected backing note from a MIDI number, a start beat and a length in beats. */
function note(pitch: number, startBeat: number, lengthBeats: number): BackingNote {
  return { pitch: makeConcertPitch(pitch), start: beats(startBeat), duration: beats(lengthBeats) }
}

/** Intent: an expected block chord: one note per pitch, all attacked and held together. */
function chord(pitches: readonly number[], startBeat: number, lengthBeats: number): BackingNote[] {
  return pitches.map((pitch) => note(pitch, startBeat, lengthBeats))
}

/** Intent: a whole-note time as a beat number, asserting it lands on a whole beat. */
function beatOf(time: Rational): number {
  const beat = (time.numerator * 4) / time.denominator
  expect(Number.isInteger(beat)).toBe(true)
  return beat
}

/** Intent: a pitch number's pitch class 0-11. */
function pitchClassOf(pitch: number): number {
  return ((pitch % 12) + 12) % 12
}

/** Intent: the beat an event starts on, counted from the phrase's start. */
function eventStart(harmonyEvent: HarmonyEvent): number {
  return harmonyEvent.barIndex * 4 + harmonyEvent.startBeat
}

/** Intent: the harmony event sounding at a beat; fails the test when none does. */
function eventAt(harmony: readonly HarmonyEvent[], beat: number): HarmonyEvent {
  const found = harmony.find(
    (candidate) =>
      eventStart(candidate) <= beat && beat < eventStart(candidate) + candidate.durationBeats,
  )
  if (found === undefined) throw new Error(`no harmony event sounds at beat ${beat}`)
  return found
}

/** Intent: the beats where the backing must attack: every chord change and every downbeat. */
function expectedAttacks(harmony: readonly HarmonyEvent[]): number[] {
  const attacks = new Set([0, 4, 8, 12, ...harmony.map(eventStart)])
  return [...attacks].sort((a, b) => a - b)
}

/**
 * Intent: check a rendered backing against every rendering rule for its harmony: attacks, pitch
 * classes, registers, chord shape, bass fifths, and gap-free coverage of the 16 beats.
 */
function expectBackingFollowsHarmony(
  harmony: readonly HarmonyEvent[],
  rendered: RenderedBacking,
  collectionPitchClasses: readonly PitchClassNumber[],
): void {
  const attacks = expectedAttacks(harmony)
  const segmentLength = (index: number): number =>
    (attacks[index + 1] ?? PHRASE_BEATS) - (attacks[index] ?? 0)

  const chordStarts = rendered.chords.map((chordNote) => beatOf(chordNote.start))
  expect(chordStarts).toEqual([...chordStarts].sort((a, b) => a - b))
  expect([...new Set(chordStarts)]).toEqual(attacks)
  attacks.forEach((attack, index) => {
    const group = rendered.chords.filter((chordNote) => beatOf(chordNote.start) === attack)
    const pitches = group.map((chordNote) => Number(chordNote.pitch))
    const triad = eventAt(harmony, attack).triad.pitchClasses
    expect(pitches).toHaveLength(3)
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b))
    expect(new Set(pitches).size).toBe(3)
    expect(pitches.map(pitchClassOf).sort((a, b) => a - b)).toEqual(
      [...triad].sort((a, b) => a - b),
    )
    expect(Math.max(...pitches) - Math.min(...pitches)).toBeLessThan(12)
    expect(Math.max(...pitches)).toBeLessThanOrEqual(BACKING_REGISTER.chordTopHighest)
    expect(Math.max(...pitches)).toBeGreaterThan(52)
    for (const chordNote of group) expect(beatOf(chordNote.duration)).toBe(segmentLength(index))
    for (const pitchClass of pitches.map(pitchClassOf)) {
      expect(collectionPitchClasses).toContain(pitchClass)
    }
  })

  let cursor = 0
  for (const bassNote of rendered.bass) {
    const start = beatOf(bassNote.start)
    const length = beatOf(bassNote.duration)
    const pitch = Number(bassNote.pitch)
    const triad = eventAt(harmony, start).triad.pitchClasses
    expect(start).toBe(cursor)
    expect(pitch).toBeGreaterThanOrEqual(BACKING_REGISTER.bassLowest)
    expect(pitch).toBeLessThanOrEqual(BACKING_REGISTER.bassHighest)
    expect(collectionPitchClasses).toContain(pitchClassOf(pitch))
    const attackIndex = attacks.indexOf(start)
    if (attackIndex >= 0) {
      expect(pitchClassOf(pitch)).toBe(triad[0])
      expect(length).toBe(segmentLength(attackIndex) === 4 ? 2 : segmentLength(attackIndex))
    } else {
      expect(start % 4).toBe(2)
      expect(segmentLength(attacks.indexOf(start - 2))).toBe(4)
      expect(pitchClassOf(pitch)).toBe(triad[2])
      expect(length).toBe(2)
    }
    cursor = start + length
  }
  expect(cursor).toBe(PHRASE_BEATS)
  const bassStarts = rendered.bass.map((bassNote) => beatOf(bassNote.start))
  for (const attack of attacks) expect(bassStarts).toContain(attack)
}

/** Intent: the harmony candidate domain for one planner input, failing the test if it is empty. */
function harmonyDomain(
  collection: Collection,
  tonalCenter: 'C' | 'F#',
  harmonicMotion: HarmonicMotion,
): HarmonyCandidateDomain {
  const result = makeHarmonyCandidateDomain({
    tonalCenter,
    collection,
    harmonicMotion,
    tensionArc: 'Settled',
  })
  if (isNoLegalHarmonyPlan(result)) throw new Error(`no harmony for ${tonalCenter} ${collection}`)
  return result
}

/**
 * Intent: how many of a phrase's four measures change chord on their beat 3 (two chords) and how
 * many hold one chord throughout.
 */
function measureChordCounts(harmony: readonly HarmonyEvent[]): {
  oneChord: number
  twoChord: number
} {
  const measureStarts = [0, 4, 8, 12]
  const twoChord = measureStarts.filter((measure) =>
    harmony.some((harmonyEvent) => eventStart(harmonyEvent) === measure + 2),
  ).length
  return { oneChord: measureStarts.length - twoChord, twoChord }
}

/** C, A minor, F, G: one chord per measure. */
const ONE_CHORD_MEASURES = [
  event(0, 0, 4, C_MAJOR),
  event(1, 0, 4, A_MINOR),
  event(2, 0, 4, F_MAJOR),
  event(3, 0, 4, G_MAJOR),
]

/** C, then D minor and G sharing measure 2, then C held across measures 3 and 4. */
const SPLIT_AND_HELD = [
  event(0, 0, 4, C_MAJOR),
  event(1, 0, 2, D_MINOR),
  event(1, 2, 2, G_MAJOR),
  event(2, 0, 8, C_MAJOR),
]

/** C for two beats, G from beat 3 into measure 2, A minor, then B diminished. */
const OFFBEAT_CHANGE_AND_DIMINISHED = [
  event(0, 0, 2, C_MAJOR),
  event(0, 2, 6, G_MAJOR),
  event(2, 0, 4, A_MINOR),
  event(3, 0, 4, B_DIMINISHED),
]

// @test-link [[req_session_backing_track]]
describe('renderBacking: hand-built harmony', () => {
  // @test-link [[req_session_backing_track]]
  it('plays root then fifth in the bass and one held close-position triad for a one-chord measure', () => {
    expect(renderBacking(ONE_CHORD_MEASURES, FOUR_FOUR_METER)).toEqual({
      bass: [
        note(36, 0, 2),
        note(43, 2, 2),
        note(45, 4, 2),
        note(40, 6, 2),
        note(41, 8, 2),
        note(36, 10, 2),
        note(43, 12, 2),
        note(38, 14, 2),
      ],
      chords: [
        ...chord([55, 60, 64], 0, 4),
        ...chord([57, 60, 64], 4, 4),
        ...chord([53, 57, 60], 8, 4),
        ...chord([55, 59, 62], 12, 4),
      ],
    })
  })

  // @test-link [[req_session_backing_track]]
  it('attacks each half of a two-chord measure with its root only, and re-attacks a held chord on the downbeat', () => {
    expect(renderBacking(SPLIT_AND_HELD, FOUR_FOUR_METER)).toEqual({
      bass: [
        note(36, 0, 2),
        note(43, 2, 2),
        note(38, 4, 2),
        note(43, 6, 2),
        note(36, 8, 2),
        note(43, 10, 2),
        note(36, 12, 2),
        note(43, 14, 2),
      ],
      chords: [
        ...chord([55, 60, 64], 0, 4),
        ...chord([53, 57, 62], 4, 2),
        ...chord([55, 59, 62], 6, 2),
        ...chord([55, 60, 64], 8, 4),
        ...chord([55, 60, 64], 12, 4),
      ],
    })
  })

  // @test-link [[req_session_backing_track]]
  it('splits a chord starting on beat 3 at the bar line and plays a diminished fifth over a diminished triad', () => {
    const rendered = renderBacking(OFFBEAT_CHANGE_AND_DIMINISHED, FOUR_FOUR_METER)
    expect(rendered).toEqual({
      bass: [
        note(36, 0, 2),
        note(43, 2, 2),
        note(43, 4, 2),
        note(38, 6, 2),
        note(45, 8, 2),
        note(40, 10, 2),
        note(47, 12, 2),
        note(41, 14, 2),
      ],
      chords: [
        ...chord([55, 60, 64], 0, 2),
        ...chord([55, 59, 62], 2, 2),
        ...chord([55, 59, 62], 4, 4),
        ...chord([57, 60, 64], 8, 4),
        ...chord([53, 59, 62], 12, 4),
      ],
    })
    const [diminishedRoot, diminishedFifth] = rendered.bass.slice(-2)
    expect(pitchClassOf(Number(diminishedFifth?.pitch) - Number(diminishedRoot?.pitch))).toBe(6)
  })

  // @test-link [[req_session_backing_track]]
  it('follows every rendering rule on each hand-built phrase', () => {
    const cMajorScale: PitchClassNumber[] = [0, 2, 4, 5, 7, 9, 11]
    for (const harmony of [ONE_CHORD_MEASURES, SPLIT_AND_HELD, OFFBEAT_CHANGE_AND_DIMINISHED]) {
      expectBackingFollowsHarmony(harmony, renderBacking(harmony, FOUR_FOUR_METER), cMajorScale)
    }
  })
})

// @test-link [[req_session_backing_track]]
describe('renderBacking: real harmony from the planner', () => {
  // @test-link [[req_session_backing_track]]
  it.each(COLLECTIONS)(
    'follows every harmony candidate of %s, with both one-chord and two-chord measures',
    (collection) => {
      let oneChordMeasures = 0
      let twoChordMeasures = 0
      for (const tonalCenter of ['C', 'F#'] as const) {
        for (const harmonicMotion of ['Static', 'Active diatonic'] as const) {
          const domain = harmonyDomain(collection, tonalCenter, harmonicMotion)
          for (const candidate of domain.candidates) {
            const rendered = renderBacking(candidate.events, FOUR_FOUR_METER)
            expectBackingFollowsHarmony(candidate.events, rendered, domain.collection.pitchClasses)
            const counts = measureChordCounts(candidate.events)
            oneChordMeasures += counts.oneChord
            twoChordMeasures += counts.twoChord
          }
        }
      }
      expect(oneChordMeasures).toBeGreaterThan(0)
      expect(twoChordMeasures).toBeGreaterThan(0)
    },
  )
})

// @test-link [[req_session_backing_track]]
describe('renderBacking: purity and contract', () => {
  // @test-link [[req_session_backing_track]]
  it('renders the same harmony to an equal, frozen backing without mutating its input', () => {
    const harmony = SPLIT_AND_HELD.map((harmonyEvent) => structuredClone(harmonyEvent))
    const snapshot = structuredClone(harmony)
    const first = renderBacking(harmony, FOUR_FOUR_METER)
    expect(renderBacking(harmony, FOUR_FOUR_METER)).toEqual(first)
    expect(harmony).toEqual(snapshot)
    expect(first.bass.length).toBeGreaterThan(0)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.bass)).toBe(true)
    expect(Object.isFrozen(first.chords[0])).toBe(true)
    expect(renderBacking(deepFreeze(structuredClone(harmony)), FOUR_FOUR_METER)).toEqual(first)
  })

  // @test-link [[req_session_backing_track]]
  it('produces notes the MIDI export accepts as its backing notes', () => {
    const rendered = renderBacking(ONE_CHORD_MEASURES, FOUR_FOUR_METER)
    const midiNotes: readonly MidiBackingNote[] = [...rendered.bass, ...rendered.chords]
    expect(midiNotes).toHaveLength(20)
  })

  // @test-link [[req_session_backing_track]]
  it.each([
    ['no harmony at all', []],
    ['a gap', [event(0, 0, 4, C_MAJOR), event(1, 2, 2, A_MINOR), event(2, 0, 8, F_MAJOR)]],
    ['an overlap', [event(0, 0, 6, C_MAJOR), event(1, 0, 4, A_MINOR), event(2, 0, 8, F_MAJOR)]],
    [
      'events out of order',
      [event(1, 0, 4, A_MINOR), event(0, 0, 4, C_MAJOR), event(2, 0, 8, F_MAJOR)],
    ],
    ['a phrase not starting on beat 1', [event(0, 2, 14, C_MAJOR)]],
    ['a phrase shorter than 16 beats', [event(0, 0, 4, C_MAJOR), event(1, 0, 8, A_MINOR)]],
    ['a phrase longer than 16 beats', [event(0, 0, 8, C_MAJOR), event(2, 0, 12, A_MINOR)]],
    ['a zero duration', [event(0, 0, 0, C_MAJOR), event(0, 0, 16, A_MINOR)]],
    ['a fractional duration', [event(0, 0, 1.5, C_MAJOR), event(0, 2, 14.5, A_MINOR)]],
    [
      'a triad that does not match its quality',
      [event(0, 0, 16, { ...C_MAJOR, quality: 'minor' })],
    ],
    [
      'a pitch class outside 0-11',
      [
        event(0, 0, 16, {
          ...C_MAJOR,
          pitchClasses: [12, 16, 19] as unknown as DiatonicTriad['pitchClasses'],
        }),
      ],
    ],
  ] as const)('rejects %s', (_label, harmony) => {
    expect(() => renderBacking(harmony, FOUR_FOUR_METER)).toThrow(BackingRenderError)
  })

  // @test-link [[req_session_backing_track]]
  it('rejects a meter other than 4/4', () => {
    const threeFour = { beatsPerMeasure: 3, beatUnit: 4 } as unknown as Meter
    expect(() => renderBacking(ONE_CHORD_MEASURES, threeFour)).toThrow(BackingRenderError)
  })
})
