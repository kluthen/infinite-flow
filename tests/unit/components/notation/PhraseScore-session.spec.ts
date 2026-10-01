/**
 * PhraseScore's session mode in jsdom, on a fake engraver: the start that redraws nothing, the
 * refill of one position (fade-out, then a new unit), superseded refills, the in-place re-engrave
 * on a resize, the session staff failure that reaches no Idle report, the return to Idle, the
 * overlays and assistive text per phrase, and the layout inputs that stay the window's. jsdom has
 * no ResizeObserver, matchMedia, layout or Web Animations, so each is stubbed here.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'

import PhraseScore from '@/components/notation/PhraseScore.vue'
import type { SessionStaff, SessionSystem } from '@/components/notation/session-staff'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { describeWrittenPhrase } from '@/domain/notation/score-description'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { NotationError } from '@/notation/notation-error'
import type { StaffLayout, SystemPart } from '@/notation/notation-layout-policy'
import { NO_SCORE_OVERLAYS, type ScoreOverlays } from '@/notation/score-overlays'
import type { PlayheadPosition } from '@/session/rolling-display'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { fakePhraseEngraver, resetFakePhraseEngraver } from './fake-phrase-engraver'

vi.mock('@/notation/vexflow-engraver-loader', () => import('./fake-phrase-engraver'))

/** Real written phrases, one per phrase number used below. */
const PHRASES: readonly WrittenPhrase[] = [1, 2, 3, 4, 5].map((seed) => {
  const result = buildWorkspaceSessionResult(`phrase-score-session-${seed}`, seed)
  return transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent))
})

/** Intent: the written phrase standing for phrase `n`. */
function phrase(n: number): WrittenPhrase {
  return PHRASES[n - 1]!
}

/** Intent: a session system showing `part` of phrase `n`. */
function system(n: number, part: SystemPart): SessionSystem {
  return { phraseNumber: n, part, phrase: phrase(n) }
}

/** Intent: a session staff in `layout`. */
function staff(
  layout: StaffLayout,
  top: SessionSystem | null,
  bottom: SessionSystem | null,
  playhead: PlayheadPosition | null = null,
): SessionStaff {
  return { layout, top, bottom, playhead }
}

/** The window the stubs answer for: its width, and whether it is below the breakpoint. */
const windowState = { widthPx: 800, phone: false }
/** The frame's style: below the breakpoint its maximum block size is the 300 px height budget. */
const FRAME_STYLE =
  'max-block-size: 300px; padding-block-start: 0px; padding-block-end: 0px; ' +
  'border-block-start-width: 0px; border-block-end-width: 0px'
/** The finished-promise resolver of every unit fading now, by unit. */
const fades = new Map<Element, () => void>()
/** Whether a fading unit has an animation at all (false: reduced motion). */
let fadesAnimate = true
/** The scores mounted by the current test, unmounted after it. */
const mounted: { unmount: () => void }[] = []

/** Intent: stub what jsdom lacks: ResizeObserver, matchMedia, layout and Web Animations. */
function stubBrowser(): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  )
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: windowState.phone,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => windowState.widthPx)
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: function (this: Element) {
      if (!fadesAnimate || !this.classList.contains('is-fading-out')) return []
      if (!fades.has(this)) {
        let resolve: () => void = () => {}
        const finished = new Promise<void>((done) => (resolve = done))
        fades.set(this, resolve)
        return [{ finished }]
      }
      return []
    },
  })
}

/** Intent: let a fading unit's fade-out animation finish, then settle what waited on it. */
async function finishFade(unit: Element): Promise<void> {
  const resolve = fades.get(unit)
  if (resolve === undefined) throw new Error('That unit is not fading.')
  resolve()
  await flushPromises()
}

/** Intent: wait for the next animation frame and settle the promises it started. */
async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await flushPromises()
}

/** Intent: mount PhraseScore inside a staff-frame, idle on phrase 1, with reactive props. */
async function mountScore() {
  const session = shallowRef<SessionStaff | null>(null)
  const overlays = shallowRef<ScoreOverlays>(NO_SCORE_OVERLAYS)
  const host = defineComponent({
    setup() {
      return () =>
        h('div', { class: 'staff-frame', style: FRAME_STYLE }, [
          h(PhraseScore, {
            phrase: phrase(1),
            phraseNumber: 1,
            session: session.value,
            overlays: overlays.value,
          }),
        ])
    },
  })
  const wrapper = mount(host, { attachTo: document.body })
  mounted.push(wrapper)
  await flushPromises()
  const score = wrapper.getComponent(PhraseScore)
  /** Intent: the units in a position, fading ones included. */
  const units = (position: 'top' | 'bottom') =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>(
        `[data-system-position="${position}"] > .staff-content`,
      ),
    )
  /** Intent: the one settled unit in a position, crashing if there is not exactly one. */
  const unit = (position: 'top' | 'bottom') => {
    const settled = units(position).filter((each) => !each.classList.contains('is-fading-out'))
    if (settled.length !== 1) throw new Error(`${position} holds ${settled.length} settled units.`)
    return settled[0]!
  }
  /** Intent: set the session prop and settle what it started. */
  const setSession = async (next: SessionStaff | null) => {
    session.value = next
    await flushPromises()
  }
  return { wrapper, score, units, unit, setSession, overlays }
}

