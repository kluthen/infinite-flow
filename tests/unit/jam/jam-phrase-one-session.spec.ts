/**
 * A fresh Jam from phrase 1 on, on the fake clock with the held-generation double
 * (jam-phrase-one-rig.ts): it runs as a v2 session, every request carrying the steering block
 * (phrases 2 onward joining the phrase before, every rung keeping the block), the narrow-window
 * step-down holding from phrase 1, none of session mode's options running, and the key and mode
 * suggestion worked out at the doodle's end.
 */
import { describe, expect, it } from 'vitest'

import { isPhraseCarryIn } from '@/domain/generation/carry-in/carry-in'
import { sessionSettings, type GenerationRequestOutput } from '../session/session-harness'
import { engineOutputs, phraseOneRequests, runJam, type BeatNote } from './jam-phrase-one-rig'

/** A one-measure doodle: C, D, E, F, a quarter note each, from the count-in's end. */
const ONE_MEASURE: readonly BeatNote[] = [
  [60, 0, 1],
  [62, 1, 1],
  [64, 2, 1],
  [65, 3, 1],
]

/** A one-measure doodle of sixteenth notes, which reads as Sixteenth. */
const SIXTEENTHS: readonly BeatNote[] = Array.from({ length: 16 }, (_, index) => [
  60 + (index % 5),
  index / 4,
  1 / 4,
])

/** Intent: the requests of phrases 2 onward, in order. */
function laterRequests(run: ReturnType<typeof runJam>): readonly GenerationRequestOutput[] {
  return run.requests.map(({ request }) => request).filter((request) => request.phraseNumber >= 2)
}

// @test-link [[rule_every_jam_phrase_carries_doodle]]
describe('every request of a Jam from phrase 2 on', () => {
  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  // @test-link [[rule_join_carry_in_limited]]
  it('carries the steering block and joins the phrase before', () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 40 })
    const block = phraseOneRequests(run)[0]!.request.intent.steering
    const later = laterRequests(run)
    expect(later.map((request) => request.phraseNumber)).toEqual([2, 3, 4])
    for (const request of later) {
      expect(request.intent.steering).toEqual(block)
      expect(isPhraseCarryIn(request.intent.carryIn!)).toBe(true)
    }
  })

  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it("keeps the block on every rung of phrase 2's ladder, the standalone attempt included", () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 26,
      generate: (request) =>
        request.phraseNumber === 2 && request.retry < 4
          ? { after: 0.1, answer: 'search_limit_exceeded' }
          : { after: 0.1, answer: 'real' },
    })
    const block = phraseOneRequests(run)[0]!.request.intent.steering
    const phraseTwo = laterRequests(run).filter((request) => request.phraseNumber === 2)
    expect(phraseTwo.map((request) => request.step)).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'standalone',
    ])
    for (const request of phraseTwo) expect(request.intent.steering).toEqual(block)
  })

  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it('carries the block after a rung 3 phrase 1, which had none', () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 24,
      generate: (request) =>
        request.phraseNumber === 1 && request.retry < 5
          ? { after: 0.1, answer: 'search_limit_exceeded' }
          : { after: 0.1, answer: 'real' },
    })
    const requests = phraseOneRequests(run)
    expect(requests.at(-1)!.request.intent.steering).toBeUndefined()
    const block = requests[0]!.request.intent.steering
    expect(block).toBeDefined()
    expect(laterRequests(run)[0]!.intent.steering).toEqual(block)
  })
})

// @test-link [[rule_jam_runs_as_session_from_phrase_one]]
describe('a Jam from phrase 1 on', () => {
  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it('runs none of Vary settings, Tension across phrases and Rising tempo', () => {
    const settings = sessionSettings({ tempo: 120, tension: 'Build' })
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 40, settings })
    const later = laterRequests(run)
    expect(later.length).toBeGreaterThanOrEqual(3)
    for (const request of later) {
      expect(request.intent.controls.tension).toBe('Build')
      expect(request.intent.controls.tempo).toBe(120)
    }
    const kinds = run.engine.map((entry) => entry.output.kind)
    expect(kinds).not.toContain('settings-mutated')
    expect(kinds).not.toContain('mutation-skipped')
    expect(
      engineOutputs(run, 'phrase-ready').map((entry) => entry.output.phrase.phraseNumber),
    ).toEqual([1, 2, 3, 4])
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('keeps the step-down of phrase 1 when the window widens again', () => {
    let below = true
    const run = runJam({
      tempo: 120,
      doodle: SIXTEENTHS,
      until: 30,
      below: () => below,
      generate: (request) => {
        if (request.phraseNumber === 1) below = false
        return { after: 0.1, answer: 'real' }
      },
    })
    expect(phraseOneRequests(run)[0]!.request.intent.controls.noteDensity).toBe('Eighth')
    const later = laterRequests(run)
    expect(later.length).toBeGreaterThan(0)
    for (const request of later) expect(request.intent.controls.noteDensity).toBe('Eighth')
  })

  // @test-link [[rule_session_density_only_steps_down]]
  it('generates a Sixteenth read from the doodle as Sixteenth on a wide window', () => {
    const run = runJam({ tempo: 120, doodle: SIXTEENTHS, until: 24 })
    expect(phraseOneRequests(run)[0]!.request.intent.controls.noteDensity).toBe('Sixteenth')
    expect(laterRequests(run)[0]!.intent.controls.noteDensity).toBe('Sixteenth')
  })
})

// @test-link [[module_key_suggestion]]
describe("the doodle's key and mode suggestion", () => {
  // @test-link [[module_key_suggestion]]
  it("is worked out once, at the doodle's end", () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 20 })
    const suggestions = run.ladder.filter((output) => output.kind === 'suggestion')
    const ended = run.capture.find((output) => output.kind === 'doodle-ended')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ at: ended!.at })
    expect(['nothing', 'no_fit', 'suggested']).toContain(
      suggestions[0]!.kind === 'suggestion' && suggestions[0]!.suggestion.kind,
    )
  })
})
