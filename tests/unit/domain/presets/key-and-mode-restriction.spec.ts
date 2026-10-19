// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  COLLECTIONS,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import {
  allowsKey,
  allowsKeyAndMode,
  allowsMode,
  ANY_KEY_AND_MODE,
  isAnyKeyAndMode,
  KeyAndModeRestrictionError,
  makeKeyAndModeRestriction,
  onlyKeyAndMode,
  restrictionInWords,
  sameRestriction,
  type KeyAndModeRestriction,
  type RestrictionLabels,
} from '@/domain/presets/key-and-mode-restriction'

/** Fake interface labels: one key spelled out as the interface would, the rest as they are. */
const LABELS: RestrictionLabels = {
  key: (key) => (key === 'F#' ? 'F-sharp/G-flat' : key),
  mode: (mode) => mode,
}

/** Intent: an untrusted restriction value, for the refusal tests. */
function untrusted(value: unknown): KeyAndModeRestriction {
  return value as KeyAndModeRestriction
}

// @test-link [[module_preset_model]]
// @test-link [[rule_key_and_mode_restriction]]
describe('making a key and mode restriction', () => {
  it('gives "any" on both halves as a frozen constant', () => {
    expect(ANY_KEY_AND_MODE).toStrictEqual({ keys: 'any', modes: 'any' })
    expect(Object.isFrozen(ANY_KEY_AND_MODE)).toBe(true)
    expect(isAnyKeyAndMode(ANY_KEY_AND_MODE)).toBe(true)
  })

  it('returns a fresh deep-frozen copy keeping the lists in order', () => {
    const input = { keys: ['G', 'D'], modes: ['Mixolydian', 'Dorian'] } as const
    const made = makeKeyAndModeRestriction(input)
    expect(made).toStrictEqual({ keys: ['G', 'D'], modes: ['Mixolydian', 'Dorian'] })
    expect(made).not.toBe(input)
    expect(made.keys).not.toBe(input.keys)
    expect(Object.isFrozen(made)).toBe(true)
    expect(Object.isFrozen(made.keys)).toBe(true)
    expect(Object.isFrozen(made.modes)).toBe(true)
    expect(isAnyKeyAndMode(made)).toBe(false)
  })

  it('accepts every written key and every collection', () => {
    const made = makeKeyAndModeRestriction({
      keys: [...PITCH_CLASSES] as [PitchClass, ...PitchClass[]],
      modes: [...COLLECTIONS] as [Collection, ...Collection[]],
    })
    expect(made.keys).toEqual([...PITCH_CLASSES])
    expect(made.modes).toEqual([...COLLECTIONS])
  })

  it('refuses an empty list on either half', () => {
    const emptyKeys = untrusted({ keys: [], modes: 'any' })
    const emptyModes = untrusted({ keys: 'any', modes: [] })
    expect(() => makeKeyAndModeRestriction(emptyKeys)).toThrow(KeyAndModeRestrictionError)
    expect(() => makeKeyAndModeRestriction(emptyKeys)).toThrow(/keys half.*empty/u)
    expect(() => makeKeyAndModeRestriction(emptyModes)).toThrow(/modes half.*empty/u)
  })

  it('refuses an unknown key or mode, a flat spelling and a lower-case mode included', () => {
    for (const value of [
      { keys: ['Gb'], modes: 'any' },
      { keys: 'any', modes: ['dorian'] },
      { keys: 'any', modes: ['Blues'] },
      { keys: [7], modes: 'any' },
    ]) {
      expect(() => makeKeyAndModeRestriction(untrusted(value))).toThrow(KeyAndModeRestrictionError)
    }
    expect(() => makeKeyAndModeRestriction(untrusted({ keys: ['Gb'], modes: 'any' }))).toThrow(
      /unknown value "Gb"/u,
    )
  })

  it('refuses a duplicate entry', () => {
    const duplicate = untrusted({ keys: 'any', modes: ['Dorian', 'Mixolydian', 'Dorian'] })
    expect(() => makeKeyAndModeRestriction(duplicate)).toThrow(KeyAndModeRestrictionError)
    expect(() => makeKeyAndModeRestriction(duplicate)).toThrow(/duplicate "Dorian"/u)
  })

  it('refuses a half that is neither "any" nor a list, and a value that is not an object', () => {
    for (const value of [
      { keys: 'all', modes: 'any' },
      { keys: 'any', modes: 'Dorian' },
      { keys: 'any' },
      null,
      'any',
    ]) {
      expect(() => makeKeyAndModeRestriction(untrusted(value))).toThrow(KeyAndModeRestrictionError)
    }
  })

  it('gives the one-pair restriction for a key and a mode', () => {
    const only = onlyKeyAndMode('G', 'Dorian')
    expect(only).toStrictEqual({ keys: ['G'], modes: ['Dorian'] })
    expect(Object.isFrozen(only)).toBe(true)
  })
})

