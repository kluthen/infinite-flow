/**
 * Per-section fact-reconstruction helpers for the independent whole-result generation validator
 * (see ./generation-result-validator.ts). Every function here reads only immutable source values
 * — the resolved request, the outer intent, the generated result's timeline, and the claimed
 * provenance — and never trusts a planner annotation. Split out of the main module purely to keep
 * each file under the project's line-count ceiling; this file must never import the pitch planner.
 */

import type { GenerationIntent } from '../generation/generation-intent'
import type { GenerationRequest } from '../generation/generation-request'
import type { GenerationResult } from '../generation/generation-result'
import type { GenerationProvenance } from '../generation/orchestration/orchestration-types'
import type { ConcertEventTimeline } from '../events/timeline'
import type { Measure } from '../events/measure'
import type { MeasureEvent, NoteEvent } from '../events/measure-event'
import { WHOLE_NOTE, compareRational, sumRational, type Rational } from '../time/rational'
import { NonIntegerTickError, sixteenthTicksOf } from '../time/ticks'
import { makeHarmonyCandidateDomain } from '../harmony/harmony-planner'
import { validateRhythmCandidate } from '../rhythm/rhythm-validator'
import type { RhythmBar, RhythmEvent } from '../rhythm/rhythm-types'
import type { GenerationResultValidationFailure } from './generation-result-validator'

type Failure = GenerationResultValidationFailure

/** Every source pitch this validator will later walk in chronological measure/event order. */
export interface FlatNoteRef {
  readonly measureIndex: number
  readonly eventIndex: number
  readonly event: NoteEvent
}

/** Envelope identity: the same request identity and seed must thread through all three values. */
// @spec-link [[service_generation_result_validation]]
export function envelopeFailures(
  intent: GenerationIntent,
  request: GenerationRequest,
  result: GenerationResult,
): readonly Failure[] {
  const failures: Failure[] = []
  if (!(result.requestId === request.requestId && request.requestId === intent.requestId)) {
    failures.push({
      code: 'request_id_mismatch',
      detail: `result=${String(result.requestId)} request=${String(request.requestId)} intent=${String(intent.requestId)}`,
    })
  }
  if (!(result.seed === request.seed && request.seed === intent.seed)) {
    failures.push({
      code: 'seed_mismatch',
      detail: `result=${result.seed} request=${request.seed} intent=${intent.seed}`,
    })
  }
  return failures
}

/** Every resolved-request field must be re-derivable from the outer intent and instrument profile. */
// @spec-link [[service_generation_result_validation]]
// @spec-link [[rule_instrument_profile_range]]
export function resolvedRequestFailures(
  intent: GenerationIntent,
  request: GenerationRequest,
): readonly Failure[] {
  const failures: Failure[] = []
  if (request.measureCount !== 4)
    failures.push({ code: 'measure_count_mismatch', detail: `${request.measureCount}` })
  if (request.meter.beatsPerMeasure !== 4 || request.meter.beatUnit !== 4)
    failures.push({
      code: 'meter_mismatch',
      detail: `${request.meter.beatsPerMeasure}/${request.meter.beatUnit}`,
    })

  const profileRange = intent.instrumentProfile.concertRange
  if (
    request.activeConcertRange.minMidi !== profileRange.minMidi ||
    request.activeConcertRange.maxMidi !== profileRange.maxMidi
  )
    failures.push({
      code: 'active_concert_range_mismatch',
      detail: `request=${request.activeConcertRange.minMidi}-${request.activeConcertRange.maxMidi} profile=${profileRange.minMidi}-${profileRange.maxMidi}`,
    })

  const candidate = intent.registerIntent.candidates.find((entry) => entry.id === request.register)
  if (!candidate) {
    failures.push({ code: 'register_not_offered', detail: String(request.register) })
  } else if (
    request.registerWindow.minMidi !== candidate.window.minMidi ||
    request.registerWindow.maxMidi !== candidate.window.maxMidi
  ) {
    failures.push({
      code: 'register_window_mismatch',
      detail: `request=${request.registerWindow.minMidi}-${request.registerWindow.maxMidi} candidate=${candidate.window.minMidi}-${candidate.window.maxMidi}`,
    })
  }

  const requested = intent.registerIntent.requestedRegister
  if (requested !== 'Varying' && requested !== request.register)
    failures.push({
      code: 'register_choice_mismatch',
      detail: `requested=${requested} resolved=${request.register}`,
    })

  return failures
}

/** The outcome of reconstructing timeline structure: failures plus whether it is safe to walk. */
export interface TimelineStructureOutcome {
  readonly failures: readonly Failure[]
  readonly structurallyValid: boolean
}

