/**
 * The Counter-melody (contrasting) part of a phrase's accompaniment, rendered from the phrase and
 * its lead facts: a lane beside the lead's register window, one guide tone per harmony event
 * chosen by nearness and checked against the bass's move, and each note's start read from the
 * lead's attacks. Pure arithmetic in whole-note rationals from the phrase's start.
 */

import { makeConcertPitch } from '../events/concert-pitch'
import { FOUR_FOUR_METER, PHRASE_MEASURE_COUNT } from '../generation/generation-request-envelope'
import type { HarmonyEvent } from '../harmony/harmony-types'
import type { RegisterId } from '../profile/register-id'
import {
  addRational,
  compareRational,
  equalsRational,
  makeRational,
  subtractRational,
  type Rational,
} from '../time/rational'
import {
  makePartNote,
  type ArrangerPhrase,
  type PartNote,
  type PhraseWindow,
} from './accompaniment-part'
import { renderBacking, type BackingNote } from './backing-renderer'
import type { LeadFacts } from './lead-facts'

/** The lane's nearest and farthest distances from the lead's window in half steps, and its floor. */
// @spec-link [[rule_contrasting_part_lane]]
export const COUNTER_MELODY_LANE = { nearest: 3, farthest: 15, floor: 48 } as const

/** The velocity of the Counter-melody part's notes. */
// @spec-link [[req_contrasting_part]]
export const COUNTER_MELODY_VELOCITY = 64

/** Which side of the lead's window the lane lies on, for each register window. */
// @spec-link [[rule_contrasting_part_lane]]
const LANE_SIDE: Readonly<Record<RegisterId, 'above' | 'below'>> = {
  Low: 'above',
  Middle: 'above',
  High: 'below',
}

const OCTAVE = 12
const PERFECT_FIFTH = 7
const LATER_EIGHTHS = [1, 2, 3].map((count) => makeRational(count, 8))
const PHRASE_END = makeRational(PHRASE_MEASURE_COUNT, 1)

/** The lane's inclusive MIDI bounds; empty when `low` is above `high`. */
interface Lane {
  readonly low: number
  readonly high: number
}

/** The bass notes sounding just before and just from a chord's start. */
interface BassMove {
  readonly before: number
  readonly after: number
}

/** A chosen counter-melody note before its length is known. */
interface Attack {
  readonly pitch: number
  readonly start: Rational
}

/**
 * The Counter-melody part's notes for a phrase, in start order: per harmony event its chosen
 * guide tone, unless it repeats the previous note or the chord has no candidate; each note lasts
 * until the next starts and the last until the phrase ends. Deterministic and pure; lets the
 * backing renderer's BackingRenderError through on harmony that does not tile the phrase.
 */
// @spec-link [[req_accompaniment_parts]]
// @spec-link [[req_contrasting_part]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
export function counterMelodyPart(phrase: ArrangerPhrase, lead: LeadFacts): readonly PartNote[] {
  const lane = counterMelodyLane(phrase.window)
  if (lane.low > lane.high) return []
  const bass = renderBacking(phrase.harmony, FOUR_FOUR_METER).bass
  const attacks: Attack[] = []
  for (const event of phrase.harmony) {
    const start = chordStart(event)
    const candidates = guideToneCandidates(event, lane)
    const previous = attacks.at(-1)?.pitch ?? null
    const pitch =
      previous === null
        ? nearest(candidates, (lane.low + lane.high) / 2)
        : nextPitch(candidates, previous, bassMove(bass, start))
    if (pitch !== null && pitch !== previous) attacks.push({ pitch, start: noteStart(start, lead) })
  }
  return attacks.map((attack, index) => {
    const end = attacks[index + 1]?.start ?? PHRASE_END
    const sound = { kind: 'pitch', pitch: makeConcertPitch(attack.pitch) } as const
    const duration = subtractRational(end, attack.start)
    return makePartNote(attack.start, duration, sound, COUNTER_MELODY_VELOCITY)
  })
}

