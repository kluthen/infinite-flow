/**
 * The arranger's cost (v4.0 measurement M4): how long rendering one phrase's parts takes, as the
 * transport would at queue time. Each corpus phrase is arranged `repeats` times in turn, the first
 * pass over the corpus cold; every single render is timed with the clock it is given, so the same
 * code runs in Node and in a phone's browser. The longest single render is the figure the 50 ms
 * rule reads: over it, the render moves into the generation worker. Only the arranger is timed;
 * regenerating the phrases is not. Test plumbing: nothing in the app reads it.
 */

import { ARRANGER_VERSION, arrangeAccompaniment } from '@/domain/backing/accompaniment-arranger'
import type { CorpusArrangerPhrase } from '../unit/domain/backing/accompaniment-corpus'

/** The longest render of one phrase's parts the main thread may take at queue time, in ms. */
export const ARRANGER_RENDER_BUDGET_MS = 50

/** The figures of one measurement. */
export interface ArrangerCostSummary {
  readonly phrases: number
  readonly repeats: number
  /** The longest single render, its phrase's label and whether it fell in the cold first pass. */
  readonly worstMs: number
  readonly worstLabel: string
  readonly worstCold: boolean
  /** The longest render of the cold first pass, and the first render of all. */
  readonly worstColdMs: number
  readonly firstMs: number
  readonly medianMs: number
  readonly p95Ms: number
  readonly totalMs: number
  /** Where the 50 ms rule puts the render: on the main thread at queue time, or in the worker. */
  readonly verdict: 'main-thread' | 'generation-worker'
}

/** The value at quantile `q` (0-1) of ascending `sorted`, nearest rank; 0 for an empty list. */
function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] ?? 0
}

/**
 * Arrange every phrase `repeats` times, pass after pass, timing each render with `now` (ms), and
 * summarize. Throws on an empty corpus or a repeat count below 1.
 */
export function measureArrangerCost(
  phrases: readonly CorpusArrangerPhrase[],
  now: () => number,
  repeats: number,
): ArrangerCostSummary {
  if (phrases.length === 0) throw new Error('Arranger cost: no phrase to arrange.')
  if (!Number.isInteger(repeats) || repeats < 1) {
    throw new Error(`Arranger cost: ${repeats} repeats is not a positive integer.`)
  }
  const settings = { arrangerVersion: ARRANGER_VERSION } as const
  const times: number[] = []
  let worst = { ms: -1, label: '', cold: false }
  let worstColdMs = 0
  for (let pass = 0; pass < repeats; pass += 1) {
    for (const { label, phrase } of phrases) {
      const startedAt = now()
      arrangeAccompaniment(phrase, settings)
      const ms = now() - startedAt
      times.push(ms)
      if (ms > worst.ms) worst = { ms, label, cold: pass === 0 }
      if (pass === 0) worstColdMs = Math.max(worstColdMs, ms)
    }
  }
  const sorted = [...times].sort((a, b) => a - b)
  return {
    phrases: phrases.length,
    repeats,
    worstMs: worst.ms,
    worstLabel: worst.label,
    worstCold: worst.cold,
    worstColdMs,
    firstMs: times[0]!,
    medianMs: quantile(sorted, 0.5),
    p95Ms: quantile(sorted, 0.95),
    totalMs: times.reduce((sum, ms) => sum + ms, 0),
    verdict: worst.ms > ARRANGER_RENDER_BUDGET_MS ? 'generation-worker' : 'main-thread',
  }
}

/** A summary as one `ARRANGER-COST` line, times in ms to three decimals. */
export function arrangerCostLine(summary: ArrangerCostSummary): string {
  /** A time in ms to three decimals. */
  const ms = (value: number): string => value.toFixed(3)
  return [
    'ARRANGER-COST',
    `phrases=${summary.phrases}`,
    `repeats=${summary.repeats}`,
    `worst=${ms(summary.worstMs)}ms (${summary.worstLabel}${summary.worstCold ? ', cold pass' : ''})`,
    `worst-cold-pass=${ms(summary.worstColdMs)}ms`,
    `first=${ms(summary.firstMs)}ms`,
    `median=${ms(summary.medianMs)}ms`,
    `p95=${ms(summary.p95Ms)}ms`,
    `total=${ms(summary.totalMs)}ms`,
    `budget=${ARRANGER_RENDER_BUDGET_MS}ms`,
    `verdict=${summary.verdict}`,
  ].join(' ')
}
