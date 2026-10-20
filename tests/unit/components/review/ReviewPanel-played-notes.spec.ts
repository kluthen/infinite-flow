/**
 * The Review panel's played-notes tools (v2.1): the `Export played notes` button in its group after
 * the generated-notes group and the `Played notes` switch on a row of its own, both rendered only when
 * the session holds a played note; the played export's pending and focus behaviour, its
 * independence from the generated-notes export, the one export error both share, and the switch's
 * state, name and event. The lanes themselves are not drawn here.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import type { ExportRequest } from '@/components/review/review-types'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

/** The props a test may override; the rest take the defaults below. */
interface PanelOptions {
  readonly holdsPlayedNote?: boolean
  readonly playedNotesShown?: boolean
  readonly noRoom?: boolean
  readonly exportFile?: (request: ExportRequest) => Promise<void>
  readonly exportPlayedNotes?: () => Promise<void>
}

const mounted: VueWrapper[] = []

/** Intent: mount the panel of a session holding played notes, attached so focus can be checked. */
function mountPanel(options: PanelOptions = {}) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records: recordedRecords(),
      instrumentName: 'B-flat tenor saxophone',
      presetLabel: 'Neutral',
      lengthSeconds: 240,
      startedAt: 0,
      mostRecent: true,
      keeping: 'not-pinned',
      viewport: { layout: 'one-system', heightBudgetPx: null },
      noRoom: options.noRoom ?? false,
      format: 'musicxml',
      backingTrack: false,
      exportFile: options.exportFile ?? (() => Promise.resolve()),
      holdsPlayedNote: options.holdsPlayedNote ?? true,
      playedNotesShown: options.playedNotesShown ?? false,
      exportPlayedNotes: options.exportPlayedNotes ?? (() => Promise.resolve()),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      includeVeryShortNotes: false,
      ...SESSION_TOOL_PROPS,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** A promise the test settles by hand. */
interface Deferred {
  readonly promise: Promise<void>
  readonly resolve: () => void
  readonly reject: (error: unknown) => void
}

