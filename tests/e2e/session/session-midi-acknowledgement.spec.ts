/**
 * v2.0 chunk 17, item 7: acknowledgement on the staff during a session, on the workspace harness's
 * fake audio clock and fake MIDI access, at a fixed 1280 x 800 window with a seeded phrase. A
 * matched note takes `note-ack` on its own glyphs and nothing else lights; a wrong pitch, the
 * right pitch an octave off, or a later note's pitch played early changes nothing at all on
 * screen: full-window screenshots taken before and after it, with the audio clock not moved in
 * between, are byte-identical. As a control, the matched note does change the screenshot.
 */
import { expect, test, type Page } from '@playwright/test'

import { watchPageErrors } from '../controller/controller-helpers'
import { untilReady } from './rolling-helpers'
import {
  gotoSessionHarness,
  readyToStart,
  sessionAction,
  sessionState,
  startSession,
} from './session-helpers'
import {
  KEYS,
  ackedNoteIds,
  clockTo,
  connectDevice,
  expectedNotesOf,
  idleTimeline,
  noteKey,
  phraseStartsAt,
  tap,
  workspaceShot,
  type ExpectedNoteAt,
} from './session-midi-helpers'

let expectNoPageErrors: () => void

test.beforeEach(({ page }) => {
  expectNoPageErrors = watchPageErrors(page)
})

test.afterEach(() => expectNoPageErrors())

/**
 * Intent: from a fresh page with the keyboard connected, start a session with Start and move the
 * clock to the onset of phrase 1's third note, once phrase 2 is readied and drawn (so nothing
 * on the staff changes while the clock stays put). Returns phrase 1's expected notes and the
 * target note.
 */
async function toThirdNote(
  page: Page,
): Promise<{ readonly notes: ExpectedNoteAt[]; readonly target: ExpectedNoteAt }> {
  await gotoSessionHarness(page)
  await connectDevice(page, KEYS)
  await readyToStart(page)
  const timeline = await idleTimeline(page)
  await startSession(page)
  expect((await sessionState(page)).sessionHasController).toBe(true)
  await untilReady(page, 2)
  const notes = expectedNotesOf(timeline, 1, await phraseStartsAt(page, 1))
  const target = notes[2]
  if (target === undefined) throw new Error('phrase 1 has fewer than three notes')
  await clockTo(page, target.onsetAt)
  expect((await sessionState(page)).phase).toBe('running')
  return { notes, target }
}

// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
test.describe('a matched note lights up on the staff', () => {
  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  test('the note played at its pitch in its window takes note-ack, and only it', async ({
    page,
  }) => {
    const { target } = await toThirdNote(page)
    expect(await ackedNoteIds(page)).toEqual([])

    await tap(page, KEYS, target.pitch)

    await expect.poll(() => ackedNoteIds(page)).toEqual([noteKey(target.identity)])
    expect((await sessionState(page)).acknowledged).toEqual([target.identity])
    // The note's own glyphs: at least its notehead carries the class.
    await expect(
      page.locator(`.staff-frame [data-note-id="${noteKey(target.identity)}"].note-ack`),
    ).not.toHaveCount(0)
    await sessionAction(page).click()
  })
})

// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
// @test-link [[rule_no_grading_or_mismatch_signal]]
test.describe('an unmatched or wrong note changes nothing on screen', () => {
  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  // @test-link [[rule_no_grading_or_mismatch_signal]]
  test('screenshots before and after a wrong note are byte-identical; a matched one differs', async ({
    page,
  }) => {
    const { notes, target } = await toThirdNote(page)
    const later = notes.slice(3).find((note) => note.pitch !== target.pitch)
    const before = await workspaceShot(page)
    const stateBefore = await sessionState(page)

    const unmatched = [target.pitch + 1, target.pitch - 12, ...(later ? [later.pitch] : [])]
    for (const pitch of unmatched) {
      await tap(page, KEYS, pitch)
      const after = await workspaceShot(page)
      expect(after.equals(before), `the screen changed after pitch ${pitch}`).toBe(true)
      expect(await sessionState(page)).toEqual(stateBefore)
      expect(await ackedNoteIds(page)).toEqual([])
    }

    // The control: the same moment, the right pitch.
    await tap(page, KEYS, target.pitch)
    await expect.poll(() => ackedNoteIds(page)).toEqual([noteKey(target.identity)])
    const matched = await workspaceShot(page)
    expect(matched.equals(before)).toBe(false)
    await sessionAction(page).click()
  })
})
