import { describe, expect, it } from 'vitest'

import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type {
  CollectionDegree,
  HarmonyCandidate,
  HarmonyEvent,
} from '@/domain/harmony/harmony-types'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeGenerationResult } from '@/domain/generation/generation-result'
import { makeSeed } from '@/domain/random/seed'
import {
  CHORD_SUFFIX_BY_TRIAD_QUALITY,
  chordSymbolsFromHarmony,
  makeNotationPhraseInput,
  notationInputFromOutcome,
  validateNotationPhraseInput,
} from '@/domain/notation/notation-input'
import {
  NotationInputError,
  type NotationPhraseInput,
} from '@/domain/notation/written-phrase-types'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { buildOrchestratorIntent } from '../generation/orchestration/generation-orchestrator-fixture'

const C_MAJOR = makeHarmonyCollection('C', 'Major')

/** One C-major harmony event; `beat` is the absolute beat offset from the start of the phrase. */
function chord(degree: CollectionDegree, beat: number, beats: number): HarmonyEvent {
  return {
    barIndex: Math.floor(beat / 4) as 0 | 1 | 2 | 3,
    startBeat: (beat % 4) as 0 | 2,
    durationBeats: beats,
    triad: C_MAJOR.triads[degree - 1]!,
    role: 'tonic',
    templateId: 'fixture',
    barRoles: [],
  }
}

/** A minimal-but-shape-valid HarmonyCandidate wrapping the given events. */
function harmonyCandidate(events: readonly HarmonyEvent[]): HarmonyCandidate {
  return {
    candidateIndex: 0,
    identity: 'fixture',
    templateId: 'fixture',
    degreeSequence: [1, 1, 1, 1],
    events,
    endpoint: { kind: 'tonal_static_degree_five', degree: 5 },
    tensionRequirement: {
      arc: 'Settled',
      allowedBars: [0, 1, 2],
      maximumResolutionDelay: 'next_strong_sounding_onset',
      permittedFigureKinds: [],
      requiredFigureCount: 0,
      maximumFigureCount: 1,
      resolutionPreference: 'ordinary',
      mustResolveBeforeFinalSoundingEvent: true,
    },
  }
}

const TONIC_EACH_BAR = harmonyCandidate([0, 4, 8, 12].map((beat) => chord(1, beat, 4)))

const SPANNING_WITH_MID_MEASURE_CHANGE = harmonyCandidate([chord(1, 0, 2), chord(4, 2, 14)])

function wholeNoteMeasure(measureIndex: 0 | 1 | 2 | 3) {
  return makeMeasure(measureIndex, [
    makeNoteEvent({
      duration: makeRational(16, 16),
      pitch: makeConcertPitch(60),
      tieContinuation: false,
    }),
  ])
}

const FOUR_WHOLE_NOTES = makeConcertEventTimeline(
  [0, 1, 2, 3].map((i) => wholeNoteMeasure(i as 0 | 1 | 2 | 3)),
)

// @test-link [[module_notation_display_convention]]
describe('chordSymbolsFromHarmony', () => {
  it('places one restated chord at the downbeat of each measure for a bar-aligned harmony', () => {
    const chords = chordSymbolsFromHarmony(TONIC_EACH_BAR)
    expect(chords).toEqual([
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 1, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 2, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 3, startTick: 0, root: 0, suffix: '', bass: null },
    ])
  })

  it('places a mid-measure chord change and restates a bar-spanning harmony at each downbeat', () => {
    const chords = chordSymbolsFromHarmony(SPANNING_WITH_MID_MEASURE_CHANGE)
    expect(chords).toEqual([
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 0, startTick: 8, root: 5, suffix: '', bass: null },
      { measureIndex: 1, startTick: 0, root: 5, suffix: '', bass: null },
      { measureIndex: 2, startTick: 0, root: 5, suffix: '', bass: null },
      { measureIndex: 3, startTick: 0, root: 5, suffix: '', bass: null },
    ])
  })

  it('derives suffixes from CHORD_SUFFIX_BY_TRIAD_QUALITY for minor and diminished triads', () => {
    const candidate = harmonyCandidate([chord(2, 0, 4), chord(7, 4, 12)])
    const chords = chordSymbolsFromHarmony(candidate)
    expect(chords[0]!.suffix).toBe(CHORD_SUFFIX_BY_TRIAD_QUALITY.minor)
    expect(chords[1]!.suffix).toBe(CHORD_SUFFIX_BY_TRIAD_QUALITY.diminished)
  })

  it('rejects harmony events that leave a gap in the 16 beats', () => {
    const candidate = harmonyCandidate([chord(1, 0, 4), chord(1, 8, 8)])
    expect(() => chordSymbolsFromHarmony(candidate)).toThrow(NotationInputError)
  })

  it('rejects harmony events that overlap', () => {
    const candidate = harmonyCandidate([chord(1, 0, 6), chord(1, 4, 12)])
    expect(() => chordSymbolsFromHarmony(candidate)).toThrow(NotationInputError)
  })
})

