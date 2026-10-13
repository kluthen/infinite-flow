/**
 * The shared system-position size as my instrument's written range, read in its clef, sets it: the
 * built-in 16 staff spaces with no saved my instrument or one whose ink stays inside the
 * built-ins' reach (144 units; a range wider than two octaves has wider register windows, so wider
 * beam groups), else my instrument's ink with 0.8 staff space clear at each end, rounded up to a
 * whole number of staff spaces; then the staff placed and the positions planned in that size.
 *
 * Ink figures below are in engraving units from the staff's top line (written F5 in treble clef,
 * A3 in bass clef), a diatonic step
 * being 5 units: below it, the lowest note's position plus 7 (written C3 sits 85 under the top
 * line, so 92); above it, the highest chord symbol's reach plus the 15-unit start marker.
 */
import { describe, expect, it } from 'vitest'

import {
  NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE,
  NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
  NOTATION_MAX_STAFF_SPACE_PX,
  NOTATION_POSITION_END_CLEARANCE_UNITS,
  NOTATION_STAFF_INK_ABOVE_TOP_LINE_UNITS,
  NOTATION_STAFF_INK_BELOW_TOP_LINE_UNITS,
  NOTATION_SYSTEM_POSITION_UNITS,
  planBeamGroupMaxSpanSteps,
  planStaffInk,
  planStaffPlacement,
  planStaffPositions,
  planSystemLayout,
  planSystemPositionUnits,
  type StaffViewport,
  type WrittenRangeInClef,
} from '@/notation/notation-layout-policy'
import { COLLECTIONS } from '@/domain/controls/generation-controls'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import {
  CLEF_STAFF_LINES,
  spellMidiInKey,
  spellWrittenKey,
  staffStepsFromMiddleLine,
} from '@/domain/notation/pitch-spelling'
import type { InstrumentMidiRange, WrittenKey } from '@/domain/notation/written-phrase-types'
import { INSTRUMENT_CLEFS } from '@/domain/profile/instrument-clef'

const SPACE = NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
const MAX_SCALE = NOTATION_MAX_STAFF_SPACE_PX / SPACE
const FLOOR_SCALE = NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX / SPACE

/** Intent: a written range in treble clef, every built-in profile's clef. */
function inTreble(writtenRange: InstrumentMidiRange): WrittenRangeInClef {
  return { writtenRange, clef: 'treble' }
}

/** Intent: a written range in bass clef. */
function inBass(writtenRange: InstrumentMidiRange): WrittenRangeInClef {
  return { writtenRange, clef: 'bass' }
}

/** The built-in profiles' written ranges: the C MIDI keyboard, and both saxophones. */
const KEYBOARD: InstrumentMidiRange = { minMidi: 48, maxMidi: 72 }
const SAXOPHONES: InstrumentMidiRange = { minMidi: 60, maxMidi: 84 }

/**
 * Intent: the most staff steps a written key spells any interval of up to `semitones` with, over
 * every starting note of one octave.
 */
function widestSpelledSpan(key: WrittenKey, semitones: number): number {
  let widest = 0
  for (let low = 60; low < 72; low += 1) {
    for (let high = low; high <= low + semitones; high += 1) {
      const span =
        staffStepsFromMiddleLine(spellMidiInKey(high, key), 'treble') -
        staffStepsFromMiddleLine(spellMidiInKey(low, key), 'treble')
      widest = Math.max(widest, span)
    }
  }
  return widest
}

/** Intent: the ink a written range can produce, top to bottom, in engraving units. */
function inkOf(range: InstrumentMidiRange): number {
  const ink = planStaffInk(inTreble(range))
  return ink.aboveTopLineUnits + ink.belowTopLineUnits
}

