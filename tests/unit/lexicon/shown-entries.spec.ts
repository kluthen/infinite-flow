// @vitest-environment node
/**
 * The shaping of parsed entries into shown entries, the entry contract's nine fields: on the real
 * lexicon file (compared against the file itself, read here without the parser) and on a made-up
 * lexicon.
 */
import { describe, expect, it } from 'vitest'

import { parseLexicon, shownEntries } from '@/lexicon'

import {
  fileEntries,
  fullSampleEntry,
  idsOf,
  realLexiconText,
  sampleEntryLines,
  sampleLexicon,
} from './lexicon-test-text'

const contractFields = [
  'appMeaning',
  'definition',
  'group',
  'groupOrder',
  'id',
  'otherNames',
  'popup',
  'related',
  'word',
]

describe('shownEntries on the real lexicon file', () => {
  const text = realLexiconText()
  const shown = shownEntries(parseLexicon(text, 'docs/music/lexicon.md'))
  const fileShown = fileEntries(text).filter((entry) => !/^Internal\b/u.test(entry.group))
  const fileInternal = fileEntries(text).filter((entry) => /^Internal\b/u.test(entry.group))

  // @test-link [[module_lexicon_single_source]]
  it('holds every entry outside the Internal group, in the file order, and none inside it', () => {
    expect(fileShown.length).toBeGreaterThan(0)
    expect(fileInternal.length).toBeGreaterThan(0)
    expect(shown.map((entry) => entry.id)).toEqual(
      fileShown.map((entry) => idsOf(entry.fields.id)[0]),
    )
    const internalIds = new Set(fileInternal.map((entry) => idsOf(entry.fields.id)[0]))
    expect(shown.filter((entry) => internalIds.has(entry.id))).toEqual([])
  })

  // @test-link [[module_lexicon_single_source]]
  // @test-link [[api_lexicon_read_contract]]
  it('gives each entry the same fields as the file, as written, and related ids only to shown entries', () => {
    const shownIds = new Set(shown.map((entry) => entry.id))
    shown.forEach((entry, index) => {
      const file = fileShown[index]!
      expect(entry.word).toBe(file.word)
      expect(entry.popup).toBe(file.fields.popup)
      expect(entry.definition).toBe(file.fields.definition)
      expect(entry.appMeaning).toBe(file.fields.in_infinite_flow ?? null)
      expect(entry.group).toBe(file.group)
      const aliases = file.fields.aliases
      expect(entry.otherNames.join(', ')).toBe(
        aliases === undefined || aliases === 'none' ? '' : aliases,
      )
      expect(entry.related).toEqual(idsOf(file.fields.related).filter((id) => shownIds.has(id)))
    })
  })

  // @test-link [[api_lexicon_read_contract]]
  it('gives exactly the nine fields of the entry contract, so no sources text', () => {
    for (const entry of shown) {
      expect(Object.keys(entry).sort()).toEqual(contractFields)
      expect(Number.isInteger(entry.groupOrder) && entry.groupOrder >= 1).toBe(true)
    }
  })
})

describe('shownEntries on a made-up lexicon', () => {
  const text = sampleLexicon({
    'Group one': [
      sampleEntryLines(
        fullSampleEntry('Blorp', {
          aliases: 'blorpy, blorp (old, rare), the _blorp_',
          related: '`quaffle`, `zindle`, `snerk`',
        }),
      ),
      sampleEntryLines({
        word: 'Zindle',
        id: '`zindle`',
        popup: 'A **made-up** word.',
        definition: 'Zindle is made up.',
      }),
    ],
    'Group two': [sampleEntryLines(fullSampleEntry('Snerk'))],
    'Internal (no popup)': [sampleEntryLines(fullSampleEntry('Quaffle'))],
  })
  const shown = shownEntries(parseLexicon(text, 'tests/sample-lexicon.md'))

  // @test-link [[api_lexicon_read_contract]]
  it('drops the Internal entries and the related ids naming them, and keeps the order', () => {
    expect(shown.map((entry) => entry.id)).toEqual(['blorp', 'zindle', 'snerk'])
    expect(shown[0]!.related).toEqual(['zindle', 'snerk'])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('splits the aliases into other names at top-level commas, none giving none', () => {
    expect(shown[0]!.otherNames).toEqual(['blorpy', 'blorp (old, rare)', 'the _blorp_'])
    expect(shown[2]!.otherNames).toEqual([])
    expect(shown[1]!.otherNames).toEqual([])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('gives null for no app meaning, the group and its place, and the text as written', () => {
    expect(shown[1]).toEqual({
      id: 'zindle',
      word: 'Zindle',
      otherNames: [],
      popup: 'A **made-up** word.',
      definition: 'Zindle is made up.',
      appMeaning: null,
      related: [],
      group: 'Group one',
      groupOrder: 1,
    })
    expect(shown[2]).toMatchObject({ group: 'Group two', groupOrder: 2 })
  })
})
