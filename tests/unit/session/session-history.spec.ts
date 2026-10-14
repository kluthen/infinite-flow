/**
 * The session history: it records every phrase the engine outputs as sounding, in order, with the
 * shown outcome, the reproduction inputs, the tempo and the internal repeat mark, and empty slots
 * for acknowledgements and played notes. Read-ahead phrases and a count-in that ended are never
 * recorded, and outputs a session cannot produce are refused. Driven by real engine outputs.
 */

import { describe, expect, it, vi, type Mock } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { makeSeed, type Seed } from '@/domain/random/seed'
import {
  SessionHistoryError,
  createSessionHistory,
  type SessionHistory,
} from '@/session/session-history'
import type { SessionOutput, SessionPhrase } from '@/session/session-types'
import {
  DEFAULT_SESSION_SEED,
  SESSION_START_EPOCH_MS,
  SessionDriver,
  fakeViewport,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
  successFor,
  type OutputOf,
} from './session-harness'
import { driveTempoSession, phraseStartAt, tempoDriver, tempoMap } from './tempo-session'

/** Intent: a driver at 240 BPM (a 1 s measure) started at 0, so phrase 2's deadline is 1. */
function fastDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240 })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

/** Intent: a history for the driver's session, fed every output the driver has logged so far. */
function historyOf(driver: SessionDriver): SessionHistory {
  const history = createSessionHistory(
    driver.settings,
    fixedWallClock,
    DEFAULT_SESSION_SEED,
    'treble',
  )
  for (const output of driver.log) history.record(output)
  return history
}

/**
 * Intent: phrase 2 accepted in the count-in, phrase 1 then phrase 2 sounding, phrase 3 accepted
 * and shown as read-ahead, then Stop before phrase 3 sounds.
 */
function sessionWithReadAheadAtStop(): SessionDriver {
  const driver = fastDriver()
  driver.accept(0.5)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.end(6)
  return driver
}

/** Intent: the phrase-sounding outputs a driver logged, in order. */
function soundings(driver: SessionDriver): readonly OutputOf<'phrase-sounding'>[] {
  return driver.all('phrase-sounding')
}

