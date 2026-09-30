/**
 * The Idle fit run: every generation is checked against the staff's room before anything is
 * drawn, a too-wide attempt is replaced by a fresh-seed retry (at most four attempts in one
 * Loading), and the run ends in a drawn phrase, the room notice, the generation-failure banner, or
 * no phrase when a width crossing blocks the rhythm combination.
 */
import { describe, expect, it } from 'vitest'

import type { SessionOperation } from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { NotationError } from '@/notation/notation-error'
import { FIT_NO_ROOM, FITS, TOO_WIDE } from './fake-staff-fit'
import { createDeferred, createFitSession, flushAsync } from './fit-session-harness'

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED = {
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
} as const

/** Intent: a staff-layout failure as the engraver raises it while drawing. */
function layoutFailure(code: 'notation_no_room' | 'notation_notes_too_wide'): NotationError {
  return new NotationError(code, `layout failure ${code}`, {})
}

// @test-link [[module_idle_fit_round]]
// @test-link [[rule_idle_phrase_too_dense_is_replaced]]
describe('idle fit run: attempts and how a run ends', () => {
  it('draws the first fitting retry with its own seed, checking each attempt before any drawing', async () => {
    const { session, staff, log, counts, notated } = createFitSession()
    staff.queueFit(TOO_WIDE, FITS)

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(log).toEqual(['generate:1', 'check:1', 'generate:2', 'check:2', 'notate:2'])
    expect(counts).toEqual({ id: 2, seed: 2 })
    expect(notated.map((result) => result.seed)).toEqual([2])
    expect(session.state.result?.seed).toBe(2)
    expect(session.state.resultEngraved).toBe(true)
    expect(session.state.roomNotice).toBeNull()
    expect(session.state.retriesRunning).toBe(false)
    expect(session.state.operation).toBe('idle')
  })

  it('stays one generating operation across attempts and checks, notating only for the final draw', async () => {
    const seen: { readonly operation: SessionOperation; readonly retries: boolean }[] = []
    const built = createFitSession({
      checkFit: () => {
        seen.push({
          operation: built.session.state.operation,
          retries: built.session.state.retriesRunning,
        })
        return undefined
      },
      notate: () => {
        seen.push({
          operation: built.session.state.operation,
          retries: built.session.state.retriesRunning,
        })
        return undefined
      },
    })
    built.staff.queueFit(TOO_WIDE, FITS)

    await built.session.actions.generate()

    expect(seen).toEqual([
      { operation: 'generating', retries: false },
      { operation: 'generating', retries: true },
      { operation: 'notating', retries: true },
    ])
  })

  it('ends on the too-many-notes notice after four too-wide attempts, drawing none of them', async () => {
    const { session, staff, log, counts, notated } = createFitSession()
    staff.setFallbackFit(TOO_WIDE)

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(counts).toEqual({ id: 4, seed: 4 })
    expect(notated).toEqual([])
    expect(log.at(-1)).toBe('clear')
    expect(session.state.roomNotice).toBe('notes_too_wide')
    expect(session.state.roomNoticeAnnouncements).toBe(1)
    expect(session.state.result).toBeNull()
    expect(session.state.retriesRunning).toBe(false)
    expect(session.state.operation).toBe('idle')
  })

  // @test-link [[rule_staff_needs_room_notice]]
  it('ends on the no-room notice after one attempt, with no retries', async () => {
    const { session, staff, counts, notated } = createFitSession()
    staff.queueFit(FIT_NO_ROOM)

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(counts).toEqual({ id: 1, seed: 1 })
    expect(notated).toEqual([])
    expect(session.state.roomNotice).toBe('no_room')
    expect(session.state.roomNoticeAnnouncements).toBe(1)
    expect(session.state.notationError).toBeNull()
    expect(session.state.result).toBeNull()
  })

  it('counts a draw that fails with notes too wide as a failed attempt and retries', async () => {
    let draws = 0
    const { session, log, notated } = createFitSession({
      notate: () => {
        draws += 1
        return draws === 1 ? Promise.reject(layoutFailure('notation_notes_too_wide')) : undefined
      },
    })

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(log).toEqual([
      'generate:1',
      'check:1',
      'notate:1',
      'clear',
      'generate:2',
      'check:2',
      'notate:2',
    ])
    expect(notated.map((result) => result.seed)).toEqual([1, 2])
    expect(session.state.result?.seed).toBe(2)
    expect(session.state.notationError).toBeNull()
  })

  it('ends on the no-room notice when a draw fails with no room', async () => {
    const { session, counts } = createFitSession({
      notate: () => Promise.reject(layoutFailure('notation_no_room')),
    })

    await expect(session.actions.generate()).resolves.toBe(false)

    expect(counts.seed).toBe(1)
    expect(session.state.roomNotice).toBe('no_room')
    expect(session.state.notationError).toBeNull()
    expect(session.state.result).toBeNull()
  })

  it('keeps the retryable notation error for any other draw failure', async () => {
    const failure = new NotationError('notation_font_unavailable', 'font missing', {})
    const { session } = createFitSession({ notate: () => Promise.reject(failure) })

    await expect(session.actions.generate()).resolves.toBe(true)

    expect(session.state.notationError).toBe(failure)
    expect(session.state.result?.seed).toBe(1)
    expect(session.state.resultEngraved).toBe(false)
    expect(session.state.roomNotice).toBeNull()
  })

  it('keeps a notation error raised by the fit check as retryable, with that attempt as the result', async () => {
    const failure = new NotationError('notation_font_unavailable', 'font missing', {})
    const { session, notated } = createFitSession({ checkFit: () => Promise.reject(failure) })

    await session.actions.generate()

    expect(session.state.notationError).toBe(failure)
    expect(session.state.result?.seed).toBe(1)
    expect(notated).toEqual([])
    expect(session.state.operation).toBe('idle')
  })
})

