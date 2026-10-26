/**
 * The generic toggle list: a labelled, described group of toggle buttons, each its own tab stop,
 * its state said in words and by `aria-pressed`. Read-only, every toggle stays focusable and none
 * reports a change; a disabled item is natively disabled and named by its reason.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ToggleList from '@/components/controls/ToggleList.vue'
import type { ToggleListItem } from '@/components/controls/toggle-list-item'

const ITEMS: readonly ToggleListItem[] = [
  { value: 'a', label: 'Alpha', pressed: true },
  { value: 'b', label: 'Beta', pressed: false },
  { value: 'c', label: 'Gamma', pressed: false, disabled: true, describedBy: 'gamma-reason' },
]

/** Intent: mount the three-item list, editable unless `readonly`. */
function mountList(readonly = false) {
  return mount(ToggleList, {
    props: { labelledBy: 'list-label', describedBy: 'list-note', items: ITEMS, readonly },
    attachTo: document.body,
  })
}

/** Intent: a keydown of `key` on `element`, returning whether its default action was refused. */
function pressKey(element: Element, key: string): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  element.dispatchEvent(event)
  return event.defaultPrevented
}

// @test-link [[ui_toggle_list]]
describe('ToggleList', () => {
  it('renders a group named and described by the given ids, one toggle button per item', () => {
    const wrapper = mountList()
    const group = wrapper.get('.toggle-list')
    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-labelledby')).toBe('list-label')
    expect(group.attributes('aria-describedby')).toBe('list-note')
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    for (const button of buttons) {
      expect(button.classes()).toEqual(expect.arrayContaining(['btn', 'toggle-button']))
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('tabindex')).toBeUndefined()
    }
  })

  it('says each state in words, hidden from assistive technology, and by aria-pressed', () => {
    const wrapper = mountList()
    const [alpha, beta] = wrapper.findAll('button')
    expect(alpha!.attributes('aria-pressed')).toBe('true')
    expect(alpha!.text()).toBe('Alpha on')
    expect(beta!.attributes('aria-pressed')).toBe('false')
    const state = beta!.get('.toggle-button-state')
    expect(state.text()).toBe('off')
    expect(state.attributes('aria-hidden')).toBe('true')
  })

  it('reports the toggled item on click, leaving its own state to the parent', async () => {
    const wrapper = mountList()
    await wrapper.findAll('button')[1]!.trigger('click')
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['b'], ['a']])
    expect(wrapper.findAll('button')[1]!.attributes('aria-pressed')).toBe('false')
  })

  it('does nothing special on an arrow key', () => {
    const wrapper = mountList()
    const beta = wrapper.findAll('button')[1]!
    ;(beta.element as HTMLButtonElement).focus()
    expect(pressKey(beta.element, 'ArrowRight')).toBe(false)
    expect(document.activeElement).toBe(beta.element)
    expect(wrapper.emitted('toggle')).toBeUndefined()
    wrapper.unmount()
  })

  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('read-only, keeps every toggle focusable and refuses click, Space and Enter', async () => {
    const wrapper = mountList(true)
    expect(wrapper.get('.toggle-list').classes()).toContain('is-readonly')
    const beta = wrapper.findAll('button')[1]!
    expect(beta.attributes('disabled')).toBeUndefined()
    ;(beta.element as HTMLButtonElement).focus()
    expect(document.activeElement).toBe(beta.element)

    expect(pressKey(beta.element, ' ')).toBe(true)
    expect(pressKey(beta.element, 'Enter')).toBe(true)
    await beta.trigger('click')

    expect(wrapper.emitted('toggle')).toBeUndefined()
    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
    wrapper.unmount()
  })

  it('editable, leaves Space and Enter to the button', () => {
    const wrapper = mountList()
    const beta = wrapper.findAll('button')[1]!
    expect(pressKey(beta.element, ' ')).toBe(false)
    expect(pressKey(beta.element, 'Enter')).toBe(false)
    wrapper.unmount()
  })

  it('makes a disabled item natively disabled, named by its reason, and reports nothing for it', async () => {
    const wrapper = mountList()
    const gamma = wrapper.findAll('button')[2]!
    expect(gamma.attributes('disabled')).toBeDefined()
    expect(gamma.attributes('aria-describedby')).toBe('gamma-reason')
    expect(wrapper.findAll('button')[0]!.attributes('aria-describedby')).toBeUndefined()

    await gamma.trigger('click')

    expect(wrapper.emitted('toggle')).toBeUndefined()
  })
})
