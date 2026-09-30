/**
 * The struggling-generator notice: shown when the second repeat in a row is decided, kept through
 * further repeats, cleared when a newly generated phrase (standalone included) starts sounding,
 * never shown for repeats that are not consecutive, and cleared at the end.
 */

import { describe, expect, it } from 'vitest'

import { SessionDriver, kinds, phraseOneFor, sessionSettings } from './session-harness'

/**
 * Intent: a driver at 240 BPM (a 1 s measure) started at 0: phrase 2's deadline is 1, phrase N
 * sounds at 1 + 4(N - 1), and phrase N+1's deadline is 3 s after phrase N starts sounding.
 */
function fastDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240 })
  return new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
}

/** Intent: the moment phrase N starts sounding in a fast driver's session. */
function soundsAt(phraseNumber: number): number {
  return 1 + 4 * (phraseNumber - 1)
}

/** Intent: the deadline of phrase N (2 or more) in a fast driver's session. */
function deadlineOf(phraseNumber: number): number {
  return phraseNumber === 2 ? 1 : soundsAt(phraseNumber - 1) + 3
}

/** Intent: let phrase N be decided as a repeat, by reaching its deadline with nothing ready. */
function repeatPhrase(driver: SessionDriver, phraseNumber: number): readonly string[] {
  return kinds(driver.tick(deadlineOf(phraseNumber)))
}

/** Intent: start phrase N sounding (count-in over for phrase 1) and return the output kinds. */
function sound(driver: SessionDriver, phraseNumber: number): readonly string[] {
  const at = soundsAt(phraseNumber)
  return kinds(phraseNumber === 1 ? driver.countInOver(at) : driver.sounding(at, phraseNumber))
}

// @test-link [[rule_struggling_generator_notice]]
// @test-link [[service_session_engine]]
describe('struggling-generator notice', () => {
  // @test-link [[rule_struggling_generator_notice]]
  it('shows at the second repeat in a row, stays through a third, clears when a generated phrase sounds', () => {
    const driver = fastDriver()
    expect(repeatPhrase(driver, 2)).toEqual(['phrase-ready'])
    sound(driver, 1)
    sound(driver, 2)
    expect(repeatPhrase(driver, 3)).toEqual(['phrase-ready', 'struggling-notice'])
    expect(driver.all('struggling-notice')).toEqual([{ kind: 'struggling-notice', visible: true }])
    sound(driver, 3)
    expect(repeatPhrase(driver, 4)).toEqual(['phrase-ready'])
    expect(sound(driver, 4)).toEqual(['phrase-sounding', 'request-generation', 'wake-at'])
    expect(kinds(driver.accept(soundsAt(4) + 0.5))).toEqual(['check-fit', 'phrase-ready'])
    expect(sound(driver, 5)).toEqual([
      'phrase-sounding',
      'struggling-notice',
      'request-generation',
      'wake-at',
    ])
    expect(driver.all('struggling-notice')).toEqual([
      { kind: 'struggling-notice', visible: true },
      { kind: 'struggling-notice', visible: false },
    ])
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('clears when a standalone phrase starts sounding', () => {
    const driver = fastDriver()
    repeatPhrase(driver, 2)
    sound(driver, 1)
    sound(driver, 2)
    repeatPhrase(driver, 3)
    sound(driver, 3)
    for (let rung = 0; rung < 4; rung += 1) driver.fail(soundsAt(3) + 0.1)
    expect(driver.lastRequest().step).toBe('standalone')
    driver.accept(soundsAt(3) + 0.2)
    expect(sound(driver, 4)).toContain('struggling-notice')
    expect(driver.all('struggling-notice').at(-1)).toEqual({
      kind: 'struggling-notice',
      visible: false,
    })
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('never shows for a repeat, a generated phrase, then a repeat', () => {
    const driver = fastDriver()
    repeatPhrase(driver, 2)
    sound(driver, 1)
    sound(driver, 2)
    driver.accept(soundsAt(2) + 0.5)
    sound(driver, 3)
    expect(repeatPhrase(driver, 4)).toEqual(['phrase-ready'])
    sound(driver, 4)
    driver.end(soundsAt(4) + 1)
    expect(driver.all('struggling-notice')).toEqual([])
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('never shows for a single repeat', () => {
    const driver = fastDriver()
    repeatPhrase(driver, 2)
    sound(driver, 1)
    sound(driver, 2)
    driver.accept(soundsAt(2) + 0.5)
    sound(driver, 3)
    expect(driver.all('struggling-notice')).toEqual([])
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('clears at the end of the session', () => {
    const driver = fastDriver()
    repeatPhrase(driver, 2)
    sound(driver, 1)
    sound(driver, 2)
    repeatPhrase(driver, 3)
    expect(kinds(driver.end(soundsAt(2) + 3.5))).toEqual(['struggling-notice', 'ended'])
    expect(driver.all('struggling-notice').at(-1)).toEqual({
      kind: 'struggling-notice',
      visible: false,
    })
  })
})
