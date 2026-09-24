import { describe, expect, it } from 'vitest'
import { COLLECTIONS, type Collection } from '@/domain/controls/generation-controls'
import { COLLECTION_OFFSETS } from '@/domain/harmony/collection'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import {
  displayedAccidentalOf,
  naturalPitchClassOf,
  pitchClassText,
  spellMidiInKey,
  spellPitchClassInKey,
  spellWrittenKey,
} from '@/domain/notation/pitch-spelling'
import {
  NotationInputError,
  type Letter,
  type WrittenKey,
} from '@/domain/notation/written-phrase-types'

const INDEPENDENT_NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const INDEPENDENT_LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/** Intent: independently reimplement candidate enumeration to cross-check the production output. */
function independentCandidates(
  tonic: number,
  offsets: readonly number[],
): readonly {
  readonly letters: readonly { letter: Letter; alter: number }[]
  readonly count: number
}[] {
  const results: { letters: { letter: Letter; alter: number }[]; count: number }[] = []
  for (const letter of INDEPENDENT_LETTERS) {
    const startIndex = INDEPENDENT_LETTERS.indexOf(letter)
    const degrees: { letter: Letter; alter: number }[] = []
    let count = 0
    let valid = true
    for (let i = 0; i < offsets.length; i += 1) {
      const degreeLetter = INDEPENDENT_LETTERS[(startIndex + i) % 7]!
      const actualPc = (((tonic + offsets[i]!) % 12) + 12) % 12
      const rawDiff = actualPc - INDEPENDENT_NATURAL_PC[degreeLetter]
      const alter = ((((rawDiff + 6) % 12) + 12) % 12) - 6
      if (Math.abs(alter) > 2) {
        valid = false
        break
      }
      degrees.push({ letter: degreeLetter, alter })
      count += Math.abs(alter)
    }
    if (valid) results.push({ letters: degrees, count })
  }
  return results
}

