/**
 * The Jam capture: a pure state machine that turns a fresh Jam's notes, from its count-in to phrase
 * 1, into its doodle and into the moments phrase 1 is attempted, shown and sounded, on the click
 * plan's beat grid (jam-phase.ts) at Jam's tempo. It reads the played notes the session hands its
 * caller (their note-ons and their finished spans, on the audio clock) and the times its caller
 * advances it to; it reads no clock and schedules nothing: `nextDecisionAt` says when to wake it.
 *
 * A note belongs by its snapped start (snappedTickOf), and counts only once it is not very short:
 * held for VERY_SHORT_NOTE_SECONDS, or released after at least that long. So a decision that reads
 * the notes around a barline is taken that long after it, when every note that touches it is known
 * to count or not; one that reads none (the generation measure's end, the extended wait, the
 * read-in) is taken on the barline. The doodle is quantized by quantizeDoodle at each candidate end
 * and at an end by length, never note by note. Part of Jam's code (src/jam/), loaded on demand.
 */
import { createClickPlan, type ClickPlan } from '@/audio/click-track'
import { DOODLE_MAX_MEASURES, type DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import { isVeryShortNote, VERY_SHORT_NOTE_SECONDS } from '@/domain/played-notes/stray-notes'
import { TICKS_PER_BAR } from '@/domain/time/ticks'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { RecordedDoodle } from '@/session/session-history'
import type { AudioTime } from '@/session/session-types'
import { quantizeDoodle, snappedTickOf, type DoodleGrid } from './doodle-quantizer'
import { barlineAt, beatOfMeasureAt, firstBarlineFrom, measureAt, type JamPhase } from './jam-phase'

/** What a capture starts from: the click plan's start (the count-in's first beat) and Jam's tempo. */
// @spec-link [[module_jam_capture]]
export interface JamCaptureStart {
  readonly startAt: AudioTime
  readonly tempo: number
}

/**
 * What the capture tells the code that runs it, each `at` the moment it decided it:
 * `candidate-end`, a silent barline after the doodle's first measure, with the doodle as it stands
 * (phrase 1's ladder starts an attempt from it); `candidate-voided`, a doodle note inside that
 * tentative measure (the ladder cancels the attempt); `doodle-ended`, the doodle's end by silence
 * (the candidate end held) or by length, its end barline being where the generation measure
 * begins, phrase 1's deadline counted from it; `phrase-one-shown`, the barline phrase 1 is shown at
 * and the time it sounds, one measure later; `no-note-played`, no doodle note 30 s after the
 * count-in, which ends the Jam.
 */
// @spec-link [[module_jam_capture]]
export type JamCaptureOutput =
  | { readonly kind: 'candidate-end'; readonly at: AudioTime; readonly end: RecordedDoodle }
  | { readonly kind: 'candidate-voided'; readonly at: AudioTime }
  | {
      readonly kind: 'doodle-ended'
      readonly at: AudioTime
      readonly by: 'silence' | 'length'
      readonly end: RecordedDoodle
    }
  | {
      readonly kind: 'phrase-one-shown'
      readonly at: AudioTime
      readonly shownAt: AudioTime
      readonly soundsAt: AudioTime
    }
  | { readonly kind: 'no-note-played'; readonly at: AudioTime }

/**
 * The capture of one fresh Jam. `note` takes a played note's note-on or finished span; `advance`
 * takes every decision due by `at`; `phraseOneReady` says phrase 1 is ready at `at` (allowed in a
 * tentative generation measure, the generation measure and the extended wait, once). Each first
 * takes the decisions due by its time and returns every output, in order. `end` stops the capture
 * when the Jam ended from outside; every later call is then a no-op. `phase` is the Jam's phase at
 * the last time it reached; `nextDecisionAt` when its next decision falls, null when none is due.
 */
// @spec-link [[module_jam_capture]]
export interface JamCapture {
  note(event: PlayedNoteEvent): readonly JamCaptureOutput[]
  advance(at: AudioTime): readonly JamCaptureOutput[]
  phraseOneReady(at: AudioTime): readonly JamCaptureOutput[]
  end(): void
  phase(): JamPhase
  nextDecisionAt(): AudioTime | null
}

/** Typed failure for a call the capture cannot take in its state. */
// @spec-link [[module_jam_capture]]
export class JamCaptureError extends Error {
  readonly kind = 'JamCaptureError' as const

  constructor(message: string) {
    super(message)
    this.name = 'JamCaptureError'
  }
}

/** How long after the count-in a first doodle note may come before the Jam ends, in seconds. */
// @spec-link [[rule_jam_without_doodle_note_ends]]
export const FIRST_DOODLE_NOTE_SECONDS = 30

/** A played note as the capture keeps it: its note-on, its snapped start, its release once known. */
interface CaptureNote {
  readonly pitch: ConcertPitch
  readonly onsetAt: AudioTime
  readonly tick: number
  releaseAt: AudioTime | null
}

/** Where the capture stands; the doodle's first measure and the ready time are kept beside it. */
type Stage =
  | { readonly kind: 'count-in' }
  | { readonly kind: 'capture'; readonly nextBarline: number }
  | { readonly kind: 'tentative'; readonly measure: number; readonly end: RecordedDoodle }
  | { readonly kind: 'generation'; readonly measure: number }
  | { readonly kind: 'extended-wait' }
  | { readonly kind: 'read-in'; readonly soundsAt: AudioTime }
  | { readonly kind: 'phrase-one' }
  | { readonly kind: 'ended' }

/** A decision due at `at`, and what taking it at `now` outputs. */
interface Decision {
  readonly at: AudioTime
  readonly take: (now: AudioTime) => JamCaptureOutput[]
}

/** The doodle measure counts, 1 to 4, in order. */
const MEASURE_COUNTS: readonly DoodleMeasureCount[] = [1, 2, 3, 4]

/** Intent: whether a note counts by `at`: not very short, by its release or by how long it is held. */
function countsBy(note: CaptureNote, at: AudioTime): boolean {
  if (note.releaseAt !== null) return !isVeryShortNote({ ...note, releaseAt: note.releaseAt })
  return at >= note.onsetAt + VERY_SHORT_NOTE_SECONDS
}

/** Intent: whether a note may still count: released long, or still held. */
function mayCount(note: CaptureNote): boolean {
  return note.releaseAt === null || !isVeryShortNote({ ...note, releaseAt: note.releaseAt })
}

/** Intent: whether a note is sounding on a barline: started at or before it, not released by then. */
function soundsOn(note: CaptureNote, barline: AudioTime): boolean {
  return note.onsetAt <= barline && (note.releaseAt === null || note.releaseAt > barline)
}

/** Intent: whether a note's snapped start falls in measures `from` (inclusive) to `to` (exclusive). */
function startsIn(note: CaptureNote, from: number, to: number): boolean {
  return note.tick >= from * TICKS_PER_BAR && note.tick < to * TICKS_PER_BAR
}

/** Intent: refuse a tempo the quantizer cannot take: not a whole positive BPM. */
function checkedTempo(tempo: number): number {
  if (!Number.isSafeInteger(tempo) || tempo <= 0)
    throw new JamCaptureError(`A Jam's tempo must be a whole positive BPM, got ${tempo}.`)
  return tempo
}

/**
 * Intent: the capture of one fresh Jam whose count-in starts at `start.startAt`, at `start.tempo`
 * (a whole BPM); see JamCapture. It starts in the count-in.
 */
// @spec-link [[module_jam_capture]]
// @spec-link [[rule_doodle_capture_start]]
// @spec-link [[rule_doodle_ends_by_silence]]
// @spec-link [[rule_doodle_ends_by_length]]
// @spec-link [[rule_notes_after_doodle_belong_nowhere]]
// @spec-link [[rule_jam_without_doodle_note_ends]]
// @spec-link [[rule_two_measures_before_jam_phrase_one]]
export function createJamCapture(start: JamCaptureStart): JamCapture {
  const tempo = checkedTempo(start.tempo)
  const plan: ClickPlan = createClickPlan(start.startAt, tempo)
  const grid: DoodleGrid = { gridOriginAt: barlineAt(plan, 0), tempoBpm: tempo }
  const noNoteDeadline = grid.gridOriginAt + FIRST_DOODLE_NOTE_SECONDS
  const notes: CaptureNote[] = []
  let stage: Stage = { kind: 'count-in' }
  let firstMeasure: number | null = null
  let readyAt: AudioTime | null = null
  let lastTime = Number.NEGATIVE_INFINITY

  /** Intent: the doodle notes that count by `at`, snapped at or after the grid origin. */
  function doodleNotesBy(at: AudioTime): CaptureNote[] {
    return notes.filter((note) => note.tick >= 0 && countsBy(note, at))
  }

  /**
   * Intent: the doodle ending at barline `measure`, quantized from every note known at `now`
   * (a note still held taken as released now: it is cut at the end barline), with its raw notes.
   */
  function doodleEndingAt(measure: number, now: AudioTime): RecordedDoodle {
    const first = firstMeasure ?? measure - 1
    const doodle = quantizeDoodle({
      ...grid,
      endMeasure: measure,
      notes: notes.map((note) => ({ ...note, releaseAt: note.releaseAt ?? now })),
    })
    return {
      doodle,
      captureTempo: tempo,
      firstBarlineAt: barlineAt(plan, first),
      endBarlineAt: barlineAt(plan, measure),
      notes: notes
        .filter((note) => startsIn(note, first, measure))
        .map(({ pitch, onsetAt }) => ({ pitch, onsetAt })),
    }
  }

  /** Intent: phrase 1 shown at barline `measure`, its read-in measure before it sounds. */
  function show(measure: number, now: AudioTime): JamCaptureOutput[] {
    const shownAt = barlineAt(plan, measure)
    const soundsAt = barlineAt(plan, measure + 1)
    stage = { kind: 'read-in', soundsAt }
    return [{ kind: 'phrase-one-shown', at: now, shownAt, soundsAt }]
  }

  /** Intent: past the generation measure, show phrase 1 at `measure` when ready, else wait on. */
  function afterGenerationMeasure(measure: number, now: AudioTime): JamCaptureOutput[] {
    if (readyAt !== null) return show(measure, now)
    stage = { kind: 'extended-wait' }
    return []
  }

  /**
   * Intent: before the first doodle note: the first one that counts fixes the doodle's first
   * measure; with none 30 s after the count-in (very short notes not counting), the Jam ends.
   */
  function beforeFirstNote(): Decision {
    const pending = notes.filter((note) => note.tick >= 0 && mayCount(note))
    const at = Math.min(
      noNoteDeadline + VERY_SHORT_NOTE_SECONDS,
      ...pending.map((note) => note.onsetAt + VERY_SHORT_NOTE_SECONDS),
    )
    return {
      at,
      take: (now) => {
        const counted = doodleNotesBy(now).filter((note) => note.onsetAt <= noNoteDeadline)
        if (counted.length === 0) {
          if (now < noNoteDeadline + VERY_SHORT_NOTE_SECONDS)
            throw new Error('Jam capture: a first doodle note was due but none counts.')
          stage = { kind: 'ended' }
          return [{ kind: 'no-note-played', at: now }]
        }
        const firstTick = Math.min(...counted.map((note) => note.tick))
        firstMeasure = Math.floor(firstTick / TICKS_PER_BAR)
        stage = { kind: 'capture', nextBarline: firstMeasure + 1 }
        return []
      },
    }
  }

  /**
   * Intent: barline `measure` of the capture, judged once every note touching it is known: the
   * fourth after the doodle's first ends the doodle by length; another with no doodle note sounding
   * on it and none snapped into the measure it opens is a candidate end.
   */
  function captureBarline(measure: number): Decision {
    const barline = barlineAt(plan, measure)
    return {
      at: barline + VERY_SHORT_NOTE_SECONDS,
      take: (now) => {
        if (measure - (firstMeasure ?? measure) >= DOODLE_MAX_MEASURES) {
          const end = doodleEndingAt(measure, now)
          stage = { kind: 'generation', measure }
          return [{ kind: 'doodle-ended', at: now, by: 'length', end }]
        }
        const sounding = doodleNotesBy(now).some(
          (note) => soundsOn(note, barline) || note.tick >= measure * TICKS_PER_BAR,
        )
        if (sounding) {
          stage = { kind: 'capture', nextBarline: measure + 1 }
          return []
        }
        const end = doodleEndingAt(measure, now)
        stage = { kind: 'tentative', measure, end }
        return [{ kind: 'candidate-end', at: now, end }]
      },
    }
  }

  /**
   * Intent: in the tentative measure opened by barline `measure`: a doodle note snapped inside it
   * voids the candidate end (and any phrase 1 ready from it) and the measure joins the doodle; a
   * measure that stays silent is the generation measure, the doodle having ended at its start.
   */
  function tentativeMeasure(measure: number, end: RecordedDoodle): Decision {
    const inside = notes.filter((note) => startsIn(note, measure, measure + 1) && mayCount(note))
    const voidAt = Math.min(...inside.map((note) => note.onsetAt + VERY_SHORT_NOTE_SECONDS))
    if (Number.isFinite(voidAt))
      return {
        at: voidAt,
        take: (now) => {
          if (!inside.some((note) => countsBy(note, now)))
            throw new Error(
              'Jam capture: a note voiding the candidate end was due but none counts.',
            )
          stage = { kind: 'capture', nextBarline: measure + 1 }
          readyAt = null
          return [{ kind: 'candidate-voided', at: now }]
        },
      }
    return {
      at: barlineAt(plan, measure + 1) + VERY_SHORT_NOTE_SECONDS,
      take: (now) => [
        { kind: 'doodle-ended', at: now, by: 'silence', end },
        ...afterGenerationMeasure(measure + 1, now),
      ],
    }
  }

  /** Intent: the next decision the capture's stage holds, or null when none is due. */
  function nextDecision(): Decision | null {
    switch (stage.kind) {
      case 'count-in':
        return {
          at: grid.gridOriginAt,
          take: () => {
            stage = { kind: 'capture', nextBarline: 0 }
            return []
          },
        }
      case 'capture':
        return firstMeasure === null ? beforeFirstNote() : captureBarline(stage.nextBarline)
      case 'tentative':
        return tentativeMeasure(stage.measure, stage.end)
      case 'generation': {
        const next = stage.measure + 1
        return { at: barlineAt(plan, next), take: (now) => afterGenerationMeasure(next, now) }
      }
      case 'extended-wait': {
        if (readyAt === null) return null
        const measure = firstBarlineFrom(plan, readyAt)
        return { at: barlineAt(plan, measure), take: (now) => show(measure, now) }
      }
      case 'read-in':
        return {
          at: stage.soundsAt,
          take: () => {
            stage = { kind: 'phrase-one' }
            return []
          },
        }
      default:
        return null
    }
  }

  /** Intent: take every decision due by `at`, in time order; a late one is taken at once. */
  function runUntil(at: AudioTime): JamCaptureOutput[] {
    const outputs: JamCaptureOutput[] = []
    for (let decision = nextDecision(); decision !== null && decision.at <= at;) {
      lastTime = Math.max(lastTime, decision.at)
      outputs.push(...decision.take(lastTime))
      decision = nextDecision()
    }
    lastTime = Math.max(lastTime, at)
    return outputs
  }

  /** Intent: refuse a time before the last one the capture reached: its clock never runs back. */
  function checkedTime(at: AudioTime, what: string): AudioTime {
    if (!Number.isFinite(at) || at < lastTime)
      throw new JamCaptureError(`${what} at ${at} comes before ${lastTime}.`)
    return at
  }

  /** Intent: keep a note-on, or the release of the note it ended (a note-on never seen: whole). */
  function keep(event: PlayedNoteEvent): void {
    const { pitch, onsetAt } = event.note
    if (event.kind === 'played') {
      notes.push({ pitch, onsetAt, tick: snappedTickOf(onsetAt, grid), releaseAt: null })
      return
    }
    const held = notes.find(
      (note) => note.releaseAt === null && note.pitch === pitch && note.onsetAt === onsetAt,
    )
    if (held !== undefined) held.releaseAt = event.note.releaseAt
    else
      notes.push({
        pitch,
        onsetAt,
        tick: snappedTickOf(onsetAt, grid),
        releaseAt: event.note.releaseAt,
      })
  }

  /** Intent: whether the capture takes nothing more: phrase 1 sounds, or the Jam ended. */
  function over(): boolean {
    return stage.kind === 'phrase-one' || stage.kind === 'ended'
  }

  /** Intent: the Jam's phase at the last time the capture reached. */
  function phase(): JamPhase {
    const beat = beatOfMeasureAt(plan, lastTime)
    switch (stage.kind) {
      case 'count-in':
        return { state: 'count-in', beat }
      case 'capture': {
        if (firstMeasure === null) return { state: 'capture', beat, doodleMeasure: null }
        const index = Math.min(Math.max(measureAt(plan, lastTime) - firstMeasure, 0), 3)
        return { state: 'capture', beat, doodleMeasure: MEASURE_COUNTS[index]! }
      }
      case 'tentative':
        return {
          state: 'tentative-generation-measure',
          beat,
          doodleMeasures: stage.end.doodle.measureCount,
        }
      case 'generation':
        return { state: 'generation-measure', beat }
      case 'extended-wait':
      case 'read-in':
        return { state: stage.kind, beat }
      default:
        return { state: stage.kind }
    }
  }

  return Object.freeze({
    note(event: PlayedNoteEvent): readonly JamCaptureOutput[] {
      if (over()) return []
      const eventAt = event.kind === 'played' ? event.note.onsetAt : event.note.releaseAt
      const at = Math.max(lastTime, eventAt)
      const outputs = runUntil(at)
      if (over()) return outputs
      keep(event)
      return [...outputs, ...runUntil(at)]
    },
    advance(at: AudioTime): readonly JamCaptureOutput[] {
      if (over()) return []
      return runUntil(checkedTime(at, 'An advance'))
    },
    phraseOneReady(at: AudioTime): readonly JamCaptureOutput[] {
      if (over()) return []
      const outputs = runUntil(checkedTime(at, 'Phrase 1 ready'))
      const waiting =
        stage.kind === 'tentative' || stage.kind === 'generation' || stage.kind === 'extended-wait'
      if (!waiting || readyAt !== null)
        throw new JamCaptureError(`Phrase 1 cannot be ready in the ${stage.kind} stage.`)
      readyAt = at
      return [...outputs, ...runUntil(at)]
    },
    end(): void {
      stage = { kind: 'ended' }
    },
    phase,
    nextDecisionAt(): AudioTime | null {
      return over() ? null : (nextDecision()?.at ?? null)
    },
  })
}
