/**
 * The lexicon page's one loader over a mocked code entry and mocked words: every caller shares one
 * load, the words are read through the read interface, and a failed load clears the memo, so the
 * next call (Try again) loads again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLexiconReader, type LexiconEntry } from '@/lexicon'

/** Toggled per test to make the mocked words fail or load; counts the imports made. */
const importState = { wordsFail: false, pageImports: 0, wordsImports: 0 }

const WORD: LexiconEntry = {
  id: 'blorp',
  word: 'Blorp',
  otherNames: [],
  popup: 'A made-up word.',
  definition: 'Blorp is made up.',
  appMeaning: null,
  related: [],
  group: 'Shapes',
  groupOrder: 1,
}

// A fresh module registry and mocks per test, so each test's loader starts with no memo.
beforeEach(() => {
  importState.wordsFail = false
  importState.pageImports = 0
  importState.wordsImports = 0
  vi.resetModules()
  vi.doMock('@/components/lexicon/lexicon-page-module', () => {
    importState.pageImports += 1
    return { LexiconPage: { name: 'LexiconPageStub' }, createLexiconReader }
  })
  vi.doMock('virtual:lexicon-words', () => {
    importState.wordsImports += 1
    if (importState.wordsFail) throw new Error('chunk failed to fetch')
    return { default: [WORD] }
  })
})

afterEach(() => {
  vi.doUnmock('@/components/lexicon/lexicon-page-module')
  vi.doUnmock('virtual:lexicon-words')
})

describe('loadLexiconPage', () => {
  // @test-link [[req_lexicon_page]]
  it('loads the page and its words once for every caller, read through the read interface', async () => {
    const { loadLexiconPage } = await import('@/components/workspace/load-lexicon-page')
    const first = loadLexiconPage()
    expect(loadLexiconPage()).toBe(first)
    const loaded = await first
    expect(loaded.module.LexiconPage).toEqual({ name: 'LexiconPageStub' })
    expect(loaded.reader.entries()).toEqual([WORD])
    expect(loaded.reader.entryById('blorp')).toEqual(WORD)
    expect(loadLexiconPage()).toBe(first)
    expect(importState.wordsImports).toBe(1)
  })

  // @test-link [[req_lexicon_page]]
  it('clears the memo on a failed load, so Try again loads again', async () => {
    importState.wordsFail = true
    const { loadLexiconPage } = await import('@/components/workspace/load-lexicon-page')
    await expect(loadLexiconPage()).rejects.toThrow()
    importState.wordsFail = false
    const loaded = await loadLexiconPage()
    expect(loaded.reader.entries()).toEqual([WORD])
    expect(importState.wordsImports).toBe(2)
  })
})
