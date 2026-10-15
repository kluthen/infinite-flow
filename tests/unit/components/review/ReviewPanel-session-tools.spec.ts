/**
 * The Review panel's own tools on its session: each phrase's favorite star (pressed for a
 * favorite, named by its phrase, asking the page to mark or unmark it), the favorites in the
 * summary, `Pin` / `Unpin` and `Delete session` at the end of the heading row (`Delete session`
 * absent while saving is off, focus moving to the title if it leaves while focused), and the
 * comment in its three states, saved on `Done`, Escape, the field losing focus and the Review
 * being left, a paste cut at 500 characters.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

/** The session-tool props a test may override. */
type ToolOptions = Partial<typeof SESSION_TOOL_PROPS>

const mounted: VueWrapper[] = []

/** Intent: mount the panel of a three-phrase session, attached so focus can be checked. */
function mountPanel(options: ToolOptions = {}) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records: recordedRecords(),
      instrumentName: 'B-flat tenor saxophone',
      startedAt: 0,
      mostRecent: false,
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
      ...SESSION_TOOL_PROPS,
      ...options,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: the session tools' buttons, by their label. */
function toolButtons(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.review-header > .review-session-tools > button').map((b) => b.text())
}

/** Intent: the comment row's button labelled `label`. */
function commentButton(wrapper: VueWrapper, label: string) {
  const button = wrapper
    .findAll<HTMLButtonElement>('.review-comment button')
    .find((candidate) => candidate.text() === label)
  if (button === undefined) throw new Error(`no comment button "${label}"`)
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

// @test-link [[req_favorite_phrases]]
describe('the favorite stars', () => {
  it('are one pressed-state button per phrase, at the end of its header, named by its phrase', () => {
    const wrapper = mountPanel({ favorites: [2] })

    const stars = wrapper.findAll('.review-phrase-header > button.btn.favorite-toggle')
    expect(stars.map((star) => star.attributes('aria-label'))).toEqual([
      'Favorite phrase 1',
      'Favorite phrase 2',
      'Favorite phrase 3',
    ])
    expect(stars.map((star) => star.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(stars[0]!.get('svg').attributes('aria-hidden')).toBe('true')
    expect(stars[0]!.get('span').text()).toBe('Favorite')
    const header = wrapper.get('.review-phrase-header').element
    expect(header.lastElementChild).toBe(stars[0]!.element)
  })

  it('ask the page to mark or unmark their phrase, focus staying on the star', async () => {
    const wrapper = mountPanel()
    const star = wrapper.findAll<HTMLButtonElement>('.favorite-toggle')[2]!
    star.element.focus()

    await star.trigger('click')

    expect(wrapper.emitted('toggle-favorite')).toEqual([[3]])
    expect(document.activeElement).toBe(star.element)
  })

  it('are counted in the summary: none, one, several', async () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.review-summary').text()).toBe(
      '3 phrases · B-flat tenor saxophone · No favorites',
    )
    await wrapper.setProps({ favorites: [1] })
    expect(wrapper.get('.review-summary').text()).toMatch(/ · 1 favorite$/)
    await wrapper.setProps({ favorites: [1, 3] })
    expect(wrapper.get('.review-summary').text()).toMatch(/ · 2 favorites$/)
  })
})

// @test-link [[rule_pinned_session_kept]]
// @test-link [[req_kept_session_list]]
describe('the session tools', () => {
  it('read Pin or Unpin, then Delete session, at the end of the heading row', async () => {
    const wrapper = mountPanel()
    expect(toolButtons(wrapper)).toEqual(['Pin', 'Delete session'])
    const header = wrapper.get('.review-header').element
    expect([...header.children].map((child) => child.className)).toEqual([
      'review-heading',
      'review-session-tools',
    ])

    await wrapper.setProps({ pinned: true })
    expect(toolButtons(wrapper)).toEqual(['Unpin', 'Delete session'])
  })

  it('ask the page to pin or unpin, and to delete', async () => {
    const wrapper = mountPanel()
    const [pin, remove] = wrapper.findAll('.review-session-tools > button')

    await pin!.trigger('click')
    await remove!.trigger('click')

    expect(wrapper.emitted('toggle-pin')).toEqual([[]])
    expect(wrapper.emitted('delete-session')).toEqual([[]])
  })

  it('offer no Delete session while saving is off; leaving while focused hands focus to the title', async () => {
    expect(toolButtons(mountPanel({ canDeleteSession: false }))).toEqual(['Pin'])

    const wrapper = mountPanel()
    const remove = wrapper.findAll<HTMLButtonElement>('.review-session-tools > button')[1]!
    remove.element.focus()
    await wrapper.setProps({ canDeleteSession: false })
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })

  it('take focus for the page: the pin button, then Delete session', () => {
    const wrapper = mountPanel()
    const exposed = wrapper.vm as unknown as {
      focusPin: () => void
      focusDeleteSession: () => void
    }
    const [pin, remove] = wrapper.findAll('.review-session-tools > button')

    exposed.focusPin()
    expect(document.activeElement).toBe(pin!.element)
    exposed.focusDeleteSession()
    expect(document.activeElement).toBe(remove!.element)
  })
})

// @test-link [[rule_session_comment]]
describe('the comment', () => {
  it('collapsed, reads Add a comment, or the comment with Edit comment, in a row before the exports', async () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.review-comment').text()).toBe('Add a comment')
    expect(wrapper.get('.review-header').element.nextElementSibling).toBe(
      wrapper.get('.review-comment').element,
    )

    await wrapper.setProps({ comment: 'Steady.\nThen faster.' })
    expect(wrapper.get('.review-comment > p').text()).toBe('Steady.\nThen faster.')
    expect(commentButton(wrapper, 'Edit comment').exists()).toBe(true)
  })

  it('opens its editor with focus in the labelled field, the caret at the end, and its count', async () => {
    const wrapper = mountPanel({ comment: 'Steady.' })

    await commentButton(wrapper, 'Edit comment').trigger('click')
    await flushPromises()

    const field = wrapper.get<HTMLTextAreaElement>('.review-comment textarea.text-area')
    expect(document.activeElement).toBe(field.element)
    expect(field.element.value).toBe('Steady.')
    expect(field.element.selectionStart).toBe(7)
    expect(field.attributes('maxlength')).toBe('500')
    const label = wrapper.get('.review-comment label.field-label')
    expect(label.text()).toBe('Comment')
    expect(label.attributes('for')).toBe(field.attributes('id'))
    const count = wrapper.get('.review-comment .field-count')
    expect(count.text()).toBe('7/500')
    expect(field.attributes('aria-describedby')).toBe(count.attributes('id'))
  })

  it('cuts a paste at 500 characters, its count following', async () => {
    const wrapper = mountPanel()
    await commentButton(wrapper, 'Add a comment').trigger('click')
    await flushPromises()

    await wrapper.get('textarea').setValue('x'.repeat(600))

    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toHaveLength(500)
    expect(wrapper.get('.field-count').text()).toBe('500/500')
  })

  it('saves on blur (the editor staying open), then on Done, which returns focus to its button', async () => {
    const wrapper = mountPanel()
    await commentButton(wrapper, 'Add a comment').trigger('click')
    await flushPromises()
    const field = wrapper.get('textarea')
    await field.setValue('Mine.')

    await field.trigger('blur')
    expect(wrapper.emitted('save-comment')).toEqual([['session-1-1', 'Mine.']])
    expect(wrapper.find('textarea').exists()).toBe(true)
    // The page holds the saved comment at once, as the controller does.
    await wrapper.setProps({ comment: 'Mine.' })

    await commentButton(wrapper, 'Done').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('save-comment')).toHaveLength(2)
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(document.activeElement).toBe(commentButton(wrapper, 'Edit comment').element)
  })

  it('Escape in the field does what Done does', async () => {
    const wrapper = mountPanel()
    await commentButton(wrapper, 'Add a comment').trigger('click')
    await flushPromises()

    await wrapper.get('textarea').setValue('Esc.')
    await wrapper.get('textarea').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.emitted('save-comment')?.at(-1)).toEqual(['session-1-1', 'Esc.'])
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('saves the open draft when the Review is left, for the session it was opened on', async () => {
    const wrapper = mountPanel()
    await commentButton(wrapper, 'Add a comment').trigger('click')
    await flushPromises()
    await wrapper.get('textarea').setValue('Left open.')

    wrapper.unmount()
    mounted.splice(0)

    expect(wrapper.emitted('save-comment')?.at(-1)).toEqual(['session-1-1', 'Left open.'])
  })
})
