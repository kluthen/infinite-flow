/**
 * Adapting a carry-in to settings that changed between the phrase it comes from and the phrase it
 * feeds. Every case starts from a real carry-in handed forward by a real generated phrase, and
 * every adapted carry-in is then received by a real intent built with the new settings, so the
 * adaptation and the intent's own fit check are shown to agree.
 */

import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { owedRecoveryCanSettle } from '@/domain/generation/carry-in/phrase-ending-debt'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { RegisterWindowCandidate } from '@/domain/profile/register-window-derivation'
import { adaptCarryIn, type CarryInAdaptation } from '@/session/carry-in-adaptation'
import { SessionEngineError, type SessionSettings } from '@/session/session-types'
import {
  BASE_CONTROLS,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** A real phrase 1 of a session: its intent and the carry-in it hands forward. */
interface PhraseOne {
  readonly intent: GenerationIntent
  readonly carryIn: CarryIn
}

/** Intent: session settings from the fixture's base controls with some of them changed. */
function settings(
  controls: Partial<GenerationControls> = {},
  musicalProfile: MusicalProfile = 'Neutral',
): SessionSettings {
  return {
    controls: makeGenerationControls({ ...BASE_CONTROLS, ...controls }),
    musicalProfile: { musicalProfile, isCustom: true },
  }
}

/** Intent: generate a real phrase 1 under the given settings and take the carry-in it hands on. */
function phraseOne(seed: number, before: SessionSettings): PhraseOne {
  const intent = buildIntent({
    seed,
    controls: before.controls,
    musicalProfile: before.musicalProfile.musicalProfile,
    label: 'adaptation',
  })
  return { intent, carryIn: carryInAfter(intent, generateSuccess(intent), 1) }
}

/** Intent: the instrument's register windows, as the session resolved them for phrase 1. */
function candidatesOf(phrase: PhraseOne): readonly RegisterWindowCandidate[] {
  return phrase.intent.registerIntent.candidates
}

/** Intent: the window of one register among the instrument's windows. */
function windowOf(phrase: PhraseOne, id: RegisterWindowCandidate['id']) {
  return candidatesOf(phrase).find((candidate) => candidate.id === id)!.window
}

/** Intent: build the receiving phrase's intent with the new settings and the given carry-in. */
function receive(after: SessionSettings, carryIn: CarryIn): GenerationIntent {
  return buildIntent({
    seed: 99,
    controls: after.controls,
    musicalProfile: after.musicalProfile.musicalProfile,
    label: 'adaptation-receiver',
    carryIn,
  })
}

/** Intent: adapt a phrase's carry-in from its own settings to new ones. */
function adapt(phrase: PhraseOne, before: SessionSettings, after: SessionSettings) {
  return adaptCarryIn({
    carryIn: phrase.carryIn,
    before,
    after,
    candidates: candidatesOf(phrase),
  })
}

/** Intent: the adapted carry-in of an adaptation that must keep one, failing loudly otherwise. */
function keptCarryIn(adaptation: CarryInAdaptation): CarryIn {
  if (adaptation.kind !== 'carry-in')
    throw new Error(`Expected a carry-in, got standalone ${adaptation.register}.`)
  return adaptation.carryIn
}

/** The fixture's base settings: C keyboard, C Major, Gentle diatonic, Middle (54-66). */
const MIDDLE = settings()
/** C Major, Middle, seed 1: phrase 1 ends on G3 (55), inside Middle 54-66 but below High 60-72. */
const MIDDLE_LOW_PITCH_SEED = 1
/** C Major, Middle, seed 3: phrase 1 ends on D4 (62), inside Middle and High, above Low 48-60. */
const MIDDLE_HIGH_PITCH_SEED = 3
/** C Major, Varying, seed 1: phrase 1 resolves the High window 60-72 and ends on G4 (67). */
const VARYING = settings({ register: 'Varying' })
const VARYING_SEED = 1

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
// @test-link [[rule_register_change_replaces_carried_window]]
describe('adapting a carry-in when no relevant setting changed', () => {
  it('returns the very same carry-in for the same settings', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    const adaptation = adapt(phrase, MIDDLE, settings())
    expect(adaptation.kind).toBe('carry-in')
    expect(keptCarryIn(adaptation)).toBe(phrase.carryIn)
  })

  it('returns the very same carry-in after a density, contour, leapiness or tempo change', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    const after = settings({
      noteDensity: 'Eighth',
      contour: 'Rising',
      leapiness: 'Smooth',
      tempo: 140,
    })
    expect(keptCarryIn(adapt(phrase, MIDDLE, after))).toBe(phrase.carryIn)
  })
})

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
describe('adapting a carry-in after a key or collection change', () => {
  it('drops the harmony and keeps the pitch after a key and collection change', () => {
    const before = settings({ tonalCenter: 'C', collection: 'Ionian' })
    const after = settings({ tonalCenter: 'F#', collection: 'Dorian' })
    const phrase = phraseOne(11, before)
    expect(phrase.carryIn.finalHarmony).not.toBeNull()
    expect(() => receive(after, phrase.carryIn)).toThrow(CarryInError)
    const adapted = keptCarryIn(adapt(phrase, before, after))
    expect(adapted.finalHarmony).toBeNull()
    expect(adapted.lastPitch).toStrictEqual(phrase.carryIn.lastPitch)
    expect(adapted.registerWindow).toStrictEqual(phrase.carryIn.registerWindow)
    expect(adapted.phraseNumber).toBe(phrase.carryIn.phraseNumber)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })

  it('drops the harmony and keeps the pitch after a collection change alone', () => {
    const after = settings({ collection: 'Dorian' })
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(() => receive(after, phrase.carryIn)).toThrow(CarryInError)
    const adapted = keptCarryIn(adapt(phrase, MIDDLE, after))
    expect(adapted.finalHarmony).toBeNull()
    expect(adapted.lastPitch).toStrictEqual(phrase.carryIn.lastPitch)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })
})

