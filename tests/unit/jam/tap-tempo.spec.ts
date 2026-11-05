// @vitest-environment node
/**
 * Tap tempo's pure part: the tempo from the taps (the mean beat of the last four, from the fourth
 * tap on, rounded to Jam's steps of 10 BPM with a tie to the slower, kept within 60 to 180 BPM,
 * unevenness never judged) and the field-note's words. The expected tempos come from arithmetic on
 * the beat, never from the code: a beat of b seconds is 60 / b BPM.
 */
import { describe, expect, it } from 'vitest'

import { JAM_TEMPO_VALUES } from '@/jam/jam-settings'
import {
  TAP_LISTENING_SECONDS,
  TAPS_TO_SET_TEMPO,
  tapTempoSentence,
  tempoFromTaps,
} from '@/jam/tap-tempo'

/** Intent: `count` taps a steady `beat` seconds apart, from `start`. */
function steadyTaps(beat: number, count = 4, start = 0): number[] {
  return Array.from({ length: count }, (_, index) => start + index * beat)
}

// @test-link [[rule_jam_tempo_from_taps]]
describe('tempoFromTaps', () => {
  // @test-link [[rule_jam_tempo_from_taps]]
  it('listens two seconds and needs four taps', () => {
    expect(TAP_LISTENING_SECONDS).toBe(2)
    expect(TAPS_TO_SET_TEMPO).toBe(4)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('sets 120 BPM from four taps half a second apart', () => {
    expect(tempoFromTaps(steadyTaps(0.5), JAM_TEMPO_VALUES)).toBe(120)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('takes the mean beat of uneven taps, never refusing one', () => {
    // 0 to 1.5 s over three beats: a mean beat of 0.5 s, 120 BPM, however uneven the gaps.
    expect(tempoFromTaps([0, 0.45, 1.05, 1.5], JAM_TEMPO_VALUES)).toBe(120)
    expect(tempoFromTaps([0, 0.1, 0.2, 1.5], JAM_TEMPO_VALUES)).toBe(120)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('reads only the last four taps, so a fifth updates the tempo', () => {
    // Four taps 0.5 s apart (120), then a fifth 0.4 s later: the last four span 1.4 s, a beat of
    // 0.4667 s, 128.6 BPM, nearest 130.
    const taps = steadyTaps(0.5)
    expect(tempoFromTaps([...taps, 1.9], JAM_TEMPO_VALUES)).toBe(130)
    // Ten taps a second apart after a fast start: only the last four, 60 BPM, count.
    expect(tempoFromTaps([0, 0.1, 0.2, ...steadyTaps(1, 4, 1)], JAM_TEMPO_VALUES)).toBe(60)
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('sets nothing below four taps', () => {
    expect(tempoFromTaps([], JAM_TEMPO_VALUES)).toBeNull()
    expect(tempoFromTaps([0], JAM_TEMPO_VALUES)).toBeNull()
    expect(tempoFromTaps(steadyTaps(0.5, 3), JAM_TEMPO_VALUES)).toBeNull()
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('gives a tie between two steps to the slower', () => {
    // A 0.48 s beat is exactly 125 BPM, halfway between 120 and 130.
    expect(tempoFromTaps(steadyTaps(0.48), JAM_TEMPO_VALUES)).toBe(120)
    // A beat of 60 / 115 s is exactly 115 BPM, halfway between 110 and 120.
    expect(tempoFromTaps(steadyTaps(60 / 115), JAM_TEMPO_VALUES)).toBe(110)
    // Just past the half goes to the faster.
    expect(tempoFromTaps(steadyTaps(60 / 125.5), JAM_TEMPO_VALUES)).toBe(130)
  })

  // @test-link [[rule_jam_tempo_range]]
  it('keeps the tempo within 60 to 180 BPM', () => {
    // A 2 s beat is 30 BPM; a 0.1 s beat 600 BPM.
    expect(tempoFromTaps(steadyTaps(2), JAM_TEMPO_VALUES)).toBe(60)
    expect(tempoFromTaps(steadyTaps(0.1), JAM_TEMPO_VALUES)).toBe(180)
    // Four taps at the same instant: no span at all, the fastest.
    expect(tempoFromTaps([1, 1, 1, 1], JAM_TEMPO_VALUES)).toBe(180)
  })
})

// @test-link [[rule_jam_tap_in_listening]]
describe('tapTempoSentence', () => {
  // @test-link [[rule_jam_tap_in_listening]]
  it('reads its rest wording, shorter without a connected controller', () => {
    expect(tapTempoSentence({ kind: 'rest' }, JAM_TEMPO_VALUES, true)).toBe(
      'Tap the beat here, or press once and tap on your controller.',
    )
    expect(tapTempoSentence({ kind: 'rest' }, JAM_TEMPO_VALUES, false)).toBe('Tap the beat here.')
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('asks for more taps after a first one', () => {
    for (const connected of [true, false])
      expect(tapTempoSentence({ kind: 'counting' }, JAM_TEMPO_VALUES, connected)).toBe(
        'Keep tapping: four beats set the tempo.',
      )
  })

  // @test-link [[rule_jam_tempo_from_taps]]
  it('names the tempo set, and says so at either limit', () => {
    expect(tapTempoSentence({ kind: 'set', tempo: 120 }, JAM_TEMPO_VALUES, true)).toBe(
      'Set to 120 BPM. Keep tapping to correct it.',
    )
    expect(tapTempoSentence({ kind: 'set', tempo: 180 }, JAM_TEMPO_VALUES, true)).toBe(
      'Set to 180 BPM, the fastest a Jam goes.',
    )
    expect(tapTempoSentence({ kind: 'set', tempo: 60 }, JAM_TEMPO_VALUES, false)).toBe(
      'Set to 60 BPM, the slowest a Jam goes.',
    )
  })
})
