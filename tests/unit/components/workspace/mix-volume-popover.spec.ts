import { afterEach, describe, expect, it } from 'vitest'

import {
  createMixVolumePopover,
  type MixVolumeOpener,
  type MixVolumePopover,
} from '@/components/workspace/mix-volume-popover'

/** The DOM parts of both openers and of the panel, attached to the document for real focus. */
interface PopoverDom {
  readonly buttons: Record<MixVolumeOpener, HTMLButtonElement>
  readonly panel: HTMLDivElement
  readonly slider: HTMLInputElement
  readonly elsewhere: HTMLButtonElement
}

/** Intent: build both openers, the panel with one slider, and an unrelated button in the page. */
function buildDom(popover: MixVolumePopover): PopoverDom {
  const make = (opener: MixVolumeOpener) => {
    const anchor = document.createElement('div')
    const button = document.createElement('button')
    anchor.append(button)
    document.body.append(anchor)
    popover.attachOpener(opener, button)
    return { anchor, button }
  }
  const toolbar = make('toolbar')
  const compact = make('compact')
  const panel = document.createElement('div')
  const slider = document.createElement('input')
  slider.type = 'range'
  panel.append(slider)
  toolbar.anchor.append(panel)
  popover.attachPanel(panel)
  const elsewhere = document.createElement('button')
  document.body.append(elsewhere)
  return {
    buttons: { toolbar: toolbar.button, compact: compact.button },
    panel,
    slider,
    elsewhere,
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

// @test-link [[req_session_audio_mix]]
describe('the Volume popover controller', () => {
  it('starts closed, opens from either Volume, and names one popover id', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    buildDom(popover)

    expect(popover.id).toBe('mix-volume-popover')
    expect(popover.state.openedBy).toBeNull()
    popover.toggleFrom('toolbar')
    expect(popover.state.openedBy).toBe('toolbar')
    popover.toggleFrom('toolbar')
    expect(popover.state.openedBy).toBeNull()
    popover.toggleFrom('compact')
    expect(popover.state.openedBy).toBe('compact')
    popover.toggleFrom('toolbar')
    expect(popover.state.openedBy).toBe('toolbar')
  })

  it('Escape closes and returns focus to the Volume that opened it', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    popover.toggleFrom('compact')
    dom.slider.focus()

    popover.escape()

    expect(popover.state.openedBy).toBeNull()
    expect(document.activeElement).toBe(dom.buttons.compact)
  })

  it('a dismissal (outside press, Tab out) closes without moving focus', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    popover.toggleFrom('toolbar')
    dom.elsewhere.focus()

    popover.dismiss()

    expect(popover.state.openedBy).toBeNull()
    expect(document.activeElement).toBe(dom.elsewhere)
  })

  it('a press counts as outside unless it lands in the panel or on the opening Volume', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    popover.toggleFrom('toolbar')

    expect(popover.isOutside(dom.slider)).toBe(false)
    expect(popover.isOutside(dom.buttons.toolbar)).toBe(false)
    expect(popover.isOutside(dom.buttons.compact)).toBe(true)
    expect(popover.isOutside(dom.elsewhere)).toBe(true)
  })
})

// @test-link [[req_session_audio_mix]]
describe('closing the Volume popover for a session start and end', () => {
  it('a start returns focus to the opening Volume, without scrolling, when focus was inside', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    const focusOptions: (FocusOptions | undefined)[] = []
    dom.buttons.toolbar.focus = (options?: FocusOptions) => {
      focusOptions.push(options)
      HTMLElement.prototype.focus.call(dom.buttons.toolbar, options)
    }
    popover.toggleFrom('toolbar')
    dom.slider.focus()

    popover.closeForSessionStart()

    expect(popover.state.openedBy).toBeNull()
    expect(document.activeElement).toBe(dom.buttons.toolbar)
    expect(focusOptions).toEqual([{ preventScroll: true }])
  })

  it('a start leaves focus alone when it was outside the popover', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    popover.toggleFrom('toolbar')
    dom.elsewhere.focus()

    popover.closeForSessionStart()

    expect(popover.state.openedBy).toBeNull()
    expect(document.activeElement).toBe(dom.elsewhere)
  })

  it('a start with the popover closed changes nothing', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    const dom = buildDom(popover)
    dom.elsewhere.focus()

    popover.closeForSessionStart()

    expect(popover.state.openedBy).toBeNull()
    expect(document.activeElement).toBe(dom.elsewhere)
  })

  it('an end closes a popover opened from the compact Volume, never one from the toolbar', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    buildDom(popover)
    popover.toggleFrom('toolbar')
    popover.closeIfOpenedBy('compact')
    expect(popover.state.openedBy).toBe('toolbar')

    popover.toggleFrom('compact')
    popover.closeIfOpenedBy('compact')
    expect(popover.state.openedBy).toBeNull()
  })

  it('an opener leaving the page closes a popover it opened', () => {
    const popover = createMixVolumePopover('mix-volume-popover')
    buildDom(popover)
    popover.toggleFrom('compact')

    popover.detachOpener('compact')

    expect(popover.state.openedBy).toBeNull()
    expect(() => popover.toggleFrom('compact')).toThrow(/not mounted/)
  })
})
