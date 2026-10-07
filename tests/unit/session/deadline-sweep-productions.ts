/**
 * How each look-ahead phrase of a timed sweep run (deadline-sweep.ts) was produced: with carry-in,
 * standalone for one of the failure ladder's reasons, or as a repeat, read from the engine's
 * outputs alone. The real-cost sweep counts these to show how often the ladder's time rule gives up
 * carry-in; the injected-failure sweep checks them.
 */

import { standaloneDue } from '@/session/session-timing'
import { SWEEP_PHRASE_COUNT, type TimedOutput, type TimedSession } from './deadline-sweep'

/**
 * How a look-ahead phrase was produced: with carry-in; standalone because its first request was
 * already standalone (a deadline within the standalone reserve), after its carry-in attempt was cut
 * over and cancelled, after a carry-in attempt failed past the cutover time, after a carry-in
 * attempt exhausted its search (no_legal_pitch_plan) before it, or after the three carry-in retries
 * failed; standalone at every rung, its carry-in unusable after a settings change; a repeat; or
 * never decided. The first three lost their carry-in to the ladder's time rule.
 */
export type PhraseProduction =
  | 'carry-in'
  | 'standalone-requested-first'
  | 'standalone-after-cutover-cancel'
  | 'standalone-after-failure-past-cutover'
  | 'standalone-after-no-legal-pitch-plan'
  | 'standalone-after-three-retries'
  | 'standalone-carry-in-unusable'
  | 'repeat'
  | 'undecided'

/** Every phrase production, in report order. */
export const PHRASE_PRODUCTIONS: readonly PhraseProduction[] = [
  'carry-in',
  'standalone-requested-first',
  'standalone-after-cutover-cancel',
  'standalone-after-failure-past-cutover',
  'standalone-after-no-legal-pitch-plan',
  'standalone-after-three-retries',
  'standalone-carry-in-unusable',
  'repeat',
  'undecided',
]

/** The productions in which a phrase lost its carry-in to the ladder's time rule. */
export const TIME_RULE_PRODUCTIONS: ReadonlySet<PhraseProduction> = new Set([
  'standalone-requested-first',
  'standalone-after-cutover-cancel',
  'standalone-after-failure-past-cutover',
])

/**
 * Intent: how a standalone phrase came about, from the requests made for it (after its last
 * discard): which request was the first standalone one, and what the request before it became.
 */
function standaloneProduction(
  run: TimedSession,
  requests: readonly TimedOutput[],
): PhraseProduction {
  const steps = requests.flatMap(({ at, output }) =>
    output.kind === 'request-generation' ? [{ at, request: output }] : [],
  )
  if (steps.some(({ request }) => request.step === 'standalone' && request.retry < 4))
    return 'standalone-carry-in-unusable'
  const first = steps.findIndex(({ request }) => request.step === 'standalone')
  if (first <= 0) return 'standalone-requested-first'
  const before = steps[first - 1]!.request
  const cancelled = run.outputs.some(
    ({ output }) => output.kind === 'cancel-generation' && output.attemptId === before.attemptId,
  )
  if (cancelled) return 'standalone-after-cutover-cancel'
  if (before.retry === 3) return 'standalone-after-three-retries'
  return standaloneDue(steps[first]!.at, before.deadline)
    ? 'standalone-after-failure-past-cutover'
    : 'standalone-after-no-legal-pitch-plan'
}

/**
 * Intent: how each phrase of a timed run after phrase 1 was produced, in phrase order, from the
 * engine's outputs alone: the requests made for it since its last discard, the cancellations, and
 * the origin of the phrase that became ready for it last.
 */
export function phraseProductions(run: TimedSession): readonly PhraseProduction[] {
  return Array.from({ length: SWEEP_PHRASE_COUNT - 1 }, (_, offset) => offset + 2).map(
    (phraseNumber): PhraseProduction => {
      const discardedAt = run.outputs
        .map(
          ({ output }) =>
            output.kind === 'phrase-discarded' && output.phraseNumber === phraseNumber,
        )
        .lastIndexOf(true)
      const since = run.outputs.slice(discardedAt + 1)
      const ready = since
        .filter(
          ({ output }) =>
            output.kind === 'phrase-ready' && output.phrase.phraseNumber === phraseNumber,
        )
        .at(-1)?.output
      if (ready?.kind !== 'phrase-ready' || ready.phrase.origin === 'idle') return 'undecided'
      if (ready.phrase.origin !== 'standalone') return ready.phrase.origin
      return standaloneProduction(
        run,
        since.filter(
          ({ output }) =>
            output.kind === 'request-generation' && output.phraseNumber === phraseNumber,
        ),
      )
    },
  )
}
