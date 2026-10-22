import { describe, expect, it } from 'vitest'

import {
  RHYTHM_CHANGE_KINDS,
  RequestRhythmLockError,
  makeRequestRhythmLock,
  parseRequestRhythmLock,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'

/** Intent: one measure of two quarter notes, an eighth rest and a dotted quarter note. */
const QUARTERS: LockedRhythmMeasure = [
  { kind: 'note', startTick: 0, durationTicks: 4, tieContinuation: false },
  { kind: 'note', startTick: 4, durationTicks: 4, tieContinuation: false },
  { kind: 'rest', startTick: 8, durationTicks: 2, tieContinuation: false },
  { kind: 'note', startTick: 10, durationTicks: 6, tieContinuation: false },
]

/** Intent: one measure opening on a note tied over from the measure before, then a rest. */
const TIED_OPENING: LockedRhythmMeasure = [
  { kind: 'note', startTick: 0, durationTicks: 8, tieContinuation: true },
  { kind: 'rest', startTick: 8, durationTicks: 8, tieContinuation: false },
]

/** Intent: a lock on, with four locked bars and two allowed changes. */
function lockedLock(): RequestRhythmLock {
  return {
    state: { kind: 'locked', bars: [QUARTERS, TIED_OPENING, QUARTERS, TIED_OPENING] },
    allowedChanges: ['move_note_start', 'note_rest'],
    tenserPhrase: true,
  }
}

/** An untrusted rhythm lock, as a test reshapes it: every field loose. */
interface RawLock {
  [key: string]: unknown
  state: { [key: string]: unknown; bars: Record<string, unknown>[][] }
  allowedChanges: unknown[]
}

/** Intent: a JSON copy of the locked lock, as an untrusted value a test may change. */
function rawLock(): RawLock {
  return JSON.parse(JSON.stringify(lockedLock())) as RawLock
}

/** Intent: remove one key from a record. */
function drop(record: Record<string, unknown>, key: string): void {
  delete record[key]
}

/** Intent: set one key of a record to any value, whatever type the field normally has. */
function put(record: Record<string, unknown>, key: string, value: unknown): void {
  record[key] = value
}

/** Intent: a constructor call over a changed copy of the locked lock. */
function makeChanged(change: (raw: RawLock) => void): () => RequestRhythmLock {
  const raw = rawLock()
  change(raw)
  return () => makeRequestRhythmLock(raw as unknown as RequestRhythmLock)
}

// @test-link [[entity_request_rhythm_lock]]
describe('makeRequestRhythmLock', () => {
  // @test-link [[entity_request_rhythm_lock]]
  it('accepts a pending lock and returns a fresh, deep-frozen copy', () => {
    const input: RequestRhythmLock = {
      state: { kind: 'pending' },
      allowedChanges: [],
      tenserPhrase: false,
    }
    const lock = makeRequestRhythmLock(input)

    expect(lock).toStrictEqual(input)
    expect(lock).not.toBe(input)
    expect(Object.isFrozen(lock.state)).toBe(true)
    expect(Object.isFrozen(lock.allowedChanges)).toBe(true)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('accepts a locked lock with its bars as written, in field order, deep-frozen', () => {
    const lock = makeRequestRhythmLock(lockedLock())

    expect(lock).toStrictEqual(lockedLock())
    expect(Object.keys(lock)).toEqual(['state', 'allowedChanges', 'tenserPhrase'])
    expect(lock.state.kind === 'locked' && Object.isFrozen(lock.state.bars[1]![0])).toBe(true)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('accepts every change kind in canonical order', () => {
    expect(RHYTHM_CHANGE_KINDS).toEqual([
      'move_note_start',
      'move_rest',
      'split_note',
      'merge_notes',
      'note_rest',
    ])
    expect(
      makeRequestRhythmLock({ ...lockedLock(), allowedChanges: RHYTHM_CHANGE_KINDS })
        .allowedChanges,
    ).toEqual(RHYTHM_CHANGE_KINDS)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an unknown state kind', () => {
    expect(makeChanged((raw) => (raw.state['kind'] = 'off'))).toThrow(/state\.kind.*off/u)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an unknown change kind', () => {
    expect(makeChanged((raw) => (raw.allowedChanges = ['swing']))).toThrow(/swing/u)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a duplicated change kind', () => {
    expect(makeChanged((raw) => (raw.allowedChanges = ['move_rest', 'move_rest']))).toThrow(
      RequestRhythmLockError,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses change kinds out of canonical order rather than reordering them', () => {
    expect(makeChanged((raw) => (raw.allowedChanges = ['note_rest', 'move_note_start']))).toThrow(
      /order/u,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a tenser-phrase flag that is not a boolean', () => {
    expect(makeChanged((raw) => (raw['tenserPhrase'] = 'yes'))).toThrow(RequestRhythmLockError)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses locked bars that are not exactly four measures', () => {
    expect(makeChanged((raw) => raw.state.bars.pop())).toThrow(/bars/u)
    expect(makeChanged((raw) => raw.state.bars.push(raw.state.bars[0]!))).toThrow(
      RequestRhythmLockError,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an empty measure', () => {
    expect(makeChanged((raw) => (raw.state.bars[2] = []))).toThrow(RequestRhythmLockError)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a measure whose first event does not start on its tick 0', () => {
    expect(
      makeChanged((raw) => {
        raw.state.bars[1]![0]!['startTick'] = 16
        raw.state.bars[1]![1]!['startTick'] = 24
      }),
    ).toThrow(/startTick/u)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a gap or an overlap between events', () => {
    expect(makeChanged((raw) => (raw.state.bars[0]![1]!['startTick'] = 5))).toThrow(
      RequestRhythmLockError,
    )
    expect(makeChanged((raw) => (raw.state.bars[0]![1]!['startTick'] = 3))).toThrow(
      RequestRhythmLockError,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a measure whose events do not fill its sixteen ticks', () => {
    expect(makeChanged((raw) => (raw.state.bars[0]![3]!['durationTicks'] = 5))).toThrow(/16/u)
    expect(makeChanged((raw) => (raw.state.bars[0]![3]!['durationTicks'] = 7))).toThrow(
      RequestRhythmLockError,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a duration that is not a positive whole number', () => {
    expect(
      makeChanged((raw) => {
        raw.state.bars[0]![2]!['durationTicks'] = 0
        raw.state.bars[0]![3]!['durationTicks'] = 8
      }),
    ).toThrow(/durationTicks/u)
    expect(
      makeChanged((raw) => {
        raw.state.bars[0]![2]!['durationTicks'] = 1.5
        raw.state.bars[0]![3]!['startTick'] = 9.5
        raw.state.bars[0]![3]!['durationTicks'] = 6.5
      }),
    ).toThrow(RequestRhythmLockError)
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an unknown event kind or a tie flag that is not a boolean', () => {
    expect(makeChanged((raw) => (raw.state.bars[0]![0]!['kind'] = 'chord'))).toThrow(/chord/u)
    expect(makeChanged((raw) => (raw.state.bars[0]![0]!['tieContinuation'] = 1))).toThrow(
      RequestRhythmLockError,
    )
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a tie continuation on the very first event of measure 1', () => {
    expect(makeChanged((raw) => (raw.state.bars[0] = raw.state.bars[1]!))).toThrow(
      /tieContinuation/u,
    )
  })
})

// @test-link [[entity_request_rhythm_lock]]
describe('parseRequestRhythmLock', () => {
  // @test-link [[entity_request_rhythm_lock]]
  it('round-trips a structured clone of a pending and of a locked lock', () => {
    for (const lock of [
      makeRequestRhythmLock(lockedLock()),
      makeRequestRhythmLock({
        state: { kind: 'pending' },
        allowedChanges: [],
        tenserPhrase: false,
      }),
    ]) {
      const parsed = parseRequestRhythmLock(structuredClone(lock))
      expect(parsed).toStrictEqual(lock)
      expect(Object.isFrozen(parsed)).toBe(true)
    }
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a non-object, or a non-array bar list, measure or change list', () => {
    const changes: ((raw: RawLock) => void)[] = [
      (raw) => put(raw.state, 'bars', {}),
      (raw) => (raw.state.bars[0] = {} as Record<string, unknown>[]),
      (raw) => put(raw, 'allowedChanges', 'move_rest'),
    ]
    expect(() => parseRequestRhythmLock(null)).toThrow(RequestRhythmLockError)
    expect(() => parseRequestRhythmLock([])).toThrow(RequestRhythmLockError)
    for (const change of changes) {
      const raw = rawLock()
      change(raw)
      expect(() => parseRequestRhythmLock(raw)).toThrow(RequestRhythmLockError)
    }
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses a missing key at every level', () => {
    const removals: ((raw: RawLock) => void)[] = [
      (raw) => drop(raw, 'state'),
      (raw) => drop(raw, 'allowedChanges'),
      (raw) => drop(raw, 'tenserPhrase'),
      (raw) => drop(raw.state, 'bars'),
      (raw) => drop(raw.state, 'kind'),
      (raw) => drop(raw.state.bars[0]![1]!, 'kind'),
      (raw) => drop(raw.state.bars[0]![1]!, 'startTick'),
      (raw) => drop(raw.state.bars[0]![1]!, 'durationTicks'),
      (raw) => drop(raw.state.bars[0]![1]!, 'tieContinuation'),
    ]
    for (const remove of removals) {
      const raw = rawLock()
      remove(raw)
      expect(() => parseRequestRhythmLock(raw)).toThrow(RequestRhythmLockError)
    }
  })

  // @test-link [[entity_request_rhythm_lock]]
  it('refuses an extra key at every level, bars on a pending lock among them', () => {
    const additions: ((raw: RawLock) => void)[] = [
      (raw) => (raw['tempo'] = 120),
      (raw) => (raw.state['owner'] = 'jam'),
      (raw) => (raw.state['kind'] = 'pending'),
      (raw) => (raw.state.bars[0]![1]!['tieChainId'] = 'tie-1'),
    ]
    for (const add of additions) {
      const raw = rawLock()
      add(raw)
      expect(() => parseRequestRhythmLock(raw)).toThrow(RequestRhythmLockError)
    }
  })
})
