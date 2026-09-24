import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TempoStepper from '@/components/controls/TempoStepper.vue'

const VALUES = [60, 70, 80, 90, 100]

function mountStepper(modelValue: number, readonly = false) {
  return mount(TempoStepper, {
    props: { modelValue, values: VALUES, readonly },
  })
}

describe('TempoStepper', () => {
  it('renders the spinbutton with the current value and its bounds', () => {
    const wrapper = mountStepper(80)
    const spin = wrapper.get('[role="spinbutton"]')
    expect(spin.attributes('aria-valuenow')).toBe('80')
    expect(spin.attributes('aria-valuemin')).toBe('60')
    expect(spin.attributes('aria-valuemax')).toBe('100')
    expect(spin.attributes('aria-valuetext')).toBe('80 BPM')
    expect(wrapper.text()).toContain('80 BPM')
  })

  it('emits the next catalog value on increment', async () => {
    const wrapper = mountStepper(80)
    await wrapper.get('[aria-label="Increase tempo"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[90]])
  })

  it('emits the previous catalog value on decrement', async () => {
    const wrapper = mountStepper(80)
    await wrapper.get('[aria-label="Decrease tempo"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[70]])
  })

  it('disables the decrement button at the lower bound', () => {
    const wrapper = mountStepper(60)
    expect(wrapper.get('[aria-label="Decrease tempo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Increase tempo"]').attributes('disabled')).toBeUndefined()
  })

  it('disables the increment button at the upper bound', () => {
    const wrapper = mountStepper(100)
    expect(wrapper.get('[aria-label="Increase tempo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Decrease tempo"]').attributes('disabled')).toBeUndefined()
  })

  it('throws when the model value is not one of its catalog values', () => {
    expect(() => mountStepper(75)).toThrow(/not one of its catalog values/)
  })

  it('supports ArrowUp/ArrowDown and Home/End on the spinbutton', async () => {
    const wrapper = mountStepper(80)
    const spin = wrapper.get('[role="spinbutton"]')
    await spin.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([90])
    await spin.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')![1]).toEqual([70])
    await spin.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')![2]).toEqual([100])
    await spin.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')![3]).toEqual([60])
  })

  it('read-only: stays keyboard-focusable but suppresses every value change', async () => {
    const wrapper = mountStepper(80, true)
    const spin = wrapper.get('[role="spinbutton"]')
    expect(spin.attributes('tabindex')).toBe('0')
    expect(spin.attributes('aria-readonly')).toBe('true')
    await spin.trigger('keydown', { key: 'ArrowUp' })
    await wrapper.get('[aria-label="Increase tempo"]').trigger('click')
    await wrapper.get('[aria-label="Decrease tempo"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
