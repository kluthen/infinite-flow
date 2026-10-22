import { describe, expect, it } from 'vitest'

import {
  MAX_STEERING_MOVES,
  SteeringBlockError,
  makeSteeringBlock,
  parseSteeringBlock,
  type MelodicMove,
  type SteeringBlock,
} from '@/domain/generation/steering-block'

/** Intent: a full, valid steering block: every start kind, every move shape, an empty measure. */
function fullBlock(): SteeringBlock {
  return {
    targetRhythm: {
      measures: [
        [
          { tick: 0, kind: 'note' },
          { tick: 4, kind: 'rest' },
          { tick: 6, kind: 'note' },
        ],
        [],
        [{ tick: 15, kind: 'note' }],
        [
          { tick: 2, kind: 'rest' },
          { tick: 8, kind: 'note' },
        ],
      ],
      band: 'near',
    },
    moves: [
      { direction: 'up', size: 'step' },
      { direction: 'same' },
      { direction: 'down', size: 'leap' },
      { direction: 'up', size: 'skip' },
    ],
    strength: 'size-and-direction',
  }
}

/** An untrusted steering block, as a test reshapes it: every field loose. */
interface RawBlock {
  [key: string]: unknown
  targetRhythm: { [key: string]: unknown; measures: Record<string, unknown>[][] }
  moves: Record<string, unknown>[]
}

/** Intent: a JSON copy of the full block, as an untrusted value whose fields a test may change. */
function rawBlock(): RawBlock {
  return JSON.parse(JSON.stringify(fullBlock())) as RawBlock
}

/** Intent: remove one key from a record. */
function drop(record: Record<string, unknown>, key: string): void {
  delete record[key]
}

/** Intent: set one key of a record to any value, whatever type the field normally has. */
function put(record: Record<string, unknown>, key: string, value: unknown): void {
  record[key] = value
}

/** Intent: the block a test gets by handing the constructor a changed copy of the full block. */
function makeChanged(change: (raw: RawBlock) => void): () => SteeringBlock {
  const raw = rawBlock()
  change(raw)
  return () => makeSteeringBlock(raw as unknown as SteeringBlock)
}

