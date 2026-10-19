/**
 * The Review panel and very short notes: the lanes' session-wide pitch scale is made from the
 * notes the lanes show, so a very short note never widens it, and a session whose every played
 * note is very short has no scale while it keeps its played-notes tools. In the played-notes
 * export's group, `Include very short notes` (a pressed-state toggle, before the button) asks the
 * page to flip it, focus staying on it; `Export played notes` is disabled, named by its
 * `field-note`'s reason, whenever its file would hold no note, and enabled at once when it would.
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReviewPanel from '@/components/review/ReviewPanel.vue'
import ReviewPhrase from '@/components/review/ReviewPhrase.vue'
import type { PlayedNotesUnavailable } from '@/components/review/review-types'
import { playedNotesPitchScale } from '@/components/review/played-notes-lane-geometry'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import { resetFakePhraseEngraver } from '../notation/fake-phrase-engraver'
import { recordedRecords, stubReviewBrowser, SESSION_TOOL_PROPS } from './review-fixtures'

vi.mock('@/notation/vexflow-engraver-loader', () => import('../notation/fake-phrase-engraver'))

const mounted: VueWrapper[] = []

/** The props a test may set beyond the records. */
interface PanelOptions {
  readonly includeVeryShortNotes?: boolean
  readonly playedNotesUnavailable?: PlayedNotesUnavailable | null
  readonly exportPlayedNotes?: () => Promise<void>
}