// @test-link [[service_session_history]]
// @test-link [[rule_session_history_keeps_timeline_and_inputs]]
describe('what the session history records', () => {
  // @test-link [[rule_session_history_keeps_timeline_and_inputs]]
  it('records each phrase that started sounding, in order, and no read-ahead phrase', () => {
    const driver = sessionWithReadAheadAtStop()
    const readAhead = driver.all('phrase-ready').map((output) => output.phrase.phraseNumber)
    expect(readAhead).toContain(3)

    const history = historyOf(driver)

    expect(history.phrases().map((record) => record.phraseNumber)).toEqual([1, 2])
    expect(history.phrases().map((record) => record.startedAt)).toEqual([1, 5])
    expect(history.phraseCount).toBe(2)
  })

  // @test-link [[service_session_history]]
  it('records nothing for a session ended during the count-in', () => {
    const driver = fastDriver()
    driver.accept(0.5)
    driver.end(0.8)
    expect(driver.all('phrase-ready')).toHaveLength(1)

    const history = historyOf(driver)

    expect(history.phrases()).toEqual([])
    expect(history.phraseCount).toBe(0)
  })

  // @test-link [[rule_session_history_keeps_timeline_and_inputs]]
  it('keeps the shown outcome, the intent with seed and carry-in, and the tempo', () => {
    const driver = sessionWithReadAheadAtStop()
    const [one, two] = historyOf(driver).phrases()
    const [soundingOne, soundingTwo] = soundings(driver)

    expect(one!.outcome).toBe(soundingOne!.phrase.outcome)
    expect(one!.intent).toBe(driver.phraseOne.intent)
    expect(one!.intent.carryIn).toBeUndefined()
    expect(two!.outcome.result.timeline).toEqual(successFor(two!.intent).result.timeline)
    expect(two!.outcome.result.timeline).toBe(soundingTwo!.phrase.outcome.result.timeline)
    expect(two!.outcome.provenance.harmony).toBe(soundingTwo!.phrase.outcome.provenance.harmony)
    expect(two!.intent.seed).toBe(driver.requests(2)[0]!.intent.seed)
    // At 240 BPM phrase 2's one-measure deadline is within the standalone reserve, so its
    // standalone attempt goes first: the record keeps that request's own intent, without carry-in.
    expect(two!.intent).toBe(driver.requests(2)[0]!.intent)
    expect(two!.intent.carryIn).toBeUndefined()
    expect([one!.tempo, two!.tempo]).toEqual([240, 240])
  })

  // @test-link [[service_session_history]]
  it('hands back deep-frozen records and a list the caller cannot change', () => {
    const history = historyOf(sessionWithReadAheadAtStop())
    const phrases = history.phrases()
    expect(Object.isFrozen(phrases)).toBe(true)
    expect(Object.isFrozen(phrases[1])).toBe(true)
    expect(Object.isFrozen(phrases[1]!.outcome.result.timeline)).toBe(true)
    expect(Object.isFrozen(phrases[1]!.playedNotes)).toBe(true)
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('leaves the acknowledgement and played-note slots empty', () => {
    for (const record of historyOf(sessionWithReadAheadAtStop()).phrases()) {
      expect(record.acknowledgements).toEqual([])
      expect(record.playedNotes).toEqual([])
    }
  })
})

/** Intent: a wall clock that reads the given epoch milliseconds, one second later on each read. */
function steppingWallClock(firstReading: number): Mock<() => number> {
  let reading = firstReading
  return vi.fn(() => {
    const now = reading
    reading += 1000
    return now
  })
}

// @test-link [[service_session_history]]
describe("the session's start time", () => {
  // @test-link [[service_session_history]]
  it('is the wall clock read once at creation, whatever is recorded and read back later', () => {
    const driver = sessionWithReadAheadAtStop()
    const wallClock = steppingWallClock(SESSION_START_EPOCH_MS)

    const history = createSessionHistory(driver.settings, wallClock, DEFAULT_SESSION_SEED, 'treble')
    for (const output of driver.log) history.record(output)
    history.phrases()
    history.phrases()

    expect(history.phraseCount).toBe(2)
    expect(history.startedAt).toBe(SESSION_START_EPOCH_MS)
    expect(wallClock).toHaveBeenCalledOnce()
  })

  // @test-link [[service_session_history]]
  it('keeps its first reading while the wall clock moves on', () => {
    const wallClock = steppingWallClock(SESSION_START_EPOCH_MS)
    const history = createSessionHistory(
      sessionSettings(),
      wallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    const later = wallClock()

    expect(later).toBeGreaterThan(SESSION_START_EPOCH_MS)
    expect(history.startedAt).toBe(SESSION_START_EPOCH_MS)
  })

  // @test-link [[service_session_history]]
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'refuses a wall-clock reading of %s',
    (reading) => {
      expect(() =>
        createSessionHistory(sessionSettings(), () => reading, DEFAULT_SESSION_SEED, 'treble'),
      ).toThrow(SessionHistoryError)
    },
  )
})

// @test-link [[module_session_seed_plan]]
describe("the session's seed", () => {
  // @test-link [[module_session_seed_plan]]
  it('is the session seed the session started with, beside the start time and the instrument', () => {
    const driver = sessionWithReadAheadAtStop()
    const sessionSeed = makeSeed(0xfeed_beef)

    const history = createSessionHistory(driver.settings, fixedWallClock, sessionSeed, 'treble')
    for (const output of driver.log) history.record(output)

    expect(history.sessionSeed).toBe(sessionSeed)
    expect(history.startedAt).toBe(SESSION_START_EPOCH_MS)
    expect(Object.keys(history).filter((key) => /seed/i.test(key))).toEqual(['sessionSeed'])
  })

  // @test-link [[module_session_seed_plan]]
  it.each([1.5, -1, 2 ** 32, Number.NaN])('refuses a session seed of %s', (value) => {
    const notASeed = value as Seed
    expect(() =>
      createSessionHistory(sessionSettings(), fixedWallClock, notASeed, 'treble'),
    ).toThrow(SessionHistoryError)
  })
})

/** Intent: a driver at 240 BPM for the E♭ alto sax: phrase 2 accepted, two phrases, then Stop. */
function altoDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240, instrumentProfileId: 'eb-alto' })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.accept(0.5)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.end(6)
  return driver
}

// @test-link [[service_session_history]]
// @test-link [[rule_session_settings_locked]]
describe("the session's instrument profile", () => {
  // @test-link [[service_session_history]]
  it('is the instrument profile of the locked settings', () => {
    const history = historyOf(altoDriver())

    expect(history.instrumentProfileId).toBe('eb-alto')
    expect(history.phrases().map((record) => record.intent.instrumentProfile.id)).toEqual([
      'eb-alto',
      'eb-alto',
    ])
  })

  // @test-link [[rule_session_settings_locked]]
  it('refuses a phrase generated for another instrument profile', () => {
    const alto = altoDriver()
    const [keyboardOne] = soundings(sessionWithReadAheadAtStop())
    expect(keyboardOne!.phrase.intent.instrumentProfile.id).not.toBe('eb-alto')

    const history = createSessionHistory(
      alto.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )

    expect(() => history.record(keyboardOne!)).toThrow(SessionHistoryError)
    expect(history.phraseCount).toBe(0)
  })
})

