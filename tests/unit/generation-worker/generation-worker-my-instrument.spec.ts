// @vitest-environment node
/**
 * My instrument across the generation worker: its profile travels as data in the intent, is
 * validated at the worker boundary by the profile parser and my instrument's own rules (rebuilt
 * from its written range and transposition and compared), and a generation with it crosses the
 * worker with every note inside its concert range. A malformed profile is refused with a typed
 * error, and a built-in profile whose data was altered is still refused by the rebuild-and-compare.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import {
  parseGenerationWorkerPrewarm,
  parseGenerationWorkerRequest,
} from '@/generation-worker/generation-worker-inbound'
import {
  GenerationWorkerProtocolError,
  parseGenerationWorkerResponse,
} from '@/generation-worker/generation-worker-protocol'
import { createGenerationWorkerRuntime } from '@/generation-worker/generation-worker-runtime'
import {
  BASE_CONTROLS,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'

/** My instrument written C3 to C6 (MIDI 48 to 84), sounding a minor third lower. */
const MINOR_THIRD_LOWER = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 84 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

/** Intent: a real intent for my instrument (or a built-in with `profile` absent), with a seed. */
function myInstrumentIntent(
  seed: number,
  profile: InstrumentProfile = MINOR_THIRD_LOWER.profile,
): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(`my-instrument-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      tonalCenter: 'D',
      instrumentProfileId: 'my-instrument',
    }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    instrumentProfile: profile,
  })
}

/** Intent: a generate message for an intent, as it reaches the worker after `postMessage`. */
function wire(intent: GenerationIntent) {
  return structuredClone({ type: 'generate', id: 1, intent })
}

/** Intent: the message with its intent's instrument profile replaced by `profile`. */
function withProfile(message: ReturnType<typeof wire>, profile: unknown) {
  return { ...message, intent: { ...message.intent, instrumentProfile: profile } }
}

/** Intent: every note pitch of a timeline, in order. */
function notePitches(intent: GenerationIntent): readonly number[] {
  const outcome = generateSuccess(intent)
  return outcome.result.timeline.measures.flatMap((measure) =>
    measure.events.flatMap((event) => (event.kind === 'note' ? [event.pitch as number] : [])),
  )
}

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_my_instrument]]
describe('a generation with my instrument crosses the worker', () => {
  // @test-link [[module_generation_worker_protocol]]
  it('answers a generate request with a phrase whose every note lies in the concert range', () => {
    const runtime = createGenerationWorkerRuntime({ now: () => 0, scheduleSlice: () => {} })
    const response = parseGenerationWorkerResponse(
      structuredClone(runtime.handleMessage(wire(myInstrumentIntent(7)))),
    )

    expect(response.type).toBe('outcome')
    if (response.type !== 'outcome') return
    expect(response.outcome.kind).toBe('generation_success')
    if (response.outcome.kind !== 'generation_success') return
    const { activeConcertRange } = response.outcome.request
    expect(activeConcertRange).toMatchObject({ minMidi: 45, maxMidi: 81 })
    const pitches = response.outcome.result.timeline.measures.flatMap((measure) =>
      measure.events.flatMap((event) => (event.kind === 'note' ? [event.pitch as number] : [])),
    )
    expect(pitches.length).toBeGreaterThan(0)
    for (const pitch of pitches) {
      expect(pitch).toBeGreaterThanOrEqual(45)
      expect(pitch).toBeLessThanOrEqual(81)
    }
  })

  // @test-link [[entity_my_instrument]]
  it('parses the intent back exactly, its profile carried as data', () => {
    const intent = myInstrumentIntent(7)
    const parsed = parseGenerationWorkerRequest(wire(intent))

    expect(parsed.intent).toStrictEqual(intent)
    expect(parsed.intent.instrumentProfile).toStrictEqual(MINOR_THIRD_LOWER.profile)
    expect(parsed.intent.writtenTonalCenter).toBe('D')
    expect(parsed.intent.controls.tonalCenter).toBe('B')
  })

  // @test-link [[module_generation_worker_protocol]]
  it('carries the profile unchanged through a prewarm message', () => {
    const intent = myInstrumentIntent(9)
    const parsed = parseGenerationWorkerPrewarm(structuredClone({ type: 'prewarm', intent }))

    expect(parsed.intent).toStrictEqual(intent)
  })

  // @test-link [[module_generation_worker_protocol]]
  it('carries the profile through a carry-in intent', () => {
    const first = myInstrumentIntent(7)
    const carryIn = carryInAfter(first, generateSuccess(first), 2)
    const intent = makeCarryInGenerationIntent({
      requestId: makeRequestId('my-instrument-carry-in'),
      seed: makeSeed(8),
      controls: { ...first.controls, tonalCenter: first.writtenTonalCenter },
      figureLevels: first.figureLevels,
      instrumentProfile: first.instrumentProfile,
      carryIn,
    })

    expect(parseGenerationWorkerRequest(wire(intent)).intent).toStrictEqual(intent)
  })

  // @test-link [[entity_my_instrument]]
  it('generates the same phrase for two my instruments differing only by display name', () => {
    const renamed = makeMyInstrument({
      template: 'bb-tenor',
      name: 'Another name',
      clef: 'treble',
      writtenRange: { minMidi: 48, maxMidi: 84 },
      transposition: { octaves: 0, semitones: 3, direction: 'lower' },
    })
    const parsed = parseGenerationWorkerRequest(wire(myInstrumentIntent(7, renamed.profile)))

    expect(notePitches(parsed.intent)).toEqual(notePitches(myInstrumentIntent(7)))
  })
})

// @test-link [[module_generation_worker_protocol]]
// @test-link [[rule_my_instrument_range_limits]]
describe("the worker applies no clef bound to my instrument's profile", () => {
  // @test-link [[module_generation_worker_protocol]]
  it('lets a bass-clef my instrument written below C2 cross the worker and generate', () => {
    const lowInBass = makeMyInstrument({
      template: 'bb-tenor',
      name: 'Low tenor',
      clef: 'bass',
      writtenRange: { minMidi: 28, maxMidi: 52 },
      transposition: { octaves: 1, semitones: 2, direction: 'lower' },
    })
    const intent = myInstrumentIntent(41, lowInBass.profile)
    const parsed = parseGenerationWorkerRequest(wire(intent))
    expect(parsed.intent.instrumentProfile).toEqual(lowInBass.profile)
    const pitches = notePitches(parsed.intent)
    expect(pitches.length).toBeGreaterThan(0)
    for (const pitch of pitches) {
      expect(pitch).toBeGreaterThanOrEqual(lowInBass.profile.concertRange.minMidi)
      expect(pitch).toBeLessThanOrEqual(lowInBass.profile.concertRange.maxMidi)
    }
  })
})

// @test-link [[module_generation_worker_protocol]]
// @test-link [[entity_my_instrument]]
describe('the worker refuses a malformed my-instrument profile with a typed error', () => {
  const message = wire(myInstrumentIntent(7))
  const profile = message.intent.instrumentProfile

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a range of 23 semitones', () => {
    const narrow = { ...profile, concertRange: { ...profile.concertRange, maxMidi: 68 } }
    expect(() => parseGenerationWorkerRequest(withProfile(message, narrow))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a transposition whose letter steps are not the interval table’s', () => {
    const respelled = { ...profile, transposition: { chromatic: 3, diatonic: 1 } }
    expect(() => parseGenerationWorkerRequest(withProfile(message, respelled))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses register windows set by hand', () => {
    const handSet = { ...profile, registerWindows: { ...profile.registerWindows, minimumSpan: 13 } }
    expect(() => parseGenerationWorkerRequest(withProfile(message, handSet))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a range that sounds below MIDI note 0', () => {
    const low = { ...profile, concertRange: { ...profile.concertRange, minMidi: -3, maxMidi: 33 } }
    expect(() => parseGenerationWorkerRequest(withProfile(message, low))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses an extra field, a wrong kind tag and a missing profile', () => {
    expect(() =>
      parseGenerationWorkerRequest(withProfile(message, { ...profile, clef: 'bass' })),
    ).toThrow(GenerationWorkerProtocolError)
    expect(() =>
      parseGenerationWorkerRequest(withProfile(message, { ...profile, kind: 'Profile' })),
    ).toThrow(GenerationWorkerProtocolError)
    expect(() => parseGenerationWorkerRequest(withProfile(message, undefined))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a built-in profile’s data under the my-instrument id', () => {
    const tenor = createGenerationIntent({
      requestId: makeRequestId('tenor'),
      seed: makeSeed(7),
      controls: makeGenerationControls({ ...BASE_CONTROLS, instrumentProfileId: 'bb-tenor' }),
      musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    }).instrumentProfile
    expect(() =>
      parseGenerationWorkerRequest(withProfile(message, structuredClone(tenor))),
    ).toThrow(GenerationWorkerProtocolError)
  })
})

// @test-link [[module_generation_worker_protocol]]
describe('a built-in profile is still rebuilt from its id and compared', () => {
  const builtIn = wire(
    createGenerationIntent({
      requestId: makeRequestId('tenor'),
      seed: makeSeed(7),
      controls: makeGenerationControls({ ...BASE_CONTROLS, instrumentProfileId: 'bb-tenor' }),
      musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
    }),
  )

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a built-in whose profile data was altered, even into a valid profile', () => {
    const profile = builtIn.intent.instrumentProfile
    const altered = { ...profile, concertRange: { ...profile.concertRange, minMidi: 40 } }
    expect(() => parseGenerationWorkerRequest(withProfile(builtIn, altered))).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  // @test-link [[module_generation_worker_protocol]]
  it('refuses a built-in carrying my instrument’s profile', () => {
    const mine = structuredClone(MINOR_THIRD_LOWER.profile)
    expect(() => parseGenerationWorkerRequest(withProfile(builtIn, mine))).toThrow(
      GenerationWorkerProtocolError,
    )
  })
})