/** The lane's MIDI bounds beside the phrase's register window. */
// @spec-link [[rule_contrasting_part_lane]]
function counterMelodyLane(window: PhraseWindow): Lane {
  const { nearest: near, farthest, floor } = COUNTER_MELODY_LANE
  const { minMidi, maxMidi } = window.range
  if (LANE_SIDE[window.register] === 'above') {
    return { low: maxMidi + near, high: maxMidi + farthest }
  }
  return { low: Math.max(floor, minMidi - farthest), high: minMidi - near }
}

/** A harmony event's start in whole notes from the phrase's start. */
function chordStart(event: HarmonyEvent): Rational {
  const beat = event.barIndex * FOUR_FOUR_METER.beatsPerMeasure + event.startBeat
  return makeRational(beat, FOUR_FOUR_METER.beatUnit)
}

/** Every MIDI pitch in the lane, ascending, whose pitch class is one of the event's guide tones. */
// @spec-link [[rule_contrasting_part_guide_tones]]
function guideToneCandidates(event: HarmonyEvent, lane: Lane): number[] {
  const [, third, fifth] = event.triad.pitchClasses
  const classes: readonly number[] =
    event.seventh === undefined ? [third, fifth] : [third, event.seventh.pitchClass]
  const candidates: number[] = []
  for (let pitch = lane.low; pitch <= lane.high; pitch += 1) {
    if (classes.includes(pitchClassOf(pitch))) candidates.push(pitch)
  }
  return candidates
}

/** The pitch class 0-11 of a MIDI pitch, or of an interval in half steps. */
function pitchClassOf(value: number): number {
  return ((value % OCTAVE) + OCTAVE) % OCTAVE
}

/** Of ascending `candidates`, the one nearest `target`, the lower on a tie; null when none. */
// @spec-link [[rule_contrasting_part_voice_leading]]
function nearest(candidates: readonly number[], target: number): number | null {
  let best: number | null = null
  for (const candidate of candidates) {
    if (best === null || Math.abs(candidate - target) < Math.abs(best - target)) best = candidate
  }
  return best
}

/**
 * The note after `previous`: the nearest of the candidates that make no parallel fifth or octave
 * with the bass's move, or of all the candidates when every one does; null when there is none.
 */
// @spec-link [[rule_contrasting_part_voice_leading]]
function nextPitch(candidates: readonly number[], previous: number, move: BassMove): number | null {
  const free = candidates.filter((candidate) => !makesParallel(previous, candidate, move))
  return nearest(free.length > 0 ? free : candidates, previous)
}

/**
 * Whether moving from `previous` to `candidate` while the bass moves from `move.before` to
 * `move.after` keeps the same perfect fifth or octave, simple or compound, between the two parts.
 */
// @spec-link [[rule_contrasting_part_voice_leading]]
function makesParallel(previous: number, candidate: number, move: BassMove): boolean {
  if (candidate === previous || move.after === move.before) return false
  const before = pitchClassOf(previous - move.before)
  const after = pitchClassOf(candidate - move.after)
  return before === after && (before === 0 || before === PERFECT_FIFTH)
}

/**
 * The bass note sounding just before `start` and the one starting at `start`. Throws an Error when
 * either is missing, which the backing renderer never leaves at a harmony event's start.
 */
function bassMove(bass: readonly BackingNote[], start: Rational): BassMove {
  const before = bass.filter((note) => compareRational(note.start, start) < 0).at(-1)
  const after = bass.find((note) => equalsRational(note.start, start))
  if (before === undefined || after === undefined) {
    throw new Error(
      `counter-melody: no bass move at the chord change ${start.numerator}/${start.denominator}`,
    )
  }
  return { before: Number(before.pitch), after: Number(after.pitch) }
}

/** The start of a chord's note starting at `start`, read from the lead notes' attacks. */
// @spec-link [[rule_contrasting_part_timing]]
function noteStart(start: Rational, lead: LeadFacts): Rational {
  /** Whether a lead note, its ties folded in, starts at `at`. */
  const attacked = (at: Rational) => lead.notes.some((note) => equalsRational(note.start, at))
  if (!attacked(start)) return start
  const free = LATER_EIGHTHS.map((offset) => addRational(start, offset)).find((at) => !attacked(at))
  return free ?? start
}