function totalAccidentals(key: WrittenKey): number {
  return key.scale.reduce((sum, d) => sum + Math.abs(d.alter), 0)
}

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
describe('spellWrittenKey — fewest-accidental enharmonic spelling', () => {
  it('is minimal, sharp-on-tie, for every tonal center and collection', () => {
    for (let tonic = 0; tonic < 12; tonic += 1) {
      for (const collection of COLLECTIONS) {
        const key = spellWrittenKey(tonic as PitchClassNumber, collection)
        const candidates = independentCandidates(tonic, COLLECTION_OFFSETS[collection])
        const minCount = Math.min(...candidates.map((c) => c.count))
        const accidentals = totalAccidentals(key)

        expect(accidentals).toBe(minCount)
        for (const candidate of candidates) {
          expect(accidentals).toBeLessThanOrEqual(candidate.count)
        }

        const atMin = candidates.filter((c) => c.count === minCount)
        if (atMin.length > 1) {
          expect(key.scale.every((d) => d.alter >= 0)).toBe(true)
        }
      }
    }
  })

  it.each<[number, Collection, string, number]>([
    [6, 'Major', 'F♯ Major', 6],
    [1, 'Major', 'D♭ Major', 5],
    [1, 'Minor', 'C♯ Minor', 4],
    [3, 'Major', 'E♭ Major', 3],
    [8, 'Minor', 'G♯ Minor', 5],
    [10, 'Minor', 'B♭ Minor', 5],
    [2, 'Dorian', 'D Dorian', 0],
    [0, 'Aeolian', 'C Aeolian', 3],
    [11, 'Locrian', 'B Locrian', 0],
  ])('pc %i %s -> %s (%i accidentals)', (tonic, collection, label, accidentalCount) => {
    const key = spellWrittenKey(tonic as PitchClassNumber, collection)
    expect(key.label).toBe(label)
    expect(totalAccidentals(key)).toBe(accidentalCount)
  })

  it('chooses E♭ Dorian (5 flats) over D♯/C♯ Dorian (7 sharps) for pc 3', () => {
    const key = spellWrittenKey(3, 'Dorian')
    expect(key.label).toBe('E♭ Dorian')
    expect(totalAccidentals(key)).toBe(5)
  })

  it('gives C Aeolian a 3-flat signature of B, E, A with ionian tonic E♭', () => {
    const key = spellWrittenKey(0, 'Aeolian')
    expect(key.signature.accidental).toBe('flat')
    expect(key.signature.letters).toEqual(['B', 'E', 'A'])
    expect(pitchClassText(key.signature.ionianTonic)).toBe('E♭')
  })

  it('gives D Dorian (pc 2) a 0-accidental signature with ionian tonic C', () => {
    const key = spellWrittenKey(2, 'Dorian')
    expect(key.signature.count).toBe(0)
    expect(key.signature.accidental).toBeNull()
    expect(pitchClassText(key.signature.ionianTonic)).toBe('C')
  })

  it('gives F♯ Locrian (pc 6) the 1-sharp G major signature', () => {
    const key = spellWrittenKey(6, 'Locrian')
    expect(key.signature.count).toBe(1)
    expect(key.signature.accidental).toBe('sharp')
    expect(key.signature.letters).toEqual(['F'])
    expect(pitchClassText(key.signature.ionianTonic)).toBe('G')
  })
})

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
describe('spellWrittenKey — label/key/scale consistency', () => {
  it('spells every scale degree consistently with the reported signature membership', () => {
    for (let tonic = 0; tonic < 12; tonic += 1) {
      for (const collection of COLLECTIONS) {
        const key = spellWrittenKey(tonic as PitchClassNumber, collection)
        const sharpLetters = key.scale.filter((d) => d.alter === 1).map((d) => d.letter)
        const flatLetters = key.scale.filter((d) => d.alter === -1).map((d) => d.letter)
        const nonUnitAlters = key.scale.filter((d) => Math.abs(d.alter) > 1)

        expect(nonUnitAlters).toEqual([])
        if (key.signature.accidental === 'sharp') {
          expect(new Set(sharpLetters)).toEqual(new Set(key.signature.letters))
          expect(flatLetters).toEqual([])
        } else if (key.signature.accidental === 'flat') {
          expect(new Set(flatLetters)).toEqual(new Set(key.signature.letters))
          expect(sharpLetters).toEqual([])
        } else {
          expect(sharpLetters).toEqual([])
          expect(flatLetters).toEqual([])
        }
        expect(key.scale).toHaveLength(7)
        expect(key.scale[0]).toEqual(key.tonic)
        expect(key.label).toBe(`${pitchClassText(key.tonic)} ${collection}`)
      }
    }
  })
})

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
describe('spellPitchClassInKey — chromatic spelling rule', () => {
  it('spells C major chromatic pc 1 as C♯, not D♭ (no-accidental key defaults to sharp)', () => {
    const key = spellWrittenKey(0, 'Major')
    expect(spellPitchClassInKey(1, key)).toEqual({ letter: 'C', alter: 1 })
  })

  it('spells F major in-scale pc 10 as the key B♭', () => {
    const key = spellWrittenKey(5, 'Major')
    expect(spellPitchClassInKey(10, key)).toEqual({ letter: 'B', alter: -1 })
  })

  it('spells F major chromatic pc 1 as D♭ (flat key spells chromatics as flats)', () => {
    const key = spellWrittenKey(5, 'Major')
    expect(spellPitchClassInKey(1, key)).toEqual({ letter: 'D', alter: -1 })
  })

  it('spells G major chromatic pc 5 as natural F, overriding the sharp signature', () => {
    const key = spellWrittenKey(7, 'Major')
    expect(spellPitchClassInKey(5, key)).toEqual({ letter: 'F', alter: 0 })
  })
})

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
describe('spellMidiInKey — octave derived from the chosen spelling', () => {
  it('spells MIDI 60 as C4 in C major', () => {
    const key = spellWrittenKey(0, 'Major')
    expect(spellMidiInKey(60, key)).toEqual({ letter: 'C', alter: 0, octave: 4 })
  })

  it('spells E♯ in F♯ major (MIDI 65 -> E♯4)', () => {
    const key = spellWrittenKey(6, 'Major')
    expect(key.label).toBe('F♯ Major')
    expect(spellMidiInKey(65, key)).toEqual({ letter: 'E', alter: 1, octave: 4 })
  })

  it('resolves B♯3 at MIDI 60 for a hand-spelled C♯ major key (never chosen by spellWrittenKey)', () => {
    const cSharpMajor: WrittenKey = {
      tonic: { letter: 'C', alter: 1 },
      collection: 'Major',
      label: 'C♯ Major',
      scale: [
        { letter: 'C', alter: 1 },
        { letter: 'D', alter: 1 },
        { letter: 'E', alter: 1 },
        { letter: 'F', alter: 1 },
        { letter: 'G', alter: 1 },
        { letter: 'A', alter: 1 },
        { letter: 'B', alter: 1 },
      ],
      signature: {
        accidental: 'sharp',
        count: 7,
        letters: ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
        ionianTonic: { letter: 'C', alter: 1 },
      },
    }
    expect(spellMidiInKey(60, cSharpMajor)).toEqual({ letter: 'B', alter: 1, octave: 3 })
  })

  it('resolves C♭5 at MIDI 71 for a hand-spelled C♭ major key (never chosen by spellWrittenKey)', () => {
    const cFlatMajor: WrittenKey = {
      tonic: { letter: 'C', alter: -1 },
      collection: 'Major',
      label: 'C♭ Major',
      scale: [
        { letter: 'C', alter: -1 },
        { letter: 'D', alter: -1 },
        { letter: 'E', alter: -1 },
        { letter: 'F', alter: -1 },
        { letter: 'G', alter: -1 },
        { letter: 'A', alter: -1 },
        { letter: 'B', alter: -1 },
      ],
      signature: {
        accidental: 'flat',
        count: 7,
        letters: ['B', 'E', 'A', 'D', 'G', 'C', 'F'],
        ionianTonic: { letter: 'C', alter: -1 },
      },
    }
    expect(spellMidiInKey(71, cFlatMajor)).toEqual({ letter: 'C', alter: -1, octave: 5 })
  })

  it('rejects a non-integer MIDI pitch', () => {
    const key = spellWrittenKey(0, 'Major')
    expect(() => spellMidiInKey(60.5, key)).toThrow(NotationInputError)
  })
})

