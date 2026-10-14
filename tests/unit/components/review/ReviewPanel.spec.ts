/**
 * The Review panel's markup, copy and ARIA (its title, the summary with the session date, the keep
 * line in its three wordings, only "Not saved" in the split layout), its Format and Backing track controls, its export
 * button's pending, failure and focus behaviour, its title focus, and the room notice that stands
 * in for the list while the workspace staff has no room. Engraving is covered in
 * ReviewPanel-engraving.spec.ts; here the fake engraver only keeps jsdom away from VexFlow.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import type { ExportRequest, GeneratedNotesFormat } from '@/components/review/review-types'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { SessionHistoryRecord } from '@/session/session-history'
import type { SessionKeeping } from '@/components/workspace/workspace-session-controller-types'
import { sessionDate } from '@/components/review/session-date'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { longHistory, recordedRecords, stubReviewBrowser } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const ONE_SYSTEM: StaffViewport = { layout: 'one-system', heightBudgetPx: null }
const SPLIT: StaffViewport = { layout: 'split', heightBudgetPx: 400 }

/** The session's start: 6 October 2026, 18:42 local time. */
const STARTED_AT = new Date(2026, 9, 6, 18, 42).getTime()

/** The props a test may override; the rest take the defaults below. */
interface PanelOptions {
  readonly records?: readonly SessionHistoryRecord[]
  readonly instrumentName?: string
  readonly startedAt?: number
  readonly mostRecent?: boolean
  readonly keeping?: SessionKeeping
  readonly viewport?: StaffViewport | null
  readonly noRoom?: boolean
  readonly format?: GeneratedNotesFormat
  readonly backingTrack?: boolean
  readonly exportFile?: (request: ExportRequest) => Promise<void>
}

const mounted: VueWrapper[] = []

/** Intent: mount the panel attached to the document, so focus can be checked. */
function mountPanel(options: PanelOptions = {}) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records: options.records ?? recordedRecords(),
      instrumentName: options.instrumentName ?? 'B-flat tenor saxophone',
      startedAt: options.startedAt ?? STARTED_AT,
      mostRecent: options.mostRecent ?? true,
      keeping: options.keeping ?? 'not-pinned',
      viewport: options.viewport === undefined ? ONE_SYSTEM : options.viewport,
      noRoom: options.noRoom ?? false,
      format: options.format ?? 'musicxml',
      backingTrack: options.backingTrack ?? false,
      exportFile: options.exportFile ?? (() => Promise.resolve()),
      // The played-notes tools and lanes are covered in ReviewPanel-played-notes.spec.ts and
      // ReviewPhrase-played-notes.spec.ts; here they are not rendered.
      holdsPlayedNote: false,
      playedNotesShown: false,
      exportPlayedNotes: () => Promise.resolve(),
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

