/**
 * The review area's side of the Review, over the page's Review host: nothing is given while no
 * Review shows, and an export of either content asked for then is refused as the defect it is;
 * the showing Review's phrases, instrument, start, length (its kept record's, its save failed
 * included), keeping and whether it is the most recent session; whether the session holds a
 * played note, and the played-notes export; and the export scope, `Whole session` at every Review
 * and back to it when the last favorite goes, which both exports read, the played-notes export
 * saying why it would hold no note under it, and no comment in any file.
 */
import { describe, expect, it, vi } from 'vitest'

import { endedSession, openedReview } from '@/components/workspace/session-review-state'
import { readKeptReviewedSession } from '@/components/workspace/workspace-kept-session-read'
import type { SessionReview } from '@/components/workspace/workspace-session-controller-types'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { WHOLE_SESSION } from '@/export/export-file'
import { loadGeneratedNotesExport, type ExportFile } from '@/export/load-generated-notes-export'
import type { SessionHistoryRecord } from '@/session/session-history'
import { encodeKeptSession } from '@/storage/records/kept-session-record'
import { DISTINCTIVE_COMMENT, sevenPhraseRecords } from '../../export/favorites-fixtures'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { myInstrumentHistory } from './my-instrument-history'
import { reviewAreaRig } from './review-area-rig'

// @test-link [[req_last_session_review]]
describe('useReviewArea', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[req_session_export]]
  it('gives nothing while no Review shows, and refuses an export then', async () => {
    const { host, area, ports, stop } = reviewAreaRig()

    expect(host.showing.value).toBe(false)
    expect(area.records.value).toEqual([])
    expect(area.instrumentName.value).toBe('')
    expect(host.format.value).toBe('musicxml')
    expect(host.backingTrack.value).toBe(false)
    const request = { format: 'musicxml', backingTrack: false, scope: 'wholeSession' } as const
    await expect(area.exportFile(request)).rejects.toThrow(
      'review host: an export was asked for with no Review showing',
    )
    expect(ports.load).not.toHaveBeenCalled()
    stop()
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_review_played_notes_toggle]]
  it('holds no played note and refuses the played-notes export while no Review shows', async () => {
    const { host, area, ports, stop } = reviewAreaRig()

    expect(area.holdsPlayedNote.value).toBe(false)
    expect(host.playedNotesShown.value).toBe(false)
    await expect(area.exportPlayedNotes()).rejects.toThrow(
      'review host: an export was asked for with no Review showing',
    )
    expect(ports.load).not.toHaveBeenCalled()
    stop()
  })

  // @test-link [[req_played_notes_export]]
  it("exports the showing Review's played notes, and holds none for a history without them", async () => {
    const file: ExportFile = {
      fileName: 'played.mid',
      mimeType: 'audio/midi',
      bytes: new Uint8Array(),
    }
    const fake = createFakeSessionController({
      review: fakeReview(fakeReviewHistory(recordedRecords()), true),
    })
    const { area, ports, stop } = reviewAreaRig(fake)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildPlayedNotesFile })

    expect(area.holdsPlayedNote.value).toBe(true)
    await area.exportPlayedNotes()
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(
      fake.state.review?.history,
      { includeVeryShortNotes: false },
      WHOLE_SESSION,
    )
    expect(ports.download).toHaveBeenCalledExactlyOnceWith(file)

    // A session without a controller records no played note.
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
    fake.state.review = fakeReview(fakeReviewHistory(silent), true)
    expect(area.holdsPlayedNote.value).toBe(false)
    stop()
  })

  // @test-link [[req_last_session_review]]
  it('gives the phrases and instrument of the Review only while it shows, not while kept', () => {
    const fake = createFakeSessionController({
      review: fakeReview(fakeReviewHistory(recordedRecords(), 'c-keyboard'), true),
    })
    const { host, area, stop } = reviewAreaRig(fake)

    expect(area.records.value).toBe(recordedRecords())
    expect(area.instrumentName.value).toBe('C MIDI keyboard')

    fake.controller.closeReview()

    expect(host.showing.value).toBe(false)
    expect(area.records.value).toEqual([])
    expect(area.instrumentName.value).toBe('')
    stop()
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[req_kept_session_review]]
  it("names my instrument from the session's own profile, never by id, and does not throw", () => {
    const review = openedReview(
      endedSession(myInstrumentHistory('My tenor'), 'not-pinned', {
        key: 'session-1-1',
        playedNotesKept: false,
        presets: BUILT_IN_PRESETS,
      }),
    )
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { area, stop } = reviewAreaRig(fake)

    expect(area.instrumentName.value).toBe('My tenor')
    stop()
  })

  // @test-link [[req_kept_session_review]]
  it("gives the showing Review's start, how it is kept, and whether it is the most recent session", () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-saved')
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { area, stop } = reviewAreaRig(fake)

    expect(area.startedAt.value).toBe(review.history.startedAt)
    expect(area.keeping.value).toBe('not-saved')
    expect(area.mostRecent.value).toBe(true)

    fake.state.mostRecent = Object.freeze({ kind: 'kept', key: 'session-1-2' })
    expect(area.mostRecent.value).toBe(false)
    fake.controller.closeReview()
    expect([area.startedAt.value, area.keeping.value]).toEqual([null, null])
    stop()
  })
})

