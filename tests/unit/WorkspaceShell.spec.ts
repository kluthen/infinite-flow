import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import WorkspaceShell from '../../src/components/workspace/WorkspaceShell.vue'

describe('WorkspaceShell', () => {
  it('provides an accessible empty workspace without placeholder music', () => {
    const wrapper = mount(WorkspaceShell)

    expect(wrapper.get('main').attributes('aria-labelledby')).toBe('workspace-title')
    expect(wrapper.get('h2').text()).toBe('Four-measure phrase')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('Generate a phrase to begin.')
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
