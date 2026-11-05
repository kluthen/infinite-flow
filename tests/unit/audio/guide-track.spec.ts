/**
 * The guides' timing: a phrase's rendered guide notes placed on the audio clock at the exact time
 * of their rational positions through the tempo map (on a beat, exactly that beat's click; off a
 * beat and in triplets, the time the position falls at), and handed out one half-open look-ahead
 * window at a time.
 */

import { describe, expect, it } from 'vitest'

import type { ScheduledGuideNote } from '@/audio/sound-roles'
import { clicksBetween, createClickPlan, withTempoFrom, type ClickPlan } from '@/audio/click-track'
import { guideNotesBetween, scheduleGuide } from '@/audio/guide-track'
import type { GuideNote, RenderedGuide } from '@/domain/backing/guide-renderer'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeRational } from '@/domain/time/rational'

/** Intent: a guide note from a MIDI pitch and a start and length as whole-note fractions. */
function guideNote(
  pitch: number,
  [startN, startD]: readonly [number, number],
  [lengthN, lengthD]: readonly [number, number],
): GuideNote {
  return {
    pitch: makeConcertPitch(pitch),
    start: makeRational(startN, startD),
    duration: makeRational(lengthN, lengthD),
  }
}

/** Intent: the time of every click of `plan` up to session beat `lastBeat`, indexed by beat. */
function clickTimes(plan: ClickPlan, lastBeat: number): number[] {
  const slowest = Math.min(plan.tempo, ...plan.tempoChanges.map((change) => change.tempo))
  const end = plan.startAt + ((lastBeat + 0.5) * 60) / slowest
  return clicksBetween(plan, plan.startAt, end)
    .slice(0, lastBeat + 1)
    .map((click) => click.at)
}

/** A guide on whole beats only: quarters, a half, and a note held across a barline. */
const ON_BEATS: RenderedGuide = {
  melody: [
    guideNote(60, [0, 1], [1, 4]),
    guideNote(62, [1, 4], [1, 2]),
    guideNote(64, [3, 4], [3, 4]),
    guideNote(65, [3, 2], [1, 2]),
    guideNote(67, [2, 1], [2, 1]),
  ],
  rhythm: [
    guideNote(60, [0, 1], [1, 4]),
    guideNote(60, [1, 4], [1, 2]),
    guideNote(65, [3, 4], [3, 4]),
    guideNote(65, [3, 2], [1, 2]),
    guideNote(67, [2, 1], [2, 1]),
  ],
}

/** A guide off the beats: offbeat eighths, eighth triplets and sixteenth triplets. */
const OFF_BEATS: RenderedGuide = {
  melody: [
    guideNote(60, [1, 8], [1, 4]),
    guideNote(62, [3, 8], [1, 8]),
    guideNote(64, [1, 2], [1, 12]),
    guideNote(65, [7, 12], [1, 12]),
    guideNote(67, [2, 3], [1, 12]),
    guideNote(69, [3, 4], [1, 24]),
    guideNote(71, [19, 24], [1, 24]),
    guideNote(72, [5, 6], [1, 24]),
    guideNote(71, [7, 8], [17, 8]),
  ],
  rhythm: [
    guideNote(60, [1, 8], [1, 4]),
    guideNote(60, [3, 8], [1, 8]),
    guideNote(60, [1, 2], [1, 12]),
    guideNote(60, [7, 12], [1, 12]),
    guideNote(60, [2, 3], [1, 12]),
    guideNote(60, [3, 4], [1, 24]),
    guideNote(60, [19, 24], [1, 24]),
    guideNote(60, [5, 6], [1, 24]),
    guideNote(60, [7, 8], [17, 8]),
  ],
}

/** Intent: a whole-note position as quarter beats, read with plain floating division. */
function beatsOf(time: { readonly numerator: number; readonly denominator: number }): number {
  return (time.numerator / time.denominator) * 4
}

