import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ThemeControl from '@/components/workspace/ThemeControl.vue'

// @test-link [[rule_presentation_preference_preserves_phrase]]
describe('ThemeControl', () => {
  it('emits the selected theme preference unchanged', async () => {
    const wrapper = mount(ThemeControl, { props: { theme: 'System' } })

    await wrapper.findAll('button')[2]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['Dark']])
  })

  it('reflects the current theme as the checked segment', () => {
    const wrapper = mount(ThemeControl, { props: { theme: 'Light' } })

    const buttons = wrapper.findAll('button')
    expect(buttons[1]!.attributes('aria-checked')).toBe('true')
  })
})
