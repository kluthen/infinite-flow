/**
 * The session engine when a scheduled mutation meets a dead end mid-session. No step-down leaves
 * one in the real catalog (no rhythm combination generated with Eighth is blocked, so a stepped-
 * down session always keeps a rhythm move, and step-down only ever unblocks the other groups'
 * steps), so the dead end is reached the way the rhythm lock will reach it: a session started
 * with only the Rhythm group allowed, the lock off (a legal move at the start), gets the lock
 * turned on by an automatic settings change. The mutation then due is skipped, recorded in the
 * session history and nowhere else, nothing throws, and the next mutation still lands on its own
 * phrase, drawn from its own stream.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { makeSeed } from '@/domain/random/seed'
import { createSessionHistory } from '@/session/session-history'
import { mutationContextAtStart } from '@/session/session-mutation-step'
import type { SessionOutput, SessionSettings } from '@/session/session-types'
import { hasLegalMove, mutationPhrase, type MutationContext } from '@/session/settings-mutation'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import { FAST_TEMPO, fastDriver, settingsChanges, soundingAt } from './scripted-session'
import {
  DEFAULT_SESSION_SEED,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
  type SessionDriver,
} from './session-harness'
import { mutatedMove } from './settings-mutation-moves'
import { groupsOn } from './vary-settings-groups-cases'

/** Settings with only the Rhythm group allowed, the rhythm lock off: a legal move at the start. */
const ONLY_RHYTHM: SessionSettings = {
  ...sessionSettings({ tempo: FAST_TEMPO }),
  allowedGroups: groupsOn(['rhythm']),
}

/** The same settings with the rhythm lock on: no group left to move, a dead end. */
const LOCKED: SessionSettings = { ...ONLY_RHYTHM, rhythmLockOn: true }

/** The context every mutation of these sessions sees: wide, no step-down, phrase 1's register. */
const CONTEXT: MutationContext = mutationContextAtStart(phraseOneFor(ONLY_RHYTHM), false)

/** The app version the kept records are written with. */
const APP_VERSION = '3.2.0-test'

/**
 * Intent: the first mutation seed whose first two mutations, drawn from the unlocked settings,
 * differ, so a second mutation drawn from the first one's stream would show.
 */
function seedWithDistinctFirstMoves(): number {
  for (let seed = 1; seed < 100; seed += 1) {
    const first = mutatedMove(ONLY_RHYTHM, CONTEXT, makeSeed(seed), 1)
    const second = mutatedMove(ONLY_RHYTHM, CONTEXT, makeSeed(seed), 2)
    if (JSON.stringify(first.settings) !== JSON.stringify(second.settings)) return seed
  }
  throw new Error('No seed below 100 draws two different first moves.')
}

/**
 * Intent: a fast session started on ONLY_RHYTHM with Vary settings on: the rhythm lock turned on
 * in the count-in (in effect from phrase 3), turned off again once phrase `unlockAfter` sounds,
 * every phrase answered with its real outcome, run until phrase `lastSounding` sounds, then ended.
 */
function lockedSession(seed: number, unlockAfter: number, lastSounding: number): SessionDriver {
  const driver = fastDriver({
    settings: ONLY_RHYTHM,
    mutation: { kind: 'on', seed: makeSeed(seed) },
  })
  driver.change(0.25, LOCKED)
  driver.settle(0.5)
  driver.tick(1)
  driver.countInOver(soundingAt(1))
  for (let phraseNumber = 2; phraseNumber <= lastSounding; phraseNumber += 1) {
    const at = soundingAt(phraseNumber)
    driver.sounding(at, phraseNumber)
    if (phraseNumber === unlockAfter) driver.change(at + 0.25, ONLY_RHYTHM)
    driver.settle(at + 0.5)
    driver.tick(at + 3)
  }
  driver.end(soundingAt(lastSounding) + 3.5)
  return driver
}

/** Intent: a history of the session fed `outputs` in order, as the session controller feeds it. */
function historyOf(driver: SessionDriver, outputs: readonly SessionOutput[]) {
  const history = createSessionHistory(
    driver.settings,
    fixedWallClock,
    DEFAULT_SESSION_SEED,
    'treble',
  )
  for (const output of outputs) history.record(output)
  return history
}

// @test-link [[rule_vary_settings_skips_dead_end]]
// @test-link [[rule_mutation_lands_on_scheduled_phrase]]
describe('a scheduled mutation meeting a dead end mid-session', () => {
  let seed: number
  let first: number
  let second: number
  let driver: SessionDriver

  beforeAll(() => {
    seed = seedWithDistinctFirstMoves()
    first = mutationPhrase(makeSeed(seed), 1)
    second = mutationPhrase(makeSeed(seed), 2)
    driver = lockedSession(seed, first, second)
  })

  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  // @test-link [[service_session_engine]]
  it('is skipped once, throwing nothing: no change for it, the session runs on and the next mutation lands on its phrase from its own stream', () => {
    expect(hasLegalMove(ONLY_RHYTHM, CONTEXT)).toBe(true)
    expect(hasLegalMove(LOCKED, CONTEXT)).toBe(false)
    expect(first).toBeGreaterThanOrEqual(3)

    expect(driver.all('mutation-skipped')).toStrictEqual([
      { kind: 'mutation-skipped', phraseNumber: first, mutationNumber: 1 },
    ])
    const skipped = driver.log.findIndex((output) => output.kind === 'mutation-skipped')
    expect(driver.log[skipped + 1]).toMatchObject({
      kind: 'request-generation',
      phraseNumber: first,
      retry: 0,
    })
    for (const request of driver.requests(first))
      expect(request.intent.controls).toEqual(LOCKED.controls)

    const moves = settingsChanges(driver).filter((change) => change.cause === 'mutation')
    const expected = mutatedMove(ONLY_RHYTHM, CONTEXT, makeSeed(seed), 2)
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({
      phraseNumber: second,
      setting: expected.setting,
      from: expected.from,
      to: expected.to,
      settings: expected.settings,
    })
    expect(
      settingsChanges(driver).map((change) => [change.phraseNumber, change.cause]),
    ).toStrictEqual([
      [3, 'automatic'],
      [first + 1, 'automatic'],
      [second, 'mutation'],
    ])
    expect(driver.requests(second)[0]?.intent.controls).toEqual(expected.settings.controls)

    expect(driver.all('phrase-sounding').at(-1)?.phrase.phraseNumber).toBe(second)
    expect(driver.all('ended')).toMatchObject([{ soundedPhraseCount: second }])
  })

  // @test-link [[rule_vary_settings_skips_dead_end]]
  // @test-link [[service_session_history]]
  it('is kept in the session history in memory, while the kept session record is unchanged', () => {
    const history = historyOf(driver, driver.log)
    expect(history.skippedMutations()).toStrictEqual([{ phraseNumber: first, mutationNumber: 1 }])

    const withoutSkip = historyOf(
      driver,
      driver.log.filter((output) => output.kind !== 'mutation-skipped'),
    )
    expect(withoutSkip.skippedMutations()).toStrictEqual([])
    const facts = {
      pinned: false,
      favorites: [2],
      comment: '',
      playedNotesKept: false,
      presets: BUILT_IN_PRESETS,
    }
    expect(encodeKeptSession(history, facts, APP_VERSION)).toStrictEqual(
      encodeKeptSession(withoutSkip, facts, APP_VERSION),
    )
  })
})