// @test-link [[module_idle_fit_round]]
// @test-link [[rule_retry_round_window_changes]]
describe('idle fit run: the window during a run', () => {
  it('generates each attempt with the density the width gives then (Sixteenth to Eighth below)', async () => {
    let calls = 0
    const built = createFitSession({
      generate: () => {
        calls += 1
        if (calls === 1) built.viewport.cross(true)
        return undefined
      },
    })
    built.session.actions.setControl('noteDensity', 'Sixteenth')
    built.staff.queueFit(TOO_WIDE, FITS)

    await built.session.actions.generate()

    expect(built.generated.map((intent) => intent.controls.noteDensity)).toEqual([
      'Sixteenth',
      'Eighth',
    ])
    expect(built.session.state.result?.seed).toBe(2)
  })

  it('starts and queues nothing when the staff widens during a round', async () => {
    const pending = createDeferred<GenerationIntent>()
    let calls = 0
    const built = createFitSession({
      generate: (intent) => {
        calls += 1
        return calls === 5 ? pending.promise.then(() => intent) : undefined
      },
    })
    built.staff.setFallbackFit(TOO_WIDE)
    built.staff.report(500)
    await built.session.actions.generate()
    expect(built.counts.seed).toBe(4)

    built.staff.report(600)
    await flushAsync()
    expect(built.session.state.operation).toBe('generating')
    built.staff.report(700)
    built.staff.report(800)
    pending.resolve(built.generated[4]!)
    await flushAsync()

    expect(built.counts.seed).toBe(8)
    expect(built.session.state.operation).toBe('idle')
    expect(built.session.state.roomNotice).toBe('notes_too_wide')
  })

  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('keeps the phrase on screen when a crossing blocks the combination during the first attempt, and draws that attempt if it fits', async () => {
    const built = heldSession(2)
    await built.session.actions.generate()
    const running = built.session.actions.regenerate()
    expect(built.session.state.operation).toBe('generating')

    built.viewport.cross(false)

    expect(built.session.state.operation).toBe('generating')
    expect(built.session.state.result?.seed).toBe(1)
    expect(built.log).not.toContain('clear')
    built.pending.resolve(built.generated[1]!)
    await expect(running).resolves.toBe(true)
    expect(built.log.slice(-2)).toEqual(['check:2', 'notate:2'])
    expect(built.session.state.result?.seed).toBe(2)
    expect(built.session.state.resultEngraved).toBe(true)
    expect(built.session.state.operation).toBe('idle')
    // The combination is blocked now: the phrase stays, and nothing new may start.
    await expect(built.session.actions.generate()).resolves.toBe(false)
    expect(built.counts.seed).toBe(2)
  })

  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('stops at once, to no phrase, when a crossing blocks the combination during a retry, discarding the late response', async () => {
    const built = heldSession(3)
    await built.session.actions.generate()
    built.staff.queueFit(TOO_WIDE)
    const running = built.session.actions.regenerate()
    await flushAsync()
    expect(built.log.at(-1)).toBe('generate:3')

    built.viewport.cross(false)

    expectStoppedToEmpty(built)
    built.pending.resolve(built.generated[2]!)
    await expect(running).resolves.toBe(false)
    await flushAsync()
    expect(built.log).not.toContain('check:3')
    expect(built.notated.map((result) => result.seed)).toEqual([1])
    expect(built.session.state.result).toBeNull()
  })

  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('stops at once a run that shows no score when a crossing blocks the combination', async () => {
    const built = heldSession(1)
    const running = built.session.actions.generate()

    built.viewport.cross(false)

    expectStoppedToEmpty(built)
    built.pending.resolve(built.generated[0]!)
    await expect(running).resolves.toBe(false)
    await flushAsync()
    expect(built.log).toEqual(['generate:1', 'clear'])
    expect(built.session.state.result).toBeNull()
  })

  // @test-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  it('shows no phrase instead of the notice when the last attempt fails too wide once blocked', async () => {
    const built = createFitSession({
      belowTabletLandscape: true,
      notate: () => {
        built.viewport.cross(false)
        return Promise.reject(layoutFailure('notation_notes_too_wide'))
      },
    })
    useSixteenthOnlyBlocked(built)
    built.staff.queueFit(TOO_WIDE, TOO_WIDE, TOO_WIDE, FITS)

    await expect(built.session.actions.generate()).resolves.toBe(false)

    expect(built.counts.seed).toBe(4)
    expect(built.session.state.roomNotice).toBeNull()
    expect(built.session.state.roomNoticeAnnouncements).toBe(0)
    expect(built.session.state.result).toBeNull()
    expect(built.session.state.retriesRunning).toBe(false)
    expect(built.session.state.operation).toBe('idle')
  })
})

