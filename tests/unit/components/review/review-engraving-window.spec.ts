/**
 * The Review's lazy-engraving scheduler on its own, over 2 000 items: only items near the visible
 * area are engraved, one at a time and nearest first; items far away are released; a change of
 * the engraving inputs re-engraves what is engraved near the visible area and retries the "wider
 * window" notes; and however far the list is scrolled, the engraved items stay within the
 * retained window.
 */
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  createReviewEngravingWindow,
  type ReviewEngravingOutcome,
  type ReviewEngravingWindow,
} from '@/components/review/review-engraving-window'

const ITEM_COUNT = 2000

/** A scheduler on a scripted environment, with what it was asked to do. */
interface Rig {
  readonly window: ReviewEngravingWindow
  readonly engraved: number[]
  readonly released: number[]
  /** Each item's distance from the visible area; items not listed are far (1e9 px). */
  readonly distances: Map<number, number>
  /** Each item's outcome when engraved ('engraved' when not listed); null: not engraved now. */
  readonly outcomes: Map<number, ReviewEngravingOutcome | null>
  ready: boolean
  /** When set, each engraving waits on a promise the test resolves. */
  manual: boolean
  readonly pending: (() => void)[]
}

/** Intent: a scheduler over `ITEM_COUNT` items whose environment records every call. */
function rig(): Rig {
  const state: Omit<Rig, 'window'> = {
    engraved: [],
    released: [],
    distances: new Map(),
    outcomes: new Map(),
    ready: true,
    manual: false,
    pending: [],
  }
  const window = createReviewEngravingWindow({
    itemCount: ITEM_COUNT,
    canEngrave: () => state.ready,
    distance: (index) => state.distances.get(index) ?? 1e9,
    engrave: (index) => {
      state.engraved.push(index)
      const outcome = state.outcomes.has(index) ? state.outcomes.get(index)! : 'engraved'
      if (!state.manual) return Promise.resolve(outcome)
      return new Promise((resolve) => state.pending.push(() => resolve(outcome)))
    },
    release: (index) => {
      state.released.push(index)
    },
    nextTurn: () => Promise.resolve(),
  })
  return Object.assign(state, { window }) as Rig
}

/** Intent: report the given items near the visible area, at the given distances. */
function bringNear(r: Rig, items: readonly (readonly [number, number])[]): void {
  for (const [index, distance] of items) {
    r.distances.set(index, distance)
    r.window.near(index, true)
  }
}

