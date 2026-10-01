import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ControllerStatus from '@/components/workspace/ControllerStatus.vue'
import type { ControllerStatusForm } from '@/midi/controller-status'

const KEYS = { id: 'port-a', name: 'Acme Keys 49 with a very long name', manufacturer: 'Acme' }

/** Intent: mount the header element in one form, enabled unless `disabled`. */
function mountStatus(form: ControllerStatusForm, disabled = false) {
  return mount(ControllerStatus, { props: { form, disabled }, attachTo: document.body })
}

/** The badge forms, with the dot tone, the label and whether the badge is error-toned. */
const BADGES = [
  {
    form: { kind: 'connected', device: KEYS },
    dot: 'is-success',
    label: KEYS.name,
    error: false,
  },
  { form: { kind: 'no-controller' }, dot: 'is-neutral', label: 'No controller', error: false },
  { form: { kind: 'blocked' }, dot: 'is-error', label: 'MIDI access blocked', error: true },
  {
    form: { kind: 'disconnected' },
    dot: 'is-error',
    label: 'Controller disconnected',
    error: true,
  },
] as const

// @test-link [[rule_controller_connects_between_sessions]]
describe('ControllerStatus', () => {
  it('renders the Connect controller form as a plain btn, no dot and no label area', () => {
    const button = mountStatus({ kind: 'connect' }).get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toEqual(['btn', 'controller-status'])
    expect(button.text()).toBe('Connect controller')
    expect(button.find('.status-dot').exists()).toBe(false)
    expect(button.find('.controller-status-label').exists()).toBe(false)
    expect(button.attributes('title')).toBeUndefined()
  })

  it.each(BADGES)('renders the $label badge: one dot, one label', ({ form, dot, label, error }) => {
    const button = mountStatus(form).get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toEqual(
      error
        ? ['btn', 'controller-status', 'is-badge', 'is-error']
        : ['btn', 'controller-status', 'is-badge'],
    )
    const dots = button.findAll('.status-dot')
    expect(dots).toHaveLength(1)
    expect(dots[0]!.classes()).toEqual(['status-dot', dot])
    expect(dots[0]!.attributes('aria-hidden')).toBe('true')
    const labels = button.findAll('.controller-status-label')
    expect(labels).toHaveLength(1)
    expect(labels[0]!.text()).toBe(label)
  })

  it("gives the connected badge the device's full name as its title, and no other form one", () => {
    expect(mountStatus({ kind: 'connected', device: KEYS }).get('button').attributes('title')).toBe(
      KEYS.name,
    )
    for (const { form } of BADGES.slice(1)) {
      expect(mountStatus(form).get('button').attributes('title')).toBeUndefined()
    }
  })

  // @test-link [[rule_readonly_controls_keep_contrast]]
  it.each([{ kind: 'connect' } as const, ...BADGES.map((badge) => badge.form)])(
    'carries disabled in a session with its classes unchanged ($kind)',
    (form) => {
      const enabled = mountStatus(form).get('button')
      const disabled = mountStatus(form, true).get('button')
      expect(enabled.attributes('disabled')).toBeUndefined()
      expect(disabled.attributes('disabled')).toBeDefined()
      expect(disabled.classes()).toEqual(enabled.classes())
    },
  )

  it('emits open on a click, and focuses its button through the exposed method', async () => {
    const wrapper = mountStatus({ kind: 'no-controller' })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
    wrapper.vm.focus()
    expect(document.activeElement).toBe(wrapper.get('button').element)
  })
})
