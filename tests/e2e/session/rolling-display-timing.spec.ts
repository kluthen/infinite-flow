/**
 * Manual timing measurement of the rolling display in real Chromium, on the real `AudioContext`
 * and the real wake-up Workers (the workspace harness with `?audio=real`, port 4175), with no
 * controller attached. Two measurements, for chunk 16's two timing targets:
 *
 * - **Playhead (v2.0 item 6).** At 120 BPM, at 1920x1080 (the one-system layout), over five
 *   minutes of audio time (150 barlines), the moment the playhead band moves to each new measure
 *   is compared with the moment that barline is heard. A MutationObserver on the staff, installed
 *   before Start, stamps `performance.now()` whenever `rect.playhead-band` lands on a different
 *   measure (or system), and reads a fresh clock anchor there; the first animation frame after
 *   the move is stamped too. The barline's heard time is mapped onto `performance.now()` through
 *   that anchor (see `heardBarlineMs`).
 * - **Main thread (v2.0 item 15).** At 240 BPM with the densest rhythm setting, at 2560x1440 and
 *   1920x1080, chunk 1's three main-thread probes (main-thread-probes.ts: buffered `longtask` and
 *   `long-animation-frame` observers installed before the app loads, and a zero-delay heartbeat)
 *   record every long task from the Start click through 60 s of running session (15 phrases,
 *   each engraving its system as it enters); the longest is compared with the look-ahead
 *   scheduler's 200 ms window.
 *
 * Not part of `npm run test:e2e`; run explicitly via `npm run measure:rolling`. Reports only;
 * writes the full JSON reports to `ROLLING_OUT` (suffixed per measurement) when that env var is
 * set.
 */
import { writeFileSync } from 'node:fs'

import { expect, type Page, test } from '@playwright/test'

import { generateShownPhrase } from '../audio/audio-harness-helpers'
import { WORKSPACE_HARNESS_URL } from '../release/harness-helpers'
import {
  DENSEST_SETTING,
  describeLongestScript,
  installMainThreadProbes,
  startHeartbeat,
  type TimedEntry,
} from '../workspace/main-thread-probes'
import { radio } from '../workspace/helpers'
import { sessionAction, sessionState } from './session-helpers'

/** The look-ahead scheduler's window (`LOOK_AHEAD_SECONDS` in src/audio/look-ahead-scheduler.ts). */
const SCHEDULER_WINDOW_MS = 200
/** Item 6's bound on the playhead band's lag behind the heard barline. */
const PLAYHEAD_TARGET_MS = 20

const PLAYHEAD_TEMPO = 120
/** Five minutes of 4/4 at 120 BPM: 150 measures of 2 s, so barlines 0 to 149. */
const PLAYHEAD_BARLINES = 150
const PLAYHEAD_VIEWPORT = { width: 1920, height: 1080 } as const

const MAIN_THREAD_TEMPO = 240
/** How long the session runs past phrase 1's start: 15 phrases of 4 s at 240 BPM. */
const MAIN_THREAD_RUNNING_SECONDS = 60
const MAIN_THREAD_VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
] as const

/** The seed of phrase 1; the session's look-ahead phrases draw the harness's counter seeds. */
const PHRASE_ONE_SEED = 7

/** One move of the playhead band, as the in-page observer recorded it. */
interface BandMove {
  readonly phraseNumber: number
  readonly measureIndex: number
  readonly position: string | null
  /** performance.now() in the observer callback that saw the move (before paint). */
  readonly observedAt: number
  /** `document.timeline.currentTime` then: the start of the frame that moved the band. */
  readonly frameTime: number | null
  /** The timestamp of the first animation frame after the move (the frame after it painted). */
  nextFrameAt: number | null
  /** A fresh clock anchor, read in the same callback. */
  readonly anchor: { readonly audioTime: number; readonly performanceTimeMs: number }
  /** The output latency read in the same callback, in seconds. */
  readonly outputLatency: number
  /** The audio clock's `currentTime` read in the same callback, in seconds. */
  readonly audioNow: number
}

declare global {
  interface Window {
    /** The playhead measurement's band log, and how often the band vanished from the staff. */
    __bandMoves?: { moves: BandMove[]; vanished: number }
    /** The page's one AudioContext, kept for its sample rate and latencies. */
    __rollingAudioContext?: AudioContext
  }
}

