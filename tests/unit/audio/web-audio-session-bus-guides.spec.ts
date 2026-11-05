/**
 * A session's Web Audio bus, its guides, against a recording fake context: each guide note's
 * voice (waveform, pitch, envelope and how it rings out after its end), the shortest notes'
 * attack, and a guide's same-pitch re-attack, which fades only that guide's note still ringing on
 * that pitch, never another session's.
 */

import { describe, expect, it } from 'vitest'

import { envelopeOf } from './fake-web-audio-context'
import { MIDDLE_C_HZ, setUp } from './web-audio-bus-rig'

/** The melody guide's voice: a sine at 0.3, 5 ms attack, ringing out over 600 ms after its end. */
const MELODY = { peak: 0.3, attack: 0.005, release: 0.6, endGain: 0.0001 } as const

/** The rhythm guide's voice: a triangle at 0.25, 3 ms attack, a plucked 300 ms release. */
const RHYTHM = { peak: 0.25, attack: 0.003, release: 0.3, endGain: 0.0001 } as const

// @test-link [[rule_guide_fixed_voices]]
// @test-link [[rule_guide_note_rings_out]]
// @test-link [[rule_guide_sound_from_oscillators]]
describe('the synthesized guides', () => {
  // @test-link [[rule_guide_fixed_voices]]
  // @test-link [[rule_guide_note_rings_out]]
  it('sounds a melody guide note as a sine at its pitch, released from its end and ringing on', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 3 })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('sine')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', MIDDLE_C_HZ, 2]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 2],
      ['linearRampToValueAtTime', MELODY.peak, 2 + MELODY.attack],
      ['setValueAtTime', MELODY.peak, 3],
      ['exponentialRampToValueAtTime', MELODY.endGain, 3 + MELODY.release],
    ])
    expect(oscillator.startedAt()).toBe(2)
    expect(oscillator.stops()).toEqual([3 + MELODY.release])
  })

  // @test-link [[rule_guide_fixed_voices]]
  // @test-link [[rule_guide_note_rings_out]]
  it('sounds a rhythm guide note as a triangle at its pitch, with a short plucked release', () => {
    const { fake, output } = setUp()
    output
      .openSessionBus()
      .scheduleGuideNote({ role: 'rhythm-guide', pitch: 69, at: 4, until: 4.5 })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('triangle')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 440, 4]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 4],
      ['linearRampToValueAtTime', RHYTHM.peak, 4 + RHYTHM.attack],
      ['setValueAtTime', RHYTHM.peak, 4.5],
      ['exponentialRampToValueAtTime', RHYTHM.endGain, 4.5 + RHYTHM.release],
    ])
    expect(oscillator.startedAt()).toBe(4)
    expect(oscillator.stops()).toEqual([4.5 + RHYTHM.release])
  })

  // @test-link [[rule_guide_note_rings_out]]
  it('plays a 42 ms note, a sixteenth-note triplet at 240 BPM, with its full 5 ms attack', () => {
    const { fake, output } = setUp()
    const at = 2
    const until = at + 60 / 240 / 6
    expect(until - at).toBeCloseTo(0.0417, 4)
    output.openSessionBus().scheduleGuideNote({ role: 'melody-guide', pitch: 72, at, until })

    const envelope = envelopeOf(fake, fake.oscillators[0]!)
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, at],
      ['linearRampToValueAtTime', MELODY.peak, at + MELODY.attack],
      ['setValueAtTime', MELODY.peak, until],
      ['exponentialRampToValueAtTime', MELODY.endGain, until + MELODY.release],
    ])
    expect(fake.oscillators[0]!.stops()).toEqual([until + MELODY.release])
  })

  // @test-link [[rule_guide_note_rings_out]]
  it("caps the attack at half a note shorter than twice it: a 6 ms note's attack is 3 ms", () => {
    const { fake, output } = setUp()
    const at = 1
    const until = 1.006
    output.openSessionBus().scheduleGuideNote({ role: 'melody-guide', pitch: 60, at, until })

    const half = (until - at) / 2
    expect(half).toBeCloseTo(0.003, 12)
    const envelope = envelopeOf(fake, fake.oscillators[0]!)
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, at],
      ['linearRampToValueAtTime', MELODY.peak, at + half],
      ['setValueAtTime', MELODY.peak, until],
      ['exponentialRampToValueAtTime', MELODY.endGain, until + MELODY.release],
    ])
  })

  // @test-link [[rule_guide_note_rings_out]]
  it('keeps the full release of a note followed by a rest, the next note much later', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    const before = [...envelopeOf(fake, fake.oscillators[0]!).gain.calls]
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 5, until: 5.5 })

    expect(envelopeOf(fake, fake.oscillators[0]!).gain.calls).toEqual(before)
    expect(before.at(-1)).toEqual(['exponentialRampToValueAtTime', MELODY.endGain, 2.5 + 0.6])
    expect(fake.oscillators[0]!.stops()).toEqual([2.5 + MELODY.release])
  })

  // @test-link [[rule_guide_sound_from_oscillators]]
  it('throws on a guide note with a time that is not finite, no length, or a pitch off the MIDI range', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    const note = { role: 'rhythm-guide', pitch: 60, at: 2, until: 3 } as const
    expect(() => bus.scheduleGuideNote({ ...note, at: Number.NaN })).toThrow(/finite/)
    expect(() => bus.scheduleGuideNote({ ...note, until: 2 })).toThrow(/after/)
    expect(() => bus.scheduleGuideNote({ ...note, pitch: 128 })).toThrow(/pitch/)
    expect(fake.oscillators).toEqual([])
  })
})

