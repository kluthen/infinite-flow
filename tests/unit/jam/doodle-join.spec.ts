// @vitest-environment node
/**
 * Phrase 1's join from the doodle (master spec C5.9): the doodle's last note crosses as a carry-in
 * from no phrase (its concert pitch, no arriving interval, no owed recovery, no chord) in the
 * window the register reading carries, the one holding the note (nearest centre, Middle on a tie);
 * no join when the note lies outside the instrument's range or every window, the steering block
 * still in the request. Over the doodle set and every built-in instrument, phrase 1 generated with
 * the join opens with an interval that obeys the limits of two notes inside a phrase, owing the
 * doodle nothing, and phrase 1 hands phrase 2 v2's carry-in.
 */
import { describe, expect, it } from 'vitest'

import type { Leapiness } from '@/domain/controls/generation-controls'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  makeGenerationIntent,
  type GenerationIntent,
  type GenerationIntentInput,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { carriedMotionState } from '@/domain/pitch/pitch-carry-in'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
  isBuiltInInstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import { makeRegisterWindow, registerWindowContainsPitch } from '@/domain/profile/register-window'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { makeSeed } from '@/domain/random/seed'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { readDoodleControls, readDoodleRegister } from '@/jam/doodle-controls'
import { doodleJoin } from '@/jam/doodle-join'
import { buildSteeringBlock } from '@/jam/steering-block-builder'

import { attackMidis, type SuccessOutcome } from '../domain/generation/carry-in/carry-in-fixture'
import { doodleOf } from './doodle-builders'
import { loadDoodleSet } from './doodle-set'

const DOODLES = loadDoodleSet()
const INSTRUMENTS: readonly InstrumentProfile[] = [
  C_KEYBOARD_PROFILE,
  BB_TENOR_PROFILE,
  EB_ALTO_PROFILE,
]

/** The adjacent-interval ceiling of each leapiness level, restated from the melodic policy. */
const MAX_INTERVAL: Readonly<Record<Leapiness, number>> = {
  Smooth: 4,
  Shaped: 7,
  Leaping: 10,
  Angular: 12,
}

/** Intent: the register windows of an instrument, as the generator derives them. */
function windowsOf(instrument: InstrumentProfile) {
  return deriveRegisterWindowCandidates(instrument.concertRange, instrument.registerWindows)
}

/** Intent: phrase 1's join from a doodle for an instrument, with the register read from it. */
function joinFor(doodle: QuantizedDoodle, instrument: InstrumentProfile) {
  return doodleJoin(doodle, instrument, readDoodleRegister(doodle, windowsOf(instrument)))
}

/** Intent: a one-measure doodle of a few steps ending on `last`, its earlier notes held near it. */
function endingOn(last: number): QuantizedDoodle {
  return doodleOf(1, [
    [0, 4, last - 2],
    [4, 4, last - 1],
    [8, 4, last],
  ])
}

/**
 * Intent: phrase 1's intent input for a doodle on an instrument, in C Ionian: the controls the
 * doodle sets (the register the reading carries among them), the rest at session mode's
 * first-visit values, and the steering block at Near, Jam's first drift.
 */
function phraseOneInput(
  doodle: QuantizedDoodle,
  instrument: InstrumentProfile,
  label: string,
): { input: GenerationIntentInput; steering: SteeringBlock; leapiness: Leapiness } {
  const readings = readDoodleControls(doodle, windowsOf(instrument), {
    belowTabletLandscape: false,
    sessionSteppedDown: false,
  })
  const steering = buildSteeringBlock(doodle, 'Near')
  const instrumentProfileId = instrument.id
  if (!isBuiltInInstrumentProfileId(instrumentProfileId))
    throw new Error(`Expected a built-in instrument, got ${instrumentProfileId}.`)
  const controls = makeGenerationControls({
    ...DEFAULT_GENERATION_CONTROLS,
    tonalCenter: 'C',
    collection: 'Ionian',
    instrumentProfileId,
    noteDensity: readings.noteDensity.value,
    rhythmicVariety: readings.rhythmicVariety.value,
    syncopation: readings.syncopation.value,
    silenceDensity: readings.silenceDensity.value,
    contour: readings.contour.value,
    leapiness: readings.leapiness.value,
    register: readings.register.value,
  })
  return {
    input: {
      requestId: makeRequestId(`doodle-join-${label}`),
      seed: makeSeed(7),
      controls,
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      steering,
    },
    steering,
    leapiness: controls.leapiness,
  }
}

/** Intent: generate a phrase, failing the test with its code when the generator fails. */
function generated(intent: GenerationIntent): SuccessOutcome {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success')
    throw new Error(`Expected a successful phrase, got ${outcome.code}.`)
  return outcome
}

