/**
 * A fresh Jam from the doodle to phrase 1, on the fake clock with the held-generation double
 * (jam-phrase-one-rig.ts), as in jam-phrase-one.spec.ts: phrase 1 under Jam's rhythm lock, from a
 * doodle that gives no join, and under the narrow-window step-down.
 */
import { describe, expect, it } from 'vitest'

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { freshJamSettings } from '@/jam/fresh-jam-settings'
import { jamFirstValues } from '@/jam/jam-settings'
import { lockedBarsOfOutcome } from '@/session/rhythm-lock-session'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import { DEFAULT_SESSION_SEED, sessionSettings } from '../session/session-harness'
import { ONE_MEASURE } from './jam-phrase-one-fixtures'
import { engineOutputs, phraseOneRequests, runJam, type BeatNote } from './jam-phrase-one-rig'

/** Intent: Jam's settings at 120 BPM with its rhythm lock on, a strict lock. */
function lockedSettings() {
  return { ...sessionSettings({ tempo: 120 }), rhythmLockOn: true }
}

/**
 * Intent: the settings and drift a fresh Jam starts under at 120 BPM, its rhythm lock on and its
 * own Seventh chords level Strongly favored, made by Jam's code from Jam's settings.
 */
function stronglyFavoredJam() {
  const { controls, figureLevels } = sessionSettings({ tempo: 120 })
  return freshJamSettings(
    {
      settings: {
        ...jamFirstValues(controls),
        rhythmLockOn: true,
        'seventh-chords': 'stronglyFavored',
      },
      controls,
      figureLevels,
    },
    null,
  )
}

/** Intent: phrase 1 fails on rungs 1 and 2 (retries 0 to 4), so rung 3 is asked; the rest succeed. */
function ladderToRungThree(request: { readonly phraseNumber: number; readonly retry: number }) {
  return request.phraseNumber === 1 && request.retry < 5
    ? ({ after: 0.1, answer: 'search_limit_exceeded' } as const)
    : ({ after: 0.1, answer: 'real' } as const)
}

// @test-link [[rule_locked_rhythm_is_phrase_one]]
describe("with Jam's rhythm lock on", () => {
  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it("asks phrase 1 nearest the doodle (lock pending, with the block), then holds phrase 1's rhythm", () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 20, settings: lockedSettings() })
    const [phraseOne] = phraseOneRequests(run)
    expect(phraseOne!.request.intent.rhythmLock).toEqual({
      state: { kind: 'pending' },
      allowedChanges: [],
      tenserPhrase: false,
    })
    expect(phraseOne!.request.intent.steering).toBeDefined()
    const decided = engineOutputs(run, 'phrase-ready')[0]!.output.phrase
    const phraseTwo = run.requests.find(({ request }) => request.phraseNumber === 2)!
    expect(phraseTwo.request.intent.rhythmLock?.state).toEqual({
      kind: 'locked',
      bars: lockedBarsOfOutcome(decided.outcome),
    })
  })

  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  it("holds a rung 3 phrase 1's own rhythm, asked with no block and no lock group", () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 20,
      settings: lockedSettings(),
      generate: (request) =>
        request.phraseNumber === 1 && request.retry < 5
          ? { after: 0.1, answer: 'search_limit_exceeded' }
          : { after: 0.1, answer: 'real' },
    })
    const standalone = phraseOneRequests(run).at(-1)!.request
    expect(standalone.retry).toBe(5)
    expect(standalone.intent.rhythmLock).toBeUndefined()
    expect(standalone.intent.steering).toBeUndefined()
    const decided = engineOutputs(run, 'phrase-ready')[0]!.output.phrase
    expect(decided.intent).toBe(standalone.intent)
    const phraseTwo = run.requests.find(({ request }) => request.phraseNumber === 2)!
    expect(phraseTwo.request.intent.rhythmLock?.state).toEqual({
      kind: 'locked',
      bars: lockedBarsOfOutcome(decided.outcome),
    })
  })
})

// @test-link [[module_generation_request_construction]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('the Seventh chords level', () => {
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it("is Off on every rung of phrase 1's ladder and on the phrases after it", () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 20,
      settings: lockedSettings(),
      generate: ladderToRungThree,
    })
    const phraseOne = phraseOneRequests(run).map(({ request }) => request)
    const later = run.requests.filter(({ request }) => request.phraseNumber > 1)

    expect(new Set(phraseOne.map((request) => request.step))).toEqual(
      new Set(['carry-in', 'standalone']),
    )
    expect(phraseOne.at(-1)!.retry).toBe(5)
    expect(later.length).toBeGreaterThan(0)
    for (const request of [...phraseOne, ...later.map((timed) => timed.request)])
      expect(request.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it("is Jam's own level on every rung of phrase 1's ladder and on every phrase after it", () => {
    const jam = stronglyFavoredJam()
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 20,
      settings: jam.settings,
      drift: jam.drift,
      generate: ladderToRungThree,
    })
    const phraseOne = phraseOneRequests(run).map(({ request }) => request)
    const later = run.requests.filter(({ request }) => request.phraseNumber > 1)

    expect(phraseOne.map((request) => request.retry)).toEqual([0, 1, 2, 3, 4, 5])
    expect(later.length).toBeGreaterThan(0)
    for (const request of [...phraseOne, ...later.map((timed) => timed.request)])
      expect(request.intent.chordFamilies).toStrictEqual({ 'seventh-chords': 'stronglyFavored' })
  })
})

// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('a doodle whose last note gives no join', () => {
  // @test-link [[rule_jam_phrase_one_joins_doodle]]
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('starts at rung 2: the block, no join, with its own seed', () => {
    const run = runJam({
      tempo: 120,
      doodle: [...ONE_MEASURE.slice(0, 3), [110, 3, 1]],
      until: 20,
    })
    const [first] = phraseOneRequests(run)
    expect(first!.request.retry).toBe(4)
    expect(first!.request.step).toBe('standalone')
    expect(first!.request.intent.carryIn).toBeUndefined()
    expect(first!.request.intent.steering).toBeDefined()
    expect(first!.request.intent.seed).toBe(jamPhraseOneSeed(DEFAULT_SESSION_SEED, 4))
  })
})

/** A one-measure doodle of sixteenth notes, which reads as Sixteenth. */
const SIXTEENTHS: readonly BeatNote[] = Array.from({ length: 16 }, (_, index) => [
  60 + (index % 5),
  index / 4,
  1 / 4,
])

// @test-link [[rule_session_density_only_steps_down]]
describe('the narrow-window step-down', () => {
  // @test-link [[rule_session_density_only_steps_down]]
  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('applies from phrase 1: a Sixteenth read from the doodle generates as Eighth below the width', () => {
    const run = runJam({ tempo: 120, doodle: SIXTEENTHS, until: 20, below: () => true })
    const [first] = phraseOneRequests(run)
    const attempt = run.ladder.find(
      (output) => output.kind === 'session-event' && output.event.kind === 'phrase-one-attempt',
    )
    expect(
      attempt?.kind === 'session-event' &&
        attempt.event.kind === 'phrase-one-attempt' &&
        attempt.event.settings.controls.noteDensity,
    ).toBe('Sixteenth')
    expect(first!.request.intent.controls.noteDensity).toBe('Eighth')
  })
})
