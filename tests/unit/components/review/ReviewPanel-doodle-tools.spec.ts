/**
 * Where a Jam session's Review puts the doodle section's controls, which its host gives (the
 * review's handoff, Layout Tree, Focus and Keyboard): `Jam again on this doodle` at the trailing
 * end of the section's header, named by the section's note while the doodle is not shown; the
 * suggestion last in the section; and focus on one of them handed to `review-title` when the room
 * notice replaces the section. A Review of a session that is no Jam has neither.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import type { ReviewJamCode } from '@/components/review/review-types'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { reviewedJamPart } from '../workspace/reviewed-jam-part-fixture'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const mounted: VueWrapper[] = []

/** Intent: mount a Jam session's Review panel with its doodle tools in the slots its host fills. */
function mountJamPanel(
  options: { readonly isJam?: boolean; readonly jamCode?: ReviewJamCode } = {},
) {
  const isJam = options.isJam ?? true
  const wrapper = mount(ReviewPanel, {
    props: {
      records: recordedRecords(),
      instrumentName: 'B-flat tenor saxophone',
      presetLabel: 'Neutral',
      isJam,
      doodle: isJam ? reviewedJamPart().doodle : null,
      jamCode: options.jamCode ?? { state: 'failed' },
      startedAt: new Date(2026, 10, 4, 10, 0).getTime(),
      lengthSeconds: 120,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport: { layout: 'one-system', heightBudgetPx: null },
      noRoom: false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: () => Promise.resolve(),
      holdsPlayedNote: false,
      playedNotesShown: false,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      includeVeryShortNotes: false,
      ...SESSION_TOOL_PROPS,
    },
    slots: {
      'doodle-tools': ({ noteId }: { noteId: string }) =>
        h('button', { type: 'button', class: 'btn', 'aria-describedby': noteId }, 'Jam again'),
      'doodle-suggestion': () => h('div', { class: 'suggestion-row' }, [h('p', 'A suggestion')]),
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

beforeEach(() => {
  stubReviewBrowser()
  resetFakePhraseEngraver()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// @test-link [[rule_review_opens_with_doodle]]
describe("the doodle section's controls", () => {
  // @test-link [[rule_jam_again_on_this_doodle]]
  it('puts Jam again at the header’s trailing end, named by the note, and the suggestion last', () => {
    const wrapper = mountJamPanel()
    const section = wrapper.get('section.review-doodle')

    const header = section.get(':scope > .review-phrase-header')
    const button = header.get(':scope > button:last-child')
    expect(button.text()).toBe('Jam again')
    const note = section.get('.review-phrase-note')
    expect(button.attributes('aria-describedby')).toBe(note.attributes('id'))
    expect(section.get(':scope > :last-child').classes()).toContain('suggestion-row')
  })

  // @test-link [[req_last_session_review]]
  it('renders neither in the Review of a session that is no Jam', () => {
    const wrapper = mountJamPanel({ isJam: false })

    expect(wrapper.find('section.review-doodle').exists()).toBe(false)
    expect(wrapper.find('.suggestion-row').exists()).toBe(false)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('hands focus on them to review-title when the room notice replaces the section', async () => {
    const wrapper = mountJamPanel()
    ;(wrapper.get('.review-doodle .review-phrase-header > button').element as HTMLElement).focus()

    await wrapper.setProps({ noRoom: true })
    await nextTick()

    expect(wrapper.find('section.review-doodle').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('h2.review-title').element)
  })
})
