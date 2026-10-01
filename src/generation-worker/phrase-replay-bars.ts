/**
 * The bar-by-bar part of the headless phrase replay report: for each of the four bars, its chords
 * (1-based beat timing, roles, concert and written symbols) and every note and rest in order
 * (1-based onset beat, duration, concert and written pitch, ties). Written pitches and chord
 * symbols are read from the notation path (notationInputFromOutcome then
 * transformToWrittenPhrase), never transposed here.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import type { EventAnnotations, MeasureEvent } from '../domain/events/measure-event'
import type { ConcertEventTimeline } from '../domain/events/timeline'
import type { BarRole, HarmonyEvent } from '../domain/harmony/harmony-types'
import { notationInputFromOutcome } from '../domain/notation/notation-input'
import { transformToWrittenPhrase } from '../domain/notation/written-phrase'
import type {
  ConcertChordSymbol,
  WrittenKey,
  WrittenMeasure,
  WrittenPhrase,
} from '../domain/notation/written-phrase-types'
import { addRational, makeRational, type Rational } from '../domain/time/rational'
import {
  midiOfSpelledPitch,
  namedPitchInKey,
  pitchClassNameInKey,
  spelledPitchName,
  type NamedPitch,
} from './phrase-replay-names'

/** A successful generation outcome. */
type SuccessOutcome = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** An exact duration in whole notes ('1/8') beside its length in quarter-note beats (0.5). */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayDuration {
  readonly wholeNotes: string
  readonly beats: number
}

/** One bar role of a harmony event, its 0-based bar index kept beside the 1-based bar number. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayBarRole extends BarRole {
  readonly bar: number
}

/** One harmony event as a chord of the bar it starts in. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayChord {
  /** Index of this event in the selected harmony candidate's events. */
  readonly harmonyEventIndex: number
  /** 1-based quarter beat within the bar the chord starts on. */
  readonly startBeat: number
  readonly durationBeats: number
  /** Concert chord symbol, root spelled in the concert key. */
  readonly symbol: string
  /** The chord symbol the written staff shows, from the notation path. */
  readonly writtenSymbol: string
  readonly degree: number
  readonly quality: HarmonyEvent['triad']['quality']
  readonly pitchClasses: readonly number[]
  readonly pitchClassNames: readonly string[]
  readonly role: HarmonyEvent['role']
  readonly barRoles: readonly ReplayBarRole[]
  readonly templateId: string
}

/** Fields every replayed event carries. */
interface ReplayEventBase {
  /** Index of the event within its bar's concert timeline measure. */
  readonly index: number
  /** 1-based quarter beat within the bar where the event starts, for example 2.5. */
  readonly onsetBeat: number
  readonly duration: ReplayDuration
  readonly annotations: EventAnnotations | null
}

/** A replayed note: concert pitch from the timeline, written pitch from the notation path. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayNoteEvent extends ReplayEventBase {
  readonly kind: 'note'
  readonly concert: NamedPitch
  readonly written: NamedPitch
  /** This note continues the previous note's pitch rather than attacking it again. */
  readonly tieContinuation: boolean
  /** The next event (in this bar or the next) is a tie continuation of this note. */
  readonly tiesIntoNext: boolean
}

/** A replayed rest. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayRestEvent extends ReplayEventBase {
  readonly kind: 'rest'
}

/** A replayed note or rest. */
// @spec-link [[service_headless_phrase_replay]]
export type ReplayEvent = ReplayNoteEvent | ReplayRestEvent

/** One bar of the replayed phrase, numbered from 1. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayBar {
  readonly bar: number
  readonly chords: readonly ReplayChord[]
  readonly events: readonly ReplayEvent[]
}

/** The written phrase and concert chord symbols the notation path derives from one outcome. */
// @spec-link [[service_headless_phrase_replay]]
export interface ReplayNotation {
  readonly written: WrittenPhrase
  readonly concertChords: readonly ConcertChordSymbol[]
}

/** Intent: run the existing notation path on a successful outcome and its intent. */
// @spec-link [[service_headless_phrase_replay]]
export function replayNotation(outcome: SuccessOutcome, intent: GenerationIntent): ReplayNotation {
  const input = notationInputFromOutcome(outcome, intent)
  return { written: transformToWrittenPhrase(input), concertChords: input.chords }
}

/** Intent: an exact whole-note duration as 'n/d' beside its quarter-beat length. */
// @spec-link [[service_headless_phrase_replay]]
export function replayDuration(duration: Rational): ReplayDuration {
  return {
    wholeNotes: `${duration.numerator}/${duration.denominator}`,
    beats: (duration.numerator * 4) / duration.denominator,
  }
}

/** Intent: whether the event after (bar, index), in this bar or the next, is a tie continuation. */
function nextEventIsTieContinuation(
  timeline: ConcertEventTimeline,
  measureIndex: number,
  eventIndex: number,
): boolean {
  const events = timeline.measures[measureIndex]!.events
  const next =
    eventIndex + 1 < events.length
      ? events[eventIndex + 1]
      : timeline.measures[measureIndex + 1]?.events[0]
  return next?.kind === 'note' && next.tieContinuation
}

