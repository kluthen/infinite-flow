import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import MixControls from '@/components/workspace/MixControls.vue'
import MixVolumeButton from '@/components/workspace/MixVolumeButton.vue'
import {
  createMixVolumePopover,
  type MixVolumePopover,
} from '@/components/workspace/mix-volume-popover'
import type { AudioTransport } from '@/audio/audio-transport'
import { themeDesign, themeMixTokens, transportRig } from '../../audio/transport-rig'
import { provideSaveSettings, recordingSaveSettings } from './recording-save-settings'

/** The toolbar's mix controls beside a compact Volume, as the phone's session cue row has it. */
const MixHarness = defineComponent({
  props: {
    audio: { type: Object as () => AudioTransport, required: true },
    popover: { type: Object as () => MixVolumePopover, required: true },
  },
  setup(props) {
    return () =>
      h('div', [
        h(MixControls, {
          audio: props.audio,
          popover: props.popover,
          designTokens: themeMixTokens,
        }),
        h('div', { class: 'cue-row' }, [
          h(MixVolumeButton, {
            popover: props.popover,
            opener: 'compact',
            audio: props.audio,
            designTokens: themeMixTokens,
          }),
        ]),
        h('button', { type: 'button', class: 'elsewhere' }, 'Elsewhere'),
      ])
  },
})

/**
 * Intent: mount the harness in the document, on a fresh transport and popover, with a saver that
 * records what the mix saves.
 */
function mountMix() {
  const { transport } = transportRig()
  const popover = createMixVolumePopover('mix-volume-popover')
  const { saveSettings, saves } = recordingSaveSettings()
  const wrapper = mount(MixHarness, {
    props: { audio: transport, popover },
    attachTo: document.body,
    global: { provide: provideSaveSettings(saveSettings) },
  })
  return { wrapper, transport, popover, saves }
}

/** Intent: the toolbar's toggle button named `name`. */
function toggle(wrapper: VueWrapper, name: 'Backing' | 'Click') {
  const found = wrapper
    .findAll('.mix-controls .toggle-button')
    .find((button) => button.text().startsWith(name))
  if (found === undefined) throw new Error(`no ${name} toggle`)
  return found
}

/** Intent: the toolbar's Volume button. */
function toolbarVolume(wrapper: VueWrapper) {
  return wrapper.get<HTMLButtonElement>('.mix-controls .mix-volume > .btn')
}

/** Intent: the one volume popover. */
function popoverElement(wrapper: VueWrapper) {
  return wrapper.get('#mix-volume-popover')
}

/** Intent: open the popover from the toolbar's Volume with a keyboard activation. */
async function openFromToolbar(wrapper: VueWrapper): Promise<void> {
  await toolbarVolume(wrapper).trigger('click')
  await flushPromises()
}

/** Intent: the slider labelled `label`. */
function slider(wrapper: VueWrapper, label: 'Backing volume' | 'Click volume') {
  const labelElement = wrapper.findAll('label.field-label').find((found) => found.text() === label)
  if (labelElement === undefined) throw new Error(`no ${label} label`)
  return wrapper.get<HTMLInputElement>(`#${labelElement.attributes('for')}`)
}

/**
 * Intent: move a slider to `value` as a drag does, with an input event and no change event (test
 * utils' `setValue` fires both, as a release would).
 */
async function moveSlider(input: ReturnType<typeof slider>, value: string): Promise<void> {
  input.element.value = value
  await input.trigger('input')
}

afterEach(() => {
  document.body.replaceChildren()
})

