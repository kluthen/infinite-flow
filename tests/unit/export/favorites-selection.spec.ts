/**
 * The favorites-only selection: the phrases a scope exports, in session order with their session
 * numbers, laid out as a whole session of those phrases alone (each next one right after the one
 * before, at its own tempo, no gap for a phrase left out), a played note held past a favorite
 * phrase stopping at its end when the next phrase is not exported. The whole session passes through
 * untouched.
 */
import { describe, expect, it } from 'vitest'

import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import { FavoritesSelectionError, phrasesInScope } from '@/export/favorites-selection'
import { sevenPhraseRecords } from './favorites-fixtures'
import { phraseLength } from './midi/played-notes-fixtures'

/** Intent: the favorites-only scope of the given phrase numbers. */
function favorites(...numbers: number[]): ExportScope {
  return { kind: 'favoritesOnly', favorites: numbers }
}

/** Intent: every played note of `records` as its pitch, onset and release from its phrase's start. */
function notesFromPhraseStart(
  records: readonly ReturnType<typeof sevenPhraseRecords>[number][],
): [number, number, number, number][] {
  return records.flatMap((record) =>
    record.playedNotes.map((note): [number, number, number, number] => [
      record.phraseNumber,
      note.pitch,
      note.onsetAt - record.startedAt,
      note.releaseAt - record.startedAt,
    ]),
  )
}

// @test-link [[req_session_export]]
describe('phrasesInScope: the whole session', () => {
  // @test-link [[req_session_export]]
  it('hands back every phrase as it is', () => {
    const records = sevenPhraseRecords()

    expect(phrasesInScope(records, WHOLE_SESSION)).toBe(records)
  })
})

// @test-link [[rule_favorites_only_export]]
describe('phrasesInScope: favorites only', () => {
  // @test-link [[rule_favorites_only_export]]
  it('holds exactly the favorite phrases, in session order, with their session numbers', () => {
    const records = sevenPhraseRecords()

    const selected = phrasesInScope(records, favorites(6, 2, 5))

    expect(selected.map((record) => record.phraseNumber)).toEqual([2, 5, 6])
    expect(selected.map((record) => record.tempo)).toEqual([90, 80, 150])
    expect(selected.map((record) => record.outcome)).toEqual(
      [records[1]!, records[4]!, records[5]!].map((record) => record.outcome),
    )
  })

  // @test-link [[rule_favorites_only_export]]
  it('lays each next phrase right where the one before ends, at its own tempo, with no gap', () => {
    const records = sevenPhraseRecords()

    const [two, five, six] = phrasesInScope(records, favorites(2, 5, 6))

    expect(two!.startedAt).toBe(records[1]!.startedAt)
    expect(five!.startedAt).toBeCloseTo(two!.startedAt + phraseLength(90), 9)
    expect(six!.startedAt).toBeCloseTo(five!.startedAt + phraseLength(80), 9)
  })

  // @test-link [[rule_favorites_only_export]]
  it("keeps every played note where it was in its own phrase, moved with the phrase's start", () => {
    const records = sevenPhraseRecords()

    const selected = phrasesInScope(records, favorites(5, 6))

    expect(notesFromPhraseStart(selected)).toEqual(
      notesFromPhraseStart([records[4]!, records[5]!]).map(([number, pitch, onset, release]) => [
        number,
        pitch,
        expect.closeTo(onset, 9),
        expect.closeTo(release, 9),
      ]),
    )
  })

  // @test-link [[rule_favorites_only_export]]
  it("stops a note held past a favorite phrase at that phrase's end when the next is left out", () => {
    const [two] = phrasesInScope(sevenPhraseRecords(), favorites(2, 5, 6))

    const held = two!.playedNotes.find((note) => note.pitch === 62)!
    expect(held.releaseAt).toBeCloseTo(two!.startedAt + phraseLength(90), 9)
    expect(held.onsetAt).toBeCloseTo(two!.startedAt + phraseLength(90) - 0.5, 9)
  })

  // @test-link [[rule_favorites_only_export]]
  it('keeps a note held into the next phrase whole when that phrase is exported too', () => {
    const records = sevenPhraseRecords()

    const [two] = phrasesInScope(records, favorites(2, 3, 5))

    expect(two!.playedNotes).toEqual(records[1]!.playedNotes)
  })

  // @test-link [[rule_favorites_only_export]]
  it('leaves out a note whose onset falls after the end of a phrase whose next is left out', () => {
    // Phrase 3 starts 0.5 ms late, and phrase 2 holds a note played in that half millisecond.
    const lateStart = 0.0005
    const records = sevenPhraseRecords().map((record, index) =>
      index < 2 ? record : { ...record, startedAt: record.startedAt + lateStart },
    )
    const end = records[1]!.startedAt + phraseLength(90)
    const sliver = { ...records[1]!.playedNotes[0]!, onsetAt: end + 0.0002, releaseAt: end + 0.1 }
    records[1] = { ...records[1]!, playedNotes: [...records[1]!.playedNotes, sliver] }

    const [two] = phrasesInScope(records, favorites(2, 5))

    expect(two!.playedNotes.map((note) => note.pitch)).toEqual([60, 62])
  })

  // @test-link [[rule_favorites_only_export]]
  it('lays out the favorites of every phrase exactly as the whole session', () => {
    const records = sevenPhraseRecords()

    expect(phrasesInScope(records, favorites(1, 2, 3, 4, 5, 6, 7))).toEqual(records)
  })

  // @test-link [[rule_favorites_only_export]]
  it('refuses a favorites-only scope with no favorite, or a favorite the session lacks', () => {
    const records = sevenPhraseRecords()

    expect(() => phrasesInScope(records, favorites())).toThrow(FavoritesSelectionError)
    expect(() => phrasesInScope(records, favorites(2, 8))).toThrow(FavoritesSelectionError)
  })
})
