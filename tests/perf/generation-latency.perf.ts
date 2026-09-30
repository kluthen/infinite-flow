/**
 * Manual Step 9 latency harness, not part of `npm run quality`; run explicitly via
 * `npm run measure:latency`. It measures two cases, one after the other in the same process:
 *
 * - For every one of the 324 rhythm settings (noteDensity x rhythmicVariety x silenceDensity x
 *   syncopation x tensionArc, 3 x 3 x 3 x 3 x 4), a cold `generatePhrase` call on a fresh
 *   canonical-rhythm-domain memo, then a warm call with a different seed on the same memo.
 * - The first generation after a change to one setting, as a mid-session settings mutation causes:
 *   one memo per starting setting (as the generation Worker keeps one memo across requests) is
 *   warmed on that setting, then each one-step neighbour of it -- one rhythm control, tonal center
 *   or register moved by one grade -- is generated once and timed against that same memo.
 *
 * Prints a compact summary of each. Writes the full per-setting JSON to `LATENCY_OUT` and the full
 * per-transition JSON to `LATENCY_TRANSITIONS_OUT` when those env vars are set.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, it } from 'vitest'

import {
  makeGenerationControls,
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  TENSION_ARCS,
  type GenerationControls,
  type NoteDensity,
  type PitchClass,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import type { RegisterChoice } from '@/domain/profile/register-intent'
import { makeSeed } from '@/domain/random/seed'

interface SettingMeasurement {
  readonly noteDensity: string
  readonly rhythmicVariety: string
  readonly silenceDensity: string
  readonly syncopation: string
  readonly tensionArc: string
  readonly coldMs: number
  readonly warmMs: number
  readonly coldKind: string
  readonly warmKind: string
}

/**
 * One point of the measured control space: the five rhythm controls plus the two non-rhythm
 * controls the setting-change case moves (tonal center and register). Every other control is fixed
 * by `buildControls`.
 */
interface ControlSetting {
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
  readonly tonalCenter: PitchClass
  readonly register: RegisterChoice
}

/** Intent: the tonal center and register every setting of the per-setting cold/warm case uses. */
const BASE_TONAL_CENTER: PitchClass = 'C'
const BASE_REGISTER: RegisterChoice = 'Middle'

/** Intent: the full control policy for one measured setting, every other control held fixed. */
function buildControls(setting: ControlSetting): GenerationControls {
  return makeGenerationControls({
    tempo: 90,
    tonalCenter: setting.tonalCenter,
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: setting.tensionArc,
    noteDensity: setting.noteDensity,
    rhythmicVariety: setting.rhythmicVariety,
    syncopation: setting.syncopation,
    silenceDensity: setting.silenceDensity,
    contour: 'Arch',
    register: setting.register,
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'bb-tenor',
  })
}

/** Intent: measure one rhythm setting's cold (fresh memo) and warm (different seed, same memo) call. */
function measureSetting(
  noteDensity: NoteDensity,
  rhythmicVariety: RhythmicVariety,
  silenceDensity: SilenceDensity,
  syncopation: Syncopation,
  tensionArc: TensionArc,
): SettingMeasurement {
  const controls = buildControls({
    noteDensity,
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc,
    tonalCenter: BASE_TONAL_CENTER,
    register: BASE_REGISTER,
  })
  const name = `${noteDensity}-${rhythmicVariety}-${silenceDensity}-${syncopation}-${tensionArc}`
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
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc,
    coldMs,
    warmMs,
    coldKind: coldOutcome.kind,
    warmKind: warmOutcome.kind,
  }
}

