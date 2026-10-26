import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  makeRequestRhythmLock,
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
  type RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { rhythmBarKey, type WrittenMeasure } from '@/domain/rhythm/rhythm-bars'
import { isRhythmChangeDrawn } from '@/domain/rhythm/rhythm-change-draw'
import { rhythmChangeBetween } from '@/domain/rhythm/rhythm-change-kinds'
import { phraseAttemptSeed } from '@/session/session-seed-plan'

import { lockedBarsOf, lockPending } from '../../rhythm/rhythm-lock-fixture'
import { lockTestIntent, type LockTestRhythmControls } from './rhythm-lock-search-fixture'

type Success = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** Intent: generate and require a success. */
function succeed(intent: GenerationIntent): Success {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') throw new Error(`Expected a phrase: ${outcome.code}`)
  return outcome
}

/** Intent: the rhythm lock group on with these bars, these allowed changes and the tenser flag. */
function lockWith(
  bars: readonly LockedRhythmMeasure[],
  allowedChanges: readonly RhythmChangeKind[],
  tenserPhrase = false,
): RequestRhythmLock {
  return makeRequestRhythmLock({ state: { kind: 'locked', bars }, allowedChanges, tenserPhrase })
}

/** Intent: locked bars as written measures, to measure a change from. */
function written(bars: readonly LockedRhythmMeasure[]): readonly WrittenMeasure[] {
  return bars.map((events, barIndex) => ({ barIndex, events }))
}

/** Intent: phrase seeds as a session derives them, over twenty sessions and two phrases each. */
function sessionPhraseSeeds(): readonly Seed[] {
  const seeds: Seed[] = []
  for (let session = 0; session < 20; session += 1)
    for (const phrase of [2, 3]) seeds.push(phraseAttemptSeed(makeSeed(session), phrase, 0))
  return seeds
}

const SEEDS = sessionPhraseSeeds()
const DRAWN = SEEDS.filter((seed) => isRhythmChangeDrawn(seed, false))

/** Locked bars from a Build phrase 1 whose bars offer changes of more than one kind. */
const LOCKED_BARS = lockedBarsOf(
  succeed(lockTestIntent({ tension: 'Build', seed: 4 })).provenance.rhythm,
)
const LOCKED = written(LOCKED_BARS)
const LOCKED_KEY = rhythmBarKey(LOCKED)

/** Intent: a Build intent locked on LOCKED_BARS. */
function buildIntent(seed: Seed, rhythmLock: RequestRhythmLock): GenerationIntent {
  return lockTestIntent({ tension: 'Build', seed, rhythmLock })
}

