/**
 * The transposition check's one written note: CheckNote hands the engraver the profile's written
 * check note and the instrument's clef, the built-in treble clef unless one is given.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CheckNote from '@/components/controller-connection/CheckNote.vue'
import { checkWrittenNote } from '@/domain/controller-check/transposition-check'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { fakeCheckNoteEngraver, resetFakeCheckNoteEngraver } from './fake-check-note-engraver'

vi.mock('@/notation/vexflow-engraver-loader', () => import('./fake-check-note-engraver'))

beforeEach(() => {
  resetFakeCheckNoteEngraver()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[rule_notation_display_preserves_phrase]]
describe("CheckNote: the check note on the instrument's clef", () => {
  it('draws the written check note in treble clef when given the treble clef', async () => {
    const wrapper = mount(CheckNote, { props: { profile: BB_TENOR_PROFILE, clef: 'treble' } })
    await flushPromises()

    expect(fakeCheckNoteEngraver.engraveCheckNote).toHaveBeenCalledExactlyOnceWith(
      wrapper.get('.check-note').element,
      checkWrittenNote(BB_TENOR_PROFILE),
      'treble',
    )
  })

  it('draws the same written check note in bass clef when given the bass clef', async () => {
    const wrapper = mount(CheckNote, { props: { profile: BB_TENOR_PROFILE, clef: 'bass' } })
    await flushPromises()

    expect(fakeCheckNoteEngraver.engraveCheckNote).toHaveBeenCalledExactlyOnceWith(
      wrapper.get('.check-note').element,
      checkWrittenNote(BB_TENOR_PROFILE),
      'bass',
    )
    expect(wrapper.get('.check-note svg').attributes('data-clef')).toBe('bass')
  })
})
