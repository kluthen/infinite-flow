/**
 * The session backing on the audio transport, on the fake audio clock and output: each queued
 * phrase's backing is planned ahead on the audio clock, every note exactly on its beat's click,
 * from the end of the count-in on and through the player's silence; the backing switch and volume
 * only set gains; stop fades the backing with the rest of the session; and a phrase queued out of
 * order, too late or with no session running is refused.
 */

import { describe, expect, it } from 'vitest'

import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import { renderedAttacks, twoPhraseHarmonies } from './backing-harmony'
import type { FakeAudioEvent } from './fake-audio'
import { beat, transportRig, type TransportRig } from './transport-rig'

/** Intent: the beat-`k` click time of the session on bus `bus`, as the rig recorded it. */
function clickAt(setup: TransportRig, bus: number, k: number): number {
  const click = setup.rig.clicks().filter((event) => event.bus === bus)[k]
  if (click === undefined) throw new Error(`no click on beat ${k} of bus ${bus}`)
  return click.at
}

/** Intent: a running session at `tempo` BPM with phrases 1 and 2 queued, run past eight bars. */
function eightBarsOfBacking(tempo: number): TransportRig {
  const setup = transportRig()
  const { rig, transport } = setup
  const [first, second] = twoPhraseHarmonies()
  transport.unlock()
  const { startAt } = transport.start({ tempo })
  transport.queueBacking(1, first, tempo)
  transport.queueBacking(2, second, tempo)
  rig.advanceTo(startAt + (37 * 60) / tempo)
  return setup
}

// @test-link [[req_session_backing_track]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('eight bars of backing', () => {
  // @test-link [[req_session_backing_track]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  it.each([60, 120, 240])(
    'puts every bass and chord attack exactly on its click at %s BPM',
    (tempo) => {
      const setup = eightBarsOfBacking(tempo)
      const harmonies: readonly (readonly HarmonyEvent[])[] = twoPhraseHarmonies()
      const expected = harmonies.flatMap((harmony, index) =>
        renderedAttacks(harmony).map((attack) => ({
          voice: attack.voice,
          pitch: attack.pitch,
          at: clickAt(setup, 1, 4 + index * 16 + attack.startBeat),
          until: clickAt(setup, 1, 4 + index * 16 + attack.endBeat),
        })),
      )
      const scheduled = setup.rig
        .backingNotes()
        .map(({ voice, pitch, at, until }) => ({ voice, pitch, at, until }))
      const byTime = (a: { readonly at: number }, b: { readonly at: number }): number => a.at - b.at
      expect(scheduled).toEqual([...expected].sort(byTime))
      expect(setup.rig.backingNotes().every((note) => note.bus === 1)).toBe(true)
    },
  )

  // @test-link [[req_session_backing_track]]
  it('starts exactly when the count-in ends and plays through the silence, planned ahead', () => {
    const setup = transportRig()
    const { rig, transport } = setup
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    const { startAt, countInEndsAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, first, 120)
    rig.advanceTo(beat(startAt, 3.5))
    expect(rig.backingNotes()).toEqual([])
    transport.queueBacking(2, second, 120)
    rig.advanceTo(beat(startAt, 37))
    const notes = rig.backingNotes()
    expect(Math.min(...notes.map((note) => note.at))).toBe(countInEndsAt)
    expect(notes.filter((note) => note.at === countInEndsAt)).toHaveLength(4)
    expect(notes.every((note) => note.at >= countInEndsAt)).toBe(true)
    expect(notes.every((note) => note.scheduledAt <= note.at)).toBe(true)
    expect(Math.max(...notes.map((note) => note.until))).toBe(clickAt(setup, 1, 36))
    expect(rig.audibleBacking()).toHaveLength(notes.length)
  })
})

/** Intent: eight bars of backing at 120 BPM, toggling the backing switch and volume or not. */
function backingRun(toggle: boolean): TransportRig {
  const setup = transportRig()
  const { rig, transport } = setup
  const [first, second] = twoPhraseHarmonies()
  transport.unlock()
  const { startAt } = transport.start({ tempo: 120 })
  transport.queueBacking(1, first, 120)
  transport.queueBacking(2, second, 120)
  rig.advanceTo(beat(startAt, 9.3))
  if (toggle) transport.setBackingOn(false)
  rig.advanceTo(beat(startAt, 13.3))
  if (toggle) transport.setBackingOn(true)
  rig.advanceTo(beat(startAt, 21.3))
  if (toggle) transport.setBackingVolume(0)
  rig.advanceTo(beat(startAt, 25.3))
  if (toggle) transport.setBackingVolume(0.8)
  rig.advanceTo(beat(startAt, 37))
  return setup
}

