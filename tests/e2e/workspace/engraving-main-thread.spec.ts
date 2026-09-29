/**
 * Manual main-thread engraving measurement: how long a single main-thread task runs while a phrase
 * is engraved, for the densest rhythm setting (the most notes on the staff) on the largest desktop
 * staves. Generation itself runs in the page's Worker, off the main thread; what lands on the main
 * thread per cycle is the click handler, the Worker's reply (structured-clone decode, boundary
 * re-validation, the written-notation transform) and the animation-frame callback that engraves
 * the phrase with VexFlow and swaps it in, followed by that frame's style, layout and paint.
 *
 * Three in-page probes, installed before the app loads, record that main-thread work:
 *
 * - a buffered `longtask` PerformanceObserver: every main-thread task of 50 ms or more;
 * - a buffered `long-animation-frame` PerformanceObserver, where the browser supports it: the
 *   same long frames with per-script attribution, so the engraving callback
 *   (`FrameRequestCallback`) is told apart from the Worker's reply (a `message` handler);
 * - a heartbeat of chained zero-delay timers during each cycle: the longest gap between two beats
 *   is the longest a main-thread timer callback would have waited, even below 50 ms.
 *
 * Each viewport runs one fresh page: one first generation (which also loads the lazy engraver
 * chunk and its fonts), then `REGENERATIONS` regenerations with fresh random seeds, then
 * `RESIZE_REDRAWS` re-engravings of the last phrase triggered by a small width change alone, which
 * involve no generation at all. Not part of `npm run test:e2e`; run explicitly via
 * `npm run measure:engraving`. Reports only; writes the full JSON report to `ENGRAVING_OUT` when
 * that env var is set.
 */
import { writeFileSync } from 'node:fs'

import { type Page, test } from '@playwright/test'

import { gotoWorkspace, radio, timePhraseReady } from './helpers'

/** One main-thread task or frame the in-page observers recorded, in page-clock milliseconds. */
interface TimedEntry {
  readonly startTime: number
  readonly duration: number
}

/** What one generation cycle, or one resize redraw, put on the main thread. */
interface CycleMeasurement {
  readonly label: string
  /** Click (or resize) to "Phrase ready" (or to the staff swap), page clock. */
  readonly cycleMs: number
  /** Longest `longtask` entry in the cycle; 0 when no task reached the API's 50 ms threshold. */
  readonly longestTaskMs: number
  readonly longTaskCount: number
  /** Longest engraving animation-frame callback in the cycle's long frames; 0 when none. */
  readonly longestEngravingScriptMs: number
  /** Longest Worker-reply (`message`) script in the cycle's long frames; 0 when none. */
  readonly longestWorkerReplyScriptMs: number
  /** The longest script in the cycle's long frames, as `invokerType invoker duration`; '' when none. */
  readonly longestScript: string
  /** Longest wait a zero-delay main-thread timer saw during the cycle. */
  readonly longestHeartbeatGapMs: number
}

interface ViewportReport {
  readonly viewport: { readonly width: number; readonly height: number }
  readonly browserVersion: string
  readonly longAnimationFrameSupported: boolean
  readonly staffSvg: { readonly width: number; readonly height: number }
  readonly notesOnStaff: number
  readonly firstGeneration: CycleMeasurement
  readonly regenerations: readonly CycleMeasurement[]
  readonly resizeRedraws: readonly CycleMeasurement[]
}

const TEST_TIMEOUT_MS = 300_000
const CYCLE_TIMEOUT_MS = 60_000
const REGENERATIONS = 12
const RESIZE_REDRAWS = 10
/** How long after a cycle ends its trailing frame work is still attributed to it. */
const TRAILING_WINDOW_MS = 250
/** The proposed audio-scheduler look-ahead window the longest task is judged against. */
const SCHEDULER_WINDOW_MS = 200

/**
 * The densest supported rhythm setting: Sixteenth / Strict / Sparse / Straight / Edge fills all
 * 64 sixteenth slots of the four bars (about 58 of them notes, the rest rests), the most glyphs
 * and notes of any setting in the catalog over seeds 1-12.
 */
const DENSEST_SETTING: readonly (readonly [group: string, option: string])[] = [
  ['Note density', 'Sixteenth'],
  ['Rhythmic variety', 'Strict'],
  ['Silence density', 'Sparse'],
  ['Syncopation', 'Straight'],
  ['Tension', 'Edge'],
]

const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
] as const

