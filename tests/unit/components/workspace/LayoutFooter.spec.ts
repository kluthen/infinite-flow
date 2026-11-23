/**
 * The page footer: its note, then `footer-actions` holding `Your data` and `Lexicon`, each with
 * its own disabled flag, `Lexicon` showing that it loads; and the lexicon's load-failure notice in
 * the notice row, after Jam's, with Try again and Dismiss.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AppNoticeRow from '@/components/workspace/AppNoticeRow.vue'
import LayoutFooter from '@/components/workspace/LayoutFooter.vue'

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

/** The footer mounted with its three flags. */
function footer(
  props: { yourDataDisabled?: boolean; lexiconDisabled?: boolean; lexiconLoading?: boolean } = {},
): VueWrapper {
  wrapper = mount(LayoutFooter, {
    props: { yourDataDisabled: false, lexiconDisabled: false, lexiconLoading: false, ...props },
    attachTo: document.body,
  })
  return wrapper
}

describe('LayoutFooter', () => {
  // @test-link [[req_lexicon_page]]
  // @test-link [[req_your_data]]
  it('holds Your data then Lexicon together in footer-actions, after the note', () => {
    const mounted = footer()
    const children = Array.from(mounted.find('footer').element.children).map(
      (child) => child.className,
    )
    expect(children).toEqual(['footer-note', 'footer-actions'])
    expect(mounted.findAll('.footer-actions button').map((button) => button.text())).toEqual([
      'Your data',
      'Lexicon',
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('disables Lexicon on its own flag: enabled while Your data waits for the controller', () => {
    const waiting = footer({ yourDataDisabled: true })
    const [yourData, lexicon] = waiting.findAll('button')
    expect(yourData?.attributes('disabled')).toBeDefined()
    expect(lexicon?.attributes('disabled')).toBeUndefined()
    const running = footer({ yourDataDisabled: true, lexiconDisabled: true })
    expect(running.findAll('button')[1]?.attributes('disabled')).toBeDefined()
  })

  // @test-link [[req_lexicon_page]]
  it('shows Lexicon loading with is-loading and aria-busy', () => {
    const lexicon = footer({ lexiconLoading: true }).findAll('button')[1]
    expect(lexicon?.classes()).toContain('is-loading')
    expect(lexicon?.attributes('aria-busy')).toBe('true')
    const idle = footer().findAll('button')[1]
    expect(idle?.classes()).not.toContain('is-loading')
    expect(idle?.attributes('aria-busy')).toBeUndefined()
  })

  // @test-link [[req_lexicon_page]]
  it('tells each press apart, and takes focus back on Lexicon', async () => {
    const mounted = footer()
    const [yourData, lexicon] = mounted.findAll('button')
    await yourData?.trigger('click')
    await lexicon?.trigger('click')
    expect(mounted.emitted('open-your-data')).toHaveLength(1)
    expect(mounted.emitted('open-lexicon')).toHaveLength(1)
    ;(mounted.vm as unknown as { focusLexicon: () => void }).focusLexicon()
    expect(document.activeElement).toBe(lexicon?.element)
  })
})

describe("AppNoticeRow, the lexicon's load-failure notice", () => {
  /** The row with Jam's and the lexicon's notices. */
  function row(disabled = false): VueWrapper {
    wrapper = mount(AppNoticeRow, {
      props: { notice: null, disabled, jamLoadFailed: true, lexiconLoadFailed: true },
      attachTo: document.body,
    })
    return wrapper
  }

  // @test-link [[req_lexicon_page]]
  it("shows after Jam's, with Try again and Dismiss, and focuses its Try again", async () => {
    const mounted = row()
    const notices = mounted.findAll('.app-notice')
    expect(notices).toHaveLength(2)
    const lexicon = notices[1]!
    expect(lexicon.find('p').text()).toBe(
      "The lexicon couldn't open because part of the app didn't load. Check that you're online, then try again.",
    )
    expect(lexicon.findAll('button').map((button) => button.text())).toEqual([
      'Try again',
      'Dismiss',
    ])
    await lexicon.findAll('button')[0]?.trigger('click')
    await lexicon.findAll('button')[1]?.trigger('click')
    expect(mounted.emitted('lexicon-try-again')).toHaveLength(1)
    expect(mounted.emitted('lexicon-dismiss')).toHaveLength(1)
    expect(mounted.emitted('jam-try-again')).toBeUndefined()
    ;(mounted.vm as unknown as { focusLexiconTryAgain: () => void }).focusLexiconTryAgain()
    expect(document.activeElement).toBe(lexicon.findAll('button')[0]?.element)
  })

  // @test-link [[req_lexicon_page]]
  it('disables its buttons while a session runs', () => {
    const buttons = row(true).findAll('.app-notice')[1]!.findAll('button')
    expect(buttons.every((button) => button.attributes('disabled') !== undefined)).toBe(true)
  })
})
