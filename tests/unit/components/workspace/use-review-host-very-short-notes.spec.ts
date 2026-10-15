/**
 * The Review host's `Include very short notes`: off at first, held for as long as the page lives
 * (across a close, a reopening and a later session) and never saved; the review area's
 * played-notes export asks for the file the option gives when it starts; and whether that file
 * would hold a note, which disables `Export played notes` when it would not.
 */
import { describe, expect, it, vi } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ExportFile } from '@/export/load-generated-notes-export'
import type { SessionHistoryRecord } from '@/session/session-history'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { reviewAreaRig } from './review-area-rig'

/** Intent: the recorded session with every played note made very short (12 ms). */
function veryShortRecords(): SessionHistoryRecord[] {
  return recordedRecords().map((record) => ({
    ...record,
    playedNotes: record.playedNotes.map((note) => ({
      ...note,
      pitch: makeConcertPitch(50),
      releaseAt: note.onsetAt + 0.012,
    })),
  }))
}

// @test-link [[rule_played_notes_export_omits_stray_notes]]
describe('the Review host and area: very short notes', () => {
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds Include very short notes, off at first, for the page: across reviews, never saved', () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { host, saves, stop } = reviewAreaRig(fake)

    expect(host.includeVeryShortNotes.value).toBe(false)
    host.setIncludeVeryShortNotes(true)
    expect(host.includeVeryShortNotes.value).toBe(true)
    fake.controller.closeReview()
    expect(host.includeVeryShortNotes.value).toBe(true)
    fake.controller.showReview()
    expect(host.includeVeryShortNotes.value).toBe(true)

    fake.controller.start()
    fake.state.phase = 'running'
    fake.controller.stop()
    fake.state.review = fakeReview(fakeReviewHistory(veryShortRecords()), true)
    expect(host.includeVeryShortNotes.value).toBe(true)
    host.setIncludeVeryShortNotes(false)
    expect(host.includeVeryShortNotes.value).toBe(false)
    expect(saves).toEqual([])
    stop()

    // A new page starts with it off.
    expect(reviewAreaRig(fake).host.includeVeryShortNotes.value).toBe(false)
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('exports the file the option gives at the moment the export starts', async () => {
    const file: ExportFile = {
      fileName: 'played.mid',
      mimeType: 'audio/midi',
      bytes: new Uint8Array(),
    }
    const fake = createFakeSessionController({
      review: fakeReview(fakeReviewHistory(recordedRecords()), true),
    })
    const { host, area, ports, stop } = reviewAreaRig(fake)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildPlayedNotesFile })
    const history = fake.state.review?.history

    await area.exportPlayedNotes()
    host.setIncludeVeryShortNotes(true)
    const building = area.exportPlayedNotes()
    host.setIncludeVeryShortNotes(false)
    await building

    expect(buildPlayedNotesFile.mock.calls).toEqual([
      [history, { includeVeryShortNotes: false }],
      [history, { includeVeryShortNotes: true }],
    ])
    stop()
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('says whether the played-notes file would hold a note under the option', () => {
    const fake = createFakeSessionController({
      review: fakeReview(fakeReviewHistory(veryShortRecords()), true),
    })
    const { host, area, stop } = reviewAreaRig(fake)

    expect(area.holdsPlayedNote.value).toBe(true)
    expect(area.playedNotesFileHoldsNote.value).toBe(false)
    host.setIncludeVeryShortNotes(true)
    expect(area.playedNotesFileHoldsNote.value).toBe(true)

    host.setIncludeVeryShortNotes(false)
    fake.state.review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    expect(area.playedNotesFileHoldsNote.value).toBe(true)
    fake.controller.closeReview()
    expect(area.playedNotesFileHoldsNote.value).toBe(false)
    stop()
  })
})
