// @vitest-environment node
/** The lexicon's read interface, over entries handed to it. */
import { describe, expect, it } from 'vitest'

import { createLexiconReader, type LexiconEntry } from '@/lexicon'

/** One made-up shown entry in the entry contract's shape. */
function entry(id: string, group: string, groupOrder: number): LexiconEntry {
  return {
    id,
    word: id,
    otherNames: [],
    popup: `${id}, a made-up word.`,
    definition: `${id} is made up.`,
    appMeaning: null,
    related: [],
    group,
    groupOrder,
  }
}

const handed = [
  entry('blorp', 'Group one', 1),
  entry('zindle', 'Group one', 1),
  entry('snerk', 'Group three', 3),
  entry('quaffle', 'Group four', 4),
]

describe('createLexiconReader', () => {
  // @test-link [[api_lexicon_read_contract]]
  it("gives the entries in the lexicon's order, as handed to it", () => {
    expect(createLexiconReader(handed).entries()).toEqual(handed)
  })

  // @test-link [[api_lexicon_read_contract]]
  it('finds one entry by its id, and none for an unknown id', () => {
    const reader = createLexiconReader(handed)
    expect(reader.entryById('snerk')).toEqual(handed[2])
    expect(reader.entryById('nothing')).toBeNull()
  })

  // @test-link [[api_lexicon_read_contract]]
  it("gives the groups' names in the lexicon's order", () => {
    expect(createLexiconReader(handed).groupNames()).toEqual([
      'Group one',
      'Group three',
      'Group four',
    ])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('fails on entries that break the contract: an id twice, or groups out of order', () => {
    expect(() => createLexiconReader([handed[0]!, handed[0]!])).toThrow(
      'the id blorp is given twice',
    )
    expect(() => createLexiconReader([handed[2]!, handed[0]!])).toThrow(
      "the group Group one comes after a later group in the lexicon's order",
    )
  })
})
