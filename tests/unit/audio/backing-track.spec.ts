/**
 * The backing timing: a phrase's rendered backing placed on the session's beat grid with the very
 * arithmetic the click track uses, so a backing note on a beat falls exactly on that beat's click,
 * and handed out one half-open look-ahead window at a time.
 */

import { describe, expect, it } from 'vitest'

import type { ScheduledBackingNote } from '@/audio/audio-ports'
import { backingNotesBetween, phraseStartsAt, scheduleBacking } from '@/audio/backing-track'
import {
  clicksBetween,
  countInEndsAt,
  createClickPlan,
  withTempoFrom,
  type ClickPlan,
} from '@/audio/click-track'
import { renderBacking, type RenderedBacking } from '@/domain/backing/backing-renderer'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import { makeRational } from '@/domain/time/rational'
import { renderedAttacks, twoPhraseHarmonies } from './backing-harmony'

/** Intent: the time of every click of `plan` up to session beat `lastBeat`, indexed by beat. */
function clickTimes(plan: ClickPlan, lastBeat: number): number[] {
  const end = plan.startAt + ((lastBeat + 0.5) * 60) / plan.tempo
  return clicksBetween(plan, plan.startAt, end).map((click) => click.at)
}

/** Intent: the notes the renderer asks phrase `phraseNumber` for, on the click times given. */
function expectedNotes(
  harmonyIndex: 0 | 1,
  phraseNumber: number,
  clicks: readonly number[],
): ScheduledBackingNote[] {
  const firstBeat = 4 + (phraseNumber - 1) * 16
  const notes = renderedAttacks(twoPhraseHarmonies()[harmonyIndex]).map((attack) => ({
    voice: attack.voice,
    pitch: attack.pitch,
    at: clicks[firstBeat + attack.startBeat]!,
    until: clicks[firstBeat + attack.endBeat]!,
  }))
  return notes.sort((a, b) => a.at - b.at)
}

// @test-link [[req_session_backing_track]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('placing a phrase on the beat grid', () => {
  // @test-link [[req_session_backing_track]]
  // @test-link [[rule_playhead_follows_audio_clock]]
  it.each([60, 120, 240, 97])(
    'puts every note of phrases 1 and 3 exactly on its click at %s BPM',
    (tempo) => {
      const plan = createClickPlan(5.1, tempo)
      const clicks = clickTimes(plan, 4 + 48)
      const rendered = renderBacking(twoPhraseHarmonies()[0], FOUR_FOUR_METER)
      expect(scheduleBacking(plan, 1, rendered)).toEqual(expectedNotes(0, 1, clicks))
      expect(scheduleBacking(plan, 3, rendered)).toEqual(expectedNotes(0, 3, clicks))
    },
  )

  // @test-link [[req_session_backing_track]]
  it('starts phrase 1 when the count-in ends and each next phrase four measures later', () => {
    const plan = createClickPlan(5.1, 120)
    const clicks = clickTimes(plan, 4 + 48)
    expect(phraseStartsAt(plan, 1)).toBe(countInEndsAt(plan))
    expect(phraseStartsAt(plan, 2)).toBe(clicks[20])
    expect(phraseStartsAt(plan, 4)).toBe(clicks[52])
  })

  // @test-link [[req_session_backing_track]]
  it('throws on a phrase number that is not a whole number from 1', () => {
    const plan = createClickPlan(5.1, 120)
    const rendered = renderBacking(twoPhraseHarmonies()[0], FOUR_FOUR_METER)
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => phraseStartsAt(plan, bad)).toThrow(/phrase/)
      expect(() => scheduleBacking(plan, bad, rendered)).toThrow(/phrase/)
    }
  })

  // @test-link [[req_session_backing_track]]
  it('throws on a backing note that does not start and end on a whole beat', () => {
    const plan = createClickPlan(5.1, 120)
    const offBeat = (start: number, duration: number): RenderedBacking => ({
      bass: [
        {
          pitch: makeConcertPitch(36),
          start: makeRational(start, 8),
          duration: makeRational(duration, 8),
        },
      ],
      chords: [],
    })
    expect(() => scheduleBacking(plan, 1, offBeat(1, 2))).toThrow(/whole beat/)
    expect(() => scheduleBacking(plan, 1, offBeat(2, 1))).toThrow(/whole beat/)
    expect(scheduleBacking(plan, 1, offBeat(2, 4))).toHaveLength(1)
  })
})

