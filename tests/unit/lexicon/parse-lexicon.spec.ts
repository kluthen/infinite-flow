// @vitest-environment node
/**
 * The lexicon's parser, on the real lexicon file (compared against the file itself, read here
 * without the parser, never against a stored copy) and on made-up lexicons that break each rule of
 * the template.
 */
import { describe, expect, it } from 'vitest'

import { LexiconFormatError, parseLexicon } from '@/lexicon'

import {
  fileEntries,
  fullSampleEntry,
  idsOf,
  realLexiconText,
  sampleEntryLines,
  sampleLexicon,
} from './lexicon-test-text'

const realFileName = 'docs/music/lexicon.md'
const sampleFileName = 'tests/sample-lexicon.md'

/** Whether a group is the lexicon's Internal group, as the file heads it. */
function isInternal(group: string): boolean {
  return /^Internal\b/u.test(group)
}

/** The parse's failure on a lexicon text, which must fail with the parser's own error. */
function parseFailure(text: string): LexiconFormatError {
  try {
    parseLexicon(text, sampleFileName)
  } catch (error) {
    if (error instanceof LexiconFormatError) return error
    throw error
  }
  throw new Error('the parse did not fail')
}

/** The 1-based line of the `### word` heading in a text. */
function headingLine(text: string, word: string): number {
  return text.split('\n').indexOf(`### ${word}`) + 1
}

describe('parseLexicon on the real lexicon file', () => {
  const text = realLexiconText()
  const expected = fileEntries(text)

  // @test-link [[module_lexicon_single_source]]
  it('passes, and gives every ### entry of the file with its id, fields, group and line', () => {
    const parsed = parseLexicon(text, realFileName)
    expect(expected.length).toBeGreaterThan(0)
    expect(parsed.map((entry) => entry.word)).toEqual(expected.map((entry) => entry.word))
    parsed.forEach((entry, index) => {
      const file = expected[index]!
      expect(entry.id).toBe(idsOf(file.fields.id)[0])
      expect(entry.group).toBe(file.group)
      expect(entry.internal).toBe(isInternal(file.group))
      expect(entry.aliases).toBe(file.fields.aliases ?? null)
      expect(entry.popup).toBe(file.fields.popup)
      expect(entry.definition).toBe(file.fields.definition)
      expect(entry.inInfiniteFlow).toBe(file.fields.in_infinite_flow ?? null)
      expect(entry.related).toEqual(idsOf(file.fields.related))
      expect(entry.sources).toBe(file.fields.sources ?? null)
      expect(text.split('\n')[entry.line - 1]).toBe(`### ${entry.word}`)
    })
  })

  // @test-link [[api_lexicon_read_contract]]
  it("numbers the groups from 1 in the file's order", () => {
    const parsed = parseLexicon(text, realFileName)
    const groups = [...new Set(expected.map((entry) => entry.group))]
    for (const entry of parsed) {
      expect(entry.groupOrder).toBe(groups.indexOf(entry.group) + 1)
    }
    expect(parsed.some((entry) => entry.internal)).toBe(true)
    expect(parsed.some((entry) => !entry.internal)).toBe(true)
  })
})

describe('parseLexicon on a well-formed made-up lexicon', () => {
  // @test-link [[api_lexicon_read_contract]]
  it('reads fields as written, optional fields left out as null, and the related ids', () => {
    const text = sampleLexicon({
      'Group one': [
        sampleEntryLines(
          fullSampleEntry('Blorp', { aliases: 'blorpy, blorp (old, rare)', related: '`zindle`' }),
        ),
        sampleEntryLines({
          word: 'Zindle',
          id: '`zindle`',
          popup: 'A **made-up** word with `marks`.',
          definition: 'Zindle is _made up_ too.',
        }),
      ],
    })
    const [blorp, zindle] = parseLexicon(text, sampleFileName)
    expect(blorp).toMatchObject({
      word: 'Blorp',
      id: 'blorp',
      aliases: 'blorpy, blorp (old, rare)',
      related: ['zindle'],
      sources: 'tests only',
      group: 'Group one',
      groupOrder: 1,
      internal: false,
      line: headingLine(text, 'Blorp'),
    })
    expect(zindle).toMatchObject({
      word: 'Zindle',
      id: 'zindle',
      aliases: null,
      popup: 'A **made-up** word with `marks`.',
      definition: 'Zindle is _made up_ too.',
      inInfiniteFlow: null,
      related: [],
      sources: null,
    })
  })
})

