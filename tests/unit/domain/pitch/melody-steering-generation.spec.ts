// @vitest-environment node
/**
 * The melody follows the steering block's moves, end to end: over the doodle set, each doodle's
 * moves are read here from its quantized notes (so nothing of the Jam-side block builder is
 * needed) and put in a block at each strength, with an unbounded band so the rhythm keeps its
 * seeded order. Phrases are generated standalone and joined to a phrase before them, and each
 * note reached by a move is compared with the block's move for it. The share of notes moving in
 * the block's direction rises from no strength to direction only and to size and direction (the
 * two about level, as both put the direction first), and the share matching the size as well
 * rises at size and direction; every phrase passes the
 * validator, the requests with a block succeed at least as often as without, and at strength
 * none the phrases are exactly those generated without a block.
 */

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import {
  makeSteeringBlock,
  type MelodicMove,
  type SteeringBlock,
  type SteeringStrength,
} from '@/domain/generation/steering-block'
import { melodicMoveBetween } from '@/domain/generation/steering/pitch-steering'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { loadDoodleSet } from '../../jam/doodle-set'
import {
  attackMidis,
  buildIntent,
  carryInAfter,
  generateSuccess,
  type SuccessOutcome,
} from '../generation/carry-in/carry-in-fixture'

/** Generating the whole population takes a few seconds; a loaded machine can take far longer. */
const POPULATION_TIMEOUT_MS = 120_000

const SEEDS = [3, 17, 29, 41] as const

/**
 * How far below direction only's share of notes in the block's direction size and direction's may
 * fall: both put the direction first, so the two differ only through the later choices a size
 * preference changes (on 2026-10-27, 1,012 against 1,014 of 2,332 notes).
 */
const DIRECTION_NOISE = 0.01
const STRENGTHS: readonly SteeringStrength[] = ['none', 'direction', 'size-and-direction']

/** Jam's arpeggio chaos (held at Varied), an eighth-note line free to move. */
const CONTROLS: Partial<GenerationControls> = {
  arpeggioChaos: 'Varied',
  noteDensity: 'Eighth',
  contour: 'Wandering',
  leapiness: 'Leaping',
}

/** One doodle of the set with at least one move, and its moves read from its notes. */
interface SteeringDoodle {
  readonly name: string
  readonly moves: readonly MelodicMove[]
}

/** Intent: every doodle of the set with two notes or more, each with the moves between its notes. */
function steeringDoodles(): readonly SteeringDoodle[] {
  return loadDoodleSet().flatMap((doodle) => {
    const pitches = doodle.quantized.notes.map((note) => note.pitch)
    const moves = pitches.slice(1).map((pitch, index) => melodicMoveBetween(pitches[index]!, pitch))
    return moves.length === 0 ? [] : [{ name: doodle.name, moves }]
  })
}

/** Intent: a block holding the moves at the strength, its band unbounded and its rhythm empty. */
function blockOf(moves: readonly MelodicMove[], strength: SteeringStrength): SteeringBlock {
  return makeSteeringBlock({
    targetRhythm: { measures: [[], [], [], []], band: 'unbounded' },
    moves,
    strength,
  })
}

/** One request of the population: its intent without a block, the carry-in it joins, if any. */
interface PopulationRequest {
  readonly label: string
  readonly seed: number
  readonly carryIn?: CarryIn
}

/** Intent: the request's intent, carrying the block when given. */
function intentOf(request: PopulationRequest, steering?: SteeringBlock): GenerationIntent {
  const base = buildIntent({ seed: request.seed, controls: CONTROLS, label: request.label })
  if (request.carryIn === undefined) return steering === undefined ? base : { ...base, steering }
  const { requestId, seed, controls, figureLevels } = base
  return makeCarryInGenerationIntent({
    requestId,
    seed,
    controls,
    figureLevels,
    chordFamilies: OFF_CHORD_FAMILIES,
    carryIn: request.carryIn,
    ...(steering === undefined ? {} : { steering }),
  })
}

/** The carry-in of a phrase 1 generated without a block, which every joined request receives. */
function joinedCarryIn(): CarryIn {
  const first = buildIntent({ seed: 5, controls: CONTROLS, label: 'melody-steering-phrase-1' })
  return makeCarryIn(carryInAfter(first, generateSuccess(first), 1))
}

/** Intent: the standalone and joined requests, one per seed each. */
function population(): readonly PopulationRequest[] {
  const carryIn = joinedCarryIn()
  return SEEDS.flatMap((seed) => [
    { label: 'melody-steering-standalone', seed },
    { label: 'melody-steering-joined', seed, carryIn },
  ])
}

/** Counts over the steered notes of a set of phrases. */
interface Tally {
  notes: number
  direction: number
  size: number
  successes: number
}

/** Intent: count, over a phrase's notes reached by a move, those matching the block's move. */
function tallyPhrase(
  tally: Tally,
  outcome: SuccessOutcome,
  moves: readonly MelodicMove[],
  carryIn: CarryIn | undefined,
): void {
  const midis = attackMidis(outcome.result.timeline.measures)
  const pitches = carryIn === undefined ? midis : [carryIn.lastPitch.midi, ...midis]
  for (let index = 1; index < pitches.length; index += 1) {
    const wanted = moves[(index - 1) % moves.length]!
    const made = melodicMoveBetween(pitches[index - 1]!, pitches[index]!)
    tally.notes += 1
    if (made.direction !== wanted.direction) continue
    tally.direction += 1
    if (made.direction === 'same' || (wanted.direction !== 'same' && made.size === wanted.size))
      tally.size += 1
  }
}

