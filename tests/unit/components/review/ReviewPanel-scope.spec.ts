/**
 * The Review panel's export scope: `review-scope` opens the export row, a field group labelled
 * "Export" with `Whole session` and `Favorites only`; without a favorite, `Favorites only` is
 * disabled and named by its note; picking it asks the page; the generated-notes export's request
 * carries the scope; and `Export played notes` says, in its note, the reason the page gives for a
 * file that would hold no note, the favorites-only reasons included. In a Jam whose code could not
 * load, both exports are disabled, each named by the failure sentence, the other controls live.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import type {
  ExportRequest,
  GeneratedNotesUnavailable,
  PlayedNotesUnavailable,
  ReviewExportScope,
} from '@/components/review/review-types'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const mounted: VueWrapper[] = []

/** The props a test may set. */
interface PanelOptions {
  readonly favorites?: readonly number[]
  readonly scope?: ReviewExportScope
  readonly playedNotesUnavailable?: PlayedNotesUnavailable | null
  readonly generatedNotesUnavailable?: GeneratedNotesUnavailable | null
  readonly exportFile?: (request: ExportRequest) => Promise<void>
}

/** Intent: mount the panel of the recorded session, which holds played notes. */
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
      noRoom: false,
      format: 'midi',
      backingTrack: true,
      exportFile: options.exportFile ?? (() => Promise.resolve()),
      holdsPlayedNote: true,
      playedNotesShown: false,
      exportPlayedNotes: () => Promise.resolve(),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      includeVeryShortNotes: false,
      ...SESSION_TOOL_PROPS,
      favorites: options.favorites ?? [],
      scope: options.scope ?? 'wholeSession',
      playedNotesUnavailable: options.playedNotesUnavailable ?? null,
      generatedNotesUnavailable: options.generatedNotesUnavailable ?? null,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: the scope's parts: its group, label, radiogroup and segments. */
function scopeParts(wrapper: VueWrapper) {
  const group = wrapper.get('.review-scope')
  const segments = group.findAll('[role="radio"]')
  return {
    group,
    label: group.get('.field-label'),
    radiogroup: group.get('[role="radiogroup"]'),
    whole: segments[0]!,
    favorites: segments[1]!,
  }
}

