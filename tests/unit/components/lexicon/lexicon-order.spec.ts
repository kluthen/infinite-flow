// @vitest-environment node
/**
 * The lexicon page's A to Z: one order over every shown entry, ignoring case and accents, doubled
 * words in the lexicon's group order, the letters A to Z always listed, and the doubled words'
 * qualifier; on a made-up list read through the read interface.
 */
import { describe, expect, it } from 'vitest'

import { indexLexicon, letterOf } from '@/components/lexicon/lexicon-order'

import { FIXTURE_ENTRIES, fixtureEntry, fixtureReader } from './lexicon-fixture'

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

describe('indexLexicon', () => {
  // @test-link [[req_lexicon_page]]
  it('holds every shown entry once, in one A to Z order ignoring case and accents', () => {
    const index = indexLexicon(fixtureReader())
    expect(index.entries).toHaveLength(FIXTURE_ENTRIES.length)
    expect(index.entries.map((entry) => entry.id)).toEqual([
      'abc-notation',
      'b-flat-instrument',
      'compas',
      'half-step',
      'player-s-range',
      'tempo',
      'tempo-control',
      'whole-step',
    ])
  })

  // @test-link [[req_lexicon_page]]
  it("sorts a doubled word in the lexicon's group order, then same words in the lexicon's order", () => {
    const reader = fixtureReader([
      fixtureEntry({ id: 'echo-b', word: 'Echo', group: 'Group one', groupOrder: 1 }),
      fixtureEntry({ id: 'echo-a', word: 'echo', group: 'Group one', groupOrder: 1 }),
      fixtureEntry({ id: 'echo-c', word: 'Écho', group: 'Group two', groupOrder: 2 }),
    ])
    expect(indexLexicon(reader).entries.map((entry) => entry.id)).toEqual([
      'echo-b',
      'echo-a',
      'echo-c',
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('lists every letter A to Z, a letter with no word marked so, and no "#" when every word starts with a letter', () => {
    const index = indexLexicon(fixtureReader())
    expect(index.letters.map((letter) => letter.letter)).toEqual(ALPHABET)
    expect(
      index.letters.filter((letter) => letter.hasWords).map((letter) => letter.letter),
    ).toEqual(['A', 'B', 'C', 'H', 'P', 'T', 'W'])
  })

  // @test-link [[req_lexicon_page]]
  it('puts "#" first, with its words, only when a word starts with no letter', () => {
    const reader = fixtureReader([
      ...FIXTURE_ENTRIES,
      fixtureEntry({ id: 'four-four', word: '4/4 time', group: 'App controls', groupOrder: 3 }),
    ])
    const index = indexLexicon(reader)
    expect(index.letters[0]).toEqual({ letter: '#', hasWords: true })
    expect(index.letters).toHaveLength(27)
    expect(index.sections[0]?.letter).toBe('#')
    expect(index.sections[0]?.entries.map((entry) => entry.id)).toEqual(['four-four'])
  })

  // @test-link [[req_lexicon_page]]
  it('groups the entries under their letters, an accented word under its plain letter', () => {
    const index = indexLexicon(fixtureReader())
    const sections = Object.fromEntries(
      index.sections.map((section) => [section.letter, section.entries.map((entry) => entry.id)]),
    )
    expect(sections).toEqual({
      A: ['abc-notation'],
      B: ['b-flat-instrument'],
      C: ['compas'],
      H: ['half-step'],
      P: ['player-s-range'],
      T: ['tempo', 'tempo-control'],
      W: ['whole-step'],
    })
  })

  // @test-link [[req_lexicon_page]]
  it('names a doubled word with its group in brackets, any other word as it is', () => {
    const index = indexLexicon(fixtureReader())
    expect(index.label('tempo-control')).toBe('Tempo (App controls)')
    expect(index.label('tempo')).toBe('Tempo (Rhythm and meter)')
    expect(index.label('half-step')).toBe('Half step')
  })

  // @test-link [[req_lexicon_page]]
  it('finds an entry by its id, and fails on an id no shown entry has', () => {
    const index = indexLexicon(fixtureReader())
    expect(index.entry('compas').word).toBe('Compás')
    expect(() => index.entry('nothing')).toThrow('nothing')
  })
})

describe('letterOf', () => {
  // @test-link [[req_lexicon_page]]
  it('is the first character with its accent removed, upper case, or "#" for no letter', () => {
    expect(letterOf('compás')).toBe('C')
    expect(letterOf('Écho')).toBe('E')
    expect(letterOf('**Bold** word')).toBe('B')
    expect(letterOf('4/4 time')).toBe('#')
  })
})
