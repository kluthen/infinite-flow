/**
 * Focus in the review area, through the score panel that mounts it (the Review panel here its
 * stand-in, the session list and the confirmation sheet real): `Delete session` confirmed in a
 * Review lands on the list's title; a deletion whose sheet the player closed while it ran finishes
 * and moves focus only if it sat on a control the deletion removed, a refusal then moving nothing
 * (ux D316); a row's deletion moves focus to the next row, else the previous, else the list's
 * title, and so does a row whose opening found its session damaged; `All sessions` lands on that
 * session's row.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { KeptSessionRow } from '@/components/workspace/use-kept-sessions'
import type { SessionDeletion } from '@/components/workspace/workspace-session-controller-types'
import { makeSeed } from '@/domain/random/seed'
import type { KeptSessionSummary } from '@/storage/records/kept-session-summary'
import { transportRig } from '../../audio/transport-rig'
import { recordedRecords } from '../review/review-fixtures'
import {
  createFakeSessionController,
  FAKE_REVIEW_KEY,
  fakeReview,
  fakeReviewHistory,
  showingWith,
  type FakeSessionController,
} from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'

const loader = vi.hoisted(() => ({
  load: vi.fn<() => Promise<Component>>(),
  loadArea: vi.fn<() => Promise<Component>>(),
}))

vi.mock('@/components/review/load-review-panel', async () => {
  const { default: sheet } = await import('@/components/workspace/ReviewConfirmationSheet.vue')
  return {
    loadReviewPanel: loader.load,
    loadReviewConfirmationSheet: () => Promise.resolve(sheet),
    loadReviewArea: loader.loadArea,
  }
})

beforeEach(async () => {
  const { default: stub } = await import('./review-panel-stub')
  const { default: area } = await import('@/components/workspace/ReviewArea.vue')
  loader.load.mockReset()
  loader.load.mockImplementation(() => Promise.resolve(stub))
  loader.loadArea.mockReset()
  loader.loadArea.mockImplementation(() => Promise.resolve(area))
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** A kept session's facts, started at `startedAt`. */
function summaryAt(startedAt: number): KeptSessionSummary {
  return {
    startedAt,
    lengthSeconds: 250,
    phraseCount: 2,
    presetLabel: 'Neutral',
    instrument: { id: 'bb-tenor', displayName: 'B-flat tenor saxophone' },
    startingTempo: 90,
    tempoReached: 90,
    pinned: false,
    favoritesCount: 0,
    comment: '',
    playedNotesKept: false,
    recordedByAppVersion: '3.0.0',
    sessionSeed: makeSeed(1),
  }
}

/** Intent: a row of `key`, started at `startedAt`. */
function row(key: string, startedAt: number): KeptSessionRow {
  return { kind: 'current', key, summary: summaryAt(startedAt), failedToOpen: false }
}

/** A promise the test settles by hand. */
interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settle: (value: T) => void
}

/** Intent: a promise the test settles by hand. */
function deferred<T>(): Deferred<T> {
  let settle: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

/**
 * Intent: a fake controller showing a Review of the session also listed under its key, beside two
 * other rows; its `Delete session` waits on `deletion`, then does as the controller does.
 */
function showingListedReview(deletion: Deferred<SessionDeletion>): FakeSessionController {
  const review = fakeReview(fakeReviewHistory(recordedRecords()), true)
  const fake = createFakeSessionController({
    canStart: false,
    startBlocker: 'review_showing',
    keptRows: [row('newest', 3_000), row(FAKE_REVIEW_KEY, 2_000), row('oldest', 1_000)],
    ...showingWith(review),
  })
  fake.deleteSession.mockImplementation(async (key: string) => {
    const outcome = await deletion.promise
    if (outcome !== 'deleted') return outcome
    fake.state.keptRows = fake.state.keptRows.filter((candidate) => candidate.key !== key)
    if (fake.state.review?.key === key) {
      if (fake.state.review.showing) fake.state.listShowing = true
      fake.state.review = null
    }
    return outcome
  })
  return fake
}

/** Intent: mount the score panel over `fake`, attached so focus can move. */
async function mountPanel(fake: FakeSessionController) {
  const { saveSettings } = recordingSaveSettings()
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
  return wrapper
}

/** Intent: the button of the page whose text, or accessible name, is `label`. */
function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === label || candidate.getAttribute('aria-label') === label,
  )
  if (found === undefined) throw new Error(`no button "${label}"`)
  return found
}

