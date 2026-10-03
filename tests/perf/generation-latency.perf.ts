/**
 * Manual Step 9 latency harness, not part of `npm run quality`; run explicitly via
 * `npm run measure:latency`. It measures two cases, one after the other in the same process:
 *
 * - For every one of the 324 rhythm settings (noteDensity x rhythmicVariety x silenceDensity x
 *   syncopation x tensionArc, 3 x 3 x 3 x 3 x 4), a cold `generatePhrase` call on a fresh
 *   canonical-rhythm-domain memo, then a warm call with a different seed on the same memo.
 * - The first generation after a settings mutation: one memo per starting setting (as the
 *   generation Worker keeps one memo across requests) is warmed on that setting, then every step a
 *   mutation could take from it -- one mutable setting moved one grade on its mutation scale
 *   (`mutationCandidates`, so `MUTATION_SCALES`), unsupported landings left out as a mutation
 *   re-rolls them -- is generated once and timed against that same memo. The starting settings
 *   are the 324 rhythm settings, each with non-rhythm values drawn deterministically.
 *
 * Prints a compact summary of each. Writes the full per-setting JSON to `LATENCY_OUT` and the full
 * per-transition JSON to `LATENCY_TRANSITIONS_OUT` when those env vars are set.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  makeGenerationControls,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type GenerationControls,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { CANONICAL_REGISTER_ORDER } from '@/domain/profile/register-id'
import { createMulberry32, type Mulberry32Generator } from '@/domain/random/prng'
import { makeSeed } from '@/domain/random/seed'
import type { SessionSettings } from '@/session/session-types'
import {
  MUTABLE_SETTINGS,
  mutationCandidates,
  type MutableSetting,
  type MutationContext,
} from '@/session/settings-mutation'

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
 * One point of the per-setting cold/warm case: the five rhythm controls. Every other control is
 * fixed by `buildControls`.
 */
interface ControlSetting {
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
}