// @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
describe('adapting a carry-in after a harmony setting change', () => {
  it('drops a chord the new harmonic motion never ends a phrase on', () => {
    // Gentle diatonic in C Major ends on the open arrival V with the degree-5 chord-tone
    // endpoint; Static ends on its own static degree-5 endpoint, so that chord no longer fits.
    const after = settings({ harmonicMotion: 'Static' })
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(phrase.carryIn.finalHarmony?.endpoint.kind).toBe('tonal_degree_five_chord_tone')
    expect(() => receive(after, phrase.carryIn)).toThrow(CarryInError)
    const adapted = keptCarryIn(adapt(phrase, MIDDLE, after))
    expect(adapted.finalHarmony).toBeNull()
    expect(adapted.lastPitch).toStrictEqual(phrase.carryIn.lastPitch)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })

  it('keeps a chord the new harmonic motion still ends a phrase on', () => {
    const after = settings({ harmonicMotion: 'Active diatonic', tension: 'Build' })
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    const adapted = keptCarryIn(adapt(phrase, MIDDLE, after))
    expect(adapted).toStrictEqual(phrase.carryIn)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })
})

// @test-link [[rule_register_change_replaces_carried_window]]
// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
describe('adapting a carry-in after a register change', () => {
  it('replaces the window and keeps the pitch when it lies inside the new window', () => {
    const after = settings({ register: 'High' })
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(() => receive(after, phrase.carryIn)).toThrow(CarryInError)
    const adapted = keptCarryIn(adapt(phrase, MIDDLE, after))
    expect(adapted.registerWindow).toStrictEqual(windowOf(phrase, 'High'))
    expect(adapted.lastPitch).toStrictEqual(phrase.carryIn.lastPitch)
    expect(adapted.finalHarmony).toStrictEqual(phrase.carryIn.finalHarmony)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })

  it('goes standalone in the new register when the pitch lies above the new window', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(phrase.carryIn.lastPitch.midi).toBeGreaterThan(windowOf(phrase, 'Low').maxMidi)
    expect(adapt(phrase, MIDDLE, settings({ register: 'Low' }))).toStrictEqual({
      kind: 'standalone',
      register: 'Low',
    })
  })

  it('goes standalone in the new register when the pitch lies below the new window', () => {
    const phrase = phraseOne(MIDDLE_LOW_PITCH_SEED, MIDDLE)
    expect(phrase.carryIn.lastPitch.midi).toBeLessThan(windowOf(phrase, 'High').minMidi)
    expect(adapt(phrase, MIDDLE, settings({ register: 'High' }))).toStrictEqual({
      kind: 'standalone',
      register: 'High',
    })
  })

  it('goes standalone with Varying after a change to Varying', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(adapt(phrase, MIDDLE, settings({ register: 'Varying' }))).toStrictEqual({
      kind: 'standalone',
      register: 'Varying',
    })
  })

  it('refuses a new register missing from the given windows, a caller bug', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    const withoutHigh = candidatesOf(phrase).filter((candidate) => candidate.id !== 'High')
    expect(() =>
      adaptCarryIn({
        carryIn: phrase.carryIn,
        before: MIDDLE,
        after: settings({ register: 'High' }),
        candidates: withoutHigh,
      }),
    ).toThrow(SessionEngineError)
  })
})

