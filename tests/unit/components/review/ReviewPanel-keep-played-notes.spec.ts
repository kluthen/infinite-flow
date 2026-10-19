/**
 * The Review panel's `Keep my played notes` and `Delete played notes`, in `review-view` after the
 * `Played notes` switch: the switch shows the setting and asks the page to turn it, focus staying
 * on it; `Delete played notes` is rendered only when this session's played notes are kept and
 * deletable, and asks the page for its confirmation; neither exists without a played note. The
 * panel can put focus on either for the page.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

/** The props a test may override. */
interface PanelOptions {
  readonly holdsPlayedNote?: boolean
  readonly keepPlayedNotes?: boolean
  readonly canDeletePlayedNotes?: boolean
}

const mounted: VueWrapper[] = []

/** Intent: mount the panel of a session holding played notes, attached so focus can be checked. */
function mountPanel(options: PanelOptions = {}) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records: recordedRecords(),
      instrumentName: 'B-flat tenor saxophone',
      presetLabel: 'Neutral',
      startedAt: 0,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport: { layout: 'one-system', heightBudgetPx: null },
      noRoom: false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: () => Promise.resolve(),
      holdsPlayedNote: options.holdsPlayedNote ?? true,
      playedNotesShown: false,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: options.keepPlayedNotes ?? false,
      canDeletePlayedNotes: options.canDeletePlayedNotes ?? false,
      includeVeryShortNotes: false,
      ...SESSION_TOOL_PROPS,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: the buttons of `review-view`, by their visible label. */
function viewButtons(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.review-view button').map((button) => {
    const state = button.find('.toggle-button-state')
    const label = button
      .text()
      .replace(state.exists() ? state.text() : '', '')
      .trim()
    return state.exists() ? `${label}: ${button.attributes('aria-pressed')}` : label
  })
}

/** Intent: the `Keep my played notes` switch. */
function keepSwitch(wrapper: VueWrapper) {
  const button = wrapper
    .findAll<HTMLButtonElement>('.review-view button')
    .find((candidate) => candidate.text().startsWith('Keep my played notes'))
  if (button === undefined) throw new Error('no Keep my played notes switch')
  return button
}

beforeEach(() => {
  stubReviewBrowser()
  resetFakePhraseEngraver()
})

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  vi.unstubAllGlobals()
})

// @test-link [[rule_played_notes_kept_only_after_opt_in]]
// @test-link [[rule_kept_played_notes_deletable]]
describe('the Review panel: Keep my played notes and Delete played notes', () => {
  it('follow Played notes in review-view, Delete played notes only when they are kept', () => {
    expect(viewButtons(mountPanel())).toEqual([
      'Played notes: false',
      'Keep my played notes: false',
    ])
    expect(viewButtons(mountPanel({ keepPlayedNotes: true, canDeletePlayedNotes: true }))).toEqual([
      'Played notes: false',
      'Keep my played notes: true',
      'Delete played notes',
    ])
  })

  it('are absent from a session without a played note', () => {
    const wrapper = mountPanel({ holdsPlayedNote: false, canDeletePlayedNotes: true })

    expect(wrapper.find('.review-view').exists()).toBe(false)
  })

  it('the switch, named by its label alone, asks the page to turn it, focus staying on it', async () => {
    const wrapper = mountPanel({ keepPlayedNotes: true })
    const button = keepSwitch(wrapper)
    button.element.focus()

    await button.trigger('click')

    expect(wrapper.emitted('update:keepPlayedNotes')).toEqual([[false]])
    expect(button.get('.toggle-button-state').attributes('aria-hidden')).toBe('true')
    expect(document.activeElement).toBe(button.element)
  })

  it('Delete played notes asks the page for its confirmation', async () => {
    const wrapper = mountPanel({ keepPlayedNotes: true, canDeletePlayedNotes: true })

    await wrapper.get('.review-view button:last-child').trigger('click')

    expect(wrapper.emitted('delete-played-notes')).toHaveLength(1)
  })

  it('puts focus on the switch or on Delete played notes for the page', () => {
    const wrapper = mountPanel({ keepPlayedNotes: true, canDeletePlayedNotes: true })
    const panel = wrapper.vm as unknown as {
      focusKeepPlayedNotes: () => void
      focusDeletePlayedNotes: () => void
    }

    panel.focusDeletePlayedNotes()
    expect(document.activeElement?.textContent?.trim()).toBe('Delete played notes')
    panel.focusKeepPlayedNotes()
    expect(document.activeElement).toBe(keepSwitch(wrapper).element)
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('Delete played notes leaving while focused (saving turned off) hands focus to the title', async () => {
    const wrapper = mountPanel({ keepPlayedNotes: true, canDeletePlayedNotes: true })
    ;(wrapper.vm as unknown as { focusDeletePlayedNotes: () => void }).focusDeletePlayedNotes()

    await wrapper.setProps({ canDeletePlayedNotes: false })
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })
})
