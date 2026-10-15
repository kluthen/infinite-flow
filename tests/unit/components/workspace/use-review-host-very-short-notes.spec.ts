/**
 * The Review host's `Include very short notes`: off at first, held for as long as the page lives
 * (across a close, a reopening and a later session) and never saved; the played-notes export asks
 * for the file the option gives when it starts; and whether that file would hold a note, which
 * disables `Export played notes` when it would not.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useReviewHost } from '@/components/workspace/use-review-host'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ExportFile } from '@/export/load-generated-notes-export'
import type { SessionHistoryRecord } from '@/session/session-history'
import { DEFAULT_REVIEW_PREFERENCES } from '@/storage/records/setting-defaults'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'
import { recordingSaveSettings } from './recording-save-settings'

/** Intent: a host over `fake`'s controller, inside its own effect scope. */
function host(fake = createFakeSessionController()) {
  const { session } = fakeGenerationSession()
  const ports = { load: vi.fn(), download: vi.fn() }
  const { saveSettings, saves } = recordingSaveSettings()
  const scope = effectScope()
  const built = scope.run(() =>
    useReviewHost({
      controller: () => fake.controller,
      idle: () => session.state,
      exportPorts: () => ports,
      initialPreferences: DEFAULT_REVIEW_PREFERENCES,
      saveSettings,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, ports, fake, saves, stop: () => scope.stop() }
}

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
describe('the Review host and very short notes', () => {
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds Include very short notes, off at first, for the page: across reviews, never saved', () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { built, saves, stop } = host(fake)

    expect(built.includeVeryShortNotes.value).toBe(false)
    built.setIncludeVeryShortNotes(true)
    expect(built.includeVeryShortNotes.value).toBe(true)
    fake.controller.closeReview()
    expect(built.includeVeryShortNotes.value).toBe(true)
    fake.controller.showReview()
    expect(built.includeVeryShortNotes.value).toBe(true)

    fake.controller.start()
    fake.state.phase = 'running'
    fake.controller.stop()
    fake.state.review = fakeReview(fakeReviewHistory(veryShortRecords()), true)
    expect(built.includeVeryShortNotes.value).toBe(true)
    built.setIncludeVeryShortNotes(false)
    expect(built.includeVeryShortNotes.value).toBe(false)
    expect(saves).toEqual([])
    stop()

    // A new page starts with it off.
    expect(host(fake).built.includeVeryShortNotes.value).toBe(false)
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
    const { built, ports, stop } = host(fake)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildPlayedNotesFile })
    const history = fake.state.review?.history

    await built.exportPlayedNotes()
    built.setIncludeVeryShortNotes(true)
    const building = built.exportPlayedNotes()
    built.setIncludeVeryShortNotes(false)
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
    const { built, stop } = host(fake)

    expect(built.holdsPlayedNote.value).toBe(true)
    expect(built.playedNotesFileHoldsNote.value).toBe(false)
    built.setIncludeVeryShortNotes(true)
    expect(built.playedNotesFileHoldsNote.value).toBe(true)

    built.setIncludeVeryShortNotes(false)
    fake.state.review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    expect(built.playedNotesFileHoldsNote.value).toBe(true)
    fake.controller.closeReview()
    expect(built.playedNotesFileHoldsNote.value).toBe(false)
    stop()
  })
})