// @test-link [[module_notation_display_convention]]
describe('validateNotationPhraseInput', () => {
  function inputWithChords(chords: NotationPhraseInput['chords']): NotationPhraseInput {
    return {
      timeline: FOUR_WHOLE_NOTES,
      tonalContext: { tonalCenter: 'C', collection: 'Major' },
      chords,
    }
  }

  it('accepts ascending chords with a downbeat in every measure', () => {
    expect(() =>
      validateNotationPhraseInput(inputWithChords(chordSymbolsFromHarmony(TONIC_EACH_BAR))),
    ).not.toThrow()
  })

  it('rejects an empty chord list', () => {
    expect(() => validateNotationPhraseInput(inputWithChords([]))).toThrow(NotationInputError)
  })

  it('rejects a measure with no chord at tick 0', () => {
    const chords: NotationPhraseInput['chords'] = [
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
      { measureIndex: 1, startTick: 4, root: 0, suffix: '', bass: null },
    ]
    expect(() => validateNotationPhraseInput(inputWithChords(chords))).toThrow(NotationInputError)
  })

  it('rejects a non-ascending chord order', () => {
    const chords: NotationPhraseInput['chords'] = [
      { measureIndex: 0, startTick: 8, root: 0, suffix: '', bass: null },
      { measureIndex: 0, startTick: 0, root: 0, suffix: '', bass: null },
    ]
    expect(() => validateNotationPhraseInput(inputWithChords(chords))).toThrow(NotationInputError)
  })

  it('rejects an out-of-range start tick', () => {
    const chords: NotationPhraseInput['chords'] = [
      { measureIndex: 0, startTick: 16, root: 0, suffix: '', bass: null },
    ]
    expect(() => validateNotationPhraseInput(inputWithChords(chords))).toThrow(NotationInputError)
  })
})

// @test-link [[module_notation_display_convention]]
describe('makeNotationPhraseInput', () => {
  it('references the given result timeline rather than copying it', () => {
    const result = makeGenerationResult({
      requestId: makeRequestId('req-1'),
      seed: makeSeed(1),
      timeline: FOUR_WHOLE_NOTES,
    })
    const input = makeNotationPhraseInput({
      result,
      tonalContext: { tonalCenter: 'C', collection: 'Major' },
      harmony: TONIC_EACH_BAR,
    })
    expect(input.timeline).toBe(result.timeline)
    expect(Object.isFrozen(input)).toBe(true)
  })

  it('rejects a harmony whose chord symbols do not validate', () => {
    const result = makeGenerationResult({
      requestId: makeRequestId('req-2'),
      seed: makeSeed(1),
      timeline: FOUR_WHOLE_NOTES,
    })
    const badHarmony = harmonyCandidate([chord(1, 0, 4), chord(1, 8, 8)])
    expect(() =>
      makeNotationPhraseInput({
        result,
        tonalContext: { tonalCenter: 'C', collection: 'Major' },
        harmony: badHarmony,
      }),
    ).toThrow(NotationInputError)
  })
})

// @test-link [[module_notation_display_convention]]
describe('notationInputFromOutcome', () => {
  it('builds a notation input from a real generation outcome and shares its timeline', () => {
    const intent = buildOrchestratorIntent()
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') throw new Error('Expected a successful generation.')

    const input = notationInputFromOutcome(outcome, intent)
    expect(input.timeline).toBe(outcome.result.timeline)
    expect(input.tonalContext).toEqual({
      tonalCenter: intent.controls.tonalCenter,
      collection: intent.controls.collection,
    })
    expect(input.chords).toEqual(chordSymbolsFromHarmony(outcome.provenance.harmony))
  })

  it('rejects an outcome whose result requestId does not match the given intent', () => {
    const intent = buildOrchestratorIntent()
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') throw new Error('Expected a successful generation.')

    const otherIntent = buildOrchestratorIntent('Middle', makeSeed(11))
    expect(() => notationInputFromOutcome(outcome, otherIntent)).toThrow(NotationInputError)
  })
})
