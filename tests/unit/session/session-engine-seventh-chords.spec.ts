/**
 * The Seventh chords level in a session, over the engine's seams on the fake clock: the session
 * settings hold it, frozen at Start; every attempt of every rung carries it, phrase after phrase,
 * through a settings change and from a pre-generated start alike; settings without a level are
 * refused; and after `Start with this phrase` phrase 1 keeps its own level while every attempt from
 * phrase 2, the first phrase generated under the session's settings, carries the session's.
 */
import { describe, expect, it } from 'vitest'

import {
  ChordFamiliesError,
  OFF_CHORD_FAMILIES,
  type ChordFamilies,
} from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { freezeSessionSettings } from '@/session/session-intents'
import type { SessionSettings, SessionStart } from '@/session/session-types'
import { buildIntent, generateSuccess } from '../domain/generation/carry-in/carry-in-fixture'
import { phraseOneFor, SessionDriver, sessionSettings } from './session-harness'

const FAVORED: ChordFamilies = { 'seventh-chords': 'favored' }
const STRONGLY: ChordFamilies = { 'seventh-chords': 'stronglyFavored' }

/** Intent: the harness's session settings at 60 BPM with the given level and controls. */
function settingsAt(
  chordFamilies: ChordFamilies,
  controls: Parameters<typeof sessionSettings>[0] = {},
): SessionSettings {
  return { ...sessionSettings({ tempo: 60, ...controls }), chordFamilies }
}

/** Intent: a real phrase 1 generated at Idle under the settings' controls and level. */
function phraseOneAt(settings: SessionSettings): SessionStart['phraseOne'] {
  const intent = buildIntent({
    controls: settings.controls,
    seed: 11,
    label: 'phrase-1',
    chordFamilies: settings.chordFamilies,
  })
  return { intent, outcome: generateSuccess(intent) }
}

/** Intent: the level of each intent, in order. */
function levelsOf(intents: readonly GenerationIntent[]): readonly string[] {
  return intents.map((intent) => intent.chordFamilies['seventh-chords'])
}

// @test-link [[rule_session_settings_locked]]
// @test-link [[rule_vary_settings_never_moves_seventh_chords_level]]
// @test-link [[service_session_engine]]
describe('a session generates every attempt at the level it started with', () => {
  // @test-link [[rule_session_settings_locked]]
  it.each([OFF_CHORD_FAMILIES, FAVORED, STRONGLY])(
    'carries $seventh-chords into the four carry-in rungs and the standalone retry',
    (chordFamilies) => {
      const settings = settingsAt(chordFamilies)
      const driver = new SessionDriver({ settings, phraseOne: phraseOneFor(settings) })
      for (let rung = 0; rung < 4; rung += 1) driver.fail(0.1 + rung / 10)

      const requests = driver.requests(2)
      expect(requests.map((request) => request.step)).toEqual([
        'carry-in',
        'carry-in',
        'carry-in',
        'carry-in',
        'standalone',
      ])
      const level = chordFamilies['seventh-chords']
      expect(levelsOf(requests.map((request) => request.intent))).toEqual(Array(5).fill(level))
    },
  )

  // @test-link [[rule_session_settings_locked]]
  it("carries it into the next phrase's attempts once phrase 2 is decided", () => {
    const settings = settingsAt(FAVORED)
    const driver = new SessionDriver({ settings, phraseOne: phraseOneFor(settings) })
    driver.settle(0.1)
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)

    const third = driver.requests(3)
    expect(third.length).toBeGreaterThan(0)
    expect(levelsOf(third.map((request) => request.intent))).toEqual(
      Array(third.length).fill('favored'),
    )
  })

  // @test-link [[rule_session_settings_locked]]
  // @test-link [[module_session_settings_change]]
  it('keeps it through a settings change from an automatic source', () => {
    const settings = settingsAt(FAVORED)
    const driver = new SessionDriver({ settings, phraseOne: phraseOneFor(settings) })
    driver.settle(0.1)
    driver.change(0.2, settingsAt(FAVORED, { harmonicMotion: 'Active diatonic' }))
    driver.tick(4)
    driver.countInOver(4)
    driver.sounding(20, 2)

    const third = driver.requests(3)
    expect(third[0]?.intent.controls.harmonicMotion).toBe('Active diatonic')
    expect(levelsOf(third.map((request) => request.intent))).toEqual(
      Array(third.length).fill('favored'),
    )
  })

  // @test-link [[rule_session_settings_locked]]
  it('refuses settings without exactly one known level per chord family', () => {
    const { chordFamilies, ...withoutLevel } = settingsAt(FAVORED)
    void chordFamilies

    expect(() => freezeSessionSettings(withoutLevel as unknown as SessionSettings)).toThrow(
      ChordFamiliesError,
    )
    expect(() =>
      freezeSessionSettings({
        ...settingsAt(FAVORED),
        chordFamilies: { 'seventh-chords': 'always' } as unknown as ChordFamilies,
      }),
    ).toThrow(ChordFamiliesError)
    expect(freezeSessionSettings(settingsAt(FAVORED)).chordFamilies).toEqual(FAVORED)
  })
})

// @test-link [[rule_stale_phrase_prompt_at_start]]
// @test-link [[service_session_engine]]
describe('a session started with this phrase, phrase 1 made at another level', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it.each([
    ['Off', 'Often', OFF_CHORD_FAMILIES, FAVORED],
    ['Mostly', 'Off', STRONGLY, OFF_CHORD_FAMILIES],
  ] as const)(
    'phrase 1 at %s keeps its own level; every attempt from phrase 2 carries the session level %s',
    (_from, _to, phraseOneLevel, sessionLevel) => {
      const idle = settingsAt(phraseOneLevel)
      const session = settingsAt(sessionLevel)
      const phraseOne = phraseOneAt(idle)
      const driver = new SessionDriver({ settings: session, phraseOne, phraseOneSettings: idle })
      for (let rung = 0; rung < 4; rung += 1) driver.fail(0.1 + rung / 10)

      expect(driver.start.phraseOne.intent.chordFamilies).toEqual(phraseOneLevel)
      const second = driver.requests(2)
      expect(second).toHaveLength(5)
      const level = sessionLevel['seventh-chords']
      expect(levelsOf(second.map((request) => request.intent))).toEqual(Array(5).fill(level))
    },
  )
})
