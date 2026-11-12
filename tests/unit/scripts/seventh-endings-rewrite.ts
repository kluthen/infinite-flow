/**
 * The note moves of the seventh-ending renders (v3.3 listening check L1, test tooling; nothing in
 * the app reads it): a phrase's final note moved to its final chord's seventh, and a next phrase's
 * first note moved to the tonic chord's seventh, each to the nearest such pitch inside the
 * phrase's register window. A tied note moves as a whole. Only the endings master spec D6.3 asks
 * to hear are made (D280): a move needs its chord in seventh form, sounding under the moved
 * note's attack, the tonic chord for a landing; anything else is refused, never approximated.
 */

import { makeConcertPitch } from '../../../src/domain/events/concert-pitch'
import { makeMeasure, type Measure } from '../../../src/domain/events/measure'
import { makeNoteEvent, type NoteEvent } from '../../../src/domain/events/measure-event'
import {
  makeConcertEventTimeline,
  type ConcertEventTimeline,
} from '../../../src/domain/events/timeline'
import type { HarmonyEvent } from '../../../src/domain/harmony/harmony-types'

/** One phrase as the renders take it: its notes, its chord plan, its register window, its tempo. */
export interface RenderPhrase {
  readonly timeline: ConcertEventTimeline
  readonly harmony: readonly HarmonyEvent[]
  readonly window: { readonly minMidi: number; readonly maxMidi: number }
  readonly tempo: number
}

/** A moved note: the phrase beat its attack falls on, its pitch before and after. */
export interface MovedNote {
  readonly beat: number
  readonly from: number
  readonly to: number
}

/** A phrase with one note moved, and the move. */
export interface MovedPhrase {
  readonly phrase: RenderPhrase
  readonly moved: MovedNote
}

/** One note event of a timeline: its measure, its place in the measure and its phrase beat. */
interface NotePlace {
  readonly measure: number
  readonly event: number
  readonly beat: number
  readonly note: NoteEvent
}

/** Intent: every note event of a timeline in order, with the phrase beat it starts on. */
function notePlaces(timeline: ConcertEventTimeline): readonly NotePlace[] {
  return timeline.measures.flatMap((measure, measureIndex) => {
    let wholeNotes = 0
    return measure.events.flatMap((event, eventIndex) => {
      const beat = measureIndex * 4 + wholeNotes * 4
      wholeNotes += event.duration.numerator / event.duration.denominator
      return event.kind === 'note'
        ? [{ measure: measureIndex, event: eventIndex, beat, note: event }]
        : []
    })
  })
}

/** Intent: the note places of the tie chain holding note `index`, its attack first. */
function tieChain(places: readonly NotePlace[], index: number): readonly NotePlace[] {
  let head = index
  while (places[head]!.note.tieContinuation) {
    if (head === 0) throw new Error('A tie continuation opens the phrase.')
    head -= 1
  }
  let end = head + 1
  while (places[end]?.note.tieContinuation === true) end += 1
  return places.slice(head, end)
}

/** Intent: the phrase beat a harmony event starts on. */
function startOf(event: HarmonyEvent): number {
  return event.barIndex * 4 + event.startBeat
}

/**
 * Intent: the pitch of `pitchClass` nearest `from` inside the window, the lower of two at the same
 * distance; crashes when the window holds none.
 */
export function nearestOfPitchClass(
  pitchClass: number,
  from: number,
  window: RenderPhrase['window'],
): number {
  let best: number | undefined
  for (let midi = window.minMidi; midi <= window.maxMidi; midi++)
    if (
      midi % 12 === pitchClass &&
      (best === undefined || Math.abs(midi - from) < Math.abs(best - from))
    )
      best = midi
  if (best === undefined)
    throw new Error(
      `The window ${window.minMidi}-${window.maxMidi} holds no pitch of class ${pitchClass}.`,
    )
  return best
}

/** Intent: the timeline with every note of `chain` at `midi`, rebuilt through the constructors. */
function withChainAt(
  timeline: ConcertEventTimeline,
  chain: readonly NotePlace[],
  midi: number,
): ConcertEventTimeline {
  const pitch = makeConcertPitch(midi)
  const moved = new Set(chain.map((place) => `${place.measure}:${place.event}`))
  const measures = timeline.measures.map((measure, measureIndex): Measure =>
    makeMeasure(
      measureIndex,
      measure.events.map((event, eventIndex) =>
        event.kind === 'note' && moved.has(`${measureIndex}:${eventIndex}`)
          ? makeNoteEvent({ ...event, pitch })
          : event,
      ),
    ),
  )
  return makeConcertEventTimeline(measures)
}

/**
 * Intent: the phrase with the tie chain of note `index` moved to the nearest pitch of the seventh
 * of `chord`, which must be in seventh form and sound under the chain's attack. Crashes when the
 * note is already on that pitch: there would be nothing to compare.
 */
function moveToSeventh(
  phrase: RenderPhrase,
  index: number,
  chord: HarmonyEvent,
  what: string,
): MovedPhrase {
  if (chord.seventh === undefined)
    throw new Error(`${what}: the chord is a triad; only a seventh-form chord has a seventh.`)
  const chain = tieChain(notePlaces(phrase.timeline), index)
  const attack = chain[0]!
  const chordEnd = startOf(chord) + chord.durationBeats
  if (attack.beat < startOf(chord) || attack.beat >= chordEnd)
    throw new Error(`${what}: the note on beat ${attack.beat} does not sound under the chord.`)
  const from = attack.note.pitch
  const to = nearestOfPitchClass(chord.seventh.pitchClass, from, phrase.window)
  if (to === from) throw new Error(`${what}: the note is already the chord's seventh.`)
  return {
    phrase: { ...phrase, timeline: withChainAt(phrase.timeline, chain, to) },
    moved: { beat: attack.beat, from, to },
  }
}

/**
 * Intent: the phrase with its final note moved to its final chord's seventh, the nearest one inside
 * its window: an ending on the seventh with no next phrase (D6.3's first example).
 */
export function endingOnSeventh(phrase: RenderPhrase): MovedPhrase {
  const places = notePlaces(phrase.timeline)
  if (places.length === 0) throw new Error('The phrase holds no note.')
  return moveToSeventh(phrase, places.length - 1, phrase.harmony.at(-1)!, 'Ending')
}

/**
 * Intent: a next phrase with its first note moved to the tonic chord's seventh, the nearest one
 * inside its window: a landing on the seventh (D6.3's second example). Its first chord must be the
 * tonic (degree 1), in seventh form.
 */
export function landingOnSeventh(phrase: RenderPhrase): MovedPhrase {
  const first = phrase.harmony[0]
  if (first?.triad.degree !== 1)
    throw new Error(`Landing: the phrase opens on degree ${first?.triad.degree}, not the tonic.`)
  if (notePlaces(phrase.timeline).length === 0) throw new Error('The phrase holds no note.')
  return moveToSeventh(phrase, 0, first, 'Landing')
}
