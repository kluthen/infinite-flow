/**
 * The session engine's start without phrase 1: it requests nothing on its own and stays in its
 * count-in phase until phrase 1 sounds; it runs each phrase 1 attempt its caller asks for as any
 * attempt and reports the result back; phrase 1 handed over with the time it sounds is decided
 * and phrase 2 requested at once, due at the start of phrase 1's last measure; every end before
 * phrase 1 sounds is a count-in end, and a lost controller ends it at once.
 */

import { describe, expect, it } from 'vitest'

import { createSessionEngine } from '@/session/session-engine'
import { measureSeconds } from '@/session/session-timing'
import type {
  SessionEndCause,
  SessionEngine,
  SessionOutput,
  SessionSettings,
  SessionStartWithoutPhraseOne,
} from '@/session/session-types'
import { SETTINGS_MUTATION_OFF } from '@/session/settings-mutation'
import {
  DEFAULT_SESSION_SEED,
  failureOutcome,
  fakeDisplay,
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  successFor,
} from './session-harness'

const START_AT = 2
const TEMPO = 120
const SETTINGS: SessionSettings = sessionSettings({ tempo: TEMPO })
const PHRASE_ONE = phraseOneFor(SETTINGS)

/** Intent: a start without phrase 1 at START_AT with the test settings. */
function startWithoutPhraseOne(): SessionStartWithoutPhraseOne {
  return {
    at: START_AT,
    settings: SETTINGS,
    sessionSeed: DEFAULT_SESSION_SEED,
    mutation: SETTINGS_MUTATION_OFF,
    adaptiveTempo: false,
    multiPhraseTensionArc: false,
  }
}

/** Intent: an engine started without phrase 1, with fresh seams. */
function engineWithoutPhraseOne(): SessionEngine {
  return createSessionEngine(
    { providers: queuedProviders(), viewport: fakeViewport(false), display: fakeDisplay() },
    startWithoutPhraseOne(),
  )
}

/** Intent: ask the engine for one phrase 1 attempt at `at`, with the test phrase 1's intent. */
function askAttempt(
  engine: SessionEngine,
  at: number,
  step: 'carry-in' | 'standalone' = 'carry-in',
): readonly SessionOutput[] {
  return engine.handle({
    kind: 'phrase-one-attempt',
    at,
    step,
    retry: 0,
    intent: PHRASE_ONE.intent,
    settings: SETTINGS,
    deadline: at + 6,
  })
}

/** Intent: run attempt `attemptId` to a phrase that fits, at `at`. */
function fitAttempt(engine: SessionEngine, attemptId: number, at: number): void {
  const outcome = successFor(PHRASE_ONE.intent)
  engine.handle({ kind: 'generation-result', at, attemptId, outcome })
  engine.handle({ kind: 'fit-result', at, attemptId, fits: true })
}

/** Intent: the count-in end output a session ended at `at` for `cause` before phrase 1 gives. */
function countInEnd(at: number, cause: SessionEndCause): SessionOutput {
  return { kind: 'ended', at, cause, phase: 'count-in', soundedPhraseCount: 0 }
}

