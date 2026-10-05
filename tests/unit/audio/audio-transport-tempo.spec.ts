/**
 * The audio transport over a tempo map, on the fake audio clock and output: each phrase queued at
 * its own tempo shifts the starts of the phrases after it exactly, its backing is placed and sized
 * at that tempo, the clicks switch tempo on its first beat with no gap or double, and a phrase
 * queued too late, phrase 1 off the starting tempo, or a start asked past the queue is refused.
 */

import { describe, expect, it } from 'vitest'

import { renderedAttacks, twoPhraseHarmonies } from './backing-harmony'
import { transportRig, type TransportRig } from './transport-rig'

/** Beats per four-measure phrase in 4/4. */
const PHRASE_BEATS = 16

/** Intent: the first session beat of phrase `n` (from 1), after the four count-in beats. */
function phraseBeat(n: number): number {
  return 4 + (n - 1) * PHRASE_BEATS
}

/**
 * Intent: a running session started at `tempos[0]`, phrase n queued at `tempos[n - 1]`, all at
 * once before any of them starts, alternating the two test harmonies.
 */
function queuedAt(tempos: readonly number[]): TransportRig & { readonly startAt: number } {
  const setup = transportRig()
  const harmonies = twoPhraseHarmonies()
  setup.transport.unlock()
  const { startAt } = setup.transport.start({ tempo: tempos[0]! })
  tempos.forEach((tempo, index) => {
    setup.transport.queueBacking(index + 1, harmonies[index % 2]!, tempo)
  })
  return { ...setup, startAt }
}

/**
 * Intent: the closed-form start of phrase `n` (from 1): the count-in at the starting tempo, then
 * each earlier phrase's sixteen beats at its own tempo, summed in phrase order.
 */
function closedFormStart(startAt: number, tempos: readonly number[], n: number): number {
  let at = startAt + (4 * 60) / tempos[0]!
  for (let phrase = 1; phrase < n; phrase += 1) at += (PHRASE_BEATS * 60) / tempos[phrase - 1]!
  return at
}

