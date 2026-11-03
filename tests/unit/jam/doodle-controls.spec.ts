// @vitest-environment node
/**
 * The controls read from the doodle (master spec C5.16.1): contour from the half-measure
 * checkpoints, leapiness from the moves scaled to four measures, the register from the window
 * holding the last note (nearest centre, Middle on a tie, Varying when none, the window carried
 * for phrase 1's join); the first-visit value, marked as such, for what the doodle cannot show;
 * a supported combination at both widths, reached by raising rhythmic variety only, judged at the
 * note density as read and at no window width, and marked raised exactly when the step moved it;
 * and the rhythm values each doodle of the set was written to show. Whole numbers only.
 */
import { describe, expect, it } from 'vitest'

import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import {
  doodleContour,
  doodleLeapiness,
  readDoodleControls,
  readDoodleRegister,
  supportedRhythmicVariety,
  type DoodleReadings,
} from '@/jam/doodle-controls'
import { readDoodleRhythmAim } from '@/jam/doodle-rhythm-reading'

import { doodleOf, legatoDoodle, nonIntegerOperations } from './doodle-builders'
import { loadDoodleSet } from './doodle-set'

const DOODLES = loadDoodleSet()

/** The C MIDI keyboard's windows: Low 48–60 (centre 54), Middle 54–66 (60), High 60–72 (66). */
const WINDOWS = deriveRegisterWindowCandidates(
  C_KEYBOARD_PROFILE.concertRange,
  C_KEYBOARD_PROFILE.registerWindows,
)

const WIDE: NoteDensityContext = { belowTabletLandscape: false, sessionSteppedDown: false }
const NARROW: NoteDensityContext = { belowTabletLandscape: true, sessionSteppedDown: false }

/** Intent: a doodle of one note per half measure at the given pitches (two to eight of them). */
function halves(pitches: readonly number[]) {
  const measureCount = pitches.length <= 4 ? 2 : 4
  return legatoDoodle(
    measureCount,
    pitches.map((_, index) => index * 8),
    pitches,
  )
}

/** Intent: the four rhythm values of the readings, as a rhythm setting. */
function rhythmOf(readings: DoodleReadings) {
  return {
    noteDensity: readings.noteDensity.value,
    rhythmicVariety: readings.rhythmicVariety.value,
    syncopation: readings.syncopation.value,
    silenceDensity: readings.silenceDensity.value,
  }
}

// @test-link [[rule_doodle_contour_reading]]
describe('the contour read from a doodle', () => {
  // @test-link [[rule_doodle_contour_reading]]
  it('takes the first note of each half measure as a checkpoint, skipping empty halves', () => {
    const doodle = doodleOf(2, [
      [0, 2, 60],
      [2, 2, 72],
      [16, 4, 62],
      [24, 4, 64],
    ])
    expect(doodleContour(doodle)).toBe('Rising')
  })

  // @test-link [[rule_doodle_contour_reading]]
  it('is Rising when the checkpoints never go down and end above the first; Falling mirrors it', () => {
    expect(doodleContour(halves([60, 60, 62, 62]))).toBe('Rising')
    expect(doodleContour(halves([64, 64, 62, 62]))).toBe('Falling')
    expect(doodleContour(halves([60, 62, 61, 64]))).toBe('Wandering')
  })

  // @test-link [[rule_doodle_contour_reading]]
  it('is Arch when one checkpoint is the single highest, neither first nor last', () => {
    expect(doodleContour(halves([60, 67, 64, 62]))).toBe('Arch')
    expect(doodleContour(halves([60, 67, 67, 62]))).toBe('Wandering')
    expect(doodleContour(halves([67, 60, 64, 62]))).toBe('Wandering')
  })

  // @test-link [[rule_doodle_contour_reading]]
  it('is not shown by fewer than three checkpoints, or all equal', () => {
    expect(doodleContour(legatoDoodle(1, [0, 2, 4, 6], [60, 62, 64, 66]))).toBeNull()
    expect(doodleContour(halves([62, 62, 62, 62]))).toBeNull()
  })
})