describe('parseLexicon fails on each rule of the template, naming the word and its line', () => {
  const required = ['id', 'popup', 'definition'] as const

  for (const field of required) {
    // @test-link [[module_lexicon_single_source]]
    it(`an entry without its ${field}`, () => {
      const broken = { ...fullSampleEntry('Blorp') }
      delete (broken as Record<string, unknown>)[field]
      const text = sampleLexicon({
        'Group one': [sampleEntryLines(fullSampleEntry('Zindle')), sampleEntryLines(broken)],
      })
      const error = parseFailure(text)
      expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}`)
      expect(error.message).toContain('"Blorp"')
      expect(error.message).toContain(`lacks the required field ${field}`)
    })
  }

  // @test-link [[module_lexicon_single_source]]
  it('an Internal entry without its popup', () => {
    const broken = { ...fullSampleEntry('Blorp') }
    delete (broken as Record<string, unknown>).popup
    const text = sampleLexicon({
      'Group one': [sampleEntryLines(fullSampleEntry('Zindle'))],
      'Internal (no popup)': [sampleEntryLines(broken)],
    })
    expect(parseFailure(text).message).toContain(
      `${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp" lacks the required field popup`,
    )
  })

  /** A lexicon whose second entry, Blorp, has the given lines under its heading. */
  function lexiconWithBlorpLines(lines: string[]): string {
    return sampleLexicon({
      'Group one': [sampleEntryLines(fullSampleEntry('Zindle')), ['### Blorp', '', ...lines, '']],
    })
  }

  const blorpId = '- **id:** `blorp`'
  const blorpPopup = '- **popup:** A made-up plain line.'
  const blorpDefinition = '- **definition:** A made-up definition.'

  // @test-link [[module_lexicon_single_source]]
  it('a field the template does not name', () => {
    const text = lexiconWithBlorpLines([blorpId, blorpPopup, '- **colour:** red', blorpDefinition])
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain('the field colour is not one of the template')
  })

  // @test-link [[module_lexicon_single_source]]
  it('a field given twice', () => {
    const text = lexiconWithBlorpLines([blorpId, blorpPopup, blorpPopup, blorpDefinition])
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain('gives the field popup twice')
  })

  // @test-link [[module_lexicon_single_source]]
  it("fields out of the template's order", () => {
    const text = lexiconWithBlorpLines([blorpId, blorpDefinition, blorpPopup])
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain("the field popup is out of the template's order")
  })

  // @test-link [[module_lexicon_single_source]]
  it('a line under the entry that is not a field', () => {
    const text = lexiconWithBlorpLines([blorpId, blorpPopup, 'A stray sentence.', blorpDefinition])
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain(
      `line ${text.split('\n').indexOf('A stray sentence.') + 1} is not a field`,
    )
  })

  // @test-link [[module_lexicon_single_source]]
  it('an id used twice', () => {
    const text = sampleLexicon({
      'Group one': [
        sampleEntryLines(fullSampleEntry('Zindle')),
        sampleEntryLines(fullSampleEntry('Blorp', { id: '`zindle`' })),
      ],
    })
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain(
      `uses the id zindle, already used by "Zindle" at line ${headingLine(text, 'Zindle')}`,
    )
  })

  // @test-link [[module_lexicon_single_source]]
  it('a related id that names no entry of the file', () => {
    const text = sampleLexicon({
      'Group one': [
        sampleEntryLines(fullSampleEntry('Zindle')),
        sampleEntryLines(fullSampleEntry('Blorp', { related: '`zindle`, `quaffle`' })),
      ],
    })
    const error = parseFailure(text)
    expect(error.message).toContain(`${sampleFileName}:${headingLine(text, 'Blorp')}: "Blorp"`)
    expect(error.message).toContain('the related id quaffle names no entry of the file')
  })

  // @test-link [[module_lexicon_single_source]]
  it('a lexicon with no shown entry, naming the file', () => {
    const onlyInternal = sampleLexicon({
      'Internal (no popup)': [sampleEntryLines(fullSampleEntry('Blorp'))],
    })
    expect(parseFailure(onlyInternal).message).toBe(
      `${sampleFileName}: the lexicon has no shown entry`,
    )
    expect(parseFailure('').message).toBe(`${sampleFileName}: the lexicon has no shown entry`)
  })
})
