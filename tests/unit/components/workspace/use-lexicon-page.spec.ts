/**
 * The lexicon page's host over a fake history and a controlled loader: the first opening loads
 * once, later ones show at once with the same state; a session started during the load cancels
 * it; a failed load shows the notice and Try again loads again; Close steps back over the page's
 * entry; and the history rules: Back, Forward, a load and a typed `#lexicon`, during a session and
 * under a sheet.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { LoadedLexiconPage } from '@/components/workspace/load-lexicon-page'
import { useLexiconPage, type LexiconPageHost } from '@/components/workspace/use-lexicon-page'
import { createLexiconReader } from '@/lexicon'

import { fakeLexiconHistory, type FakeLexiconHistory } from './fake-lexicon-history'

/** A loaded page stub: a component that renders its props' state, and a fresh state maker. */
function loadedPage(): LoadedLexiconPage {
  return {
    module: {
      LexiconPage: { props: { reader: Object, state: Object }, render: () => h('div') },
      createLexiconPageState: vi.fn(() => ({ query: '' })),
      createLexiconReader,
    } as unknown as LoadedLexiconPage['module'],
    reader: createLexiconReader([]),
  }
}

/** The host under test, with what it was given. */
interface Rig {
  readonly host: LexiconPageHost
  readonly history: FakeLexiconHistory
  readonly load: ReturnType<typeof vi.fn<() => Promise<LoadedLexiconPage>>>
  readonly sessionActive: { value: boolean }
  readonly sheetOpen: { value: boolean }
  readonly workspace: HTMLElement
  readonly focusOpener: ReturnType<typeof vi.fn>
  readonly focusTryAgain: ReturnType<typeof vi.fn>
  readonly focusFallback: ReturnType<typeof vi.fn>
  /** Settle the pending load: it succeeds, or fails. */
  readonly finishLoad: (outcome?: 'loaded' | 'failed') => Promise<void>
}

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

/** Mount a host over a fake history (at `startHash` for a load there). */
function rig(startHash = ''): Rig {
  const history = fakeLexiconHistory(startHash)
  const settles: { resolve: (page: LoadedLexiconPage) => void; reject: (e: Error) => void }[] = []
  const load = vi.fn(
    () =>
      new Promise<LoadedLexiconPage>((resolve, reject) => {
        settles.push({ resolve, reject })
      }),
  )
  const sessionActive = ref(false)
  const sheetOpen = ref(false)
  const workspace = document.createElement('main')
  const focusOpener = vi.fn()
  const focusTryAgain = vi.fn()
  const focusFallback = vi.fn()
  let host: LexiconPageHost | null = null
  wrapper = mount(
    defineComponent({
      setup() {
        host = useLexiconPage({
          sessionActive: () => sessionActive.value,
          sheetOpen: () => sheetOpen.value,
          workspace: () => workspace,
          focusOpener,
          focusTryAgain,
          focusFallback,
          history,
          load,
        })
        return () => h(host!.view)
      },
    }),
  )
  if (host === null) throw new Error('rig: the host was not made')
  return {
    host,
    history,
    load,
    sessionActive,
    sheetOpen,
    workspace,
    focusOpener,
    focusTryAgain,
    focusFallback,
    finishLoad: async (outcome = 'loaded') => {
      const pending = settles.shift()
      if (pending === undefined) throw new Error('rig: no load is pending')
      if (outcome === 'loaded') pending.resolve(loadedPage())
      else pending.reject(new Error('Failed to fetch dynamically imported module'))
      await vi.waitFor(() => undefined)
      await nextTick()
      await nextTick()
    },
  }
}

/** The fake history's entries, as `#` parts with the page's own marked by a star. */
function entries(history: FakeLexiconHistory): string[] {
  return history.entries().map((entry) => `${entry.hash}${entry.pageEntry ? '*' : ''}`)
}

