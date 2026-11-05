/**
 * A session's Web Audio bus against a recording fake context: which path each click route, the
 * backing and each guide take to the speakers, the synthesized click's, backing notes' and guide
 * notes' pitch, envelope and lifetime, a guide's same-pitch re-attack, and the fade-out on stop
 * that silences one session's bus without touching the next one.
 */

import { describe, expect, it } from 'vitest'

import { createWebAudioOutput } from '@/audio/web-audio-output'
import {
  createFakeWebAudioContext,
  envelopeOf,
  mixNode,
  pathToDestination,
} from './fake-web-audio-context'

/** How many mix gains the output builds before any bus opens: two per channel. */
const MIX_GAIN_COUNT = 8

/** Intent: a fresh output on a fake context, with its eight mix gains found. */
function setUp() {
  const fake = createFakeWebAudioContext()
  const output = createWebAudioOutput(fake.port, fake.performanceNow)
  const clickEnable = mixNode(output, fake, 'click-enable')
  const clickVolume = mixNode(output, fake, 'click-volume')
  const backingEnable = mixNode(output, fake, 'backing-enable')
  const backingVolume = mixNode(output, fake, 'backing-volume')
  const melodyEnable = mixNode(output, fake, 'melody-guide-enable')
  const melodyVolume = mixNode(output, fake, 'melody-guide-volume')
  const rhythmEnable = mixNode(output, fake, 'rhythm-guide-enable')
  const rhythmVolume = mixNode(output, fake, 'rhythm-guide-volume')
  return {
    fake,
    output,
    clickEnable,
    clickVolume,
    backingEnable,
    backingVolume,
    melodyEnable,
    melodyVolume,
    rhythmEnable,
    rhythmVolume,
  }
}

// @test-link [[rule_count_in_always_clicks]]
describe('click routes', () => {
  // @test-link [[rule_count_in_always_clicks]]
  it('sends a count-in click through the click volume but around the click on/off gate', () => {
    const { fake, output, clickEnable, clickVolume } = setUp()
    output.setGain('click-enable', 0, 0)
    output.openSessionBus().scheduleClick({ at: 2, accent: true, route: 'count-in' })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path).toHaveLength(5)
    expect(path.slice(3)).toEqual([clickVolume, fake.destination])
    expect(path).not.toContain(clickEnable)
  })

  // @test-link [[rule_count_in_always_clicks]]
  // @test-link [[rule_click_track]]
  it('sends a click-track click through the click on/off gate, then the click volume', () => {
    const { fake, output, clickEnable, clickVolume } = setUp()
    output.openSessionBus().scheduleClick({ at: 2, accent: false, route: 'click' })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path).toHaveLength(6)
    expect(path.slice(3)).toEqual([clickEnable, clickVolume, fake.destination])
  })

  // @test-link [[rule_count_in_always_clicks]]
  it('opens each bus with its three fade gains, two click routes and the backing, at 1', () => {
    const { fake, output } = setUp()
    output.openSessionBus()
    expect(
      fake.gains.slice(MIX_GAIN_COUNT, MIX_GAIN_COUNT + 3).map((node) => node.gain.value),
    ).toEqual([1, 1, 1])
  })
})

