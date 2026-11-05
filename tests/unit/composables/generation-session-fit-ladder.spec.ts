// @vitest-environment node
/**
 * The Idle fit run over a ladder of attempts (Jam mode's phrase 1 from a kept doodle): a
 * generation failure moves on to the ladder's next attempt, with no deadline, and the last one's
 * shows the generation error; a too-wide attempt is replaced on the same attempt with a fresh
 * intent, until the four-attempt fit budget is spent, then the too-many-notes notice; the session
 * seed is drawn once, at publish; each run climbs the ladder afresh; a stopped run's late
 * continuations do nothing.
 */
import { describe, expect, it } from 'vitest'
import { shallowReactive } from 'vue'

import { createFitRunner, type FitRunClimb } from '@/composables/generation-session-fit-round'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { FITS, ROOM, TOO_WIDE, createFakeStaffFit } from './fake-staff-fit'
import { createDeferred, flushAsync } from './fit-session-harness'

/** The ladder's attempts, as the rungs they stand for, the last one leaving none. */
const RUNGS = ['first', 'second', 'last'] as const

/** One intent built for an attempt: its rung, and the intent with its seed. */
interface BuiltIntent {
  readonly rung: (typeof RUNGS)[number]
  readonly intent: GenerationIntent
}

/** Intent: a fit runner over a three-attempt ladder and fakes, every seam call logged. */
function ladderRun(options: { readonly failing?: (rung: string) => boolean } = {}) {
  const state = shallowReactive<IdlePhraseState<GenerationIntent>>({
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: false,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const staff = createFakeStaffFit<GenerationIntent>()
  const built: BuiltIntent[] = []
  const failures: string[] = []
  const sessionSeeds: Seed[] = []
  const climbs = { count: 0 }
  const counts = { seed: 0 }
  const pending: { generate: ReturnType<typeof createDeferred<GenerationIntent>> | null } = {
    generate: null,
  }

  /** Intent: one climb from the ladder's first attempt. */
  function climb(): FitRunClimb {
    climbs.count += 1
    let at = 0
    return {
      intent: () => {
        const intent = createGenerationIntent({
          requestId: makeRequestId(`ladder-${counts.seed + 1}`),
          seed: makeSeed(++counts.seed),
          controls: DEFAULT_GENERATION_CONTROLS,
          figureLevels: NEUTRAL_FIGURE_LEVELS,
        })
        built.push({ rung: RUNGS[at]!, intent })
        return intent
      },
      failed: (error) => {
        failures.push(`${RUNGS[at]}:${error.message}`)
        if (at === RUNGS.length - 1) return false
        at += 1
        return true
      },
    }
  }

  const runner = createFitRunner<GenerationIntent>({
    state,
    generate: (intent) => {
      const rung = built.at(-1)!.rung
      if (pending.generate !== null) return pending.generate.promise
      if (options.failing?.(rung) === true) return Promise.reject(new Error(`no ${rung}`))
      return Promise.resolve(intent)
    },
    checkFit: staff.checkFit,
    nextSessionSeed: () => {
      const seed = makeSeed(900 + sessionSeeds.length)
      sessionSeeds.push(seed)
      return seed
    },
    withSessionSeed: (generated) => generated,
    notate: () => Promise.resolve(),
    clearPresentedPhrase: () => undefined,
    ladder: { climb },
    isBlocked: () => false,
    checkRoom: () => Promise.resolve(ROOM),
    showEmpty: () => undefined,
    onPublished: () => undefined,
  })
  return { state, staff, built, failures, sessionSeeds, climbs, runner, pending }
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
// @test-link [[module_idle_fit_round]]
describe('the Idle fit run over a ladder of attempts', () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('moves on to the next attempt on a generation failure, and draws the first that fits', async () => {
    const run = ladderRun({ failing: (rung) => rung === 'first' })

    await expect(run.runner.run('keep_screen')).resolves.toBe(true)

    expect(run.built.map(({ rung }) => rung)).toEqual(['first', 'second'])
    expect(run.failures).toEqual(['first:no first'])
    expect(run.state.result).toBe(run.built[1]!.intent)
    expect(run.state.generationError).toBeNull()
    expect(run.state.operation).toBe('idle')
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("shows the last attempt's generation error once every attempt failed", async () => {
    const run = ladderRun({ failing: () => true })

    await expect(run.runner.run('keep_screen')).resolves.toBe(false)

    expect(run.built.map(({ rung }) => rung)).toEqual(['first', 'second', 'last'])
    expect(run.state.generationError?.message).toBe('no last')
    expect(run.state.result).toBeNull()
    expect(run.sessionSeeds).toEqual([])
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('climbs from the first attempt again at the next run (Retry generation)', async () => {
    const run = ladderRun({ failing: () => true })
    await run.runner.run('keep_screen')

    await run.runner.run('keep_screen')

    expect(run.climbs.count).toBe(2)
    expect(run.built.map(({ rung }) => rung)).toEqual([
      ...['first', 'second', 'last'],
      ...['first', 'second', 'last'],
    ])
  })

  // @test-link [[rule_idle_phrase_too_dense_is_replaced]]
  it('replaces a too-wide attempt on the same attempt with a fresh intent', async () => {
    const run = ladderRun()
    run.staff.queueFit(TOO_WIDE, TOO_WIDE, FITS)

    await expect(run.runner.run('keep_screen')).resolves.toBe(true)

    expect(run.built.map(({ rung }) => rung)).toEqual(['first', 'first', 'first'])
    expect(new Set(run.built.map(({ intent }) => intent.seed)).size).toBe(3)
    expect(run.state.result).toBe(run.built[2]!.intent)
  })

  // @test-link [[rule_idle_phrase_too_dense_is_replaced]]
  // @test-link [[rule_staff_needs_room_notice]]
  it('shows the too-many-notes notice once four attempts were too wide, failures not counted', async () => {
    const run = ladderRun({ failing: (rung) => rung === 'first' })
    run.staff.setFallbackFit(TOO_WIDE)

    await expect(run.runner.run('keep_screen')).resolves.toBe(false)

    expect(run.built.map(({ rung }) => rung)).toEqual([
      'first',
      'second',
      'second',
      'second',
      'second',
    ])
    expect(run.state.roomNotice).toBe('notes_too_wide')
    expect(run.state.roomNoticeAnnouncements).toBe(1)
    expect(run.state.generationError).toBeNull()
  })

  // @test-link [[module_session_seed_plan]]
  it('draws the session seed once, as the run publishes, however many attempts ran', async () => {
    const run = ladderRun({ failing: (rung) => rung === 'first' })
    run.staff.queueFit(TOO_WIDE, FITS)

    await run.runner.run('keep_screen')

    expect(run.sessionSeeds).toEqual([makeSeed(900)])
  })

  // @test-link [[module_idle_fit_round]]
  it('stops a run at once: its late generation does nothing, the operation idle', async () => {
    const run = ladderRun()
    run.pending.generate = createDeferred<GenerationIntent>()
    const running = run.runner.run('keep_screen')
    expect(run.state.operation).toBe('generating')

    run.runner.stop()
    expect(run.state.operation).toBe('idle')
    run.pending.generate.resolve(run.built[0]!.intent)
    await flushAsync()

    await expect(running).resolves.toBe(false)
    expect(run.state.result).toBeNull()
    expect(run.staff.fitChecks).toEqual([])
  })
})