/** Intent: a doodle of `measureCount` measures whose neighbouring notes move by the given widths. */
function moving(measureCount: 1 | 2 | 4, widths: readonly number[]) {
  const pitches = widths.reduce<number[]>(
    (line, width, index) => [...line, line[index]! + (index % 2 === 0 ? width : -width)],
    [60],
  )
  return legatoDoodle(
    measureCount,
    pitches.map((_, index) => index),
    pitches,
  )
}

// @test-link [[rule_doodle_leapiness_reading]]
describe('the leapiness read from a doodle', () => {
  // @test-link [[rule_doodle_leapiness_reading]]
  it('is Smooth up to a widest move of 4 half steps', () => {
    expect(doodleLeapiness(moving(1, [4, 2, 4]))).toBe('Smooth')
    expect(doodleLeapiness(moving(2, [5, 2]))).not.toBe('Smooth')
  })

  // @test-link [[rule_doodle_leapiness_reading]]
  it('is Shaped up to 7, with 4 × L ≤ 2 × M and 4 × K ≤ M, scaled by measures', () => {
    expect(doodleLeapiness(moving(2, [5, 2]))).toBe('Shaped')
    expect(doodleLeapiness(moving(2, [5, 5]))).toBe('Leaping')
    expect(doodleLeapiness(moving(4, [5, 5, 2]))).toBe('Shaped')
    expect(doodleLeapiness(moving(4, [5, 5, 5]))).toBe('Leaping')
    expect(doodleLeapiness(moving(4, [7, 2]))).toBe('Shaped')
    expect(doodleLeapiness(moving(4, [7, 7]))).toBe('Leaping')
    expect(doodleLeapiness(moving(2, [7, 2]))).toBe('Leaping')
    expect(doodleLeapiness(moving(4, [8, 2]))).toBe('Leaping')
  })

  // @test-link [[rule_doodle_leapiness_reading]]
  it('is Leaping up to 10, with 4 × L ≤ 4 × M and 4 × K ≤ 2 × M; else Angular', () => {
    expect(doodleLeapiness(moving(1, [10, 2]))).toBe('Angular')
    expect(doodleLeapiness(moving(2, [10, 2]))).toBe('Leaping')
    expect(doodleLeapiness(moving(2, [11, 2]))).toBe('Angular')
    expect(doodleLeapiness(moving(1, [5, 2]))).toBe('Leaping')
    expect(doodleLeapiness(moving(1, [5, 5]))).toBe('Angular')
    expect(doodleLeapiness(moving(2, [5, 5, 5, 5, 2]))).toBe('Angular')
    expect(doodleLeapiness(moving(2, [6, 7]))).toBe('Leaping')
    expect(doodleLeapiness(moving(2, [7, 7]))).toBe('Angular')
  })

  // @test-link [[rule_doodle_leapiness_reading]]
  it('is not shown by one note', () => {
    expect(doodleLeapiness(doodleOf(1, [[0, 4]]))).toBeNull()
  })
})

// @test-link [[rule_jam_register_follows_doodle]]
describe('the register read from a doodle', () => {
  /** Intent: the register read from a doodle whose last note is `pitch`. */
  const endingOn = (pitch: number) =>
    readDoodleRegister(
      doodleOf(1, [
        [0, 4, 60],
        [4, 4, pitch],
      ]),
      WINDOWS,
    )

  // @test-link [[rule_jam_register_follows_doodle]]
  it('is the one window holding the last note, and carries that window for the join', () => {
    const low = endingOn(50)
    expect(low).toMatchObject({ value: 'Low', source: 'doodle' })
    expect(low.window).toBe(WINDOWS.find((candidate) => candidate.id === 'Low'))
    expect(endingOn(70)).toMatchObject({ value: 'High', window: { id: 'High' } })
  })

  // @test-link [[rule_jam_register_follows_doodle]]
  it('is the nearest by its centre when several windows hold the last note', () => {
    expect(endingOn(56).value).toBe('Low')
    expect(endingOn(58).value).toBe('Middle')
    expect(endingOn(60).value).toBe('Middle')
    expect(endingOn(65).value).toBe('High')
  })

  // @test-link [[rule_jam_register_follows_doodle]]
  it('goes to Middle on a tie with Low and on a tie with High', () => {
    expect(endingOn(57)).toMatchObject({ value: 'Middle', window: { id: 'Middle' } })
    expect(endingOn(63)).toMatchObject({ value: 'Middle', window: { id: 'Middle' } })
  })

  // @test-link [[rule_jam_register_follows_doodle]]
  it('is Varying, with no window, when no window holds the last note', () => {
    expect(endingOn(47)).toEqual({ value: 'Varying', source: 'doodle', window: null })
    expect(endingOn(73)).toEqual({ value: 'Varying', source: 'doodle', window: null })
  })
})

