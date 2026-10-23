// @vitest-environment node
/**
 * The `ifk4.` phrase replay key, the only one written since v3.2: a fixed 9-tuple whose first
 * seven entries keep the `ifk3.` order and meaning, then the request's rhythm lock group and its
 * steering block, each `null` when the request has none. Its carry-in may come from a phrase or,
 * for a Jam's phrase 1, from no phrase (the doodle's join), accepted only beside a steering block
 * and only as phrase 1. Encoding then decoding gives an equal intent and replays to the same
 * phrase, with and without each group, for a built-in and for my instrument. A malformed group is
 * refused naming its slot and the reason; an `ifk5.` key as an unsupported version. No key holds
 * the doodle, its raw notes, the drift or the capture tempo.
 */

import { describe, expect, it, vi } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError, makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  makeRequestRhythmLock,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import type { SteeringBlock } from '@/domain/generation/steering-block'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import {
  announcePhraseReplayKey,
  encodePhraseReplayKey,
  PhraseReplayKeyError,
} from '@/generation-worker/phrase-replay-key'
import { decodePhraseReplayKey } from '@/generation-worker/phrase-replay-key-decode'
import {
  BASE_CONTROLS,
  carryInAfter,
  generateSuccess,
} from '../domain/generation/carry-in/carry-in-fixture'
import { SAMPLE_RHYTHM_LOCK, SAMPLE_STEERING } from '../domain/generation/request-inputs-fixture'

/** Generous per-test timeout: the replay cases generate each phrase twice. */
const TIMEOUT_MS = 120_000

/** A rhythm lock group that is on with nothing locked yet, no change allowed. */
const PENDING_LOCK: RequestRhythmLock = makeRequestRhythmLock({
  state: { kind: 'pending' },
  allowedChanges: [],
  tenserPhrase: false,
})

/** My instrument written C3 to E5, sounding a minor third lower. */
const HORN_IN_A = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in A',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 76 },
  transposition: { octaves: 0, semitones: 3, direction: 'lower' },
})

