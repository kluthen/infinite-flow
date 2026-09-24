/**
 * Manual Step 9 latency harness: for every one of the 144 rhythm settings (noteDensity x
 * silenceDensity x syncopation x tensionArc), measures a cold `generatePhrase` call on a fresh
 * canonical-rhythm-domain memo, then a warm call with a different seed on the same memo, and
 * prints a compact latency summary. Not part of `npm run quality`; run explicitly via
 * `npm run measure:latency`. Writes the full per-setting JSON to `LATENCY_OUT` when that env var
 * is set.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, it } from 'vitest'

import {
  makeGenerationControls,
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { createCanonicalRhythmDomainMemo } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { makeSeed } from '@/domain/random/seed'

interface SettingMeasurement {
  readonly noteDensity: string
  readonly silenceDensity: string
  readonly syncopation: string
  readonly tensionArc: string
  readonly coldMs: number
  readonly warmMs: number
  readonly coldKind: string
  readonly warmKind: string
}

/** Intent: the fixed, non-rhythm controls every measured setting shares. */
function buildControls(
  noteDensity: (typeof NOTE_DENSITIES)[number],
  silenceDensity: (typeof SILENCE_DENSITIES)[number],
  syncopation: (typeof SYNCOPATIONS)[number],
  tension: (typeof TENSION_ARCS)[number],
): GenerationControls {
  return makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension,
    noteDensity,
    syncopation,
    silenceDensity,
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'bb-tenor',
  })
}

/** Intent: measure one rhythm setting's cold (fresh memo) and warm (different seed, same memo) call. */
function measureSetting(
  noteDensity: (typeof NOTE_DENSITIES)[number],
  silenceDensity: (typeof SILENCE_DENSITIES)[number],
  syncopation: (typeof SYNCOPATIONS)[number],
  tensionArc: (typeof TENSION_ARCS)[number],
): SettingMeasurement {
  const controls = buildControls(noteDensity, silenceDensity, syncopation, tensionArc)
  const name = `${noteDensity}-${silenceDensity}-${syncopation}-${tensionArc}`
  const memo = createCanonicalRhythmDomainMemo()

  const coldIntent = createGenerationIntent({
    requestId: makeRequestId(`perf-${name}-cold`),
    seed: makeSeed(1),
    controls,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
  const coldStart = performance.now()
  const coldOutcome = generatePhrase(coldIntent, { rhythmDomainMemo: memo })
  const coldMs = performance.now() - coldStart

  const warmIntent = createGenerationIntent({
    requestId: makeRequestId(`perf-${name}-warm`),
    seed: makeSeed(2),
    controls,
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
  const warmStart = performance.now()
  const warmOutcome = generatePhrase(warmIntent, { rhythmDomainMemo: memo })
  const warmMs = performance.now() - warmStart

  return {
    noteDensity,
    silenceDensity,
    syncopation,
    tensionArc,
    coldMs,
    warmMs,
    coldKind: coldOutcome.kind,
    warmKind: warmOutcome.kind,
  }
}

/** Intent: every one of the 144 rhythm settings the harness measures, in a fixed, stable order. */
function allSettings(): SettingMeasurement[] {
  const results: SettingMeasurement[] = []
  for (const noteDensity of NOTE_DENSITIES) {
    for (const silenceDensity of SILENCE_DENSITIES) {
      for (const syncopation of SYNCOPATIONS) {
        for (const tensionArc of TENSION_ARCS) {
          results.push(measureSetting(noteDensity, silenceDensity, syncopation, tensionArc))
        }
      }
    }
  }
  return results
}

/** Intent: the given percentile (0-100) of a numeric sample, nearest-rank, sorted ascending. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)]!
}

/** Intent: the median/p90/p95/max summary of one numeric sample. */
function summarize(values: readonly number[]): {
  median: number
  p90: number
  p95: number
  max: number
} {
  const sorted = [...values].sort((left, right) => left - right)
  return {
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    max: sorted.length > 0 ? sorted[sorted.length - 1]! : 0,
  }
}

/** Intent: print the compact console summary the task report is built from. */
function printSummary(measurements: readonly SettingMeasurement[]): void {
  const supported = measurements.filter((m) => m.coldKind === 'generation_success')
  const unsupported = measurements.filter((m) => m.coldKind !== 'generation_success')

  const coldSummary = summarize(supported.map((m) => m.coldMs))
  const warmSummary = summarize(supported.map((m) => m.warmMs))

  console.log(`\n=== Step 9 generation latency harness (${measurements.length} settings) ===`)
  console.log(`Supported settings: ${supported.length}, unsupported: ${unsupported.length}`)
  console.log(
    `Cold  (ms): median=${coldSummary.median.toFixed(1)} p90=${coldSummary.p90.toFixed(1)} ` +
      `p95=${coldSummary.p95.toFixed(1)} max=${coldSummary.max.toFixed(1)}`,
  )
  console.log(
    `Warm  (ms): median=${warmSummary.median.toFixed(1)} p90=${warmSummary.p90.toFixed(1)} ` +
      `p95=${warmSummary.p95.toFixed(1)} max=${warmSummary.max.toFixed(1)}`,
  )

  const slowestCold = [...supported].sort((left, right) => right.coldMs - left.coldMs).slice(0, 5)
  console.log('5 slowest cold settings:')
  for (const m of slowestCold) {
    console.log(
      `  ${m.noteDensity}/${m.silenceDensity}/${m.syncopation}/${m.tensionArc}: ` +
        `cold=${m.coldMs.toFixed(1)}ms warm=${m.warmMs.toFixed(1)}ms`,
    )
  }

  console.log(`Unsupported (no_legal_rhythm_plan) settings' timings:`)
  for (const m of unsupported) {
    console.log(
      `  ${m.noteDensity}/${m.silenceDensity}/${m.syncopation}/${m.tensionArc}: ` +
        `cold=${m.coldMs.toFixed(1)}ms warm=${m.warmMs.toFixed(1)}ms`,
    )
  }
}

// @test-link [[service_generation_orchestration]]
describe('generation latency harness', () => {
  it('measures cold vs warm generatePhrase latency across every rhythm setting', () => {
    const measurements = allSettings()
    printSummary(measurements)
    const outPath = process.env.LATENCY_OUT
    if (outPath !== undefined) {
      writeFileSync(outPath, JSON.stringify(measurements, null, 2))
    }
  }, 600_000)
})
