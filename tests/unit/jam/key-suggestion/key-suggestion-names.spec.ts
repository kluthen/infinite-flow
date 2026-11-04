// @vitest-environment node
/**
 * Naming the key and mode suggestion (master spec C6.2, C6.5): its home note computed in concert
 * pitch and named in written pitch for the selected instrument; Jam's written key read back in
 * concert pitch; Major compared as Ionian and Minor as Aeolian; the drawn mode named in the
 * player's family, Major or Minor for an Ionian or Aeolian answer when Jam's Collection is one of
 * them, its mode otherwise.
 */
import { describe, expect, it } from 'vitest'

import { COLLECTIONS, PITCH_CLASSES } from '@/domain/controls/generation-controls'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { findBuiltInInstrumentProfile } from '@/domain/profile/instrument-profiles'
import {
  collectionInFamily,
  concertHomeNote,
  keyModeOf,
  writtenHomeNote,
} from '@/jam/key-suggestion/key-suggestion-names'
import { KEY_MODES } from '@/jam/key-suggestion/key-suggestion-scores'

/** Intent: a built-in instrument's transposition, by id. */
function transpositionOf(id: string) {
  const profile = findBuiltInInstrumentProfile(id)
  if (profile === undefined) throw new Error(`No built-in instrument ${id}.`)
  return profile.transposition
}

// @test-link [[rule_suggestion_candidates]]
describe('the home note in written pitch', () => {
  // @test-link [[rule_suggestion_candidates]]
  it('adds the instrument’s chromatic transposition, modulo 12', () => {
    expect(writtenHomeNote(2, transpositionOf('c-keyboard'))).toBe('D')
    expect(writtenHomeNote(2, transpositionOf('bb-tenor'))).toBe('E')
    expect(writtenHomeNote(0, transpositionOf('eb-alto'))).toBe('A')
    expect(writtenHomeNote(11, { chromatic: -13, diatonic: -8 })).toBe('A#')
  })

  // @test-link [[rule_suggestion_candidates]]
  it('reads Jam’s written key back in concert pitch, the inverse for every pitch class', () => {
    for (const id of ['c-keyboard', 'bb-tenor', 'eb-alto']) {
      const transposition = transpositionOf(id)
      for (let concert = 0; concert < 12; concert += 1) {
        const written = writtenHomeNote(concert as PitchClassNumber, transposition)
        expect(concertHomeNote(written, transposition)).toBe(concert)
      }
    }
    expect(concertHomeNote('E', transpositionOf('bb-tenor'))).toBe(PITCH_CLASSES.indexOf('D'))
  })
})

// @test-link [[rule_suggestion_withheld]]
describe("a Collection's mode", () => {
  // @test-link [[rule_suggestion_withheld]]
  it('compares Major as Ionian and Minor as Aeolian, every mode as itself', () => {
    expect(keyModeOf('Major')).toBe('Ionian')
    expect(keyModeOf('Minor')).toBe('Aeolian')
    for (const mode of KEY_MODES) expect(keyModeOf(mode)).toBe(mode)
  })
})

// @test-link [[rule_suggestion_named_in_players_family]]
describe("the answer named in the player's family", () => {
  // @test-link [[rule_suggestion_named_in_players_family]]
  it('reads Ionian as Major and Aeolian as Minor when Jam’s Collection is Major or Minor', () => {
    for (const jam of ['Major', 'Minor'] as const) {
      expect(collectionInFamily('Ionian', jam)).toBe('Major')
      expect(collectionInFamily('Aeolian', jam)).toBe('Minor')
      for (const mode of ['Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'] as const) {
        expect(collectionInFamily(mode, jam)).toBe(mode)
      }
    }
  })

  // @test-link [[rule_suggestion_named_in_players_family]]
  it('names every answer as its mode when Jam’s Collection is a mode', () => {
    for (const jam of COLLECTIONS.filter((each) => each !== 'Major' && each !== 'Minor')) {
      for (const mode of KEY_MODES) expect(collectionInFamily(mode, jam)).toBe(mode)
    }
  })
})
