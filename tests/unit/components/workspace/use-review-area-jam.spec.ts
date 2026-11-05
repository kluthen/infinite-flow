/**
 * The review area's exports in a Jam session, over the page's Review host: each file opens with
 * the doodle section Jam's code builds, so an export asked for while Jam's code loads waits for it
 * to settle, then hands the builder the module's section; one whose load failed ends with nothing
 * built or downloaded and no error, both exports then unavailable with 'doodleNotLoaded'. A
 * session that is no Jam builds at once with no doodle, whatever Jam's code is doing.
 */
import { describe, expect, it, vi } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ReviewJamCode } from '@/components/review/review-types'
import type { ExportDoodleSection } from '@/export/export-file'
import type { ExportFile } from '@/export/load-generated-notes-export'
import type { PlayedNotesDoodleSection } from '@/export/midi/played-notes-midi-input'
import * as jamMode from '@/jam/jam-mode'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
} from './fake-session-controller'
import { reviewAreaRig } from './review-area-rig'
import { JAM_DOODLE_FIRST_BARLINE_AT, reviewedJamPart } from './reviewed-jam-part-fixture'

/** The file every mocked builder gives. */
const FILE: ExportFile = { fileName: 'f.mid', mimeType: 'audio/midi', bytes: new Uint8Array() }

/** The doodle section the mocked Jam code builds for the generated-notes files. */
const GENERATED_SECTION = { musicXml: {}, midi: {} } as unknown as ExportDoodleSection

/** The doodle section the mocked Jam code builds for the played-notes file. */
const PLAYED_SECTION: PlayedNotesDoodleSection = {
  measureCount: 2,
  tempo: 96,
  startedAt: 1.25,
  playedNotes: [],
}

/** The generated-notes request every test asks for. */
const MIDI_REQUEST = { format: 'midi', backingTrack: true, scope: 'wholeSession' } as const

/** Intent: Jam's code loaded, its two section builders mocked. */
function loadedJamCode() {
  const exportDoodleSection = vi.fn(() => GENERATED_SECTION)
  const exportPlayedDoodleSection = vi.fn(() => PLAYED_SECTION)
  const code: ReviewJamCode = {
    state: 'loaded',
    module: { ...jamMode, exportDoodleSection, exportPlayedDoodleSection },
  }
  return { code, exportDoodleSection, exportPlayedDoodleSection }
}

/**
 * Intent: a showing Review of the recorded session, a Jam's (its Jam part the fixture's, the doodle
 * played) unless `isJam` is false, the area over it, and the export's builders mocked.
 */
function jamRig(isJam = true) {
  const history = fakeReviewHistory(recordedRecords())
  const review = fakeReview(history, true)
  const fake = createFakeSessionController({
    review: isJam ? { ...review, jam: reviewedJamPart() } : review,
  })
  const rig = reviewAreaRig(fake)
  const buildGeneratedNotesFile = vi.fn(() => FILE)
  const buildPlayedNotesFile = vi.fn(() => FILE)
  rig.ports.load.mockResolvedValue({ buildGeneratedNotesFile, buildPlayedNotesFile })
  return {
    ...rig,
    history: fake.state.review!.history,
    buildGeneratedNotesFile,
    buildPlayedNotesFile,
  }
}

/** Intent: let every settled promise's handlers run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: whether `promise` has settled yet, after letting pending handlers run. */
async function hasSettled(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  void promise.then(
    () => (settled = true),
    () => (settled = true),
  )
  await settle()
  return settled
}

