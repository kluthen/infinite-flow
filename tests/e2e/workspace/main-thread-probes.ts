/**
 * The main-thread probes the measurement specs share (chunk 1's method, first written for the
 * engraving measurement): three in-page probes, installed before the app loads, that record how
 * long the main thread was busy.
 *
 * - a buffered `longtask` PerformanceObserver: every main-thread task of 50 ms or more;
 * - a buffered `long-animation-frame` PerformanceObserver, where the browser supports it: the
 *   same long frames with per-script attribution, so an animation-frame callback
 *   (`FrameRequestCallback`) is told apart from a Worker's reply (a `message` handler);
 * - a heartbeat of chained zero-delay timers, started on demand: the longest gap between two beats
 *   is the longest a main-thread timer callback would have waited, even below 50 ms.
 *
 * The probes write to `window.__mainThread` (declared in workspace-window.d.ts). The densest
 * rhythm setting the measurements engrave is here too.
 */
import type { Page } from '@playwright/test'

/**
 * The densest supported rhythm setting: Sixteenth / Strict / Sparse / Straight / Edge fills all
 * 64 sixteenth slots of the four bars (about 58 of them notes, the rest rests), the most glyphs
 * and notes of any setting in the catalog over seeds 1-12. Each entry is a radiogroup's label and
 * the option to pick in it.
 */
export const DENSEST_SETTING: readonly (readonly [group: string, option: string])[] = [
  ['Note density', 'Sixteenth'],
  ['Rhythmic variety', 'Strict'],
  ['Silence density', 'Sparse'],
  ['Syncopation', 'Straight'],
  ['Tension', 'Edge'],
]

/** One main-thread task or frame the in-page observers recorded, in page-clock milliseconds. */
export interface TimedEntry {
  readonly startTime: number
  readonly duration: number
}

/** Intent: install the long-task, long-frame and heartbeat probes before any app script runs. */
export async function installMainThreadProbes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probes: NonNullable<Window['__mainThread']> = {
      longTasks: [],
      longFrames: [],
      heartbeat: { running: false, last: 0, maxGap: 0 },
    }
    window.__mainThread = probes
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        probes.longTasks.push({ startTime: entry.startTime, duration: entry.duration })
      }
    }).observe({ type: 'longtask', buffered: true })
    if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const frame = entry as PerformanceEntry & {
            readonly scripts: readonly (PerformanceEntry & {
              readonly invoker: string
              readonly invokerType: string
            })[]
          }
          probes.longFrames.push({
            startTime: frame.startTime,
            duration: frame.duration,
            scripts: frame.scripts.map((script) => ({
              startTime: script.startTime,
              duration: script.duration,
              invoker: script.invoker,
              invokerType: script.invokerType,
            })),
          })
        }
      }).observe({ type: 'long-animation-frame', buffered: true })
    }
  })
}

/** Intent: start the zero-delay heartbeat that measures how long a main-thread timer could wait. */
export async function startHeartbeat(page: Page): Promise<void> {
  await page.evaluate(() => {
    const beat = window.__mainThread?.heartbeat
    if (!beat) throw new Error('main-thread probes are not installed')
    beat.running = true
    beat.last = performance.now()
    beat.maxGap = 0
    const tick = (): void => {
      if (!beat.running) return
      const now = performance.now()
      beat.maxGap = Math.max(beat.maxGap, now - beat.last)
      beat.last = now
      setTimeout(tick, 0)
    }
    setTimeout(tick, 0)
  })
}

/** Intent: name the longest attributed script of a set, so a long frame can be traced to its cause. */
export function describeLongestScript(
  scripts: readonly { duration: number; invoker: string; invokerType: string }[],
): string {
  const longest = [...scripts].sort((left, right) => right.duration - left.duration)[0]
  return longest === undefined
    ? ''
    : `${longest.invokerType} ${longest.invoker} ${longest.duration.toFixed(0)}ms`
}
