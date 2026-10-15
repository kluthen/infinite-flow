/**
 * The browser adapter of the page-visibility port, on a hand-rolled stand-in of `document`: a
 * `visibilitychange` to hidden reaches the listener, one back to visible does not, and the
 * returned function stops listening. The page-leaving adapter beside it, on a hand-rolled
 * stand-in of `window`: a watch reads set once a `pagehide` fires after it, or at once if taken
 * while the page is going away, and stays set; a `pageshow` with `persisted` (the page brought back
 * from the back-forward cache) lets a later watch read not set, and one without it changes nothing.
 */
import { describe, expect, it } from 'vitest'

import {
  createDocumentPageVisibility,
  createWindowPageLeaving,
  type PageHideTargetLike,
  type VisibilityDocumentLike,
} from '@/components/workspace/browser-page-visibility'

/** A stand-in document whose visibility the test changes, firing `visibilitychange`. */
interface StandInDocument extends VisibilityDocumentLike {
  readonly setVisibility: (state: DocumentVisibilityState) => void
  readonly listenerCount: () => number
}

/** Intent: a visible stand-in document that fires `visibilitychange` on every change. */
function standInDocument(): StandInDocument {
  let state: DocumentVisibilityState = 'visible'
  const listeners = new Set<() => void>()
  return {
    get visibilityState() {
      return state
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    setVisibility: (next) => {
      state = next
      for (const listener of [...listeners]) listener()
    },
    listenerCount: () => listeners.size,
  }
}

// @test-link [[rule_hidden_tab_ends_session]]
describe('createDocumentPageVisibility', () => {
  // @test-link [[rule_hidden_tab_ends_session]]
  it('calls the listener when the page becomes hidden, never when it becomes visible', () => {
    const doc = standInDocument()
    let hidden = 0
    createDocumentPageVisibility(doc).onHidden(() => {
      hidden += 1
    })

    doc.setVisibility('hidden')
    expect(hidden).toBe(1)
    doc.setVisibility('visible')
    expect(hidden).toBe(1)
    doc.setVisibility('hidden')
    expect(hidden).toBe(2)
  })

  // @test-link [[rule_hidden_tab_ends_session]]
  it('stops calling the listener once unsubscribed', () => {
    const doc = standInDocument()
    let hidden = 0
    const stop = createDocumentPageVisibility(doc).onHidden(() => {
      hidden += 1
    })
    expect(doc.listenerCount()).toBe(1)

    stop()
    doc.setVisibility('hidden')
    expect(hidden).toBe(0)
    expect(doc.listenerCount()).toBe(0)
  })
})

/** A stand-in window whose page the test hides and shows, firing `pagehide` and `pageshow`. */
interface StandInWindow extends PageHideTargetLike {
  /** The page goes away, as `pagehide`. */
  readonly pagehide: () => void
  /** The page is shown, from the back-forward cache when `persisted`, else by its first load. */
  readonly pageshow: (persisted: boolean) => void
}

/** Intent: a stand-in window calling its `pagehide` and `pageshow` listeners in order. */
function standInWindow(): StandInWindow {
  type Listener = (event: { readonly persisted: boolean }) => void
  const hides: Listener[] = []
  const shows: Listener[] = []
  return {
    addEventListener(type: 'pagehide' | 'pageshow', listener: Listener): void {
      if (type === 'pagehide') hides.push(listener)
      else shows.push(listener)
    },
    pagehide: () => {
      for (const listener of hides) listener({ persisted: false })
    },
    pageshow: (persisted) => {
      for (const listener of shows) listener({ persisted })
    },
  }
}

// @test-link [[req_rolling_practice_session]]
describe('createWindowPageLeaving', () => {
  it('a watch taken before any pagehide reads not set, then set after one', () => {
    const win = standInWindow()
    const goingAway = createWindowPageLeaving(win).watch()
    expect(goingAway()).toBe(false)

    win.pagehide()
    expect(goingAway()).toBe(true)
  })

  it('a watch taken while the page is going away reads set at once', () => {
    const win = standInWindow()
    const leaving = createWindowPageLeaving(win)
    win.pagehide()

    expect(leaving.watch()()).toBe(true)
  })

  it('a watch once set stays set after the page comes back from the cache', () => {
    const win = standInWindow()
    const leaving = createWindowPageLeaving(win)
    const before = leaving.watch()
    win.pagehide()
    const during = leaving.watch()

    win.pageshow(true)
    expect(before()).toBe(true)
    expect(during()).toBe(true)
  })

  it('a watch taken after the page comes back reads not set, then set after the next pagehide', () => {
    const win = standInWindow()
    const leaving = createWindowPageLeaving(win)
    win.pagehide()
    win.pageshow(true)

    const goingAway = leaving.watch()
    expect(goingAway()).toBe(false)
    win.pagehide()
    expect(goingAway()).toBe(true)
  })

  it('a pageshow without persisted changes nothing', () => {
    const win = standInWindow()
    const leaving = createWindowPageLeaving(win)
    const staying = leaving.watch()
    win.pageshow(false)
    expect(staying()).toBe(false)
    expect(leaving.watch()()).toBe(false)

    win.pagehide()
    win.pageshow(false)
    expect(staying()).toBe(true)
    expect(leaving.watch()()).toBe(true)
  })
})