// The measurements time main-thread work, so they must never overlap each other on the machine.
test.describe.configure({ mode: 'default' })

/** Intent: install the long-task, long-frame and heartbeat probes before any app script runs. */
async function installMainThreadProbes(page: Page): Promise<void> {
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
async function startHeartbeat(page: Page): Promise<void> {
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

/** Intent: name the longest attributed script of a cycle, so a long frame can be traced to its cause. */
function describeLongestScript(
  scripts: readonly { duration: number; invoker: string; invokerType: string }[],
): string {
  const longest = [...scripts].sort((left, right) => right.duration - left.duration)[0]
  return longest === undefined
    ? ''
    : `${longest.invokerType} ${longest.invoker} ${longest.duration.toFixed(0)}ms`
}

/**
 * Intent: let the cycle's trailing frame work finish and its entries be delivered, stop the
 * heartbeat, and summarize what the probes recorded between `start` and `end + TRAILING_WINDOW_MS`.
 */
async function collectCycle(
  page: Page,
  label: string,
  start: number,
  end: number,
): Promise<CycleMeasurement> {
  await page.waitForTimeout(TRAILING_WINDOW_MS * 2)
  const recorded = await page.evaluate(() => {
    const probes = window.__mainThread
    if (!probes) throw new Error('main-thread probes are not installed')
    probes.heartbeat.running = false
    return {
      longTasks: [...probes.longTasks],
      longFrames: [...probes.longFrames],
      maxGap: probes.heartbeat.maxGap,
    }
  })
  const inCycle = <T extends TimedEntry>(entry: T): boolean =>
    entry.startTime >= start && entry.startTime <= end + TRAILING_WINDOW_MS
  const tasks = recorded.longTasks.filter(inCycle)
  const scripts = recorded.longFrames.filter(inCycle).flatMap((frame) => frame.scripts)
  const longest = (entries: readonly TimedEntry[]): number =>
    entries.reduce((max, entry) => Math.max(max, entry.duration), 0)
  return {
    label,
    cycleMs: end - start,
    longestTaskMs: longest(tasks),
    longTaskCount: tasks.length,
    longestEngravingScriptMs: longest(
      scripts.filter((script) => script.invoker === 'FrameRequestCallback'),
    ),
    longestWorkerReplyScriptMs: longest(
      scripts.filter((script) => script.invoker.includes('message')),
    ),
    longestScript: describeLongestScript(scripts),
    longestHeartbeatGapMs: recorded.maxGap,
  }
}

/** Intent: one timed generation cycle (first Generate or a Regenerate) and its main-thread work. */
async function measureGeneration(page: Page, label: string): Promise<CycleMeasurement> {
  await startHeartbeat(page)
  const timing = await timePhraseReady(page, CYCLE_TIMEOUT_MS)
  return collectCycle(page, label, timing.clickAt, timing.clickAt + timing.inPageMs)
}

/**
 * Intent: re-engrave the phrase on screen by changing only the viewport width, and measure that
 * redraw's main-thread work; no generation is involved. The end is the moment the engraved staff
 * is swapped into the visible score element.
 */
async function measureResizeRedraw(
  page: Page,
  label: string,
  width: number,
  height: number,
): Promise<CycleMeasurement> {
  await startHeartbeat(page)
  const start = await page.evaluate(() => {
    const score = document.querySelector('.staff-content__score')
    if (!score) throw new Error('visible score element not found')
    const stamps: { swappedAt: number | null } = { swappedAt: null }
    window.__redrawStamps = stamps
    const observer = new MutationObserver(() => {
      stamps.swappedAt = performance.now()
      observer.disconnect()
    })
    observer.observe(score, { childList: true })
    return performance.now()
  })
  await page.setViewportSize({ width, height })
  const handle = await page.waitForFunction(() => window.__redrawStamps?.swappedAt ?? null, null, {
    timeout: CYCLE_TIMEOUT_MS,
  })
  const swappedAt = await handle.jsonValue()
  if (swappedAt === null) throw new Error('the resize redraw never swapped in a staff')
  return collectCycle(page, label, start, swappedAt)
}

/** Intent: the engraved staff's size and note count, read from the visible score. */
async function readStaff(page: Page): Promise<{ width: number; height: number; notes: number }> {
  return page.evaluate(() => {
    const svg = document.querySelector('.staff-content__score svg.staff-svg')
    if (!svg) throw new Error('engraved staff svg not found')
    const box = svg.getBoundingClientRect()
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      notes: svg.querySelectorAll('.vf-stavenote').length,
    }
  })
}

/** Intent: median, nearest-rank, of a numeric sample. */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length / 2) - 1)] ?? 0
}

