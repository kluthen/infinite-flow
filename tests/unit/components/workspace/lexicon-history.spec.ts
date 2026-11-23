/**
 * The lexicon page's history seam over the window's own history and address: the page's marked
 * `#lexicon` entry pushed, marked and stepped back over, the bare address put back with the path
 * and the query left alone, and every move of the history or the address heard.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserLexiconHistory } from '@/components/workspace/lexicon-history'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('browserLexiconHistory', () => {
  // @test-link [[module_lexicon_page_history_entry]]
  it("pushes the page's own entry at #lexicon, marked as the page's", () => {
    window.history.replaceState(null, '', '/app/?seed=4')
    const history = browserLexiconHistory()
    const before = window.history.length
    expect(history.atLexiconAddress()).toBe(false)
    history.pushPageEntry()
    expect(window.history.length).toBe(before + 1)
    expect(window.location.hash).toBe('#lexicon')
    expect(`${window.location.pathname}${window.location.search}`).toBe('/app/?seed=4')
    expect(history.onPageEntry()).toBe(true)
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it("tells a #lexicon reached another way from the page's own entry, and marks it", () => {
    window.history.replaceState(null, '', '/#lexicon')
    const history = browserLexiconHistory()
    expect(history.atLexiconAddress()).toBe(true)
    expect(history.onPageEntry()).toBe(false)
    history.markPageEntry()
    expect(history.onPageEntry()).toBe(true)
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('replaces the address with the bare one, the path and the query left alone, adding no entry', () => {
    window.history.replaceState({ other: 1 }, '', '/app/?seed=4#lexicon')
    const history = browserLexiconHistory()
    const before = window.history.length
    history.replaceWithBareAddress()
    expect(window.location.href).toBe(`${window.location.origin}/app/?seed=4`)
    expect(window.history.length).toBe(before)
    expect(window.history.state).toBeNull()
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('steps back as the Back button does, and hears every move until stopped', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const history = browserLexiconHistory()
    history.stepBack()
    expect(back).toHaveBeenCalledTimes(1)
    const onMove = vi.fn()
    const stop = history.listen(onMove)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(onMove).toHaveBeenCalledTimes(2)
    stop()
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(onMove).toHaveBeenCalledTimes(2)
    back.mockRestore()
  })
})