describe('useLexiconPage, opening and closing', () => {
  // @test-link [[req_lexicon_page]]
  it('loads at the first opening, showing it loads meanwhile, then opens with its own entry', async () => {
    const { host, history, load, finishLoad, workspace } = rig()
    host.press()
    expect(host.loading.value).toBe(true)
    expect(host.shown.value).toBe(false)
    await finishLoad()
    expect(host.loading.value).toBe(false)
    expect(host.shown.value).toBe(true)
    expect(host.page.value?.props.reader).toBeDefined()
    expect(entries(history)).toEqual(['', '#lexicon*'])
    expect(workspace.hasAttribute('inert')).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_lexicon_page]]
  it('shows the page at once at later openings, with the state it was left in', async () => {
    const { host, history, load, finishLoad } = rig()
    host.press()
    await finishLoad()
    const state = host.page.value?.props.state
    host.close()
    history.settle()
    await nextTick()
    host.press()
    expect(host.shown.value).toBe(true)
    expect(host.page.value?.props.state).toBe(state)
    expect(load).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_lexicon_page]]
  it('closes by Close stepping back over its entry, focus back on Lexicon', async () => {
    const { host, history, finishLoad, focusOpener, workspace } = rig()
    host.press()
    await finishLoad()
    host.close()
    expect(host.shown.value).toBe(false)
    await nextTick()
    expect(focusOpener).toHaveBeenCalledTimes(1)
    expect(workspace.hasAttribute('inert')).toBe(false)
    history.settle()
    expect(history.current()).toEqual({ hash: '', pageEntry: false })
    expect(host.shown.value).toBe(false)
  })

  // @test-link [[req_lexicon_page]]
  it('cancels the opening when a session starts during the load', async () => {
    const { host, history, sessionActive, finishLoad } = rig()
    host.press()
    sessionActive.value = true
    await nextTick()
    sessionActive.value = false
    await nextTick()
    await finishLoad()
    expect(host.shown.value).toBe(false)
    expect(entries(history)).toEqual([''])
  })

  // @test-link [[req_lexicon_page]]
  // @test-link [[module_lexicon_page_history_entry]]
  it('stops the opening when a sheet opens during the load, even closed again before it ends', async () => {
    const { host, history, load, sheetOpen, finishLoad } = rig()
    host.press()
    sheetOpen.value = true
    await nextTick()
    sheetOpen.value = false
    await nextTick()
    await finishLoad()
    expect(host.shown.value).toBe(false)
    expect(entries(history)).toEqual([''])
    host.press()
    expect(host.shown.value).toBe(true)
    expect(entries(history)).toEqual(['', '#lexicon*'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_lexicon_page]]
  it('shows the notice on a failed load, focus on Try again, and Try again loads again', async () => {
    const { host, load, finishLoad, focusTryAgain } = rig()
    host.press()
    await finishLoad('failed')
    expect(host.loadFailed.value).toBe(true)
    expect(host.shown.value).toBe(false)
    expect(focusTryAgain).toHaveBeenCalledTimes(1)
    host.press()
    await finishLoad()
    expect(load).toHaveBeenCalledTimes(2)
    expect(host.loadFailed.value).toBe(false)
    expect(host.shown.value).toBe(true)
  })

  // @test-link [[req_lexicon_page]]
  it('leaves the focus in a sheet open as the load fails', async () => {
    const { host, sheetOpen, finishLoad, focusTryAgain } = rig()
    host.press()
    sheetOpen.value = true
    await finishLoad('failed')
    expect(host.loadFailed.value).toBe(true)
    expect(focusTryAgain).not.toHaveBeenCalled()
  })

  // @test-link [[req_lexicon_page]]
  it('removes the notice on Dismiss, focus to the fallback', async () => {
    const { host, finishLoad, focusFallback } = rig()
    host.press()
    await finishLoad('failed')
    host.dismissFailure()
    expect(host.loadFailed.value).toBe(false)
    expect(focusFallback).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_lexicon_page]]
  it('refuses an opening during a session, every opener being disabled then', () => {
    const { host, sessionActive } = rig()
    sessionActive.value = true
    expect(() => host.press()).toThrow('opened during a session')
  })
})

describe('useLexiconPage, the history', () => {
  /** A host with the page opened once and its code loaded. */
  async function opened(): Promise<Rig> {
    const opening = rig()
    opening.host.press()
    await opening.finishLoad()
    return opening
  }

  // @test-link [[module_lexicon_page_history_entry]]
  it('closes on Back, staying in the app, focus back on Lexicon', async () => {
    const { host, history, focusOpener } = await opened()
    history.back()
    expect(host.shown.value).toBe(false)
    await nextTick()
    expect(focusOpener).toHaveBeenCalledTimes(1)
    expect(history.current()).toEqual({ hash: '', pageEntry: false })
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('reopens on Forward onto its entry, adding no entry', async () => {
    const { host, history } = await opened()
    history.back()
    history.forward()
    expect(host.shown.value).toBe(true)
    expect(entries(history)).toEqual(['', '#lexicon*'])
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('opens nothing on Forward during a session or under a sheet, only the address replaced', async () => {
    const { host, history, sessionActive, sheetOpen } = await opened()
    history.back()
    sessionActive.value = true
    history.forward()
    expect(host.shown.value).toBe(false)
    expect(entries(history)).toEqual(['', ''])
    sessionActive.value = false
    history.type('#lexicon')
    history.back()
    history.back()
    expect(host.shown.value).toBe(false)
    sheetOpen.value = true
    history.forward()
    expect(host.shown.value).toBe(false)
    expect(history.current().hash).toBe('')
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('handles a typed #lexicon as a load there: the address replaced, then the page opens with its own entry', async () => {
    const { host, history } = await opened()
    host.close()
    history.settle()
    history.type('#lexicon')
    expect(host.shown.value).toBe(true)
    expect(entries(history)).toEqual(['', '', '#lexicon*'])
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('only replaces a typed #lexicon during a session or under a sheet', () => {
    const { host, history, load, sessionActive, sheetOpen } = rig()
    sessionActive.value = true
    history.type('#lexicon')
    expect(history.current().hash).toBe('')
    sessionActive.value = false
    sheetOpen.value = true
    history.type('#lexicon')
    expect(history.current().hash).toBe('')
    expect(host.loading.value).toBe(false)
    expect(load).not.toHaveBeenCalled()
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('at a load at #lexicon, replaces the address at once, then opens the page with its own entry', async () => {
    const { host, history, finishLoad } = rig('#lexicon')
    expect(history.entries()[0]).toEqual({ hash: '', pageEntry: false })
    expect(host.loading.value).toBe(true)
    await finishLoad()
    expect(host.shown.value).toBe(true)
    expect(entries(history)).toEqual(['', '#lexicon*'])
  })

  // @test-link [[module_lexicon_page_history_entry]]
  it('leaves the address at #lexicon only while the page shows', async () => {
    const { host, history } = await opened()
    expect(history.current().hash).toBe('#lexicon')
    host.close()
    history.settle()
    expect(history.current().hash).toBe('')
  })
})