/** Intent: the one-line max/median summary of one measured quantity over a set of cycles. */
function summaryLine(
  label: string,
  cycles: readonly CycleMeasurement[],
  pick: (cycle: CycleMeasurement) => number,
): string {
  const values = cycles.map(pick)
  return `  ${label}: max=${Math.max(...values).toFixed(1)} median=${median(values).toFixed(1)}`
}

/** Intent: print one viewport's report and its verdict against the scheduler window. */
function printReport(report: ViewportReport): void {
  const { width, height } = report.viewport
  console.log(`\n=== Main-thread engraving at ${width}x${height} (${report.browserVersion}) ===`)
  console.log(
    `Staff ${report.staffSvg.width}x${report.staffSvg.height}px, ${report.notesOnStaff} ` +
      `stave notes; long-animation-frame supported: ${report.longAnimationFrameSupported}`,
  )
  const first = report.firstGeneration
  console.log(
    `First generation: cycle=${first.cycleMs.toFixed(1)} longest task=${first.longestTaskMs} ` +
      `engraving script=${first.longestEngravingScriptMs} heartbeat gap=` +
      `${first.longestHeartbeatGapMs.toFixed(1)} longest script=${first.longestScript || 'none'}`,
  )
  for (const [label, cycles] of [
    [`Regenerations (${report.regenerations.length})`, report.regenerations],
    [`Resize redraws (${report.resizeRedraws.length})`, report.resizeRedraws],
  ] as const) {
    console.log(`${label}, ms:`)
    console.log(summaryLine('cycle', cycles, (c) => c.cycleMs))
    console.log(summaryLine('longest task', cycles, (c) => c.longestTaskMs))
    console.log(summaryLine('engraving script', cycles, (c) => c.longestEngravingScriptMs))
    console.log(summaryLine('Worker reply script', cycles, (c) => c.longestWorkerReplyScriptMs))
    console.log(summaryLine('heartbeat gap', cycles, (c) => c.longestHeartbeatGapMs))
    const scripts = cycles.map((c) => c.longestScript).filter((script) => script !== '')
    console.log(`  longest scripts: ${scripts.join('; ') || 'none'}`)
  }
  const all = [first, ...report.regenerations, ...report.resizeRedraws]
  const worst = Math.max(...all.map((c) => Math.max(c.longestTaskMs, c.longestHeartbeatGapMs)))
  console.log(
    `Longest main-thread block overall: ${worst.toFixed(1)}ms ` +
      `(${worst < SCHEDULER_WINDOW_MS ? 'under' : 'NOT under'} the ${SCHEDULER_WINDOW_MS} ms window)`,
  )
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test('reports the longest main-thread task while engraving the densest phrase', async ({
      page,
      browser,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS)
      await installMainThreadProbes(page)
      await gotoWorkspace(page)
      for (const [group, option] of DENSEST_SETTING) {
        await radio(page, group, option).click()
      }

      const firstGeneration = await measureGeneration(page, 'first generation')
      const regenerations: CycleMeasurement[] = []
      for (let index = 1; index <= REGENERATIONS; index++) {
        regenerations.push(await measureGeneration(page, `regeneration ${index}`))
      }
      const staff = await readStaff(page)

      const resizeRedraws: CycleMeasurement[] = []
      for (let index = 1; index <= RESIZE_REDRAWS; index++) {
        const width = index % 2 === 1 ? viewport.width - 16 : viewport.width
        resizeRedraws.push(
          await measureResizeRedraw(page, `resize redraw ${index}`, width, viewport.height),
        )
      }

      const report: ViewportReport = {
        viewport,
        browserVersion: `${browser.browserType().name()} ${browser.version()}`,
        longAnimationFrameSupported: await page.evaluate(() =>
          PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
        ),
        staffSvg: { width: staff.width, height: staff.height },
        notesOnStaff: staff.notes,
        firstGeneration,
        regenerations,
        resizeRedraws,
      }
      printReport(report)
      test
        .info()
        .annotations.push({ type: 'engraving-report', description: JSON.stringify(report) })

      const outPath = process.env.ENGRAVING_OUT
      if (outPath !== undefined) {
        writeFileSync(
          outPath.replace(/(\.json)?$/, `-${viewport.width}x${viewport.height}.json`),
          JSON.stringify(report, null, 2),
        )
      }
    })
  })
}