/** The population generated under each strength, and without a block. */
interface Results {
  readonly tallies: ReadonlyMap<SteeringStrength | 'no block', Tally>
  readonly invalid: readonly string[]
  readonly noneDiffers: readonly string[]
}

/** Intent: the timeline of a success, or a marker of the failure, to compare two generations. */
function phraseText(outcome: ReturnType<typeof generatePhrase>): string {
  return outcome.kind === 'generation_success'
    ? JSON.stringify(outcome.result.timeline)
    : `failure:${outcome.code}`
}

let cached: Results | undefined

/** Intent: the tally kept under the key, started empty the first time the key is met. */
function tallyIn(
  tallies: Map<SteeringStrength | 'no block', Tally>,
  key: SteeringStrength | 'no block',
): Tally {
  const known = tallies.get(key) ?? { notes: 0, direction: 0, size: 0, successes: 0 }
  tallies.set(key, known)
  return known
}

/** Intent: generate the population once under every strength and without a block. */
function results(): Results {
  if (cached) return cached
  const tallies = new Map<SteeringStrength | 'no block', Tally>()
  const invalid: string[] = []
  const noneDiffers: string[] = []
  for (const doodle of steeringDoodles())
    for (const request of population()) {
      const where = `${doodle.name} ${request.label} seed ${request.seed}`
      const bare = generatePhrase(intentOf(request))
      if (bare.kind === 'generation_success') {
        tallyPhrase(tallyIn(tallies, 'no block'), bare, doodle.moves, request.carryIn)
        tallyIn(tallies, 'no block').successes += 1
      }
      for (const strength of STRENGTHS) {
        const intent = intentOf(request, blockOf(doodle.moves, strength))
        const outcome = generatePhrase(intent)
        if (strength === 'none' && phraseText(outcome) !== phraseText(bare)) noneDiffers.push(where)
        if (outcome.kind !== 'generation_success') continue
        const { request: resolved, result, provenance } = outcome
        const verdict = validateGenerationResult({ intent, request: resolved, result, provenance })
        if (verdict.kind !== 'valid_generation_result') invalid.push(`${where} ${strength}`)
        tallyPhrase(tallyIn(tallies, strength), outcome, doodle.moves, request.carryIn)
        tallyIn(tallies, strength).successes += 1
      }
    }
  cached = { tallies, invalid, noneDiffers }
  return cached
}

/** Intent: the tally of one strength, which the population always fills. */
function tallyAt(key: SteeringStrength | 'no block'): Tally {
  const tally = results().tallies.get(key)
  if (!tally) throw new Error(`no phrase generated at ${key}`)
  return tally
}

/** The share of steered notes moving in the block's direction. */
function directionShare(tally: Tally): number {
  return tally.direction / tally.notes
}

/** The share of steered notes matching the block's move in direction and size. */
function sizeShare(tally: Tally): number {
  return tally.size / tally.notes
}

describe('the melody follows the steering block moves over the doodle set', () => {
  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  // @test-link [[rule_jam_drift_positions]]
  it(
    'moves in the block direction more often from none to direction only to size and direction, and matches sizes more at the last',
    () => {
      const none = tallyAt('none')
      const direction = tallyAt('direction')
      const sized = tallyAt('size-and-direction')
      expect(directionShare(direction)).toBeGreaterThan(directionShare(none))
      expect(directionShare(sized)).toBeGreaterThan(directionShare(none))
      // Both strengths put the block's direction first, so size and direction follows the
      // direction as often as direction only does, give or take the search's other choices.
      expect(directionShare(sized)).toBeGreaterThan(directionShare(direction) - DIRECTION_NOISE)
      expect(sizeShare(sized)).toBeGreaterThan(sizeShare(direction))
      expect(sizeShare(sized)).toBeGreaterThan(sizeShare(none))
    },
    POPULATION_TIMEOUT_MS,
  )

  // @test-link [[rule_doodle_only_orders_candidates]]
  it(
    'passes the validator with every phrase, and succeeds with a block at least as often as without',
    () => {
      expect(results().invalid).toEqual([])
      const bare = tallyAt('no block').successes
      for (const strength of STRENGTHS)
        expect(tallyAt(strength).successes).toBeGreaterThanOrEqual(bare)
    },
    POPULATION_TIMEOUT_MS,
  )

  // @test-link [[rule_jam_drift_positions]]
  it(
    'generates at strength none exactly the phrases generated without a block',
    () => {
      expect(results().noneDiffers).toEqual([])
    },
    POPULATION_TIMEOUT_MS,
  )

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it(
    'never reuses an ordering across two blocks: the same request under opposite blocks, then again, gives each block its own phrase',
    () => {
      const request = { label: 'melody-steering-memo', seed: 23 }
      const up = blockOf([{ direction: 'up', size: 'step' }], 'size-and-direction')
      const down = blockOf([{ direction: 'down', size: 'step' }], 'size-and-direction')
      const first = phraseText(generatePhrase(intentOf(request, up)))
      const opposite = phraseText(generatePhrase(intentOf(request, down)))
      expect(opposite).not.toBe(first)
      expect(phraseText(generatePhrase(intentOf(request, up)))).toBe(first)
      expect(phraseText(generatePhrase(intentOf(request, down)))).toBe(opposite)
    },
    POPULATION_TIMEOUT_MS,
  )
})
