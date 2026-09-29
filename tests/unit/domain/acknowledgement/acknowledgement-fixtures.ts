/**
 * Concert timelines for the note-acknowledgement tests. `phraseFromBars` builds a four-measure
 * timeline from duration tokens; `ACKNOWLEDGEMENT_FIXTURE_SET` is the set the property test walks:
 * hand-built phrases chosen for their timing shapes (notes a sixteenth apart, long ties, ties across
 * a barline, a short note before a rest, repeated pitches), plus real phrases from the generator at
 * every note density. `ACKNOWLEDGEMENT_TEMPOS` is every tempo the tempo control offers.
 */
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import {
  makeGenerationControls,
  NOTE_DENSITIES,
  TEMPO_VALUES,
  type NoteDensity,
  type Syncopation,
} from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeRational } from '@/domain/time/rational'
import { makeSeed } from '@/domain/random/seed'

/** Duration tokens in sixteenth-note ticks; a trailing `.` makes the value dotted. */
const TOKEN_TICKS: Readonly<Record<string, number>> = {
  s: 1,
  e: 2,
  'e.': 3,
  q: 4,
  'q.': 6,
  h: 8,
  'h.': 12,
  w: 16,
}

/** The pitches a fresh attack takes in turn when no explicit pitch list is given: a C major walk. */
const DEFAULT_PITCH_WALK: readonly number[] = [
  60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62,
]

/**
 * Intent: build one four-measure concert timeline from four bars of tokens such as `q q e e r:q`:
 * `r:` marks a rest and `~:` a tie continuation of the note before it (at that note's pitch). Fresh
 * attacks take their pitches from `pitches` in turn, cycling.
 */
export function phraseFromBars(
  bars: readonly [string, string, string, string],
  pitches: readonly number[] = DEFAULT_PITCH_WALK,
): ConcertEventTimeline {
  let attackCount = 0
  let previousPitch: number | null = null
  const measures = bars.map((spec, measureIndex) => {
    const events = spec.split(' ').map((token): MeasureEvent => {
      const [prefix, size] = token.includes(':') ? token.split(':') : ['', token]
      const ticks = TOKEN_TICKS[size!]
      if (ticks === undefined) throw new Error(`Fixture setup: unknown duration token "${token}".`)
      const duration = makeRational(ticks, 16)
      if (prefix === 'r') {
        previousPitch = null
        return makeRestEvent({ duration })
      }
      if (prefix === '~') {
        if (previousPitch === null) throw new Error('Fixture setup: a tie needs a note before it.')
        return makeNoteEvent({
          duration,
          pitch: makeConcertPitch(previousPitch),
          tieContinuation: true,
        })
      }
      const pitch = pitches[attackCount % pitches.length]!
      attackCount += 1
      previousPitch = pitch
      return makeNoteEvent({ duration, pitch: makeConcertPitch(pitch), tieContinuation: false })
    })
    return makeMeasure(measureIndex, events)
  })
  return makeConcertEventTimeline(measures)
}

const SIXTEENTH_BAR = Array.from({ length: 16 }, () => 's').join(' ')
const EIGHTH_BAR = 'e e e e e e e e'

/** One named phrase of the fixture set. */
export interface AcknowledgementFixture {
  readonly name: string
  readonly timeline: ConcertEventTimeline
}

/** Intent: the hand-built phrases, each chosen for one timing shape the window rule must handle. */
function handBuiltFixtures(): readonly AcknowledgementFixture[] {
  return [
    { name: 'quarters', timeline: phraseFromBars(['q q q q', 'q q q q', 'q q q q', 'q q q q']) },
    { name: 'whole notes', timeline: phraseFromBars(['w', 'w', 'w', 'w']) },
    {
      name: 'short notes before rests',
      timeline: phraseFromBars([
        's r:e. s r:e. q q',
        's r:e. r:q h',
        'e r:e s r:e. h',
        's r:e. r:q r:h',
      ]),
    },
    {
      name: 'long ties across barlines',
      timeline: phraseFromBars(['h ~:q q', '~:h h', '~:w', '~:q q h']),
    },
    {
      name: 'sixteenth grid',
      timeline: phraseFromBars([SIXTEENTH_BAR, SIXTEENTH_BAR, SIXTEENTH_BAR, SIXTEENTH_BAR]),
    },
    {
      name: 'sixteenth grid with a barline tie',
      timeline: phraseFromBars([
        SIXTEENTH_BAR,
        SIXTEENTH_BAR,
        `~:s ${Array.from({ length: 15 }, () => 's').join(' ')}`,
        SIXTEENTH_BAR,
      ]),
    },
    {
      name: 'dotted rhythms and rests',
      timeline: phraseFromBars(['q. e r:q q', 'e. s e. s r:h', 'q. e ~:e e q', 'h. r:q']),
    },
    {
      name: 'repeated pitch eighths',
      timeline: phraseFromBars([EIGHTH_BAR, EIGHTH_BAR, EIGHTH_BAR, EIGHTH_BAR], [67]),
    },
  ]
}

/** Intent: one real generated phrase for a note density, syncopation and seed. */
function generatedFixture(
  noteDensity: NoteDensity,
  syncopation: Syncopation,
  seed: number,
): AcknowledgementFixture {
  const name = `generated ${noteDensity} ${syncopation} seed ${seed}`
  const outcome = generatePhrase(
    createGenerationIntent({
      requestId: makeRequestId(`acknowledgement-${seed}`),
      seed: makeSeed(seed),
      controls: makeGenerationControls({
        ...DEFAULT_GENERATION_CONTROLS,
        noteDensity,
        syncopation,
        rhythmicVariety: 'Strict',
        silenceDensity: 'Sparse',
        harmonicMotion: 'Gentle diatonic',
        tension: 'Settled',
      }),
      musicalProfile: { musicalProfile: 'Neutral', isCustom: false },
    }),
  )
  if (outcome.kind !== 'generation_success') {
    throw new Error(`Fixture setup: "${name}" gave ${outcome.kind}, expected generation_success.`)
  }
  return { name, timeline: outcome.result.timeline }
}

/**
 * Intent: the whole fixture set: the hand-built phrases, then a generated phrase for every note
 * density with straight and offbeat rhythms (offbeats bring ties), on two seeds each.
 */
export function acknowledgementFixtureSet(): readonly AcknowledgementFixture[] {
  const generated = NOTE_DENSITIES.flatMap((density) =>
    (['Straight', 'Occasional offbeats'] as const).flatMap((syncopation) =>
      [1, 2].map((seed) => generatedFixture(density, syncopation, seed)),
    ),
  )
  return [...handBuiltFixtures(), ...generated]
}

/** Every tempo the tempo control offers, 60 to 240 BPM. */
export const ACKNOWLEDGEMENT_TEMPOS: readonly number[] = TEMPO_VALUES
