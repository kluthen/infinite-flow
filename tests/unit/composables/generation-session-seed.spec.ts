/**
 * The session seed at Idle: the Idle generation session draws one session seed from its own
 * provider each time a fit run publishes a phrase 1, however many attempts the run took, and the
 * published result carries it. A run that publishes nothing draws none; Regenerate and the fresh
 * phrase after a session end come with a newly drawn one; showing the same phrase 1 again keeps
 * it; and phrase seeds still come from the phrase seed provider exactly as before.
 */
import { describe, expect, it } from 'vitest'

import { createGenerationSession } from '@/composables/use-generation-session'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { NotationError } from '@/notation/notation-error'
import { createFakeStaffFit, TOO_WIDE } from './fake-staff-fit'
import { createFakeViewportWidth } from './fake-viewport-width'
import { createFitSession } from './fit-session-harness'

/** A published phrase as the seeded session below keeps it: its intent and its session seed. */
interface SeededIntent {
  readonly intent: GenerationIntent
  readonly sessionSeed: Seed
}

/** Intent: a staff-layout failure as the engraver raises it while drawing. */
function layoutFailure(code: 'notation_no_room' | 'notation_notes_too_wide'): NotationError {
  return new NotationError(code, `layout failure ${code}`, {})
}

/**
 * Intent: an Idle session whose published result carries its session seed, drawn from a counter
 * starting at 900, with phrase seeds from a counter starting at 1; `generate` echoes the intent
 * unless `failGenerate` is set, and `notate` fails while `failNotate` holds an error.
 */
function seededSession() {
  const staff = createFakeStaffFit<GenerationIntent>()
  const drawn: Seed[] = []
  const controls = { failGenerate: false, failNotate: null as Error | null }
  let phraseSeed = 0
  let requestId = 0
  const session = createGenerationSession<SeededIntent, GenerationIntent>({
    providers: {
      nextRequestId: () => makeRequestId(`seeded-${++requestId}`),
      nextSeed: () => makeSeed(++phraseSeed),
    },
    nextSessionSeed: () => {
      const seed = makeSeed(900 + drawn.length)
      drawn.push(seed)
      return seed
    },
    withSessionSeed: (intent, sessionSeed) => ({ intent, sessionSeed }),
    viewport: createFakeViewportWidth(),
    generate: (intent) =>
      controls.failGenerate ? Promise.reject(new Error('no phrase')) : Promise.resolve(intent),
    checkFit: staff.checkFit,
    checkRoom: staff.checkRoom,
    staffLayout: staff.staffLayout,
    notate: () =>
      controls.failNotate === null ? Promise.resolve() : Promise.reject(controls.failNotate),
    clearPresentedPhrase: () => undefined,
  })
  return { session, staff, drawn, controls }
}

// @test-link [[module_session_seed_plan]]
describe('the session seed drawn at Idle', () => {
  // @test-link [[module_session_seed_plan]]
  it('draws one session seed for a phrase 1 published after too-wide attempts', async () => {
    const built = createFitSession()
    built.staff.queueFit(TOO_WIDE, TOO_WIDE)

    await expect(built.session.actions.generate()).resolves.toBe(true)

    expect(built.sessionSeeds).toHaveLength(1)
    expect(built.seeded).toEqual([
      { result: built.generated[2], sessionSeed: built.sessionSeeds[0] },
    ])
    expect(built.generated.map((intent) => intent.seed)).toEqual([1, 2, 3])
    expect(built.counts).toEqual({ id: 3, seed: 3 })
  })

  // @test-link [[module_session_seed_plan]]
  it('draws none when a fit run publishes no phrase', async () => {
    const built = createFitSession({ generate: () => Promise.reject(new Error('no phrase')) })
    await expect(built.session.actions.generate()).resolves.toBe(false)
    const tooWide = createFitSession()
    tooWide.staff.setFallbackFit(TOO_WIDE)
    await expect(tooWide.session.actions.generate()).resolves.toBe(false)

    expect(built.sessionSeeds).toEqual([])
    expect(tooWide.sessionSeeds).toEqual([])
    expect(tooWide.counts).toEqual({ id: 4, seed: 4 })
  })

  // @test-link [[module_session_seed_plan]]
  it('draws one session seed for a phrase kept after its fit check itself failed', async () => {
    const failure = new NotationError('notation_font_unavailable', 'no font', {})
    const built = createFitSession({ checkFit: () => Promise.reject(failure) })

    await expect(built.session.actions.generate()).resolves.toBe(true)

    expect(built.session.state.notationError).toBe(failure)
    expect(built.seeded).toEqual([
      { result: built.generated[0], sessionSeed: built.sessionSeeds[0] },
    ])
  })

  // @test-link [[module_session_seed_plan]]
  it('keeps one session seed when an attempt is found too wide only while it is drawn', async () => {
    let notates = 0
    const built = createFitSession({
      notate: () =>
        ++notates === 1 ? Promise.reject(layoutFailure('notation_notes_too_wide')) : undefined,
    })

    await expect(built.session.actions.generate()).resolves.toBe(true)

    expect(built.sessionSeeds).toHaveLength(1)
    expect(built.seeded.at(-1)).toEqual({
      result: built.generated[1],
      sessionSeed: built.sessionSeeds[0],
    })
  })

  // @test-link [[module_session_seed_plan]]
  it('publishes a phrase whose drawing failed with a session seed, and shows it again with the same one', async () => {
    const built = seededSession()
    built.controls.failNotate = new NotationError('notation_engraving_failed', 'draw failed', {})
    await expect(built.session.actions.generate()).resolves.toBe(true)
    const published = built.session.state.result
    expect(built.session.state.notationError).not.toBeNull()
    expect(published?.sessionSeed).toBe(900)

    built.controls.failNotate = null
    await expect(built.session.actions.retryNotation()).resolves.toBe(true)

    expect(built.session.state.result).toBe(published)
    expect(built.drawn).toEqual([900])
  })

  // @test-link [[module_session_seed_plan]]
  it('publishes each new phrase 1 with a newly drawn session seed, Regenerate and a fresh phrase included', async () => {
    const built = seededSession()
    await built.session.actions.generate()
    const first = built.session.state.result
    await built.session.actions.regenerate()
    const second = built.session.state.result
    await built.session.actions.startFreshPhrase()
    const third = built.session.state.result

    expect([first, second, third].map((result) => result?.sessionSeed)).toEqual([900, 901, 902])
    expect([first, second, third].map((result) => result?.intent.seed)).toEqual([1, 2, 3])
    expect(built.drawn).toEqual([900, 901, 902])
  })

  // @test-link [[module_session_seed_plan]]
  it('keeps the shown phrase 1 and its session seed when a regeneration publishes nothing', async () => {
    const built = seededSession()
    await built.session.actions.generate()
    const shown = built.session.state.result

    built.controls.failGenerate = true
    await expect(built.session.actions.regenerate()).resolves.toBe(false)

    expect(built.session.state.result).toBe(shown)
    expect(shown?.sessionSeed).toBe(900)
    expect(built.drawn).toEqual([900])
  })
})
