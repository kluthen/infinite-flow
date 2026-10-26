/**
 * The rhythm lock in a session, on the fake clock with real generation: off, no request carries a
 * lock group; on, phrase 1's written bars are locked at Start and every request from phrase 2 on,
 * on every rung, carries them with the allowed changes and the tenser flag. With no change
 * allowed, every phrase keeps phrase 1's bars but for forced bends, which the history records;
 * with changes allowed, a phrase makes at most one, never carried into a later request, and tenser
 * phrases draw about twice as often as the others.
 */

import { describe, expect, it } from 'vitest'

import type { TensionArc } from '@/domain/controls/generation-controls'
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { makeSeed } from '@/domain/random/seed'
import { rhythmChangeBetween } from '@/domain/rhythm/rhythm-change-kinds'
import { phraseRhythmLockRecord } from '@/session/rhythm-lock-session'
import type { SessionPhrase } from '@/session/session-types'
import { FAST_TEMPO, driveSession, fastDriver, settingsFor } from './scripted-session'
import { sessionSettings, type SessionDriver } from './session-harness'
import {
  barsOf,
  decidedPhrases,
  expectedGroup,
  expectedTenser,
  historyOf,
  lockSettings,
} from './rhythm-lock-sessions'
import { groupsOn } from './vary-settings-groups-cases'

/** How many phrases each session sounds; phrases 2 to `SOUNDED + 1` are requested. */
const SOUNDED = 10

/**
 * One seeded lock session: its chosen tension, Tension across phrases, its session seed, and the
 * density phrase 1 was generated with at Idle when it differs from the chosen Quarter (a stale
 * phrase 1, which Start takes as it is).
 */
interface LockCase {
  readonly tension: TensionArc
  readonly arc: boolean
  readonly seed: number
  readonly phraseOneDensity?: 'Eighth'
}

/** Intent: the session seed of case `index`, spread over the 32 bits. */
function caseSeed(index: number): number {
  return Math.imul(0x9e37_79b1, index + 1) >>> 0
}

/**
 * Sessions with no change allowed, Build under the arc among them; one starts from a stale
 * phrase 1 at Eighth whose bars the chosen Quarter's rhythms never hold, so forced bends occur.
 */
const STRICT_CASES: readonly LockCase[] = [
  { tension: 'Build', arc: true, seed: caseSeed(0) },
  { tension: 'Build', arc: true, seed: caseSeed(1), phraseOneDensity: 'Eighth' },
  { tension: 'Lift', arc: true, seed: caseSeed(2) },
  { tension: 'Settled', arc: false, seed: caseSeed(3) },
  { tension: 'Edge', arc: true, seed: caseSeed(4) },
]

/** Intent: a lock session of one case with these changes allowed, run until SOUNDED sounds. */
function lockSession(
  lockCase: LockCase,
  allowed: readonly (typeof RHYTHM_CHANGE_KINDS)[number][],
): SessionDriver {
  const driver = fastDriver({
    settings: lockSettings(allowed, { tension: lockCase.tension }),
    sessionSeed: makeSeed(lockCase.seed),
    multiPhraseTensionArc: lockCase.arc,
    ...(lockCase.phraseOneDensity === undefined
      ? {}
      : { phraseOneDensity: lockCase.phraseOneDensity }),
  })
  driveSession(driver, SOUNDED)
  return driver
}

/** Intent: the generated phrases a driver decided, repeats left out. */
function generatedPhrases(driver: SessionDriver): readonly SessionPhrase[] {
  return decidedPhrases(driver).filter((phrase) => phrase.origin !== 'repeat')
}