/** Intent: the full control policy for one measured setting, every other control held fixed. */
function buildControls(setting: ControlSetting): GenerationControls {
  return makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: setting.tensionArc,
    noteDensity: setting.noteDensity,
    rhythmicVariety: setting.rhythmicVariety,
    syncopation: setting.syncopation,
    silenceDensity: setting.silenceDensity,
    contour: 'Arch',
    register: 'Middle',
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

/** The settings whose change is a rhythm-memo miss: the five controls the memo key holds. */
const RHYTHM_SETTINGS: readonly MutableSetting[] = [
  'noteDensity',
  'rhythmicVariety',
  'silenceDensity',
  'syncopation',
  'tension',
]
/** Every other setting a mutation can change: it keeps the rhythm memo key, so it is a memo hit. */
const NON_RHYTHM_SETTINGS: readonly MutableSetting[] = MUTABLE_SETTINGS.filter(
  (setting) => !RHYTHM_SETTINGS.includes(setting),
)

interface TransitionMeasurement {
  readonly from: string
  readonly to: string
  readonly control: MutableSetting
  /** The changed setting's value before and after the step. */
  readonly fromValue: string
  readonly toValue: string
  readonly ms: number
  readonly kind: string
  /** Whether the timed generation had to materialize a rhythm domain the memo did not hold. */
  readonly memoMiss: boolean
}

/**
 * Intent: what every transition run knows besides the settings: a wide window, no step-down yet,
 * and the starting register as the resolved one (a starting setting never holds Varying).
 */
function mutationContextOf(start: SessionSettings): MutationContext {
  const register = start.controls.register
  if (register === 'Varying') throw new Error('A starting setting must hold a concrete register.')
  return { belowTabletLandscape: false, sessionSteppedDown: false, resolvedRegister: register }
}

/** The fixed seed of the deterministic draw of each starting setting's non-rhythm values. */
const START_DRAW_SEED = 24

/**
 * Intent: for each non-rhythm setting, the value each of `count` starting settings takes: the
 * catalog repeated in order over a seeded shuffle of the starting settings, so every value starts
 * equally often (up to one) and no two settings, nor a setting and the rhythm order, move together.
 */
function balancedDraw<T>(
  catalog: readonly T[],
  count: number,
  random: Mulberry32Generator,
): readonly T[] {
  const order = Array.from({ length: count }, (_, index) => index)
  for (let index = count - 1; index > 0; index -= 1) {
    const other = Math.floor(random.nextFloat() * (index + 1))
    ;[order[index], order[other]] = [order[other]!, order[index]!]
  }
  const values = new Array<T>(count)
  order.forEach((start, position) => {
    values[start] = catalog[position % catalog.length]!
  })
  return values
}

/**
 * Intent: every starting setting of the setting-change case, in a fixed, stable order: each of the
 * 324 rhythm settings once, each with non-rhythm values (tonal center, collection, harmonic
 * motion, contour, register, leapiness, arpeggio chaos and musical profile) drawn by
 * `balancedDraw` from a fixed seed. The profile is always customized, as after any mutation.
 */
function allStartSettings(): SessionSettings[] {
  const rhythms: Pick<
    GenerationControls,
    'noteDensity' | 'rhythmicVariety' | 'silenceDensity' | 'syncopation' | 'tension'
  >[] = []
  for (const noteDensity of NOTE_DENSITIES) {
    for (const rhythmicVariety of RHYTHMIC_VARIETIES) {
      for (const silenceDensity of SILENCE_DENSITIES) {
        for (const syncopation of SYNCOPATIONS) {
          for (const tension of TENSION_ARCS) {
            rhythms.push({ noteDensity, rhythmicVariety, silenceDensity, syncopation, tension })
          }
        }
      }
    }
  }
  const count = rhythms.length
  const random = createMulberry32(START_DRAW_SEED)
  const tonalCenters = balancedDraw(PITCH_CLASSES, count, random)
  const collections = balancedDraw(COLLECTIONS, count, random)
  const harmonicMotions = balancedDraw(HARMONIC_MOTIONS, count, random)
  const contours = balancedDraw(CONTOURS, count, random)
  const registers = balancedDraw(CANONICAL_REGISTER_ORDER, count, random)
  const leapinesses = balancedDraw(LEAPINESS_VALUES, count, random)
  const arpeggioChaoses = balancedDraw(ARPEGGIO_CHAOS_VALUES, count, random)
  const profiles = balancedDraw(MUSICAL_PROFILES, count, random)
  return rhythms.map((rhythm, index) => ({
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter: tonalCenters[index]!,
      collection: collections[index]!,
      harmonicMotion: harmonicMotions[index]!,
      ...rhythm,
      contour: contours[index]!,
      register: registers[index]!,
      leapiness: leapinesses[index]!,
      arpeggioChaos: arpeggioChaoses[index]!,
      instrumentProfileId: 'bb-tenor',
    }),
    musicalProfile: { musicalProfile: profiles[index]!, isCustom: true },
  }))
}

/** Intent: a compact, stable display name for one session setting. */
function settingName({ controls, musicalProfile }: SessionSettings): string {
  const rhythm = `${controls.noteDensity}/${controls.rhythmicVariety}/${controls.silenceDensity}/${controls.syncopation}/${controls.tension}`
  return (
    `${rhythm} (${controls.tonalCenter} ${controls.collection}, ${controls.harmonicMotion}, ` +
    `${controls.contour}, ${controls.register}, ${controls.leapiness}, ${controls.arpeggioChaos}, ` +
    `${musicalProfile.musicalProfile})`
  )
}

/** The number of setting-change generations made so far; it keeps request ids short and unique. */
let changeRequestCount = 0

/** Intent: run and time one `generatePhrase` call for a setting against the given memo. */
function timedGeneration(
  settings: SessionSettings,
  seed: number,
  memo: CanonicalRhythmDomainMemo,
): { ms: number; kind: string } {
  changeRequestCount += 1
  const intent = createGenerationIntent({
    requestId: makeRequestId(`perf-change-${changeRequestCount}-${seed}`),
    seed: makeSeed(seed),
    controls: settings.controls,
    musicalProfile: settings.musicalProfile,
  })
  const start = performance.now()
  const outcome = generatePhrase(intent, { rhythmDomainMemo: memo })
  return { ms: performance.now() - start, kind: outcome.kind }
}

/** What one starting setting gave: its timed transitions, and the steps a mutation re-rolls. */
interface StartTransitions {
  readonly measured: readonly TransitionMeasurement[]
  readonly unsupported: number
}