// @test-link [[rule_jam_code_loaded_on_demand]]
// @test-link [[rule_jam_exports_open_with_doodle]]
describe("useReviewArea: a Jam's exports and Jam's code", () => {
  // @test-link [[rule_jam_code_loaded_on_demand]]
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it("waits for Jam's code while it loads, then hands each builder the module's doodle section", async () => {
    const { area, ports, jamCode, history, buildGeneratedNotesFile, buildPlayedNotesFile, stop } =
      jamRig()
    const loaded = loadedJamCode()
    const jamPart = reviewedJamPart()

    const generated = area.exportFile(MIDI_REQUEST)
    const played = area.exportPlayedNotes()

    expect(await hasSettled(generated)).toBe(false)
    expect(await hasSettled(played)).toBe(false)
    expect(ports.load).not.toHaveBeenCalled()
    expect(loaded.exportDoodleSection).not.toHaveBeenCalled()

    jamCode.value = { state: 'loading' }
    expect(await hasSettled(generated)).toBe(false)
    jamCode.value = loaded.code
    await generated
    await played

    expect(loaded.exportDoodleSection).toHaveBeenCalledExactlyOnceWith(
      jamPart.doodle,
      recordedRecords()[0],
    )
    expect(loaded.exportPlayedDoodleSection).toHaveBeenCalledExactlyOnceWith(jamPart.doodle)
    expect(buildGeneratedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { format: 'midi', backingTrack: true },
      { kind: 'wholeSession' },
      GENERATED_SECTION,
    )
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { includeVeryShortNotes: false },
      { kind: 'wholeSession' },
      PLAYED_SECTION,
    )
    expect(ports.download).toHaveBeenCalledTimes(2)
    stop()
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it("builds at once with the module's sections when Jam's code has already loaded", async () => {
    const { area, jamCode, history, buildGeneratedNotesFile, buildPlayedNotesFile, stop } = jamRig()
    jamCode.value = loadedJamCode().code

    await area.exportFile(MIDI_REQUEST)
    await area.exportPlayedNotes()

    expect(buildGeneratedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { format: 'midi', backingTrack: true },
      { kind: 'wholeSession' },
      GENERATED_SECTION,
    )
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { includeVeryShortNotes: false },
      { kind: 'wholeSession' },
      PLAYED_SECTION,
    )
    stop()
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it('ends an export waiting on a load that fails with nothing built or downloaded, never an error', async () => {
    const { area, ports, jamCode, stop } = jamRig()

    const generated = area.exportFile(MIDI_REQUEST)
    const played = area.exportPlayedNotes()
    jamCode.value = { state: 'failed' }

    await expect(generated).resolves.toBeUndefined()
    await expect(played).resolves.toBeUndefined()
    await expect(area.exportFile(MIDI_REQUEST)).resolves.toBeUndefined()
    expect(ports.load).not.toHaveBeenCalled()
    expect(ports.download).not.toHaveBeenCalled()
    stop()
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it("makes both exports unavailable with 'doodleNotLoaded' only for a Jam whose code failed", () => {
    const { area, jamCode, stop } = jamRig()

    expect(area.generatedNotesUnavailable.value).toBeNull()
    expect(area.playedNotesUnavailable.value).toBeNull()
    jamCode.value = loadedJamCode().code
    expect(area.generatedNotesUnavailable.value).toBeNull()
    expect(area.playedNotesUnavailable.value).toBeNull()
    jamCode.value = { state: 'failed' }
    expect(area.generatedNotesUnavailable.value).toBe('doodleNotLoaded')
    expect(area.playedNotesUnavailable.value).toBe('doodleNotLoaded')
    expect(area.playedNotesFileHoldsNote.value).toBe(true)
    stop()

    const other = jamRig(false)
    other.jamCode.value = { state: 'failed' }
    expect(other.area.generatedNotesUnavailable.value).toBeNull()
    expect(other.area.playedNotesUnavailable.value).toBeNull()
    other.stop()
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('counts the raw doodle notes toward the played-notes file of a Jam with nothing played in a phrase', () => {
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
    const fake = createFakeSessionController({
      review: { ...fakeReview(fakeReviewHistory(silent), true), jam: reviewedJamPart() },
    })
    const { area, stop } = reviewAreaRig(fake)

    expect(area.playedNotesFileHoldsNote.value).toBe(true)
    expect(area.playedNotesUnavailable.value).toBeNull()
    fake.state.review = { ...fake.state.review!, jam: reviewedJamPart([]) }
    expect(area.playedNotesFileHoldsNote.value).toBe(false)
    stop()
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_jam_exports_line_up]]
  it('counts only the raw notes inside the doodle, never a note kept from before it', () => {
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
    const before = JAM_DOODLE_FIRST_BARLINE_AT - 0.5
    const countIn = {
      pitch: makeConcertPitch(60),
      velocity: 80,
      onsetAt: before,
      releaseAt: before + 0.3,
    }
    const fake = createFakeSessionController({
      review: { ...fakeReview(fakeReviewHistory(silent), true), jam: reviewedJamPart([countIn]) },
    })
    const { area, stop } = reviewAreaRig(fake)

    expect(area.holdsPlayedNote.value).toBe(false)
    expect(area.playedNotesFileHoldsNote.value).toBe(false)
    stop()
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it("builds a session that is no Jam at once with no doodle, while Jam's code still loads", async () => {
    const { area, jamCode, history, buildGeneratedNotesFile, buildPlayedNotesFile, stop } =
      jamRig(false)
    expect(jamCode.value).toEqual({ state: 'loading' })

    await area.exportFile(MIDI_REQUEST)
    await area.exportPlayedNotes()

    expect(buildGeneratedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { format: 'midi', backingTrack: true },
      { kind: 'wholeSession' },
      null,
    )
    expect(buildPlayedNotesFile).toHaveBeenCalledExactlyOnceWith(
      history,
      { includeVeryShortNotes: false },
      { kind: 'wholeSession' },
      null,
    )
    stop()
  })
})