// @test-link [[req_session_backing_track]]
// @test-link [[module_session_transport_tempo_map]]
describe('placing a phrase at its own tempo', () => {
  // @test-link [[req_session_backing_track]]
  // @test-link [[module_session_transport_tempo_map]]
  it('starts and sizes every note of a risen phrase at that phrase tempo', () => {
    const plan = withTempoFrom(withTempoFrom(createClickPlan(5.1, 90), 20, 95), 36, 100)
    const rendered = renderBacking(twoPhraseHarmonies()[0], FOUR_FOUR_METER)
    const phraseTwoAt = 5.1 + (20 * 60) / 90
    const phraseThreeAt = phraseTwoAt + (16 * 60) / 95
    expect(phraseStartsAt(plan, 2)).toBe(phraseTwoAt)
    expect(phraseStartsAt(plan, 3)).toBe(phraseThreeAt)
    expect(phraseStartsAt(plan, 4)).toBeCloseTo(phraseThreeAt + (16 * 60) / 100, 12)
    const attacks = renderedAttacks(twoPhraseHarmonies()[0])
    for (const [phraseNumber, startsAt, tempo] of [
      [2, phraseTwoAt, 95],
      [3, phraseThreeAt, 100],
    ] as const) {
      const notes = scheduleBacking(plan, phraseNumber, rendered)
      const expected = attacks
        .map((attack) => ({
          voice: attack.voice,
          pitch: attack.pitch,
          at: startsAt + (attack.startBeat * 60) / tempo,
          until: startsAt + (attack.endBeat * 60) / tempo,
        }))
        .sort((a, b) => a.at - b.at)
      expect(notes).toHaveLength(expected.length)
      notes.forEach((note, index) => {
        expect(note).toMatchObject({ voice: expected[index]!.voice, pitch: expected[index]!.pitch })
        expect(note.at).toBeCloseTo(expected[index]!.at, 12)
        expect(note.until).toBeCloseTo(expected[index]!.until, 12)
      })
    }
  })

  // @test-link [[module_session_transport_tempo_map]]
  it('throws on a phrase whose tempo changes inside it', () => {
    const plan = withTempoFrom(createClickPlan(5.1, 90), 25, 95)
    const rendered = renderBacking(twoPhraseHarmonies()[0], FOUR_FOUR_METER)
    expect(() => scheduleBacking(plan, 2, rendered)).toThrow(/tempo/)
    expect(scheduleBacking(plan, 1, rendered).length).toBeGreaterThan(0)
  })
})

// @test-link [[req_session_backing_track]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('handing out the backing one window at a time', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('gives every note exactly once across consecutive half-open windows', () => {
    const plan = createClickPlan(5.1, 240)
    const [first, second] = twoPhraseHarmonies()
    const queue = [
      ...scheduleBacking(plan, 1, renderBacking(first, FOUR_FOUR_METER)),
      ...scheduleBacking(plan, 2, renderBacking(second, FOUR_FOUR_METER)),
    ]
    const handedOut: ScheduledBackingNote[] = []
    let from = 5
    for (let step = 1; from < 20; step += 1) {
      const to = 5 + step * 0.0625
      const window = backingNotesBetween(queue, from, to)
      window.forEach((note) => {
        expect(note.at).toBeGreaterThanOrEqual(from)
        expect(note.at).toBeLessThan(to)
      })
      handedOut.push(...window)
      from = to
    }
    expect(handedOut).toEqual(queue)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('includes a note on the window start and leaves one on its end to the next window', () => {
    const plan = createClickPlan(5.1, 120)
    const queue = scheduleBacking(plan, 1, renderBacking(twoPhraseHarmonies()[0], FOUR_FOUR_METER))
    const phraseStart = phraseStartsAt(plan, 1)
    expect(backingNotesBetween(queue, phraseStart - 0.1, phraseStart)).toEqual([])
    const atStart = backingNotesBetween(queue, phraseStart, phraseStart + 0.1)
    expect(atStart.length).toBeGreaterThanOrEqual(4)
    expect(atStart.every((note) => note.at === phraseStart)).toBe(true)
    expect(() => backingNotesBetween(queue, 7, 6)).toThrow(/backwards/)
  })
})
