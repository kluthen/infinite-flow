// @vitest-environment node
/** The lexicon page's inline marks, built as text, and the folding its order and search use. */
import { describe, expect, it } from 'vitest'

import { markedParts, plainText, searchKey } from '@/components/lexicon/lexicon-text'

describe('markedParts', () => {
  // @test-link [[req_lexicon_page]]
  it('shows **bold** as bold and _emphasis_ as italic, the rest as plain text', () => {
    expect(markedParts('A **strong** and _soft_ word.')).toEqual([
      { kind: 'plain', text: 'A ' },
      { kind: 'bold', text: 'strong' },
      { kind: 'plain', text: ' and ' },
      { kind: 'emphasis', text: 'soft' },
      { kind: 'plain', text: ' word.' },
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('drops a code mark, keeping its words as plain text', () => {
    expect(markedParts('Used by the `chromatic approach` figure.')).toEqual([
      { kind: 'plain', text: 'Used by the chromatic approach figure.' },
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('shows any other Markdown, HTML included, as written', () => {
    const written = 'A [link](x) <b>tag</b> # heading, snake_case_name and 2 * 3 * 4.'
    expect(markedParts(written)).toEqual([{ kind: 'plain', text: written }])
  })

  // @test-link [[req_lexicon_page]]
  it('leaves an unclosed mark as written', () => {
    expect(markedParts('A **half-open mark.')).toEqual([
      { kind: 'plain', text: 'A **half-open mark.' },
    ])
  })
})

describe('plainText', () => {
  // @test-link [[req_lexicon_page]]
  it('drops the inline marks', () => {
    expect(plainText('**Bold**, _soft_ and `code`.')).toBe('Bold, soft and code.')
  })
})

describe('searchKey', () => {
  // @test-link [[req_lexicon_page]]
  it('ignores case, accents and marks, and counts hyphens, apostrophes and spaces as one space', () => {
    expect(searchKey('Compás')).toBe('compas')
    expect(searchKey('B-flat  instrument')).toBe('b flat instrument')
    expect(searchKey("Player's range")).toBe('player s range')
    expect(searchKey('Player’s range')).toBe('player s range')
    expect(searchKey('  **Half**   step ')).toBe('half step')
  })
})
