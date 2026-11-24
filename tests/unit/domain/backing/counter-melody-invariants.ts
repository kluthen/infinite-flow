/**
 * An independent oracle for the Counter-melody part (master spec §6.4): written from the rules
 * alone, it reads nothing of the part's own helpers, only the backing renderer's bass for the
 * bass's move at each chord change, and asserts with vitest's `expect`, the phrase's label as the
 * message. "Parallel" follows the lexicon: both parts move, and the interval between them (mod 12)
 * is the same fifth or octave before and after the change. Test plumbing.
 */

import { expect } from 'vitest'

import type { ArrangerPhrase, PartNote, PhraseWindow } from '@/domain/backing/accompaniment-part'
import { renderBacking, type BackingNote } from '@/domain/backing/backing-renderer'
import type { LeadFacts } from '@/domain/backing/lead-facts'
import { FOUR_FOUR_METER } from '@/domain/generation/generation-request'
import type { HarmonyEvent } from '@/domain/harmony/harmony-types'
import {
  addRational,
  compareRational,
  equalsRational,
  makeRational,
  type Rational,
} from '@/domain/time/rational'
import {
  RELATION_PART_FLOOR,
  RELATION_PART_VELOCITY,
  chordSpans,
  holds,
  pitchClass,
  pitchedNote,
  ratText,
  type ChordSpan,
  type PitchedNote,
} from './relation-part-invariants'

/** What one phrase's Counter-melody check counted. */
export interface CounterMelodyCounts {
  /** Counter-melody notes the part gave. */
  readonly notes: number
  /** Chords whose chosen guide tone was the previous note, so no note started (a hold). */
  readonly holds: number
  /** Chords where the nearest candidate made parallels with the bass and another was chosen. */
  readonly parallelSkips: number
  /** Whether the phrase's lane holds no pitch, so the part is empty. */
  readonly emptyLane: boolean
}

/** The lane's inclusive MIDI bounds and the side of the lead's window it lies on. */
interface Lane {
  readonly low: number
  readonly high: number
  readonly above: boolean
}

const PHRASE_END = makeRational(4, 1)
const LATER_EIGHTHS = [1, 2, 3].map((eighths) => makeRational(eighths, 8))
const PERFECT_FIFTH = 7

/** The lane: 3 to 15 half steps above a Low or Middle window, 15 to 3 below a High one, ≥ 48. */
function laneOf(window: PhraseWindow): Lane {
  const { minMidi, maxMidi } = window.range
  if (window.register === 'High') {
    return { low: Math.max(RELATION_PART_FLOOR, minMidi - 15), high: minMidi - 3, above: false }
  }
  return { low: maxMidi + 3, high: maxMidi + 15, above: true }
}

/** The chord's guide tones: third and seventh for a seventh chord, third and fifth for a triad. */
function guideTones(event: HarmonyEvent): readonly number[] {
  const [, third, fifth] = event.triad.pitchClasses
  return event.seventh === undefined ? [third, fifth] : [third, event.seventh.pitchClass]
}

/** Every lane pitch, ascending, that is one of the chord's guide tones. */
function candidatesOf(event: HarmonyEvent, lane: Lane): readonly number[] {
  const tones = guideTones(event)
  const candidates: number[] = []
  for (let pitch = lane.low; pitch <= lane.high; pitch += 1) {
    if (tones.includes(pitchClass(pitch))) candidates.push(pitch)
  }
  return candidates
}

/** The candidate nearest `target`, the lower on a tie; `candidates` is non-empty. */
function nearestTo(candidates: readonly number[], target: number): number {
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b,
  )
  return sorted[0]!
}

/** The bass note sounding up to `at` and the one starting at `at`; throws when either is missing. */
function bassMove(bass: readonly BackingNote[], at: Rational, label: string) {
  const before = bass.find(
    (note) =>
      compareRational(note.start, at) < 0 &&
      compareRational(at, addRational(note.start, note.duration)) <= 0,
  )
  const after = bass.find((note) => equalsRational(note.start, at))
  if (before === undefined || after === undefined) {
    throw new Error(`${label}: no bass move at the chord change ${ratText(at)}.`)
  }
  return { before: Number(before.pitch), after: Number(after.pitch) }
}

/** Whether `previous` → `next` over the bass's `before` → `after` makes parallel fifths or octaves. */
function parallel(previous: number, next: number, move: { before: number; after: number }) {
  if (next === previous || move.after === move.before) return false
  const was = pitchClass(previous - move.before)
  return was === pitchClass(next - move.after) && (was === 0 || was === PERFECT_FIFTH)
}

/** Where a chord's note starts: the chord's start, or the first free eighth of its first two beats. */
function expectedStart(chordStart: Rational, lead: LeadFacts): Rational {
  const attacked = (at: Rational) => lead.notes.some((note) => equalsRational(note.start, at))
  if (!attacked(chordStart)) return chordStart
  const later = LATER_EIGHTHS.map((offset) => addRational(chordStart, offset))
  return later.find((at) => !attacked(at)) ?? chordStart
}

/**
 * Assert the Counter-melody part of a phrase against §6.4: in its lane, outside the lead's window
 * and never crossing the lead; one guide tone per chord, voice-led by the nearest note with
 * parallels skipped, a repeated pitch held; each note's start as the timing rule gives it, the
 * notes contiguous to the phrase's end; velocity 64. An empty lane gives an empty part. Returns
 * what it counted.
 */