// @test-link [[module_notation_layout_preflight]]
describe('planSystemPositionUnits: the shared size follows my instrument', () => {
  it('is the built-in 16 staff spaces when no my instrument is saved', () => {
    expect(NOTATION_SYSTEM_POSITION_UNITS).toBe(16 * SPACE)
    expect(planSystemPositionUnits(null)).toBe(NOTATION_SYSTEM_POSITION_UNITS)
  })

  it("stays 16 staff spaces for a my instrument with a built-in's own written range", () => {
    expect(inkOf(KEYBOARD)).toBe(144)
    expect(inkOf(SAXOPHONES)).toBe(137)
    expect(planSystemPositionUnits(inTreble(KEYBOARD))).toBe(160)
    expect(planSystemPositionUnits(inTreble(SAXOPHONES))).toBe(160)
  })

  it('stays 16 staff spaces for two-octave ranges from written B2 to B4 up to written E4 to E6', () => {
    // Written B2 to B4: the 0.8-space clearance is exactly kept, as for the keyboard.
    expect(inkOf({ minMidi: 47, maxMidi: 71 })).toBe(144)
    expect(144 + 2 * NOTATION_POSITION_END_CLEARANCE_UNITS).toBe(160)
    expect(planSystemPositionUnits(inTreble({ minMidi: 47, maxMidi: 71 }))).toBe(160)
    // Written E4 to E6: 67 above the top line, 75 below (a down-stemmed beam group to F4).
    expect(inkOf({ minMidi: 64, maxMidi: 88 })).toBe(142)
    expect(planSystemPositionUnits(inTreble({ minMidi: 64, maxMidi: 88 }))).toBe(160)
  })

  it('grows to 17 staff spaces one step beyond the threshold', () => {
    // Written F4 to F6: one step above E4 to E6.
    expect(inkOf({ minMidi: 65, maxMidi: 89 })).toBe(147)
    expect(planSystemPositionUnits(inTreble({ minMidi: 65, maxMidi: 89 }))).toBe(170)
    // Written A2 to B4: one step below B2.
    expect(inkOf({ minMidi: 45, maxMidi: 71 })).toBe(149)
    expect(planSystemPositionUnits(inTreble({ minMidi: 45, maxMidi: 71 }))).toBe(170)
  })

  it('grows for a range wider than two octaves crossing the middle line: its beam groups span more', () => {
    // Written E3 to D6, 34 semitones: register windows of 17 semitones, beam groups of up to 10
    // steps, so an up-stemmed G5 in a beam group carries a chord symbol: 72 above the top line,
    // and 85 below (a down-stemmed group reaching D4).
    expect(planStaffInk(inTreble({ minMidi: 52, maxMidi: 86 }))).toEqual({
      aboveTopLineUnits: 72,
      belowTopLineUnits: 85,
    })
    expect(planSystemPositionUnits(inTreble({ minMidi: 52, maxMidi: 86 }))).toBe(180)
  })

  it("grows for written C3 to C6, inside the built-ins' combined reach but taller than any one of them", () => {
    // The keyboard's low end under the saxophones' high end, with wider beam groups: 72 above the
    // top line, 92 below.
    expect(planStaffInk(inTreble({ minMidi: 48, maxMidi: 84 }))).toEqual({
      aboveTopLineUnits: 72,
      belowTopLineUnits: 92,
    })
    expect(planSystemPositionUnits(inTreble({ minMidi: 48, maxMidi: 84 }))).toBe(180)
  })

  it('grows by whole staff spaces for low, high and wide ranges', () => {
    // Low, written C2 to C4: 47 + 127 = 174, plus 16 = 190.
    expect(planSystemPositionUnits(inTreble({ minMidi: 36, maxMidi: 60 }))).toBe(190)
    // Very low, written C1 to C3: 47 + 162 = 209, plus 16 = 225, rounded up to 230.
    expect(planSystemPositionUnits(inTreble({ minMidi: 24, maxMidi: 48 }))).toBe(230)
    // High, written C6 to C8: 127 + 60 = 187, plus 16 = 203, rounded up to 210.
    expect(planSystemPositionUnits(inTreble({ minMidi: 84, maxMidi: 108 }))).toBe(210)
    // Wide, 48 semitones, written C3 to C7: 92 + 95 (a down-stemmed beam group reaching G3) = 187,
    // plus 16 = 203, rounded up to 210.
    expect(planSystemPositionUnits(inTreble({ minMidi: 48, maxMidi: 96 }))).toBe(210)
    // Wide, 48 semitones, written C2 to C6: 82 (an up-stemmed B5 in a beam group) + 127 = 209,
    // plus 16 = 225, rounded up to 230.
    expect(planSystemPositionUnits(inTreble({ minMidi: 36, maxMidi: 84 }))).toBe(230)
    // Wide, 60 semitones, written C2 to C7: 92 + 127 = 219, plus 16 = 235, rounded up to 240.
    expect(planSystemPositionUnits(inTreble({ minMidi: 36, maxMidi: 96 }))).toBe(240)
  })

  it('is a whole number of staff spaces, never below 16, and never shrinks as a range widens', () => {
    for (let minMidi = 21; minMidi <= 72; minMidi += 1) {
      let previous = NOTATION_SYSTEM_POSITION_UNITS
      for (let maxMidi = minMidi + 12; maxMidi <= 108; maxMidi += 1) {
        const units = planSystemPositionUnits(inTreble({ minMidi, maxMidi }))
        expect(units % SPACE).toBe(0)
        expect(units).toBeGreaterThanOrEqual(NOTATION_SYSTEM_POSITION_UNITS)
        expect(units).toBeGreaterThanOrEqual(previous)
        expect(
          planSystemPositionUnits(inTreble({ minMidi: minMidi - 1, maxMidi })),
        ).toBeGreaterThanOrEqual(units)
        expect(units).toBeGreaterThanOrEqual(
          inkOf({ minMidi, maxMidi }) + 2 * NOTATION_POSITION_END_CLEARANCE_UNITS,
        )
        previous = units
      }
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planStaffPlacement in the shared size', () => {
  it('keeps the built-in placements at the default size: 73.5 for the saxophones, 60 for the keyboard', () => {
    expect(planStaffPlacement(inTreble(SAXOPHONES)).staffTopLineUnits).toBeCloseTo(73.5, 10)
    expect(planStaffPlacement(inTreble(KEYBOARD)).staffTopLineUnits).toBeCloseTo(60, 10)
    expect(planStaffPlacement(inTreble(KEYBOARD), NOTATION_SYSTEM_POSITION_UNITS)).toEqual(
      planStaffPlacement(inTreble(KEYBOARD)),
    )
  })

  it("keeps every instrument's ink centred and at least 0.8 space inside a grown size", () => {
    const myInstrument = { minMidi: 36, maxMidi: 96 }
    const units = planSystemPositionUnits(inTreble(myInstrument))
    expect(units).toBe(240)
    for (const range of [KEYBOARD, SAXOPHONES, myInstrument]) {
      const placement = planStaffPlacement(inTreble(range), units)
      const below = units - placement.inkBottomUnits
      expect(placement.inkTopUnits).toBeGreaterThanOrEqual(0.8 * SPACE)
      expect(below).toBeGreaterThanOrEqual(0.8 * SPACE)
      expect(placement.inkTopUnits).toBeCloseTo(below, 10)
      // The staff moves down by half the growth: the ink stays centred.
      expect(placement.staffTopLineUnits).toBeCloseTo(
        planStaffPlacement(inTreble(range)).staffTopLineUnits +
          (units - NOTATION_SYSTEM_POSITION_UNITS) / 2,
        10,
      )
    }
  })

  it('refuses a size that is not a whole number of staff spaces at least 16 tall', () => {
    for (const units of [150, 165, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => planStaffPlacement(inTreble(KEYBOARD), units)).toThrow(/staff spaces/u)
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
describe("a written range read in its own clef's staff", () => {
  it("measures the staff's own reach alike in both clefs, the middle line 4 steps under the top", () => {
    for (const clef of INSTRUMENT_CLEFS) {
      const lines = CLEF_STAFF_LINES[clef]
      expect(lines.topLineStep - lines.middleLineStep).toBe(4)
    }
    // Above: the chord symbol over the up stem of the note one step under the middle line.
    expect(NOTATION_STAFF_INK_ABOVE_TOP_LINE_UNITS).toBe(27)
    // Below: the down stem's tip from the note on the middle line.
    expect(NOTATION_STAFF_INK_BELOW_TOP_LINE_UNITS).toBe(55)
  })

  it('gives the same ink to ranges on the same staff positions in treble and in bass clef', () => {
    // Bass clef's staff sits 12 diatonic steps under treble's (top line A3 against F5); each pair
    // spans the same natural steps 12 lower, over the same semitone width, so the same beam groups.
    const pairs: readonly [InstrumentMidiRange, InstrumentMidiRange][] = [
      [
        { minMidi: 60, maxMidi: 84 },
        { minMidi: 40, maxMidi: 64 },
      ], // C4–C6 and E2–E4
      [
        { minMidi: 48, maxMidi: 72 },
        { minMidi: 28, maxMidi: 52 },
      ], // C3–C5 and E1–E3
      [
        { minMidi: 55, maxMidi: 79 },
        { minMidi: 35, maxMidi: 59 },
      ], // G3–G5 and B1–B3
      [
        { minMidi: 36, maxMidi: 96 },
        { minMidi: 16, maxMidi: 76 },
      ], // C2–C7 and E0–E5
    ]
    for (const [treble, bass] of pairs) {
      expect(treble.maxMidi - treble.minMidi).toBe(bass.maxMidi - bass.minMidi)
      expect(planStaffInk(inBass(bass))).toEqual(planStaffInk(inTreble(treble)))
      expect(planStaffPlacement(inBass(bass))).toEqual(planStaffPlacement(inTreble(treble)))
      expect(planSystemPositionUnits(inBass(bass))).toBe(planSystemPositionUnits(inTreble(treble)))
    }
    // Written E0 to E5 in bass clef needs what written C2 to C7 needs in treble clef: 24 spaces.
    expect(planSystemPositionUnits(inBass({ minMidi: 16, maxMidi: 76 }))).toBe(240)
  })

  it('sizes written C2 to C4 at 16 staff spaces in bass clef, 19 in treble clef', () => {
    // Bass clef: 47 (the chord symbol over the stem tip of an up-stemmed G3 in a beam group, 3
    // steps over the middle line D3, as E5 in treble) plus 15 for the start marker = 62 above the
    // top line; 75 below (the beam under a down-stemmed group reaching A2, 35 under the top line;
    // the lowest note, C2, needs only 67). 62 + 75 + 16 = 153, rounded up to 160.
    expect(planStaffInk(inBass({ minMidi: 36, maxMidi: 60 }))).toEqual({
      aboveTopLineUnits: 62,
      belowTopLineUnits: 75,
    })
    expect(planSystemPositionUnits(inBass({ minMidi: 36, maxMidi: 60 }))).toBe(160)
    expect(planSystemPositionUnits(inTreble({ minMidi: 36, maxMidi: 60 }))).toBe(190)
  })

  it("predicts the calibration's bass-clef cases: the bound, low, high and wide", () => {
    // [written range, ink above the top line, ink below it, size], as notation-calibration.spec.ts
    // states them for its bass-clef cases.
    const cases: readonly [InstrumentMidiRange, number, number, number][] = [
      [{ minMidi: 16, maxMidi: 76 }, 92, 127, 240], // E0–E5, the bound
      [{ minMidi: 36, maxMidi: 60 }, 62, 75, 160], // C2–C4
      [{ minMidi: 52, maxMidi: 76 }, 92, 60, 170], // E3–E5, the bound's top two octaves
      [{ minMidi: 16, maxMidi: 64 }, 82, 127, 230], // E0–E4, the mirror of treble C2–C6
    ]
    for (const [range, above, below, size] of cases) {
      expect(planStaffInk(inBass(range))).toEqual({
        aboveTopLineUnits: above,
        belowTopLineUnits: below,
      })
      expect(planSystemPositionUnits(inBass(range))).toBe(size)
    }
  })

  it("keeps a bass range's ink centred in its position, in the built-in size and a grown one", () => {
    const atBuiltIn = planStaffPlacement(inBass({ minMidi: 36, maxMidi: 60 }))
    expect(atBuiltIn.inkTopUnits).toBeCloseTo(11.5, 10)
    expect(NOTATION_SYSTEM_POSITION_UNITS - atBuiltIn.inkBottomUnits).toBeCloseTo(11.5, 10)
    expect(atBuiltIn.staffTopLineUnits).toBeCloseTo(73.5, 10)

    const myInstrument = inBass({ minMidi: 16, maxMidi: 76 })
    const units = planSystemPositionUnits(myInstrument)
    for (const rangeInClef of [myInstrument, inBass({ minMidi: 36, maxMidi: 60 })]) {
      const placement = planStaffPlacement(rangeInClef, units)
      const below = units - placement.inkBottomUnits
      expect(placement.inkTopUnits).toBeGreaterThanOrEqual(0.8 * SPACE)
      expect(below).toBeGreaterThanOrEqual(0.8 * SPACE)
      expect(placement.inkTopUnits).toBeCloseTo(below, 10)
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
describe('planStaffPositions and planSystemLayout in the shared size', () => {
  const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }
  const base = {
    containerWidthPx: 1000,
    leadingWidth: 60,
    measureMinWidths: [80, 80, 80, 80] as const,
    systemPadding: 10,
  }

  it('sizes each position as the grown size times the scale', () => {
    expect(planStaffPositions(ONE_SYSTEM, 170)).toEqual({
      kind: 'room',
      scaleCeiling: MAX_SCALE,
      positionBlockPx: 170 * MAX_SCALE,
    })
    expect(planStaffPositions(ONE_SYSTEM)).toEqual(
      planStaffPositions(ONE_SYSTEM, NOTATION_SYSTEM_POSITION_UNITS),
    )
  })

  it('fits the height budget with two positions of the grown size', () => {
    const viewport: StaffViewport = { layout: 'split', heightBudgetPx: 300 }
    expect(planStaffPositions(viewport, 200)).toEqual({
      kind: 'room',
      scaleCeiling: 300 / 400,
      positionBlockPx: 150,
    })
  })

  it('gives no room in a budget the built-in size fits but two grown positions at the floor do not', () => {
    const viewport: StaffViewport = { layout: 'split', heightBudgetPx: 169 }
    expect(planStaffPositions(viewport).kind).toBe('room')
    expect(planStaffPositions(viewport, 170)).toEqual({
      kind: 'no_room',
      cause: 'too_short',
      details: {
        heightBudgetPx: 169,
        requiredHeightPx: 2 * 170 * FLOOR_SCALE,
        floor: NOTATION_LEGIBILITY_FLOOR_STAFF_SPACE_PX,
      },
    })
    expect(planStaffPositions({ layout: 'split', heightBudgetPx: 170 }, 170).kind).toBe('room')
    expect(planSystemLayout({ ...base, viewport, systemPositionUnits: 170 })).toMatchObject({
      kind: 'no_room',
      cause: 'too_short',
    })
  })

  it('plans the phrase with the grown size and records it in the plan', () => {
    const outcome = planSystemLayout({
      ...base,
      viewport: { layout: 'split', heightBudgetPx: 340 },
      systemPositionUnits: 170,
    })
    if (outcome.kind !== 'fits') throw new Error(`Expected a fit, got ${outcome.kind}`)
    expect(outcome.plan.systemPositionUnits).toBe(170)
    expect(outcome.plan.scale).toBeCloseTo(340 / 340, 10)
    expect(outcome.plan.positionBlockPx).toBeCloseTo(170, 10)

    const builtIn = planSystemLayout({ ...base, viewport: ONE_SYSTEM })
    if (builtIn.kind !== 'fits') throw new Error(`Expected a fit, got ${builtIn.kind}`)
    expect(builtIn.plan.systemPositionUnits).toBe(NOTATION_SYSTEM_POSITION_UNITS)
  })

  it('refuses a size that is not a whole number of staff spaces at least 16 tall', () => {
    expect(() => planStaffPositions(ONE_SYSTEM, 155)).toThrow(/staff spaces/u)
    expect(() =>
      planSystemLayout({ ...base, viewport: ONE_SYSTEM, systemPositionUnits: 171 }),
    ).toThrow(/staff spaces/u)
  })
})

/** Engraving units from the staff's top line (written F5) up to a note 0 steps from the middle line (B4). */
const MIDDLE_LINE_UNITS_ABOVE_TOP_LINE = -4 * (SPACE / 2)

// @test-link [[module_notation_layout_preflight]]
describe('planStaffInk: a lowest written F keeps room for E♯', () => {
  it('places a lowest written F at the E step, where a key signature of six sharps spells it E♯', () => {
    // Written F3 to F5: its lowest note is placed where written E3 sits, 75 units under the top
    // line, plus the 7-unit low-note ink; not at F3's own 70 units.
    expect(planStaffInk(inTreble({ minMidi: 53, maxMidi: 77 })).belowTopLineUnits).toBe(82)
    expect(planStaffInk(inTreble({ minMidi: 52, maxMidi: 76 })).belowTopLineUnits).toBe(82)
    // A lowest F♯ or G♭ keeps its natural neighbour below, written F, as before.
    expect(planStaffInk(inTreble({ minMidi: 54, maxMidi: 77 })).belowTopLineUnits).toBe(77)
  })

  it('keeps written F3 to F5 at 16 spaces, its ink the keyboard-sized 144 units', () => {
    expect(inkOf({ minMidi: 53, maxMidi: 77 })).toBe(144)
    expect(planSystemPositionUnits(inTreble({ minMidi: 53, maxMidi: 77 }))).toBe(160)
    // Written F2 to F4 reaches as low as written E2 to E4.
    expect(planStaffInk(inTreble({ minMidi: 41, maxMidi: 65 })).belowTopLineUnits).toBe(
      planStaffInk(inTreble({ minMidi: 40, maxMidi: 64 })).belowTopLineUnits,
    )
  })

  it('leaves a highest written F at its own step', () => {
    expect(planStaffInk(inTreble({ minMidi: 65, maxMidi: 89 })).aboveTopLineUnits).toBe(
      planStaffInk(inTreble({ minMidi: 64, maxMidi: 88 })).aboveTopLineUnits + SPACE / 2,
    )
  })

  it('leaves the built-in sizes and placements as they were', () => {
    expect(planSystemPositionUnits(inTreble(KEYBOARD))).toBe(160)
    expect(planSystemPositionUnits(inTreble(SAXOPHONES))).toBe(160)
    expect(planStaffPlacement(inTreble(KEYBOARD)).staffTopLineUnits).toBeCloseTo(60, 10)
    expect(planStaffPlacement(inTreble(SAXOPHONES)).staffTopLineUnits).toBeCloseTo(73.5, 10)
  })

  it("holds every written key's spelling of a range's outer notes", () => {
    for (const collection of COLLECTIONS) {
      for (let tonic = 0; tonic < 12; tonic += 1) {
        const key = spellWrittenKey(tonic as PitchClassNumber, collection)
        for (let minMidi = 24; minMidi <= 96; minMidi += 1) {
          const range = { minMidi, maxMidi: minMidi + 24 }
          const ink = planStaffInk(inTreble(range))
          const lowest = staffStepsFromMiddleLine(spellMidiInKey(range.minMidi, key), 'treble')
          const highest = staffStepsFromMiddleLine(spellMidiInKey(range.maxMidi, key), 'treble')
          const lowestUnitsAbove = MIDDLE_LINE_UNITS_ABOVE_TOP_LINE + lowest * (SPACE / 2)
          const highestUnitsAbove = MIDDLE_LINE_UNITS_ABOVE_TOP_LINE + highest * (SPACE / 2)
          expect(ink.belowTopLineUnits).toBeGreaterThanOrEqual(-lowestUnitsAbove + 7)
          expect(ink.aboveTopLineUnits).toBeGreaterThanOrEqual(highestUnitsAbove + 22 + 15)
        }
      }
    }
  })
})

// @test-link [[module_notation_layout_preflight]]
// @test-link [[module_notation_stem_direction]]
describe('planBeamGroupMaxSpanSteps: beam groups as wide as the register windows', () => {
  it('is one octave, 7 steps, for every range of up to two octaves, the built-ins included', () => {
    for (const range of [
      KEYBOARD,
      SAXOPHONES,
      { minMidi: 40, maxMidi: 52 },
      { minMidi: 0, maxMidi: 24 },
    ]) {
      expect(planBeamGroupMaxSpanSteps(range)).toBe(7)
    }
  })

  it('widens with the register windows, half the range: 8 steps past two octaves, 14 for four', () => {
    // 25 and 26 semitones: windows of 13 semitones, an octave and a minor second.
    expect(planBeamGroupMaxSpanSteps({ minMidi: 40, maxMidi: 65 })).toBe(8)
    expect(planBeamGroupMaxSpanSteps({ minMidi: 40, maxMidi: 66 })).toBe(8)
    // 34 semitones: windows of 17, an octave and a fourth.
    expect(planBeamGroupMaxSpanSteps({ minMidi: 52, maxMidi: 86 })).toBe(10)
    // 48 semitones: windows of 24, two octaves.
    expect(planBeamGroupMaxSpanSteps({ minMidi: 36, maxMidi: 84 })).toBe(14)
  })

  it("covers every written key's spelling of any interval a register window can hold", () => {
    for (let windowSemitones = 12; windowSemitones <= 36; windowSemitones += 1) {
      const maxSteps = planBeamGroupMaxSpanSteps({ minMidi: 0, maxMidi: 2 * windowSemitones })
      for (const collection of COLLECTIONS) {
        for (let tonic = 0; tonic < 12; tonic += 1) {
          const key = spellWrittenKey(tonic as PitchClassNumber, collection)
          expect(widestSpelledSpan(key, windowSemitones)).toBeLessThanOrEqual(maxSteps)
        }
      }
    }
  })

  it('reaches an up-stemmed B5 in a beam group for written C2 to C6', () => {
    // B5 sits 3 steps over the top line: 15, plus its stem and chord symbol, 52, plus the marker.
    expect(planStaffInk(inTreble({ minMidi: 36, maxMidi: 84 })).aboveTopLineUnits).toBe(
      15 + 35 + 17 + 15,
    )
  })
})