/** Intent: the notes of `guide` in the role order the placement uses, melody first. */
function rolesAndNotes(guide: RenderedGuide): [ScheduledGuideNote['role'], GuideNote][] {
  return [
    ...guide.melody.map(
      (note) => ['melody-guide', note] as [ScheduledGuideNote['role'], GuideNote],
    ),
    ...guide.rhythm.map(
      (note) => ['rhythm-guide', note] as [ScheduledGuideNote['role'], GuideNote],
    ),
  ]
}

/** Intent: the placed note for one rendered note, found by role, pitch and start time. */
function placedFor(
  placed: readonly ScheduledGuideNote[],
  role: ScheduledGuideNote['role'],
  note: GuideNote,
  at: number,
): ScheduledGuideNote {
  const found = placed.find(
    (candidate) =>
      candidate.role === role &&
      candidate.pitch === note.pitch &&
      Math.abs(candidate.at - at) < 1e-9,
  )
  if (found === undefined) throw new Error(`no placed ${role} note ${note.pitch} at ${at}`)
  return found
}

// @test-link [[rule_guide_notes_placed_exactly]]
describe('placing guide notes on the audio clock', () => {
  // @test-link [[rule_guide_notes_placed_exactly]]
  it.each([60, 97, 120, 240])(
    'puts every on-beat start and end of phrases 1 and 2 exactly on its click at %s BPM',
    (tempo) => {
      const plan = createClickPlan(5.1, tempo)
      const clicks = clickTimes(plan, 4 + 32)
      for (const phraseNumber of [1, 2]) {
        const firstBeat = 4 + (phraseNumber - 1) * 16
        const placed = scheduleGuide(plan, phraseNumber, ON_BEATS)
        expect(placed).toHaveLength(10)
        for (const [role, note] of rolesAndNotes(ON_BEATS)) {
          const startBeat = firstBeat + beatsOf(note.start)
          const endBeat = startBeat + beatsOf(note.duration)
          const one = placedFor(placed, role, note, clicks[startBeat]!)
          expect(one.at).toBe(clicks[startBeat]!)
          expect(one.until).toBe(clicks[endBeat]!)
        }
      }
    },
  )

  // @test-link [[rule_guide_notes_placed_exactly]]
  it.each([60, 97, 120, 240])(
    'puts every offbeat and triplet start and end where its position falls at %s BPM',
    (tempo) => {
      const plan = createClickPlan(5.1, tempo)
      const placed = scheduleGuide(plan, 1, OFF_BEATS)
      expect(placed).toHaveLength(18)
      const timeOf = (beats: number): number => 5.1 + ((4 + beats) * 60) / tempo
      for (const [role, note] of rolesAndNotes(OFF_BEATS)) {
        const at = timeOf(beatsOf(note.start))
        const one = placedFor(placed, role, note, at)
        expect(one.at).toBeCloseTo(at, 9)
        expect(one.until).toBeCloseTo(timeOf(beatsOf(note.start) + beatsOf(note.duration)), 9)
      }
    },
  )

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('places phrase 2 at its own tempo, set from its first beat as the transport sets it', () => {
    const plan = withTempoFrom(createClickPlan(2, 120), 20, 180)
    const clicks = clickTimes(plan, 36)
    // Phrase 1 runs from beat 4 to beat 20 at 120 BPM; phrase 2 from beat 20 at 180 BPM.
    const phraseOneAt = (beats: number): number => 2 + ((4 + beats) * 60) / 120
    const phraseTwoAt = (beats: number): number => 2 + (20 * 60) / 120 + (beats * 60) / 180
    for (const [phraseNumber, timeOf] of [
      [1, phraseOneAt],
      [2, phraseTwoAt],
    ] as const) {
      const firstBeat = 4 + (phraseNumber - 1) * 16
      const onBeats = scheduleGuide(plan, phraseNumber, ON_BEATS)
      for (const [role, note] of rolesAndNotes(ON_BEATS)) {
        const startBeat = firstBeat + beatsOf(note.start)
        const one = placedFor(onBeats, role, note, clicks[startBeat]!)
        expect(one.at).toBe(clicks[startBeat]!)
        expect(one.until).toBe(clicks[startBeat + beatsOf(note.duration)]!)
      }
      const offBeats = scheduleGuide(plan, phraseNumber, OFF_BEATS)
      for (const [role, note] of rolesAndNotes(OFF_BEATS)) {
        const at = timeOf(beatsOf(note.start))
        const one = placedFor(offBeats, role, note, at)
        expect(one.at).toBeCloseTo(at, 9)
        expect(one.until).toBeCloseTo(timeOf(beatsOf(note.start) + beatsOf(note.duration)), 9)
      }
    }
    // Phrase 1's last note ends exactly where phrase 2's first beat clicks.
    const lastOfPhraseOne = scheduleGuide(plan, 1, ON_BEATS).at(-1)!
    expect(lastOfPhraseOne.until).toBe(clicks[20]!)
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('places a sixteenth-note triplet at 240 BPM, about 42 ms long, without refusing it', () => {
    const plan = createClickPlan(0, 240)
    const shortest: RenderedGuide = {
      melody: [guideNote(60, [1, 24], [1, 24]), guideNote(62, [1, 12], [1, 24])],
      rhythm: [guideNote(60, [1, 24], [1, 24]), guideNote(60, [1, 12], [1, 24])],
    }
    const placed = scheduleGuide(plan, 1, shortest)
    expect(placed).toHaveLength(4)
    for (const note of placed) expect(note.until - note.at).toBeCloseTo(1 / 24, 9)
    expect(placed[0]!.at).toBeCloseTo(1 + 1 / 24, 9)
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('orders notes by start, the melody guide before the rhythm guide on a shared start', () => {
    const placed = scheduleGuide(createClickPlan(0, 120), 1, OFF_BEATS)
    for (let i = 1; i < placed.length; i += 1) {
      expect(placed[i]!.at).toBeGreaterThanOrEqual(placed[i - 1]!.at)
    }
    for (let i = 0; i < placed.length; i += 2) {
      expect(placed[i]!.role).toBe('melody-guide')
      expect(placed[i + 1]!.role).toBe('rhythm-guide')
      expect(placed[i + 1]!.at).toBe(placed[i]!.at)
    }
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('starts phrase 1 on a handed-over first beat, each next phrase four measures later', () => {
    const plan = createClickPlan(1, 100)
    const clicks = clickTimes(plan, 12 + 32)
    expect(scheduleGuide(plan, 1, ON_BEATS, 12)[0]!.at).toBe(clicks[12]!)
    expect(scheduleGuide(plan, 2, ON_BEATS, 12)[0]!.at).toBe(clicks[28]!)
    expect(scheduleGuide(plan, 2, ON_BEATS)[0]!.at).toBe(clicks[20]!)
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('refuses a phrase whose tempo changes inside it, and keeps the phrases around it', () => {
    const plan = withTempoFrom(createClickPlan(0, 120), 12, 150)
    expect(() => scheduleGuide(plan, 1, ON_BEATS)).toThrow(/^guide track: /)
    expect(() => scheduleGuide(plan, 2, ON_BEATS)).not.toThrow()
  })
})

// @test-link [[rule_guide_notes_placed_exactly]]
describe('handing guide notes to the look-ahead scheduler', () => {
  const queue = scheduleGuide(createClickPlan(0, 120), 1, OFF_BEATS)

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('hands out the notes starting in a half-open window, in queue order', () => {
    const from = queue[2]!.at
    const to = queue[6]!.at
    expect(guideNotesBetween(queue, from, to)).toEqual(queue.slice(2, 6))
    expect(guideNotesBetween(queue, from, from)).toEqual([])
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('never repeats or drops a note across consecutive windows', () => {
    const windows = [0, 2.1, 2.25, 2.4, 2.5, 10].map((edge, i, edges) =>
      i === 0 ? [] : guideNotesBetween(queue, edges[i - 1]!, edge),
    )
    expect(windows.flat()).toEqual(queue)
  })

  // @test-link [[rule_guide_notes_placed_exactly]]
  it('throws on a backwards window', () => {
    expect(() => guideNotesBetween(queue, 3, 2)).toThrow(/^guide track: /)
  })
})