/** Nearest-rank percentile of a sample. */
function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? Number.NaN
}

/** Intent: count, max |diff|, p95 |diff|, mean, signed range and target overruns of a sample. */
function summarize(diffs: readonly number[], target: number) {
  const magnitudes = diffs.map(Math.abs)
  return {
    count: diffs.length,
    maxAbsMs: Math.max(...magnitudes),
    p95AbsMs: percentile(magnitudes, 95),
    p50AbsMs: percentile(magnitudes, 50),
    meanMs: diffs.reduce((sum, d) => sum + d, 0) / diffs.length,
    minMs: Math.min(...diffs),
    maxMs: Math.max(...diffs),
    overTarget: magnitudes.filter((m) => m > target).length,
  }
}

/** Intent: keep the page's AudioContext once the Start click creates it, for its diagnostics. */
async function captureAudioContext(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const Original = window.AudioContext
    window.AudioContext = new Proxy(Original, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext
        window.__rollingAudioContext = context
        return context
      },
    })
  })
}

/**
 * Intent: land on the harness with real audio, pick `settings`, set `tempo` with the tempo
 * stepper's keyboard, and generate phrase 1 so `Start session` is enabled.
 */
async function readyRealAudioSession(
  page: Page,
  tempo: number,
  settings: readonly (readonly [group: string, option: string])[],
): Promise<void> {
  await page.goto(`${WORKSPACE_HARNESS_URL}?audio=real`)
  await page.waitForFunction(() => window.__workspaceHarness?.session.loaded() === true)
  for (const [group, option] of settings) await radio(page, group, option).click()
  const stepper = page.getByRole('spinbutton', { name: 'Tempo' })
  await stepper.focus()
  await stepper.press('Home')
  for (let bpm = 60; bpm < tempo; bpm += 10) await stepper.press('ArrowUp')
  await expect(stepper).toHaveAttribute('aria-valuenow', String(tempo))
  await generateShownPhrase(page, PHRASE_ONE_SEED)
  await expect(page.locator('.staff-frame')).toHaveClass(/staff-ready/)
  await expect(sessionAction(page)).toBeEnabled()
}

/** Intent: click `Start session` (a real click, which unlocks the audio) and return phrase 1's start. */
async function startRealSession(page: Page, tempo: number): Promise<number> {
  await expect(sessionAction(page)).toHaveText('Start session')
  await sessionAction(page).click()
  await expect(sessionAction(page)).toHaveText('Stop')
  expect((await sessionState(page)).sessionTempo).toBe(tempo)
  return page.evaluate(() => window.__workspaceHarness.audio.phraseStartsAt(1))
}

/** Intent: wait, on the real audio clock, until heard time passes `audioTime`. */
async function untilHeard(page: Page, audioTime: number, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    (at) => {
      const audio = window.__workspaceHarness.audio
      return audio.now() - audio.outputLatency() > at
    },
    audioTime,
    { polling: 1000, timeout: timeoutMs },
  )
}

/** Intent: the page's audio context's sample rate and latencies, and the browser's version. */
async function audioDiagnostics(page: Page) {
  return page.evaluate(() => {
    const context = window.__rollingAudioContext
    if (context === undefined) throw new Error('the Start click created no AudioContext')
    return {
      sampleRate: context.sampleRate,
      baseLatencyMs: context.baseLatency * 1000,
      outputLatencyMs: context.outputLatency * 1000,
      state: context.state,
    }
  })
}

/**
 * Intent: from now on, log every move of the playhead band to a different measure or system:
 * where it landed, `performance.now()` in the observer callback, the frame's start, a fresh clock
 * anchor with the output latency and the audio clock read there, and the next frame's timestamp.
 */