/** The quick fade of a guide's ringing note re-attacked on its pitch, in seconds. */
const REATTACK_FADE = 0.015

// @test-link [[rule_guide_same_pitch_reattack]]
describe("a guide's same-pitch re-attack", () => {
  // @test-link [[rule_guide_same_pitch_reattack]]
  it('fades the note still ringing out from the new start, its release curve kept up to there', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2.7, until: 3 })

    const [ringing, fresh] = fake.oscillators
    const calls = envelopeOf(fake, ringing!).gain.calls
    expect(calls.slice(0, 4)).toEqual([
      ['setValueAtTime', 0, 2],
      ['linearRampToValueAtTime', MELODY.peak, 2 + MELODY.attack],
      ['setValueAtTime', MELODY.peak, 2.5],
      ['exponentialRampToValueAtTime', MELODY.endGain, 2.5 + MELODY.release],
    ])
    expect(calls[4]).toEqual(['cancelScheduledValues', 2.7])
    const [method, level, time] = calls[5]!
    expect([method, time]).toEqual(['exponentialRampToValueAtTime', 2.7])
    const releaseProgress = (2.7 - 2.5) / MELODY.release
    expect(level).toBeCloseTo(MELODY.peak * (MELODY.endGain / MELODY.peak) ** releaseProgress, 12)
    expect(calls.slice(6)).toEqual([['linearRampToValueAtTime', 0, 2.7 + REATTACK_FADE]])
    expect(ringing!.stops()).toEqual([2.5 + MELODY.release, 2.7 + REATTACK_FADE])
    expect(fresh!.startedAt()).toBe(2.7)
    expect(envelopeOf(fake, fresh!).gain.calls[0]).toEqual(['setValueAtTime', 0, 2.7])
  })

  // @test-link [[rule_guide_same_pitch_reattack]]
  it("holds the peak up to a new start right on the old note's end, then fades it, across two phrases too", () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    // Phrase 1's last note ends on phrase 2's first beat, where phrase 2 starts on the same pitch.
    bus.scheduleGuideNote({ role: 'rhythm-guide', pitch: 62, at: 9.5, until: 10 })
    bus.scheduleGuideNote({ role: 'rhythm-guide', pitch: 62, at: 10, until: 10.5 })

    const ringing = fake.oscillators[0]!
    expect(envelopeOf(fake, ringing).gain.calls.slice(4)).toEqual([
      ['cancelScheduledValues', 10],
      ['setValueAtTime', RHYTHM.peak, 10],
      ['linearRampToValueAtTime', 0, 10 + REATTACK_FADE],
    ])
    expect(ringing.stops()).toEqual([10 + RHYTHM.release, 10 + REATTACK_FADE])
  })

  // @test-link [[rule_guide_same_pitch_reattack]]
  it('fades nothing for a different pitch, or for the other guide on the same pitch', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    const ringing = fake.oscillators[0]!
    const before = [...envelopeOf(fake, ringing).gain.calls]
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 62, at: 2.6, until: 3 })
    bus.scheduleGuideNote({ role: 'rhythm-guide', pitch: 60, at: 2.7, until: 3 })

    expect(envelopeOf(fake, ringing).gain.calls).toEqual(before)
    expect(ringing.stops()).toEqual([2.5 + MELODY.release])
  })

  // @test-link [[rule_guide_same_pitch_reattack]]
  it('leaves a note whose release is over by the end of the fade untouched', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    const ringing = fake.oscillators[0]!
    const before = [...envelopeOf(fake, ringing).gain.calls]
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2.5 + MELODY.release, until: 3.5 })
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 5, until: 5.5 })

    expect(envelopeOf(fake, ringing).gain.calls).toEqual(before)
    expect(ringing.stops()).toEqual([2.5 + MELODY.release])
  })

  // @test-link [[rule_guide_same_pitch_reattack]]
  // @test-link [[rule_stop_ends_session]]
  it("never fades a note of another session's bus", () => {
    const { fake, output } = setUp()
    output
      .openSessionBus()
      .scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    const ringing = fake.oscillators[0]!
    const before = [...envelopeOf(fake, ringing).gain.calls]
    output
      .openSessionBus()
      .scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2.7, until: 3 })

    expect(envelopeOf(fake, ringing).gain.calls).toEqual(before)
    expect(ringing.stops()).toEqual([2.5 + MELODY.release])
  })
})
