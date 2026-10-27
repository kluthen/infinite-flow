/**
 * Jam's Idle staff over a stand-in engraver: `staff-frame staff-jam` with the empty system in the
 * top position's one `staff-content` unit and the instruction in the bottom one, both positions
 * sized as the session staff's; a change of key, collection or instrument redraws the empty system
 * in the same unit (so no entrance fade plays), the image named as a phrase's summary names its
 * staff and renamed silently on each redraw; no room shows the no-room sentence in
 * `staff-no-room`; a failure shows the notation error in `staff-error`, and `retryNotation()`
 * engraves again, loading the engraver again after a failed load. Each change of what the staff
 * shows is reported once through `staff-state`. jsdom has no ResizeObserver, matchMedia or layout,
 * so each is stubbed; from the breakpoint up a position is 160 units at the 1.2 maximum scale.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import JamStaff from '@/jam/JamStaff.vue'
import type { EmptySystemEngraver } from '@/jam/empty-system-engraving'
import type { JamStaffProps } from '@/jam/jam-view-types'
import { NotationError } from '@/notation/notation-error'

const SVG_NS = 'http://www.w3.org/2000/svg'
const WIDTH_PX = 800

const engraving = vi.hoisted(() => ({
  /** The stand-in engraver's next outcomes, oldest first; an empty list engraves. */
  outcomes: [] as ('engraved' | 'no_room' | 'failed')[],
  /** How many loads of the engraver failed before one succeeds. */
  failedLoads: 0,
  loads: 0,
}))

/** Intent: the stand-in engraver: a bare `svg.staff-svg` in the host, or the outcome queued. */
const engraveEmptySystem = vi.fn<EmptySystemEngraver>((host) => {
  const outcome = engraving.outcomes.shift() ?? 'engraved'
  if (outcome === 'no_room') return { kind: 'no_room', cause: 'too_narrow' }
  if (outcome === 'failed') {
    throw new NotationError('notation_engraving_failed', 'VexFlow engraving failed: boom', {})
  }
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'staff-svg')
  host.appendChild(svg)
  return { kind: 'engraved', svg, staffSpacePx: 12, positionBlockPx: 192 }
})

vi.mock('@/jam/empty-system-engraving', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/jam/empty-system-engraving')>()),
  loadEmptySystemEngraver: () => {
    engraving.loads += 1
    if (engraving.failedLoads > 0) {
      engraving.failedLoads -= 1
      return Promise.reject(
        new NotationError('notation_engraving_failed', 'Failed to load the module', {}),
      )
    }
    return Promise.resolve(engraveEmptySystem)
  },
}))

const D_DORIAN: JamStaffProps = {
  tonalCenter: 'D',
  collection: 'Dorian',
  instrumentProfileId: 'bb-tenor',
  myInstrument: null,
  systemPositionUnits: 160,
}

/** Intent: stub what jsdom lacks: ResizeObserver, a wide window's matchMedia, and layout. */
function stubBrowser(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      /** Intent: observe nothing; a test changes the settings instead. */
      observe(): void {}
      /** Intent: nothing to stop observing. */
      disconnect(): void {}
    },
  )
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => WIDTH_PX)
}

/** Intent: wait for the next animation frame and settle the promises it started. */
async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await flushPromises()
}