// @test-link [[module_notation_display_convention]]
describe('pitchClassText / displayedAccidentalOf / naturalPitchClassOf', () => {
  it('renders unicode accidental suffixes', () => {
    expect(pitchClassText({ letter: 'F', alter: 1 })).toBe('F♯')
    expect(pitchClassText({ letter: 'B', alter: -1 })).toBe('B♭')
    expect(pitchClassText({ letter: 'C', alter: 0 })).toBe('C')
    expect(pitchClassText({ letter: 'D', alter: 2 })).toBe('D𝄪')
    expect(pitchClassText({ letter: 'E', alter: -2 })).toBe('E𝄫')
  })

  it('names every displayed accidental', () => {
    expect(displayedAccidentalOf(-2)).toBe('double-flat')
    expect(displayedAccidentalOf(-1)).toBe('flat')
    expect(displayedAccidentalOf(0)).toBe('natural')
    expect(displayedAccidentalOf(1)).toBe('sharp')
    expect(displayedAccidentalOf(2)).toBe('double-sharp')
  })

  it('reports the natural pitch class of every letter', () => {
    expect(naturalPitchClassOf('C')).toBe(0)
    expect(naturalPitchClassOf('F')).toBe(5)
    expect(naturalPitchClassOf('B')).toBe(11)
  })
})
