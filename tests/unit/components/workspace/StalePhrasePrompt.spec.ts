/**
 * The stale-phrase prompt on its own, over a fake controller: its words (the changed settings by
 * their labels in page order; the starting note's paragraph and hint), its focus on open and its
 * trap, and what each answer does: `Start with this phrase` starts and jumps, focus on the session
 * action, or closes with nothing started; `Regenerate phrase` runs the Idle Regenerate, focus on
 * the phrase action; `Close`, Escape and the backdrop dismiss it; closing by itself moves focus
 * as a dismissal does.
 */
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import StalePhrasePrompt from '@/components/workspace/StalePhrasePrompt.vue'
import type { StalePhrasePrompt as Prompt } from '@/components/workspace/workspace-stale-phrase'
import type { StaleSetting } from '@/session/stale-phrase-one'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'

/** The prompt mounted over a fake controller, and its spied props. */
interface MountedPrompt {
  readonly wrapper: VueWrapper
  readonly fake: FakeSessionController
  readonly regenerate: ReturnType<typeof vi.fn>
  readonly prepareStart: ReturnType<typeof vi.fn>
  readonly afterStart: ReturnType<typeof vi.fn>
  readonly focusTarget: ReturnType<typeof vi.fn>
  readonly focusFallback: ReturnType<typeof vi.fn>
}

let mounted: VueWrapper | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

/** Intent: mount the prompt the controller shows, opened by `opener`, naming `changed`. */
function mountPrompt(
  changed: readonly StaleSetting[] = ['tonalCenter'],
  opener: Prompt['opener'] = 'start',
): MountedPrompt {
  const fake = createFakeSessionController({ stalePhrasePrompt: { opener, changed } })
  const spies = {
    regenerate: vi.fn(() => Promise.resolve(true)),
    prepareStart: vi.fn(),
    afterStart: vi.fn(),
    focusTarget: vi.fn(),
    focusFallback: vi.fn(),
  }
  const wrapper = mount(StalePhrasePrompt, {
    props: { controller: fake.controller, ...spies },
    attachTo: document.body,
  })
  mounted = wrapper
  return { wrapper, fake, ...spies }
}

/** Intent: the sheet's paragraphs, in order. */
function paragraphs(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.sheet-body p').map((p) => p.text())
}

/** Intent: the button labelled `label`. */
function button(wrapper: VueWrapper, label: string): HTMLButtonElement {
  const found = wrapper.findAll('button').find((entry) => entry.text() === label)
  if (found === undefined) throw new Error(`no ${label} button`)
  return found.element as HTMLButtonElement
}

// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('stale-phrase prompt: words', () => {
  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('is an alert dialog named by its title, described by its body, opened by Start', () => {
    const { wrapper } = mountPrompt()
    const dialog = wrapper.get('[role="alertdialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe(
      'This phrase is from before your changes',
    )
    expect(wrapper.find(`#${dialog.attributes('aria-describedby')}`).exists()).toBe(true)
    expect(paragraphs(wrapper)).toEqual([
      'Since it was made, you changed Written key.',
      'Regenerate phrase makes a new phrase with your current settings. Start with this phrase plays this one first; the phrases after it use your current settings.',
    ])
    expect(wrapper.findAll('.sheet-actions button').map((entry) => entry.text())).toEqual([
      'Regenerate phrase',
      'Start with this phrase',
    ])
    expect(button(wrapper, 'Regenerate phrase').className).toContain('btn-primary')
  })

  it.each([
    [['register', 'tonalCenter'], 'Written key and Register'],
    [['leapiness', 'register', 'tonalCenter'], 'Written key, Register and Leapiness'],
    [
      ['arpeggioChaos', 'register', 'chromaticApproach', 'tonalCenter'],
      'Written key, Register and 2 other settings',
    ],
    [['instrumentProfileId', 'collection'], 'Collection and Instrument profile'],
    [['passingTone', 'arpeggioChaos'], 'Arpeggio chaos and Passing tone'],
  ] as const)('names %j, in page order, as "%s"', (changed, text) => {
    const { wrapper } = mountPrompt(changed)
    expect(paragraphs(wrapper)[0]).toBe(`Since it was made, you changed ${text}.`)
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('names a Neutral–Jazz change by its two chromatic figures, never Musical profile preset', () => {
    const { wrapper } = mountPrompt(['chromaticApproach', 'chromaticEnclosure'])
    const text = paragraphs(wrapper)[0]
    expect(text).toBe('Since it was made, you changed Chromatic approach and Chromatic enclosure.')
    expect(text).not.toContain('Musical profile preset')
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it.each([
    ['passingTone', 'Passing tone'],
    ['accentedPassingTone', 'Accented passing tone'],
    ['neighborTone', 'Neighbor tone'],
    ['appoggiatura', 'Appoggiatura'],
    ['diatonicEnclosure', 'Diatonic enclosure'],
    ['chromaticApproach', 'Chromatic approach'],
    ['chromaticEnclosure', 'Chromatic enclosure'],
  ] as const)('names the figure %s by its label "%s"', (figure, label) => {
    const { wrapper } = mountPrompt([figure])
    const text = paragraphs(wrapper)[0]
    expect(text).toBe(`Since it was made, you changed ${label}.`)
    expect(text).not.toContain('Musical profile preset')
  })

  // @test-link [[rule_stale_phrase_prompt_at_start]]
  it('names the seven figures after Arpeggio chaos, in their order', () => {
    const { wrapper } = mountPrompt(['chromaticEnclosure', 'appoggiatura', 'arpeggioChaos'])
    expect(paragraphs(wrapper)[0]).toBe(
      'Since it was made, you changed Arpeggio chaos, Appoggiatura and Chromatic enclosure.',
    )
  })

  // @test-link [[rule_midi_starting_note]]
  it('opened by the starting note, says so first and ends with the hint', () => {
    const { wrapper } = mountPrompt(['tonalCenter'], 'note')

    const shown = paragraphs(wrapper)
    expect(shown[0]).toBe(
      "Your note didn't start the session. Nothing you play will until you choose.",
    )
    expect(wrapper.get('.sheet-hint').text()).toBe(
      'A new phrase may start on a different note: the line above the staff names it.',
    )
    expect(shown).toHaveLength(4)
  })
})

// @test-link [[rule_stale_phrase_prompt_at_start]]
describe('stale-phrase prompt: focus and answers', () => {
  it('closes the Volume popover and focuses Regenerate phrase on open, Tab trapped in it', async () => {
    const { wrapper, prepareStart } = mountPrompt()

    expect(prepareStart).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(button(wrapper, 'Regenerate phrase'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(button(wrapper, 'Start with this phrase'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(button(wrapper, 'Close'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(document.activeElement).toBe(button(wrapper, 'Start with this phrase'))
  })

  // @test-link [[rule_session_start_conditions]]
  it('Start with this phrase starts, jumps and puts focus on the session action', () => {
    const { wrapper, fake, prepareStart, afterStart, focusTarget } = mountPrompt()

    button(wrapper, 'Start with this phrase').click()

    expect(fake.useStalePhrase).toHaveBeenCalledOnce()
    expect(prepareStart).toHaveBeenCalledTimes(2)
    expect(afterStart).toHaveBeenCalledOnce()
    expect(focusTarget).toHaveBeenCalledExactlyOnceWith('session-action')
    expect(fake.state.phase).toBe('count-in')
  })

  // @test-link [[rule_session_start_conditions]]
  it('Start with this phrase with a start condition no longer holding starts nothing, focus as a dismissal', () => {
    const { wrapper, fake, afterStart, focusFallback } = mountPrompt()
    fake.state.canStart = false

    button(wrapper, 'Start with this phrase').click()

    expect(afterStart).not.toHaveBeenCalled()
    expect(focusFallback).toHaveBeenCalledOnce()
    expect(fake.state.phase).toBe('idle')
  })

  it('Regenerate phrase dismisses it, runs the Idle Regenerate and focuses the phrase action', () => {
    const { wrapper, fake, regenerate, focusTarget, afterStart } = mountPrompt()

    button(wrapper, 'Regenerate phrase').click()

    expect(fake.dismissStalePhrase).toHaveBeenCalledOnce()
    expect(regenerate).toHaveBeenCalledOnce()
    expect(focusTarget).toHaveBeenCalledExactlyOnceWith('phrase-action')
    expect(fake.useStalePhrase).not.toHaveBeenCalled()
    expect(afterStart).not.toHaveBeenCalled()
  })

  it.each(['Close', 'Escape', 'the backdrop'])(
    '%s dismisses it, focus on the workspace fallback',
    (way) => {
      const { wrapper, fake, focusFallback, regenerate } = mountPrompt()

      if (way === 'Close') button(wrapper, 'Close').click()
      else if (way === 'Escape')
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      else wrapper.get('.sheet-backdrop').element.dispatchEvent(new MouseEvent('click'))

      expect(fake.dismissStalePhrase).toHaveBeenCalledOnce()
      expect(focusFallback).toHaveBeenCalledOnce()
      expect(regenerate).not.toHaveBeenCalled()
      expect(fake.useStalePhrase).not.toHaveBeenCalled()
    },
  )

  it('closed by itself, moves focus as a dismissal; unmounted while it still shows, moves none', async () => {
    const closed = mountPrompt()
    closed.fake.state.stalePhrasePrompt = null
    closed.wrapper.unmount()
    mounted = null
    await nextTick()
    expect(closed.focusFallback).toHaveBeenCalledOnce()

    const torn = mountPrompt()
    torn.wrapper.unmount()
    mounted = null
    expect(torn.focusFallback).not.toHaveBeenCalled()
  })
})