async function observeBandMoves(page: Page): Promise<void> {
  await page.evaluate(() => {
    const frame = document.querySelector('.staff-frame')
    if (frame === null) throw new Error('observeBandMoves: no staff frame')
    const audio = window.__workspaceHarness.audio
    const log: NonNullable<Window['__bandMoves']> = { moves: [], vanished: 0 }
    window.__bandMoves = log
    let last: string | null = null
    let present = false
    new MutationObserver(() => {
      const observedAt = performance.now()
      const band = frame.querySelector(
        '[data-system-position] > .staff-content:not(.is-fading-out) rect.playhead-band',
      )
      if (band === null) {
        if (present) log.vanished += 1
        present = false
        return
      }
      present = true
      const unit = band.closest<HTMLElement>('.staff-content')
      const svg = band.closest('svg')
      const slot = [...(svg?.querySelectorAll('g.measure-slot') ?? [])].find(
        (s) => s.getAttribute('data-band-x') === band.getAttribute('x'),
      )
      const phraseNumber = Number(unit?.dataset.phraseNumber)
      const measureIndex = Number(slot?.getAttribute('data-measure-index'))
      const key = `${phraseNumber}:${measureIndex}`
      if (key === last) return
      last = key
      const timelineTime = document.timeline.currentTime
      const move = {
        phraseNumber,
        measureIndex,
        position:
          band.closest('[data-system-position]')?.getAttribute('data-system-position') ?? null,
        observedAt,
        frameTime: typeof timelineTime === 'number' ? timelineTime : null,
        nextFrameAt: null as number | null,
        anchor: audio.clockAnchor(),
        outputLatency: audio.outputLatency(),
        audioNow: audio.now(),
      }
      log.moves.push(move)
      requestAnimationFrame((timestamp) => {
        move.nextFrameAt = timestamp
      })
    }).observe(frame, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['x', 'class'],
    })
  })
}

/**
 * Intent: barline `index`'s heard time on the `performance.now()` timeline, in ms, through the
 * move's own fresh anchor. The band reads heard time as `now() - outputLatency()` and moves to
 * measure `index` once it reaches `barline`; so the barline is heard when the audio clock reads
 * `barline + outputLatency`. The anchor's `audioTime` is on that same scheduling timeline (the
 * output timestamp's `contextTime` plus the output latency, at `performanceTimeMs`), so that
 * moment is `performanceTimeMs + (barline + outputLatency - audioTime)`. The latency the anchor
 * added is taken off exactly once: the result is the output timestamp's own "frame `barline` is
 * rendered by the output device at this performance.now() time".
 */
function heardBarlineMs(move: BandMove, barline: number): number {
  return (
    move.anchor.performanceTimeMs + (barline + move.outputLatency - move.anchor.audioTime) * 1000
  )
}

/** Intent: write one report to `ROLLING_OUT`, suffixed with its measurement's name. */
function writeReport(suffix: string, report: unknown): void {
  const outPath = process.env.ROLLING_OUT
  if (outPath === undefined) return
  writeFileSync(outPath.replace(/(\.json)?$/, `-${suffix}.json`), JSON.stringify(report, null, 2))
}

/** Intent: end the running session with Stop and wait for Idle. */
async function stopSession(page: Page): Promise<void> {
  await sessionAction(page).click()
  await expect.poll(async () => (await sessionState(page)).phase).toBe('idle')
}

// The measurements time the main thread and the audio clock, so they must never overlap.
test.describe.configure({ mode: 'default' })