// @test-link [[req_last_session_review]]
// @test-link [[req_kept_session_review]]
describe("useReviewArea: the session's length", () => {
  /** The facts the session is kept with: nothing pinned, chosen or commented. */
  const FACTS = {
    pinned: false,
    favorites: [],
    comment: '',
    playedNotesKept: false,
    presets: BUILT_IN_PRESETS,
  }

  // @test-link [[req_last_session_review]]
  it('gives the length the kept record stores for the session that just ended, and that it would have stored after a failed save', () => {
    const history = fakeReviewHistory(recordedRecords())
    const stored = encodeKeptSession(history, FACTS, '3.1.0').summary.lengthSeconds
    expect(stored).toBeGreaterThan(0)

    for (const keeping of ['not-pinned', 'not-saved'] as const) {
      const review = fakeReview(history, true, keeping)
      const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
      const { area, stop } = reviewAreaRig(fake)
      expect(area.lengthSeconds.value).toBe(stored)
      fake.controller.closeReview()
      expect(area.lengthSeconds.value).toBeNull()
      stop()
    }
  })

  // @test-link [[req_kept_session_review]]
  it('gives a kept session read back the length its record stores', async () => {
    const records = encodeKeptSession(fakeReviewHistory(recordedRecords()), FACTS, '3.1.0')
    const read = await readKeptReviewedSession(
      () =>
        Promise.resolve({ summary: records.summary, body: records.body, playedNotes: undefined }),
      'session-1-1',
    )
    if (read.kind !== 'read') throw new Error(`Expected the kept session read, got ${read.kind}.`)
    const fake = createFakeSessionController({ review: openedReview(read.session) })
    const { area, stop } = reviewAreaRig(fake)

    expect(area.lengthSeconds.value).toBe(records.summary.lengthSeconds)
    stop()
  })
})

/**
 * Intent: a showing, kept Review of `records` with the given favorites and the distinctive comment,
 * over a fake controller, and the area over it.
 */
function scopeRig(records: readonly SessionHistoryRecord[], favorites: readonly number[] = []) {
  const review: SessionReview = Object.freeze({
    ...fakeReview(fakeReviewHistory(records), true),
    favorites: Object.freeze([...favorites]),
    comment: DISTINCTIVE_COMMENT,
  })
  return reviewAreaRig(createFakeSessionController({ review }))
}

/** The seven-phrase session with a played note only in phrase 1 and a very short one in 3. */
function notesInPhrasesOneAndThree(): SessionHistoryRecord[] {
  return sevenPhraseRecords([[[60, 1, 1.25]], [], [[62, 1, 1.01]]])
}

