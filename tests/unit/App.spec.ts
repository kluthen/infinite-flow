import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from '../../src/App.vue'

describe('App', () => {
  it('mounts the client shell', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })
})
