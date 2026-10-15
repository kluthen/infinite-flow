/**
 * The score panel's Review host on its own: nothing shows and nothing is given while no Review
 * shows, an export of either content asked for then is refused as the defect it is, the export
 * choices and the Played notes switch start from the saved review preferences (MusicXML, backing
 * track off, switch off on a first visit), whether the session holds a played note, the
 * played-notes export, and the Played notes switch held for the page session.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { endedSession, openedReview } from '@/components/workspace/session-review-state'
import { useReviewHost } from '@/components/workspace/use-review-host'
import type { ExportFile } from '@/export/load-generated-notes-export'
import {
  DEFAULT_REVIEW_PREFERENCES,
  type ReviewPreferences,
} from '@/storage/records/setting-defaults'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'
import { myInstrumentHistory } from './my-instrument-history'
import { recordingSaveSettings } from './recording-save-settings'

/**
 * Intent: a host over `fake`'s controller and an Idle double, starting from `preferences`, inside
 * its own effect scope.
 */
function host(
  fake = createFakeSessionController(),
  preferences: ReviewPreferences = DEFAULT_REVIEW_PREFERENCES,
) {
  const { session } = fakeGenerationSession()
  const ports = { load: vi.fn(), download: vi.fn() }
  const { saveSettings, saves } = recordingSaveSettings()
  const scope = effectScope()
  const built = scope.run(() =>
    useReviewHost({
      controller: () => fake.controller,
      idle: () => session.state,
      exportPorts: () => ports,
      initialPreferences: preferences,
      saveSettings,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, ports, fake, saves, stop: () => scope.stop() }
}

// @test-link [[req_last_session_review]]
describe('useReviewHost', () => {
  // @test-link [[req_last_session_review]]
  // @test-link [[req_session_export]]
  it('gives nothing while no Review shows, and refuses an export then', async () => {
    const { built, ports, stop } = host()

    expect(built.showing.value).toBe(false)
    expect(built.records.value).toEqual([])
    expect(built.instrumentName.value).toBe('')
    expect(built.format.value).toBe('musicxml')
    expect(built.backingTrack.value).toBe(false)
    await expect(built.exportFile({ format: 'musicxml', backingTrack: false })).rejects.toThrow(
      'review host: an export was asked for with no Review showing',
    )
    expect(ports.load).not.toHaveBeenCalled()
    stop()
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[module_review_played_notes_lane]]
  it('starts the export choices and the Played notes switch from the saved preferences', () => {
    const { built, stop } = host(createFakeSessionController(), {
      format: 'midi',
      backingTrack: true,
      playedNotesShown: true,
    })

    expect(built.format.value).toBe('midi')
    expect(built.backingTrack.value).toBe(true)
    expect(built.playedNotesShown.value).toBe(true)
    stop()
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_review_played_notes_toggle]]
  it('holds no played note and refuses the played-notes export while no Review shows', async () => {
    const { built, ports, stop } = host()

    expect(built.holdsPlayedNote.value).toBe(false)
    expect(built.playedNotesShown.value).toBe(false)
    await expect(built.exportPlayedNotes()).rejects.toThrow(
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
    const { built, ports, stop } = host(fake)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildPlayedNotesFile })

    expect(built.holdsPlayedNote.value).toBe(true)
    await built.exportPlayedNotes()
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(fake.state.review?.history, {
      includeVeryShortNotes: false,
    })
    expect(ports.download).toHaveBeenCalledExactlyOnceWith(file)

    // A session without a controller records no played note.
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
    fake.state.review = fakeReview(fakeReviewHistory(silent), true)
    expect(built.holdsPlayedNote.value).toBe(false)
    stop()
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('holds the Played notes switch for the page session: across a close, a reopening and a later session', () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true)
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { built, stop } = host(fake)

    built.setPlayedNotesShown(true)
    fake.controller.closeReview()
    expect(built.playedNotesShown.value).toBe(true)
    fake.controller.showReview()
    expect(built.playedNotesShown.value).toBe(true)

    fake.controller.start()
    fake.state.phase = 'running'
    fake.controller.stop()
    fake.state.review = fakeReview(fakeReviewHistory(recordedRecords().slice(0, 1)), true)
    expect(built.showing.value).toBe(true)
    expect(built.playedNotesShown.value).toBe(true)
    stop()
  })

  // @test-link [[req_last_session_review]]
  it('gives the phrases and instrument of the Review only while it shows, not while kept', () => {
    const fake = createFakeSessionController({
      review: fakeReview(fakeReviewHistory(recordedRecords(), 'c-keyboard'), true),
    })
    const { built, stop } = host(fake)

    expect(built.records.value).toBe(recordedRecords())
    expect(built.instrumentName.value).toBe('C MIDI keyboard')

    fake.controller.closeReview()

    expect(built.showing.value).toBe(false)
    expect(built.records.value).toEqual([])
    expect(built.instrumentName.value).toBe('')
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
    const { built, stop } = host(fake)

    expect(built.instrumentName.value).toBe('My tenor')
    stop()
  })

  // @test-link [[req_kept_session_review]]
  it("gives the showing Review's start, how it is kept, and whether it is the most recent session", () => {
    const review = fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-saved')
    const fake = createFakeSessionController({ review, mostRecent: heldSessionOf(review) })
    const { built, stop } = host(fake)

    expect(built.startedAt.value).toBe(review.history.startedAt)
    expect(built.keeping.value).toBe('not-saved')
    expect(built.mostRecent.value).toBe(true)

    fake.state.mostRecent = Object.freeze({ kind: 'kept', key: 'session-1-2' })
    expect(built.mostRecent.value).toBe(false)
    fake.controller.closeReview()
    expect([built.startedAt.value, built.keeping.value]).toEqual([null, null])
    stop()
  })
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe("useReviewHost: saving the player's choices", () => {
  it('sets and saves the export format, the backing track and the Played notes switch', () => {
    const { built, saves, stop } = host()

    built.setFormat('midi')
    built.setBackingTrack(true)
    built.setPlayedNotesShown(true)

    expect(built.format.value).toBe('midi')
    expect(built.backingTrack.value).toBe(true)
    expect(built.playedNotesShown.value).toBe(true)
    expect(saves).toEqual([
      { 'review.format': 'midi' },
      { 'review.backingTrack': true },
      { 'review.playedNotesShown': true },
    ])
    stop()
  })
})
