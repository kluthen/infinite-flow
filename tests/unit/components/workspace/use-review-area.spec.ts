/**
 * The review area's side of the Review, over the page's Review host: nothing is given while no
 * Review shows, and an export of either content asked for then is refused as the defect it is;
 * the showing Review's phrases, instrument, start, keeping and whether it is the most recent
 * session; whether the session holds a played note, and the played-notes export.
 */
import { describe, expect, it, vi } from 'vitest'

import { endedSession, openedReview } from '@/components/workspace/session-review-state'
import type { ExportFile } from '@/export/load-generated-notes-export'
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
    await expect(area.exportFile({ format: 'musicxml', backingTrack: false })).rejects.toThrow(
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
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(fake.state.review?.history, {
      includeVeryShortNotes: false,
    })
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
