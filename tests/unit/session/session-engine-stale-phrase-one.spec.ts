/**
 * The session engine started on a stale phrase 1 (ISS-011): the start carries phrase 1's own
 * settings beside the session's, so phrase 2 joins phrase 1 as after a settings change at their
 * boundary, the carry-in adapted by the existing rules, and the start never meets a carry-in
 * error, at any tempo. Phrase 1's settings equal to the session's change nothing.
 */

import { describe, expect, it } from 'vitest'

import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  PITCH_CLASSES,
  TEMPO_VALUES,
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import { adaptCarryIn } from '@/session/carry-in-adaptation'
import { measureSeconds } from '@/session/session-timing'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'
import { SessionDriver, phraseOneFor, type GenerationRequestOutput } from './session-harness'

/** The tempo of the session that runs past phrase 2, a 2 s measure. */
const RUN_TEMPO = 120

/** Intent: the moment phrase N (1 or more) starts sounding in a session started at 0. */
function soundingAt(phraseNumber: number): number {
  return measureSeconds(RUN_TEMPO) * (1 + 4 * (phraseNumber - 1))
}

/** Intent: settings on the first-load defaults, with these controls changed. */
function defaultsWith(overrides: Partial<GenerationControls> = {}): SessionSettings {
  return {
    controls: makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, ...overrides }),
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    selection: DEFAULT_PRESET_SELECTION,
    allowedGroups: ALL_GROUPS_ALLOWED,
    rhythmLockOn: false,
  }
}

/** Phrase 1, generated at Idle under the first-load defaults. */
const PHRASE_ONE_UNDER_DEFAULTS: SessionStart['phraseOne'] = phraseOneFor(defaultsWith())

/** Intent: phrase 2's first request in a session's start outputs. */
function phraseTwoRequest(driver: SessionDriver): GenerationRequestOutput {
  const request = driver.startOutputs.find((output) => output.kind === 'request-generation')
  expect(request, 'the start requests phrase 2').toBeDefined()
  return request as GenerationRequestOutput
}

/** One setting changed at Idle after phrase 1, and what the carry-in rules then leave. */
interface IdleChange {
  readonly name: string
  readonly controls: Partial<GenerationControls>
  readonly expectation: 'no-harmony' | 'new-window' | 'standalone-varying' | 'harmony-if-fits'
}

/** Every other Written key, Collection and Harmonic motion, and the three other registers. */
const CHANGES: readonly IdleChange[] = [
  ...PITCH_CLASSES.filter((key) => key !== DEFAULT_GENERATION_CONTROLS.tonalCenter).map(
    (tonalCenter): IdleChange => ({
      name: `Written key ${tonalCenter}`,
      controls: { tonalCenter },
      expectation: 'no-harmony',
    }),
  ),
  ...COLLECTIONS.filter((entry) => entry !== DEFAULT_GENERATION_CONTROLS.collection).map(
    (collection): IdleChange => ({
      name: `Collection ${collection}`,
      controls: { collection },
      expectation: 'no-harmony',
    }),
  ),
  ...HARMONIC_MOTIONS.filter((entry) => entry !== DEFAULT_GENERATION_CONTROLS.harmonicMotion).map(
    (harmonicMotion): IdleChange => ({
      name: `Harmonic motion ${harmonicMotion}`,
      controls: { harmonicMotion },
      expectation: 'harmony-if-fits',
    }),
  ),
  { name: 'Register Low', controls: { register: 'Low' }, expectation: 'new-window' },
  { name: 'Register High', controls: { register: 'High' }, expectation: 'new-window' },
  {
    name: 'Register Varying',
    controls: { register: 'Varying' },
    expectation: 'standalone-varying',
  },
]

/**
 * Intent: check phrase 2's request against what the carry-in rules leave for this change: the
 * adaptation of phrase 1's carry-in from phrase 1's settings to the session's, or no carry-in at
 * all once the tempo leaves phrase 2 no time but for the standalone rung.
 */