// @test-link [[rule_click_track]]
// @test-link [[module_session_transport_tempo_map]]
describe('the transport over a tempo map', () => {
  const TEMPOS = [90, 95, 100] as const

  // @test-link [[module_session_transport_tempo_map]]
  it('shifts the starts of the phrases after a risen phrase exactly', () => {
    const { transport, startAt } = queuedAt(TEMPOS)
    for (const n of [1, 2, 3, 4]) {
      expect(transport.phraseStartsAt(n)).toBeCloseTo(closedFormStart(startAt, TEMPOS, n), 12)
    }
    expect(transport.phraseStartsAt(2)).toBe(startAt + (phraseBeat(2) * 60) / 90)
  })

  // @test-link [[req_session_backing_track]]
  // @test-link [[module_session_transport_tempo_map]]
  it('places and sizes the backing of each risen phrase at its own tempo', () => {
    const { rig, transport } = queuedAt(TEMPOS)
    rig.advanceTo(transport.phraseStartsAt(4) + 0.5)
    const harmonies = twoPhraseHarmonies()
    TEMPOS.forEach((tempo, index) => {
      const startsAt = transport.phraseStartsAt(index + 1)
      const endsAt = transport.phraseStartsAt(index + 2)
      const scheduled = rig.backingNotes().filter((n) => n.at >= startsAt && n.at < endsAt)
      const expected = renderedAttacks(harmonies[index % 2]!)
        .map((attack) => ({
          voice: attack.voice,
          pitch: attack.pitch,
          at: startsAt + (attack.startBeat * 60) / tempo,
          until: startsAt + (attack.endBeat * 60) / tempo,
        }))
        .sort((a, b) => a.at - b.at)
      expect(scheduled).toHaveLength(expected.length)
      scheduled.forEach((note, i) => {
        expect(note).toMatchObject({ voice: expected[i]!.voice, pitch: expected[i]!.pitch })
        expect(note.at).toBeCloseTo(expected[i]!.at, 12)
        expect(note.until).toBeCloseTo(expected[i]!.until, 12)
      })
    })
    expect(rig.backingNotes().every((note) => note.scheduledAt <= note.at)).toBe(true)
  })

  // @test-link [[rule_click_track]]
  // @test-link [[module_session_transport_tempo_map]]
  it('plans the clicks through each phrase boundary at the new tempo, with no gap or double', () => {
    const { rig, transport, startAt } = queuedAt(TEMPOS)
    rig.advanceTo(transport.phraseStartsAt(4))
    const clicks = rig.clicks().filter((click) => click.at <= transport.phraseStartsAt(4))
    expect(clicks).toHaveLength(phraseBeat(4) + 1)
    expect(clicks[0]?.at).toBe(startAt)
    expect(clicks.at(-1)?.at).toBe(transport.phraseStartsAt(4))
    expect(clicks[phraseBeat(2)]?.at).toBe(transport.phraseStartsAt(2))
    expect(clicks[phraseBeat(3)]?.at).toBe(transport.phraseStartsAt(3))
    clicks.slice(1).forEach((click, k) => {
      const tempo = k + 1 <= phraseBeat(2) ? 90 : k + 1 <= phraseBeat(3) ? 95 : 100
      expect(click.at - clicks[k]!.at).toBeCloseTo(60 / tempo, 9)
      expect(click.accent).toBe((k + 1) % 4 === 0)
    })
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('keeps 20 phrases rising +5 from 60 to 160 BPM within 1e-9 s of the closed form', () => {
    const tempos = Array.from({ length: 21 }, (_, index) => 60 + 5 * index)
    const { transport, startAt } = queuedAt(tempos)
    for (let n = 1; n <= 22; n += 1) {
      const at = transport.phraseStartsAt(n)
      expect(Math.abs(at - closedFormStart(startAt, tempos, n))).toBeLessThan(1e-9)
      if (n > 1) {
        const length = at - transport.phraseStartsAt(n - 1)
        expect(Math.abs(length - (PHRASE_BEATS * 60) / tempos[n - 2]!)).toBeLessThan(1e-9)
      }
    }
  })
})

// @test-link [[req_session_backing_track]]
// @test-link [[module_session_transport_tempo_map]]
describe('queueing a phrase at its tempo', () => {
  // @test-link [[req_session_backing_track]]
  // @test-link [[module_session_transport_tempo_map]]
  it('refuses a risen phrase queued too late, keeping the plan at the old tempo', () => {
    const { rig, transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 90 })
    transport.queueBacking(1, first, 90)
    const phraseTwoAt = transport.phraseStartsAt(2)
    rig.advanceTo(phraseTwoAt - 0.03)
    expect(() => transport.queueBacking(2, second, 95)).toThrow(/too late/)
    expect(transport.phraseStartsAt(2)).toBe(phraseTwoAt)
    rig.advanceTo(phraseTwoAt + 1)
    const clicks = rig.clicks()
    expect(clicks.at(-1)!.at - clicks.at(-2)!.at).toBeCloseTo(60 / 90, 9)
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('refuses phrase 1 at a tempo other than the starting tempo', () => {
    const { transport } = transportRig()
    const [first] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 90 })
    expect(() => transport.queueBacking(1, first, 95)).toThrow(/starting tempo/)
    transport.queueBacking(1, first, 90)
    expect(() => transport.queueBacking(2, first, 90)).not.toThrow()
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('refuses a tempo off a whole 60..240 BPM and keeps the queue', () => {
    const { transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 120 })
    transport.queueBacking(1, first, 120)
    for (const bad of [59, 241, 120.5, Number.NaN]) {
      expect(() => transport.queueBacking(2, second, bad)).toThrow(/tempo/)
    }
    expect(() => transport.phraseStartsAt(3)).toThrow(/phrase 3/)
    transport.queueBacking(2, second, 125)
    expect(transport.phraseStartsAt(3)).toBeCloseTo(
      transport.phraseStartsAt(2) + 16 * (60 / 125),
      12,
    )
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('gives a phrase start only up to the phrase after the last one queued', () => {
    const { transport } = transportRig()
    const [first] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 90 })
    expect(transport.phraseStartsAt(1)).toBeGreaterThan(0)
    expect(() => transport.phraseStartsAt(2)).toThrow(/phrase 2/)
    transport.queueBacking(1, first, 90)
    expect(transport.phraseStartsAt(2)).toBeGreaterThan(transport.phraseStartsAt(1))
    expect(() => transport.phraseStartsAt(3)).toThrow(/phrase 3/)
  })
})
