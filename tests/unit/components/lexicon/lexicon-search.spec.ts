// @vitest-environment node
/**
 * The lexicon page's search: what it matches (the word and its other names, ignoring case,
 * accents, hyphens, apostrophes and spaces), its five tiers, A to Z inside each, and the plain
 * lines that mention the query; on a made-up list read through the read interface.
 */
import { describe, expect, it } from 'vitest'

import { indexLexicon } from '@/components/lexicon/lexicon-order'
import { searchLexicon } from '@/components/lexicon/lexicon-search'

import { fixtureEntry, fixtureReader } from './lexicon-fixture'

const index = indexLexicon(fixtureReader())

/** The ids the search matches, best first. */
function matchedIds(query: string, searched = index): string[] {
  return searchLexicon(searched, query).matches.map((match) => match.entry.id)
}

/** The ids of the entries whose plain line mentions the query. */
function mentionedIds(query: string): string[] {
  return searchLexicon(index, query).mentions.map((entry) => entry.id)
}

describe('searchLexicon', () => {
  // @test-link [[req_lexicon_page]]
  it('matches the word and other names ignoring case, accents, hyphens, apostrophes and spaces', () => {
    expect(matchedIds('compas')).toEqual(['compas'])
    expect(matchedIds('SEMITONE')).toEqual(['half-step'])
    expect(matchedIds('b flat')).toEqual(['b-flat-instrument'])
    expect(matchedIds('b-flat')).toEqual(['b-flat-instrument'])
    expect(matchedIds('players  range')).toEqual([])
    expect(matchedIds("player's   range")).toEqual(['player-s-range'])
    expect(matchedIds('player’s range')).toEqual(['player-s-range'])
  })

  // @test-link [[req_lexicon_page]]
  it('ranks its matches in five tiers, A to Z inside each', () => {
    const tiers = indexLexicon(
      fixtureReader([
        fixtureEntry({ id: 'semitone', word: 'Semitone', group: 'Pitch', groupOrder: 1 }),
        fixtureEntry({ id: 'baritone', word: 'Baritone', group: 'Pitch', groupOrder: 1 }),
        fixtureEntry({ id: 'whole-tone', word: 'Whole tone', group: 'Pitch', groupOrder: 1 }),
        fixtureEntry({ id: 'tone-row', word: 'Tone row', group: 'Pitch', groupOrder: 1 }),
        fixtureEntry({
          id: 'step',
          word: 'Step',
          group: 'Pitch',
          groupOrder: 1,
          otherNames: ['tone'],
        }),
        fixtureEntry({
          id: 'interval',
          word: 'Interval',
          group: 'Pitch',
          groupOrder: 1,
          otherNames: ['tone distance'],
        }),
        fixtureEntry({ id: 'tone', word: 'Tone', group: 'Pitch', groupOrder: 1 }),
      ]),
    )
    expect(matchedIds('tone', tiers)).toEqual([
      'tone', // the word equals the query
      'step', // another name equals it
      'tone-row', // the word starts with it
      'interval', // a word inside the word or another name starts with it, A to Z
      'whole-tone',
      'baritone', // it appears anywhere else, A to Z
      'semitone',
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('finds every word with a word inside it starting with the query', () => {
    expect(matchedIds('step')).toEqual(['half-step', 'whole-step'])
  })

  // @test-link [[req_lexicon_page]]
  it('names the other name a match was found by, none when the word itself matches as well', () => {
    const [bySecond] = searchLexicon(index, 'minor second').matches
    expect(bySecond).toMatchObject({ entry: { id: 'half-step' }, foundBy: 'minor second' })
    const [byWord] = searchLexicon(index, 'half').matches
    expect(byWord).toMatchObject({ entry: { id: 'half-step' }, foundBy: null })
  })

  // @test-link [[req_lexicon_page]]
  it('lists a doubled word in group order inside its tier', () => {
    expect(matchedIds('tempo')).toEqual(['tempo', 'tempo-control'])
  })

  // @test-link [[req_lexicon_page]]
  it('never searches the definitions or the app meanings', () => {
    expect(searchLexicon(index, 'piano')).toEqual({ matches: [], mentions: [] })
    expect(searchLexicon(index, 'chromatic')).toEqual({ matches: [], mentions: [] })
  })

  // @test-link [[req_lexicon_page]]
  it('lists apart, from three characters, the other entries whose plain line has a word starting with the query', () => {
    expect(mentionedIds('step')).toEqual(['b-flat-instrument'])
    expect(mentionedIds('tempo')).toEqual(['compas'])
    expect(mentionedIds('strong')).toEqual(['compas'])
    expect(mentionedIds('mallest')).toEqual([])
    expect(mentionedIds('st')).toEqual([])
    expect(matchedIds('st')).toEqual(['half-step', 'whole-step', 'b-flat-instrument'])
  })

  // @test-link [[req_lexicon_page]]
  it('matches nothing for a query of spaces, hyphens or apostrophes only', () => {
    expect(searchLexicon(index, " - ' ")).toEqual({ matches: [], mentions: [] })
  })
})