/** Intent: the phrase numbers the session engraver drew, in call order. */
function systemsEngraved(): string[] {
  return fakePhraseEngraver.engravePhraseSystem.mock.calls.map(
    ([, , phraseNumber, part]) => `${phraseNumber}:${part}`,
  )
}

beforeEach(() => {
  windowState.widthPx = 800
  windowState.phone = false
  fades.clear()
  fadesAnimate = true
  resetFakePhraseEngraver()
  stubBrowser()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
})

// @test-link [[module_session_rolling_display]]
describe('PhraseScore in session mode', () => {
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it.each([
    ['one-system', false, 'whole', null],
    ['split', true, 'opening', 'closing'],
  ] as const)(
    'a session start in the %s layout Idle shows redraws nothing',
    async (layout, phone, topPart, bottomPart) => {
      windowState.phone = phone
      const { score, unit, units, setSession } = await mountScore()
      expect(score.emitted('engraved')).toHaveLength(1)
      const top = unit('top')
      const topSvg = top.querySelector('svg')
      expect(top.dataset.phraseNumber).toBe('1')
      expect(top.dataset.systemPart).toBe(topPart)
      const bottom = bottomPart === null ? null : unit('bottom')
      expect(bottom?.dataset.systemPart ?? null).toBe(bottomPart)

      await setSession(
        staff(layout, system(1, topPart), bottomPart === null ? null : system(1, bottomPart)),
      )
      await nextFrame()

      expect(fakePhraseEngraver.engravePhraseSystem).not.toHaveBeenCalled()
      expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledOnce()
      expect(unit('top')).toBe(top)
      expect(unit('top').querySelector('svg')).toBe(topSvg)
      if (bottom === null) expect(units('bottom')).toHaveLength(0)
      else expect(unit('bottom')).toBe(bottom)
      expect(score.emitted('engraved')).toHaveLength(1)
    },
  )

  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('a session start after the inputs changed re-engraves in place, with no fade', async () => {
    const { score, unit, setSession } = await mountScore()
    const top = unit('top')
    windowState.widthPx = 640

    await setSession(staff('one-system', system(1, 'whole'), null))

    expect(systemsEngraved()).toEqual(['1:whole'])
    expect(fakePhraseEngraver.engravePhraseSystem.mock.calls[0]![4]).toBe(640)
    expect(unit('top')).toBe(top)
    expect(top.classList.contains('is-fading-out')).toBe(false)
    expect(score.emitted('engraved')).toHaveLength(1)
  })

  it('refills one position: the old unit fades out, then a new unit enters', async () => {
    const { unit, units, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), null))
    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))
    // A blank position has nothing to fade: phrase 2 enters at once.
    const bottom = unit('bottom')
    expect(bottom.dataset.phraseNumber).toBe('2')
    expect(bottom.dataset.systemPart).toBe('whole')
    const top = unit('top')

    await setSession(
      staff('one-system', system(3, 'whole'), system(2, 'whole'), {
        phraseNumber: 2,
        measureIndex: 0,
      }),
    )

    expect(top.classList.contains('is-fading-out')).toBe(true)
    expect(units('top')).toEqual([top])
    expect(systemsEngraved()).toEqual(['2:whole', '3:whole'])
    await finishFade(top)
    expect(top.isConnected).toBe(false)
    const refilled = unit('top')
    expect(refilled).not.toBe(top)
    expect(refilled.dataset.phraseNumber).toBe('3')
    expect(refilled.dataset.systemPart).toBe('whole')
    expect(refilled.classList.contains('is-fading-out')).toBe(false)
    expect(unit('bottom')).toBe(bottom)
    expect(systemsEngraved()).toEqual(['2:whole', '3:whole'])
  })

  it('a refill under reduced motion removes the old unit at once', async () => {
    fadesAnimate = false
    const { unit, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))
    const top = unit('top')

    await setSession(staff('one-system', system(3, 'whole'), system(2, 'whole')))

    expect(top.isConnected).toBe(false)
    expect(unit('top').dataset.phraseNumber).toBe('3')
  })

  it('a blank slot leaves the position empty once its fade finishes', async () => {
    const { unit, units, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), null))
    const top = unit('top')

    await setSession(staff('one-system', null, null))

    expect(units('top')).toEqual([top])
    await finishFade(top)
    expect(units('top')).toHaveLength(0)
    expect(fakePhraseEngraver.engravePhraseSystem).not.toHaveBeenCalled()
  })

  it('a newer refill supersedes one still under way', async () => {
    const { unit, units, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), null))
    const top = unit('top')

    await setSession(staff('one-system', system(3, 'whole'), null))
    await setSession(staff('one-system', system(5, 'whole'), null))
    await finishFade(top)

    expect(units('top')).toHaveLength(1)
    expect(unit('top').dataset.phraseNumber).toBe('5')
  })

  it('a resize re-engraves every shown system in place, with no fade', async () => {
    const { score, unit, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))
    const top = unit('top')
    const bottom = unit('bottom')
    fakePhraseEngraver.engravePhraseSystem.mockClear()

    windowState.widthPx = 700
    window.dispatchEvent(new Event('resize'))
    await nextFrame()

    expect(systemsEngraved()).toEqual(['1:whole', '2:whole'])
    expect(fakePhraseEngraver.engravePhraseSystem.mock.calls.every((call) => call[4] === 700)).toBe(
      true,
    )
    expect(unit('top')).toBe(top)
    expect(unit('bottom')).toBe(bottom)
    expect(top.dataset.phraseNumber).toBe('1')
    expect(bottom.dataset.phraseNumber).toBe('2')
    expect(score.find('.is-fading-out').exists()).toBe(false)
    expect(score.emitted('engraved')).toHaveLength(1)
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('a failed re-engrave reports only a session staff failure and keeps the staff', async () => {
    const { score, unit, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))
    const topSvg = unit('top').querySelector('svg')
    const bottomSvg = unit('bottom').querySelector('svg')
    const failure = new NotationError('notation_notes_too_wide', 'too wide', {})
    fakePhraseEngraver.engravePhraseSystem.mockImplementationOnce(() => {
      throw failure
    })

    windowState.widthPx = 500
    window.dispatchEvent(new Event('resize'))
    await nextFrame()

    expect(score.emitted('session-staff-failed')).toEqual([[failure]])
    expect(score.emitted('notation-error')).toBeUndefined()
    expect(score.emitted('engraved')).toHaveLength(1)
    // Nothing is swapped in unless every system re-engraved.
    expect(unit('top').querySelector('svg')).toBe(topSvg)
    expect(unit('bottom').querySelector('svg')).toBe(bottomSvg)
    expect(score.attributes('data-notation-state')).toBe('ready')
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it('a failed refill reports only a session staff failure', async () => {
    const { score, unit, units, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), null))
    const failure = new NotationError('notation_no_room', 'no room', {})
    fakePhraseEngraver.engravePhraseSystem.mockImplementationOnce(() => {
      throw failure
    })

    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))

    expect(score.emitted('session-staff-failed')).toEqual([[failure]])
    expect(score.emitted('notation-error')).toBeUndefined()
    expect(score.emitted('engraved')).toHaveLength(1)
    expect(units('bottom')).toHaveLength(0)
    expect(unit('top').dataset.phraseNumber).toBe('1')
    expect(score.attributes('data-notation-state')).toBe('ready')
  })

  it('leaving session mode drops refills under way and re-engraves the Idle phrase', async () => {
    const { score, unit, units, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), system(2, 'whole')))
    const top = unit('top')
    await setSession(staff('one-system', system(3, 'whole'), system(2, 'whole')))
    expect(top.classList.contains('is-fading-out')).toBe(true)

    await setSession(null)
    expect(top.isConnected).toBe(false)
    await nextFrame()

    expect(fakePhraseEngraver.engraveWrittenPhrase).toHaveBeenCalledTimes(2)
    expect(score.emitted('engraved')).toHaveLength(2)
    expect(units('top')).toHaveLength(1)
    expect(unit('top').dataset.phraseNumber).toBe('1')
    expect(unit('top').dataset.systemPart).toBe('whole')
    expect(units('bottom')).toHaveLength(0)
    fades.forEach((resolve) => resolve())
    await flushPromises()
    expect(units('top')).toHaveLength(1)
    expect(unit('top').dataset.phraseNumber).toBe('1')
  })

  // @test-link [[module_session_rolling_display]]
  it('leaving session mode removes the playhead band at once', async () => {
    const { score, setSession } = await mountScore()
    await setSession(
      staff('one-system', system(1, 'whole'), system(2, 'whole'), {
        phraseNumber: 2,
        measureIndex: 0,
      }),
    )
    expect(document.body.querySelector('rect.playhead-band')).not.toBeNull()

    await setSession(null)

    // Before any frame runs, so before the Idle re-engrave.
    expect(score.emitted('engraved')).toHaveLength(1)
    expect(document.body.querySelector('rect.playhead-band')).toBeNull()
  })

  // @test-link [[module_notation_note_identity_overlays]]
  it('draws the playhead band only on the phrase that owns the playhead', async () => {
    windowState.phone = true
    const { unit, setSession, overlays } = await mountScore()
    const acknowledged: ExpectedNoteIdentity[] = [
      { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
      { phraseNumber: 1, measureIndex: 2, eventIndex: 0 },
    ]
    overlays.value = { ...NO_SCORE_OVERLAYS, acknowledged }
    await setSession(
      staff('split', system(1, 'opening'), system(1, 'closing'), {
        phraseNumber: 1,
        measureIndex: 2,
      }),
    )
    expect(unit('top').querySelector('.playhead-band')).toBeNull()
    expect(unit('bottom').querySelector('.playhead-band')).not.toBeNull()
    expect(unit('top').querySelectorAll('.note-ack')).toHaveLength(1)
    expect(unit('bottom').querySelectorAll('.note-ack')).toHaveLength(1)

    const opening = unit('top')
    await setSession(
      staff('split', system(2, 'opening'), system(1, 'closing'), {
        phraseNumber: 1,
        measureIndex: 3,
      }),
    )
    // The fading system keeps no mark; the band stays on phrase 1's closing.
    expect(opening.querySelector('.playhead-band, .note-ack')).toBeNull()
    await finishFade(opening)
    expect(unit('top').dataset.phraseNumber).toBe('2')
    expect(unit('top').querySelector('.playhead-band')).toBeNull()
    expect(unit('bottom').querySelector('.playhead-band')).not.toBeNull()

    await setSession(
      staff('split', system(2, 'opening'), system(1, 'closing'), {
        phraseNumber: 2,
        measureIndex: 0,
      }),
    )
    expect(unit('top').querySelector('.playhead-band')).not.toBeNull()
    expect(unit('bottom').querySelector('.playhead-band')).toBeNull()
    expect(unit('bottom').querySelectorAll('.note-ack')).toHaveLength(1)
  })

  it('names each phrase on screen once and describes the playhead phrase', async () => {
    windowState.phone = true
    const { score, unit, setSession } = await mountScore()
    const description = () => score.get('.score-description p').text()
    await setSession(staff('split', system(1, 'opening'), system(1, 'closing')))
    const summary1 = describeWrittenPhrase(phrase(1)).summary
    const summary2 = describeWrittenPhrase(phrase(2)).summary
    expect(unit('top').querySelector('svg')?.getAttribute('aria-label')).toBe(summary1)
    expect(unit('bottom').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(description()).toBe(summary1)

    const opening = unit('top')
    await setSession(
      staff('split', system(2, 'opening'), system(1, 'closing'), {
        phraseNumber: 1,
        measureIndex: 2,
      }),
    )
    await finishFade(opening)
    const top = unit('top').querySelector('svg')!
    const bottom = unit('bottom').querySelector('svg')!
    expect(top.getAttribute('aria-label')).toBe(summary2)
    expect(bottom.getAttribute('aria-label')).toBe(summary1)
    expect(bottom.hasAttribute('aria-hidden')).toBe(false)
    expect(description()).toBe(summary1)
    const descriptionId = score.get('.score-description').attributes('id')
    expect(bottom.getAttribute('aria-describedby')).toBe(descriptionId)
    expect(top.hasAttribute('aria-describedby')).toBe(false)

    await setSession(
      staff('split', system(2, 'opening'), system(1, 'closing'), {
        phraseNumber: 2,
        measureIndex: 0,
      }),
    )
    expect(description()).toBe(summary2)
    expect(top.getAttribute('aria-describedby')).toBe(descriptionId)
  })

  // @test-link [[rule_session_layout_fixed_at_start]]
  it("reports the window's layout inputs while engraving in the held layout", async () => {
    const { score, setSession } = await mountScore()
    await setSession(staff('one-system', system(1, 'whole'), null))
    windowState.phone = true
    windowState.widthPx = 900

    window.dispatchEvent(new Event('resize'))
    await nextFrame()

    expect(score.emitted('layout-inputs')!.at(-1)).toEqual([
      { containerWidthPx: 900, viewport: { layout: 'split', heightBudgetPx: 300 } },
    ])
    const [call] = fakePhraseEngraver.engravePhraseSystem.mock.calls
    expect(call![3]).toBe('whole')
    expect(call![5]).toEqual({ layout: 'one-system', heightBudgetPx: 300 })
  })
})
