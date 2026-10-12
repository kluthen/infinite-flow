/**
 * The session engine on the session seed plan: every attempt's seed is its rung's seed from the
 * session seed, whatever happened before it: the standalone attempt gets rung 4's seed however
 * many rungs ran (none at a fast tempo, one after an exhausted carry-in search, a cut-over rung,
 * or all four), its request id stays the one it would have had, the next phrase's seeds do not
 * depend on how its phrase before went, the tempo changes no seed, a phrase requested again after
 * a settings change gets the same seeds, and the session draws no seed from any provider.
 */

import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { phraseAttemptSeed, settingsMutationSeed } from '@/session/session-seed-plan'
import { cutoverAt } from '@/session/session-timing'
import { driveSession, fastDriver, soundingAt } from './scripted-session'
import {
  SessionDriver,
  phraseOneFor,
  queuedProviders,
  sessionSettings,
  type GenerationRequestOutput,
} from './session-harness'
import { SHAPED, requestIn, threeRequested } from './settings-change-session'

/** The session seed every driver of this file starts from. */
const SESSION_SEED = makeSeed(0x0badf00d)

/** Intent: a driver from `SESSION_SEED` at a tempo (60 BPM by default) started at 0. */
function driverAt(tempo = 60): SessionDriver {
  const settings = sessionSettings({ tempo })
  return new SessionDriver({
    at: 0,
    settings,
    phraseOne: phraseOneFor(settings),
    sessionSeed: SESSION_SEED,
  })
}

/** Intent: check a request is phrase 2's standalone attempt with rung 4's seed and request id. */
function expectPlannedStandalone(request: GenerationRequestOutput): void {
  expect(request).toMatchObject({ phraseNumber: 2, step: 'standalone', retry: 4 })
  expect(request.intent.seed).toBe(phraseAttemptSeed(SESSION_SEED, 2, 4))
  expect(request.intent.requestId).toBe('session-5')
}

/** Intent: let phrase 1 then phrase 2 start sounding in a 60 BPM driver, so phrase 3 is requested. */
function reachPhraseThree(driver: SessionDriver): void {
  driver.tick(4)
  driver.countInOver(4)
  driver.sounding(20, 2)
}

// @test-link [[module_session_seed_plan]]
describe('attempt seeds from the session seed plan', () => {
  // @test-link [[module_session_seed_plan]]
  it("gives every carry-in rung its own rung's seed", () => {
    const driver = driverAt()
    for (let rung = 0; rung < 3; rung += 1) driver.fail(0.1 * (rung + 1))
    const seeds = driver.requests(2).map((request) => request.intent.seed)
    expect(seeds).toEqual([0, 1, 2, 3].map((rung) => phraseAttemptSeed(SESSION_SEED, 2, rung)))
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the standalone attempt first at a fast tempo the seed of rung 4', () => {
    const driver = driverAt(240)
    expect(driver.requests(2)).toHaveLength(1)
    expectPlannedStandalone(driver.lastRequest())
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the standalone attempt after an exhausted carry-in search the seed of rung 4', () => {
    const driver = driverAt()
    driver.fail(0.1, undefined, 'no_legal_pitch_plan')
    expect(driver.requests(2)).toHaveLength(2)
    expectPlannedStandalone(driver.lastRequest())
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the standalone attempt after four failed carry-in rungs the seed of rung 4', () => {
    const driver = driverAt()
    for (let rung = 0; rung < 4; rung += 1) driver.fail(0.1 * (rung + 1))
    expect(driver.requests(2)).toHaveLength(5)
    expectPlannedStandalone(driver.lastRequest())
  })

  // @test-link [[module_session_seed_plan]]
  it.each([0, 1, 2])(
    'gives the standalone attempt cut over from carry-in rung %i the seed of rung 4',
    (failedFirst) => {
      const driver = driverAt()
      for (let rung = 0; rung < failedFirst; rung += 1) driver.fail(0.1 * (rung + 1))
      expectPlannedStandalone(requestIn(driver.tick(cutoverAt(4))))
    },
  )

  // @test-link [[module_session_seed_plan]]
  it('gives the next phrase the same seeds however many rungs its phrase before ran', () => {
    const smooth = driverAt()
    smooth.accept(0.1)
    const climbed = driverAt()
    for (let rung = 0; rung < 4; rung += 1) climbed.fail(0.1 * (rung + 1))
    climbed.accept(0.6)
    reachPhraseThree(smooth)
    reachPhraseThree(climbed)
    smooth.fail(20.5)
    climbed.fail(20.5)
    /** Intent: the seeds of every request made so far for phrase 3. */
    const seedsOf = (driver: SessionDriver) =>
      driver.requests(3).map((request) => request.intent.seed)
    expect(seedsOf(smooth)).toEqual([
      phraseAttemptSeed(SESSION_SEED, 3, 0),
      phraseAttemptSeed(SESSION_SEED, 3, 1),
    ])
    expect(seedsOf(climbed)).toEqual(seedsOf(smooth))
    expect(climbed.requests(3)[0]!.intent.requestId).not.toBe(
      smooth.requests(3)[0]!.intent.requestId,
    )
  })

  // @test-link [[module_session_seed_plan]]
  it('changes no attempt seed with the tempo', () => {
    const slow = driverAt(60)
    for (let rung = 0; rung < 4; rung += 1) slow.fail(0.1 * (rung + 1))
    const fast = driverAt(240)
    expect(slow.lastRequest().intent.seed).toBe(fast.lastRequest().intent.seed)
    expect(slow.requests(2).map((request) => request.intent.seed)).toEqual(
      [0, 1, 2, 3, 4].map((rung) => phraseAttemptSeed(SESSION_SEED, 2, rung)),
    )
  })

  // @test-link [[module_session_seed_plan]]
  it('gives a phrase requested again after a settings change the same seeds', () => {
    const sessionSeed = fastDriver().start.sessionSeed
    const driver = threeRequested(false)
    const first = driver.lastRequest()
    const again = requestIn(driver.change(soundingAt(2) + 0.5, SHAPED))
    expect(again).toMatchObject({ phraseNumber: 3, retry: first.retry })
    expect(again.intent.seed).toBe(first.intent.seed)
    expect(again.intent.seed).toBe(phraseAttemptSeed(sessionSeed, 3, first.retry))
    expect(again.intent.requestId).not.toBe(first.intent.requestId)
  })

  // @test-link [[module_session_seed_plan]]
  it('draws no seed from any provider during a session, Vary settings on included', () => {
    const providers = queuedProviders()
    const settings = sessionSettings({ tempo: 240 })
    const driver = new SessionDriver({
      at: 0,
      settings,
      phraseOne: phraseOneFor(settings),
      sessionSeed: SESSION_SEED,
      providers,
      mutation: { kind: 'on', seed: settingsMutationSeed(SESSION_SEED) },
    })
    driveSession(driver, 8, (phraseNumber) => phraseNumber % 2 === 0)
    expect(driver.requests().length).toBeGreaterThan(8)
    expect(providers.seedsHandedOut).toEqual([])
  })
})