/** Intent: the independent validator's verdict on an outcome of an intent. */
function verdictOf(intent: GenerationIntent, outcome: SuccessOutcome) {
  return validateGenerationResult({
    intent,
    request: outcome.request,
    result: outcome.result,
    provenance: outcome.provenance,
  })
}

// @test-link [[rule_jam_phrase_one_joins_doodle]]
// @test-link [[rule_jam_register_follows_doodle]]
describe('the join from the doodle: the window holding the last note', () => {
  it('carries the last note as from no phrase: no interval, no recovery, no chord', () => {
    const join = joinFor(endingOn(64), C_KEYBOARD_PROFILE)

    expect(join).toEqual({
      kind: 'join',
      register: 'High',
      carryIn: {
        origin: 'none',
        lastPitch: { midi: 64, arrivingInterval: null, recovery: { kind: 'settled' } },
        registerWindow: makeRegisterWindow(60, 72),
        finalHarmony: null,
      },
    })
    expect(Object.isFrozen(join)).toBe(true)
  })

  it('takes the window the register reading carries, the nearest by its centre among several', () => {
    const doodle = endingOn(58)
    const reading = readDoodleRegister(doodle, windowsOf(C_KEYBOARD_PROFILE))
    const join = doodleJoin(doodle, C_KEYBOARD_PROFILE, reading)

    expect(reading.value).toBe('Middle')
    expect(join.kind === 'join' && join.register).toBe('Middle')
    expect(join.kind === 'join' && join.carryIn.registerWindow).toEqual(reading.window?.window)
  })

  it('takes Middle on a tie with Low and on a tie with High (spec D441)', () => {
    for (const last of [57, 63]) {
      const join = joinFor(endingOn(last), C_KEYBOARD_PROFILE)
      expect(join.kind === 'join' && join.register).toBe('Middle')
      expect(join.kind === 'join' && join.carryIn.registerWindow).toEqual(
        makeRegisterWindow(54, 66),
      )
    }
  })

  it('takes the only window holding the last note at either end of the range', () => {
    expect(joinFor(endingOn(50), C_KEYBOARD_PROFILE)).toMatchObject({ register: 'Low' })
    expect(joinFor(endingOn(72), C_KEYBOARD_PROFILE)).toMatchObject({ register: 'High' })
  })

  it('refuses a register reading whose window does not hold the last note', () => {
    const [low] = windowsOf(C_KEYBOARD_PROFILE)
    expect(() =>
      doodleJoin(endingOn(70), C_KEYBOARD_PROFILE, {
        value: 'Low',
        source: 'doodle',
        window: low!,
      }),
    ).toThrow(CarryInError)
  })
})

// @test-link [[rule_jam_phrase_one_joins_doodle]]
// @test-link [[rule_instrument_profile_range]]
describe('no join from the doodle', () => {
  it('has none when the last note lies outside the instrument range, at either end', () => {
    expect(joinFor(endingOn(47), C_KEYBOARD_PROFILE)).toEqual({
      kind: 'none',
      reason: 'outside-range',
    })
    expect(joinFor(endingOn(73), C_KEYBOARD_PROFILE)).toEqual({
      kind: 'none',
      reason: 'outside-range',
    })
    expect(joinFor(endingOn(73), EB_ALTO_PROFILE)).toMatchObject({ kind: 'join', register: 'High' })
  })

  it('has none when the last note lies outside every window (the register reads Varying)', () => {
    const join = doodleJoin(endingOn(60), C_KEYBOARD_PROFILE, {
      value: 'Varying',
      source: 'doodle',
      window: null,
    })
    expect(join).toEqual({ kind: 'none', reason: 'outside-windows' })
  })

  it('meets outside every window only outside the range: the windows cover every range', () => {
    for (const instrument of INSTRUMENTS) {
      const { minMidi, maxMidi } = instrument.concertRange
      for (let pitch = minMidi; pitch <= maxMidi; pitch += 1)
        expect(
          windowsOf(instrument).some((candidate) =>
            registerWindowContainsPitch(candidate.window, pitch),
          ),
        ).toBe(true)
    }
  })

  it('keeps the steering block in the request of a phrase 1 without the join', () => {
    const outsideRange = DOODLES.filter((fixture) => fixture.traits.lastNote === 'outside-range')
    expect(outsideRange.length).toBeGreaterThan(0)
    for (const fixture of outsideRange) {
      expect(joinFor(fixture.quantized, C_KEYBOARD_PROFILE)).toEqual({
        kind: 'none',
        reason: 'outside-range',
      })
      const { input, steering } = phraseOneInput(
        fixture.quantized,
        C_KEYBOARD_PROFILE,
        fixture.name,
      )
      const intent = makeGenerationIntent(input)
      const outcome = generated(intent)

      expect(outcome.request.steering).toEqual(steering)
      expect(outcome.request.carryIn).toBeUndefined()
      expect(verdictOf(intent, outcome)).toEqual({ kind: 'valid_generation_result' })
    }
  })
})

