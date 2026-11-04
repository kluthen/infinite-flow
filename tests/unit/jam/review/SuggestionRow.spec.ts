/**
 * The key and mode suggestion in a Jam's review (`suggestion-row`, master spec C6.3 to C6.5; the
 * review's handoff, Components and Content, Focus and Keyboard): worked out from the quantized
 * doodle against Jam's key and mode, in each of its forms. Offering: "Your doodle sounds like
 * {answer}.", then `Jam in {answer}` and `Keep {key} {mode}`, neither primary, the answer in the
 * player's family (under Major an Ionian answer reads "Major") and both keys as the Written key
 * control labels them; `Keep` following a change of Jam's key in place, the row leaving when Jam's
 * key and mode become a close answer. Set: after `Jam in {answer}`, one sentence that takes focus
 * and no button, until Jam's key or mode is changed again. No fit: one sentence naming no note.
 * Absent: too little material, or declined. Its buttons leaving under focus, not by a press of
 * theirs, hands focus back.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import {
  C_KEYBOARD_PROFILE,
  findBuiltInInstrumentProfile,
} from '@/domain/profile/instrument-profiles'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'
import SuggestionRow from '@/jam/review/SuggestionRow.vue'

import {
  beatsDoodle,
  WORKED_EXAMPLE,
  type BeatNote,
} from '../key-suggestion/key-suggestion-doodles'

/** A doodle plainly in G major: G A B C D E F-sharp G, the last G held two beats. */
const G_MAJOR: readonly BeatNote[] = [
  [67, 1],
  [69, 0.5],
  [71, 0.5],
  [72, 1],
  [74, 1],
  [76, 0.5],
  [78, 0.5],
  [79, 2],
]

/** A chromatic run C to G, a beat each: no mode holds 80 % of it. */
const CHROMATIC: readonly BeatNote[] = [60, 61, 62, 63, 64, 65, 66, 67].map((pitch): BeatNote => [
  pitch,
  1,
])

/** Three notes: too little to go on. */
const TOO_SHORT: readonly BeatNote[] = [
  [60, 1],
  [62, 1],
  [64, 1],
]

const C_MAJOR: JamKeyAndMode = { tonalCenter: 'C', collection: 'Major' }

const TENOR = findBuiltInInstrumentProfile('bb-tenor')!

const mounted: VueWrapper[] = []

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

/** The props a test may set; the rest take the defaults: G major, Jam in C Major, the keyboard. */
interface RowOptions {
  readonly doodle?: QuantizedDoodle
  readonly jam?: JamKeyAndMode
  readonly instrument?: typeof C_KEYBOARD_PROFILE
  readonly declined?: boolean
}