// @test-link [[module_preset_model]]
// @test-link [[rule_key_and_mode_restriction]]
describe('what a restriction allows', () => {
  it('allows exactly every allowed key with every allowed mode', () => {
    const restriction = makeKeyAndModeRestriction({
      keys: ['G', 'D'],
      modes: ['Dorian', 'Mixolydian'],
    })
    const allowed = PITCH_CLASSES.flatMap((key) =>
      COLLECTIONS.filter((mode) => allowsKeyAndMode(restriction, key, mode)).map(
        (mode) => `${key} ${mode}`,
      ),
    )
    expect(allowed).toEqual(['D Dorian', 'D Mixolydian', 'G Dorian', 'G Mixolydian'])
    expect(allowsKey(restriction, 'G')).toBe(true)
    expect(allowsKey(restriction, 'A')).toBe(false)
    expect(allowsMode(restriction, 'Mixolydian')).toBe(true)
    expect(allowsMode(restriction, 'Lydian')).toBe(false)
  })

  it('allows every key and mode on an "any" half', () => {
    const modesOnly = makeKeyAndModeRestriction({ keys: 'any', modes: ['Dorian'] })
    for (const key of PITCH_CLASSES) {
      expect(allowsKey(modesOnly, key)).toBe(true)
      expect(allowsKeyAndMode(modesOnly, key, 'Dorian')).toBe(true)
      expect(allowsKeyAndMode(modesOnly, key, 'Aeolian')).toBe(false)
      for (const mode of COLLECTIONS) {
        expect(allowsKeyAndMode(ANY_KEY_AND_MODE, key, mode)).toBe(true)
      }
    }
  })

  it('never lets Major stand for Ionian, nor Minor for Aeolian, either way round', () => {
    const pairs: readonly (readonly [Collection, Collection])[] = [
      ['Major', 'Ionian'],
      ['Ionian', 'Major'],
      ['Minor', 'Aeolian'],
      ['Aeolian', 'Minor'],
    ]
    for (const [listed, other] of pairs) {
      const restriction = makeKeyAndModeRestriction({ keys: 'any', modes: [listed] })
      expect(allowsMode(restriction, listed)).toBe(true)
      expect(allowsMode(restriction, other)).toBe(false)
      expect(allowsKeyAndMode(restriction, 'C', other)).toBe(false)
    }
  })

  it('compares two restrictions half by half, order included', () => {
    const reel = makeKeyAndModeRestriction({ keys: 'any', modes: ['Mixolydian', 'Dorian'] })
    expect(sameRestriction(reel, { keys: 'any', modes: ['Mixolydian', 'Dorian'] })).toBe(true)
    expect(sameRestriction(reel, { keys: 'any', modes: ['Dorian', 'Mixolydian'] })).toBe(false)
    expect(sameRestriction(reel, { keys: 'any', modes: ['Mixolydian'] })).toBe(false)
    expect(sameRestriction(reel, ANY_KEY_AND_MODE)).toBe(false)
    expect(sameRestriction(ANY_KEY_AND_MODE, { keys: 'any', modes: 'any' })).toBe(true)
    expect(sameRestriction(onlyKeyAndMode('G', 'Dorian'), onlyKeyAndMode('G', 'Dorian'))).toBe(true)
    expect(sameRestriction(onlyKeyAndMode('G', 'Dorian'), { keys: ['G'], modes: 'any' })).toBe(
      false,
    )
  })
})

// @test-link [[module_preset_model]]
// @test-link [[rule_saving_preset_asks_its_restriction]]
describe('the restriction in words', () => {
  it('reads a list of modes in any key', () => {
    const reel = makeKeyAndModeRestriction({ keys: 'any', modes: ['Mixolydian', 'Dorian'] })
    expect(restrictionInWords(reel, LABELS)).toBe('Mixolydian or Dorian in any key')
    const pop = makeKeyAndModeRestriction({ keys: 'any', modes: ['Major'] })
    expect(restrictionInWords(pop, LABELS)).toBe('Major in any key')
  })

  it('reads a three-entry list as "A, B or C"', () => {
    const three = makeKeyAndModeRestriction({
      keys: 'any',
      modes: ['Dorian', 'Mixolydian', 'Ionian'],
    })
    expect(restrictionInWords(three, LABELS)).toBe('Dorian, Mixolydian or Ionian in any key')
  })

  it("reads a list of keys in any mode, in the interface's key labels", () => {
    const keys = makeKeyAndModeRestriction({ keys: ['G', 'F#'], modes: 'any' })
    expect(restrictionInWords(keys, LABELS)).toBe('G or F-sharp/G-flat in any mode')
  })

  it('reads one key and one mode as "only", or without it on request', () => {
    expect(restrictionInWords(onlyKeyAndMode('G', 'Dorian'), LABELS)).toBe('only G Dorian')
    expect(restrictionInWords(onlyKeyAndMode('G', 'Dorian'), LABELS, { only: true })).toBe(
      'only G Dorian',
    )
    expect(restrictionInWords(onlyKeyAndMode('G', 'Dorian'), LABELS, { only: false })).toBe(
      'G Dorian',
    )
    expect(restrictionInWords(onlyKeyAndMode('F#', 'Mixolydian'), LABELS)).toBe(
      'only F-sharp/G-flat Mixolydian',
    )
  })

  it('reads lists on both halves as "{keys}, in {modes}"', () => {
    const both = makeKeyAndModeRestriction({ keys: ['G', 'D'], modes: ['Dorian', 'Mixolydian'] })
    expect(restrictionInWords(both, LABELS)).toBe('G or D, in Dorian or Mixolydian')
    const oneKey = makeKeyAndModeRestriction({ keys: ['G'], modes: ['Dorian', 'Mixolydian'] })
    expect(restrictionInWords(oneKey, LABELS)).toBe('G, in Dorian or Mixolydian')
  })

  it('reads "any" on both halves as any key and mode', () => {
    expect(restrictionInWords(ANY_KEY_AND_MODE, LABELS)).toBe('any key and mode')
  })

  it('takes every label from the interface', () => {
    const shouting: RestrictionLabels = {
      key: (key) => `key ${key}`,
      mode: (mode) => mode.toUpperCase(),
    }
    expect(restrictionInWords(onlyKeyAndMode('A', 'Aeolian'), shouting)).toBe('only key A AEOLIAN')
  })
})