// @test-link [[req_last_session_review]]
describe('the review engraving window', () => {
  // @test-link [[req_last_session_review]]
  it('engraves only the items near the visible area, nearest first', async () => {
    const r = rig()
    bringNear(r, [
      [4, 500],
      [0, 0],
      [5, 700],
      [1, 0],
      [3, 200],
      [2, 0],
    ])
    await flushPromises()

    // Reported in one batch, as one observer callback does: picked by distance, then list order.
    expect(r.engraved).toEqual([0, 1, 2, 3, 4, 5])
    expect(r.window.stateOf(0)).toBe('engraved')
    expect(r.window.stateOf(6)).toBe('blank')
  })

  // @test-link [[req_last_session_review]]
  it('runs one engraving at a time', async () => {
    const r = rig()
    r.manual = true
    bringNear(r, [
      [0, 0],
      [1, 10],
      [2, 20],
    ])
    await flushPromises()
    expect(r.engraved).toEqual([0])

    r.pending.shift()!()
    await flushPromises()
    expect(r.engraved).toEqual([0, 1])
    expect(r.window.stateOf(0)).toBe('engraved')
    expect(r.window.stateOf(1)).toBe('blank')
  })

  // @test-link [[req_last_session_review]]
  it('skips an item that left the near area before its turn', async () => {
    const r = rig()
    r.manual = true
    bringNear(r, [
      [0, 0],
      [1, 10],
    ])
    await flushPromises()
    r.window.near(1, false)
    r.pending.shift()!()
    await flushPromises()

    expect(r.engraved).toEqual([0])
  })

  // @test-link [[req_last_session_review]]
  it('releases an engraved or noted item once it leaves the retained area, and only those', async () => {
    const r = rig()
    r.outcomes.set(1, 'needs-wider-window')
    bringNear(r, [
      [0, 0],
      [1, 0],
    ])
    await flushPromises()
    r.window.retained(0, false)
    r.window.retained(1, false)
    r.window.retained(7, false)

    expect(r.released).toEqual([0, 1])
    expect(r.window.stateOf(0)).toBe('blank')
    expect(r.window.stateOf(1)).toBe('blank')
  })

  // @test-link [[req_last_session_review]]
  it('releases an item whose engraving finished after it went far', async () => {
    const r = rig()
    r.manual = true
    bringNear(r, [[0, 0]])
    await flushPromises()
    r.window.retained(0, false)
    expect(r.released).toEqual([])

    r.pending.shift()!()
    await flushPromises()
    expect(r.released).toEqual([0])
    expect(r.window.stateOf(0)).toBe('blank')
  })

  // @test-link [[req_last_session_review]]
  it('on an input change, re-engraves near items and retries wider-window notes, never failures', async () => {
    const r = rig()
    r.outcomes.set(1, 'needs-wider-window')
    r.outcomes.set(2, 'failed')
    bringNear(r, [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ])
    await flushPromises()
    // Item 3 is engraved but no longer near: released rather than re-engraved.
    r.window.near(3, false)
    r.engraved.length = 0
    r.outcomes.delete(1)

    r.window.invalidate()
    await flushPromises()

    expect(r.engraved).toEqual([0, 1])
    expect(r.released).toEqual([3])
    expect(r.window.stateOf(1)).toBe('engraved')
    expect(r.window.stateOf(2)).toBe('failed')
  })

  // @test-link [[req_last_session_review]]
  it('re-engraves an item whose engraving was under way when the inputs changed', async () => {
    const r = rig()
    r.manual = true
    bringNear(r, [[0, 0]])
    await flushPromises()
    r.window.invalidate()
    r.pending.shift()!()
    await flushPromises()

    expect(r.engraved).toEqual([0, 0])
  })

  // @test-link [[req_last_session_review]]
  it('engraves nothing until it can, then the items near', async () => {
    const r = rig()
    r.ready = false
    bringNear(r, [
      [0, 0],
      [1, 0],
    ])
    await flushPromises()
    expect(r.engraved).toEqual([])

    r.ready = true
    r.window.invalidate()
    await flushPromises()
    expect(r.engraved).toEqual([0, 1])
  })

  // @test-link [[req_last_session_review]]
  it('keeps an item it could not engrave now queued, and engraves it on the next input change', async () => {
    const r = rig()
    r.outcomes.set(0, null)
    bringNear(r, [
      [0, 0],
      [1, 10],
    ])
    await flushPromises()
    expect(r.engraved).toEqual([0])
    expect(r.window.stateOf(0)).toBe('blank')

    r.outcomes.delete(0)
    r.window.invalidate()
    await flushPromises()
    expect(r.engraved).toEqual([0, 0, 1])
    expect(r.window.stateOf(0)).toBe('engraved')
  })

  // @test-link [[req_last_session_review]]
  it('engraves nothing more once disposed', async () => {
    const r = rig()
    r.manual = true
    bringNear(r, [
      [0, 0],
      [1, 0],
    ])
    await flushPromises()
    r.window.dispose()
    r.pending.shift()!()
    await flushPromises()

    expect(r.engraved).toEqual([0])
  })

  // @test-link [[req_last_session_review]]
  it('refuses an index outside the list', () => {
    const r = rig()
    expect(() => r.window.near(ITEM_COUNT, true)).toThrow(/outside/u)
    expect(() => r.window.retained(-1, false)).toThrow(/outside/u)
  })

  // @test-link [[req_last_session_review]]
  it('scrolled through 2 000 items, engraves each only as it comes near and keeps only the retained window', async () => {
    const r = rig()
    const itemPx = 256
    const viewportPx = 768
    const near = new Set<number>()
    const retained = new Set<number>()
    let cameNear = 0
    let maxEngraved = 0
    /** Intent: the items within `viewports` viewport heights of the window at `scrollPx`. */
    const within = (scrollPx: number, viewports: number): Set<number> => {
      const first = Math.max(0, Math.floor((scrollPx - viewports * viewportPx) / itemPx))
      const last = Math.min(
        ITEM_COUNT - 1,
        Math.ceil((scrollPx + viewportPx + viewports * viewportPx) / itemPx) - 1,
      )
      return new Set(Array.from({ length: last - first + 1 }, (_, offset) => first + offset))
    }

    for (let scrollPx = 0; scrollPx <= ITEM_COUNT * itemPx - viewportPx; scrollPx += viewportPx) {
      const nextNear = within(scrollPx, 1)
      const nextRetained = within(scrollPx, 3)
      for (const index of retained) if (!nextRetained.has(index)) r.window.retained(index, false)
      for (const index of near) if (!nextNear.has(index)) r.window.near(index, false)
      for (const index of nextNear) {
        if (near.has(index)) continue
        cameNear += 1
        r.distances.set(index, Math.abs(index * itemPx - scrollPx))
        r.window.near(index, true)
      }
      near.clear()
      nextNear.forEach((index) => near.add(index))
      retained.clear()
      nextRetained.forEach((index) => retained.add(index))
      await flushPromises()
      let engravedNow = 0
      for (let index = 0; index < ITEM_COUNT; index++) {
        if (r.window.stateOf(index) !== 'blank') engravedNow += 1
      }
      maxEngraved = Math.max(maxEngraved, engravedNow)
      for (let index = 0; index < ITEM_COUNT; index++) {
        if (r.window.stateOf(index) !== 'blank') expect(retained.has(index)).toBe(true)
      }
    }

    expect(new Set(r.engraved).size).toBe(ITEM_COUNT)
    expect(r.engraved.length).toBeLessThanOrEqual(cameNear)
    expect(maxEngraved).toBeLessThanOrEqual(within(10 * viewportPx, 3).size)
  })
})
