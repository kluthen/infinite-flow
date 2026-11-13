/**
 * The seventh census (v3.3 measurement M1, measurement tooling, never product code): from one
 * phrase's winning chord plan, the form of each harmony event (its triad, or its seventh chord by
 * quality) and whether the plan is a triads-only fallback, with the level and the mode the phrase
 * was generated at.
 *
 * A **harmony event** is one span of one chord, a chord held across a barline counting once: the
 * plan's events as the harmony planner serializes them. A **fallback** is a phrase whose winning
 * plan is the triads-only variant of a plan that had at least one seventh drawn (spec D281): the
 * plan holds no seventh-form event although its draw gave it one or more. The census reads the
 * forms from the events through the harmony model's own field (`HarmonyEvent.seventh`), so it reads
 * hand-built and generated plans alike.
 */

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import type { Collection } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { CollectionDegree, HarmonyEvent, SeventhQuality } from '@/domain/harmony/harmony-types'
import { isSeventhDrawn } from '@/domain/harmony/seventh-draw'

/** The beats of a four-measure phrase in 4/4. */
const PHRASE_BEATS = 16

/** A harmony event's form: its triad, or its seventh chord, named by quality. */
export type EventForm = 'triad' | SeventhQuality

/** The four seventh qualities, in the harmony model's order. */
export const SEVENTH_QUALITIES: readonly SeventhQuality[] = [
  'major-seventh',
  'minor-seventh',
  'dominant-seventh',
  'half-diminished-seventh',
]

/** One harmony event of a census: where it starts, how long it lasts, its degree and its form. */
export interface EventCensus {
  readonly barIndex: number
  readonly startBeat: number
  readonly durationBeats: number
  readonly degree: CollectionDegree
  readonly form: EventForm
}

/** The census of one generated phrase. */
export interface PhraseSeventhCensus {
  readonly level: ChordFamilyLevel
  readonly mode: Collection
  readonly events: readonly EventCensus[]
  readonly seventhEvents: number
  /** The events the phrase's draw gave their seventh form first, whatever the winning plan holds. */
  readonly drawnSevenths: number
  /** True when the winning plan is the triads-only variant of a plan with a seventh drawn. */
  readonly fallback: boolean
}

/** A generation that produced no phrase, kept with its failure code, level and mode. */
export interface FailedSeventhCensus {
  readonly kind: 'failed'
  readonly code: string
  readonly level: ChordFamilyLevel
  readonly mode: Collection
}

/** Intent: an event's form: its seventh's quality in seventh form, `triad` otherwise. */
export function formOf(event: Pick<HarmonyEvent, 'seventh'>): EventForm {
  return event.seventh === undefined ? 'triad' : event.seventh.quality
}

/** Intent: the phrase beat an event starts on, from its bar and its start beat. */
function startOf(event: HarmonyEvent): number {
  return event.barIndex * 4 + event.startBeat
}

/** Intent: true when two events sound the same chord in the same form. */
function sameChord(left: HarmonyEvent, right: HarmonyEvent): boolean {
  return left.triad.degree === right.triad.degree && formOf(left) === formOf(right)
}

/**
 * Intent: crash unless the events tile the phrase, each starting where the one before ends and the
 * last ending on beat 16, and no two neighbours sound the same chord in the same form: a chord
 * held across a barline is one event, never two.
 */
function assertSerializedPlan(events: readonly HarmonyEvent[]): void {
  if (events.length === 0) throw new Error('A chord plan holds at least one harmony event.')
  let beat = 0
  events.forEach((event, index) => {
    if (startOf(event) !== beat)
      throw new Error(`Harmony event ${index} starts on beat ${startOf(event)}, not ${beat}.`)
    if (index > 0 && sameChord(events[index - 1]!, event))
      throw new Error(
        `Harmony events ${index - 1} and ${index} sound the same chord: a held chord is one event.`,
      )
    beat += event.durationBeats
  })
  if (beat !== PHRASE_BEATS)
    throw new Error(`The chord plan lasts ${beat} beats, not the phrase's ${PHRASE_BEATS}.`)
}

/**
 * Intent: the census of one winning chord plan, generated at `level` in `mode`, whose draw gave
 * `drawnSevenths` events their seventh form first. It crashes on a plan that does not tile the
 * phrase, on a draw at Off (Off consumes none), and on a plan holding more seventh-form events than
 * were drawn. The plan is a fallback when its draw gave at least one seventh and it holds none.
 */
export function classifyPlan(
  events: readonly HarmonyEvent[],
  drawnSevenths: number,
  level: ChordFamilyLevel,
  mode: Collection,
): PhraseSeventhCensus {
  assertSerializedPlan(events)
  if (!Number.isInteger(drawnSevenths) || drawnSevenths < 0)
    throw new Error(`The drawn sevenths must be a whole number, got ${drawnSevenths}.`)
  if (level === 'off' && drawnSevenths > 0)
    throw new Error(`A phrase at Off draws no seventh, got ${drawnSevenths}.`)
  const census = events.map((event): EventCensus => ({
    barIndex: event.barIndex,
    startBeat: event.startBeat,
    durationBeats: event.durationBeats,
    degree: event.triad.degree,
    form: formOf(event),
  }))
  const seventhEvents = census.filter((event) => event.form !== 'triad').length
  if (seventhEvents > drawnSevenths)
    throw new Error(
      `The plan holds ${seventhEvents} seventh-form events but only ${drawnSevenths} were drawn.`,
    )
  return {
    level,
    mode,
    events: census,
    seventhEvents,
    drawnSevenths,
    fallback: drawnSevenths > 0 && seventhEvents === 0,
  }
}

/**
 * Intent: how many events of a generated phrase's winning plan its draw gave their seventh form
 * first, read from the generator's own draw (`isSeventhDrawn`, from the level, the seed and each
 * event's start), so a fallback is classified as the generator made it. At Off, none: Off makes no
 * draw.
 */
export function drawnSeventhsOf(
  intent: GenerationIntent,
  outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>,
): number {
  const level = intent.chordFamilies['seventh-chords']
  return outcome.provenance.harmony.events.filter((event) =>
    isSeventhDrawn(level, intent.seed, event),
  ).length
}

/** Intent: the census of one generation outcome, or its failure code, with its level and mode. */
export function seventhCensusOf(
  intent: GenerationIntent,
  outcome: GenerationOutcome,
): PhraseSeventhCensus | FailedSeventhCensus {
  const level = intent.chordFamilies['seventh-chords']
  const mode = intent.controls.collection
  if (outcome.kind !== 'generation_success')
    return { kind: 'failed', code: outcome.code, level, mode }
  return classifyPlan(
    outcome.provenance.harmony.events,
    drawnSeventhsOf(intent, outcome),
    level,
    mode,
  )
}