// @test-link [[rule_jam_click_runs_until_phrase_one]]
describe('the click forced on until phrase 1 sounds', () => {
  // @test-link [[rule_jam_click_runs_until_phrase_one]]
  it('sends a click-track click around the click on/off gate while forced with no end yet', () => {
    const { fake, output, clickEnable, clickVolume } = setUp()
    output.setGain('click-enable', 0, 0)
    const bus = output.openSessionBus()
    bus.forceClickUntil(Number.POSITIVE_INFINITY)
    bus.scheduleClick({ at: 30, accent: false, route: 'click' })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path.slice(3)).toEqual([clickVolume, fake.destination])
    expect(path).not.toContain(clickEnable)
  })

  // @test-link [[rule_jam_click_runs_until_phrase_one]]
  // @test-link [[rule_click_track]]
  it('sends a click before the forced end around the gate, and one at or after it through it', () => {
    const { fake, output, clickEnable } = setUp()
    const bus = output.openSessionBus()
    bus.forceClickUntil(Number.POSITIVE_INFINITY)
    bus.forceClickUntil(8)
    bus.scheduleClick({ at: 7.5, accent: false, route: 'click' })
    bus.scheduleClick({ at: 8, accent: true, route: 'click' })

    expect(pathToDestination(fake.oscillators[0]!, fake.destination)).not.toContain(clickEnable)
    expect(pathToDestination(fake.oscillators[1]!, fake.destination)).toContain(clickEnable)
  })

  // @test-link [[rule_click_track]]
  it('forces nothing on a bus never asked to', () => {
    const { fake, output, clickEnable } = setUp()
    output.openSessionBus().scheduleClick({ at: 2, accent: false, route: 'click' })
    expect(pathToDestination(fake.oscillators[0]!, fake.destination)).toContain(clickEnable)
  })
})

// @test-link [[rule_click_track]]
describe('the synthesized click', () => {
  // @test-link [[rule_click_track]]
  it('sounds an accented click as a 1500 Hz sine peaking at full level', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 2, accent: true, route: 'click' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('sine')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 1500, 2]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 2],
      ['linearRampToValueAtTime', 1, 2 + 0.002],
      ['exponentialRampToValueAtTime', 0.0001, 2 + 0.05],
    ])
  })

  // @test-link [[rule_click_track]]
  it('sounds an unaccented click as a 1000 Hz sine peaking at 0.6', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 3, accent: false, route: 'count-in' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 1000, 3]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 3],
      ['linearRampToValueAtTime', 0.6, 3 + 0.002],
      ['exponentialRampToValueAtTime', 0.0001, 3 + 0.05],
    ])
  })

  // @test-link [[rule_click_track]]
  it('starts the click at its time, stops it 60 ms later and unhooks it once it has ended', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 4, accent: false, route: 'click' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    const fadeNode = envelope.outputs[0]!
    expect(oscillator.startedAt()).toBe(4)
    expect(oscillator.stoppedAt()).toBe(4 + 0.06)
    expect(oscillator.disconnected()).toBe(false)

    oscillator.end()
    expect(oscillator.disconnected()).toBe(true)
    expect(envelope.disconnected()).toBe(true)
    expect(fadeNode.disconnected()).toBe(false)
  })

  // @test-link [[rule_click_track]]
  it('throws on a click time that is not a finite number', () => {
    const { output } = setUp()
    const bus = output.openSessionBus()
    expect(() => bus.scheduleClick({ at: Number.NaN, accent: false, route: 'click' })).toThrow(
      /finite/,
    )
  })
})

// @test-link [[rule_stop_ends_session]]
describe('fading a session out', () => {
  // @test-link [[rule_stop_ends_session]]
  it("ramps all three of the bus's fade gains, the backing's included, to silence", () => {
    const { fake, output } = setUp()
    output.openSessionBus().fadeOut(5, 0.1)

    const fades = fake.gains.slice(MIX_GAIN_COUNT, MIX_GAIN_COUNT + 3)
    expect(fades).toHaveLength(3)
    for (const fade of fades) {
      expect(fade.gain.calls).toEqual([
        ['cancelScheduledValues', 5],
        ['setValueAtTime', 1, 5],
        ['linearRampToValueAtTime', 0, 5 + 0.1],
      ])
    }
  })

  // @test-link [[rule_stop_ends_session]]
  it('gives a later session fresh fade gains that an earlier fade-out leaves alone', () => {
    const { fake, output } = setUp()
    const first = output.openSessionBus()
    first.scheduleClick({ at: 1, accent: true, route: 'count-in' })
    first.fadeOut(1.5, 0.1)

    const firstFades = fake.gains.slice(MIX_GAIN_COUNT, MIX_GAIN_COUNT + 2)
    const gainsBefore = fake.gains.length
    const second = output.openSessionBus()
    const secondFades = fake.gains.slice(gainsBefore, gainsBefore + 2)
    second.scheduleClick({ at: 2, accent: true, route: 'count-in' })

    expect(secondFades).toHaveLength(2)
    expect(secondFades.flatMap((node) => node.gain.calls)).toEqual([])
    const secondPath = pathToDestination(fake.oscillators[1]!, fake.destination)
    expect(secondFades).toContain(secondPath[2])
    expect(firstFades).not.toContain(secondPath[2])
  })

  // @test-link [[rule_stop_ends_session]]
  it('throws on a fade time or duration that is not a finite, non-negative number', () => {
    const { output } = setUp()
    const bus = output.openSessionBus()
    expect(() => bus.fadeOut(Number.NaN, 0.1)).toThrow(/finite/)
    expect(() => bus.fadeOut(1, -0.1)).toThrow(/duration/)
  })
})