/** Intent: mount Jam's staff on `props` and let its first engraving settle. */
async function mountStaff(props: JamStaffProps = D_DORIAN) {
  const wrapper = mount(JamStaff, { props, attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  engraving.outcomes = []
  engraving.failedLoads = 0
  engraving.loads = 0
  engraveEmptySystem.mockClear()
  stubBrowser()
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// @test-link [[rule_jam_idle_shows_no_phrase]]
describe("Jam's Idle staff", () => {
  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('shows the empty system in the top position and the instruction in the bottom one', async () => {
    const wrapper = await mountStaff()
    const frame = wrapper.get('.staff-frame')
    expect(frame.classes()).toContain('staff-jam')
    expect(frame.attributes('aria-labelledby')).toBe('score-panel-title')
    const units = wrapper.findAll('[data-system-position="top"] > .staff-content')
    expect(units).toHaveLength(1)
    const svg = units[0]!.get('svg.staff-svg')
    expect(svg.attributes('aria-hidden')).toBeUndefined()
    expect(svg.attributes('aria-label')).toBe(
      'Empty staff, treble clef, key signature no sharps or flats (D Dorian), 4/4 time.',
    )
    expect(wrapper.get('[data-system-position="bottom"] > .jam-instruction').text()).toBe(
      'After the count-in, play your doodle: one to four measures. The app continues it.',
    )
    for (const position of wrapper.findAll('[data-system-position]')) {
      expect((position.element as HTMLElement).style.blockSize).toBe('192px')
    }
    const [, staff, width, viewport, units160] = engraveEmptySystem.mock.calls[0]!
    expect(staff.rangeInClef).toEqual({
      writtenRange: { minMidi: 60, maxMidi: 84 },
      clef: 'treble',
    })
    expect(staff.signature.count).toBe(0)
    expect([width, viewport, units160]).toEqual([
      WIDTH_PX,
      { layout: 'one-system', heightBudgetPx: null },
      160,
    ])
    expect(wrapper.emitted('staff-state')).toEqual([['shown']])
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('redraws the empty system in the same unit on a change of key, collection or instrument', async () => {
    const wrapper = await mountStaff()
    const unit = wrapper.get('.staff-content').element

    await wrapper.setProps({ tonalCenter: 'E' })
    await nextFrame()
    await wrapper.setProps({ collection: 'Locrian' })
    await nextFrame()
    await wrapper.setProps({ instrumentProfileId: 'c-keyboard' })
    await nextFrame()

    expect(engraveEmptySystem).toHaveBeenCalledTimes(4)
    const signatures = engraveEmptySystem.mock.calls.map(([, staff]) => staff.signature)
    // E Dorian: two sharps; E Locrian: one flat.
    expect(signatures.map(({ accidental, count }) => [accidental, count])).toEqual([
      [null, 0],
      ['sharp', 2],
      ['flat', 1],
      ['flat', 1],
    ])
    expect(engraveEmptySystem.mock.calls[3]![1].rangeInClef.writtenRange).toEqual({
      minMidi: 48,
      maxMidi: 72,
    })
    expect(wrapper.get('.staff-content').element).toBe(unit)
    expect(unit.querySelectorAll('svg')).toHaveLength(1)
    expect(wrapper.emitted('staff-state')).toEqual([['shown']])
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('renames the empty system silently on a redraw, a key sharing the signature included', async () => {
    const wrapper = await mountStaff()
    /** Intent: the shown empty system's accessible name. */
    const label = () => wrapper.get('.staff-content svg.staff-svg').attributes('aria-label')

    // D Dorian and C Ionian share a signature, not a name.
    await wrapper.setProps({ tonalCenter: 'C', collection: 'Ionian' })
    await nextFrame()
    expect(engraveEmptySystem).toHaveBeenCalledTimes(2)
    expect(label()).toBe(
      'Empty staff, treble clef, key signature no sharps or flats (C Ionian), 4/4 time.',
    )

    await wrapper.setProps({ tonalCenter: 'A#' })
    await nextFrame()
    expect(label()).toBe(
      'Empty staff, treble clef, key signature 2 flats (B flat Ionian), 4/4 time.',
    )
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('shows the no-room sentence instead of the empty system when the window has no room', async () => {
    engraving.outcomes = ['no_room']
    const wrapper = await mountStaff()
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-no-room')
    expect(wrapper.get('.staff-frame').classes()).not.toContain('staff-jam')
    expect(wrapper.find('.staff-content').exists()).toBe(false)
    expect(wrapper.find('.jam-instruction').exists()).toBe(false)
    expect(wrapper.get('.room-notice .room-notice-wide').text()).toBe(
      'The staff needs more room. Make the window larger.',
    )
    expect(wrapper.get('.room-notice .room-notice-narrow').text()).toBe(
      'This screen is too small to show the staff.',
    )
    expect(wrapper.emitted('staff-state')).toEqual([['no-room']])
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('shows a notation error a retry cures, and redraws on retryNotation()', async () => {
    engraving.outcomes = ['failed']
    const wrapper = await mountStaff()
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-error')
    expect(wrapper.get('.inline-alert.alert-error').text()).toBe(
      'Notation error: VexFlow engraving failed: boom',
    )
    expect(wrapper.find('.staff-content').exists()).toBe(false)

    wrapper.vm.retryNotation()
    await nextFrame()
    expect(wrapper.get('.staff-frame').classes()).toContain('staff-jam')
    expect(wrapper.find('.inline-alert').exists()).toBe(false)
    expect(wrapper.find('.staff-content svg').exists()).toBe(true)
    expect(wrapper.emitted('staff-state')).toEqual([['notation-error'], ['shown']])
  })

  // @test-link [[rule_jam_idle_shows_no_phrase]]
  it('loads the engraver again on a retry after its load failed', async () => {
    engraving.failedLoads = 1
    const wrapper = await mountStaff()
    expect(wrapper.get('.inline-alert.alert-error').text()).toBe(
      'Notation error: Failed to load the module',
    )

    wrapper.vm.retryNotation()
    await nextFrame()
    expect(engraving.loads).toBe(2)
    expect(engraveEmptySystem).toHaveBeenCalledOnce()
    expect(wrapper.emitted('staff-state')).toEqual([['notation-error'], ['shown']])
  })
})
