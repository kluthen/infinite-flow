/**
 * The score panel's confirmations over the Review (the panel here its stand-in): `Delete played
 * notes` and `Keep my played notes` turned off with played notes kept open the shared confirmation
 * sheet with the design's words; the way back returns focus to the button that opened it; a
 * deletion moves focus to `review-title` once `review-view` has left, or to `Keep my played notes`
 * while it stays; a refused deletion keeps the sheet with its error; saving turning off closes it,
 * deleting nothing, focus on `review-title`.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import { transportRig } from '../../audio/transport-rig'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  showingWith,
  type FakeSessionController,
} from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'

const loader = vi.hoisted(() => ({ load: vi.fn<() => Promise<Component>>() }))

// The confirmation sheet's real component, settling within one flush, as a warmed chunk does.
vi.mock('@/components/review/load-review-panel', async () => {
  const { default: sheet } = await import('@/components/workspace/ReviewConfirmationSheet.vue')
  return { loadReviewPanel: loader.load, loadReviewConfirmationSheet: () => Promise.resolve(sheet) }
})

beforeEach(async () => {
  const { default: stub } = await import('./review-panel-stub')
  loader.load.mockReset()
  loader.load.mockImplementation(() => Promise.resolve(stub))
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: a fake controller showing the recorded session's Review, its played notes kept. */
function showingKeptPlayedNotes(): FakeSessionController {
  const review = fakeReview(fakeReviewHistory(recordedRecords()), true, 'not-pinned', true)
  return createFakeSessionController({
    canStart: false,
    startBlocker: 'review_showing',
    keepPlayedNotes: true,
    ...showingWith(review),
  })
}

/** Intent: mount the panel over `fake`, attached so focus can move; its saves recorded. */
async function mountPanel(fake: FakeSessionController) {
  const { saveSettings, saves } = recordingSaveSettings()
  const wrapper = mount(ScorePanel, {
    props: {
      session: fakeGenerationSession(readyState()).session,
      pendingPhrase: null,
      handleEngraved: vi.fn(),
      handleNotationError: vi.fn(),
      handleSessionStaffFailed: vi.fn(),
      handleLayoutInputs: vi.fn(),
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      controller: fake.controller,
      matchesPhoneLayout: () => false,
    },
    global: {
      stubs: { PhraseScore: PHRASE_SCORE_STUB },
      provide: provideSaveSettings(saveSettings),
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, saves }
}

/** Intent: the button of the page whose text is `label`. */
function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (found === undefined) throw new Error(`no button "${label}"`)
  return found
}

/** Intent: the open sheet's title, paragraphs, error and actions; null when none is open. */
function openSheet() {
  const dialog = document.querySelector('[role="dialog"]')
  if (dialog === null) return null
  return {
    title: dialog.querySelector('.sheet-title')?.textContent,
    paragraphs: [...dialog.querySelectorAll('.sheet-body > p')].map((p) => p.textContent),
    error: dialog.querySelector('.alert-error')?.textContent?.trim() ?? null,
    actions: [...dialog.querySelectorAll('.sheet-actions button')].map((b) =>
      b.textContent?.trim(),
    ),
  }
}

// @test-link [[rule_kept_played_notes_deletable]]
describe("ScorePanel: deleting this session's played notes", () => {
  it('asks first, focus on the way back, and the way back returns it to Delete played notes', async () => {
    const fake = showingKeptPlayedNotes()
    await mountPanel(fake)

    button('Delete played notes').click()
    await flushPromises()

    expect(openSheet()).toEqual({
      title: "Delete this session's played notes?",
      paragraphs: [
        'This deletes the notes you played in this session. The session stays, with its favorite phrases and comment.',
        "This can't be undone.",
      ],
      error: null,
      actions: ['Delete played notes', 'Cancel'],
    })
    expect(document.activeElement).toBe(button('Cancel'))

    button('Cancel').click()
    await flushPromises()
    expect(openSheet()).toBeNull()
    expect(document.activeElement).toBe(button('Delete played notes'))
    expect(fake.deletePlayedNotes).not.toHaveBeenCalled()
  })

  it('confirmed, deletes them and moves focus to review-title, review-view gone', async () => {
    const fake = showingKeptPlayedNotes()
    const { wrapper } = await mountPanel(fake)

    button('Delete played notes').click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.sheet-actions .btn-error')!.click()
    await flushPromises()

    expect(fake.deletePlayedNotes).toHaveBeenCalledOnce()
    expect(openSheet()).toBeNull()
    expect(wrapper.find('.review-view').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })

  it('refused, keeps its sheet open with its error', async () => {
    const fake = showingKeptPlayedNotes()
    fake.deletePlayedNotes.mockResolvedValueOnce('refused')
    await mountPanel(fake)

    button('Delete played notes').click()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.sheet-actions .btn-error')!.click()
    await flushPromises()

    expect(openSheet()?.error).toBe("That couldn't be deleted. Try again.")
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('closes, deleting nothing, when saving turns off, focus on review-title', async () => {
    const fake = showingKeptPlayedNotes()
    const { wrapper } = await mountPanel(fake)
    button('Delete played notes').click()
    await flushPromises()

    fake.state.savingOff = true
    await flushPromises()

    expect(openSheet()).toBeNull()
    expect(fake.deletePlayedNotes).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })
})

// @test-link [[rule_kept_played_notes_deletable]]
// @test-link [[rule_played_notes_kept_only_after_opt_in]]
describe('ScorePanel: Keep my played notes turned off with played notes kept', () => {
  it('saves the setting and asks "Delete the played notes already kept?", Keep them going back', async () => {
    const fake = showingKeptPlayedNotes()
    fake.setKeepPlayedNotes.mockResolvedValue({ kind: 'confirm-deletion', sessionCount: 1 })
    const { saves } = await mountPanel(fake)

    button('Keep my played notes').click()
    await flushPromises()

    expect(saves).toEqual([{ keepPlayedNotes: false }])
    expect(openSheet()).toEqual({
      title: 'Delete the played notes already kept?',
      paragraphs: [
        "Your played notes won't be kept from now on. The ones already kept with 1 session can be deleted too; the sessions stay.",
        "This can't be undone.",
      ],
      error: null,
      actions: ['Delete them', 'Keep them'],
    })
    button('Keep them').click()
    await flushPromises()
    expect(openSheet()).toBeNull()
    expect(fake.deleteEveryKeptPlayedNote).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(button('Keep my played notes'))
  })

  it('Delete them deletes every kept played note; focus to Keep my played notes while review-view stays', async () => {
    const fake = showingKeptPlayedNotes()
    fake.setKeepPlayedNotes.mockResolvedValue({ kind: 'confirm-deletion', sessionCount: 3 })
    fake.deleteEveryKeptPlayedNote.mockResolvedValueOnce('deleted')
    await mountPanel(fake)

    button('Keep my played notes').click()
    await flushPromises()
    expect(openSheet()?.paragraphs[0]).toContain('kept with 3 sessions')
    button('Delete them').click()
    await flushPromises()

    expect(fake.deleteEveryKeptPlayedNote).toHaveBeenCalledOnce()
    expect(openSheet()).toBeNull()
    expect(document.activeElement).toBe(button('Keep my played notes'))
  })
})