/** Intent: middle C's frequency in equal temperament, A4 = 440 Hz. */
const MIDDLE_C_HZ = 440 * 2 ** ((60 - 69) / 12)

// @test-link [[req_session_backing_track]]
// @test-link [[req_session_audio_mix]]
describe('the synthesized backing', () => {
  // @test-link [[req_session_audio_mix]]
  it('sends a backing note through its fade gain, the backing on/off gain, then the backing volume', () => {
    const { fake, output, backingEnable, backingVolume } = setUp()
    output.openSessionBus().scheduleBackingNote({ voice: 'bass', pitch: 45, at: 2, until: 3 })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path).toHaveLength(6)
    expect(path[2]).toBe(fake.gains[MIX_GAIN_COUNT + 2])
    expect(path.slice(3)).toEqual([backingEnable, backingVolume, fake.destination])
  })

  // @test-link [[req_session_backing_track]]
  it('creates only an oscillator and a gain per note, with no sample, buffer or fetch', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    fake.accessedMembers.clear()
    bus.scheduleBackingNote({ voice: 'chord', pitch: 60, at: 2, until: 3 })
    bus.scheduleBackingNote({ voice: 'bass', pitch: 36, at: 2, until: 3 })

    expect([...fake.accessedMembers].sort()).toEqual(['createGain', 'createOscillator'])
    expect(fake.oscillators).toHaveLength(2)
    expect(fake.gains).toHaveLength(MIX_GAIN_COUNT + 5 + 2)
  })

  // @test-link [[req_session_backing_track]]
  it('sounds a bass note as a triangle wave at its pitch, attacked, held and released by its end', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleBackingNote({ voice: 'bass', pitch: 45, at: 2, until: 3 })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('triangle')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 110, 2]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 2],
      ['linearRampToValueAtTime', 0.35, 2 + 0.005],
      ['setValueAtTime', 0.35, 3 - 0.04],
      ['exponentialRampToValueAtTime', 0.0001, 3],
    ])
    expect(oscillator.startedAt()).toBe(2)
    expect(oscillator.stoppedAt()).toBe(3)
  })

  // @test-link [[req_session_backing_track]]
  it('sounds each chord note as a quieter sine wave at its own pitch', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleBackingNote({ voice: 'chord', pitch: 60, at: 4, until: 6 })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('sine')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', MIDDLE_C_HZ, 4]])
    expect(MIDDLE_C_HZ).toBeCloseTo(261.6256, 4)
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 4],
      ['linearRampToValueAtTime', 0.12, 4 + 0.005],
      ['setValueAtTime', 0.12, 6 - 0.04],
      ['exponentialRampToValueAtTime', 0.0001, 6],
    ])
    expect(oscillator.startedAt()).toBe(4)
    expect(oscillator.stoppedAt()).toBe(6)
  })

  // @test-link [[req_session_backing_track]]
  it('unhooks a backing note once its oscillator has ended, leaving the fade gain wired', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleBackingNote({ voice: 'chord', pitch: 64, at: 1, until: 2 })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    const fadeNode = envelope.outputs[0]!
    expect(oscillator.disconnected()).toBe(false)
    oscillator.end()
    expect(oscillator.disconnected()).toBe(true)
    expect(envelope.disconnected()).toBe(true)
    expect(fadeNode.disconnected()).toBe(false)
  })

  // @test-link [[req_session_backing_track]]
  it('throws on a note with a time that is not finite, no length, or a pitch off the MIDI range', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    const note = { voice: 'bass', pitch: 40, at: 2, until: 3 } as const
    expect(() => bus.scheduleBackingNote({ ...note, at: Number.NaN })).toThrow(/finite/)
    expect(() => bus.scheduleBackingNote({ ...note, until: Number.POSITIVE_INFINITY })).toThrow(
      /finite/,
    )
    expect(() => bus.scheduleBackingNote({ ...note, until: 2 })).toThrow(/after/)
    expect(() => bus.scheduleBackingNote({ ...note, until: 1 })).toThrow(/after/)
    expect(() => bus.scheduleBackingNote({ ...note, until: 2.02 })).toThrow(/too short/)
    expect(() => bus.scheduleBackingNote({ ...note, pitch: 128 })).toThrow(/pitch/)
    expect(() => bus.scheduleBackingNote({ ...note, pitch: -1 })).toThrow(/pitch/)
    expect(() => bus.scheduleBackingNote({ ...note, pitch: 40.5 })).toThrow(/pitch/)
    expect(fake.oscillators).toEqual([])
  })
})

