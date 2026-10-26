/**
 * Pre-generation changes nothing a session produces: with every attempt answered at once (a fake
 * audio clock, a generator that answers instantly, every phrase fitting), a workspace session's
 * decided phrases and settings changes are identical, request ids aside, whether it starts with
 * the phrases the pre-generation plan made for the same phrase 1 and session seed or with none,
 * Vary settings and Tension across phrases on or off, under a preset whose restriction is in
 * force at Start, which both freeze into their start settings, and under the rhythm lock, every
 * ready phrase spent, drawn changes and a re-lock among them.
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
import { mutationContextAtStart } from '@/session/session-mutation-step'
import { createPregenerationPlan } from '@/session/session-pregeneration'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { measureSeconds } from '@/session/session-timing'
import type { SessionOutput, SessionSettings } from '@/session/session-types'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RhythmChangeKind,
} from '@/domain/generation/request-rhythm-lock'
import { planSeams, planStart, runPlan, type PlanRun } from './pregeneration-harness'
import { barsOf, expectedGroup, expectedTenser } from './rhythm-lock-sessions'
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
  /** Base controls other than the defaults, phrase 1 generated under them. */
  readonly controls?: Partial<GenerationControls>
  /** With the rhythm lock on, the changes allowed; absent, the lock is off. */
  readonly allowedRhythmChanges?: readonly RhythmChangeKind[]
  /** Whether the window is below tablet landscape for the plan and the session. */
  readonly narrow?: boolean
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
      allowedRhythmChanges: [],
    },
    BUILT_IN_PRESETS,
  )
}

/** Intent: settings with the case's rhythm lock: on with its allowed changes, or off as given. */
function withCaseLock(settings: SessionSettings, options: SessionCase): SessionSettings {
  const allowed = options.allowedRhythmChanges
  if (allowed === undefined) return settings
  return { ...settings, rhythmLockOn: true, allowedRhythmChanges: allowed }
}

/**
 * Intent: a case's settings: phrase 1's, the base settings at 60 BPM with the case's controls, and
 * the session's, those with the case's Idle change; with none, the two are the same. Both carry
 * the case's rhythm lock.
 */