/** Intent: mount the panel of `records`, a session holding played notes, its lanes on. */
function mountPanel(records: readonly SessionHistoryRecord[], options: PanelOptions = {}) {
  const wrapper = mount(ReviewPanel, {
    props: {
      records,
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
      holdsPlayedNote: true,
      playedNotesShown: true,
      exportPlayedNotes: options.exportPlayedNotes ?? (() => Promise.resolve()),
      keepPlayedNotes: false,
      canDeletePlayedNotes: false,
      includeVeryShortNotes: options.includeVeryShortNotes ?? false,
      ...SESSION_TOOL_PROPS,
      playedNotesUnavailable: options.playedNotesUnavailable ?? null,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

/** Intent: a played note of `pitch` from `onsetAt`, lasting `seconds`. */
function played(pitch: number, onsetAt: number, seconds: number): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity: 127, onsetAt, releaseAt: onsetAt + seconds }
}

/** Intent: the recorded session with `extra(record)` added to each phrase's played notes. */
function withPlayedNotes(
  extra: (record: SessionHistoryRecord) => readonly RecordedPlayedNote[],
  keep = true,
): SessionHistoryRecord[] {
  return recordedRecords().map((record) => ({
    ...record,
    playedNotes: [...(keep ? record.playedNotes : []), ...extra(record)],
  }))
}

/** Intent: the pitch scale each phrase of the panel is given. */
function phraseScales(wrapper: VueWrapper) {
  return wrapper.findAllComponents(ReviewPhrase).map((phrase) => phrase.props('pitchScale'))
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

// @test-link [[rule_stray_notes_filtered_on_reading]]
// @test-link [[module_review_played_notes_lane]]
describe("the lanes' pitch scale and very short notes", () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('leaves out very short notes: a highest note that is very short scales the lanes as without it', () => {
    const plain = recordedRecords()
    const records = withPlayedNotes((record) =>
      record.phraseNumber === 1 ? [played(84, record.startedAt + 0.5, 0.012)] : [],
    )
    const without = playedNotesPitchScale(plain)

    const wrapper = mountPanel(records)

    expect(without).not.toBeNull()
    expect(playedNotesPitchScale(records)).not.toEqual(without)
    expect(phraseScales(wrapper)).toEqual(plain.map(() => without))
  })

  // @test-link [[rule_stray_notes_filtered_on_reading]]
  // @test-link [[module_review_played_notes_lane]]
  it('has no scale when every played note is very short, the played-notes tools still shown', () => {
    const records = withPlayedNotes((record) => [played(55, record.startedAt + 0.5, 0.005)], false)

    const wrapper = mountPanel(records)

    expect(phraseScales(wrapper)).toEqual(records.map(() => null))
    expect(wrapper.find('.review-view').exists()).toBe(true)
    expect(wrapper.findAll('.review-export-action').map((button) => button.text())).toEqual([
      'Export generated notes',
      'Export played notes',
    ])
  })
})

/** The reason `Export played notes` is disabled while every played note is very short. */
const EVERY_NOTE_VERY_SHORT =
  'Every note you played is very short. Turn on Include very short notes to export them.'

/** Intent: the played-notes export's group, and its toggle, button and note. */
function playedExport(wrapper: VueWrapper) {
  const group = wrapper.get('.review-actions > .review-export-played')
  return {
    group,
    toggle: group.get<HTMLButtonElement>('button.toggle-button'),
    button: group.get<HTMLButtonElement>('button.review-export-action'),
    note: group.find('.field-note'),
  }
}

// @test-link [[rule_played_notes_export_omits_stray_notes]]
// @test-link [[req_played_notes_export]]
describe('Include very short notes and Export played notes', () => {
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('is a pressed-state toggle, off, before the button, in the group named "Export played notes"', () => {
    const { group, toggle, button, note } = playedExport(mountPanel(recordedRecords()))

    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBe('Export played notes')
    expect([...group.element.children]).toEqual([toggle.element, button.element])
    expect(toggle.attributes('type')).toBe('button')
    expect(toggle.classes()).toEqual(['btn', 'toggle-button'])
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.text()).toBe('Include very short notes off')
    expect(toggle.get('.toggle-button-state').attributes('aria-hidden')).toBe('true')
    expect(button.text()).toBe('Export played notes')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-describedby')).toBeUndefined()
    expect(note.exists()).toBe(false)
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('asks the page to flip it, focus staying on it, and shows the state it is given', async () => {
    const wrapper = mountPanel(recordedRecords())
    const { toggle } = playedExport(wrapper)
    toggle.element.focus()

    await toggle.trigger('click')
    expect(wrapper.emitted('update:includeVeryShortNotes')).toEqual([[true]])
    expect(document.activeElement).toBe(toggle.element)

    await wrapper.setProps({ includeVeryShortNotes: true })
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(toggle.get('.toggle-button-state').text()).toBe('on')
    await toggle.trigger('click')
    expect(wrapper.emitted('update:includeVeryShortNotes')).toEqual([[true], [false]])
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  // @test-link [[req_played_notes_export]]
  it('disables Export played notes, with its reason, while its file would hold no note, and enables it at once when it would', async () => {
    const exportPlayedNotes = vi.fn(() => Promise.resolve())
    const wrapper = mountPanel(recordedRecords(), {
      playedNotesUnavailable: 'everyNoteVeryShort',
      exportPlayedNotes,
    })
    const { toggle, button, note, group } = playedExport(wrapper)

    expect(button.attributes('disabled')).toBeDefined()
    expect(note.exists()).toBe(true)
    expect(note.element.tagName).toBe('P')
    expect(note.text()).toBe(EVERY_NOTE_VERY_SHORT)
    expect(note.attributes('id')).toBeTruthy()
    expect(button.attributes('aria-describedby')).toBe(note.attributes('id'))
    expect([...group.element.children]).toEqual([toggle.element, button.element, note.element])
    expect(toggle.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    await flushPromises()
    expect(exportPlayedNotes).not.toHaveBeenCalled()
    expect(wrapper.find('.review-export-error').exists()).toBe(false)

    toggle.element.focus()
    await toggle.trigger('click')
    await wrapper.setProps({ includeVeryShortNotes: true, playedNotesUnavailable: null })
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-describedby')).toBeUndefined()
    expect(group.find('.field-note').exists()).toBe(false)
    expect(document.activeElement).toBe(toggle.element)
    await button.trigger('click')
    await flushPromises()
    expect(exportPlayedNotes).toHaveBeenCalledTimes(1)
  })
})
