/**
 * The browser adapter of the page-visibility port, on a hand-rolled stand-in of `document`: a
 * `visibilitychange` to hidden reaches the listener, one back to visible does not, and the
 * returned function stops listening.
 */
import { describe, expect, it } from 'vitest'

import {
  createDocumentPageVisibility,
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
