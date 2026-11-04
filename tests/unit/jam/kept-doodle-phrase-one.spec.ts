// @vitest-environment node
/**
 * Phrase 1 written at Jam mode's Idle from the kept doodle, its climb in Jam's code: the three
 * rungs of a fresh Jam's phrase 1 with no deadline (rung 1's four attempts, rung 2, then v2's
 * standalone phrase, which leaves none after it), `no_legal_pitch_plan` on rung 1 jumping to rung
 * 2, a doodle with no join starting on rung 2; each attempt built afresh, with a new request id
 * and seed, the window's width as it stands, never stepped down.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeRequestId } from '@/domain/generation/generation-request-envelope'
import { makeSeed } from '@/domain/random/seed'
import { climbKeptDoodleLadder } from '@/jam/kept-doodle-phrase-one'
import type { JamPhraseOneSettings } from '@/jam/jam-phrase-one-attempts'
import type { PhraseOneAttemptResult } from '@/session/session-types'

import { KEPT_DOODLE } from '../components/workspace/reviewed-jam-part-fixture'
import { sessionSettings } from '../session/session-harness'

/** Jam's settings phrase 1 is written under: 120 BPM, drift Near. */
const JAM: JamPhraseOneSettings = { settings: sessionSettings({ tempo: 120 }), drift: 'Near' }

/** A failure that moves on to the next attempt, whatever the rung. */
const SEARCH_LIMIT: PhraseOneAttemptResult = {
  kind: 'generation-failure',
  code: 'search_limit_exceeded',
}

/** A rung 1 failure whose search covered every candidate. */
const NO_LEGAL_PLAN: PhraseOneAttemptResult = {
  kind: 'generation-failure',
  code: 'no_legal_pitch_plan',
}

/** Intent: a climb over counted seams, the window below the tablet width while `below` says so. */
function climbOf(doodle = KEPT_DOODLE.quantized, below = { now: false }) {
  const counts = { id: 0, seed: 0 }
  const climb = climbKeptDoodleLadder(doodle, JAM, {
    nextRequestId: () => makeRequestId(`idle-${++counts.id}`),
    nextSeed: () => makeSeed(++counts.seed),
    isBelowTabletLandscape: () => below.now,
  })
  return { climb, counts, below }
}

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe("phrase 1's climb from the kept doodle at Idle", () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('climbs rung 1, then rung 2, then the standalone phrase, and leaves none after it', () => {
    const { climb } = climbOf()
    const reached: [number, string, boolean][] = []
    let more = true
    while (more) {
      const attempt = climb.attempt()
      reached.push([attempt.index, attempt.step, attempt.intent.steering !== undefined])
      more = climb.failed(SEARCH_LIMIT)
    }

    expect(reached).toEqual([
      [0, 'carry-in', true],
      [1, 'carry-in', true],
      [2, 'carry-in', true],
      [3, 'carry-in', true],
      [4, 'standalone', true],
      [5, 'standalone', false],
    ])
  })

  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('jumps from rung 1 to rung 2 on no_legal_pitch_plan', () => {
    const { climb } = climbOf()

    expect(climb.attempt().index).toBe(0)
    expect(climb.failed(NO_LEGAL_PLAN)).toBe(true)
    expect(climb.attempt().index).toBe(4)
    expect(climb.failed(NO_LEGAL_PLAN)).toBe(true)
    expect(climb.attempt().index).toBe(5)
    expect(climb.failed({ kind: 'crash' })).toBe(false)
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('starts on rung 2 when the doodle gives no join', () => {
    const outOfRange = makeQuantizedDoodle({
      measureCount: 1,
      notes: [
        { startTick: 0, lengthTicks: 8, pitch: 60 },
        { startTick: 8, lengthTicks: 8, pitch: 120 },
      ],
    })
    const { climb } = climbOf(outOfRange)

    const first = climb.attempt()

    expect(first.index).toBe(4)
    expect(first.step).toBe('standalone')
    expect(first.intent.steering).toBeDefined()
  })

  // @test-link [[module_session_seed_plan]]
  it('builds each attempt afresh, a new id and seed each, on the same attempt until one fails', () => {
    const { climb, counts, below } = climbOf()

    const first = climb.attempt()
    below.now = true
    const replacement = climb.attempt()

    expect(first.index).toBe(replacement.index)
    expect([first.intent.seed, replacement.intent.seed]).toEqual([makeSeed(1), makeSeed(2)])
    expect([first.intent.requestId, replacement.intent.requestId]).toEqual([
      makeRequestId('idle-1'),
      makeRequestId('idle-2'),
    ])
    expect(counts).toEqual({ id: 2, seed: 2 })
    expect(first.steppedDown).toBe(false)
    expect(replacement.steering).toBe(first.steering)
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it("writes under Jam's settings with the doodle's readings, the tempo Jam's", () => {
    const { climb } = climbOf()

    const attempt = climb.attempt()

    expect(attempt.settings.controls.tempo).toBe(120)
    expect(attempt.settings.rhythmLockOn).toBe(false)
    expect(attempt.intent.controls.tempo).toBe(120)
  })
})
