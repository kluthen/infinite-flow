/**
 * PhraseScore in the shared system-position size it is given: both reserved positions sized from
 * it, every engraving (Idle and session) drawn in it, the reported layout inputs carrying it, and a
 * new size handled as a changed layout input: reported, the positions re-sized, the staff
 * re-engraved. jsdom has no ResizeObserver, matchMedia or layout, so each is stubbed here; the
 * engraver is the fake one. From the breakpoint up a position is its size times the 1.2 maximum
 * scale: 160 units give 192 px, 170 give 204.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'

import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { SessionStaff } from '@/components/notation/session-staff'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { fakePhraseEngraver, resetFakePhraseEngraver } from './fake-phrase-engraver'

vi.mock('@/notation/vexflow-engraver-loader', () => import('./fake-phrase-engraver'))

const result = buildWorkspaceSessionResult('phrase-score-size', 1)
const PHRASE = transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent))
const WIDTH_PX = 800
const VIEWPORT = { layout: 'one-system', heightBudgetPx: null } as const

const mounted: { unmount: () => void }[] = []

/** Intent: stub what jsdom lacks: ResizeObserver, a wide window's matchMedia, and layout. */
function stubBrowser(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      /** Intent: observe nothing; a test signals resizes through the window instead. */
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

/** Intent: mount PhraseScore in a staff-frame, idle on the phrase, at a reactive size. */
async function mountScore(initialUnits: number | undefined) {
  const units = shallowRef<number | undefined>(initialUnits)
  const session = shallowRef<SessionStaff | null>(null)
  const host = defineComponent({
    setup() {
      return () =>
        h('div', { class: 'staff-frame' }, [
          h(PhraseScore, {
            phrase: PHRASE,
            phraseNumber: 1,
            session: session.value,
            ...(units.value === undefined ? {} : { systemPositionUnits: units.value }),
          }),
        ])
    },
  })
  const wrapper = mount(host, { attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  const score = wrapper.getComponent(PhraseScore)
  /** Intent: both positions' block sizes, top first. */
  const blockSizes = () =>
    (['top', 'bottom'] as const).map(
      (position) =>
        document.body.querySelector<HTMLElement>(`[data-system-position="${position}"]`)!.style
          .blockSize,
    )
  return { score, units, session, blockSizes }
}

beforeEach(() => {
  resetFakePhraseEngraver()
  stubBrowser()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// @test-link [[module_notation_layout_preflight]]
describe('PhraseScore in the shared system-position size', () => {
  it('sizes both positions, engraves and reports in the size it is given', async () => {
    const { score, blockSizes } = await mountScore(170)

    expect(blockSizes()).toEqual(['204px', '204px'])
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledOnce()
    expect(fakePhraseEngraver.engraveWrittenPhrase.mock.calls[0]![5]).toBe(170)
    expect(score.emitted('layout-inputs')).toEqual([
      [{ containerWidthPx: WIDTH_PX, viewport: VIEWPORT, systemPositionUnits: 170 }],
    ])
  })

  it('keeps the built-in size, and reports none, when it is given none', async () => {
    const { score, blockSizes } = await mountScore(undefined)

    expect(blockSizes()).toEqual(['192px', '192px'])
    expect(score.emitted('layout-inputs')).toEqual([
      [{ containerWidthPx: WIDTH_PX, viewport: VIEWPORT }],
    ])
  })

  it('re-sizes, reports and re-engraves when the size changes, and not otherwise', async () => {
    const { score, units, blockSizes } = await mountScore(160)
    expect(blockSizes()).toEqual(['192px', '192px'])

    window.dispatchEvent(new Event('resize'))
    await nextFrame()
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledOnce()

    units.value = 170
    await nextFrame()

    expect(blockSizes()).toEqual(['204px', '204px'])
    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledTimes(2)
    expect(fakePhraseEngraver.engraveWrittenPhrase.mock.calls[1]![5]).toBe(170)
    expect(score.emitted('layout-inputs')!.at(-1)).toEqual([
      { containerWidthPx: WIDTH_PX, viewport: VIEWPORT, systemPositionUnits: 170 },
    ])
  })

  it("re-engraves a session's systems in place in a new size", async () => {
    const { units, session, blockSizes } = await mountScore(160)
    session.value = {
      layout: 'one-system',
      top: { phraseNumber: 1, part: 'whole', phrase: PHRASE },
      bottom: null,
      playhead: null,
    }
    await flushPromises()
    expect(fakePhraseEngraver.engravePhraseSystem).not.toHaveBeenCalled()

    units.value = 200
    await nextFrame()

    expect(blockSizes()).toEqual(['240px', '240px'])
    expect(fakePhraseEngraver.engravePhraseSystem).toHaveBeenCalledOnce()
    expect(fakePhraseEngraver.engravePhraseSystem.mock.calls[0]![6]).toBe(200)
  })
})