type FitSession = ReturnType<typeof createFitSession>

/** Intent: apply the combination that blocks generation from `bp-tablet-landscape` up. */
function useSixteenthOnlyBlocked(built: FitSession): void {
  for (const [key, value] of Object.entries(SIXTEENTH_ONLY_BLOCKED)) {
    built.session.actions.setControl(key as keyof typeof SIXTEENTH_ONLY_BLOCKED, value)
  }
}

/**
 * Intent: a session below `bp-tablet-landscape` under the combination blocked from it up, whose
 * generate call number `heldCall` waits for the test to resolve `pending`.
 */
function heldSession(heldCall: number) {
  const pending = createDeferred<GenerationIntent>()
  let calls = 0
  const built = createFitSession({
    belowTabletLandscape: true,
    generate: () => {
      calls += 1
      return calls === heldCall ? pending.promise : undefined
    },
  })
  useSixteenthOnlyBlocked(built)
  return { ...built, pending }
}

/** Intent: assert a run stopped at once to Empty: no phrase, no notice, no banner, idle. */
function expectStoppedToEmpty(built: FitSession): void {
  expect(built.session.state.operation).toBe('idle')
  expect(built.session.state.retriesRunning).toBe(false)
  expect(built.session.state.result).toBeNull()
  expect(built.session.state.roomNotice).toBeNull()
  expect(built.session.state.generationError).toBeNull()
  expect(built.log.at(-1)).toBe('clear')
}

// @test-link [[module_idle_fit_round]]
describe('idle fit run: a generation failure ends the run', () => {
  it('keeps the phrase on screen, untouched, when a retry finds no phrase', async () => {
    let calls = 0
    const { session, staff, log, notated } = createFitSession({
      generate: () => {
        calls += 1
        return calls === 3 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })
    await session.actions.generate()
    staff.queueFit(TOO_WIDE)

    await expect(session.actions.regenerate()).resolves.toBe(false)

    expect(session.state.generationError?.message).toBe('no phrase')
    expect(session.state.result?.seed).toBe(1)
    expect(notated.map((result) => result.seed)).toEqual([1])
    expect(log).not.toContain('clear')
    expect(session.state.roomNotice).toBeNull()
    expect(session.state.retriesRunning).toBe(false)
  })

  it('leaves no phrase when the run started with no score shown', async () => {
    let calls = 0
    const { session, log } = createFitSession({
      generate: () => {
        calls += 1
        return calls === 2 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })
    await session.actions.generate()

    expect(session.actions.reportNotationFailure(layoutFailure('notation_notes_too_wide'))).toBe(
      true,
    )
    await flushAsync()

    expect(log.slice(-2)).toEqual(['clear', 'generate:2'])
    expect(session.state.result).toBeNull()
    expect(session.state.generationError?.message).toBe('no phrase')
    expect(session.state.operation).toBe('idle')
  })

  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('keeps the notice under the banner when a round finds no phrase', async () => {
    let calls = 0
    const { session, staff } = createFitSession({
      generate: () => {
        calls += 1
        return calls === 5 ? Promise.reject(new Error('no phrase')) : undefined
      },
    })
    staff.setFallbackFit(TOO_WIDE)
    await session.actions.generate()

    await expect(session.actions.regenerate()).resolves.toBe(false)

    expect(session.state.roomNotice).toBe('notes_too_wide')
    expect(session.state.generationError?.message).toBe('no phrase')
    expect(session.state.result).toBeNull()
    expect(session.state.roomNoticeAnnouncements).toBe(1)
  })
})