/** One phrase 1 generated with the join over the set: what the report lists per doodle. */
interface JoinRecord {
  readonly doodle: string
  readonly instrument: string
  readonly window: string
  readonly firstInterval: number
}

const joinsMade: JoinRecord[] = []

/**
 * Intent: phrase 1 of one doodle on one instrument, generated with the join: valid by the
 * independent validator (which judges the join by the in-phrase rules), its first interval within
 * the leapiness ceiling, inside the joined window, owing the doodle nothing; and the carry-in
 * phrase 1 hands phrase 2 is v2's, numbered 1, which phrase 2's request accepts.
 */
function assertPhraseOneJoins(
  doodle: QuantizedDoodle,
  instrument: InstrumentProfile,
  name: string,
  carryIn: CarryIn,
): void {
  const { input, steering, leapiness } = phraseOneInput(doodle, instrument, name)
  const intent = makeCarryInGenerationIntent({ ...input, carryIn })
  const outcome = generated(intent)

  expect(verdictOf(intent, outcome)).toEqual({ kind: 'valid_generation_result' })
  expect(outcome.request.carryIn).toEqual(carryIn)
  expect(outcome.request.steering).toEqual(steering)
  expect(outcome.request.registerWindow).toEqual(carryIn.registerWindow)
  const midis = attackMidis(outcome.result.timeline.measures)
  const firstInterval = midis[0]! - carryIn.lastPitch.midi
  expect(Math.abs(firstInterval)).toBeLessThanOrEqual(MAX_INTERVAL[leapiness])
  for (const midi of midis)
    expect(registerWindowContainsPitch(carryIn.registerWindow, midi)).toBe(true)
  expect(carriedMotionState(carryIn)).not.toHaveProperty('debt')

  const phraseTwoCarryIn = deriveCarryIn({ intent, outcome, phraseNumber: 1 })
  expect(phraseTwoCarryIn.phraseNumber).toBe(1)
  expect(phraseTwoCarryIn.registerWindow).toEqual(carryIn.registerWindow)
  expect(() =>
    makeCarryInGenerationIntent({
      ...input,
      requestId: makeRequestId(`doodle-join-${name}-phrase-2`),
      carryIn: phraseTwoCarryIn,
    }),
  ).not.toThrow()

  joinsMade.push({
    doodle: name,
    instrument: instrument.id,
    window: `${carryIn.registerWindow.minMidi}-${carryIn.registerWindow.maxMidi}`,
    firstInterval,
  })
}

// @test-link [[rule_jam_phrase_one_joins_doodle]]
// @test-link [[rule_jam_register_follows_doodle]]
// @test-link [[rule_instrument_profile_range]]
describe('phrase 1 joined from each doodle of the set', () => {
  it.each(
    INSTRUMENTS.flatMap((instrument) =>
      DOODLES.map((fixture) => ({
        fixture,
        instrument,
        label: `${fixture.name}, ${instrument.id}`,
      })),
    ),
  )(
    '$label: joins inside the window or not at all, its first interval a phrase interval',
    ({ fixture, instrument }) => {
      const join = joinFor(fixture.quantized, instrument)
      const last = fixture.quantized.notes[fixture.quantized.notes.length - 1]!.pitch
      const { minMidi, maxMidi } = instrument.concertRange
      if (last < minMidi || last > maxMidi) {
        expect(join).toEqual({ kind: 'none', reason: 'outside-range' })
        return
      }
      if (join.kind !== 'join') throw new Error(`Expected a join for ${fixture.name}.`)
      if (instrument === C_KEYBOARD_PROFILE) expect(fixture.traits.lastNote).toBe('inside-windows')
      assertPhraseOneJoins(fixture.quantized, instrument, fixture.name, join.carryIn)
    },
  )

  it('joins every keyboard doodle whose last note lies inside the windows, and only those', () => {
    const keyboardJoins = joinsMade.filter((record) => record.instrument === C_KEYBOARD_PROFILE.id)
    const inside = DOODLES.filter((fixture) => fixture.traits.lastNote === 'inside-windows')
    expect(keyboardJoins.map((record) => record.doodle).sort()).toEqual(
      inside.map((fixture) => fixture.name).sort(),
    )
  })

  it('takes in a doodle ending on a wide leap, owing no recovery on phrase 1', () => {
    const endsOnLeap = DOODLES.filter((fixture) => {
      const notes = fixture.quantized.notes
      return (
        notes.length >= 2 &&
        Math.abs(notes[notes.length - 1]!.pitch - notes[notes.length - 2]!.pitch) >= 7 &&
        joinsMade.some((record) => record.doodle === fixture.name)
      )
    })
    expect(endsOnLeap.length).toBeGreaterThan(0)
  })
})