/** Intent: check one measure's event durations tile exactly one whole note on the sixteenth grid. */
function measureDurationFailures(
  measure: Measure,
  position: number,
): { failures: Failure[]; ok: boolean } {
  const failures: Failure[] = []
  const events: readonly MeasureEvent[] = Array.isArray(measure.events) ? measure.events : []
  let alignmentOk = true
  const durations: Rational[] = []
  for (const event of events) {
    durations.push(event.duration)
    try {
      sixteenthTicksOf(event.duration)
    } catch (error) {
      if (!(error instanceof NonIntegerTickError)) throw error
      alignmentOk = false
      failures.push({
        code: 'measure_duration_not_sixteenth_aligned',
        detail: `measure${position}:${event.duration.numerator}/${event.duration.denominator}`,
      })
    }
  }
  const total = sumRational(durations)
  const tiles = compareRational(total, WHOLE_NOTE) === 0
  if (!tiles)
    failures.push({
      code: 'measure_duration_invalid',
      detail: `measure${position}:${total.numerator}/${total.denominator}`,
    })
  return { failures, ok: tiles && alignmentOk }
}

/**
 * Reconstruct and check exactly four ordered measures (0..3), each tiling one whole note on the
 * sixteenth grid. `structurallyValid` is false whenever later sections cannot safely walk the
 * timeline's events (wrong measure count/order, or a measure that does not tile).
 */
// @spec-link [[service_generation_result_validation]]
// @spec-link [[rule_complete_four_four_measures]]
export function timelineStructureFailures(result: GenerationResult): TimelineStructureOutcome {
  const timeline: ConcertEventTimeline = result.timeline
  const measures: readonly Measure[] = Array.isArray(timeline?.measures) ? timeline.measures : []
  const failures: Failure[] = []
  let structurallyValid = true

  if (measures.length !== 4) {
    failures.push({ code: 'timeline_measure_count_invalid', detail: `${measures.length}` })
    structurallyValid = false
  }

  measures.forEach((measure, position) => {
    if (measure.measureIndex !== position) {
      failures.push({
        code: 'timeline_measure_order_invalid',
        detail: `position${position}:measureIndex${measure.measureIndex}`,
      })
      structurallyValid = false
    }
    const { failures: measureFailures, ok } = measureDurationFailures(measure, position)
    failures.push(...measureFailures)
    if (!ok) structurallyValid = false
  })

  return { failures, structurallyValid }
}

/** True when two sixteenth-tick-aligned durations, read independently, are numerically equal. */
function sameDurationTicks(duration: Rational, expectedTicks: number): boolean {
  return sixteenthTicksOf(duration) === expectedTicks
}

/**
 * Compare the timeline's per-measure event sequence (kind, sixteenth-tick duration, tie
 * continuation) against the bound rhythm candidate's own bars, event by event. Only runs once
 * timeline structure is confirmed safe to walk.
 */
function eventSequenceFailures(
  measures: readonly Measure[],
  bars: readonly RhythmBar[],
): Failure[] {
  const failures: Failure[] = []
  for (let position = 0; position < 4; position += 1) {
    const measure = measures[position]
    const bar = bars.find((entry) => entry.barIndex === position)
    if (!measure || !bar) {
      failures.push({
        code: 'rhythm_event_sequence_mismatch',
        detail: `measure${position}:missing`,
      })
      continue
    }
    const events = measure.events
    const rhythmEvents: readonly RhythmEvent[] = bar.events
    if (events.length !== rhythmEvents.length) {
      failures.push({
        code: 'rhythm_event_sequence_mismatch',
        detail: `measure${position}:length timeline=${events.length} rhythm=${rhythmEvents.length}`,
      })
      continue
    }
    events.forEach((event, index) => {
      const expected = rhythmEvents[index]!
      const kindOk = event.kind === expected.kind
      const durationOk = sameDurationTicks(event.duration, expected.durationTicks)
      const tieOk =
        event.kind !== 'note' || event.tieContinuation === (expected.tieContinuation === true)
      if (!kindOk || !durationOk || !tieOk)
        failures.push({
          code: 'rhythm_event_sequence_mismatch',
          detail: `measure${position}#${index}`,
        })
    })
  }
  return failures
}

/** The outcome of the rhythm-correspondence section: failures plus whether melodic checks may run. */
export interface RhythmCorrespondenceOutcome {
  readonly failures: readonly Failure[]
  readonly structurallyValid: boolean
}

/**
 * Confirm the timeline exactly replays the bound rhythm candidate, that the rhythm candidate
 * itself passes independent rhythm validation, and that its recorded input matches the intent's
 * rhythm-relevant controls. `structurallyValid` gates whether melodic reconstruction may proceed.
 */