// @test-link [[rule_doodle_sets_jam_controls]]
describe('the readings of a doodle', () => {
  // @test-link [[rule_doodle_sets_jam_controls]]
  it('gives a one-note doodle only its register, the six others at their first-visit values', () => {
    const readings = readDoodleControls(doodleOf(1, [[4, 6, 60]]), WINDOWS)
    expect(readings).toEqual({
      noteDensity: { value: 'Quarter', source: 'default' },
      rhythmicVariety: { value: 'Slightly varied', source: 'default', raised: false },
      syncopation: { value: 'Straight', source: 'default' },
      silenceDensity: { value: 'Sparse', source: 'default' },
      contour: { value: 'Arch', source: 'default' },
      leapiness: { value: 'Shaped', source: 'default' },
      register: { value: 'Middle', source: 'doodle', window: WINDOWS[1] },
    })
    expect(Object.isFrozen(readings)).toBe(true)
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('marks every control a doodle shows as read from it', () => {
    const readings = readDoodleControls(halves([60, 67, 64, 62, 60, 62, 64, 62]), WINDOWS)
    expect(Object.values(readings).every((each) => each.source === 'doodle')).toBe(true)
    expect(readings.contour.value).toBe('Arch')
  })

  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('still reads a Sixteenth as Sixteenth below the tablet-landscape width', () => {
    const doodle = legatoDoodle(1, [0, 1, 2, 3, 4, 6, 8, 12])
    expect(readDoodleControls(doodle, WINDOWS).noteDensity).toEqual({
      value: 'Sixteenth',
      source: 'doodle',
    })
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('gives the same readings for the same doodle, windows and width', () => {
    const doodle = DOODLES.find((each) => each.name === 'tresillo-leaps')!.quantized
    expect(readDoodleControls(doodle, WINDOWS)).toEqual(readDoodleControls(doodle, WINDOWS))
  })
})

// @test-link [[rule_doodle_controls_always_supported]]
describe('a supported combination', () => {
  // @test-link [[rule_doodle_controls_always_supported]]
  it('steps rhythmic variety up, Strict to Slightly varied to Heavily varied, while unsupported', () => {
    const quarter = {
      noteDensity: 'Quarter',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    } as const
    expect(supportedRhythmicVariety({ ...quarter, rhythmicVariety: 'Strict' })).toBe(
      'Heavily varied',
    )
    const sixteenth = {
      noteDensity: 'Sixteenth',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    } as const
    expect(supportedRhythmicVariety({ ...sixteenth, rhythmicVariety: 'Strict' })).toBe(
      'Slightly varied',
    )
    expect(
      supportedRhythmicVariety({ ...quarter, rhythmicVariety: 'Strict', syncopation: 'Straight' }),
    ).toBe('Strict')
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('judges the note density as read: a Sixteenth as Sixteenth, at no window width', () => {
    const setting = {
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    } as const
    expect(supportedRhythmicVariety(setting)).toBe('Slightly varied')
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('raises a Sixteenth, Active displacement, Breath-heavy doodle showing no variety to Heavily varied', () => {
    const doodle = doodleOf(1, [
      [0, 1],
      [1, 4],
    ])
    expect(readDoodleRhythmAim(doodle)).toEqual({
      noteDensity: 'Sixteenth',
      rhythmicVariety: null,
      syncopation: 'Active displacement',
      silenceDensity: 'Breath-heavy',
    })
    const readings = readDoodleControls(doodle, WINDOWS)
    expect(rhythmOf(readings)).toEqual({
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Active displacement',
      silenceDensity: 'Breath-heavy',
    })
    expect(readings.rhythmicVariety).toEqual({
      value: 'Heavily varied',
      source: 'default',
      raised: true,
    })
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('reads no window width: neither the readings nor the step take a window context', () => {
    expect(readDoodleControls).toHaveLength(2)
    expect(supportedRhythmicVariety).toHaveLength(1)
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it.each([
    ['wide', WIDE],
    ['narrow', NARROW],
  ] as const)(
    'holds for every doodle of the set, %s, and moves nothing but the variety',
    (_, context) => {
      for (const { name, quantized } of DOODLES) {
        const readings = readDoodleControls(quantized, WINDOWS)
        expect(isRhythmSettingBlocked(rhythmOf(readings), context), name).toBe(false)
        const aim = readDoodleRhythmAim(quantized)
        expect(readings.noteDensity.value, name).toBe(aim.noteDensity ?? 'Quarter')
        expect(readings.syncopation.value, name).toBe(aim.syncopation ?? 'Straight')
        expect(readings.silenceDensity.value, name).toBe(aim.silenceDensity ?? 'Sparse')
      }
    },
  )
})

/** Intent: the doodle of the set with the given name, quantized. */
function setDoodle(name: string) {
  return DOODLES.find((each) => each.name === name)!.quantized
}

// @test-link [[rule_doodle_controls_always_supported]]
describe("rhythmic variety's raised", () => {
  // @test-link [[rule_doodle_controls_always_supported]]
  it("is true, from the doodle, for a doodle's own variety the step raised", () => {
    const doodle = setDoodle('sixteenth-bursts')
    expect(readDoodleRhythmAim(doodle).rhythmicVariety).toBe('Slightly varied')
    expect(readDoodleControls(doodle, WINDOWS).rhythmicVariety).toEqual({
      value: 'Heavily varied',
      source: 'doodle',
      raised: true,
    })
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('is true, from the default, for a first-visit variety the step raised', () => {
    const doodle = doodleOf(2, [
      [0, 1],
      [1, 4],
    ])
    expect(readDoodleRhythmAim(doodle)).toEqual({
      noteDensity: 'Sixteenth',
      rhythmicVariety: null,
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Breath-heavy',
    })
    expect(readDoodleControls(doodle, WINDOWS).rhythmicVariety).toEqual({
      value: 'Heavily varied',
      source: 'default',
      raised: true,
    })
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('is false, from the default, for a first-visit variety the step left alone', () => {
    const doodle = doodleOf(1, [
      [0, 1],
      [4, 9],
    ])
    expect(readDoodleRhythmAim(doodle).rhythmicVariety).toBeNull()
    expect(readDoodleControls(doodle, WINDOWS).rhythmicVariety).toEqual({
      value: 'Slightly varied',
      source: 'default',
      raised: false,
    })
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it("is false, from the doodle, for a doodle's own variety the step left alone", () => {
    const doodle = setDoodle('quarter-steps')
    expect(readDoodleRhythmAim(doodle).rhythmicVariety).toBe('Strict')
    expect(readDoodleControls(doodle, WINDOWS).rhythmicVariety).toEqual({
      value: 'Strict',
      source: 'doodle',
      raised: false,
    })
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('is false exactly when the variety is the one read or the default, over the doodle set', () => {
    for (const { name, quantized } of DOODLES) {
      const { value, raised } = readDoodleControls(quantized, WINDOWS).rhythmicVariety
      const before = readDoodleRhythmAim(quantized).rhythmicVariety ?? 'Slightly varied'
      expect(raised, name).toBe(value !== before)
    }
  })
})

// @test-link [[module_doodle_controls]]
describe('the doodle set', () => {
  // @test-link [[module_doodle_controls]]
  it.each(DOODLES.map((doodle) => [doodle.name, doodle] as const))(
    '%s gives the rhythm readings recorded with it',
    (_, doodle) => {
      expect(readDoodleRhythmAim(doodle.quantized)).toEqual(doodle.traits.aimedAt)
    },
  )
})

// @test-link [[module_doodle_controls]]
describe('the arithmetic', () => {
  // @test-link [[module_doodle_controls]]
  it.each(['doodle-controls.ts', 'doodle-rhythm-reading.ts'])(
    'of %s is whole numbers only',
    (file) => {
      expect(nonIntegerOperations(new URL(`../../../src/jam/${file}`, import.meta.url))).toEqual({
        divisions: [],
        decimalLiterals: [],
        mathCalls: [],
      })
    },
  )
})