// @test-link [[rule_playhead_follows_audio_clock]]
// @test-link [[module_session_rolling_display]]
test.describe('playhead at 120 BPM', () => {
  test.use({ viewport: PLAYHEAD_VIEWPORT })

  test('reports how far the playhead band lags each heard barline over five minutes', async ({
    page,
    browser,
  }) => {
    const measureSeconds = (4 * 60) / PLAYHEAD_TEMPO
    test.setTimeout((PLAYHEAD_BARLINES * measureSeconds + 120) * 1000)
    await captureAudioContext(page)
    await readyRealAudioSession(page, PLAYHEAD_TEMPO, [])
    await observeBandMoves(page)

    const phraseOneAt = await startRealSession(page, PLAYHEAD_TEMPO)
    const lastBarline = phraseOneAt + (PLAYHEAD_BARLINES - 1) * measureSeconds
    await untilHeard(page, lastBarline + 0.5, (lastBarline - phraseOneAt + 60) * 1000)
    const stateAtEnd = await sessionState(page)
    const diagnostics = await audioDiagnostics(page)
    const log = await page.evaluate(() => window.__bandMoves ?? { moves: [], vanished: 0 })
    await stopSession(page)

    // The first move onto each measure; later readings of the same measure would be a defect.
    const firstMoves = new Map<number, BandMove>()
    for (const move of log.moves) {
      const index = (move.phraseNumber - 1) * 4 + move.measureIndex
      if (!firstMoves.has(index)) firstMoves.set(index, move)
    }
    const barlines = [...Array(PLAYHEAD_BARLINES).keys()].flatMap((index) => {
      const move = firstMoves.get(index)
      if (move === undefined) return []
      const heardAt = heardBarlineMs(move, phraseOneAt + index * measureSeconds)
      // How far the audio clock read in the callback is from the anchor's timeline there.
      const anchorSkewMs =
        (move.audioNow - move.anchor.audioTime) * 1000 -
        (move.observedAt - move.anchor.performanceTimeMs)
      return [
        {
          index,
          phraseNumber: move.phraseNumber,
          measureIndex: move.measureIndex,
          observedDiffMs: move.observedAt - heardAt,
          frameStartDiffMs: move.frameTime === null ? null : move.frameTime - heardAt,
          nextFrameDiffMs: move.nextFrameAt === null ? null : move.nextFrameAt - heardAt,
          outputLatencyMs: move.outputLatency * 1000,
          anchorOffsetMs: move.anchor.performanceTimeMs - move.anchor.audioTime * 1000,
          anchorSkewMs,
        },
      ]
    })
    const nextFrameDiffs = barlines.flatMap((b) => (b.nextFrameDiffMs === null ? [] : [b]))
    const offsets = barlines.map((b) => b.anchorOffsetMs)
    const report = {
      viewport: PLAYHEAD_VIEWPORT,
      tempo: PLAYHEAD_TEMPO,
      browserVersion: `${browser.browserType().name()} ${browser.version()}`,
      audio: diagnostics,
      sessionStillRunning: stateAtEnd.phase === 'running',
      lastEnd: stateAtEnd.lastEnd,
      heldLayout: stateAtEnd.heldLayout,
      barlinesExpected: PLAYHEAD_BARLINES,
      barlinesSeen: barlines.length,
      bandMovesLogged: log.moves.length,
      bandVanished: log.vanished,
      outOfOrderMoves: log.moves.length - firstMoves.size,
      observed: summarize(
        barlines.map((b) => b.observedDiffMs),
        PLAYHEAD_TARGET_MS,
      ),
      nextFrame: summarize(
        nextFrameDiffs.map((b) => b.nextFrameDiffMs ?? 0),
        PLAYHEAD_TARGET_MS,
      ),
      frameStart: summarize(
        barlines.flatMap((b) => (b.frameStartDiffMs === null ? [] : [b.frameStartDiffMs])),
        PLAYHEAD_TARGET_MS,
      ),
      outputLatencyMs: {
        min: Math.min(...barlines.map((b) => b.outputLatencyMs)),
        max: Math.max(...barlines.map((b) => b.outputLatencyMs)),
      },
      anchorDriftMs: Math.max(...offsets) - Math.min(...offsets),
      anchorSkewMs: {
        min: Math.min(...barlines.map((b) => b.anchorSkewMs)),
        max: Math.max(...barlines.map((b) => b.anchorSkewMs)),
      },
      barlines,
    }
    const line = (label: string, s: ReturnType<typeof summarize>) =>
      `${label}: n=${s.count} max|d|=${s.maxAbsMs.toFixed(1)} p95|d|=${s.p95AbsMs.toFixed(1)} ` +
      `median|d|=${s.p50AbsMs.toFixed(1)} mean=${s.meanMs.toFixed(1)} ` +
      `range=[${s.minMs.toFixed(1)}, ${s.maxMs.toFixed(1)}] over ${PLAYHEAD_TARGET_MS} ms=${s.overTarget}`
    console.log(
      `\n=== Playhead band vs heard barline, ${PLAYHEAD_TEMPO} BPM (${report.browserVersion}) ===`,
    )
    console.log(JSON.stringify({ ...report, barlines: undefined }, null, 2))
    console.log(line('observer callback', report.observed))
    console.log(line('next frame', report.nextFrame))
    console.log(line('frame start', report.frameStart))
    test.info().annotations.push({ type: 'rolling-playhead', description: JSON.stringify(report) })
    writeReport('playhead', report)
  })
})

/** Intent: the longest of a set of timed entries; 0 when there is none. */
function longest(entries: readonly TimedEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.duration), 0)
}

