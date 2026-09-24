import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { makeSeed } from '@/domain/random/seed'

/** Intent: a profile-switch policy no test in this file exercises; never called since notation-mode switching never touches the profile. */
function unusedEvaluateProfileSwitch(): never {
  throw new Error('evaluateProfileSwitch should not be called by display-mode switching tests.')
}

/** The real per-session generation result: the successful outcome plus the intent that produced it. */
interface SessionResult {
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly intent: GenerationIntent
}

/** Intent: build fresh, call-counted request-id/seed providers so a test can prove a display switch never consumes them (never re-generates). */
function trackedProviders() {
  let id = 0
  let seed = 0
  return {
    providers: {
      nextRequestId: () => makeRequestId(`notation-session-${++id}`),
      nextSeed: () => makeSeed(++seed),
    },
    counts: () => ({ id, seed }),
  }
}

/** Intent: drive a real generatePhrase call through the session's injected generate seam, crashing early if the fixture ever stops producing a success. */
function realGenerate(intent: GenerationIntent): SessionResult {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Fixture setup: expected generation_success, got "${outcome.kind}".`)
  }
  return { outcome, intent }
}

/** Intent: apply the same cheap, deliberately-inexpensive control values used by the orchestrator fixtures so generation stays fast. */
function useCheapControls(
  session: ReturnType<typeof createGenerationSession<SessionResult>>,
): void {
  expect(session.actions.setControl('noteDensity', 'Quarter')).toBe(true)
  expect(session.actions.setControl('syncopation', 'Straight')).toBe(true)
  expect(session.actions.setControl('silenceDensity', 'Sparse')).toBe(true)
  expect(session.actions.setControl('harmonicMotion', 'Gentle diatonic')).toBe(true)
  expect(session.actions.setControl('tension', 'Settled')).toBe(true)
}

// @test-link [[rule_notation_display_preserves_phrase]]
// @test-link [[module_notation_display_convention]]
describe('generation session notation display switching', () => {
  it('cycles every display mode without altering the generated result, intent, controls, or provider counters', async () => {
    const written: WrittenPhrase[] = []
    const tracked = trackedProviders()
    const session = createGenerationSession<SessionResult>({
      providers: tracked.providers,
      generate: async (intent) => realGenerate(intent),
      notate: async (result, mode) => {
        written.push(
          transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent), mode),
        )
      },
      evaluateProfileSwitch: unusedEvaluateProfileSwitch,
    })
    useCheapControls(session)

    await expect(session.actions.generate()).resolves.toBe(true)
    // generate() also drives the post-generation automatic engrave, in the default display mode.
    expect(written).toHaveLength(1)
    expect(written[0]?.mode).toBe('B-flat tenor')
    const countsAfterGenerate = tracked.counts()
    const resultSnapshot = JSON.stringify(session.state.result)
    const intentSnapshot = JSON.stringify(session.state.latestIntent)
    const controlsSnapshot = JSON.stringify(session.state.controls)

    /** Intent: assert the session's mutation-sensitive state is byte-identical to the post-generation snapshot and no provider call was consumed. */
    function assertGenerationStateUntouched(): void {
      expect(JSON.stringify(session.state.result)).toBe(resultSnapshot)
      expect(JSON.stringify(session.state.latestIntent)).toBe(intentSnapshot)
      expect(JSON.stringify(session.state.controls)).toBe(controlsSnapshot)
      expect(tracked.counts()).toEqual(countsAfterGenerate)
    }

    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('Concert')
    assertGenerationStateUntouched()

    await expect(session.actions.setNotationMode('E-flat alto')).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('E-flat alto')
    assertGenerationStateUntouched()

    await expect(session.actions.setNotationMode('B-flat tenor')).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('B-flat tenor')
    assertGenerationStateUntouched()

    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('Concert')
    assertGenerationStateUntouched()

    expect(written).toHaveLength(5)
    expect(written.map((phrase) => phrase.mode)).toEqual([
      'B-flat tenor',
      'Concert',
      'E-flat alto',
      'B-flat tenor',
      'Concert',
    ])
    expect(written.map((phrase) => phrase.transposition)).toEqual([
      { chromatic: 14, diatonic: 8 },
      { chromatic: 0, diatonic: 0 },
      { chromatic: 9, diatonic: 5 },
      { chromatic: 14, diatonic: 8 },
      { chromatic: 0, diatonic: 0 },
    ])
    expect(written[4]).toEqual(written[1])
    expect(written[3]).toEqual(written[0])
  })

  it('keeps the prior mode and result snapshot when notate throws, and commits it once retryNotation succeeds', async () => {
    const written: WrittenPhrase[] = []
    const tracked = trackedProviders()
    let shouldFail = true
    const session = createGenerationSession<SessionResult>({
      providers: tracked.providers,
      generate: async (intent) => realGenerate(intent),
      notate: async (result, mode) => {
        if (shouldFail) throw new Error('engraving redraw failed')
        written.push(
          transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent), mode),
        )
      },
      evaluateProfileSwitch: unusedEvaluateProfileSwitch,
    })
    useCheapControls(session)

    // generate() succeeds, but the post-generation automatic engrave also fails while shouldFail
    // is true: generation itself still resolves true, and the result is retained regardless.
    await expect(session.actions.generate()).resolves.toBe(true)
    const countsAfterGenerate = tracked.counts()
    const resultSnapshot = JSON.stringify(session.state.result)
    const modeBeforeFailure = session.state.presentation.notationMode
    expect(session.state.notationError?.message).toBe('engraving redraw failed')
    expect(session.state.failedNotationMode).toBe(modeBeforeFailure)

    await expect(session.actions.setNotationMode('Concert')).resolves.toBe(false)
    expect(session.state.presentation.notationMode).toBe(modeBeforeFailure)
    expect(session.state.notationError?.message).toBe('engraving redraw failed')
    expect(session.state.failedNotationMode).toBe('Concert')
    expect(JSON.stringify(session.state.result)).toBe(resultSnapshot)
    expect(tracked.counts()).toEqual(countsAfterGenerate)
    expect(written).toHaveLength(0)

    shouldFail = false
    await expect(session.actions.retryNotation()).resolves.toBe(true)
    expect(session.state.presentation.notationMode).toBe('Concert')
    expect(session.state.notationError).toBeNull()
    expect(session.state.failedNotationMode).toBeNull()
    expect(JSON.stringify(session.state.result)).toBe(resultSnapshot)
    expect(tracked.counts()).toEqual(countsAfterGenerate)
    expect(written).toHaveLength(1)
    expect(written[0]?.mode).toBe('Concert')
  })
})