/** Intent: a driver at 60 BPM with a chosen density, a window reading and phrase 1's density. */
function densityDriver(options: {
  readonly chosen: GenerationControls['noteDensity']
  readonly below: boolean
  readonly phraseOneDensity: GenerationControls['noteDensity']
}): SessionDriver {
  const settings = sessionSettings({ tempo: 60, noteDensity: options.chosen })
  const phraseOne = phraseOneFor(settings, { controls: { noteDensity: options.phraseOneDensity } })
  return new SessionDriver({ at: 0, settings, phraseOne, viewport: fakeViewport(options.below) })
}

// @test-link [[rule_session_density_only_steps_down]]
// @test-link [[rule_session_history_keeps_timeline_and_inputs]]
describe('the density the history records', () => {
  // @test-link [[rule_session_density_only_steps_down]]
  it('records Eighth for every phrase generated with Eighth after a chosen Sixteenth', () => {
    const driver = densityDriver({ chosen: 'Sixteenth', below: true, phraseOneDensity: 'Eighth' })
    driver.accept(0.1)
    driver.viewport.below = false
    driver.countInOver(4)
    driver.sounding(20, 2)
    driver.accept(20.5)
    driver.sounding(36, 3)
    driver.end(37)

    const densities = historyOf(driver)
      .phrases()
      .map((record) => record.intent.controls.noteDensity)

    expect(driver.settings.controls.noteDensity).toBe('Sixteenth')
    expect(densities).toEqual(['Eighth', 'Eighth', 'Eighth'])
  })
})

// @test-link [[rule_repeat_phrase_marked_internally_only]]
describe('a repeat in the history', () => {
  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('marks a failure-ladder repeat and keeps the repeated timeline', () => {
    const driver = fastDriver()
    driver.tick(1)
    driver.countInOver(1)
    driver.sounding(5, 2)
    driver.end(6)

    const [one, two] = historyOf(driver).phrases()

    expect(one!.isRepeat).toBe(false)
    expect(one!.repeatOf).toBeUndefined()
    expect(two!.isRepeat).toBe(true)
    expect(two!.repeatOf).toBe(1)
    expect(two!.outcome.result.timeline).toEqual(one!.outcome.result.timeline)
  })
})

/** Intent: a phrase-sounding output carrying a copy of `phrase` with another number and time. */
function renumbered(
  output: OutputOf<'phrase-sounding'>,
  phraseNumber: number,
  at: number,
): SessionOutput {
  const phrase: SessionPhrase = { ...output.phrase, phraseNumber }
  return { kind: 'phrase-sounding', at, phrase, tempo: output.tempo }
}