/** Intent: every one of the 324 rhythm settings the harness measures, in a fixed, stable order. */
function allSettings(): SettingMeasurement[] {
  const results: SettingMeasurement[] = []
  for (const noteDensity of NOTE_DENSITIES) {
    for (const rhythmicVariety of RHYTHMIC_VARIETIES) {
      for (const silenceDensity of SILENCE_DENSITIES) {
        for (const syncopation of SYNCOPATIONS) {
          for (const tensionArc of TENSION_ARCS) {
            results.push(
              measureSetting(noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc),
            )
          }
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
      `  ${m.noteDensity}/${m.rhythmicVariety}/${m.silenceDensity}/${m.syncopation}/${m.tensionArc}: ` +
        `cold=${m.coldMs.toFixed(1)}ms warm=${m.warmMs.toFixed(1)}ms`,
    )
  }

  console.log(`Unsupported (no_legal_rhythm_plan) settings' timings:`)
  for (const m of unsupported) {
    console.log(
      `  ${m.noteDensity}/${m.rhythmicVariety}/${m.silenceDensity}/${m.syncopation}/${m.tensionArc}: ` +
        `cold=${m.coldMs.toFixed(1)}ms warm=${m.warmMs.toFixed(1)}ms`,
    )
  }
}

/** The control a setting-change transition moves, and whether it is part of the rhythm memo key. */
type ChangedControl =
  | 'noteDensity'
  | 'rhythmicVariety'
  | 'silenceDensity'
  | 'syncopation'
  | 'tensionArc'
  | 'tonalCenter'
  | 'register'

const RHYTHM_CONTROLS: readonly ChangedControl[] = [
  'noteDensity',
  'rhythmicVariety',
  'silenceDensity',
  'syncopation',
  'tensionArc',
]
const NON_RHYTHM_CONTROLS: readonly ChangedControl[] = ['tonalCenter', 'register']

interface TransitionMeasurement {
  readonly from: string
  readonly to: string
  readonly control: ChangedControl
  readonly ms: number
  readonly kind: string
  /** Whether the timed generation had to materialize a rhythm domain the memo did not hold. */
  readonly memoMiss: boolean
}

/** Intent: the catalog each changeable control takes its values from. */
function catalogOf(control: ChangedControl): readonly string[] {
  switch (control) {
    case 'noteDensity':
      return NOTE_DENSITIES
    case 'rhythmicVariety':
      return RHYTHMIC_VARIETIES
    case 'silenceDensity':
      return SILENCE_DENSITIES
    case 'syncopation':
      return SYNCOPATIONS
    case 'tensionArc':
      return TENSION_ARCS
    case 'tonalCenter':
      return PITCH_CLASSES
    case 'register':
      return REGISTER_CHOICES
  }
}

/**
 * Intent: the values one grade away from `value` in its control's catalog order -- the moves a
 * settings mutation can make. Tonal center wraps around the octave (C's neighbours are C# and B);
 * every other catalog is an ordered scale with no wrap.
 */
function oneStepNeighbours(control: ChangedControl, value: string): string[] {
  const catalog = catalogOf(control)
  const index = catalog.indexOf(value)
  if (index < 0) throw new Error(`${value} is not in the ${control} catalog`)
  if (control === 'tonalCenter') {
    return [
      catalog[(index + 1) % catalog.length]!,
      catalog[(index - 1 + catalog.length) % catalog.length]!,
    ]
  }
  return [catalog[index - 1], catalog[index + 1]].filter((v): v is string => v !== undefined)
}

/** Intent: a compact, stable display name for one control setting. */
function settingName(setting: ControlSetting): string {
  const rhythm = `${setting.noteDensity}/${setting.rhythmicVariety}/${setting.silenceDensity}/${setting.syncopation}/${setting.tensionArc}`
  return `${rhythm} (${setting.tonalCenter}, ${setting.register})`
}

/** Intent: run and time one `generatePhrase` call for a setting against the given memo. */
function timedGeneration(
  setting: ControlSetting,
  seed: number,
  memo: CanonicalRhythmDomainMemo,
): { ms: number; kind: string } {
  const intent = createGenerationIntent({
    requestId: makeRequestId(`perf-change-${settingName(setting)}-${seed}`),
    seed: makeSeed(seed),
    controls: buildControls(setting),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  })
  const start = performance.now()
  const outcome = generatePhrase(intent, { rhythmDomainMemo: memo })
  return { ms: performance.now() - start, kind: outcome.kind }
}

/**
 * Intent: for one starting setting, warm a fresh memo on it (as the Worker's memo is warm on the
 * setting a session has been playing), then time the first generation after each one-step change
 * of one control, all against that same memo. Each neighbour differs from the start and from every
 * other neighbour, so a rhythm-control change is always a memo miss; a tonal-center or register
 * change keeps the rhythm memo key and so is expected to hit. Returns nothing for a starting
 * setting that cannot generate, since a session can never be playing it.
 */
function measureTransitionsFrom(start: ControlSetting): TransitionMeasurement[] {
  const memo = createCanonicalRhythmDomainMemo()
  if (timedGeneration(start, 1, memo).kind !== 'generation_success') return []
  const results: TransitionMeasurement[] = []
  for (const control of [...RHYTHM_CONTROLS, ...NON_RHYTHM_CONTROLS]) {
    for (const value of oneStepNeighbours(control, start[control])) {
      const target = { ...start, [control]: value } as ControlSetting
      const sizeBefore = memo.size()
      const { ms, kind } = timedGeneration(target, 2, memo)
      results.push({
        from: settingName(start),
        to: settingName(target),
        control,
        ms,
        kind,
        memoMiss: memo.size() > sizeBefore,
      })
    }
  }
  return results
}

/** Intent: every setting-change transition from every rhythm setting, in a fixed, stable order. */
function allTransitions(): TransitionMeasurement[] {
  const results: TransitionMeasurement[] = []
  for (const noteDensity of NOTE_DENSITIES) {
    for (const rhythmicVariety of RHYTHMIC_VARIETIES) {
      for (const silenceDensity of SILENCE_DENSITIES) {
        for (const syncopation of SYNCOPATIONS) {
          for (const tensionArc of TENSION_ARCS) {
            results.push(
              ...measureTransitionsFrom({
                noteDensity,
                rhythmicVariety,
                silenceDensity,
                syncopation,
                tensionArc,
                tonalCenter: BASE_TONAL_CENTER,
                register: BASE_REGISTER,
              }),
            )
          }
        }
      }
    }
  }
  return results
}

/** Intent: one summary line for a group of successful transitions. */
function transitionLine(label: string, group: readonly TransitionMeasurement[]): string {
  const s = summarize(group.map((m) => m.ms))
  const misses = group.filter((m) => m.memoMiss).length
  return (
    `  ${label}: n=${group.length} memo misses=${misses} median=${s.median.toFixed(1)} ` +
    `p90=${s.p90.toFixed(1)} p95=${s.p95.toFixed(1)} max=${s.max.toFixed(1)}`
  )
}

/** Intent: print the setting-change summary: overall, per changed control, and the worst transitions. */
function printTransitionSummary(transitions: readonly TransitionMeasurement[]): void {
  const succeeded = transitions.filter((m) => m.kind === 'generation_success')
  const rhythm = succeeded.filter((m) => RHYTHM_CONTROLS.includes(m.control))
  const nonRhythm = succeeded.filter((m) => NON_RHYTHM_CONTROLS.includes(m.control))

  console.log(`\n=== First generation after a one-step setting change (${transitions.length}) ===`)
  console.log(
    `Successful: ${succeeded.length}, failed (unsupported target): ` +
      `${transitions.length - succeeded.length}`,
  )
  console.log(transitionLine('any rhythm control', rhythm))
  for (const control of RHYTHM_CONTROLS) {
    console.log(
      transitionLine(
        control,
        rhythm.filter((m) => m.control === control),
      ),
    )
  }
  console.log(transitionLine('tonal center or register', nonRhythm))
  for (const control of NON_RHYTHM_CONTROLS) {
    console.log(
      transitionLine(
        control,
        nonRhythm.filter((m) => m.control === control),
      ),
    )
  }
  console.log('10 slowest transitions:')
  for (const m of [...succeeded].sort((left, right) => right.ms - left.ms).slice(0, 10)) {
    console.log(`  ${m.from} -> ${m.to} [${m.control}]: ${m.ms.toFixed(1)}ms`)
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

  it('measures the first generatePhrase after a one-step change to one setting', () => {
    const transitions = allTransitions()
    printTransitionSummary(transitions)
    const outPath = process.env.LATENCY_TRANSITIONS_OUT
    if (outPath !== undefined) {
      writeFileSync(outPath, JSON.stringify(transitions, null, 2))
    }
  }, 3_600_000)
})