/** Intent: expect every request of a lock session to carry phrase 1's bars and its own flag. */
function expectEveryRequestLocked(driver: SessionDriver, lockCase: LockCase): void {
  const locked = barsOf(driver.phraseOne.outcome)
  const allowed = driver.settings.allowedRhythmChanges
  expect(driver.requests().length).toBeGreaterThanOrEqual(SOUNDED)
  for (const request of driver.requests())
    expect(request.intent.rhythmLock, `phrase ${request.phraseNumber}`).toEqual(
      expectedGroup(
        locked,
        allowed,
        expectedTenser(lockCase.arc, request.phraseNumber, lockCase.tension),
      ),
    )
}

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
describe('a session with the rhythm lock off', () => {
  // @test-link [[module_session_rhythm_lock]]
  it('builds no request with a rhythm lock group, whatever changes are allowed', () => {
    const settings = {
      ...sessionSettings({ tempo: FAST_TEMPO, tension: 'Build' }),
      allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
    }
    const driver = fastDriver({ settings, multiPhraseTensionArc: true })
    driveSession(driver, 6)
    expect(driver.requests().length).toBeGreaterThanOrEqual(6)
    for (const request of driver.requests()) expect(request.intent).not.toHaveProperty('rhythmLock')
    for (const record of historyOf(driver).phrases())
      expect(phraseRhythmLockRecord(record)).toBeUndefined()
  })
})

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_locked_rhythm_is_phrase_one]]
// @test-link [[rule_rhythm_lock_strict]]
// @test-link [[rule_forced_bend]]
describe('a session with the rhythm lock on and no change allowed', () => {
  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  // @test-link [[rule_rhythm_lock_strict]]
  // @test-link [[rule_forced_bend]]
  // @test-link [[entity_request_rhythm_lock]]
  it("keeps phrase 1's bars on every phrase but a forced bend, which the history records", () => {
    let forcedBends = 0
    for (const lockCase of STRICT_CASES) {
      const driver = lockSession(lockCase, [])
      expectEveryRequestLocked(driver, lockCase)
      const locked = barsOf(driver.phraseOne.outcome)
      for (const phrase of generatedPhrases(driver)) {
        const { rhythmLockOutcome, rhythmChange } = phrase.outcome.provenance
        expect(rhythmChange, `phrase ${phrase.phraseNumber}`).toBeUndefined()
        expect(['locked_bars', 'forced_bend']).toContain(rhythmLockOutcome)
        if (rhythmLockOutcome === 'locked_bars') expect(barsOf(phrase.outcome)).toEqual(locked)
        else forcedBends += 1
      }
      for (const record of historyOf(driver).phrases().slice(1)) {
        const expected =
          record.outcome.provenance.rhythmLockOutcome === 'forced_bend' ? 'forced_bend' : 'locked'
        expect(phraseRhythmLockRecord(record)).toEqual({ lock: expected, noChangeAvailable: false })
      }
      expect(phraseRhythmLockRecord(historyOf(driver).phrases()[0]!)).toBeUndefined()
    }
    expect(forcedBends).toBeGreaterThan(0)
  })
})