for (const viewport of MAIN_THREAD_VIEWPORTS) {
  test.describe(`main thread at ${MAIN_THREAD_TEMPO} BPM, ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test('reports the longest main-thread task over a minute of the densest session', async ({
      page,
      browser,
    }) => {
      test.setTimeout((MAIN_THREAD_RUNNING_SECONDS + 120) * 1000)
      await installMainThreadProbes(page)
      await captureAudioContext(page)
      await readyRealAudioSession(page, MAIN_THREAD_TEMPO, DENSEST_SETTING)
      const engravingsBefore = await page.evaluate(() => window.__workspaceHarness.engravings())

      await startHeartbeat(page)
      const startedAt = await page.evaluate(() => performance.now())
      const phraseOneAt = await startRealSession(page, MAIN_THREAD_TEMPO)
      await untilHeard(
        page,
        phraseOneAt + MAIN_THREAD_RUNNING_SECONDS,
        (MAIN_THREAD_RUNNING_SECONDS + 60) * 1000,
      )
      const endedAt = await page.evaluate(() => performance.now())
      const stateAtEnd = await sessionState(page)
      const engravings =
        (await page.evaluate(() => window.__workspaceHarness.engravings())) - engravingsBefore
      const diagnostics = await audioDiagnostics(page)
      const phraseOneWallMs = await page.evaluate((at) => {
        const anchor = window.__workspaceHarness.audio.clockAnchor()
        return anchor.performanceTimeMs + (at - anchor.audioTime) * 1000
      }, phraseOneAt)
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
      await stopSession(page)

      const inWindow = <T extends TimedEntry>(entry: T): boolean =>
        entry.startTime >= startedAt && entry.startTime <= endedAt
      const tasks = recorded.longTasks.filter(inWindow)
      const frames = recorded.longFrames.filter(inWindow)
      const longestFrame = [...frames].sort((a, b) => b.duration - a.duration)[0]
      const topTasks = [...tasks]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map((task) => ({
          durationMs: task.duration,
          secondsIntoPhraseOne: (task.startTime - phraseOneWallMs) / 1000,
        }))
      const report = {
        viewport,
        tempo: MAIN_THREAD_TEMPO,
        browserVersion: `${browser.browserType().name()} ${browser.version()}`,
        longAnimationFrameSupported: await page.evaluate(() =>
          PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
        ),
        audio: diagnostics,
        windowMs: endedAt - startedAt,
        sessionStillRunning: stateAtEnd.phase === 'running',
        lastEnd: stateAtEnd.lastEnd,
        heldLayout: stateAtEnd.heldLayout,
        latestReady: stateAtEnd.latestReady,
        playheadAtEnd: stateAtEnd.playhead,
        engravings,
        longestTaskMs: longest(tasks),
        longTaskCount: tasks.length,
        topTasks,
        longestFrameMs: longestFrame?.duration ?? 0,
        longestFrameTopScript: describeLongestScript(longestFrame?.scripts ?? []),
        longFrameCount: frames.length,
        longestHeartbeatGapMs: recorded.maxGap,
        schedulerWindowMs: SCHEDULER_WINDOW_MS,
        // Before the window (page load, phrase 1's generation and first engraving): proof that
        // the probes were armed and recording.
        beforeStart: {
          longTaskCount: recorded.longTasks.filter((task) => task.startTime < startedAt).length,
          longestTaskMs: longest(recorded.longTasks.filter((task) => task.startTime < startedAt)),
        },
      }
      const worst = Math.max(report.longestTaskMs, report.longestHeartbeatGapMs)
      console.log(
        `\n=== Main thread, ${MAIN_THREAD_TEMPO} BPM densest, ${viewport.width}x${viewport.height} ===`,
      )
      console.log(JSON.stringify(report, null, 2))
      console.log(
        `Longest main-thread block: ${worst.toFixed(1)}ms ` +
          `(${worst < SCHEDULER_WINDOW_MS ? 'under' : 'NOT under'} the ${SCHEDULER_WINDOW_MS} ms window)`,
      )
      test
        .info()
        .annotations.push({ type: 'rolling-main-thread', description: JSON.stringify(report) })
      writeReport(`main-thread-${viewport.width}x${viewport.height}`, report)
    })
  })
}