// @test-link [[rule_favorites_only_export]]
describe('useReviewArea: the export scope', () => {
  // @test-link [[rule_favorites_only_export]]
  it('starts at Whole session, and refuses Favorites only while the session has no favorite', () => {
    const { area, stop } = scopeRig(sevenPhraseRecords())

    expect(area.scope.value).toBe('wholeSession')
    expect(() => area.setScope('favoritesOnly')).toThrow('no favorite')
    expect(area.scope.value).toBe('wholeSession')
    stop()
  })

  // @test-link [[rule_favorites_only_export]]
  it('goes back to Whole session when the last favorite is removed, and stays there', async () => {
    const { area, stop } = scopeRig(sevenPhraseRecords(), [2])

    area.setScope('favoritesOnly')
    expect(area.scope.value).toBe('favoritesOnly')
    area.toggleFavorite(2)
    await Promise.resolve()

    expect(area.favorites.value).toEqual([])
    expect(area.scope.value).toBe('wholeSession')
    area.toggleFavorite(5)
    await Promise.resolve()
    expect(area.scope.value).toBe('wholeSession')
    stop()
  })

  // @test-link [[rule_favorites_only_export]]
  it('starts again at Whole session when another Review shows', () => {
    const { area, fake, stop } = scopeRig(sevenPhraseRecords(), [2])

    area.setScope('favoritesOnly')
    fake.state.review = Object.freeze({
      ...fakeReview(fakeReviewHistory(sevenPhraseRecords()), true),
      favorites: Object.freeze([3]),
    })

    expect(area.scope.value).toBe('wholeSession')
    stop()
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[req_session_export]]
  it("hands both exports the favorites-only scope with the showing Review's favorites", async () => {
    const file: ExportFile = { fileName: 'f.mid', mimeType: 'audio/midi', bytes: new Uint8Array() }
    const { area, ports, fake, stop } = scopeRig(sevenPhraseRecords(), [2, 5, 6])
    const buildGeneratedNotesFile = vi.fn(() => file)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildGeneratedNotesFile, buildPlayedNotesFile })
    const history = fake.state.review!.history
    const favorites = { kind: 'favoritesOnly', favorites: [2, 5, 6] }

    area.setScope('favoritesOnly')
    await area.exportFile({ format: 'midi', backingTrack: true, scope: 'favoritesOnly' })
    await area.exportPlayedNotes()
    await area.exportFile({ format: 'musicxml', backingTrack: false, scope: 'wholeSession' })

    expect(buildGeneratedNotesFile.mock.calls).toEqual([
      [history, { format: 'midi', backingTrack: true }, favorites],
      [history, { format: 'musicxml', backingTrack: false }, WHOLE_SESSION],
    ])
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { includeVeryShortNotes: false },
      favorites,
    )
    stop()
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('says why the played-notes export is off, updated at once by the option and the scope', () => {
    const { area, host, stop } = scopeRig(notesInPhrasesOneAndThree(), [2])

    expect(area.playedNotesUnavailable.value).toBeNull()
    area.setScope('favoritesOnly')
    expect(area.playedNotesUnavailable.value).toBe('noPlayedNoteInFavorites')
    host.setIncludeVeryShortNotes(true)
    expect(area.playedNotesUnavailable.value).toBe('noPlayedNoteInFavorites')

    area.toggleFavorite(3)
    area.toggleFavorite(2)
    expect(area.playedNotesUnavailable.value).toBeNull()
    host.setIncludeVeryShortNotes(false)
    expect(area.playedNotesUnavailable.value).toBe('everyFavoriteNoteVeryShort')
    area.setScope('wholeSession')
    expect(area.playedNotesUnavailable.value).toBeNull()
    stop()
  })
})

// @test-link [[rule_session_comment]]
describe('useReviewArea: the comment in the exports', () => {
  // @test-link [[rule_session_comment]]
  it('is in no file the Review exports, of either content and either scope', async () => {
    const { area, host, ports, stop } = scopeRig(sevenPhraseRecords(), [2, 5])
    ports.load.mockImplementation(loadGeneratedNotesExport)
    host.setIncludeVeryShortNotes(true)

    for (const scope of ['wholeSession', 'favoritesOnly'] as const) {
      area.setScope(scope)
      for (const format of ['musicxml', 'midi'] as const) {
        await area.exportFile({ format, backingTrack: format === 'midi', scope })
      }
      await area.exportPlayedNotes()
    }

    const files = ports.download.mock.calls.map(([file]) => file as ExportFile)
    expect(files).toHaveLength(6)
    for (const file of files) {
      expect(new TextDecoder('latin1').decode(file.bytes)).not.toContain('Zyxquorp')
    }
    stop()
  })
})