// @test-link [[req_session_audio_mix]]
describe('MixControls toggles', () => {
  it('shows Backing then Click, both pressed and reading on, the state hidden from assistive technology', () => {
    const { wrapper } = mountMix()

    const toggles = wrapper.findAll('.mix-controls .toggle-button')
    expect(toggles.map((button) => button.text())).toEqual(['Backing on', 'Click on'])
    for (const button of toggles) {
      expect(button.classes()).toContain('btn')
      expect(button.attributes('aria-pressed')).toBe('true')
      expect(button.get('.toggle-button-state').attributes('aria-hidden')).toBe('true')
    }
  })

  it('turning Backing and Click off and on sets the transport mix and the pressed state', async () => {
    const { wrapper, transport } = mountMix()

    await toggle(wrapper, 'Backing').trigger('click')
    expect(transport.mix().backingOn).toBe(false)
    expect(toggle(wrapper, 'Backing').attributes('aria-pressed')).toBe('false')
    expect(toggle(wrapper, 'Backing').text()).toBe('Backing off')

    await toggle(wrapper, 'Click').trigger('click')
    expect(transport.mix().clickOn).toBe(false)
    expect(toggle(wrapper, 'Click').attributes('aria-pressed')).toBe('false')

    await toggle(wrapper, 'Backing').trigger('click')
    expect(transport.mix().backingOn).toBe(true)
    expect(toggle(wrapper, 'Backing').attributes('aria-pressed')).toBe('true')
  })
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[rule_saved_setting_is_players_choice]]
describe("MixControls: saving the player's mix", () => {
  it('saves each toggle with the value the transport now holds', async () => {
    const { wrapper, saves } = mountMix()

    await toggle(wrapper, 'Backing').trigger('click')
    await toggle(wrapper, 'Click').trigger('click')
    await toggle(wrapper, 'Backing').trigger('click')

    expect(saves).toEqual([
      { 'mix.backingOn': false },
      { 'mix.clickOn': false },
      { 'mix.backingOn': true },
    ])
  })

  it('saves a volume when its slider is released, never while it moves', async () => {
    const { wrapper, transport, saves } = mountMix()
    const { range } = themeDesign()
    await openFromToolbar(wrapper)

    const backing = slider(wrapper, 'Backing volume')
    await moveSlider(backing, '0.4')
    await moveSlider(backing, '0.5')
    expect(transport.mix().backingVolume).toBe(0.5)
    expect(saves).toEqual([])
    await backing.trigger('change')
    expect(saves).toEqual([{ 'mix.backingVolume': 0.5 }])

    const click = slider(wrapper, 'Click volume')
    await moveSlider(click, String(range.clickVolumeMin))
    expect(saves).toHaveLength(1)
    await click.trigger('change')
    expect(saves).toEqual([
      { 'mix.backingVolume': 0.5 },
      { 'mix.clickVolume': range.clickVolumeMin },
    ])
  })
})

// @test-link [[req_session_audio_mix]]
describe('MixControls volume popover', () => {
  it('the closed popover is in the page, hidden, and named by the Volume button', () => {
    const { wrapper } = mountMix()

    const volume = toolbarVolume(wrapper)
    expect(volume.text()).toBe('Volume')
    expect(volume.attributes('aria-expanded')).toBe('false')
    expect(volume.attributes('aria-controls')).toBe('mix-volume-popover')
    expect(popoverElement(wrapper).classes()).toContain('popover')
    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
  })

  it('opening shows both sliders with the token ranges and the current levels, focusing the first', async () => {
    const { wrapper } = mountMix()
    const { range, defaults } = themeDesign()

    await openFromToolbar(wrapper)

    expect(toolbarVolume(wrapper).attributes('aria-expanded')).toBe('true')
    expect(popoverElement(wrapper).attributes('hidden')).toBeUndefined()
    const backing = slider(wrapper, 'Backing volume')
    const click = slider(wrapper, 'Click volume')
    expect(backing.classes()).toContain('range-input')
    expect(backing.attributes('type')).toBe('range')
    expect(Number(backing.attributes('min'))).toBe(range.backingVolumeMin)
    expect(Number(backing.attributes('max'))).toBe(range.volumeMax)
    expect(Number(backing.attributes('step'))).toBe(
      Number(themeMixTokens().getPropertyValue('--mix-volume-step')),
    )
    expect(Number(backing.element.value)).toBe(defaults.backingVolume)
    expect(Number(click.element.value)).toBe(defaults.clickVolume)
    expect(document.activeElement).toBe(backing.element)
  })

  // @test-link [[rule_click_volume_never_silent]]
  it("the click slider's minimum is the token's audible minimum, and both sliders set the transport", async () => {
    const { wrapper, transport } = mountMix()
    const { range } = themeDesign()
    await openFromToolbar(wrapper)

    const click = slider(wrapper, 'Click volume')
    expect(Number(click.attributes('min'))).toBe(range.clickVolumeMin)
    expect(range.clickVolumeMin).toBeGreaterThan(0)
    await click.setValue(String(range.clickVolumeMin))
    expect(transport.mix().clickVolume).toBe(range.clickVolumeMin)

    await slider(wrapper, 'Backing volume').setValue('0.5')
    expect(transport.mix().backingVolume).toBe(0.5)
  })

  it('Escape closes and returns focus to Volume; the levels survive reopening', async () => {
    const { wrapper } = mountMix()
    await openFromToolbar(wrapper)
    await slider(wrapper, 'Backing volume').setValue('0.3')

    await slider(wrapper, 'Backing volume').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
    expect(toolbarVolume(wrapper).attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toolbarVolume(wrapper).element)
    await openFromToolbar(wrapper)
    expect(Number(slider(wrapper, 'Backing volume').element.value)).toBe(0.3)
  })

  it('a pointer press outside closes it without moving focus; one inside does not', async () => {
    const { wrapper } = mountMix()
    await openFromToolbar(wrapper)

    slider(wrapper, 'Click volume').element.dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    )
    await flushPromises()
    expect(popoverElement(wrapper).attributes('hidden')).toBeUndefined()

    wrapper.get('.elsewhere').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
    expect(document.activeElement).toBe(slider(wrapper, 'Backing volume').element)
  })

  it('Tab moving focus out of it closes it; moving between its sliders does not', async () => {
    const { wrapper } = mountMix()
    await openFromToolbar(wrapper)

    slider(wrapper, 'Click volume').element.focus()
    await flushPromises()
    expect(popoverElement(wrapper).attributes('hidden')).toBeUndefined()

    wrapper.get<HTMLButtonElement>('.elsewhere').element.focus()
    await flushPromises()
    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
  })

  it('a pointer click on the open Volume closes it', async () => {
    const { wrapper } = mountMix()
    await openFromToolbar(wrapper)

    const volume = toolbarVolume(wrapper)
    volume.element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    volume.element.focus()
    volume.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await flushPromises()

    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
    expect(volume.attributes('aria-expanded')).toBe('false')
  })
})

// @test-link [[req_session_audio_mix]]
describe('the compact Volume', () => {
  it('opens the same popover anchored under itself, and a session end closes it', async () => {
    const { wrapper, popover } = mountMix()
    const compact = wrapper.get('.cue-row .mix-volume > .btn')
    expect(compact.attributes('aria-controls')).toBe('mix-volume-popover')

    await compact.trigger('click')
    await flushPromises()

    expect(compact.attributes('aria-expanded')).toBe('true')
    expect(toolbarVolume(wrapper).attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('#mix-volume-popover')).toHaveLength(1)
    expect(wrapper.get('.cue-row .mix-volume').find('#mix-volume-popover').exists()).toBe(true)
    expect(document.activeElement).toBe(slider(wrapper, 'Backing volume').element)

    popover.closeIfOpenedBy('compact')
    await flushPromises()
    expect(wrapper.get('.mix-controls .mix-volume').find('#mix-volume-popover').exists()).toBe(true)
    expect(popoverElement(wrapper).attributes('hidden')).toBeDefined()
  })
})
