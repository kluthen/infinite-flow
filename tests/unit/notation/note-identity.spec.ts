import { describe, expect, it } from 'vitest'

import {
  deriveExpectedNotes,
  type ExpectedNoteIdentity,
} from '@/domain/acknowledgement/expected-note'
import type { MeasureIndex } from '@/domain/events/measure'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import type {
  ConcertChordSymbol,
  WrittenMeasure,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'
import {
  NoteIdentityError,
  noteIdentityKey,
  resolveGlyphIdentities,
} from '@/notation/note-identity'
import {
  acknowledgementFixtureSet,
  phraseFromBars,
} from '../domain/acknowledgement/acknowledgement-fixtures'

/** The C MIDI keyboard's active concert range, wide enough for every fixture pitch. */
const KEYBOARD_CONCERT_RANGE = { minMidi: 48, maxMidi: 84 } as const

/** Intent: one C major chord at every downbeat, plus any extra mid-measure chord changes given. */
function chords(extra: readonly ConcertChordSymbol[] = []): readonly ConcertChordSymbol[] {
  const downbeats = [0, 1, 2, 3].map((measureIndex) => ({
    measureIndex: measureIndex as MeasureIndex,
    startTick: 0,
    root: 0 as const,
    suffix: '',
    bass: null,
  }))
  return [...downbeats, ...extra].sort(
    (a, b) => a.measureIndex - b.measureIndex || a.startTick - b.startTick,
  )
}

/** Intent: run a concert timeline through the real display transform, in concert C Major. */
function writtenOf(
  timeline: ConcertEventTimeline,
  extraChords: readonly ConcertChordSymbol[] = [],
): WrittenPhrase {
  return transformToWrittenPhrase({
    timeline,
    tonalContext: { tonalCenter: 'C', collection: 'Major' },
    chords: chords(extraChords),
    transposition: { chromatic: 0, diatonic: 0 },
    concertRange: KEYBOARD_CONCERT_RANGE,
    clef: BUILT_IN_INSTRUMENT_CLEF,
  })
}

/** Intent: shorthand for an identity of phrase `phraseNumber`. */
function id(phraseNumber: number, measureIndex: number, eventIndex: number): ExpectedNoteIdentity {
  return { phraseNumber, measureIndex: measureIndex as MeasureIndex, eventIndex }
}

/** Intent: replace one measure of a phrase, keeping the other three. */
function withMeasure(phrase: WrittenPhrase, index: number, measure: WrittenMeasure): WrittenPhrase {
  const measures = phrase.measures.map((existing, i) => (i === index ? measure : existing))
  return { ...phrase, measures: [measures[0]!, measures[1]!, measures[2]!, measures[3]!] }
}

// @test-link [[module_notation_note_identity_overlays]]
// @test-link [[rule_expected_note_window]]
describe('resolveGlyphIdentities', () => {
  it('gives a fresh attack its measure and source event index, and a rest no identity', () => {
    const phrase = writtenOf(phraseFromBars(['q r:q h', 'r:h q q', 'w', 'r:w']))

    expect(resolveGlyphIdentities(phrase, 2)).toEqual([
      [id(2, 0, 0), null, id(2, 0, 2)],
      [null, id(2, 1, 1), id(2, 1, 2)],
      [id(2, 2, 0)],
      [null],
    ])
  })

  it('resolves both glyphs of a note split inside its measure to the one attack', () => {
    // The half note at tick 4 is split at the tick-8 chord change into two tied quarters.
    const phrase = writtenOf(phraseFromBars(['q h q', 'w', 'w', 'w']), [
      { measureIndex: 0, startTick: 8, root: 5, suffix: '', bass: null },
    ])
    const split = phrase.measures[0]!.events
    expect(split.map((event) => event.sourceEventIndex)).toEqual([0, 1, 1, 2])

    expect(resolveGlyphIdentities(phrase, 1)[0]).toEqual([
      id(1, 0, 0),
      id(1, 0, 1),
      id(1, 0, 1),
      id(1, 0, 2),
    ])
  })

  it('resolves a tie continuation across a barline to the attack in the previous measure', () => {
    const phrase = writtenOf(phraseFromBars(['h h', '~:q r:q h', 'w', 'w']))

    const identities = resolveGlyphIdentities(phrase, 1)

    expect(identities[0]).toEqual([id(1, 0, 0), id(1, 0, 1)])
    expect(identities[1]).toEqual([id(1, 0, 1), null, id(1, 1, 2)])
  })

  it('resolves a tie chain across two barlines to its one attack', () => {
    const phrase = writtenOf(phraseFromBars(['h h', '~:w', '~:q q h', 'w']))

    const identities = resolveGlyphIdentities(phrase, 1)

    expect(identities[1]).toEqual([id(1, 0, 1)])
    expect(identities[2]).toEqual([id(1, 0, 1), id(1, 2, 1), id(1, 2, 2)])
    expect(identities[3]).toEqual([id(1, 3, 0)])
  })

  it('names exactly the expected notes acknowledgement derives, on every fixture phrase', () => {
    for (const fixture of acknowledgementFixtureSet()) {
      const phrase = writtenOf(fixture.timeline)
      const expected = deriveExpectedNotes(fixture.timeline, {
        phraseNumber: 4,
        startSeconds: 0,
        tempoBpm: 120,
      }).map((note) => note.identity)

      const attacks = resolveGlyphIdentities(phrase, 4).flatMap((measure, measureIndex) =>
        measure.filter(
          (identity, glyphIndex): identity is ExpectedNoteIdentity =>
            identity !== null &&
            phrase.measures[measureIndex]!.events[glyphIndex]!.kind === 'note' &&
            !(phrase.measures[measureIndex]!.events[glyphIndex] as { tieFromPrevious: boolean })
              .tieFromPrevious,
        ),
      )

      expect(attacks, fixture.name).toEqual(expected)
    }
  })

  it('rejects a phrase number that is not a positive integer', () => {
    const phrase = writtenOf(phraseFromBars(['w', 'w', 'w', 'w']))

    for (const phraseNumber of [0, -1, 1.5, Number.NaN]) {
      expect(() => resolveGlyphIdentities(phrase, phraseNumber)).toThrow(NoteIdentityError)
    }
  })

  it('rejects a tied glyph that follows no note glyph', () => {
    const phrase = writtenOf(phraseFromBars(['r:h h', 'w', 'w', 'w']))
    const [restGlyph, noteGlyph] = phrase.measures[0]!.events
    if (noteGlyph?.kind !== 'note') throw new Error('Fixture setup: expected a note glyph.')
    const afterRest = withMeasure(phrase, 0, {
      ...phrase.measures[0]!,
      events: [restGlyph!, { ...noteGlyph, tieFromPrevious: true }],
    })
    const firstGlyph = phrase.measures[1]!.events[0]!
    if (firstGlyph.kind !== 'note') throw new Error('Fixture setup: expected a note glyph.')
    const opening = withMeasure(writtenOf(phraseFromBars(['w', 'w', 'w', 'w'])), 0, {
      ...phrase.measures[1]!,
      index: 0,
      events: [{ ...firstGlyph, tieFromPrevious: true }],
    })

    expect(() => resolveGlyphIdentities(afterRest, 1)).toThrow(NoteIdentityError)
    expect(() => resolveGlyphIdentities(opening, 1)).toThrow(NoteIdentityError)
  })
})

// @test-link [[module_notation_note_identity_overlays]]
describe('noteIdentityKey', () => {
  it('writes phrase number, measure index and event index, colon-separated', () => {
    expect(noteIdentityKey(id(3, 2, 11))).toBe('3:2:11')
  })
})
