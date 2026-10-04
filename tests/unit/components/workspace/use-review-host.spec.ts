/**
 * The score panel's Review host on its own: nothing shows and nothing is given while no Review
 * shows, an export of either content asked for then is refused as the defect it is, the
 * page-session export choices start at MusicXML with the backing track off, whether the session
 * holds a played note, the played-notes export, and the Played notes switch held for the page
 * session.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useReviewHost } from '@/components/workspace/use-review-host'
import type { ExportFile } from '@/export/load-generated-notes-export'
import { recordedRecords } from '../review/review-fixtures'
import { createFakeSessionController, fakeReviewHistory } from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'

/** Intent: a host over `fake`'s controller and an Idle double, inside its own effect scope. */
function host(fake = createFakeSessionController()) {
  const { session } = fakeGenerationSession()
  const ports = { load: vi.fn(), download: vi.fn() }
  const scope = effectScope()
  const built = scope.run(() =>
    useReviewHost({
      controller: () => fake.controller,
      idle: () => session.state,
      exportPorts: () => ports,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, ports, fake, stop: () => scope.stop() }
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
      review: { history: fakeReviewHistory(recordedRecords()), showing: true, tempoReached: 90 },
    })
    const { built, ports, stop } = host(fake)
    const buildPlayedNotesFile = vi.fn(() => file)
    ports.load.mockResolvedValue({ buildPlayedNotesFile })

    expect(built.holdsPlayedNote.value).toBe(true)
    await built.exportPlayedNotes()
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(fake.state.review?.history)
    expect(ports.download).toHaveBeenCalledExactlyOnceWith(file)

    // A session without a controller records no played note.
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
    fake.state.review = { history: fakeReviewHistory(silent), showing: true, tempoReached: 90 }
    expect(built.holdsPlayedNote.value).toBe(false)
    stop()
  })

  // @test-link [[rule_review_played_notes_toggle]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('holds the Played notes switch for the page session: across a close, a reopening and a later session', () => {
    const fake = createFakeSessionController({
      review: { history: fakeReviewHistory(recordedRecords()), showing: true, tempoReached: 90 },
    })
    const { built, stop } = host(fake)

    built.playedNotesShown.value = true
    fake.controller.closeReview()
    expect(built.playedNotesShown.value).toBe(true)
    fake.controller.showReview()
    expect(built.playedNotesShown.value).toBe(true)

    fake.controller.start()
    fake.state.phase = 'running'
    fake.controller.stop()
    fake.state.review = {
      history: fakeReviewHistory(recordedRecords().slice(0, 1)),
      showing: true,
      tempoReached: 90,
    }
    expect(built.showing.value).toBe(true)
    expect(built.playedNotesShown.value).toBe(true)
    stop()
  })

  // @test-link [[req_last_session_review]]
  it('gives the phrases and instrument of the Review only while it shows, not while kept', () => {
    const fake = createFakeSessionController({
      review: {
        history: fakeReviewHistory(recordedRecords(), 'c-keyboard'),
        showing: true,
        tempoReached: 90,
      },
    })
    const { built, stop } = host(fake)

    expect(built.records.value).toBe(recordedRecords())
    expect(built.instrumentName.value).toBe('C MIDI keyboard')

    fake.controller.closeReview()

    expect(built.showing.value).toBe(false)
    expect(built.records.value).toEqual([])
    stop()
  })
})
