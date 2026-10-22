/**
 * Pre-generation changes nothing a session produces: with every attempt answered at once (a fake
 * audio clock, a generator that answers instantly, every phrase fitting), a workspace session's
 * decided phrases and settings changes are identical, request ids aside, whether it starts with
 * the phrases the pre-generation plan made for the same phrase 1 and session seed or with none,
 * Vary settings and Tension across phrases on or off, and under a preset whose restriction is in
 * force at Start, which both freeze into their start settings.
 */

import { describe, expect, it } from 'vitest'

import {
  mutationFlagFor,
  startWorkspaceSessionRunner,
} from '@/components/workspace/workspace-session-runner'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  type BuiltInPresetId,
} from '@/domain/presets/built-in-presets'
import { allowsKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import { choosePreset } from '@/domain/presets/preset-selection'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { ALL_GROUPS_ALLOWED, withRestrictionAtStart } from '@/session/settings-mutation'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { measureSeconds } from '@/session/session-timing'
import type { SessionOutput, SessionSettings } from '@/session/session-types'
import type { GenerationControls } from '@/domain/controls/generation-controls'
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
  /**
   * Controls changed at Idle after phrase 1 was generated under the base settings: the session
   * then starts on a stale phrase 1, used as it is (Use it), with phrase 1's own settings.
   */
  readonly changedAtIdle?: Partial<GenerationControls>
  /** A preset chosen at Idle from the base settings, its restriction frozen in at Start. */
  readonly preset?: BuiltInPresetId
}

/** Intent: the base settings at 60 BPM after choosing `preset`, as Start takes them. */
function settingsUnder(preset: BuiltInPresetId): SessionSettings {
  const base = sessionSettings({ tempo: TEMPO })
  const chosen = choosePreset(
    { controls: base.controls, levels: base.figureLevels },
    base.selection,
    builtInPreset(preset),
  )
  return withRestrictionAtStart(
    {
      controls: chosen.settings.controls,
      figureLevels: chosen.settings.levels,
      selection: chosen.selection,
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
    },
    BUILT_IN_PRESETS,
  )
}

/**
 * Intent: a case's settings: phrase 1's, the base settings at 60 BPM, and the session's, those
 * with the case's Idle change; with none, the two are the same.
 */
function caseSettings(options: SessionCase): {
  readonly phraseOne: SessionSettings
  readonly session: SessionSettings
} {
  const phraseOne =
    options.preset === undefined ? sessionSettings({ tempo: TEMPO }) : settingsUnder(options.preset)
  if (options.changedAtIdle === undefined) return { phraseOne, session: phraseOne }
  return { phraseOne, session: sessionSettings({ tempo: TEMPO, ...options.changedAtIdle }) }
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
  const { changedAtIdle, preset, ...flags } = options
  void preset
  const settings = caseSettings(options)
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
      settings: settings.session,
      phraseOne: phraseOneFor(settings.phraseOne),
      ...(changedAtIdle === undefined ? {} : { phraseOneSettings: settings.phraseOne }),
      adaptiveTempo: false,
      ...flags,
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
  const settings = caseSettings(options)
  return plannedReadyPhrases(
    planSeams(),
    planStart({
      settings: settings.session,
      phraseOne: phraseOneFor(settings.phraseOne),
      ...(options.changedAtIdle === undefined ? {} : { phraseOneSettings: settings.phraseOne }),
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

/** Settings changed at Idle after phrase 1 that make it stale, each with every option combination. */
const STALE_CASES: readonly (SessionCase & { readonly change: string })[] = (
  [
    ['Written key', { tonalCenter: 'F#' }],
    ['Collection', { collection: 'Dorian' }],
    ['Register', { register: 'Low' }],
  ] as const
).flatMap(([change, changedAtIdle]) =>
  [false, true].flatMap((varySettings) =>
    [false, true].map((multiPhraseTensionArc) => ({
      change,
      changedAtIdle,
      varySettings,
      multiPhraseTensionArc,
      sessionSeed: DEFAULT_SESSION_SEED,
    })),
  ),
)

// @test-link [[rule_pregenerated_phrase_matches_session]]
// @test-link [[module_session_pregeneration_plan]]
// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('a session on a stale phrase 1, with and without pre-generation', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it.each(STALE_CASES)(
    'decides the phrases the plan made, after a $change change (Vary $varySettings, Tension $multiPhraseTensionArc)',
    async ({ change, ...options }) => {
      void change
      const ready = readyFor(options)
      expect(ready.map((entry) => entry.phraseNumber)).toEqual([2, 3, 4, 5])
      const without = await runSession(options, undefined)
      const withReady = await runSession(options, ready)
      expect(decidedPhrases(withReady)).toEqual(decidedPhrases(without))
      expect(withoutRequestIds(ready.map((entry) => entry.intent))).toEqual(
        withoutRequestIds(
          outputsOf(without, 'phrase-ready')
            .slice(0, 4)
            .map((output) => output.phrase.intent),
        ),
      )
      expect(outputsOf(withReady, 'settings-changed')).toEqual(
        outputsOf(without, 'settings-changed'),
      )
      const requested = outputsOf(withReady, 'request-generation').map(
        (request) => request.phraseNumber,
      )
      expect(requested.every((phraseNumber) => phraseNumber >= 6)).toBe(true)
    },
    SESSIONS_TIMEOUT_MS,
  )
})

/**
 * Reel chosen at Idle, its restriction (any key, Mixolydian or Dorian) in force at Start, with
 * Vary settings on: on session seed 69 an unbounded session would move the mode to Ionian on
 * phrase 3, so the key moves there instead; on session seed 126 the mode moves to Dorian.
 */
const RESTRICTED_CASES: readonly SessionCase[] = [
  { sessionSeed: makeSeed(69), multiPhraseTensionArc: false },
  { sessionSeed: makeSeed(126), multiPhraseTensionArc: true },
].map((options) => ({ ...options, varySettings: true, preset: 'reel' }))

// @test-link [[rule_pregenerated_phrase_matches_session]]
// @test-link [[rule_vary_settings_stays_inside_restriction]]
// @test-link [[module_session_pregeneration_plan]]
describe('a session under a restriction in force, with and without pre-generation', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[rule_vary_settings_stays_inside_restriction]]
  // @test-link [[module_session_pregeneration_plan]]
  it.each(RESTRICTED_CASES)(
    'decides the phrases the plan made, every key and mode move inside Reel (Tension $multiPhraseTensionArc, seed $sessionSeed)',
    async (options) => {
      const ready = readyFor(options)
      expect(ready.map((entry) => entry.phraseNumber)).toEqual([2, 3, 4, 5])
      const without = await runSession(options, undefined)
      const withReady = await runSession(options, ready)
      expect(decidedPhrases(withReady)).toEqual(decidedPhrases(without))
      const changes = outputsOf(without, 'settings-changed')
      expect(outputsOf(withReady, 'settings-changed')).toEqual(changes)
      const keyOrMode = changes.filter(
        (change) =>
          change.cause === 'mutation' &&
          (change.setting === 'tonalCenter' || change.setting === 'collection'),
      )
      expect(keyOrMode.length).toBeGreaterThan(0)
      const reel = builtInPreset('reel').restriction
      for (const change of changes) {
        const { tonalCenter, collection } = change.settings.controls
        expect(allowsKeyAndMode(reel, tonalCenter, collection)).toBe(true)
      }
      const requested = outputsOf(withReady, 'request-generation').map(
        (request) => request.phraseNumber,
      )
      expect(requested.every((phraseNumber) => phraseNumber >= 6)).toBe(true)
    },
    SESSIONS_TIMEOUT_MS,
  )
})