// @test-link [[req_guide_playback]]
// @test-link [[rule_stop_ends_session]]
describe('the guide routes', () => {
  // @test-link [[req_guide_playback]]
  // @test-link [[req_session_audio_mix]]
  it("sends each guide's notes through its own fade gain, its on/off gain, then its volume", () => {
    const { fake, output, melodyEnable, melodyVolume, rhythmEnable, rhythmVolume } = setUp()
    const bus = output.openSessionBus()
    const fades = fake.gains.slice(MIX_GAIN_COUNT)
    expect(fades.map((node) => node.gain.value)).toEqual([1, 1, 1, 1, 1])
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 60, at: 2, until: 2.5 })
    bus.scheduleGuideNote({ role: 'rhythm-guide', pitch: 60, at: 2, until: 2.5 })

    const [melody, rhythm] = fake.oscillators
    expect(pathToDestination(melody!, fake.destination).slice(2)).toEqual([
      fades[3],
      melodyEnable,
      melodyVolume,
      fake.destination,
    ])
    expect(pathToDestination(rhythm!, fake.destination).slice(2)).toEqual([
      fades[4],
      rhythmEnable,
      rhythmVolume,
      fake.destination,
    ])
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[req_guide_playback]]
  it("ramps all five of the bus's fade gains, both guides' included, to silence", () => {
    const { fake, output } = setUp()
    output.openSessionBus().fadeOut(5, 0.1)

    const fades = fake.gains.slice(MIX_GAIN_COUNT)
    expect(fades).toHaveLength(5)
    for (const fade of fades) {
      expect(fade.gain.calls).toEqual([
        ['cancelScheduledValues', 5],
        ['setValueAtTime', 1, 5],
        ['linearRampToValueAtTime', 0, 5 + 0.1],
      ])
    }
  })

  // @test-link [[rule_guide_sound_from_oscillators]]
  it('creates only an oscillator and a gain per guide note, with no sample, buffer or fetch', () => {
    const { fake, output } = setUp()
    const bus = output.openSessionBus()
    fake.accessedMembers.clear()
    bus.scheduleGuideNote({ role: 'melody-guide', pitch: 67, at: 2, until: 2.5 })
    bus.scheduleGuideNote({ role: 'rhythm-guide', pitch: 60, at: 2, until: 2.5 })

    expect([...fake.accessedMembers].sort()).toEqual(['createGain', 'createOscillator'])
    expect(fake.oscillators).toHaveLength(2)
    expect(fake.gains).toHaveLength(MIX_GAIN_COUNT + 5 + 2)
  })
})

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