/** Intent: the written pitch of a concert note, read from its first glyph in the written measure. */
function writtenPitchOf(measure: WrittenMeasure, eventIndex: number): NamedPitch {
  const glyph = measure.events.find(
    (event) => event.kind === 'note' && event.sourceEventIndex === eventIndex,
  )
  if (glyph?.kind !== 'note') {
    throw new RangeError(
      `Written bar ${measure.index + 1} has no note glyph for concert event ${eventIndex}.`,
    )
  }
  return { midi: midiOfSpelledPitch(glyph.pitch), name: spelledPitchName(glyph.pitch) }
}

/** Intent: one concert event restated with its onset, duration, pitches and ties. */
function replayEvent(
  event: MeasureEvent,
  context: {
    readonly timeline: ConcertEventTimeline
    readonly written: WrittenMeasure
    readonly concertKey: WrittenKey
    readonly measureIndex: number
    readonly index: number
    readonly onset: Rational
  },
): ReplayEvent {
  const { index } = context
  const timing = {
    onsetBeat: 1 + replayDuration(context.onset).beats,
    duration: replayDuration(event.duration),
  }
  const annotations = event.annotations ?? null
  if (event.kind === 'rest') return { index, kind: 'rest', ...timing, annotations }
  return {
    index,
    kind: 'note',
    ...timing,
    concert: namedPitchInKey(event.pitch, context.concertKey),
    written: writtenPitchOf(context.written, index),
    tieContinuation: event.tieContinuation,
    tiesIntoNext: nextEventIsTieContinuation(context.timeline, context.measureIndex, index),
    annotations,
  }
}

/** Intent: every event of one bar, in order, with its running onset. */
function replayEvents(
  timeline: ConcertEventTimeline,
  written: WrittenPhrase,
  concertKey: WrittenKey,
  measureIndex: number,
): readonly ReplayEvent[] {
  let onset = makeRational(0, 1)
  return timeline.measures[measureIndex]!.events.map((event, index) => {
    const replayed = replayEvent(event, {
      timeline,
      written: written.measures[measureIndex]!,
      concertKey,
      measureIndex,
      index,
      onset,
    })
    onset = addRational(onset, event.duration)
    return replayed
  })
}

/** Intent: the chord symbol placed at one bar and tick, crashing when the notation path has none. */
function symbolAt<T>(symbols: readonly T[], matches: (symbol: T) => boolean, where: string): T {
  const found = symbols.find(matches)
  if (found === undefined)
    throw new RangeError(`The notation path has no chord symbol at ${where}.`)
  return found
}

/** Intent: one harmony event restated as a chord of its starting bar. */
function replayChord(
  event: HarmonyEvent,
  harmonyEventIndex: number,
  notation: ReplayNotation,
  concertKey: WrittenKey,
): ReplayChord {
  const tick = event.startBeat * 4
  const where = `bar ${event.barIndex + 1}, beat ${event.startBeat + 1}`
  const concert = symbolAt(
    notation.concertChords,
    (chord) => chord.measureIndex === event.barIndex && chord.startTick === tick,
    where,
  )
  const written = symbolAt(
    notation.written.measures[event.barIndex].chords,
    (chord) => chord.startTick === tick,
    where,
  )
  return {
    harmonyEventIndex,
    startBeat: event.startBeat + 1,
    durationBeats: event.durationBeats,
    symbol: `${pitchClassNameInKey(concert.root, concertKey)}${concert.suffix}`,
    writtenSymbol: written.text,
    degree: event.triad.degree,
    quality: event.triad.quality,
    pitchClasses: event.triad.pitchClasses,
    pitchClassNames: event.triad.pitchClasses.map((pc) => pitchClassNameInKey(pc, concertKey)),
    role: event.role,
    barRoles: event.barRoles.map((barRole) => ({ ...barRole, bar: barRole.barIndex + 1 })),
    templateId: event.templateId,
  }
}

/**
 * Intent: the four bars of a successful phrase, numbered from 1, each with the chords that start
 * in it and every note and rest in timeline order.
 */
// @spec-link [[service_headless_phrase_replay]]
export function replayBars(
  outcome: SuccessOutcome,
  notation: ReplayNotation,
  concertKey: WrittenKey,
): readonly ReplayBar[] {
  const { timeline } = outcome.result
  const harmonyEvents = outcome.provenance.harmony.events
  return timeline.measures.map((measure) => ({
    bar: measure.measureIndex + 1,
    chords: harmonyEvents.flatMap((event, index) =>
      event.barIndex === measure.measureIndex
        ? [replayChord(event, index, notation, concertKey)]
        : [],
    ),
    events: replayEvents(timeline, notation.written, concertKey, measure.measureIndex),
  }))
}
