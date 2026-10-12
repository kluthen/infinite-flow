/**
 * Pre-generation changes nothing a session produces: with every attempt answered at once (a fake
 * audio clock, a generator that answers instantly, every phrase fitting), a workspace session's
 * decided phrases and settings changes are identical, request ids aside, whether it starts with
 * the phrases the pre-generation plan made for the same phrase 1 and session seed or with none,
 * Vary settings and Tension across phrases on or off.
 */

import { describe, expect, it } from 'vitest'

import {
  mutationFlagFor,
  startWorkspaceSessionRunner,
} from '@/components/workspace/workspace-session-runner'
import { makeSeed, type Seed } from '@/domain/random/seed'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { measureSeconds } from '@/session/session-timing'
import type { SessionOutput } from '@/session/session-types'
import { planSeams, planStart, plannedReadyPhrases } from './pregeneration-harness'
import {
  DEFAULT_SESSION_SEED,
  UNREAD_DISPLAY,
  fakeViewport,
  phraseOneFor,
  queuedProviders,
  realOutcomeFor,
  sessionSettings,
  withoutRequestIds,
  type OutputOf,
} from './session-harness'

/** A tempo whose phrase 2 deadline leaves time for the carry-in rungs, as the plan climbs them. */
const TEMPO = 60

/** The last phrase the sessions here let start sounding: phrases 2 to 8 get decided. */
const LAST_SOUNDING = 7

/** Generous timeout: each case generates two whole sessions and a plan. */
const SESSIONS_TIMEOUT_MS = 60_000

/** Intent: let every settled seam promise run its continuation, the runner's feedback included. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: the moment phrase N (1 or more) starts sounding in a session started at 0. */
function soundingAt(phraseNumber: number): number {
  return measureSeconds(TEMPO) * (1 + 4 * (phraseNumber - 1))
}

/** The session options one case runs with. */
interface SessionCase {
  readonly varySettings: boolean
  readonly multiPhraseTensionArc: boolean
  readonly sessionSeed: Seed
}

/** What one session gave: every output, in order. */
interface SessionRun {
  readonly log: readonly SessionOutput[]
}

/**
 * Intent: run one workspace session at 60 BPM to phrase `LAST_SOUNDING` sounding, every generate
 * call answered at once with its real outcome and every phrase fitting, each result fed back on a
 * clock that stands still until the next transport event.
 */
async function runSession(
  options: SessionCase,
  readyPhrases: readonly ReadyPhrase[] | undefined,
): Promise<SessionRun> {
  const clock = { at: 0 }
  const log: SessionOutput[] = []
  const errors: unknown[] = []
  const settings = sessionSettings({ tempo: TEMPO })
  const runner = startWorkspaceSessionRunner(
    {
      generate: (intent) => Promise.resolve(realOutcomeFor(intent)),
      checkFit: () => Promise.resolve(true),
      now: () => clock.at,
      providers: queuedProviders(),
      viewport: fakeViewport(false),
      display: UNREAD_DISPLAY,
      onOutput: (output) => log.push(output),
      onError: (error) => errors.push(error),
    },
    {
      at: 0,
      settings,
      phraseOne: phraseOneFor(settings),
      adaptiveTempo: false,
      ...options,
      ...(readyPhrases === undefined ? {} : { readyPhrases }),
    },
  )
  await settle()
  clock.at = soundingAt(1)
  runner.dispatch({ kind: 'count-in-over', at: clock.at })
  for (let phraseNumber = 2; phraseNumber <= LAST_SOUNDING; phraseNumber += 1) {
    clock.at = soundingAt(phraseNumber)
    runner.dispatch({ kind: 'phrase-started-sounding', at: clock.at, phraseNumber })
    await settle()
  }
  expect(errors).toEqual([])
  return { log }
}

/** Intent: the ready phrases the plan makes for a case's phrase 1, seed and options. */
function readyFor(options: SessionCase): readonly ReadyPhrase[] {
  const settings = sessionSettings({ tempo: TEMPO })
  return plannedReadyPhrases(
    planSeams(),
    planStart({
      settings,
      sessionSeed: options.sessionSeed,
      mutation: mutationFlagFor(options.varySettings, options.sessionSeed),
      multiPhraseTensionArc: options.multiPhraseTensionArc,
    }),
  )
}

/** Intent: every output of one kind a session gave, in order. */
function outputsOf<K extends SessionOutput['kind']>(
  run: SessionRun,
  kind: K,
): readonly OutputOf<K>[] {
  return run.log.filter((output): output is OutputOf<K> => output.kind === kind)
}

/** Intent: a session's decided phrases (number, origin, intent and outcome), request ids aside. */
function decidedPhrases(run: SessionRun): unknown {
  return withoutRequestIds(outputsOf(run, 'phrase-ready').map((output) => output.phrase))
}

/** Every combination of the two session options, on two session seeds. */
const CASES: readonly SessionCase[] = [DEFAULT_SESSION_SEED, makeSeed(0x0badf00d)].flatMap(
  (sessionSeed) =>
    [false, true].flatMap((varySettings) =>
      [false, true].map((multiPhraseTensionArc) => ({
        varySettings,
        multiPhraseTensionArc,
        sessionSeed,
      })),
    ),
)

// @test-link [[rule_pregenerated_phrase_matches_session]]
// @test-link [[module_session_ready_phrases]]
// @test-link [[module_session_pregeneration_plan]]
describe('a session with and without pre-generation', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[module_session_ready_phrases]]
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[req_idle_pregeneration]]
  it.each(CASES)(
    'decides identical phrases and settings changes (Vary $varySettings, Tension $multiPhraseTensionArc, seed $sessionSeed)',
    async (options) => {
      const ready = readyFor(options)
      expect(ready.map((entry) => entry.phraseNumber)).toEqual([2, 3, 4, 5])
      const without = await runSession(options, undefined)
      const withReady = await runSession(options, ready)
      const phrases = outputsOf(without, 'phrase-ready').map((output) => output.phrase)
      expect(phrases.map((phrase) => phrase.phraseNumber)).toEqual([2, 3, 4, 5, 6, 7, 8])
      expect(phrases.every((phrase) => phrase.origin !== 'repeat')).toBe(true)
      expect(decidedPhrases(withReady)).toEqual(decidedPhrases(without))
      expect(outputsOf(without, 'settings-changed').length > 0).toBe(options.varySettings)
      expect(outputsOf(withReady, 'settings-changed')).toEqual(
        outputsOf(without, 'settings-changed'),
      )
      const requested = outputsOf(withReady, 'request-generation').map(
        (request) => request.phraseNumber,
      )
      expect(requested.length).toBeGreaterThan(0)
      expect(requested.every((phraseNumber) => phraseNumber >= 6)).toBe(true)
    },
    SESSIONS_TIMEOUT_MS,
  )
})