export function expectCounterMelodyInvariants(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  notes: readonly PartNote[],
  label: string,
): CounterMelodyCounts {
  const lane = laneOf(phrase.window)
  if (lane.low > lane.high) {
    expect(notes, `${label}: an empty lane gives no counter-melody`).toEqual([])
    return { notes: 0, holds: 0, parallelSkips: 0, emptyLane: true }
  }
  const pitched = notes.map((note) => pitchedNote(note, label))
  for (const note of notes) expect(note.velocity, label).toBe(RELATION_PART_VELOCITY)
  expectLineShape(pitched, label)
  for (const note of pitched) expectNoteBeside(note, phrase.window, lane, lead, label)
  const walked = expectVoiceLeading(phrase, lead, pitched, lane, label)
  return { notes: notes.length, ...walked, emptyLane: false }
}

/** Assert the line rests until its first note, then is contiguous, never repeats, ends at 4/1. */
function expectLineShape(notes: readonly PitchedNote[], label: string): void {
  notes.forEach((note, index) => {
    const end = addRational(note.start, note.duration)
    const next = notes[index + 1]
    expect(end, `${label}: counter note at ${ratText(note.start)} ends`).toEqual(
      next?.start ?? PHRASE_END,
    )
    if (next !== undefined) expect(next.pitch, `${label}: held, not repeated`).not.toBe(note.pitch)
  })
}

/** Assert one note in the lane, outside the window, and on its side of every lead note it meets. */
function expectNoteBeside(
  note: PitchedNote,
  window: PhraseWindow,
  lane: Lane,
  lead: LeadFacts,
  label: string,
): void {
  const where = `${label}: counter note ${note.pitch} at ${ratText(note.start)}`
  expect(note.pitch, `${where} in lane`).toBeGreaterThanOrEqual(lane.low)
  expect(note.pitch, `${where} in lane`).toBeLessThanOrEqual(lane.high)
  const inWindow = note.pitch >= window.range.minMidi && note.pitch <= window.range.maxMidi
  expect(inWindow, `${where} outside the window`).toBe(false)
  const end = addRational(note.start, note.duration)
  for (const leadNote of lead.notes) {
    const leadEnd = addRational(leadNote.start, leadNote.duration)
    const overlaps =
      compareRational(leadNote.start, end) < 0 && compareRational(note.start, leadEnd) < 0
    if (!overlaps) continue
    const side = lane.above ? note.pitch > leadNote.pitch : note.pitch < leadNote.pitch
    expect(side, `${where} crosses lead ${leadNote.pitch} at ${ratText(leadNote.start)}`).toBe(true)
  }
}

/**
 * Walk the chords in order and assert each one's note: none when it has no candidate; else the
 * candidate nearest the lane's centre for the first note, then the one nearest the previous note
 * among those making no parallels (all of them when every one does), the lower on a tie; a new
 * note at the timing rule's start, or none when the choice repeats the previous note.
 */
function expectVoiceLeading(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  notes: readonly PitchedNote[],
  lane: Lane,
  label: string,
): { readonly holds: number; readonly parallelSkips: number } {
  const bass = renderBacking(phrase.harmony, FOUR_FOUR_METER).bass
  const centre = (lane.low + lane.high) / 2
  let previous: number | null = null
  let held = 0
  let parallelSkips = 0
  let placed = 0
  for (const span of chordSpans(phrase.harmony)) {
    const where = `${label}: chord at ${ratText(span.start)}`
    const starting = notes.filter((note) => holds(span, note.start))
    placed += starting.length
    const candidates = candidatesOf(span.event, lane)
    if (candidates.length === 0) {
      expect(starting, `${where} has no candidate`).toEqual([])
      continue
    }
    const choice: Choice =
      previous === null
        ? { pitch: nearestTo(candidates, centre), skipped: false }
        : voiceLed(candidates, previous, bassMove(bass, span.start, label))
    if (choice.skipped) parallelSkips += 1
    if (starting.length === 0) {
      expect(previous, `${where} holds its chosen note`).toBe(choice.pitch)
      held += 1
    } else {
      expectChordNote(starting, choice.pitch, span, lead, where)
    }
    previous = choice.pitch
  }
  expect(placed, `${label}: every counter note starts in a chord`).toBe(notes.length)
  return { holds: held, parallelSkips }
}

/** A chord's chosen guide tone, and whether a parallel made it skip the nearest candidate. */
interface Choice {
  readonly pitch: number
  readonly skipped: boolean
}

/** The voice-led choice after `previous`, and whether a parallel made it skip the nearest one. */
function voiceLed(
  candidates: readonly number[],
  previous: number,
  move: { before: number; after: number },
): Choice {
  const free = candidates.filter((candidate) => !parallel(previous, candidate, move))
  const pitch = nearestTo(free.length > 0 ? free : candidates, previous)
  return { pitch, skipped: pitch !== nearestTo(candidates, previous) }
}

/** Assert a chord's one new note: the chosen pitch, a guide tone, at the timing rule's start. */
function expectChordNote(
  starting: readonly PitchedNote[],
  chosen: number,
  span: ChordSpan,
  lead: LeadFacts,
  where: string,
): void {
  expect(starting.length, `${where}: one note`).toBe(1)
  const [note] = starting
  expect(note!.pitch, `${where}: chosen guide tone`).toBe(chosen)
  expect(guideTones(span.event), `${where}: guide tone`).toContain(pitchClass(note!.pitch))
  expect(note!.start, `${where}: timing`).toEqual(expectedStart(span.start, lead))
}