/** Intent: the export button. */
function exportButton(wrapper: VueWrapper): HTMLButtonElement {
  return wrapper.get<HTMLButtonElement>('.review-export-action').element
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

// @test-link [[req_last_session_review]]
describe('the review panel markup', () => {
  // @test-link [[req_last_session_review]]
  it('is a section labelled by its "Last session" title, which is focusable but not tabbable', () => {
    const wrapper = mountPanel()
    const panel = wrapper.get('section.review-panel')
    const title = wrapper.get('h2.review-title')

    expect(title.text()).toBe('Last session')
    expect(title.attributes('tabindex')).toBe('-1')
    expect(title.attributes('id')).toBeTruthy()
    expect(panel.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(wrapper.get('.review-header > .review-heading > .review-title').element).toBe(
      title.element,
    )
  })

  // @test-link [[req_last_session_review]]
  // @test-link [[req_kept_session_review]]
  it('titles the most recent session "Last session" and sums it up from its date', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.review-title').text()).toBe('Last session')
    expect(wrapper.get('p.review-summary').text()).toBe(
      `${sessionDate(STARTED_AT)} · 3 phrases · B-flat tenor saxophone`,
    )
  })

  // @test-link [[req_kept_session_review]]
  it('titles any other session with its date, left out of the summary', () => {
    const wrapper = mountPanel({ mostRecent: false })
    expect(wrapper.get('.review-title').text()).toBe(sessionDate(STARTED_AT))
    expect(wrapper.get('p.review-summary').text()).toBe('3 phrases · B-flat tenor saxophone')
  })

  // @test-link [[req_last_session_review]]
  it('says "1 phrase" for a one-phrase session', () => {
    const wrapper = mountPanel({ records: recordedRecords().slice(0, 1), instrumentName: 'Piano' })
    expect(wrapper.get('.review-summary').text()).toBe(
      `${sessionDate(STARTED_AT)} · 1 phrase · Piano`,
    )
  })

  // @test-link [[module_kept_session_save]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('says how the session is kept in the keep line, under the summary', () => {
    const lines = (['pinned', 'not-pinned', 'not-saved'] as const).map((keeping) =>
      mountPanel({ keeping }).get('.review-heading > .review-summary + p.review-keep-line').text(),
    )

    expect(lines).toEqual([
      'Pinned: kept until you unpin or delete it.',
      'Not pinned: deleted when your next session is saved.',
      'Not saved on this device: export it to keep it.',
    ])
  })

  // @test-link [[module_kept_session_save]]
  it('keeps only the "Not saved" keep line in the split layout', () => {
    expect(
      mountPanel({ viewport: SPLIT, keeping: 'pinned' }).find('.review-keep-line').exists(),
    ).toBe(false)
    expect(
      mountPanel({ viewport: SPLIT, keeping: 'not-pinned' }).find('.review-keep-line').exists(),
    ).toBe(false)
    expect(
      mountPanel({ viewport: SPLIT, keeping: 'not-saved' }).get('.review-keep-line').text(),
    ).toBe('Not saved on this device: export it to keep it.')
  })

  // @test-link [[req_last_session_review]]
  it('lists every phrase in order, numbered with its session number and its tempo', () => {
    const wrapper = mountPanel()
    const items = wrapper.findAll('ol.review-list > li.review-phrase')

    expect(items).toHaveLength(3)
    expect(items.map((item) => item.get('h3.review-phrase-title').text())).toEqual([
      'Phrase 1',
      'Phrase 2',
      'Phrase 3',
    ])
    expect(
      items.map((item) => item.get('.review-phrase-header .review-phrase-tempo').text()),
    ).toEqual(['240 BPM', '240 BPM', '240 BPM'])
    items.forEach((item) => expect(item.find('.review-staff').exists()).toBe(true))
  })

  // @test-link [[req_last_session_review]]
  it('holds nothing focusable in the list', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.review-list').findAll('button, a, input, [tabindex]')).toHaveLength(0)
  })

  // @test-link [[req_last_session_review]]
  it('shows the room notice in place of the list while the staff has no room, and the list back after', async () => {
    const wrapper = mountPanel({ noRoom: true })
    const notice = wrapper.get('.review-panel > p.room-notice')

    expect(wrapper.find('.review-list').exists()).toBe(false)
    expect(notice.attributes('tabindex')).toBeUndefined()
    expect(notice.get('.room-notice-wide').text()).toBe(
      'The staff needs more room. Make the window larger.',
    )
    expect(notice.get('.room-notice-narrow').text()).toBe(
      'This screen is too small to show the staff.',
    )
    expect(wrapper.find('.review-export').exists()).toBe(true)

    await wrapper.setProps({ noRoom: false })
    expect(wrapper.find('.room-notice').exists()).toBe(false)
    expect(wrapper.findAll('.review-list > .review-phrase')).toHaveLength(3)
  })

  // @test-link [[req_last_session_review]]
  it('focuses its title on request', () => {
    const wrapper = mountPanel()
    ;(wrapper.vm as unknown as { focusTitle: () => void }).focusTitle()
    expect(document.activeElement).toBe(wrapper.get('.review-title').element)
  })

  // @test-link [[req_last_session_review]]
  it('renders a list of 2 000 phrases, one item each', () => {
    const wrapper = mountPanel({ records: longHistory(2000) })
    expect(wrapper.findAll('.review-list > .review-phrase')).toHaveLength(2000)
    expect(wrapper.get('.review-summary').text()).toMatch(/ · 2000 phrases · /u)
  })
})

