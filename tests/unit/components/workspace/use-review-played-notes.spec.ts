/**
 * The Review host's played-notes side: `Keep my played notes` saved as the player turns it and
 * handed to the controller, its confirmation opened when the controller asks for the deletion,
 * `Delete played notes` offered only for a session whose played notes are kept while saving is on,
 * and each confirmation's way through: confirmed (closed, or kept open with its error after a
 * refusal), cancelled, or closed deleting nothing when saving turns off or the Review goes.
 */
import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { useReviewHost } from '@/components/workspace/use-review-host'
import { DEFAULT_REVIEW_PREFERENCES } from '@/storage/records/setting-defaults'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
  type FakeSessionController,
} from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'
import { recordingSaveSettings } from './recording-save-settings'

/** Intent: a fake controller showing a Review whose played notes are kept, or not. */
function showingPlayedNotes(kept: boolean): FakeSessionController {
  const review = fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-pinned', kept)
  return createFakeSessionController({
    review,
    mostRecent: heldSessionOf(review),
    keepPlayedNotes: kept,
  })
}

/** Intent: a host over `fake`'s controller inside its own effect scope. */
function host(fake: FakeSessionController) {
  const { session } = fakeGenerationSession()
  const { saveSettings, saves } = recordingSaveSettings()
  const scope = effectScope()
  const built = scope.run(() =>
    useReviewHost({
      controller: () => fake.controller,
      idle: () => session.state,
      exportPorts: () => ({ load: vi.fn(), download: vi.fn() }),
      initialPreferences: DEFAULT_REVIEW_PREFERENCES,
      saveSettings,
    }),
  )
  if (built === undefined) throw new Error('the effect scope did not run')
  return { built, saves, stop: () => scope.stop() }
}

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[rule_review_played_notes_toggle]]
describe('the Review host: Keep my played notes', () => {
  it("shows the controller's setting, saves the player's change and hands it to the controller", async () => {
    const fake = showingPlayedNotes(false)
    const { built, saves, stop } = host(fake)
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
    const { built, saves, stop } = host(fake)

    await built.setKeepPlayedNotes(false)

    expect(saves).toEqual([{ keepPlayedNotes: false }])
    expect(built.confirmation.value).toEqual({
      kind: 'kept-played-notes',
      sessionCount: 2,
      failed: false,
      busy: false,
    })
    stop()
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
describe('the Review host: deleting played notes', () => {
  it('offers Delete played notes only for kept played notes, while saving is on and the session is saved', () => {
    const fake = showingPlayedNotes(true)
    const { built, stop } = host(fake)
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
    const { built, stop } = host(fake)

    built.askDeletePlayedNotes()
    expect(built.confirmation.value).toEqual({
      kind: 'session-played-notes',
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
    const { built, stop } = host(fake)
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
    const { built, stop } = host(fake)

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
    const { built, stop } = host(fake)

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