/** Sessions with every change allowed: some with the arc, so tenser phrases occur. */
const DRAW_CASES: readonly LockCase[] = Array.from({ length: 12 }, (_, index) => ({
  tension: (['Settled', 'Lift', 'Build'] as const)[index % 3]!,
  arc: index % 4 !== 3,
  seed: caseSeed(10 + index),
}))

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_rhythm_change_lasts_one_phrase]]
// @test-link [[rule_rhythm_change_share]]
describe('a session with the rhythm lock on and every change allowed', () => {
  const drivers = DRAW_CASES.map((lockCase) => ({
    lockCase,
    driver: lockSession(lockCase, RHYTHM_CHANGE_KINDS),
  }))

  // @test-link [[rule_rhythm_change_lasts_one_phrase]]
  // @test-link [[entity_request_rhythm_lock]]
  it("makes at most one change per phrase and carries phrase 1's bars into every request", () => {
    let changes = 0
    for (const { lockCase, driver } of drivers) {
      expectEveryRequestLocked(driver, lockCase)
      const locked = driver.phraseOne.outcome.provenance.rhythm.bars
      for (const phrase of generatedPhrases(driver)) {
        const { rhythmLockOutcome, rhythmChange } = phrase.outcome.provenance
        if (rhythmLockOutcome !== 'rhythm_change') {
          expect([undefined, 'no_change_available']).toContain(rhythmChange)
          continue
        }
        changes += 1
        const change = rhythmChangeBetween(locked, phrase.outcome.provenance.rhythm.bars)
        expect(change?.kind, `phrase ${phrase.phraseNumber}`).toBe(rhythmChange)
      }
    }
    expect(changes).toBeGreaterThan(0)
  })

  // @test-link [[rule_rhythm_change_share]]
  it('draws on tenser phrases about twice as often as on the others', () => {
    const drew = { tenser: [0, 0], other: [0, 0] }
    for (const { lockCase, driver } of drivers)
      for (const phrase of generatedPhrases(driver)) {
        const tenser = expectedTenser(lockCase.arc, phrase.phraseNumber, lockCase.tension)
        const tally = tenser ? drew.tenser : drew.other
        tally[0]! += phrase.outcome.provenance.rhythmChange === undefined ? 0 : 1
        tally[1]! += 1
      }
    const share = ([count, total]: number[]) => count! / total!
    expect(drew.tenser[1]).toBeGreaterThan(10)
    expect(share(drew.tenser)).toBeGreaterThan(share(drew.other) * 1.5)
    expect(share(drew.tenser)).toBeGreaterThan(0.3)
    expect(share(drew.tenser)).toBeLessThan(0.75)
    expect(share(drew.other)).toBeGreaterThan(0.1)
    expect(share(drew.other)).toBeLessThan(0.4)
  })
})

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_session_generation_failure_ladder]]
describe('the rhythm lock on every rung of the failure ladder', () => {
  // @test-link [[module_session_rhythm_lock]]
  // @test-link [[entity_request_rhythm_lock]]
  it('carries the same group on every carry-in retry and on the standalone attempt', () => {
    const lockCase: LockCase = { tension: 'Lift', arc: true, seed: 0x30c_0001 }
    const driver = fastDriver({
      settings: lockSettings(['split_note', 'note_rest'], { tension: lockCase.tension, tempo: 60 }),
      sessionSeed: makeSeed(lockCase.seed),
      multiPhraseTensionArc: lockCase.arc,
    })
    driver.exhaust(0.1)
    const requests = driver.requests(2)
    expect(requests.map((request) => request.step)).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'standalone',
    ])
    const group = expectedGroup(barsOf(driver.phraseOne.outcome), ['split_note', 'note_rest'], true)
    for (const request of requests) expect(request.intent.rhythmLock).toEqual(group)
  })
})

// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_rhythm_change_share]]
describe("the tenser flag of a session's requests", () => {
  // @test-link [[rule_rhythm_change_share]]
  it.each(['Settled', 'Lift', 'Build', 'Edge'] as const)(
    'is set on phrases 2, 6 and 10 only, under Tension across phrases below Edge (%s)',
    (tension) => {
      for (const arc of [true, false]) {
        const driver = fastDriver({
          settings: lockSettings([], { tension }),
          multiPhraseTensionArc: arc,
        })
        driveSession(driver, SOUNDED)
        const tenser = new Set(
          driver
            .requests()
            .filter((request) => request.intent.rhythmLock?.tenserPhrase === true)
            .map((request) => request.phraseNumber),
        )
        expect([...tenser]).toEqual(arc && tension !== 'Edge' ? [2, 6, 10] : [])
      }
    },
  )

  // @test-link [[rule_rhythm_change_share]]
  // @test-link [[rule_multi_phrase_tension_arc_cycle]]
  it('follows the tension in effect, and never a Vary settings tension step', () => {
    for (const arc of [true, false]) {
      const settings = {
        ...lockSettings([], { tension: 'Lift' }),
        allowedGroups: groupsOn(['tension']),
      }
      const driver = fastDriver({
        settings,
        mutation: { kind: 'on', seed: makeSeed(0x7e_0001) },
        multiPhraseTensionArc: arc,
      })
      driveSession(driver, 16)
      const tensions = new Set(
        driver.requests().map((request) => settingsFor(driver, request).controls.tension),
      )
      expect(tensions.size).toBeGreaterThan(1)
      for (const request of driver.requests()) {
        const inEffect = settingsFor(driver, request).controls.tension
        expect(request.intent.rhythmLock?.tenserPhrase, `phrase ${request.phraseNumber}`).toBe(
          expectedTenser(arc, request.phraseNumber, inEffect),
        )
      }
    }
  })
})