/** Intent: every key name anywhere inside a value, at every depth. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys)
  if (typeof value !== 'object' || value === null) return []
  return Object.entries(value).flatMap(([key, inner]) => [key, ...allKeys(inner)])
}

// @test-link [[entity_steering_block]]
describe('makeSteeringBlock', () => {
  // @test-link [[entity_steering_block]]
  it('accepts a full block and returns a fresh, deep-frozen, equal copy', () => {
    const input = fullBlock()
    const block = makeSteeringBlock(input)

    expect(block).toStrictEqual(input)
    expect(block).not.toBe(input)
    expect(block.targetRhythm.measures[0]).not.toBe(input.targetRhythm.measures[0])
    expect(Object.isFrozen(block)).toBe(true)
    expect(Object.isFrozen(block.targetRhythm.measures[0]![0])).toBe(true)
    expect(Object.isFrozen(block.moves[0])).toBe(true)
    expect(Object.keys(block)).toEqual(['targetRhythm', 'moves', 'strength'])
    expect(Object.keys(block.targetRhythm)).toEqual(['measures', 'band'])
  })

  // @test-link [[entity_steering_block]]
  // @test-link [[rule_jam_steering_block]]
  it('holds no pitch: no key anywhere names a pitch or a MIDI note', () => {
    const keys = allKeys(makeSteeringBlock(fullBlock()))

    expect(keys.filter((key) => /midi|pitch|note/iu.test(key))).toEqual([])
  })

  // @test-link [[entity_steering_block]]
  it('accepts empty measures, an empty move list and every band and strength', () => {
    for (const band of ['close', 'near', 'unbounded'] as const) {
      for (const strength of ['size-and-direction', 'direction', 'none'] as const) {
        const block = makeSteeringBlock({
          targetRhythm: { measures: [[], [], [], []], band },
          moves: [],
          strength,
        })
        expect(block.targetRhythm.band).toBe(band)
        expect(block.strength).toBe(strength)
      }
    }
  })

  // @test-link [[entity_steering_block]]
  it('accepts exactly the most moves a four-measure doodle can hold', () => {
    const moves: MelodicMove[] = Array.from({ length: MAX_STEERING_MOVES }, () => ({
      direction: 'same',
    }))

    expect(MAX_STEERING_MOVES).toBe(63)
    expect(makeSteeringBlock({ ...fullBlock(), moves }).moves).toHaveLength(63)
  })

  // @test-link [[entity_steering_block]]
  it('refuses a measure count other than four', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures.pop()
      }),
    ).toThrow(/measures/u)
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures.push([])
      }),
    ).toThrow(SteeringBlockError)
  })

  // @test-link [[entity_steering_block]]
  it('refuses a start tick outside the measure', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[2]![0]!.tick = 16
      }),
    ).toThrow(/\[2\]\[0\]\.tick.*16/u)
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[0]![0]!.tick = -1
      }),
    ).toThrow(SteeringBlockError)
  })

  // @test-link [[entity_steering_block]]
  it('refuses a start tick that is not a whole number', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[2]![0]!.tick = 1.5
      }),
    ).toThrow(SteeringBlockError)
  })

  // @test-link [[entity_steering_block]]
  it('refuses start ticks that do not strictly increase within a measure', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[0]![1]!.tick = 0
      }),
    ).toThrow(SteeringBlockError)
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[0]![2]!.tick = 3
      }),
    ).toThrow(/increase/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown start kind', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm.measures[0]![0]!.kind = 'chord'
      }),
    ).toThrow(/chord/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown band', () => {
    expect(
      makeChanged((raw) => {
        raw.targetRhythm['band'] = 'far'
      }),
    ).toThrow(/band.*far/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown strength', () => {
    expect(
      makeChanged((raw) => {
        raw['strength'] = 'all'
      }),
    ).toThrow(/strength.*all/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown move direction', () => {
    expect(
      makeChanged((raw) => {
        raw.moves[0]!.direction = 'sideways'
      }),
    ).toThrow(/direction.*sideways/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an unknown move size', () => {
    expect(
      makeChanged((raw) => {
        raw.moves[0]!.size = 'jump'
      }),
    ).toThrow(/size.*jump/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses a size on a same-note move', () => {
    expect(
      makeChanged((raw) => {
        raw.moves[1]!.size = 'step'
      }),
    ).toThrow(SteeringBlockError)
  })

  // @test-link [[entity_steering_block]]
  it('refuses an up or down move without a size', () => {
    expect(
      makeChanged((raw) => {
        drop(raw.moves[0]!, 'size')
      }),
    ).toThrow(SteeringBlockError)
    expect(
      makeChanged((raw) => {
        drop(raw.moves[2]!, 'size')
      }),
    ).toThrow(/size/u)
  })

  // @test-link [[entity_steering_block]]
  it('refuses more moves than a four-measure doodle can hold', () => {
    expect(
      makeChanged((raw) => {
        raw.moves = Array.from({ length: MAX_STEERING_MOVES + 1 }, () => ({ direction: 'same' }))
      }),
    ).toThrow(/64/u)
  })
})

// @test-link [[entity_steering_block]]
describe('parseSteeringBlock', () => {
  // @test-link [[entity_steering_block]]
  it('round-trips a structured clone of a constructed block', () => {
    const block = makeSteeringBlock(fullBlock())
    const parsed = parseSteeringBlock(structuredClone(block))

    expect(parsed).toStrictEqual(block)
    expect(Object.isFrozen(parsed.targetRhythm.measures)).toBe(true)
  })

  // @test-link [[entity_steering_block]]
  it('refuses a non-object, a non-array measure list, measure or move list', () => {
    const notArrays: ((raw: RawBlock) => void)[] = [
      (raw) => put(raw.targetRhythm, 'measures', 'all'),
      (raw) => (raw.targetRhythm.measures[1] = {} as Record<string, unknown>[]),
      (raw) => put(raw, 'moves', {}),
    ]
    expect(() => parseSteeringBlock(null)).toThrow(SteeringBlockError)
    expect(() => parseSteeringBlock([])).toThrow(SteeringBlockError)
    for (const change of notArrays) {
      const raw = rawBlock()
      change(raw)
      expect(() => parseSteeringBlock(raw)).toThrow(SteeringBlockError)
    }
  })

  // @test-link [[entity_steering_block]]
  it('refuses a missing key at every level', () => {
    const removals: ((raw: RawBlock) => void)[] = [
      (raw) => drop(raw, 'strength'),
      (raw) => drop(raw, 'moves'),
      (raw) => drop(raw, 'targetRhythm'),
      (raw) => drop(raw.targetRhythm, 'band'),
      (raw) => drop(raw.targetRhythm, 'measures'),
      (raw) => drop(raw.targetRhythm.measures[0]![0]!, 'kind'),
      (raw) => drop(raw.targetRhythm.measures[0]![0]!, 'tick'),
      (raw) => drop(raw.moves[0]!, 'direction'),
      (raw) => drop(raw.moves[0]!, 'size'),
    ]
    for (const remove of removals) {
      const raw = rawBlock()
      remove(raw)
      expect(() => parseSteeringBlock(raw)).toThrow(SteeringBlockError)
    }
  })

  // @test-link [[entity_steering_block]]
  // @test-link [[rule_jam_steering_block]]
  it('refuses an extra key at every level, a pitch among them', () => {
    const additions: ((raw: RawBlock) => void)[] = [
      (raw) => (raw['doodle'] = []),
      (raw) => (raw.targetRhythm['drift'] = 0.5),
      (raw) => (raw.targetRhythm.measures[0]![0]!.midi = 60),
      (raw) => (raw.moves[0]!.pitch = 62),
      (raw) => (raw.moves[1]!.size = 'step'),
    ]
    for (const add of additions) {
      const raw = rawBlock()
      add(raw)
      expect(() => parseSteeringBlock(raw)).toThrow(SteeringBlockError)
    }
  })
})
