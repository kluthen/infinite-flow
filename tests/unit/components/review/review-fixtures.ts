/**
 * Shared builders for the Review panel specs: real recorded session records (a session whose
 * phrase 2 is a failure-ladder repeat, with acknowledgements and played notes recorded into it),
 * long histories of renumbered copies of them, and stand-ins for what jsdom lacks: an
 * IntersectionObserver pair driven by a simple scroll model, a ResizeObserver the test fires, and
 * the element measurements both read.
 */
import { vi } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { createSessionHistory, type SessionHistoryRecord } from '@/session/session-history'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from '../../session/session-harness'

/**
 * Intent: a 240 BPM session (a 1 s measure) on the B-flat tenor whose phrase 2 misses its
 * deadline, so the failure ladder repeats phrase 1 as phrase 2; phrase 3 is generated in time.
 */
function sessionWithRepeat(): SessionDriver {
  const settings = sessionSettings({ tempo: 240, instrumentProfileId: 'bb-tenor' })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.tick(1)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.sounding(9, 3)
  driver.end(10)
  return driver
}

let recorded: readonly SessionHistoryRecord[] | null = null

/**
 * Intent: the three real records of that session (phrase 2 the repeat), with an acknowledgement
 * and a played note in every phrase; built once, since the session is deterministic.
 */
export function recordedRecords(): readonly SessionHistoryRecord[] {
  if (recorded !== null) return recorded
  const driver = sessionWithRepeat()
  const history = createSessionHistory(driver.settings, fixedWallClock, DEFAULT_SESSION_SEED)
  for (const output of driver.log) {
    if (output.kind === 'ended') {
      for (const phraseNumber of [1, 2, 3]) {
        history.recordAcknowledgement({ phraseNumber, measureIndex: 0, eventIndex: 0 })
      }
      for (const onset of [1.5, 5.5, 9.5]) {
        history.recordPlayedNote({
          pitch: makeConcertPitch(61),
          velocity: 90,
          onsetAt: onset,
          releaseAt: onset + 0.25,
        })
      }
    }
    history.record(output)
  }
  recorded = history.phrases()
  return recorded
}

/** Intent: `count` records, renumbered 1..count, cycling through the recorded ones in order. */
export function longHistory(count: number): readonly SessionHistoryRecord[] {
  const source = recordedRecords()
  return Array.from({ length: count }, (_, index) => ({
    ...source[index % source.length]!,
    phraseNumber: index + 1,
  }))
}

/** One fake IntersectionObserver: its callback, its rootMargin and what it observes. */
export interface FakeIntersectionObserver {
  readonly rootMargin: string
  readonly observed: Set<Element>
  readonly callback: IntersectionObserverCallback
  disconnected: boolean
}

/** One fake ResizeObserver: its callback and what it observes. */
export interface FakeResizeObserver {
  readonly observed: Set<Element>
  readonly callback: ResizeObserverCallback
  disconnected: boolean
}

/**
 * The page the stubs answer for: each `review-phrase` is `itemHeightPx` tall, stacked from the
 * top of the document, and the window shows `viewportHeightPx` from `scrollTopPx`.
 */
export const page = {
  itemHeightPx: 256,
  viewportHeightPx: 768,
  scrollTopPx: 0,
  listWidthPx: 900,
}

export const intersectionObservers: FakeIntersectionObserver[] = []
export const resizeObservers: FakeResizeObserver[] = []

/** Each list item's index, indexed once per list (a list's items never move). */
let indexes = new WeakMap<Element, number>()

/** Intent: the index of a `review-phrase` among its list's items. */
export function itemIndex(item: Element): number {
  const known = indexes.get(item)
  if (known !== undefined) return known
  const parent = item.parentElement
  if (parent === null) throw new Error('A review-phrase outside a list.')
  Array.from(parent.children).forEach((child, index) => indexes.set(child, index))
  return indexes.get(item)!
}