/** Intent: a promise with its settle functions exposed. */
function deferred(): Deferred {
  let resolve: () => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

/** Intent: the `Export generated notes` button, inside the generated-notes group. */
function generatedButton(wrapper: VueWrapper) {
  return wrapper.get<HTMLButtonElement>('.review-export > button.review-export-action')
}

/** Intent: the `Export played notes` button, in the played-notes group. */
function playedButton(wrapper: VueWrapper) {
  return wrapper.get<HTMLButtonElement>('.review-export-played > button.review-export-action')
}

/** Intent: the `Played notes` switch. */
function playedNotesSwitch(wrapper: VueWrapper) {
  return wrapper.get<HTMLButtonElement>('.review-view > button.toggle-button')
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

// @test-link [[req_played_notes_export]]
describe('the played-notes export', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_review_played_notes_toggle]]
  it('renders neither the button nor the switch when the session holds no played note', () => {
    const wrapper = mountPanel({ holdsPlayedNote: false })

    expect(wrapper.findAll('.review-export-action').map((button) => button.text())).toEqual([
      'Export generated notes',
    ])
    expect(wrapper.find('.review-view').exists()).toBe(false)
    expect(wrapper.find('.review-actions > .review-export').exists()).toBe(true)
  })

  // @test-link [[req_played_notes_export]]
  it('is a secondary button in a group of its own after the generated-notes group', () => {
    const wrapper = mountPanel()
    const actions = wrapper.get('.review-actions').element.children

    expect([...actions].map((child) => child.className)).toEqual([
      'field-group review-scope',
      'review-export',
      'review-export-played',
    ])
    const button = playedButton(wrapper)
    expect(button.text()).toBe('Export played notes')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).not.toContain('btn-primary')
    expect(
      wrapper
        .get('.review-export')
        .findAll('.review-export-action')
        .map((b) => b.text()),
    ).toEqual(['Export generated notes'])
  })

  // @test-link [[req_played_notes_export]]
  it('builds the played-notes file once, loading and disabled meanwhile, focus coming back', async () => {
    const build = deferred()
    const exportFile = vi.fn(() => Promise.resolve())
    const exportPlayedNotes = vi.fn(() => build.promise)
    const wrapper = mountPanel({ exportFile, exportPlayedNotes })
    const button = playedButton(wrapper)
    button.element.focus()

    await button.trigger('click')
    await button.trigger('click')
    expect(button.classes()).toContain('is-loading')
    expect(button.attributes('disabled')).toBeDefined()

    build.resolve()
    await flushPromises()
    expect(exportPlayedNotes).toHaveBeenCalledTimes(1)
    expect(exportPlayedNotes).toHaveBeenCalledWith()
    expect(exportFile).not.toHaveBeenCalled()
    expect(button.classes()).not.toContain('is-loading')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(document.activeElement).toBe(button.element)
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  it('runs independently of the generated-notes export: either stays live while the other builds', async () => {
    const generated = deferred()
    const played = deferred()
    const exportFile = vi.fn(() => generated.promise)
    const exportPlayedNotes = vi.fn(() => played.promise)
    const wrapper = mountPanel({ exportFile, exportPlayedNotes })

    await generatedButton(wrapper).trigger('click')
    expect(generatedButton(wrapper).attributes('disabled')).toBeDefined()
    expect(playedButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(playedButton(wrapper).classes()).not.toContain('is-loading')

    await playedButton(wrapper).trigger('click')
    expect(playedButton(wrapper).classes()).toContain('is-loading')
    generated.resolve()
    await flushPromises()
    expect(generatedButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(playedButton(wrapper).attributes('disabled')).toBeDefined()

    played.resolve()
    await flushPromises()
    expect(playedButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(exportFile).toHaveBeenCalledTimes(1)
    expect(exportPlayedNotes).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_played_notes_export]]
  it("shares the one export error: either export's failure shows it, either's next start removes it", async () => {
    const played = deferred()
    const exportFile = vi.fn<(request: ExportRequest) => Promise<void>>(() =>
      Promise.reject(new Error('the encoder failed')),
    )
    const exportPlayedNotes = vi.fn(() => played.promise)
    const wrapper = mountPanel({ exportFile, exportPlayedNotes })

    await generatedButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.review-export-error')).toHaveLength(1)

    await playedButton(wrapper).trigger('click')
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
    played.reject(new Error('the played-notes encoder failed'))
    await flushPromises()
    const error = wrapper.get('.review-panel > p.inline-alert.alert-error.review-export-error')
    expect(error.text()).toBe("The file couldn't be made. Try again.")
    expect(document.activeElement).not.toBe(error.element)

    exportFile.mockImplementationOnce(() => Promise.resolve())
    await generatedButton(wrapper).trigger('click')
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
    await flushPromises()
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
  })
})

// @test-link [[rule_review_played_notes_toggle]]
describe('the Played notes switch', () => {
  // @test-link [[rule_review_played_notes_toggle]]
  it('is a pressed-state toggle named "Played notes", off, with no aria-controls, on a row after the error', async () => {
    const wrapper = mountPanel({ exportPlayedNotes: () => Promise.reject(new Error('failed')) })
    await playedButton(wrapper).trigger('click')
    await flushPromises()

    const rows = wrapper.get('.review-panel').element.children
    expect([...rows].map((child) => child.className)).toEqual([
      'review-nav',
      'review-header',
      'review-comment',
      'review-actions',
      'inline-alert alert-error review-export-error',
      'review-view',
      'review-list',
    ])
    const toggle = playedNotesSwitch(wrapper)
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.classes()).toEqual(['btn', 'toggle-button'])
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBeUndefined()
    expect(toggle.text()).toBe('Played notes off')
    const state = toggle.get('.toggle-button-state')
    expect(state.attributes('aria-hidden')).toBe('true')
    expect(state.text()).toBe('off')
  })

  // @test-link [[rule_review_played_notes_toggle]]
  it('asks the page to flip it, focus staying on it, and shows the state it is given', async () => {
    const wrapper = mountPanel()
    const toggle = playedNotesSwitch(wrapper)
    toggle.element.focus()

    await toggle.trigger('click')
    expect(wrapper.emitted('update:playedNotesShown')).toEqual([[true]])
    expect(document.activeElement).toBe(toggle.element)

    await wrapper.setProps({ playedNotesShown: true })
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.get('.toggle-button-state').text()).toBe('on')
    await toggle.trigger('click')
    expect(wrapper.emitted('update:playedNotesShown')).toEqual([[true], [false]])
    expect(document.activeElement).toBe(toggle.element)
  })

  // @test-link [[rule_review_played_notes_toggle]]
  it('stays, with its state, while the room notice stands in for the list', () => {
    const wrapper = mountPanel({ noRoom: true, playedNotesShown: true })

    expect(wrapper.find('.review-list').exists()).toBe(false)
    expect(playedNotesSwitch(wrapper).attributes('aria-pressed')).toBe('true')
    expect(playedButton(wrapper).text()).toBe('Export played notes')
  })
})
