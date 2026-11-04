/**
 * The review area's played-notes side: `Keep my played notes` saved as the player turns it and
 * handed to the controller, its confirmation opened when the controller asks for the deletion,
 * `Delete played notes` offered only for a session whose played notes are kept while saving is on,
 * and each confirmation's way through: confirmed (closed, or kept open with its error after a
 * refusal), cancelled, or closed deleting nothing when saving turns off or the Review goes.
 */
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { reviewConfirmationCopy } from '@/components/workspace/review-confirmation-copy'
import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
  type FakeSessionController,
} from './fake-session-controller'
import { reviewAreaRig } from './review-area-rig'
import { reviewedJamPart } from './reviewed-jam-part-fixture'

/** Intent: a fake controller showing a Review whose played notes are kept, or not. */
function showingPlayedNotes(kept: boolean): FakeSessionController {
  const review = fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-pinned', kept)
  return createFakeSessionController({
    review,
    mostRecent: heldSessionOf(review),
    keepPlayedNotes: kept,
  })
}

/** Intent: the review area over `fake`'s controller, inside its own effect scope. */
function areaOver(fake: FakeSessionController) {
  const { area, saves, stop } = reviewAreaRig(fake)
  return { built: area, saves, stop }
}

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[rule_review_played_notes_toggle]]
describe('the review area: Keep my played notes', () => {
  it("shows the controller's setting, saves the player's change and hands it to the controller", async () => {
    const fake = showingPlayedNotes(false)
    const { built, saves, stop } = areaOver(fake)
    expect(built.keepPlayedNotes.value).toBe(false)

    await built.setKeepPlayedNotes(true)

    expect(saves).toEqual([{ keepPlayedNotes: true }])
    expect(fake.setKeepPlayedNotes).toHaveBeenCalledWith(true)
    expect(built.keepPlayedNotes.value).toBe(true)
    expect(built.confirmation.value).toBeNull()
    stop()
  })

  // @test-link [[rule_kept_played_notes_deletable]]
  it('turned off with played notes kept, opens "Delete the played notes already kept?"', async () => {
    const fake = showingPlayedNotes(true)
    fake.setKeepPlayedNotes.mockResolvedValueOnce({ kind: 'confirm-deletion', sessionCount: 2 })
    const { built, saves, stop } = areaOver(fake)

    await built.setKeepPlayedNotes(false)

    expect(saves).toEqual([{ keepPlayedNotes: false }])
    expect(built.confirmation.value).toEqual({
      kind: 'kept-played-notes',
      sessionCount: 2,
      jam: false,
      failed: false,
      busy: false,
    })
    stop()
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
describe('the review area: deleting played notes', () => {
  it('offers Delete played notes only for kept played notes, while saving is on and the session is saved', () => {
    const fake = showingPlayedNotes(true)
    const { built, stop } = areaOver(fake)
    expect(built.canDeletePlayedNotes.value).toBe(true)

    fake.state.savingOff = true
    expect(built.canDeletePlayedNotes.value).toBe(false)
    fake.state.savingOff = false
    fake.state.review = { ...fake.state.review!, keeping: 'not-saved' }
    expect(built.canDeletePlayedNotes.value).toBe(false)
    fake.state.review = { ...fake.state.review, keeping: 'pinned', playedNotesKept: false }
    expect(built.canDeletePlayedNotes.value).toBe(false)
    stop()
  })

  it("asks first, then deletes this session's played notes and closes", async () => {
    const fake = showingPlayedNotes(true)
    const { built, stop } = areaOver(fake)

    built.askDeletePlayedNotes()
    expect(built.confirmation.value).toEqual({
      kind: 'session-played-notes',
      jam: false,
      failed: false,
      busy: false,
    })
    expect(fake.deletePlayedNotes).not.toHaveBeenCalled()

    expect(await built.confirm()).toBe('deleted')
    expect(fake.deletePlayedNotes).toHaveBeenCalledOnce()
    expect(built.confirmation.value).toBeNull()
    stop()
  })

  it('a refused deletion keeps its sheet open with its error, and the confirming action tries again', async () => {
    const fake = showingPlayedNotes(true)
    fake.deletePlayedNotes.mockResolvedValueOnce('refused')
    const { built, stop } = areaOver(fake)
    built.askDeletePlayedNotes()

    expect(await built.confirm()).toBe('failed')
    expect(built.confirmation.value).toEqual(
      expect.objectContaining({ kind: 'session-played-notes', failed: true, busy: false }),
    )

    expect(await built.confirm()).toBe('deleted')
    expect(fake.deletePlayedNotes).toHaveBeenCalledTimes(2)
    stop()
  })

  it('Delete them deletes every kept played note; Keep them keeps them', async () => {
    const fake = showingPlayedNotes(true)
    fake.setKeepPlayedNotes.mockResolvedValue({ kind: 'confirm-deletion', sessionCount: 1 })
    const { built, stop } = areaOver(fake)

    await built.setKeepPlayedNotes(false)
    built.cancel()
    expect(built.confirmation.value).toBeNull()
    expect(fake.deleteEveryKeptPlayedNote).not.toHaveBeenCalled()

    await built.setKeepPlayedNotes(false)
    expect(await built.confirm()).toBe('deleted')
    expect(fake.deleteEveryKeptPlayedNote).toHaveBeenCalledOnce()
    expect(fake.setKeepPlayedNotes.mock.calls).toEqual([[false], [false]])
    stop()
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('closes an open deletion, deleting nothing, when saving turns off or the Review goes', async () => {
    const fake = showingPlayedNotes(true)
    const { built, stop } = areaOver(fake)

    built.askDeletePlayedNotes()
    fake.state.savingOff = true
    await nextTick()
    expect(built.confirmation.value).toBeNull()

    fake.state.savingOff = false
    built.askDeletePlayedNotes()
    fake.state.review = null
    await nextTick()
    expect(built.confirmation.value).toBeNull()
    expect(fake.deletePlayedNotes).not.toHaveBeenCalled()
    stop()
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[rule_deleting_played_notes_keeps_quantized_doodle]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe("the review area: Delete played notes' confirmation", () => {
  const CANNOT = "This can't be undone."

  it("reads v3.0's copy in a session that is no Jam", () => {
    const { built, stop } = areaOver(showingPlayedNotes(true))

    built.askDeletePlayedNotes()

    expect(reviewConfirmationCopy(built.confirmation.value!)).toEqual({
      title: "Delete this session's played notes?",
      paragraphs: [
        'This deletes the notes you played in this session. The session stays, with its favorite phrases and comment.',
        CANNOT,
      ],
      confirmLabel: 'Delete played notes',
      cancelLabel: 'Cancel',
      destructive: true,
      error: null,
    })
    stop()
  })

  it('reads the Jam copy in a Jam in which only the doodle was played, its played notes kept', () => {
    const review = {
      ...fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-pinned', true),
      jam: reviewedJamPart(),
    }
    const fake = createFakeSessionController({
      review,
      mostRecent: heldSessionOf(review),
      keepPlayedNotes: true,
    })
    const { built, stop } = areaOver(fake)
    expect(built.canDeletePlayedNotes.value).toBe(true)

    built.askDeletePlayedNotes()

    const copy = reviewConfirmationCopy(built.confirmation.value!)
    expect(copy.title).toBe("Delete this session's played notes?")
    expect(copy.paragraphs).toEqual([
      'This deletes the notes you played in this session. The session stays, with its doodle as the app wrote it, its favorite phrases and comment.',
      CANNOT,
    ])
    expect(copy.confirmLabel).toBe('Delete played notes')
    stop()
  })
})

/** Intent: a listed session under `key` a newer version wrote, with what can be read of it. */
function listed(key: string, playedNotesKept: boolean, isJam: boolean): KeptSessionRow {
  return { kind: 'newer', key, readable: { playedNotesKept, isJam }, failedToOpen: false }
}

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe("the review area: the played notes already kept's confirmation", () => {
  const CANNOT = "This can't be undone."

  /** Intent: the copy opened by turning Keep my played notes off over `keptRows`, `count` kept. */
  async function keptCopy(keptRows: readonly KeptSessionRow[], count: number) {
    const fake = showingPlayedNotes(true)
    fake.state.keptRows = keptRows
    fake.setKeepPlayedNotes.mockResolvedValueOnce({
      kind: 'confirm-deletion',
      sessionCount: count,
    })
    const { built, stop } = areaOver(fake)
    await built.setKeepPlayedNotes(false)
    const copy = reviewConfirmationCopy(built.confirmation.value!)
    stop()
    return copy
  }

  it('reads as built when no session keeping played notes is a Jam, a Jam keeping none aside', async () => {
    const copy = await keptCopy([listed('a', true, false), listed('j', false, true)], 1)

    expect(copy).toEqual({
      title: 'Delete the played notes already kept?',
      paragraphs: [
        "Your played notes won't be kept from now on. The ones already kept with 1 session can be deleted too; the sessions stay.",
        CANNOT,
      ],
      confirmLabel: 'Delete them',
      cancelLabel: 'Keep them',
      destructive: true,
      error: null,
    })
  })

  it('says the doodles stay when a Jam session is among those keeping played notes, whichever the Review shows', async () => {
    const copy = await keptCopy([listed('a', true, false), listed('j', true, true)], 2)

    expect(copy).toEqual({
      title: 'Delete the played notes already kept?',
      paragraphs: [
        "Your played notes won't be kept from now on. The ones already kept with 2 sessions can be deleted too; the sessions stay. Doodles stay as the app wrote them.",
        CANNOT,
      ],
      confirmLabel: 'Delete them',
      cancelLabel: 'Keep them',
      destructive: true,
      error: null,
    })
    expect((await keptCopy([listed('j', true, true)], 1)).paragraphs[0]).toBe(
      "Your played notes won't be kept from now on. The ones already kept with 1 session can be deleted too; the sessions stay. Doodles stay as the app wrote them.",
    )
  })
})