/** Intent: whether a provenance holds the rhythm change record at all. */
function hasRecord(outcome: Success): boolean {
  return Object.hasOwn(outcome.provenance, 'rhythmChange')
}

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_rhythm_change_share]]
// @test-link [[rule_allowed_rhythm_changes]]
// @test-link [[rule_rhythm_change_kinds]]
describe('the rhythm change in generation', () => {
  it('makes one allowed change from the locked bars on a drawn phrase, and records it', () => {
    expect(DRAWN.length).toBeGreaterThan(0)
    expect(DRAWN.length).toBeLessThan(SEEDS.length)
    let changed = 0
    for (const seed of SEEDS) {
      const outcome = succeed(buildIntent(seed, lockWith(LOCKED_BARS, RHYTHM_CHANGE_KINDS)))
      const { provenance } = outcome
      if (!isRhythmChangeDrawn(seed, false)) {
        expect(hasRecord(outcome)).toBe(false)
        const unchanging = succeed(buildIntent(seed, lockWith(LOCKED_BARS, [])))
        expect(outcome.result).toEqual(unchanging.result)
        expect(provenance).toEqual(unchanging.provenance)
        expect(outcome.diagnostics).toEqual(unchanging.diagnostics)
        continue
      }
      expect(hasRecord(outcome)).toBe(true)
      if (provenance.rhythmLockOutcome === 'rhythm_change') {
        const change = rhythmChangeBetween(LOCKED, provenance.rhythm.bars)
        expect(change).toBeDefined()
        expect(change?.kind).toBe(provenance.rhythmChange)
        expect(RHYTHM_CHANGE_KINDS).toContain(provenance.rhythmChange)
        changed += 1
      } else {
        expect(provenance.rhythmChange).toBe('no_change_available')
        expect(['locked_bars', 'forced_bend']).toContain(provenance.rhythmLockOutcome)
        if (provenance.rhythmLockOutcome === 'locked_bars')
          expect(rhythmBarKey(provenance.rhythm.bars)).toBe(LOCKED_KEY)
      }
    }
    expect(changed).toBeGreaterThan(0)
  })

  it('records a draw exactly on the seeds a tenser phrase draws on', () => {
    expect(
      SEEDS.some((seed) => isRhythmChangeDrawn(seed, true) && !isRhythmChangeDrawn(seed, false)),
    ).toBe(true)
    for (const seed of SEEDS) {
      const outcome = succeed(buildIntent(seed, lockWith(LOCKED_BARS, RHYTHM_CHANGE_KINDS, true)))
      expect(hasRecord(outcome)).toBe(isRhythmChangeDrawn(seed, true))
    }
  })

  it('makes only the one allowed kind', () => {
    for (const kind of ['move_note_start', 'merge_notes'] as const) {
      let changed = 0
      for (const seed of DRAWN) {
        const { provenance } = succeed(buildIntent(seed, lockWith(LOCKED_BARS, [kind])))
        if (provenance.rhythmLockOutcome !== 'rhythm_change') continue
        expect(provenance.rhythmChange).toBe(kind)
        expect(rhythmChangeBetween(LOCKED, provenance.rhythm.bars)?.kind).toBe(kind)
        changed += 1
      }
      expect(changed).toBeGreaterThan(0)
    }
  })

  it('draws nothing without an allowed kind, with the lock pending, or with the lock off', () => {
    for (const seed of DRAWN.slice(0, 4)) {
      const none = succeed(buildIntent(seed, lockWith(LOCKED_BARS, [])))
      expect(hasRecord(none)).toBe(false)
      expect(none.provenance.rhythmLockOutcome).toBe('locked_bars')
      const pending = makeRequestRhythmLock({
        ...lockPending(),
        allowedChanges: RHYTHM_CHANGE_KINDS,
      })
      for (const outcome of [
        succeed(buildIntent(seed, pending)),
        succeed(lockTestIntent({ tension: 'Build', seed })),
      ])
        expect(Object.keys(outcome.provenance)).toEqual(['harmony', 'rhythm', 'tensionBinding'])
    }
  })

  it('keeps the record out of the timeline', () => {
    for (const seed of DRAWN.slice(0, 4)) {
      const outcome = succeed(buildIntent(seed, lockWith(LOCKED_BARS, RHYTHM_CHANGE_KINDS)))
      expect(JSON.stringify(outcome.result)).not.toMatch(
        /rhythmChange|rhythm_change|no_change_available|move_note_start|merge_notes|split_note/,
      )
    }
  })

  it('gives the same outcome for the same intent', () => {
    for (const seed of DRAWN.slice(0, 4)) {
      const intent = buildIntent(seed, lockWith(LOCKED_BARS, RHYTHM_CHANGE_KINDS))
      expect(succeed(intent)).toEqual(succeed(intent))
    }
  })
})

/** The Sixteenth, Strict, Straight rhythm controls under one silence. */
function strictStraightSixteenth(
  silenceDensity: LockTestRhythmControls['silenceDensity'],
): LockTestRhythmControls {
  return {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Strict',
    syncopation: 'Straight',
    silenceDensity,
  }
}

// @test-link [[module_rhythm_change_draw]]
// @test-link [[rule_rhythm_change_kinds]]
describe('the known limit: Strict variety, Straight syncopation, Sixteenth', () => {
  it('keeps the locked bars and records no change available under Conversational and Breath-heavy silence', () => {
    for (const silence of ['Conversational', 'Breath-heavy'] as const) {
      const rhythmControls = strictStraightSixteenth(silence)
      const phraseOne = succeed(lockTestIntent({ tension: 'Build', seed: 1, rhythmControls }))
      const bars = lockedBarsOf(phraseOne.provenance.rhythm)
      for (const seed of DRAWN.slice(0, 3)) {
        const rhythmLock = lockWith(bars, RHYTHM_CHANGE_KINDS)
        const { provenance } = succeed(
          lockTestIntent({ tension: 'Build', seed, rhythmLock, rhythmControls }),
        )
        expect(provenance.rhythmChange).toBe('no_change_available')
        expect(provenance.rhythmLockOutcome).toBe('locked_bars')
        expect(rhythmBarKey(provenance.rhythm.bars)).toBe(rhythmBarKey(written(bars)))
      }
    }
  })

  it('makes only Add or remove a rest under Sparse silence', () => {
    const rhythmControls = strictStraightSixteenth('Sparse')
    const phraseOne = succeed(lockTestIntent({ tension: 'Lift', seed: 1, rhythmControls }))
    const bars = lockedBarsOf(phraseOne.provenance.rhythm)
    let changed = 0
    for (const seed of DRAWN) {
      const rhythmLock = lockWith(bars, RHYTHM_CHANGE_KINDS)
      const { provenance } = succeed(
        lockTestIntent({ tension: 'Lift', seed, rhythmLock, rhythmControls }),
      )
      if (provenance.rhythmLockOutcome !== 'rhythm_change') continue
      expect(provenance.rhythmChange).toBe('note_rest')
      expect(rhythmChangeBetween(written(bars), provenance.rhythm.bars)?.kind).toBe('note_rest')
      changed += 1
    }
    expect(changed).toBeGreaterThan(0)
  })
})