/** The doodle's join into a Middle phrase 1: a carry-in from no phrase. */
const NO_PHRASE_CARRY_IN = makeCarryIn({
  origin: 'none',
  lastPitch: { midi: makeConcertPitch(60), arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: makeRegisterWindow(54, 66),
  finalHarmony: null,
})

/** The request groups one intent may hold. */
interface Groups {
  readonly rhythmLock?: RequestRhythmLock
  readonly steering?: SteeringBlock
  readonly carryIn?: CarryIn
}

/** Intent: a real intent for a built-in or my instrument, holding the given groups. */
function intentWith(seed: number, groups: Groups, mine = false): GenerationIntent {
  const input = {
    requestId: makeRequestId(`ifk4-${seed}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...BASE_CONTROLS,
      ...(mine ? { tonalCenter: 'D', instrumentProfileId: 'my-instrument' } : {}),
    }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    ...(mine ? { instrumentProfile: HORN_IN_A.profile } : {}),
    ...(groups.rhythmLock === undefined ? {} : { rhythmLock: groups.rhythmLock }),
    ...(groups.steering === undefined ? {} : { steering: groups.steering }),
  }
  return groups.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: groups.carryIn })
}

/** Intent: the carry-in phrase 1 (seed 11) of the same instrument hands forward to phrase 2. */
function phraseCarryIn(mine: boolean): CarryIn {
  const first = intentWith(11, {}, mine)
  return carryInAfter(first, generateSuccess(first), 1)
}

/** Intent: unpadded base64url of raw bytes, for hand-built payloads. */
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** Intent: encode any JSON value as a key of the given version, bypassing the codec's encoder. */
function rawKey(version: string, payload: unknown): string {
  return `${version}.${base64Url(new TextEncoder().encode(JSON.stringify(payload)))}`
}

/** Intent: the JSON payload of a key, read back without the codec's decoder. */
function payloadOf(key: string): unknown[] {
  const payload = key
    .slice(key.indexOf('.') + 1)
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
  const binary = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown[]
}

/** Intent: the valid `ifk4.` 9-tuple of a Jam's phrase 1, as a mutable array to corrupt. */
function validNoPhraseTuple(): unknown[] {
  const intent = intentWith(14, { carryIn: NO_PHRASE_CARRY_IN, steering: SAMPLE_STEERING })
  return payloadOf(encodePhraseReplayKey(intent, 1))
}

/** Intent: a valid `ifk4.` tuple of a locked phrase 1 with one slot replaced. */
function lockedTupleWith(index: number, value: unknown): unknown[] {
  const tuple = payloadOf(
    encodePhraseReplayKey(intentWith(5, { rhythmLock: SAMPLE_RHYTHM_LOCK }), 1),
  )
  tuple[index] = value
  return tuple
}

/** Intent: what a key replays to through the headless worker path, failing loudly on a crash. */
function replayedRaw(key: string): unknown {
  const report = replayPhraseKey(key)
  if (report.output.kind === 'crash') throw new Error(report.output.message)
  return report.output.raw
}

/** Intent: the doodle's join into phrase 1 of the same instrument, inside its Middle window. */
function noPhraseCarryIn(mine: boolean): CarryIn {
  if (!mine) return NO_PHRASE_CARRY_IN
  const candidate = intentWith(14, {}, mine).registerIntent.candidates.find(
    ({ id }) => id === BASE_CONTROLS.register,
  )
  const { minMidi, maxMidi } = candidate!.window
  return makeCarryIn({
    origin: 'none',
    lastPitch: {
      midi: makeConcertPitch(Math.round((minMidi + maxMidi) / 2)),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(minMidi, maxMidi),
    finalHarmony: null,
  })
}

/** Every request group combination, each with its phrase number. */
function groupCases(mine: boolean): readonly (readonly [string, Groups, number])[] {
  const carried = phraseCarryIn(mine)
  const joined = noPhraseCarryIn(mine)
  return [
    ['no group', {}, 1],
    ['the pending lock', { rhythmLock: PENDING_LOCK }, 1],
    ['the locked bars', { rhythmLock: SAMPLE_RHYTHM_LOCK }, 1],
    ['the steering block', { steering: SAMPLE_STEERING }, 1],
    ['both groups', { rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING }, 1],
    ['a carry-in from a phrase and the lock', { carryIn: carried, rhythmLock: PENDING_LOCK }, 2],
    ['the join from no phrase', { carryIn: joined, steering: SAMPLE_STEERING }, 1],
    [
      'the join from no phrase and the lock',
      { carryIn: joined, steering: SAMPLE_STEERING, rhythmLock: SAMPLE_RHYTHM_LOCK },
      1,
    ],
  ]
}

// @test-link [[module_phrase_replay_key]]
describe('the ifk4 key', () => {
  it('is written for every phrase: nine entries, the first seven an ifk3 key would hold', () => {
    const intent = intentWith(5, {})
    const key = encodePhraseReplayKey(intent, 1)
    expect(key).toMatch(/^ifk4\.[A-Za-z0-9_-]+$/u)
    const tuple = payloadOf(key)
    expect(tuple).toHaveLength(9)
    expect(tuple.slice(7)).toEqual([null, null])
    const asIfk3 = decodePhraseReplayKey(rawKey('ifk3', tuple.slice(0, 7)))
    expect(asIfk3.keyVersion).toBe('ifk3')
    expect(asIfk3.intent).toEqual(intent)
  })

  it('holds the rhythm lock group at index 7 and the steering block at index 8', () => {
    const intent = intentWith(5, { rhythmLock: SAMPLE_RHYTHM_LOCK, steering: SAMPLE_STEERING })
    const tuple = payloadOf(encodePhraseReplayKey(intent, 1))
    expect(tuple[7]).toEqual(JSON.parse(JSON.stringify(SAMPLE_RHYTHM_LOCK)))
    expect(tuple[8]).toEqual(JSON.parse(JSON.stringify(SAMPLE_STEERING)))
  })

  it('holds the join from no phrase in the carry-in slot, its origin kept', () => {
    const tuple = validNoPhraseTuple()
    expect(tuple[4]).toBe(1)
    expect(tuple[5]).toEqual(JSON.parse(JSON.stringify(NO_PHRASE_CARRY_IN)))
    expect(tuple[8]).toEqual(JSON.parse(JSON.stringify(SAMPLE_STEERING)))
  })

  // @test-link [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  it('holds no doodle, raw notes, drift or capture tempo', () => {
    const intent = intentWith(14, { carryIn: NO_PHRASE_CARRY_IN, steering: SAMPLE_STEERING })
    const text = JSON.stringify(payloadOf(encodePhraseReplayKey(intent, 1)))
    expect(text).not.toMatch(/doodle|drift|captureTempo|rawNotes|"notes"|velocity/u)
  })

  it('announces a phrase with its ifk4 key on one console line', () => {
    const log = vi.fn<(line: string) => void>()
    const intent = intentWith(14, { carryIn: NO_PHRASE_CARRY_IN, steering: SAMPLE_STEERING })
    announcePhraseReplayKey(intent, { source: 'session', phraseNumber: 1, origin: 'carry-in' }, log)
    expect(log).toHaveBeenCalledTimes(1)
    const key = log.mock.calls[0]![0].split(' · ')[3]!
    expect(key.startsWith('ifk4.')).toBe(true)
    expect(decodePhraseReplayKey(key).intent).toEqual(intent)
  })
})

// @test-link [[module_phrase_replay_key]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('an ifk4 key round-trips and replays to the same phrase', () => {
  for (const mine of [false, true]) {
    const instrument = mine ? 'my instrument' : 'a built-in'
    it(
      `gives an equal intent and the same outcome with and without each group, for ${instrument}`,
      () => {
        for (const [label, groups, phraseNumber] of groupCases(mine)) {
          const intent = intentWith(21, groups, mine)
          const key = encodePhraseReplayKey(intent, phraseNumber)
          expect(key.startsWith('ifk4.'), label).toBe(true)
          const decoded = decodePhraseReplayKey(key)
          expect(decoded.keyVersion, label).toBe('ifk4')
          expect(decoded.phraseNumber, label).toBe(phraseNumber)
          expect(decoded.intent, label).toEqual(intent)
          expect(JSON.stringify(decoded.intent), label).toBe(JSON.stringify(intent))
          expect(JSON.stringify(replayedRaw(key)), label).toBe(
            JSON.stringify(generatePhrase(intent)),
          )
        }
      },
      TIMEOUT_MS,
    )
  }
})

// @test-link [[module_phrase_replay_key]]
describe('ifk4 decoding refuses a malformed key with the reason', () => {
  it('refuses a payload that is not a 9-entry array', () => {
    const tuple = validNoPhraseTuple()
    for (const payload of [tuple.slice(0, 7), tuple.slice(0, 8), [...tuple, null], {}])
      expect(() => decodePhraseReplayKey(rawKey('ifk4', payload))).toThrow(
        /"ifk4" payload must be an array of exactly 9 entries/u,
      )
  })

  it('refuses a group slot of the wrong type, naming it', () => {
    const cases: readonly [number, unknown, RegExp][] = [
      [7, 'locked', /slot 7 \(rhythmLock\)/u],
      [7, [], /slot 7 \(rhythmLock\)/u],
      [8, true, /slot 8 \(steering\)/u],
      [8, [], /slot 8 \(steering\)/u],
    ]
    for (const [index, value, message] of cases) {
      const key = rawKey('ifk4', lockedTupleWith(index, value))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(message)
    }
  })

  it('refuses a malformed rhythm lock group or steering block, naming the slot and the reason', () => {
    const lock = JSON.parse(JSON.stringify(SAMPLE_RHYTHM_LOCK)) as Record<string, unknown>
    const steering = JSON.parse(JSON.stringify(SAMPLE_STEERING)) as Record<string, unknown>
    const cases: readonly [number, unknown, RegExp][] = [
      [7, { ...lock, tenserPhrase: 'yes' }, /slot 7 \(rhythmLock\) is invalid: .*tenserPhrase/u],
      [7, { ...lock, extra: 1 }, /slot 7 \(rhythmLock\) is invalid: .*extra/u],
      [7, { ...lock, state: { kind: 'locked', bars: [] } }, /slot 7 \(rhythmLock\) is invalid: /u],
      [8, { ...steering, strength: 'loud' }, /slot 8 \(steering\) is invalid: .*strength/u],
      [8, { ...steering, pitches: [60] }, /slot 8 \(steering\) is invalid: .*pitches/u],
    ]
    for (const [index, value, reason] of cases) {
      const key = rawKey('ifk4', lockedTupleWith(index, value))
      expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
      expect(() => decodePhraseReplayKey(key)).toThrow(reason)
    }
  })

  // @test-link [[rule_jam_phrase_one_joins_doodle]]
  it('refuses a join from no phrase without a steering block, or as any phrase but 1', () => {
    const withoutSteering = validNoPhraseTuple()
    withoutSteering[8] = null
    expect(() => decodePhraseReplayKey(rawKey('ifk4', withoutSteering))).toThrow(CarryInError)
    expect(() => decodePhraseReplayKey(rawKey('ifk4', withoutSteering))).toThrow(
      'A carry-in from no phrase is received only with a steering block.',
    )

    const phraseTwo = validNoPhraseTuple()
    phraseTwo[4] = 2
    expect(() => decodePhraseReplayKey(rawKey('ifk4', phraseTwo))).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(rawKey('ifk4', phraseTwo))).toThrow(/must be 1/u)
    expect(() =>
      encodePhraseReplayKey(decodePhraseReplayKey(rawKey('ifk4', validNoPhraseTuple())).intent, 2),
    ).toThrow(/must be 1/u)
  })

  it('refuses a malformed join from no phrase with the carry-in reason', () => {
    const tuple = validNoPhraseTuple()
    tuple[5] = { ...(tuple[5] as Record<string, unknown>), finalHarmony: { chord: 'C' } }
    expect(() => decodePhraseReplayKey(rawKey('ifk4', tuple))).toThrow(
      'CarryIn.finalHarmony must be null for no phrase.',
    )
  })

  it('still refuses a join from no phrase in an older key, which has no form for it', () => {
    const tuple = validNoPhraseTuple()
    expect(() => decodePhraseReplayKey(rawKey('ifk3', tuple.slice(0, 7)))).toThrow(
      'CarryIn has unknown field "origin".',
    )
  })

  it('refuses an ifk5 key as an unsupported version', () => {
    const key = rawKey('ifk5', validNoPhraseTuple())
    expect(() => decodePhraseReplayKey(key)).toThrow(PhraseReplayKeyError)
    expect(() => decodePhraseReplayKey(key)).toThrow(/unsupported key version "ifk5"/u)
  })
})