/** Intent: the recorded events that are not a backing gain change. */
function withoutBackingGains(events: readonly FakeAudioEvent[]): FakeAudioEvent[] {
  return events.filter((event) => !(event.kind === 'gain' && event.gain.startsWith('backing-')))
}

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('muting the backing', () => {
  // @test-link [[req_session_audio_mix]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('changes only the backing gains, never a scheduled note or the clock', () => {
    const muted = backingRun(true)
    const plain = backingRun(false)
    expect(muted.rig.backingNotes().length).toBeGreaterThan(40)
    expect(muted.rig.backingNotes()).toEqual(plain.rig.backingNotes())
    expect(muted.rig.clicks()).toEqual(plain.rig.clicks())
    expect(muted.transport.now()).toBe(plain.transport.now())
    expect(withoutBackingGains(muted.rig.events())).toEqual(withoutBackingGains(plain.rig.events()))
    expect(plain.rig.events().filter((event) => event.kind === 'gain')).toHaveLength(4)
    const backingGains = muted.rig
      .events()
      .slice(4)
      .filter((event) => event.kind === 'gain')
      .map((event) => (event.kind === 'gain' ? [event.gain, event.value] : []))
    expect(backingGains).toEqual([
      ['backing-enable', 0],
      ['backing-enable', 1],
      ['backing-volume', 0],
      ['backing-volume', 0.8],
    ])
  })

  // @test-link [[req_session_audio_mix]]
  it('silences exactly the notes that start while the backing is off or at zero', () => {
    const muted = backingRun(true)
    const startAt = clickAt(muted, 1, 0)
    const silent = (at: number): boolean =>
      (at >= beat(startAt, 9.3) && at < beat(startAt, 13.3)) ||
      (at >= beat(startAt, 21.3) && at < beat(startAt, 25.3))
    const notes = muted.rig.backingNotes()
    expect(muted.rig.audibleBacking().map((note) => note.at)).toEqual(
      notes.filter((note) => !silent(note.at)).map((note) => note.at),
    )
    expect(notes.some((note) => silent(note.at))).toBe(true)
  })
})

// @test-link [[rule_stop_ends_session]]
// @test-link [[req_session_backing_track]]
describe('stopping with backing queued', () => {
  // @test-link [[rule_stop_ends_session]]
  it('plans no backing after the stop and fades the notes already planned past it', () => {
    const { rig, transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    const { startAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, first, 120)
    transport.queueBacking(2, second, 120)
    rig.advanceTo(beat(startAt, 5.8))
    const stopAt = rig.now()
    const { fadeEndsAt } = transport.stop()
    const planned = rig.backingNotes().length
    expect(rig.backingNotes().some((note) => note.at > stopAt)).toBe(true)
    rig.advanceTo(beat(startAt, 40))
    expect(rig.backingNotes()).toHaveLength(planned)
    const audible = rig.audibleBacking()
    expect(audible.every((note) => note.at < stopAt)).toBe(true)
    expect(audible.some((note) => note.at >= fadeEndsAt)).toBe(false)
    expect(() => transport.queueBacking(3, first, 120)).toThrow(/no session/)
  })

  // @test-link [[req_session_backing_track]]
  it('starts the next session with a fresh queue at phrase 1', () => {
    const setup = transportRig()
    const { rig, transport } = setup
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 120 })
    transport.queueBacking(1, first, 120)
    rig.advance(3)
    transport.stop()
    rig.advance(1)
    const { startAt, countInEndsAt } = transport.start({ tempo: 90 })
    expect(() => transport.queueBacking(2, second, 90)).toThrow(/phrase 1/)
    transport.queueBacking(1, second, 90)
    rig.advanceTo(startAt + (21 * 60) / 90)
    const secondSession = rig.backingNotes().filter((note) => note.bus === 2)
    expect(secondSession.length).toBeGreaterThan(0)
    expect(secondSession[0]?.at).toBe(countInEndsAt)
    expect(transport.phraseStartsAt(1)).toBe(countInEndsAt)
    expect(transport.phraseStartsAt(2)).toBe(clickAt(setup, 2, 20))
  })
})

// @test-link [[req_session_backing_track]]
describe('queueing backing early and in order', () => {
  // @test-link [[req_session_backing_track]]
  it('refuses a phrase with no session running', () => {
    const { transport } = transportRig()
    const [first] = twoPhraseHarmonies()
    expect(() => transport.queueBacking(1, first, 120)).toThrow(/no session/)
    transport.unlock()
    expect(() => transport.queueBacking(1, first, 120)).toThrow(/no session/)
    expect(() => transport.phraseStartsAt(1)).toThrow(/no session/)
  })

  // @test-link [[req_session_backing_track]]
  it('refuses a phrase number that is not the next whole number from 1, and keeps the queue', () => {
    const { rig, transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    transport.start({ tempo: 120 })
    for (const bad of [2, 0, -1, 1.5, Number.NaN]) {
      expect(() => transport.queueBacking(bad, first, 120)).toThrow(/phrase/)
    }
    transport.queueBacking(1, first, 120)
    expect(() => transport.queueBacking(1, first, 120)).toThrow(/phrase 2/)
    expect(() => transport.queueBacking(3, first, 120)).toThrow(/phrase 2/)
    expect(() => transport.queueBacking(2, [], 120)).toThrow()
    transport.queueBacking(2, second, 120)
    rig.advance(20)
    expect(rig.backingNotes().length).toBeGreaterThan(40)
  })

  // @test-link [[req_session_backing_track]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('refuses a phrase queued after the scheduler has planned past its start', () => {
    const { rig, transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    const { startAt } = transport.start({ tempo: 120 })
    transport.queueBacking(1, first, 120)
    rig.advanceTo(beat(startAt, 19.7))
    expect(() => transport.queueBacking(2, second, 120)).toThrow(/too late/)
    expect(rig.backingNotes().every((note) => note.at < beat(startAt, 20))).toBe(true)
  })

  // @test-link [[req_session_backing_track]]
  it('accepts a phrase queued a measure before it starts', () => {
    const { rig, transport } = transportRig()
    const [first, second] = twoPhraseHarmonies()
    transport.unlock()
    const { startAt } = transport.start({ tempo: 240 })
    transport.queueBacking(1, first, 240)
    rig.advanceTo(startAt + (16 * 60) / 240)
    transport.queueBacking(2, second, 240)
    rig.advanceTo(startAt + (21 * 60) / 240)
    expect(
      rig.backingNotes().filter((note) => note.at === transport.phraseStartsAt(2)),
    ).toHaveLength(4)
  })
})
