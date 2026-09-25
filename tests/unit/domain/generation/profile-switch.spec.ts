import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { makeRational, WHOLE_NOTE } from '@/domain/time/rational'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeMeasure } from '@/domain/events/measure'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import {
  C_KEYBOARD_PROFILE,
  BB_TENOR_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import {
  buildRegisterIntent,
  resolveRegisterIntentCandidate,
} from '@/domain/profile/register-intent'
import { registerTieKey } from '@/domain/profile/register-tie-key'
import { CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'
import { evaluateProfileSwitch } from '@/domain/generation/profile-switch'

const EXISTING_SEED = makeSeed(0xabc123)
const FRESH_SEED = makeSeed(0x999999)
const FIXED_REGISTERS = ['Low', 'Middle', 'High'] as const

function singlePitchTimeline(pitch: number): ConcertEventTimeline {
  const measures = [0, 1, 2, 3].map((measureIndex) =>
    makeMeasure(measureIndex, [
      makeNoteEvent({
        duration: WHOLE_NOTE,
        pitch: makeConcertPitch(pitch),
        tieContinuation: false,
      }),
    ]),
  )
  return makeConcertEventTimeline(measures)
}

function mixedTimeline(pitches: readonly [number, number, number, number]): ConcertEventTimeline {
  const measures = pitches.map((pitch, measureIndex) =>
    makeMeasure(measureIndex, [
      makeNoteEvent({
        duration: WHOLE_NOTE,
        pitch: makeConcertPitch(pitch),
        tieContinuation: false,
      }),
    ]),
  )
  return makeConcertEventTimeline(measures)
}

function candidatePitchOutsideWindowButInsideActiveRange(
  window: { readonly minMidi: number; readonly maxMidi: number },
  profile: typeof C_KEYBOARD_PROFILE,
): number {
  return window.maxMidi < profile.concertRange.maxMidi ? window.maxMidi + 1 : window.minMidi - 1
}

// @test-link [[module_phrase_generation_profile_policy]]
// @test-link [[rule_profile_switch_validates_phrase]]
describe('evaluateProfileSwitch: explicit Low/Middle/High resolution', () => {
  it.each(FIXED_REGISTERS)(
    'retains within the %s window and regenerates with the caller-supplied fresh seed outside it',
    (register) => {
      const candidate = resolveRegisterIntentCandidate(
        buildRegisterIntent(C_KEYBOARD_PROFILE, register),
        register,
      )
      const retainedTimeline = singlePitchTimeline(
        Math.round((candidate.window.minMidi + candidate.window.maxMidi) / 2),
      )
      const retained = evaluateProfileSwitch({
        timeline: retainedTimeline,
        currentRegister: register,
        existingSeed: EXISTING_SEED,
        newProfile: C_KEYBOARD_PROFILE,
        freshSeed: FRESH_SEED,
      })

      expect(retained.kind).toBe('retain')
      if (retained.kind === 'retain') {
        expect(retained.timeline).toBe(retainedTimeline)
        expect(retained.register).toBe(register)
        expect(retained.registerWindow).toEqual(candidate.window)
      }

      const regenerated = evaluateProfileSwitch({
        timeline: singlePitchTimeline(
          candidatePitchOutsideWindowButInsideActiveRange(candidate.window, C_KEYBOARD_PROFILE),
        ),
        currentRegister: register,
        existingSeed: EXISTING_SEED,
        newProfile: C_KEYBOARD_PROFILE,
        freshSeed: FRESH_SEED,
      })

      expect(regenerated.kind).toBe('regenerate')
      if (regenerated.kind === 'regenerate') {
        expect(regenerated.reason.kind).toBe('EventOutsideRegisterWindow')
        expect(regenerated.seed).toBe(FRESH_SEED)
      }
    },
  )

  it('never transposes source events: a retained timeline is byte-identical to the input', () => {
    const timeline = singlePitchTimeline(54)

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Low',
      existingSeed: EXISTING_SEED,
      newProfile: C_KEYBOARD_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('retain')
    if (result.kind === 'retain') {
      for (let measureIndex = 0; measureIndex < 4; measureIndex += 1) {
        expect(result.timeline.measures[measureIndex]).toBe(timeline.measures[measureIndex])
      }
    }
  })

  it('regenerates when an event falls outside the new active concert range', () => {
    // B-flat tenor active range is 46-70; 80 lies outside it entirely.
    const timeline = mixedTimeline([55, 80, 55, 55])

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Middle',
      existingSeed: EXISTING_SEED,
      newProfile: BB_TENOR_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('regenerate')
    if (result.kind === 'regenerate') {
      expect(result.reason.kind).toBe('EventOutsideActiveRange')
      expect(result.seed).toBe(FRESH_SEED)
    }
  })

  it('uses the corresponding new-profile window for Middle/High, not the old profile window', () => {
    // E-flat alto High window: active range 51-75, S = max(12, ceil(24/2))=12, High=[63,75].
    const timeline = singlePitchTimeline(70)

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'High',
      existingSeed: EXISTING_SEED,
      newProfile: EB_ALTO_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('retain')
    if (result.kind === 'retain') {
      expect(result.register).toBe('High')
      expect(result.registerWindow).toEqual(
        resolveRegisterIntentCandidate(buildRegisterIntent(EB_ALTO_PROFILE, 'High'), 'High').window,
      )
    }
  })
})

// @test-link [[rule_profile_switch_validates_phrase]]
describe('evaluateProfileSwitch: Varying resolution', () => {
  it('resolves from the new non-keyboard profile with the existing seed (minimum tie key)', () => {
    const intent = buildRegisterIntent(BB_TENOR_PROFILE, 'Varying')
    const keysById = Object.fromEntries(
      CANONICAL_REGISTER_ORDER.map((id) => [id, registerTieKey(EXISTING_SEED, intent, id)]),
    )
    const expectedId = CANONICAL_REGISTER_ORDER.reduce((best, id) =>
      keysById[id]! < keysById[best]! ? id : best,
    )
    const expectedCandidate = resolveRegisterIntentCandidate(intent, expectedId)

    // Construct a timeline that fits the expected candidate's window exactly at its midpoint.
    const midpoint = Math.round(
      (expectedCandidate.window.minMidi + expectedCandidate.window.maxMidi) / 2,
    )
    const timeline = singlePitchTimeline(midpoint)

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Varying',
      existingSeed: EXISTING_SEED,
      newProfile: BB_TENOR_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('retain')
    if (result.kind === 'retain') {
      expect(result.register).toBe(expectedId)
      expect(result.registerWindow).toEqual(expectedCandidate.window)
      expect(result.activeConcertRange).toEqual(BB_TENOR_PROFILE.concertRange)
    }
  })

  it('regenerates with the caller-supplied fresh seed when its selected candidate fails containment', () => {
    const intent = buildRegisterIntent(EB_ALTO_PROFILE, 'Varying')
    const selectedId = CANONICAL_REGISTER_ORDER.reduce((best, id) =>
      registerTieKey(EXISTING_SEED, intent, id) < registerTieKey(EXISTING_SEED, intent, best)
        ? id
        : best,
    )
    const selectedCandidate = resolveRegisterIntentCandidate(intent, selectedId)

    const result = evaluateProfileSwitch({
      timeline: singlePitchTimeline(
        candidatePitchOutsideWindowButInsideActiveRange(selectedCandidate.window, EB_ALTO_PROFILE),
      ),
      currentRegister: 'Varying',
      existingSeed: EXISTING_SEED,
      newProfile: EB_ALTO_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('regenerate')
    if (result.kind === 'regenerate') {
      expect(result.reason.kind).toBe('EventOutsideRegisterWindow')
      expect(result.seed).toBe(FRESH_SEED)
    }
  })

  it('is deterministic: repeated evaluation with the same seed resolves the same candidate', () => {
    const timeline = singlePitchTimeline(60)

    const first = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Varying',
      existingSeed: EXISTING_SEED,
      newProfile: C_KEYBOARD_PROFILE,
      freshSeed: FRESH_SEED,
    })
    const second = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Varying',
      existingSeed: EXISTING_SEED,
      newProfile: C_KEYBOARD_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(first).toEqual(second)
  })
})

describe('evaluateProfileSwitch: rest events are not pitch-checked', () => {
  it('retains a phrase containing rest events that fit tiling but carry no pitch', () => {
    const measures = [0, 1, 2, 3].map((measureIndex) =>
      makeMeasure(measureIndex, [
        makeNoteEvent({
          duration: makeRational(1, 2),
          pitch: makeConcertPitch(54),
          tieContinuation: false,
        }),
        makeRestEvent({ duration: makeRational(1, 2) }),
      ]),
    )
    const timeline = makeConcertEventTimeline(measures)

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Low',
      existingSeed: EXISTING_SEED,
      newProfile: C_KEYBOARD_PROFILE,
      freshSeed: FRESH_SEED,
    })

    expect(result.kind).toBe('retain')
  })
})

// @test-link [[module_phrase_generation_profile_policy]]
describe('evaluateProfileSwitch: independence from display-mode selection', () => {
  it('the retain/regenerate decision does not accept or depend on any display-convention input', () => {
    const timeline = singlePitchTimeline(54)

    const result = evaluateProfileSwitch({
      timeline,
      currentRegister: 'Low',
      existingSeed: EXISTING_SEED,
      newProfile: C_KEYBOARD_PROFILE,
      freshSeed: FRESH_SEED,
      // @ts-expect-error display convention is not a parameter of a profile-switch request
      displayConvention: 'concert',
    })

    expect(result.kind).toBe('retain')
  })
})