function expectAdaptedJoin(
  change: IdleChange,
  request: GenerationRequestOutput,
  before: SessionSettings,
  after: SessionSettings,
): void {
  const phraseOne = PHRASE_ONE_UNDER_DEFAULTS
  const carryIn = deriveCarryIn({ ...phraseOne, phraseNumber: 1 })
  const candidates = phraseOne.intent.registerIntent.candidates
  const adapted = adaptCarryIn({ carryIn, before, after, candidates })
  expect(request.phraseNumber).toBe(2)
  if (adapted.kind === 'standalone' || request.step === 'standalone') {
    expect(request.step).toBe('standalone')
    expect(request.intent.carryIn).toBeUndefined()
    if (change.expectation === 'standalone-varying') expect(adapted.kind).toBe('standalone')
    return
  }
  expect(request.intent.carryIn).toEqual(adapted.carryIn)
  const carried = request.intent.carryIn!
  if (change.expectation === 'no-harmony') expect(carried.finalHarmony).toBeNull()
  if (change.expectation === 'new-window') {
    const window = candidates.find((entry) => entry.id === after.controls.register)?.window
    expect(carried.registerWindow).toEqual(window)
  }
  if (change.expectation === 'harmony-if-fits')
    expect([null, carryIn.finalHarmony]).toContainEqual(carried.finalHarmony)
}

// @test-link [[service_session_engine]]
// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[module_session_carry_in_after_change]]
describe('a session started on a stale phrase 1', () => {
  // @test-link [[service_session_engine]]
  // @test-link [[rule_key_change_drops_harmonic_carry_in]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it("starts on ISS-011's reproduction, phrase 2's request carrying no harmonic part", () => {
    const idle = defaultsWith({ collection: 'Major', tempo: 60 })
    const session = defaultsWith({ collection: 'Major', tonalCenter: 'F#', tempo: 60 })
    const phraseOne = phraseOneFor(idle)
    expect(() => new SessionDriver({ settings: session, phraseOne })).toThrow(CarryInError)

    const driver = new SessionDriver({ settings: session, phraseOne, phraseOneSettings: idle })

    const request = phraseTwoRequest(driver)
    expect(request).toMatchObject({ phraseNumber: 2, step: 'carry-in', retry: 0 })
    expect(request.intent.carryIn?.finalHarmony).toBeNull()
    expect(request.intent.controls.tonalCenter).not.toBe(phraseOne.intent.controls.tonalCenter)
    expect(driver.startOutputs.some((output) => output.kind === 'phrase-ready')).toBe(false)
  })

  // @test-link [[service_session_engine]]
  // @test-link [[rule_setting_change_rechecks_pitch_carry_in]]
  // @test-link [[rule_key_change_drops_harmonic_carry_in]]
  // @test-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  // @test-link [[rule_register_change_replaces_carried_window]]
  // @test-link [[rule_join_carry_in_limited]]
  it.each(CHANGES)(
    'starts at every tempo after a change of $name, phrase 2 joined as the carry-in rules leave it',
    (change) => {
      for (const tempo of TEMPO_VALUES) {
        const before = defaultsWith({ tempo })
        const after = defaultsWith({ ...change.controls, tempo })
        const driver = new SessionDriver({
          settings: after,
          phraseOne: PHRASE_ONE_UNDER_DEFAULTS,
          phraseOneSettings: before,
        })
        expectAdaptedJoin(change, phraseTwoRequest(driver), before, after)
      }
    },
  )

  // @test-link [[service_session_engine]]
  // @test-link [[rule_tempo_never_affects_generation]]
  it("changes nothing when phrase 1's settings equal the session's: the same requests and seeds", () => {
    const settings = defaultsWith({ tempo: RUN_TEMPO })
    const copy = defaultsWith({ tempo: RUN_TEMPO })
    const without = new SessionDriver({ settings, phraseOne: PHRASE_ONE_UNDER_DEFAULTS })
    const withEqual = new SessionDriver({
      settings,
      phraseOne: PHRASE_ONE_UNDER_DEFAULTS,
      phraseOneSettings: copy,
    })

    for (const driver of [without, withEqual]) {
      driver.accept(1)
      driver.countInOver(soundingAt(1))
      driver.sounding(soundingAt(2), 2)
      driver.accept(soundingAt(2) + 1)
    }

    expect(withEqual.log).toEqual(without.log)
    expect(without.requests(3)).toHaveLength(1)
  })
})