/** Intent: mount the row attached to the document, so focus can be checked. */
function mountRow(options: RowOptions = {}) {
  const wrapper = mount(SuggestionRow, {
    props: {
      doodle: options.doodle ?? beatsDoodle(G_MAJOR),
      jam: options.jam ?? C_MAJOR,
      instrument: options.instrument ?? C_KEYBOARD_PROFILE,
      declined: options.declined ?? false,
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  return wrapper
}

type Wrapper = ReturnType<typeof mountRow>

/** Intent: the row's sentence and its buttons' words, or null when the row is absent. */
function rowText(wrapper: Wrapper): { sentence: string; buttons: string[] } | null {
  const row = wrapper.find('.suggestion-row')
  if (!row.exists()) return null
  return {
    sentence: row.get(':scope > p').text(),
    buttons: row.findAll(':scope > button').map((button) => button.text()),
  }
}

// @test-link [[req_key_and_mode_suggestion]]
describe('the suggestion row: offering', () => {
  // @test-link [[rule_suggestion_named_in_players_family]]
  it('names the answer, then Jam in it and Keep Jam’s key and mode; an Ionian answer reads Major under Major', () => {
    const wrapper = mountRow()

    expect(rowText(wrapper)).toEqual({
      sentence: 'Your doodle sounds like G Major.',
      buttons: ['Jam in G Major', 'Keep C Major'],
    })
    const buttons = wrapper.findAll('.suggestion-row > button')
    expect(buttons.every((button) => button.classes().join(' ') === 'btn')).toBe(true)
    expect(buttons.every((button) => button.attributes('type') === 'button')).toBe(true)
  })

  // @test-link [[rule_suggestion_named_in_players_family]]
  it('names every answer as its mode while Jam’s Collection is a mode', () => {
    const wrapper = mountRow({ jam: { tonalCenter: 'C', collection: 'Dorian' } })

    expect(rowText(wrapper)).toEqual({
      sentence: 'Your doodle sounds like G Ionian.',
      buttons: ['Jam in G Ionian', 'Keep C Dorian'],
    })
  })

  // @test-link [[rule_suggestion_named_in_players_family]]
  it('names both keys in written pitch, as the Written key control labels them', () => {
    const wrapper = mountRow({ instrument: TENOR, jam: { tonalCenter: 'C#', collection: 'Major' } })

    expect(rowText(wrapper)).toEqual({
      sentence: 'Your doodle sounds like A Major.',
      buttons: ['Jam in A Major', 'Keep C-sharp/D-flat Major'],
    })
  })

  // @test-link [[rule_suggestion_shown_after_jam_only]]
  it('follows a change of Jam’s key in place, and leaves when Jam’s key and mode fit the doodle', async () => {
    const wrapper = mountRow()

    await wrapper.setProps({ jam: { tonalCenter: 'F', collection: 'Major' } })
    expect(rowText(wrapper)?.buttons).toEqual(['Jam in G Major', 'Keep F Major'])

    await wrapper.setProps({ jam: { tonalCenter: 'G', collection: 'Major' } })
    expect(rowText(wrapper)).toBeNull()
  })
})

// @test-link [[rule_suggestion_use_it]]
describe('the suggestion row: Jam in {answer}', () => {
  // @test-link [[rule_suggestion_use_it]]
  it('asks for the answer, then says it is set, focused, with no button, once Jam takes it', async () => {
    const wrapper = mountRow({ doodle: beatsDoodle(WORKED_EXAMPLE) })
    expect(rowText(wrapper)?.buttons[0]).toBe('Jam in D Minor')

    await wrapper.get('.suggestion-row > button').trigger('click')
    expect(wrapper.emitted('use')).toEqual([[{ tonalCenter: 'D', collection: 'Minor' }]])

    await wrapper.setProps({ jam: { tonalCenter: 'D', collection: 'Minor' } })
    await nextTick()
    expect(rowText(wrapper)).toEqual({ sentence: 'Jams now play in D Minor.', buttons: [] })
    const sentence = wrapper.get('.suggestion-row > p')
    expect(sentence.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(sentence.element)
    expect(wrapper.emitted('focus-lost')).toBeUndefined()
  })

  // @test-link [[rule_suggestion_use_it]]
  it('leaves once Jam’s key or mode is changed again', async () => {
    const wrapper = mountRow()
    await wrapper.get('.suggestion-row > button').trigger('click')
    await wrapper.setProps({ jam: { tonalCenter: 'G', collection: 'Major' } })
    expect(rowText(wrapper)?.sentence).toBe('Jams now play in G Major.')

    await wrapper.setProps({ jam: { tonalCenter: 'A', collection: 'Major' } })
    expect(rowText(wrapper)).toBeNull()
  })
})

// @test-link [[rule_suggestion_keep_mine]]
describe('the suggestion row: Keep {key} {mode}', () => {
  // @test-link [[rule_suggestion_keep_mine]]
  it('asks to decline, and is absent once declined', async () => {
    const wrapper = mountRow()

    await wrapper.findAll('.suggestion-row > button')[1]!.trigger('click')
    expect(wrapper.emitted('keep')).toEqual([[]])
    expect(wrapper.emitted('use')).toBeUndefined()

    await wrapper.setProps({ declined: true })
    expect(rowText(wrapper)).toBeNull()
  })

  // @test-link [[rule_suggestion_keep_mine]]
  it('is absent for a doodle whose suggestion was declined', () => {
    expect(rowText(mountRow({ declined: true }))).toBeNull()
  })
})

// @test-link [[rule_doodle_outside_modes_told]]
describe('the suggestion row: no fit and nothing', () => {
  // @test-link [[rule_doodle_outside_modes_told]]
  it('says no key is suggested, in one sentence naming no note, with no button', () => {
    const wrapper = mountRow({ doodle: beatsDoodle(CHROMATIC) })

    expect(rowText(wrapper)).toEqual({
      sentence: "Your doodle uses notes outside the app's keys and modes, so no key is suggested.",
      buttons: [],
    })
    expect(wrapper.get('.suggestion-row > p').attributes('tabindex')).toBeUndefined()
  })

  // @test-link [[rule_suggestion_withheld]]
  it('is absent with too little to go on, saying nothing', () => {
    expect(rowText(mountRow({ doodle: beatsDoodle(TOO_SHORT) }))).toBeNull()
  })
})

// @test-link [[req_key_and_mode_suggestion]]
describe('the suggestion row: focus', () => {
  // @test-link [[req_key_and_mode_suggestion]]
  it('hands focus back when its focused buttons leave by a change of Jam’s key, not by a press', async () => {
    const wrapper = mountRow()
    ;(wrapper.get('.suggestion-row > button').element as HTMLButtonElement).focus()

    await wrapper.setProps({ jam: { tonalCenter: 'G', collection: 'Major' } })
    await nextTick()

    expect(wrapper.emitted('focus-lost')).toEqual([[]])
  })

  // @test-link [[req_key_and_mode_suggestion]]
  it('hands nothing back when its buttons leave with focus elsewhere', async () => {
    const wrapper = mountRow()

    await wrapper.setProps({ jam: { tonalCenter: 'G', collection: 'Major' } })
    await nextTick()

    expect(wrapper.emitted('focus-lost')).toBeUndefined()
  })
})