// @test-link [[req_session_export]]
describe('the review export controls', () => {
  // @test-link [[req_session_export]]
  it('is a group named "Export generated notes" with Format, then the secondary export button', () => {
    const wrapper = mountPanel()
    const group = wrapper.get('.review-actions > .review-export')

    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBe('Export generated notes')
    const field = group.get('.field-group')
    expect(field.get('.field-label').text()).toBe('Format')
    const radios = field.findAll('.segmented-control[role="radiogroup"] [role="radio"]')
    expect(radios.map((radio) => radio.text())).toEqual(['MusicXML', 'MIDI'])
    expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual(['true', 'false'])
    expect(radios.map((radio) => radio.attributes('tabindex'))).toEqual(['0', '-1'])
    const button = group.get('button.btn.review-export-action')
    expect(button.text()).toBe('Export generated notes')
    expect(button.classes()).not.toContain('btn-primary')
    expect(group.find('.toggle-button').exists()).toBe(false)
  })

  // @test-link [[req_session_export]]
  it('asks for the other format when one is picked', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    expect(wrapper.emitted('update:format')).toEqual([['midi']])
  })

  // @test-link [[req_session_export]]
  it('shows the Backing track toggle only while MIDI is the format', async () => {
    const wrapper = mountPanel({ format: 'midi', backingTrack: false })
    const toggle = wrapper.get('.review-export > button.btn.toggle-button')

    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.text()).toBe('Backing track off')
    const state = toggle.get('.toggle-button-state')
    expect(state.attributes('aria-hidden')).toBe('true')
    expect(state.text()).toBe('off')
    await toggle.trigger('click')
    expect(wrapper.emitted('update:backingTrack')).toEqual([[true]])

    await wrapper.setProps({ backingTrack: true })
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.get('.toggle-button-state').text()).toBe('on')

    await wrapper.setProps({ format: 'musicxml' })
    expect(wrapper.find('.toggle-button').exists()).toBe(false)
  })

  // @test-link [[req_session_export]]
  it('exports with the chosen format, the backing track applying to MIDI only', async () => {
    const exportFile = vi.fn<(request: ExportRequest) => Promise<void>>(() => Promise.resolve())
    const wrapper = mountPanel({ format: 'midi', backingTrack: true, exportFile })
    await wrapper.get('.review-export-action').trigger('click')
    await flushPromises()
    await wrapper.setProps({ format: 'musicxml' })
    await wrapper.get('.review-export-action').trigger('click')
    await flushPromises()

    expect(exportFile.mock.calls).toEqual([
      [{ format: 'midi', backingTrack: true }],
      [{ format: 'musicxml', backingTrack: false }],
    ])
  })

  // @test-link [[req_session_export]]
  it('marks the button loading and disabled while the file is built, Format staying live', async () => {
    const build = deferred()
    const wrapper = mountPanel({ exportFile: () => build.promise })
    await wrapper.get('.review-export-action').trigger('click')

    const button = wrapper.get('.review-export-action')
    expect(button.classes()).toContain('is-loading')
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    expect(wrapper.emitted('update:format')).toEqual([['midi']])

    build.resolve()
    await flushPromises()
    expect(button.classes()).not.toContain('is-loading')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
  })

  // @test-link [[req_session_export]]
  it('shows a static error after a failed export, and removes it when the next export starts', async () => {
    const first = deferred()
    const second = deferred()
    const builds = [first, second]
    const wrapper = mountPanel({ exportFile: () => builds.shift()!.promise })
    await wrapper.get('.review-export-action').trigger('click')
    first.reject(new Error('the encoder failed'))
    await flushPromises()

    const error = wrapper.get('.review-header > p.inline-alert.alert-error.review-export-error')
    expect(error.text()).toBe("The file couldn't be made. Try again.")
    expect(error.attributes('role')).toBeUndefined()
    expect(error.attributes('aria-live')).toBeUndefined()
    expect(document.activeElement).not.toBe(error.element)

    await wrapper.get('.review-export-action').trigger('click')
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
    second.resolve()
    await flushPromises()
    expect(wrapper.find('.review-export-error').exists()).toBe(false)
  })

  // @test-link [[req_session_export]]
  it('gives focus back to the button when the export ends, also when it fell to the page', async () => {
    const build = deferred()
    const wrapper = mountPanel({ exportFile: () => build.promise })
    const button = exportButton(wrapper)
    button.focus()
    await wrapper.get('.review-export-action').trigger('click')
    // A browser drops focus from a button that becomes disabled; jsdom keeps it, so focus is
    // dropped to the page here by removing a focused element.
    const elsewhere = document.body.appendChild(document.createElement('input'))
    elsewhere.focus()
    elsewhere.remove()
    expect(document.activeElement).toBe(document.body)

    build.reject(new Error('no download'))
    await flushPromises()
    expect(document.activeElement).toBe(button)
  })

  // @test-link [[req_session_export]]
  it('leaves focus where the player moved it while the file was built', async () => {
    const build = deferred()
    const wrapper = mountPanel({ exportFile: () => build.promise })
    exportButton(wrapper).focus()
    await wrapper.get('.review-export-action').trigger('click')
    const midi = wrapper.findAll<HTMLButtonElement>('[role="radio"]')[1]!.element
    midi.focus()

    build.resolve()
    await flushPromises()
    expect(document.activeElement).toBe(midi)
  })
})