function caseSettings(options: SessionCase): {
  readonly phraseOne: SessionSettings
  readonly session: SessionSettings
} {
  const base = { tempo: TEMPO, ...options.controls }
  const phraseOne = withCaseLock(
    options.preset === undefined ? sessionSettings(base) : settingsUnder(options.preset),
    options,
  )
  if (options.changedAtIdle === undefined) return { phraseOne, session: phraseOne }
  const session = withCaseLock(sessionSettings({ ...base, ...options.changedAtIdle }), options)
  return { phraseOne, session }
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
  const { changedAtIdle, varySettings, multiPhraseTensionArc, sessionSeed } = options
  const settings = caseSettings(options)
  const runner = startWorkspaceSessionRunner(
    {
      generate: (intent) => Promise.resolve(realOutcomeFor(intent)),
      checkFit: () => Promise.resolve(true),
      now: () => clock.at,
      providers: queuedProviders(),
      viewport: fakeViewport(options.narrow === true),
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
      varySettings,
      multiPhraseTensionArc,
      sessionSeed,
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

/** Intent: the plan for a case's phrase 1, seed and options, run with real results. */
function planFor(options: SessionCase): PlanRun {
  const settings = caseSettings(options)
  return runPlan(
    createPregenerationPlan(
      planSeams(options.narrow === true),
      planStart({
        settings: settings.session,
        phraseOne: phraseOneFor(settings.phraseOne),
        ...(options.changedAtIdle === undefined ? {} : { phraseOneSettings: settings.phraseOne }),
        sessionSeed: options.sessionSeed,
        mutation: mutationFlagFor(
          options.varySettings,
          options.sessionSeed,
          settings.session,
          mutationContextAtStart(phraseOneFor(settings.phraseOne), false),
        ),
        multiPhraseTensionArc: options.multiPhraseTensionArc,
      }),
      [],
    ),
  )
}

/** Intent: the ready phrases the plan makes for a case's phrase 1, seed and options. */
function readyFor(options: SessionCase): readonly ReadyPhrase[] {
  return planFor(options).plan.readyPhrases
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

/** Intent: the session seed of lock case `index`, spread over the 32 bits. */
function lockCaseSeed(index: number): Seed {
  return makeSeed(Math.imul(0x9e37_79b1, index + 1) >>> 0)
}

/**
 * Lock sessions at Lift: every change allowed with Tension across phrases on and off on three
 * spread seeds, one with Vary settings on, and one strict session with no change allowed. On each
 * of these seeds with changes allowed, some ready phrase takes a drawn change.
 */
const LOCK_CASES: readonly SessionCase[] = [
  ...[0, 1, 2].flatMap((index) =>
    [true, false].map((multiPhraseTensionArc) => ({
      allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
      multiPhraseTensionArc,
      varySettings: index === 2,
      sessionSeed: lockCaseSeed(index),
    })),
  ),
  {
    allowedRhythmChanges: [],
    multiPhraseTensionArc: true,
    varySettings: false,
    sessionSeed: lockCaseSeed(3),
  },
].map((lockCase) => ({ ...lockCase, controls: { tension: 'Lift' } }))

/** Intent: whether a decided or ready phrase's outcome took a drawn rhythm change. */
function tookChange(entry: { readonly outcome: ReadyPhrase['outcome'] }): boolean {
  return entry.outcome.provenance.rhythmLockOutcome === 'rhythm_change'
}

// @test-link [[rule_pregenerated_phrase_matches_session]]
// @test-link [[module_session_ready_phrases]]
// @test-link [[module_session_pregeneration_plan]]
// @test-link [[module_session_rhythm_lock]]
describe('a session under the rhythm lock, with and without pre-generation', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[module_session_ready_phrases]]
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[module_session_rhythm_lock]]
  it.each(LOCK_CASES)(
    'spends every ready phrase and decides identical phrases (allowed $allowedRhythmChanges, Tension $multiPhraseTensionArc, Vary $varySettings, seed $sessionSeed)',
    async (options) => {
      const ready = readyFor(options)
      expect(ready.map((entry) => entry.phraseNumber)).toEqual([2, 3, 4, 5])
      expect(ready.every((entry) => entry.intent.rhythmLock !== undefined)).toBe(true)
      const changesAllowed = (options.allowedRhythmChanges ?? []).length > 0
      expect(ready.some(tookChange), 'a ready phrase took a rhythm change').toBe(changesAllowed)
      const without = await runSession(options, undefined)
      const withReady = await runSession(options, ready)
      expect(decidedPhrases(withReady)).toEqual(decidedPhrases(without))
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

/** Intent: whether bars hold a note or rest starting or lasting off the two-tick Eighth grid. */
function offEighthGrid(bars: readonly LockedRhythmMeasure[]): boolean {
  return bars.some((measure) =>
    measure.some((event) => event.startTick % 2 === 1 || event.durationTicks % 2 === 1),
  )
}

/**
 * Re-lock sessions: Sixteenth chosen at Lift with every change allowed, phrase 1 generated wide
 * (its bars using sixteenth notes) and the window narrow for the plan and the session, so phrase 2
 * is generated with Eighth and is the re-lock phrase.
 */
const RELOCK_CASES: readonly SessionCase[] = [true, false].map((multiPhraseTensionArc, index) => ({
  allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
  controls: { noteDensity: 'Sixteenth', tension: 'Lift' },
  narrow: true,
  multiPhraseTensionArc,
  varySettings: false,
  sessionSeed: lockCaseSeed(4 + index),
}))

// @test-link [[rule_pregenerated_phrase_matches_session]]
// @test-link [[module_session_pregeneration_plan]]
// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_rhythm_lock_relocks_after_step_down]]
describe('a re-lock among the ready phrases, with and without pre-generation', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_rhythm_lock_relocks_after_step_down]]
  it.each(RELOCK_CASES)(
    'plans and spends phrase 2 as the re-lock phrase, as the session decides it (Tension $multiPhraseTensionArc)',
    async (options) => {
      const { attempts, plan } = planFor(options)
      const ready = plan.readyPhrases
      expect(ready.map((entry) => entry.phraseNumber)).toEqual([2, 3, 4, 5])
      const phraseOneBars = barsOf(phraseOneFor(caseSettings(options).phraseOne).outcome)
      expect(offEighthGrid(phraseOneBars)).toBe(true)
      const relockBars = barsOf(ready[0]!.outcome)
      const arc = options.multiPhraseTensionArc
      for (const attempt of attempts) {
        const { phraseNumber, intent } = attempt
        expect(intent.controls.noteDensity).toBe('Eighth')
        const tenser = expectedTenser(arc, phraseNumber, 'Lift')
        expect(intent.rhythmLock, `phrase ${phraseNumber}`).toEqual(
          phraseNumber === 2
            ? expectedGroup(phraseOneBars, [], tenser)
            : expectedGroup(relockBars, RHYTHM_CHANGE_KINDS, tenser),
        )
      }
      const without = await runSession(options, undefined)
      const withReady = await runSession(options, ready)
      expect(decidedPhrases(withReady)).toEqual(decidedPhrases(without))
      for (const run of [without, withReady]) {
        const phrases = outputsOf(run, 'phrase-ready').map((output) => output.phrase)
        expect(phrases.map((phrase) => phrase.relock === true)).toEqual(
          phrases.map((phrase) => phrase.phraseNumber === 2),
        )
      }
      const requested = outputsOf(withReady, 'request-generation').map(
        (request) => request.phraseNumber,
      )
      expect(requested.every((phraseNumber) => phraseNumber >= 6)).toBe(true)
    },
    SESSIONS_TIMEOUT_MS,
  )
})