/**
 * Intent: for one starting setting, warm a fresh memo on it (as the Worker's memo is warm on the
 * setting a session has been playing), then time the first generation after each step a settings
 * mutation could take from it (`mutationCandidates`: one setting moved one grade on its mutation
 * scale), all against that same memo. Steps landing on an unsupported setting are counted, not
 * generated, since a mutation re-rolls them. Each step differs from the start and from every other
 * step, so a rhythm-setting step is always a memo miss and any other step keeps the rhythm memo
 * key. Returns nothing for a starting setting that cannot generate, since a session can never be
 * playing it.
 */
function measureTransitionsFrom(start: SessionSettings): StartTransitions | undefined {
  const context = mutationContextOf(start)
  if (isRhythmSettingBlocked(start.controls, context)) return undefined
  const memo = createCanonicalRhythmDomainMemo()
  if (timedGeneration(start, 1, memo).kind !== 'generation_success') return undefined
  const candidates = mutationCandidates(start, context)
  const measured = candidates
    .filter((candidate) => candidate.supported)
    .map((candidate): TransitionMeasurement => {
      const sizeBefore = memo.size()
      const { ms, kind } = timedGeneration(candidate.settings, 2, memo)
      return {
        from: settingName(start),
        to: settingName(candidate.settings),
        control: candidate.setting,
        fromValue: candidate.from,
        toValue: candidate.to,
        ms,
        kind,
        memoMiss: memo.size() > sizeBefore,
      }
    })
  return { measured, unsupported: candidates.length - measured.length }
}

/** Every setting-change transition from every starting setting, and what was left out. */
interface TransitionRun {
  readonly transitions: readonly TransitionMeasurement[]
  readonly starts: number
  readonly skippedStarts: number
  readonly unsupported: number
}

/** Intent: every setting-change transition from every starting setting, in a fixed, stable order. */
function allTransitions(): TransitionRun {
  const transitions: TransitionMeasurement[] = []
  const starts = allStartSettings()
  let skippedStarts = 0
  let unsupported = 0
  for (const start of starts) {
    const result = measureTransitionsFrom(start)
    if (result === undefined) {
      skippedStarts += 1
      continue
    }
    transitions.push(...result.measured)
    unsupported += result.unsupported
  }
  return { transitions, starts: starts.length, skippedStarts, unsupported }
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

/** Intent: print the setting-change summary: overall, per changed setting, and the worst transitions. */
function printTransitionSummary(run: TransitionRun): void {
  const { transitions } = run
  const succeeded = transitions.filter((m) => m.kind === 'generation_success')
  const rhythm = succeeded.filter((m) => RHYTHM_SETTINGS.includes(m.control))
  const nonRhythm = succeeded.filter((m) => NON_RHYTHM_SETTINGS.includes(m.control))

  console.log(
    `\n=== First generation after a one-step settings mutation (${transitions.length}) ===`,
  )
  console.log(
    `Starting settings: ${run.starts - run.skippedStarts} of ${run.starts} ` +
      `(${run.skippedStarts} cannot generate); unsupported steps left out (re-rolled): ` +
      `${run.unsupported}`,
  )
  console.log(
    `Successful: ${succeeded.length}, failed (supported target): ` +
      `${transitions.length - succeeded.length}`,
  )
  console.log(transitionLine('any rhythm setting', rhythm))
  for (const control of RHYTHM_SETTINGS) {
    console.log(
      transitionLine(
        control,
        rhythm.filter((m) => m.control === control),
      ),
    )
  }
  console.log(transitionLine('any other setting', nonRhythm))
  for (const control of NON_RHYTHM_SETTINGS) {
    console.log(
      transitionLine(
        control,
        nonRhythm.filter((m) => m.control === control),
      ),
    )
  }
  console.log('10 slowest transitions:')
  for (const m of [...succeeded].sort((left, right) => right.ms - left.ms).slice(0, 10)) {
    console.log(`  ${m.from} [${m.control}: ${m.fromValue} -> ${m.toValue}]: ${m.ms.toFixed(1)}ms`)
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

  it('measures the first generatePhrase after each one-step settings mutation', () => {
    const run = allTransitions()
    printTransitionSummary(run)
    const outPath = process.env.LATENCY_TRANSITIONS_OUT
    if (outPath !== undefined) {
      writeFileSync(outPath, JSON.stringify(run.transitions, null, 2))
    }
  }, 3_600_000)
})