// @test-link [[service_session_history]]
describe('outputs the history refuses', () => {
  // @test-link [[service_session_history]]
  it('throws on a phrase that is not the next one to sound', () => {
    const driver = sessionWithReadAheadAtStop()
    const [soundingOne, soundingTwo] = soundings(driver)
    const skipping = createSessionHistory(
      driver.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    expect(() => skipping.record(soundingTwo!)).toThrow(SessionHistoryError)

    const repeating = createSessionHistory(
      driver.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    repeating.record(soundingOne!)
    expect(() => repeating.record(soundingOne!)).toThrow(SessionHistoryError)
  })

  // @test-link [[service_session_history]]
  it('throws on any output after the session ended', () => {
    const driver = sessionWithReadAheadAtStop()
    const history = historyOf(driver)
    const next = renumbered(soundings(driver)[1]!, 3, 7)
    expect(() => history.record(next)).toThrow(SessionHistoryError)
    expect(history.phraseCount).toBe(2)
  })

  // @test-link [[service_session_history]]
  it('throws on an end whose count of sounded phrases differs from the history', () => {
    const history = createSessionHistory(
      sessionSettings(),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    expect(() =>
      history.record({
        kind: 'ended',
        at: 3,
        cause: 'stop',
        phase: 'running',
        soundedPhraseCount: 1,
      }),
    ).toThrow(SessionHistoryError)
  })

  // @test-link [[rule_repeat_phrase_marked_internally_only]]
  it('throws on a repeat that does not name the phrase it repeats', () => {
    const driver = sessionWithReadAheadAtStop()
    const [soundingOne, soundingTwo] = soundings(driver)
    const history = createSessionHistory(
      driver.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    history.record(soundingOne!)
    const unnamed: SessionOutput = {
      kind: 'phrase-sounding',
      at: soundingTwo!.at,
      phrase: { ...soundingTwo!.phrase, origin: 'repeat' },
      tempo: soundingTwo!.tempo,
    }
    expect(() => history.record(unnamed)).toThrow(SessionHistoryError)
  })
})

/**
 * Intent: an adaptive-tempo session from 90 BPM driven until phrase 6 sounds, then Stop, so its
 * phrases rise 5 BPM every two phrases: 90, 90, 95, 95, 100, 100.
 */
function risingSession(): SessionDriver {
  const driver = tempoDriver({ tempo: 90, adaptiveTempo: true })
  driveTempoSession(driver, 6)
  driver.end(phraseStartAt(driver, 7) - 0.01)
  return driver
}

// @test-link [[service_session_history]]
describe("each phrase's tempo", () => {
  // @test-link [[service_session_history]]
  it('records each phrase at the tempo its phrase-sounding output carries, not the starting one', () => {
    const driver = risingSession()
    const records = historyOf(driver).phrases()

    expect(driver.settings.controls.tempo).toBe(90)
    expect(records.map((record) => record.tempo)).toEqual(soundings(driver).map((o) => o.tempo))
    expect(records.map((record) => record.tempo)).toEqual([90, 90, 95, 95, 100, 100])
    expect(records.map((record) => record.tempo)).toEqual(tempoMap(driver, 6))
  })

  // @test-link [[service_session_history]]
  it('refuses a phrase-sounding output whose tempo is not a positive BPM', () => {
    const [soundingOne] = soundings(sessionWithReadAheadAtStop())
    for (const tempo of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const history = createSessionHistory(
        sessionSettings({ tempo: 240 }),
        fixedWallClock,
        DEFAULT_SESSION_SEED,
        'treble',
      )
      expect(() => history.record({ ...soundingOne!, tempo })).toThrow(SessionHistoryError)
      expect(history.phraseCount).toBe(0)
    }
  })

  // @test-link [[service_session_history]]
  it('refuses settings whose starting tempo no session runs at', () => {
    const settings = sessionSettings({ tempo: 240 })
    for (const tempo of [0, Number.NaN]) {
      const unusable = { ...settings, controls: { ...settings.controls, tempo } }
      expect(() =>
        createSessionHistory(unusable, fixedWallClock, DEFAULT_SESSION_SEED, 'treble'),
      ).toThrow(SessionHistoryError)
    }
  })
})

// @test-link [[service_session_history]]
// @test-link [[rule_adaptive_tempo_resets_after_session]]
describe('the tempo reached', () => {
  // @test-link [[service_session_history]]
  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it("is the last sounded phrase's tempo, none before phrase 1, and stays at the end", () => {
    const driver = risingSession()
    const history = createSessionHistory(
      driver.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    const reached: (number | null)[] = [history.tempoReached()]
    for (const output of driver.log) {
      history.record(output)
      if (output.kind === 'phrase-sounding') reached.push(history.tempoReached())
    }

    expect(reached).toEqual([null, 90, 90, 95, 95, 100, 100])
    expect(history.tempoReached()).toBe(100)
  })

  // @test-link [[rule_adaptive_tempo_resets_after_session]]
  it('is the starting tempo when no phrase rose, and none for an end in the count-in', () => {
    expect(historyOf(sessionWithReadAheadAtStop()).tempoReached()).toBe(240)
    const driver = fastDriver()
    driver.end(0.5)
    expect(historyOf(driver).tempoReached()).toBeNull()
  })
})

/** 2 000 phrases of four 4/4 measures at 60 BPM last 32 000 s, about 2 h 15 min with count-in. */
const LONG_SESSION_PHRASES = 2000
/** The time budget for building and reading back that history on a noisy machine. */
const LONG_SESSION_BUDGET_MS = 250

// @test-link [[service_session_history]]
describe('a long session', () => {
  // @test-link [[service_session_history]]
  it(`builds and reads back ${LONG_SESSION_PHRASES} phrases within ${LONG_SESSION_BUDGET_MS} ms`, () => {
    const driver = sessionWithReadAheadAtStop()
    const sounded = soundings(driver)
    const outputs = Array.from({ length: LONG_SESSION_PHRASES }, (_, index) =>
      renumbered(sounded[index % sounded.length]!, index + 1, 4 + index * 16),
    )

    const start = performance.now()
    const history = createSessionHistory(
      driver.settings,
      fixedWallClock,
      DEFAULT_SESSION_SEED,
      'treble',
    )
    for (const output of outputs) history.record(output)
    let events = 0
    for (const record of history.phrases()) events += record.outcome.result.timeline.measures.length
    const elapsedMs = performance.now() - start

    console.info(`session history: ${LONG_SESSION_PHRASES} phrases in ${elapsedMs.toFixed(1)} ms`)
    expect(history.phraseCount).toBe(LONG_SESSION_PHRASES)
    expect(history.phrases().at(-1)!.phraseNumber).toBe(LONG_SESSION_PHRASES)
    expect(events).toBeGreaterThan(0)
    expect(elapsedMs).toBeLessThan(LONG_SESSION_BUDGET_MS)
  })
})
