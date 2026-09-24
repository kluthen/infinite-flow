import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SegmentedControl from '@/components/controls/SegmentedControl.vue'

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

function mountControl(modelValue: string | null, readonly = false) {
  return mount(SegmentedControl, {
    props: { label: 'Test group', options: OPTIONS, modelValue, readonly },
    attachTo: document.body,
  })
}

describe('SegmentedControl', () => {
  it('renders a labelled radiogroup with one checked segment', () => {
    const wrapper = mountControl('b')
    const group = wrapper.get('[role="radiogroup"]')
    expect(group.attributes('aria-label')).toBe('Test group')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[1]!.attributes('aria-checked')).toBe('true')
    expect(radios[1]!.classes()).toContain('is-selected')
    expect(radios[0]!.attributes('aria-checked')).toBe('false')
    expect(radios[2]!.attributes('aria-checked')).toBe('false')
  })

  it('gives only the checked segment a tabindex of 0', () => {
    const wrapper = mountControl('c')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios[0]!.attributes('tabindex')).toBe('-1')
    expect(radios[1]!.attributes('tabindex')).toBe('-1')
    expect(radios[2]!.attributes('tabindex')).toBe('0')
  })

  it('defaults the roving tab stop to the first option when nothing is checked', () => {
    const wrapper = mountControl(null)
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.every((radio) => radio.attributes('aria-checked') === 'false')).toBe(true)
    expect(radios[0]!.attributes('tabindex')).toBe('0')
  })

  it('emits update:modelValue with the clicked option value', async () => {
    const wrapper = mountControl('a')
    await wrapper.findAll('[role="radio"]')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['c']])
  })

  it('throws when modelValue is not one of the options', () => {
    expect(() => mountControl('missing')).toThrow(/no option for value/)
  })

  it('moves focus and selection to the next option on ArrowRight, wrapping at the end', async () => {
    const wrapper = mountControl('c')
    const radios = wrapper.findAll('[role="radio"]')
    await radios[2]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['a']])
    expect(document.activeElement).toBe(radios[0]!.element)
  })

  it('moves focus and selection to the previous option on ArrowUp, wrapping at the start', async () => {
    const wrapper = mountControl('a')
    const radios = wrapper.findAll('[role="radio"]')
    await radios[0]!.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['c']])
    expect(document.activeElement).toBe(radios[2]!.element)
  })

  it('Home and End jump to the first and last option and select them', async () => {
    const wrapper = mountControl('b')
    const radios = wrapper.findAll('[role="radio"]')
    await radios[1]!.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['c'])
    await radios[1]!.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')![1]).toEqual(['a'])
  })

  it('marks a read-only group with aria-readonly and the is-readonly class', () => {
    const wrapper = mountControl('a', true)
    const group = wrapper.get('[role="radiogroup"]')
    expect(group.attributes('aria-readonly')).toBe('true')
    expect(group.classes()).toContain('is-readonly')
  })

  it('read-only: clicking a different option does not emit', async () => {
    const wrapper = mountControl('a', true)
    await wrapper.findAll('[role="radio"]')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('read-only: arrow keys still move focus but never emit', async () => {
    const wrapper = mountControl('a', true)
    const radios = wrapper.findAll('[role="radio"]')
    await radios[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(document.activeElement).toBe(radios[1]!.element)
    expect(radios[1]!.attributes('tabindex')).toBe('0')
    expect(radios[0]!.attributes('tabindex')).toBe('-1')
  })
})