// @test-link [[rule_varying_register_once_per_session]]
// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @test-link [[rule_key_change_drops_harmonic_carry_in]]
describe('adapting a carry-in while the register stays Varying', () => {
  it('keeps the window resolved for phrase 1 after a key change', () => {
    const after = settings({ register: 'Varying', tonalCenter: 'G' })
    const phrase = phraseOne(VARYING_SEED, VARYING)
    expect(phrase.carryIn.registerWindow).toStrictEqual(windowOf(phrase, 'High'))
    const adapted = keptCarryIn(adapt(phrase, VARYING, after))
    expect(adapted.registerWindow).toStrictEqual(phrase.carryIn.registerWindow)
    expect(adapted.finalHarmony).toBeNull()
    expect(adapted.lastPitch).toStrictEqual(phrase.carryIn.lastPitch)
    expect(receive(after, adapted).carryIn).toStrictEqual(adapted)
  })

  it('goes standalone in the resolved register when the new key cannot repay an owed leap', () => {
    // An owed recovery after a leap down must land 1-4 semitones higher on a tonic-triad tone.
    // On D (a tone of the carried V chord G B D), C Major repays it on E; G Major cannot, since
    // its next tonic-triad tone above D is G, 5 semitones away.
    const after = settings({ register: 'Varying', tonalCenter: 'G' })
    const phrase = phraseOne(VARYING_SEED, VARYING)
    const window = phrase.carryIn.registerWindow
    const owingOnD = makeCarryIn({
      ...phrase.carryIn,
      lastPitch: {
        midi: makeConcertPitch(62),
        arrivingInterval: -7,
        recovery: { kind: 'owed', leapDirection: -1 },
      },
    })
    const cMajor = makeHarmonyCollection('C', 'Major').pitchClasses as readonly number[]
    const gMajor = makeHarmonyCollection('G', 'Major').pitchClasses as readonly number[]
    expect(owedRecoveryCanSettle(62, -1, cMajor, window)).toBe(true)
    expect(owedRecoveryCanSettle(62, -1, gMajor, window)).toBe(false)
    expect(receive(VARYING, owingOnD).carryIn).toStrictEqual(owingOnD)
    const adaptation = adaptCarryIn({
      carryIn: owingOnD,
      before: VARYING,
      after,
      candidates: candidatesOf(phrase),
    })
    expect(adaptation).toStrictEqual({ kind: 'standalone', register: 'High' })
  })
})

// @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @test-link [[rule_register_change_replaces_carried_window]]
describe('carry-in adaptation as a pure function', () => {
  it('gives the same deep-frozen output twice for the same input', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    const after = settings({ register: 'High', collection: 'Dorian' })
    const first = adapt(phrase, MIDDLE, after)
    expect(adapt(phrase, MIDDLE, after)).toStrictEqual(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(keptCarryIn(first))).toBe(true)
  })

  it('refuses settings for two different instruments, a caller bug', () => {
    const phrase = phraseOne(MIDDLE_HIGH_PITCH_SEED, MIDDLE)
    expect(() => adapt(phrase, MIDDLE, settings({ instrumentProfileId: 'bb-tenor' }))).toThrow(
      SessionEngineError,
    )
  })
})
