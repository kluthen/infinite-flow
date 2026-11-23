/**
 * The lexicon page over a made-up list read through the read interface: every shown entry under
 * its letter, one entry and its More, marks shown as text, the letter row, the search with its
 * tiers, one match, no match and the mentions, the jumps that navigate nowhere, the focus on
 * open, the trap and Escape, the state kept for the visit, and the bar's measured height.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import LexiconPage from '@/components/lexicon/LexiconPage.vue'
import {
  createLexiconPageState,
  type LexiconPageState,
} from '@/components/lexicon/lexicon-page-state'

import { FIXTURE_ENTRIES, fixtureReader } from './lexicon-fixture'

let wrapper: VueWrapper | null = null
/** The callbacks of the ResizeObservers the page made. */
let resizeCallbacks: (() => void)[] = []
const scrollIntoView = vi.fn()

beforeEach(() => {
  resizeCallbacks = []
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback)
      }
      observe(): void {}
      disconnect(): void {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** The page mounted in the document over the fixture, with a fine pointer unless told. */
function page(options: { state?: LexiconPageState; finePointer?: boolean } = {}): VueWrapper {
  wrapper?.unmount()
  wrapper = mount(LexiconPage, {
    props: {
      reader: fixtureReader(),
      state: options.state ?? createLexiconPageState(),
      finePointer: () => options.finePointer ?? true,
    },
    attachTo: document.body,
  })
  return wrapper
}

/** Type into the search field, as the player would. */
async function type(mounted: VueWrapper, text: string): Promise<void> {
  await mounted.find('input[type="search"]').setValue(text)
}

/** The words of the entries listed, in order. */
function listedWords(mounted: VueWrapper): string[] {
  return mounted.findAll('.lexicon-entry .lexicon-word').map((word) => word.text())
}

/** Press a key on the document, as the player would anywhere in the page. */
function press(key: string, shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
}

/** Click a link and say whether its own navigation was cancelled. */
function clickCancelled(link: Element): boolean {
  const click = new MouseEvent('click', { bubbles: true, cancelable: true })
  link.dispatchEvent(click)
  return click.defaultPrevented
}

describe('LexiconPage, browsing', () => {
  // @test-link [[req_lexicon_page]]
  it('is a modal dialog named by its title, with the count of the shown entries', () => {
    const mounted = page()
    const view = mounted.find('.lexicon-view')
    expect(view.attributes()).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
    expect(view.attributes('aria-labelledby')).toBe('lexicon-title')
    expect(mounted.find('#lexicon-title').text()).toBe('Lexicon')
    expect(mounted.find('.lexicon-bar-row .sheet-hint').text()).toBe(
      `${FIXTURE_ENTRIES.length} words`,
    )
  })

  // @test-link [[req_lexicon_page]]
  it('lists every shown entry A to Z under its letter', () => {
    const mounted = page()
    const sections = mounted.findAll('.lexicon-section').map((section) => ({
      letter: section.find('.lexicon-letter-heading').text(),
      words: section.findAll('.lexicon-word').map((word) => word.text()),
    }))
    expect(sections).toEqual([
      { letter: 'A', words: ['ABC notation'] },
      { letter: 'B', words: ['B-flat instrument'] },
      { letter: 'C', words: ['Compás'] },
      { letter: 'H', words: ['Half step'] },
      { letter: 'P', words: ["Player's range"] },
      { letter: 'T', words: ['Tempo', 'Tempo'] },
      { letter: 'W', words: ['Whole step'] },
    ])
    expect(mounted.find('#lexicon-letter-t').attributes('tabindex')).toBe('-1')
  })

  // @test-link [[req_lexicon_page]]
  it('lists the letters A to Z: a letter with words a link to its heading, one with none plain text', () => {
    const mounted = page()
    const items = mounted.findAll('.lexicon-letters li')
    expect(items.map((item) => item.text()).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    const links = mounted.findAll('a.lexicon-letter')
    expect(links.map((link) => link.text())).toEqual(['A', 'B', 'C', 'H', 'P', 'T', 'W'])
    expect(links[0]?.attributes('href')).toBe('#lexicon-letter-a')
    const empty = mounted.findAll('span.lexicon-letter.is-empty')
    expect(empty).toHaveLength(19)
    expect(empty[0]?.attributes('tabindex')).toBeUndefined()
  })

  // @test-link [[req_lexicon_page]]
  it('shows one entry: its word, group, plain line and other names, its detail closed behind More', () => {
    const mounted = page()
    const entry = mounted.find('#lexicon-half-step')
    expect(entry.find('.lexicon-word').text()).toBe('Half step')
    expect(entry.find('.lexicon-group').text()).toBe('Pitch')
    expect(entry.find('.lexicon-popup').text()).toBe('The smallest step between two notes.')
    expect(entry.find('.sheet-hint').text()).toBe('Also called semitone, minor second.')
    expect(entry.find('details').element.hasAttribute('open')).toBe(false)
    expect(entry.find('summary').text()).toBe('More')
    expect(entry.find('summary').attributes('aria-label')).toBe('More about Half step')
    expect(mounted.find('#lexicon-tempo .sheet-hint').exists()).toBe(false)
  })

  // @test-link [[req_lexicon_page]]
  it('opens an entry in place: its definition, its app meaning and its related words, marks shown as text', async () => {
    const mounted = page()
    const details = mounted.find('#lexicon-half-step details')
    ;(details.element as HTMLDetailsElement).open = true
    await details.trigger('toggle')
    const detail = mounted.find('#lexicon-half-step .lexicon-detail')
    expect(mounted.find('#lexicon-half-step summary').text()).toBe('Less')
    expect(mounted.find('#lexicon-half-step summary').attributes('aria-label')).toBe(
      'Less about Half step',
    )
    const [definition, appMeaning] = detail.findAll('p')
    expect(definition?.html()).toContain('<strong>next</strong>')
    expect(definition?.html()).toContain('<em>piano</em>')
    expect(definition?.text()).toBe(
      'A half step is the distance from one key to the next on a piano.',
    )
    expect(detail.find('h5').text()).toBe('In Infinite Flow')
    expect(appMeaning?.text()).toBe('Used by the chromatic approach figure.')
    expect(detail.find('.lexicon-related').text()).toBe(
      'Related: Whole step, Tempo (Rhythm and meter)',
    )
    expect(detail.findAll('.lexicon-link').map((link) => link.attributes('href'))).toEqual([
      '#lexicon-whole-step',
      '#lexicon-tempo',
    ])
    expect(mounted.find('#lexicon-compas details h5').exists()).toBe(false)
  })

  // @test-link [[req_lexicon_page]]
  it('never reads the lexicon text as HTML', () => {
    const reader = fixtureReader([{ ...FIXTURE_ENTRIES[0]!, popup: 'A <b>tag</b> & a [link](x).' }])
    wrapper = mount(LexiconPage, {
      props: { reader, state: createLexiconPageState(), finePointer: () => true },
      attachTo: document.body,
    })
    const popup = wrapper.find('.lexicon-popup')
    expect(popup.text()).toBe('A <b>tag</b> & a [link](x).')
    expect(popup.find('b').exists()).toBe(false)
  })

  // @test-link [[req_lexicon_page]]
  it('keeps several entries open at once', async () => {
    const state = createLexiconPageState()
    const mounted = page({ state })
    for (const id of ['tempo', 'compas']) {
      const details = mounted.find(`#lexicon-${id} details`)
      ;(details.element as HTMLDetailsElement).open = true
      await details.trigger('toggle')
    }
    expect(state.openIds).toEqual(['tempo', 'compas'])
  })
})

describe('LexiconPage, moving around', () => {
  // @test-link [[req_lexicon_page]]
  it('jumps to a letter, cancelling its navigation, the heading focused', async () => {
    const mounted = page()
    expect(clickCancelled(mounted.find('a.lexicon-letter[href="#lexicon-letter-t"]').element)).toBe(
      true,
    )
    await nextTick()
    expect(document.activeElement).toBe(mounted.find('#lexicon-letter-t').element)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
  })

  // @test-link [[req_lexicon_page]]
  it('clears the search when a letter is chosen while searching', async () => {
    const state = createLexiconPageState()
    const mounted = page({ state })
    await type(mounted, 'step')
    clickCancelled(mounted.find('a.lexicon-letter[href="#lexicon-letter-c"]').element)
    await nextTick()
    await nextTick()
    expect(state.query).toBe('')
    expect(document.activeElement).toBe(mounted.find('#lexicon-letter-c').element)
  })

  // @test-link [[req_lexicon_page]]
  it('follows a related word: no navigation, the search emptied, its entry opened, focus on its word, the one left still open', async () => {
    const state = createLexiconPageState()
    state.setOpen('half-step', true)
    state.setQuery('half')
    const mounted = page({ state })
    const link = mounted.find('#lexicon-half-step .lexicon-link[href="#lexicon-tempo"]')
    expect(clickCancelled(link.element)).toBe(true)
    await nextTick()
    await nextTick()
    expect(state.query).toBe('')
    expect(state.openIds).toEqual(['half-step', 'tempo'])
    expect(document.activeElement).toBe(mounted.find('#lexicon-tempo .lexicon-word').element)
  })

  // @test-link [[req_lexicon_page]]
  it('jumps back to the letter row by Letters, focus on its first letter with words', async () => {
    const mounted = page()
    await mounted.find('.lexicon-letters-button').trigger('click')
    expect(document.activeElement).toBe(mounted.find('a.lexicon-letter').element)
  })
})

describe('LexiconPage, searching', () => {
  // @test-link [[req_lexicon_page]]
  it('replaces the letter sections with the matches, best first, on every change', async () => {
    const mounted = page()
    await type(mounted, 'tempo')
    expect(mounted.find('.lexicon-section').exists()).toBe(false)
    expect(listedWords(mounted)).toEqual(['Tempo', 'Tempo', 'Compás'])
    await type(mounted, 'tempo c')
    expect(listedWords(mounted)).toEqual([])
  })

  // @test-link [[req_lexicon_page]]
  it('holds the matches in a section named by its hidden heading "Matching words"', async () => {
    const mounted = page()
    await type(mounted, 'tempo')
    const heading = mounted.find('.lexicon-matches-heading')
    expect(heading.element.tagName).toBe('H3')
    expect(heading.text()).toBe('Matching words')
    const matches = heading.element.parentElement
    expect(matches?.tagName).toBe('SECTION')
    expect(matches?.getAttribute('aria-labelledby')).toBe(heading.attributes('id'))
    const words = [...(matches?.querySelectorAll('.lexicon-word') ?? [])].map(
      (word) => word.textContent,
    )
    expect(words).toEqual(['Tempo', 'Tempo'])
    await type(mounted, 'zzz')
    expect(mounted.find('.lexicon-matches-heading').exists()).toBe(false)
  })

  // @test-link [[req_lexicon_page]]
  it('opens the one match', async () => {
    const state = createLexiconPageState()
    const mounted = page({ state })
    await type(mounted, 'compas')
    expect(state.openIds).toEqual(['compas'])
    expect(mounted.find('#lexicon-compas details').element.hasAttribute('open')).toBe(true)
  })

  // @test-link [[req_lexicon_page]]
  it('shows the other name a match was found by first, in bold', async () => {
    const mounted = page()
    await type(mounted, 'minor second')
    const names = mounted.find('#lexicon-half-step .sheet-hint')
    expect(names.text()).toBe('Also called minor second, semitone.')
    expect(names.find('strong').text()).toBe('minor second')
  })

  // @test-link [[req_lexicon_page]]
  it('lists the mentions apart, from three characters', async () => {
    const mounted = page()
    await type(mounted, 'st')
    expect(mounted.find('.lexicon-mentions').exists()).toBe(false)
    await type(mounted, 'step')
    const mentions = mounted.find('.lexicon-mentions')
    expect(mentions.find('h3').text()).toBe('Mentioned in other words')
    expect(mentions.find('.sheet-hint').text()).toBe(
      "Their name doesn't contain “step”, but their short line does.",
    )
    expect(mentions.findAll('.lexicon-word').map((word) => word.text())).toEqual([
      'B-flat instrument',
    ])
  })

  // @test-link [[req_lexicon_page]]
  it('says when nothing matches, and Clear search returns to A to Z with focus in the field', async () => {
    const state = createLexiconPageState()
    const mounted = page({ state })
    await type(mounted, 'zzz')
    const empty = mounted.find('.lexicon-empty')
    expect(empty.findAll('p').map((line) => line.text())).toEqual([
      'No word matches “zzz”.',
      'Check the spelling, or type only the first letters of the word.',
    ])
    await empty.find('button').trigger('click')
    await nextTick()
    expect(state.query).toBe('')
    expect(mounted.findAll('.lexicon-section')).toHaveLength(7)
    expect(document.activeElement).toBe(mounted.find('input[type="search"]').element)
  })

  // @test-link [[req_lexicon_page]]
  it('writes the result count once the typing pauses for half a second', async () => {
    vi.useFakeTimers()
    const mounted = page()
    await type(mounted, 'ste')
    await type(mounted, 'step')
    const count = mounted.find('.lexicon-result-count')
    expect(count.attributes('role')).toBe('status')
    expect(count.text()).toBe('')
    vi.advanceTimersByTime(499)
    await nextTick()
    expect(count.text()).toBe('')
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(count.text()).toBe('2 words match “step”.')
    await type(mounted, 'compas')
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(mounted.find('.lexicon-result-count').text()).toBe('1 word matches “compas”.')
    await type(mounted, 'zzz')
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(mounted.find('.lexicon-result-count').text()).toBe('No word matches “zzz”.')
  })
})

describe('LexiconPage, focus and keys', () => {
  // @test-link [[req_lexicon_page]]
  it('focuses the search field on open with a fine pointer, the title with a coarse one only', () => {
    expect(document.activeElement).not.toBe(null)
    const fine = page()
    expect(document.activeElement).toBe(fine.find('input[type="search"]').element)
    const coarse = page({ finePointer: false })
    expect(document.activeElement).toBe(coarse.find('#lexicon-title').element)
  })

  // @test-link [[req_lexicon_page]]
  it('labels the search field "Find a word", with no placeholder', () => {
    const mounted = page()
    const input = mounted.find('input[type="search"]')
    expect(mounted.find(`label[for="${input.attributes('id')}"]`).text()).toBe('Find a word')
    expect(input.attributes('placeholder')).toBeUndefined()
  })

  // @test-link [[req_lexicon_page]]
  it('empties the search field holding text on Escape, then closes on the next', async () => {
    const state = createLexiconPageState()
    const mounted = page({ state })
    await type(mounted, 'tempo')
    press('Escape')
    await nextTick()
    expect(state.query).toBe('')
    expect(mounted.emitted('close')).toBeUndefined()
    press('Escape')
    expect(mounted.emitted('close')).toHaveLength(1)
  })

  // @test-link [[req_lexicon_page]]
  it('closes on Close', async () => {
    const mounted = page()
    await mounted.find('.sheet-close').trigger('click')
    expect(mounted.emitted('close')).toHaveLength(1)
  })

  // @test-link [[req_lexicon_page]]
  it("keeps Tab inside the page in the design order, skipping closed entries' links", () => {
    const mounted = page()
    const stops = (): string[] => {
      const seen: string[] = []
      for (let step = 0; step < 6; step += 1) {
        press('Tab')
        const active = document.activeElement as HTMLElement
        seen.push(active.textContent?.trim() || active.tagName)
      }
      return seen
    }
    expect(stops()).toEqual(['Letters', 'Close', 'A', 'B', 'C', 'H'])
    mounted.find<HTMLElement>('summary').element.focus()
    press('Tab', true)
    expect(document.activeElement?.textContent).toBe('W')
    const lastSummary = mounted.findAll<HTMLElement>('summary').at(-1)!.element
    lastSummary.focus()
    press('Tab')
    expect(document.activeElement).toBe(mounted.find('input[type="search"]').element)
  })

  // @test-link [[req_lexicon_page]]
  it('moves Tab on from a focus target of the page to the next stop after it', () => {
    const mounted = page({ finePointer: false })
    press('Tab')
    expect(document.activeElement).toBe(mounted.find('input[type="search"]').element)
  })
})

describe('LexiconPage, kept for the visit', () => {
  // @test-link [[req_lexicon_page]]
  it('comes back as it was left: the same search, the same open entries, the same place', async () => {
    const state = createLexiconPageState()
    const first = page({ state })
    await type(first, 'step')
    first.find<HTMLElement>('.lexicon-view').element.scrollTop = 120
    first.unmount()
    expect(state.scrollTop).toBe(120)
    const again = page({ state })
    expect((again.find('input[type="search"]').element as HTMLInputElement).value).toBe('step')
    expect(listedWords(again)).toEqual(['Half step', 'Whole step', 'B-flat instrument'])
  })
})

describe('LexiconPage, the bar', () => {
  /** Give an element a measured height. */
  function measured(element: Element, height: number): void {
    element.getBoundingClientRect = () => ({ height }) as DOMRect
  }

  // @test-link [[req_lexicon_page]]
  it('keeps the height of the part of the bar that stays at the top on the view', async () => {
    const mounted = page()
    const view = mounted.find<HTMLElement>('.lexicon-view').element
    const bar = mounted.find<HTMLElement>('.lexicon-bar').element
    const row = mounted.find<HTMLElement>('.lexicon-bar-row').element
    measured(bar, 140)
    measured(row, 60)
    for (const callback of resizeCallbacks) callback()
    expect(view.style.getPropertyValue('--lexicon-bar-block-size')).toBe('140px')
    measured(bar, 196)
    for (const callback of resizeCallbacks) callback()
    expect(view.style.getPropertyValue('--lexicon-bar-block-size')).toBe('196px')
    // Below bp-tablet-landscape the bar lets its rows into the view: only the title row stays.
    bar.style.display = 'contents'
    for (const callback of resizeCallbacks) callback()
    expect(view.style.getPropertyValue('--lexicon-bar-block-size')).toBe('60px')
  })
})