// @test-link [[module_session_start_without_phrase_one]]
describe('a session started without phrase 1, before phrase 1', () => {
  // @test-link [[module_session_start_without_phrase_one]]
  // @test-link [[rule_jam_no_backing_before_phrase_one]]
  it('records no phrase 1 and requests nothing at Start, nor on its own afterwards', () => {
    const engine = engineWithoutPhraseOne()
    expect(engine.outputsAtStart).toEqual([])
    expect(engine.handle({ kind: 'tick', at: START_AT + 4 })).toEqual([])
    expect(engine.handle({ kind: 'tick', at: START_AT + 40 })).toEqual([])
    expect(engine.handle({ kind: 'controller', at: START_AT + 41, attached: true })).toEqual([])
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  // @test-link [[rule_jam_without_doodle_note_ends]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it.each<SessionEndCause>([
    'stop',
    'hidden-tab',
    'staff-not-shown',
    'no-note-played',
    'no-phrase-one',
  ])('ends as a count-in end with its cause: %s', (cause) => {
    const engine = engineWithoutPhraseOne()
    expect(engine.handle({ kind: 'end', at: START_AT + 3, cause })).toEqual([
      countInEnd(START_AT + 3, cause),
    ])
    expect(engine.handle({ kind: 'tick', at: START_AT + 4 })).toEqual([])
  })

  // @test-link [[rule_jam_controller_loss_before_phrase_one]]
  it('ends at once as a count-in end when the controller is lost, with no reconnection window', () => {
    const engine = engineWithoutPhraseOne()
    expect(engine.handle({ kind: 'controller', at: START_AT + 5, attached: false })).toEqual([
      countInEnd(START_AT + 5, 'controller-lost'),
    ])
    expect(engine.handle({ kind: 'controller', at: START_AT + 6, attached: true })).toEqual([])
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  it('cancels the attempt still generating when it ends', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    expect(engine.handle({ kind: 'end', at: START_AT + 3.5, cause: 'stop' })).toEqual([
      { kind: 'cancel-generation', attemptId: 1 },
      countInEnd(START_AT + 3.5, 'stop'),
    ])
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it.each(['count-in-over', 'settings-change'] as const)(
    'refuses "%s" before phrase 1 is handed over',
    (kind) => {
      const engine = engineWithoutPhraseOne()
      const event =
        kind === 'count-in-over'
          ? ({ kind, at: START_AT + 2 } as const)
          : ({ kind, at: START_AT + 2, settings: SETTINGS } as const)
      expect(() => engine.handle(event)).toThrow(/before phrase 1 is handed over/)
    },
  )
})

// @test-link [[module_session_start_without_phrase_one]]
describe("phrase 1's attempts, asked for by the caller", () => {
  // @test-link [[module_session_start_without_phrase_one]]
  it('issues each attempt with its own id, the intent, step and retry the caller gives', () => {
    const engine = engineWithoutPhraseOne()
    expect(askAttempt(engine, START_AT + 3, 'standalone')).toEqual([
      {
        kind: 'request-generation',
        attemptId: 1,
        phraseNumber: 1,
        step: 'standalone',
        retry: 0,
        intent: PHRASE_ONE.intent,
        deadline: START_AT + 9,
      },
    ])
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it('checks the fit of a generated phrase 1 and reports that it fits', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    const outcome = successFor(PHRASE_ONE.intent)
    expect(
      engine.handle({ kind: 'generation-result', at: START_AT + 3.2, attemptId: 1, outcome }),
    ).toEqual([
      { kind: 'check-fit', attemptId: 1, phraseNumber: 1, outcome, intent: PHRASE_ONE.intent },
    ])
    expect(
      engine.handle({ kind: 'fit-result', at: START_AT + 3.3, attemptId: 1, fits: true }),
    ).toEqual([{ kind: 'phrase-one-attempt-result', attemptId: 1, result: { kind: 'fits' } }])
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it('reports a generation failure, a rejected request and a misfit, and climbs no ladder', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    expect(
      engine.handle({
        kind: 'generation-result',
        at: START_AT + 3.1,
        attemptId: 1,
        outcome: failureOutcome('search_limit_exceeded'),
      }),
    ).toEqual([
      {
        kind: 'phrase-one-attempt-result',
        attemptId: 1,
        result: { kind: 'generation-failure', code: 'search_limit_exceeded' },
      },
    ])
    askAttempt(engine, START_AT + 3.2)
    expect(engine.handle({ kind: 'generation-crashed', at: START_AT + 3.3, attemptId: 2 })).toEqual(
      [{ kind: 'phrase-one-attempt-result', attemptId: 2, result: { kind: 'crash' } }],
    )
    askAttempt(engine, START_AT + 3.4)
    const outcome = successFor(PHRASE_ONE.intent)
    engine.handle({ kind: 'generation-result', at: START_AT + 3.5, attemptId: 3, outcome })
    expect(
      engine.handle({ kind: 'fit-result', at: START_AT + 3.6, attemptId: 3, fits: false }),
    ).toEqual([
      { kind: 'phrase-one-attempt-result', attemptId: 3, result: { kind: 'not-fitting' } },
    ])
    expect(engine.handle({ kind: 'tick', at: START_AT + 20 })).toEqual([])
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the attempt in flight when a newer one is asked for, and ignores its late result', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    const asked = askAttempt(engine, START_AT + 3.5)
    expect(asked.map((output) => output.kind)).toEqual(['cancel-generation', 'request-generation'])
    expect(asked[0]).toEqual({ kind: 'cancel-generation', attemptId: 1 })
    const outcome = successFor(PHRASE_ONE.intent)
    expect(
      engine.handle({ kind: 'generation-result', at: START_AT + 3.6, attemptId: 1, outcome }),
    ).toEqual([])
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it('refuses to hand over an attempt that has not fitted', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    expect(() =>
      engine.handle({ kind: 'phrase-one', at: START_AT + 3.2, attemptId: 1, soundsAt: 12 }),
    ).toThrow(/not a phrase 1 that fits/)
  })
})

// @test-link [[module_session_start_without_phrase_one]]
describe('phrase 1 handed over', () => {
  const HANDED_AT = START_AT + 4
  const SOUNDS_AT = START_AT + 6 * measureSeconds(TEMPO)

  /** Intent: an engine whose phrase 1 attempt (a `step` one) fitted and is handed over now. */
  function handed(step: 'carry-in' | 'standalone' = 'carry-in'): {
    readonly engine: SessionEngine
    readonly outputs: readonly SessionOutput[]
  } {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3, step)
    fitAttempt(engine, 1, START_AT + 3.5)
    const outputs = engine.handle({
      kind: 'phrase-one',
      at: HANDED_AT,
      attemptId: 1,
      soundsAt: SOUNDS_AT,
    })
    return { engine, outputs }
  }

  // @test-link [[module_session_start_without_phrase_one]]
  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it.each(['carry-in', 'standalone'] as const)(
    "decides phrase 1 with its attempt's origin (%s) and requests phrase 2 due at the start of its last measure",
    (step) => {
      const { outputs } = handed(step)
      expect(outputs[0]).toEqual({
        kind: 'phrase-ready',
        phrase: {
          phraseNumber: 1,
          origin: step,
          intent: PHRASE_ONE.intent,
          outcome: successFor(PHRASE_ONE.intent),
        },
      })
      const request = outputs.find((output) => output.kind === 'request-generation')
      expect(request).toMatchObject({
        attemptId: 2,
        phraseNumber: 2,
        step: 'carry-in',
        retry: 0,
        deadline: SOUNDS_AT + 3 * measureSeconds(TEMPO),
      })
    },
  )

  // @test-link [[rule_jam_controller_loss_before_phrase_one]]
  it('still ends at once on a lost controller until phrase 1 sounds, cancelling phrase 2', () => {
    const { engine } = handed()
    const lostAt = HANDED_AT + 0.5
    expect(engine.handle({ kind: 'controller', at: lostAt, attached: false })).toEqual([
      { kind: 'cancel-generation', attemptId: 2 },
      countInEnd(lostAt, 'controller-lost'),
    ])
  })

  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  // @test-link [[rule_controller_loss_mid_session]]
  it('runs as any session once phrase 1 sounds: a lost controller no longer ends it', () => {
    const { engine } = handed()
    expect(engine.handle({ kind: 'count-in-over', at: SOUNDS_AT })).toEqual([
      expect.objectContaining({
        kind: 'phrase-sounding',
        at: SOUNDS_AT,
        tempo: TEMPO,
        phrase: expect.objectContaining({ phraseNumber: 1, origin: 'carry-in' }),
      }),
    ])
    expect(engine.handle({ kind: 'controller', at: SOUNDS_AT + 1, attached: false })).toEqual([])
    expect(engine.handle({ kind: 'end', at: SOUNDS_AT + 2, cause: 'stop' })).toContainEqual({
      kind: 'ended',
      at: SOUNDS_AT + 2,
      cause: 'stop',
      phase: 'running',
      soundedPhraseCount: 1,
    })
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it('refuses a second phrase 1 attempt once phrase 1 is decided', () => {
    const { engine } = handed()
    expect(() => askAttempt(engine, HANDED_AT + 0.1)).toThrow(/once phrase 1 is decided/)
  })
})

// @test-link [[rule_controller_loss_mid_session]]
describe('a session started with phrase 1', () => {
  // @test-link [[rule_controller_loss_mid_session]]
  it('never ends at once on a lost controller during its count-in', () => {
    const engine = createSessionEngine(
      { providers: queuedProviders(), viewport: fakeViewport(false), display: fakeDisplay() },
      { ...startWithoutPhraseOne(), phraseOne: PHRASE_ONE },
    )
    expect(engine.handle({ kind: 'controller', at: START_AT + 0.5, attached: false })).toEqual([])
  })
})

// @test-link [[rule_dropped_attempt_cancelled]]
describe('a phrase 1 attempt cancelled by its caller', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  // @test-link [[module_session_start_without_phrase_one]]
  it('cancels the attempt still generating where it runs and ignores its late result', () => {
    const engine = engineWithoutPhraseOne()
    askAttempt(engine, START_AT + 3)
    expect(engine.handle({ kind: 'cancel-phrase-one-attempt', at: START_AT + 3.2 })).toEqual([
      { kind: 'cancel-generation', attemptId: 1 },
    ])
    const outcome = successFor(PHRASE_ONE.intent)
    expect(
      engine.handle({ kind: 'generation-result', at: START_AT + 3.4, attemptId: 1, outcome }),
    ).toEqual([])
    expect(askAttempt(engine, START_AT + 4)).toContainEqual(
      expect.objectContaining({ kind: 'request-generation', attemptId: 2, phraseNumber: 1 }),
    )
  })

  // @test-link [[module_session_start_without_phrase_one]]
  it('drops an attempt in its fit check or fitted with nothing to cancel, and none at all', () => {
    const engine = engineWithoutPhraseOne()
    expect(engine.handle({ kind: 'cancel-phrase-one-attempt', at: START_AT + 3 })).toEqual([])
    askAttempt(engine, START_AT + 3)
    fitAttempt(engine, 1, START_AT + 3.1)
    expect(engine.handle({ kind: 'cancel-phrase-one-attempt', at: START_AT + 3.2 })).toEqual([])
    expect(() =>
      engine.handle({
        kind: 'phrase-one',
        at: START_AT + 3.3,
        attemptId: 1,
        soundsAt: START_AT + 8,
      }),
    ).toThrow(/not a phrase 1 that fits/)
  })
})