/** Intent: an item's top and bottom relative to the window, from the scroll model. */
function itemBox(index: number): { readonly top: number; readonly bottom: number } {
  const top = index * page.itemHeightPx - page.scrollTopPx
  return { top, bottom: top + page.itemHeightPx }
}

/** Intent: the block margin, in px, a rootMargin like '100% 0px' adds above and below the window. */
function marginPx(rootMargin: string): number {
  const match = /^(\d+)%/u.exec(rootMargin)
  if (match === null) throw new Error(`Unexpected rootMargin ${rootMargin}.`)
  return (Number(match[1]) / 100) * page.viewportHeightPx
}

/** Intent: whether an item intersects the window grown by the observer's block margin. */
function intersects(index: number, rootMargin: string): boolean {
  const margin = marginPx(rootMargin)
  const box = itemBox(index)
  return box.bottom > -margin && box.top < page.viewportHeightPx + margin
}

/** Intent: the items whose top is within the window grown by a margin of `viewports` heights. */
export function itemsWithin(viewports: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => index).filter((index) =>
    intersects(index, `${viewports * 100}% 0px`),
  )
}

/** What each observer last reported per element, so only changes are reported, as IO does. */
const reported = new WeakMap<FakeIntersectionObserver, Map<Element, boolean>>()

/**
 * Intent: deliver to every live intersection observer the entries whose state changed (all of
 * them on the first delivery after `observe`), as the browser does after layout or a scroll.
 */
export function deliverIntersections(): void {
  for (const observer of intersectionObservers) {
    if (observer.disconnected) continue
    const last = reported.get(observer) ?? new Map<Element, boolean>()
    reported.set(observer, last)
    const entries: IntersectionObserverEntry[] = []
    for (const target of observer.observed) {
      const isIntersecting = intersects(itemIndex(target), observer.rootMargin)
      if (last.get(target) === isIntersecting) continue
      last.set(target, isIntersecting)
      entries.push({ target, isIntersecting } as IntersectionObserverEntry)
    }
    if (entries.length > 0) observer.callback(entries, observer as unknown as IntersectionObserver)
  }
}

/** Intent: fire every live resize observer, as the browser does after the list's box changed. */
export function deliverResize(): void {
  for (const observer of resizeObservers) {
    if (observer.disconnected) continue
    const entries = [...observer.observed].map((target) => ({ target }) as ResizeObserverEntry)
    observer.callback(entries, observer as unknown as ResizeObserver)
  }
}

/**
 * Intent: stub IntersectionObserver, ResizeObserver, the window height and the element
 * measurements the panel reads (every element is the list's width; a `review-phrase`'s box comes
 * from the scroll model).
 */
export function stubReviewBrowser(): void {
  page.scrollTopPx = 0
  page.listWidthPx = 900
  indexes = new WeakMap()
  intersectionObservers.length = 0
  resizeObservers.length = 0
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      readonly fake: FakeIntersectionObserver
      constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
        this.fake = {
          rootMargin: options.rootMargin ?? '0px',
          observed: new Set(),
          callback,
          disconnected: false,
        }
        intersectionObservers.push(this.fake)
      }
      observe(target: Element): void {
        this.fake.observed.add(target)
      }
      unobserve(target: Element): void {
        this.fake.observed.delete(target)
      }
      disconnect(): void {
        this.fake.disconnected = true
        this.fake.observed.clear()
      }
    },
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      readonly fake: FakeResizeObserver
      constructor(callback: ResizeObserverCallback) {
        this.fake = { observed: new Set(), callback, disconnected: false }
        resizeObservers.push(this.fake)
      }
      observe(target: Element): void {
        this.fake.observed.add(target)
      }
      disconnect(): void {
        this.fake.disconnected = true
        this.fake.observed.clear()
      }
    },
  )
  vi.stubGlobal('innerHeight', page.viewportHeightPx)
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => page.listWidthPx)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (!this.classList.contains('review-phrase')) return new DOMRect(0, 0, 0, 0)
    const box = itemBox(itemIndex(this))
    return new DOMRect(0, box.top, page.listWidthPx, page.itemHeightPx)
  })
}
