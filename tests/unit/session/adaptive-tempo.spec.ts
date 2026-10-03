/**
 * The adaptive-tempo schedule as pure values: phrases that start sounding while the controller is
 * attached are counted, and each phrase's tempo is fixed in turn, 5 BPM above the phrase before it
 * once two counted phrases have started since the last rise, never above 240 BPM; while the
 * controller is away nothing counts and the due rise waits; without adaptive tempo the tempo never
 * moves.
 */

import { describe, expect, it } from 'vitest'

import {
  ADAPTIVE_TEMPO_CEILING,
  controllerPresence,
  nextPhraseTempo,
  phraseStartedSounding,
  startAdaptiveTempo,
  type AdaptiveTempoSchedule,
} from '@/session/adaptive-tempo'
import { SessionEngineError } from '@/session/session-types'

/**
 * Intent: the tempo of phrases 1 to `phraseCount` on a schedule, in the engine's order: phrase 1
 * starts sounding, then each later phrase has its tempo fixed and starts sounding. `attachedAt`
 * says whether the controller is attached while phrase n's tempo is fixed and it starts sounding.
 */
function tempos(
  schedule: AdaptiveTempoSchedule,
  phraseCount: number,
  attachedAt: (phraseNumber: number) => boolean = () => true,
): readonly number[] {
  const result = [schedule.tempo]
  let current = phraseStartedSounding(schedule)
  for (let phraseNumber = 2; phraseNumber <= phraseCount; phraseNumber += 1) {
    const attached = attachedAt(phraseNumber)
    if (current.attached !== attached) current = controllerPresence(current, attached)
    current = nextPhraseTempo(current)
    result.push(current.tempo)
    current = phraseStartedSounding(current)
  }
  return result
}

// @test-link [[rule_adaptive_tempo_flat_schedule]]
// @test-link [[service_session_engine]]
describe('the adaptive-tempo schedule', () => {
  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('starts at the starting tempo, attached, with nothing counted', () => {
    expect(startAdaptiveTempo(100, true)).toEqual({
      runs: true,
      tempo: 100,
      counted: 0,
      attached: true,
    })
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('rises by 5 BPM every two phrases', () => {
    expect(tempos(startAdaptiveTempo(100, true), 10)).toEqual([
      100, 100, 105, 105, 110, 110, 115, 115, 120, 120,
    ])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('restarts the count at 0 after each rise', () => {
    let schedule = phraseStartedSounding(phraseStartedSounding(startAdaptiveTempo(100, true)))
    expect(schedule.counted).toBe(2)
    schedule = nextPhraseTempo(schedule)
    expect(schedule).toMatchObject({ tempo: 105, counted: 0 })
    expect(nextPhraseTempo(phraseStartedSounding(schedule))).toMatchObject({
      tempo: 105,
      counted: 1,
    })
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('stops at the 240 BPM ceiling: 220 rises to 225, 230, 235, 240 and stays there', () => {
    expect(tempos(startAdaptiveTempo(220, true), 14)).toEqual([
      220, 220, 225, 225, 230, 230, 235, 235, 240, 240, 240, 240, 240, 240,
    ])
    expect(ADAPTIVE_TEMPO_CEILING).toBe(240)
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('never rises past the ceiling from a tempo that is not a step below it', () => {
    expect(tempos(startAdaptiveTempo(237, true), 6)).toEqual([237, 237, 240, 240, 240, 240])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('never changes a session started at 240 BPM', () => {
    expect(new Set(tempos(startAdaptiveTempo(240, true), 12))).toEqual(new Set([240]))
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('counts only the phrases that start sounding while the controller is attached', () => {
    const away = controllerPresence(startAdaptiveTempo(100, true), false)
    expect(phraseStartedSounding(away).counted).toBe(0)
    const back = controllerPresence(phraseStartedSounding(away), true)
    expect(phraseStartedSounding(back).counted).toBe(1)
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('keeps a due rise waiting while away and applies it at the first fixing after reconnecting', () => {
    // Phrases 1 and 2 counted; away for phrase 3, back for phrase 4.
    expect(tempos(startAdaptiveTempo(100, true), 7, (n) => n !== 3)).toEqual([
      100, 100, 100, 105, 105, 110, 110,
    ])
  })

  // @test-link [[rule_adaptive_tempo_flat_schedule]]
  it('resumes counting where it stopped after a loss in mid-pair', () => {
    // Phrase 1 counted, phrase 2 away, then phrase 3 completes the pair.
    expect(tempos(startAdaptiveTempo(100, true), 7, (n) => n !== 2)).toEqual([
      100, 100, 100, 105, 105, 110, 110,
    ])
  })

  // @test-link [[req_adaptive_tempo]]
  // @test-link [[rule_controller_attached_definition]]
  it('keeps the starting tempo for every phrase without adaptive tempo, and counts nothing', () => {
    const off = startAdaptiveTempo(100, false)
    expect(tempos(off, 12)).toEqual(Array.from({ length: 12 }, () => 100))
    expect(phraseStartedSounding(phraseStartedSounding(off)).counted).toBe(0)
  })

  // @test-link [[rule_controller_attached_definition]]
  it('tracks the controller without adaptive tempo too', () => {
    const away = controllerPresence(startAdaptiveTempo(100, false), false)
    expect(away.attached).toBe(false)
    expect(controllerPresence(away, true).attached).toBe(true)
  })

  // @test-link [[service_session_engine]]
  it('throws on a controller event that does not change its presence', () => {
    const attached = startAdaptiveTempo(100, true)
    expect(() => controllerPresence(attached, true)).toThrow(SessionEngineError)
    const away = controllerPresence(attached, false)
    expect(() => controllerPresence(away, false)).toThrow(SessionEngineError)
  })

  // @test-link [[service_session_engine]]
  it('throws on a starting tempo that is not a positive finite number', () => {
    for (const tempo of [0, -60, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => startAdaptiveTempo(tempo, true)).toThrow(SessionEngineError)
  })
})