/** Intent: the button `label` inside the open confirmation sheet. */
function sheetButton(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('[role="dialog"] button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no sheet button "${label}"`)
  return found
}

/** Intent: the title the review mode shows now. */
function title(): Element | null {
  return document.querySelector('.review-title')
}

// @test-link [[module_kept_session_reach]]
// @test-link [[req_kept_session_list]]
describe('ReviewArea: Delete session from a Review', () => {
  // @test-link [[req_kept_session_list]]
  it('confirmed, shows the list in its place, focus on its title', async () => {
    const deletion = deferred<SessionDeletion>()
    const fake = showingListedReview(deletion)
    await mountPanel(fake)

    button('Delete session').click()
    await flushPromises()
    sheetButton('Delete session').click()
    deletion.settle('deleted')
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(title()?.textContent).toBe('All sessions')
    expect(document.activeElement).toBe(title())
  })

  // @test-link [[module_kept_session_reach]]
  it('with its sheet closed while it ran, finishes and moves focus from the removed button to the title', async () => {
    const deletion = deferred<SessionDeletion>()
    const fake = showingListedReview(deletion)
    await mountPanel(fake)

    button('Delete session').click()
    await flushPromises()
    sheetButton('Delete session').click()
    await flushPromises()
    sheetButton('Cancel').click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(button('Delete session'))

    deletion.settle('deleted')
    await flushPromises()

    expect(fake.deleteSession).toHaveBeenCalledOnce()
    expect(title()?.textContent).toBe('All sessions')
    expect(document.activeElement).toBe(title())
  })

  // @test-link [[module_kept_session_reach]]
  it('with its sheet closed while it ran, leaves focus the player moved elsewhere', async () => {
    const deletion = deferred<SessionDeletion>()
    const fake = showingListedReview(deletion)
    await mountPanel(fake)
    const elsewhere = document.body.appendChild(document.createElement('button'))

    button('Delete session').click()
    await flushPromises()
    sheetButton('Delete session').click()
    await flushPromises()
    sheetButton('Cancel').click()
    await flushPromises()
    elsewhere.focus()
    deletion.settle('deleted')
    await flushPromises()

    expect(title()?.textContent).toBe('All sessions')
    expect(document.activeElement).toBe(elsewhere)
  })

  // @test-link [[module_kept_session_reach]]
  it('refused after its sheet closed, moves nothing and tells nothing', async () => {
    const deletion = deferred<SessionDeletion>()
    const fake = showingListedReview(deletion)
    await mountPanel(fake)

    button('Delete session').click()
    await flushPromises()
    sheetButton('Delete session').click()
    await flushPromises()
    sheetButton('Cancel').click()
    await flushPromises()
    deletion.settle('refused')
    await flushPromises()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(title()?.textContent).toBe('Last session')
    expect(document.activeElement).toBe(button('Delete session'))
  })
})

// @test-link [[req_kept_session_list]]
describe('ReviewArea: the session list', () => {
  /** Intent: the list showing `keys`' rows, started newest first. */
  function listing(deletion: Deferred<SessionDeletion>, keys: readonly string[]) {
    const fake = showingListedReview(deletion)
    fake.state.keptRows = keys.map((key, index) => row(key, (keys.length - index) * 1_000))
    fake.controller.showList()
    return fake
  }

  // @test-link [[req_kept_session_list]]
  it("All sessions in a Review lands on that session's row title", async () => {
    const fake = showingListedReview(deferred<SessionDeletion>())
    await mountPanel(fake)

    button('All sessions').click()
    await flushPromises()

    expect(title()?.textContent).toBe('All sessions')
    expect(document.activeElement?.classList.contains('session-row-open')).toBe(true)
    expect(document.activeElement?.closest('li')).toBe(document.querySelectorAll('.session-row')[1])
  })

  // @test-link [[req_kept_session_list]]
  it("a row's deletion moves focus to the next row, else the previous, else the title over the empty state", async () => {
    const deletion = deferred<SessionDeletion>()
    deletion.settle('deleted')
    const fake = listing(deletion, ['a', 'b'])
    await mountPanel(fake)
    const rowTitles = () => [...document.querySelectorAll('.session-row-open')]

    document.querySelectorAll<HTMLButtonElement>('.session-row-actions .btn')[1]?.click()
    await flushPromises()
    sheetButton('Delete session').click()
    await flushPromises()
    expect(rowTitles()).toHaveLength(1)
    expect(document.activeElement).toBe(rowTitles()[0])

    document.querySelectorAll<HTMLButtonElement>('.session-row-actions .btn')[1]?.click()
    await flushPromises()
    sheetButton('Cancel').click()
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('Delete')
    document.querySelectorAll<HTMLButtonElement>('.session-row-actions .btn')[1]?.click()
    await flushPromises()
    sheetButton('Delete session').click()
    await flushPromises()

    expect(document.querySelector('.sessions-empty')?.textContent?.trim()).toBe(
      'No sessions are kept. Your next session will be kept here.',
    )
    expect(document.activeElement).toBe(title())
  })

  // @test-link [[module_kept_session_save]]
  it('a row whose opening found its session damaged leaves, focus moving as after its deletion', async () => {
    const fake = listing(deferred<SessionDeletion>(), ['a', 'b', 'c'])
    fake.openSession.mockImplementation((key: string) => {
      fake.state.keptRows = fake.state.keptRows.filter((candidate) => candidate.key !== key)
      return Promise.resolve('damaged')
    })
    await mountPanel(fake)
    const rowTitles = () => [...document.querySelectorAll<HTMLButtonElement>('.session-row-open')]

    rowTitles()[1]?.click()
    await flushPromises()
    expect(rowTitles()).toHaveLength(2)
    expect(document.activeElement).toBe(rowTitles()[1])

    rowTitles()[1]?.click()
    await flushPromises()
    expect(document.activeElement).toBe(rowTitles()[0])

    rowTitles()[0]?.click()
    await flushPromises()
    expect(document.querySelector('.sessions-empty')).not.toBeNull()
    expect(document.activeElement).toBe(title())
  })
})