/** Intent: the played-notes export's button, and its note when rendered. */
function playedExport(wrapper: VueWrapper) {
  const group = wrapper.get('.review-export-played')
  return { button: group.findAll('button')[1]!, note: group.find('.field-note') }
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

// @test-link [[rule_favorites_only_export]]
describe('the export scope', () => {
  // @test-link [[rule_favorites_only_export]]
  it('opens the export row: "Export", Whole session checked, Favorites only disabled with why', () => {
    const wrapper = mountPanel()
    const { group, label, radiogroup, whole, favorites } = scopeParts(wrapper)

    expect(wrapper.get('.review-actions').element.firstElementChild).toBe(group.element)
    expect(group.classes()).toContain('field-group')
    expect(label.text()).toBe('Export')
    expect(radiogroup.attributes('aria-label')).toBe('Export')
    expect([whole.text(), favorites.text()]).toEqual(['Whole session', 'Favorites only'])
    expect(whole.attributes('aria-checked')).toBe('true')
    expect(favorites.attributes('disabled')).toBeDefined()
    const note = group.get('.field-note')
    expect(note.text()).toBe('No favorites in this session yet.')
    expect(favorites.attributes('aria-describedby')).toBe(note.attributes('id'))
  })

  // @test-link [[rule_favorites_only_export]]
  it('offers Favorites only once a phrase is a favorite, asking the page for it', async () => {
    const wrapper = mountPanel({ favorites: [2] })
    const { group, favorites } = scopeParts(wrapper)

    expect(favorites.attributes('disabled')).toBeUndefined()
    expect(group.find('.field-note').exists()).toBe(false)
    await favorites.trigger('click')
    expect(wrapper.emitted('update:scope')).toEqual([['favoritesOnly']])

    await wrapper.setProps({ scope: 'favoritesOnly' })
    expect(scopeParts(wrapper).favorites.attributes('aria-checked')).toBe('true')
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[req_session_export]]
  it("asks for the generated-notes file under the page's scope", async () => {
    const exportFile = vi.fn<(request: ExportRequest) => Promise<void>>(() => Promise.resolve())
    const wrapper = mountPanel({ favorites: [2], scope: 'favoritesOnly', exportFile })

    await wrapper.get('.review-export .review-export-action').trigger('click')
    await flushPromises()

    expect(exportFile).toHaveBeenCalledExactlyOnceWith({
      format: 'midi',
      backingTrack: true,
      scope: 'favoritesOnly',
    })
  })
})

// @test-link [[rule_favorites_only_export]]
// @test-link [[rule_played_notes_export_omits_stray_notes]]
describe('the played-notes export under the scope', () => {
  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('is disabled with the reason the page gives, changed in place, and enabled with none', async () => {
    const wrapper = mountPanel({
      favorites: [2],
      scope: 'favoritesOnly',
      playedNotesUnavailable: 'noPlayedNoteInFavorites',
    })
    /** Intent: the reason the disabled button is named by. */
    const reasonOf = () => {
      const { button, note } = playedExport(wrapper)
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('aria-describedby')).toBe(note.attributes('id'))
      return note.text()
    }

    expect(reasonOf()).toBe('No played notes in your favorites.')
    await wrapper.setProps({ playedNotesUnavailable: 'everyFavoriteNoteVeryShort' })
    expect(reasonOf()).toBe(
      'Every note you played in your favorites is very short. Turn on Include very short notes ' +
        'to export them.',
    )
    await wrapper.setProps({ scope: 'wholeSession', playedNotesUnavailable: 'everyNoteVeryShort' })
    expect(reasonOf()).toBe(
      'Every note you played is very short. Turn on Include very short notes to export them.',
    )
    await wrapper.setProps({ playedNotesUnavailable: null })
    const { button, note } = playedExport(wrapper)
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-describedby')).toBeUndefined()
    expect(note.exists()).toBe(false)
  })
})

/** The sentence after each export of a Jam whose code could not load. */
const DOODLE_NOT_LOADED =
  "Your doodle can't be shown: part of the app didn't load. Check that you're online, then open " +
  'this session again.'

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
// @test-link [[rule_jam_code_loaded_on_demand]]
describe("the exports in a Jam's Review", () => {
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("names the doodle in the favorites' very-short reason", () => {
    const wrapper = mountPanel({
      favorites: [2],
      scope: 'favoritesOnly',
      playedNotesUnavailable: 'everyFavoriteAndDoodleNoteVeryShort',
    })
    const { button, note } = playedExport(wrapper)

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-describedby')).toBe(note.attributes('id'))
    expect(note.text()).toBe(
      'Every note you played in your favorites and the doodle is very short. Turn on Include ' +
        'very short notes to export them.',
    )
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it("disables both exports when Jam's code could not load, each named by the sentence, the other controls live", async () => {
    const exportFile = vi.fn<(request: ExportRequest) => Promise<void>>(() => Promise.resolve())
    const wrapper = mountPanel({
      favorites: [2],
      playedNotesUnavailable: 'doodleNotLoaded',
      generatedNotesUnavailable: 'doodleNotLoaded',
      exportFile,
    })
    const group = wrapper.get('.review-export')
    const generated = group.get<HTMLButtonElement>('button.review-export-action')
    const generatedNote = group.get('.field-note')

    expect(generated.attributes('disabled')).toBeDefined()
    expect(generatedNote.element.tagName).toBe('P')
    expect(generatedNote.text()).toBe(DOODLE_NOT_LOADED)
    expect(generatedNote.attributes('id')).toBeTruthy()
    expect(generated.attributes('aria-describedby')).toBe(generatedNote.attributes('id'))
    expect(generated.element.nextElementSibling).toBe(generatedNote.element)
    const { button, note } = playedExport(wrapper)
    expect(button.attributes('disabled')).toBeDefined()
    expect(note.text()).toBe(DOODLE_NOT_LOADED)
    expect(button.attributes('aria-describedby')).toBe(note.attributes('id'))
    expect(note.attributes('id')).not.toBe(generatedNote.attributes('id'))

    // Format, Backing track, the scope and Include very short notes stay live.
    for (const radio of group.findAll('[role="radio"]')) {
      expect(radio.attributes('disabled')).toBeUndefined()
    }
    expect(group.get('button.toggle-button').attributes('disabled')).toBeUndefined()
    expect(scopeParts(wrapper).favorites.attributes('disabled')).toBeUndefined()
    expect(
      wrapper.get('.review-export-played button.toggle-button').attributes('disabled'),
    ).toBeUndefined()
    await generated.trigger('click')
    await flushPromises()
    expect(exportFile).not.toHaveBeenCalled()
    expect(wrapper.find('.review-export-error').exists()).toBe(false)

    await wrapper.setProps({ generatedNotesUnavailable: null })
    expect(generated.attributes('disabled')).toBeUndefined()
    expect(generated.attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.find('.review-export .field-note').exists()).toBe(false)
  })
})