// @spec-link [[service_generation_result_validation]]
export function rhythmCorrespondenceFailures(
  intent: GenerationIntent,
  result: GenerationResult,
  provenance: GenerationProvenance,
  timelineStructurallyValid: boolean,
): RhythmCorrespondenceOutcome {
  const failures: Failure[] = []
  let structurallyValid = timelineStructurallyValid

  if (timelineStructurallyValid)
    failures.push(...eventSequenceFailures(result.timeline.measures, provenance.rhythm.bars))
  else structurallyValid = false

  const rhythmCodes = validateRhythmCandidate(provenance.rhythm)
  if (rhythmCodes.length > 0) {
    failures.push({ code: 'rhythm_candidate_invalid', detail: rhythmCodes.join(',') })
    structurallyValid = false
  }

  const input = provenance.rhythm.input
  const controls = intent.controls
  if (
    input.noteDensity !== controls.noteDensity ||
    input.silenceDensity !== controls.silenceDensity ||
    input.syncopation !== controls.syncopation ||
    input.tensionArc !== controls.tension
  )
    failures.push({
      code: 'rhythm_input_mismatch',
      detail: `input=${input.noteDensity}/${input.silenceDensity}/${input.syncopation}/${input.tensionArc} controls=${controls.noteDensity}/${controls.silenceDensity}/${controls.syncopation}/${controls.tension}`,
    })

  return { failures, structurallyValid }
}

/** Re-derive the structural harmony domain and require an exact-identity, exact-content match. */
// @spec-link [[service_generation_result_validation]]
export function harmonyProvenanceFailures(
  intent: GenerationIntent,
  provenance: GenerationProvenance,
): readonly Failure[] {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: intent.controls.tonalCenter,
    collection: intent.controls.collection,
    harmonicMotion: intent.controls.harmonicMotion,
    tensionArc: intent.controls.tension,
    profile: intent.musicalProfile.musicalProfile,
  })
  if (domain.kind !== 'harmony_candidate_domain')
    return [{ code: 'harmony_provenance_mismatch', detail: 'no_legal_harmony_plan' }]

  const match = domain.candidates.find(
    (candidate) => candidate.identity === provenance.harmony.identity,
  )
  if (!match)
    return [
      {
        code: 'harmony_provenance_mismatch',
        detail: `identity_not_found:${provenance.harmony.identity}`,
      },
    ]
  if (JSON.stringify(match) !== JSON.stringify(provenance.harmony))
    return [
      {
        code: 'harmony_provenance_mismatch',
        detail: `content_mismatch:${provenance.harmony.identity}`,
      },
    ]
  return []
}

/** Flatten the timeline's measures into chronological note refs, once structure is confirmed safe. */
export function flattenNotes(measures: readonly Measure[]): readonly FlatNoteRef[] {
  const refs: FlatNoteRef[] = []
  measures.forEach((measure, measureIndex) => {
    measure.events.forEach((event, eventIndex) => {
      if (event.kind === 'note') refs.push({ measureIndex, eventIndex, event })
    })
  })
  return refs
}

/**
 * Every tie-continuation note must directly follow a sounding note (never a rest, never the
 * phrase start) and repeat its exact pitch, walking chronologically across bar lines.
 */
// @spec-link [[service_generation_result_validation]]
export function tieFailures(measures: readonly Measure[]): readonly Failure[] {
  const failures: Failure[] = []
  let previousNote: NoteEvent | undefined
  measures.forEach((measure, measureIndex) => {
    measure.events.forEach((event, eventIndex) => {
      if (event.kind === 'rest') {
        previousNote = undefined
        return
      }
      if (event.tieContinuation) {
        const location = `measure${measureIndex}#${eventIndex}`
        if (!previousNote)
          failures.push({ code: 'tie_continuation_invalid', detail: `${location}:no_source` })
        else if (previousNote.pitch !== event.pitch)
          failures.push({ code: 'tie_continuation_invalid', detail: `${location}:pitch_changed` })
      }
      previousNote = event
    })
  })
  return failures
}

/** Every source pitch must stay inside the inclusive active range and resolved register window. */
// @spec-link [[service_generation_result_validation]]
export function rangeFailures(
  request: GenerationRequest,
  measures: readonly Measure[],
): readonly Failure[] {
  const failures: Failure[] = []
  const range = request.activeConcertRange
  const window = request.registerWindow
  for (const ref of flattenNotes(measures)) {
    const midi = ref.event.pitch
    const location = `measure${ref.measureIndex}#${ref.eventIndex}`
    if (midi < range.minMidi || midi > range.maxMidi)
      failures.push({ code: 'outside_active_range', detail: `${location}:${midi}` })
    if (midi < window.minMidi || midi > window.maxMidi)
      failures.push({ code: 'outside_register_window', detail: `${location}:${midi}` })
  }
  return failures
}
