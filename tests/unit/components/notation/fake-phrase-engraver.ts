/**
 * A stand-in for `@/notation/vexflow-engraver-loader` for PhraseScore's unit specs, which
 * `vi.mock` it with `() => import('<this file>')`: its `loadVexflowEngraver` resolves to a module
 * holding the font wait and the two drawing functions PhraseScore calls, each a spy. Instead of
 * VexFlow they draw a bare `svg.staff-svg` per system with one `g.measure-slot` per measure (its
 * band rectangle recorded) holding one tagged notehead, enough for the score overlays to draw on.
 * A whole phrase's engraving also reports measure anchors laid out by `fakeMeasureAnchors`.
 */
import { vi } from 'vitest'

import type { MeasureIndex } from '@/domain/events/measure'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { MeasureAnchors } from '@/notation/engraving-anchors'
import type { StaffViewport, SystemPart } from '@/notation/notation-layout-policy'
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** The measures each system part draws. */
const PART_MEASURES: Readonly<Record<SystemPart, readonly MeasureIndex[]>> = {
  whole: [0, 1, 2, 3],
  opening: [0, 1],
  closing: [2, 3],
}

/** The part of the engraver module PhraseScore uses. */
export type FakePhraseEngraverModule = Pick<
  VexflowEngraverModule,
  'ensureNotationFonts' | 'engraveWrittenPhrase' | 'engravePhraseSystem'
>

/** Intent: one fake system SVG of phrase `phraseNumber`, drawing the given measures. */
function fakeSystemSvg(phraseNumber: number, part: SystemPart): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'staff-svg')
  for (const measureIndex of PART_MEASURES[part]) {
    const slot = document.createElementNS(SVG_NS, 'g')
    slot.setAttribute('class', 'measure-slot')
    slot.setAttribute('data-measure-index', String(measureIndex))
    for (const name of ['x', 'y', 'width', 'height']) slot.setAttribute(`data-band-${name}`, '1')
    const head = document.createElementNS(SVG_NS, 'path')
    head.setAttribute('data-note-id', `${phraseNumber}:${measureIndex}:0`)
    head.setAttribute('data-note-part', 'notehead')
    slot.appendChild(head)
    svg.appendChild(slot)
  }
  return svg
}

/** A fake measure's inline size, in CSS px; its first one starts at FAKE_SYSTEM_START_PX. */
export const FAKE_MEASURE_PX = 200
export const FAKE_SYSTEM_START_PX = 20

/**
 * Intent: the anchors of a fake engraving: each system's measures side by side from
 * FAKE_SYSTEM_START_PX, FAKE_MEASURE_PX wide, each event 10 px into its measure plus its start
 * tick's share of 180 px, and each barline at its measure's end.
 */
export function fakeMeasureAnchors(phrase: WrittenPhrase, parts: readonly SystemPart[]) {
  return parts.flatMap((part, systemIndex) =>
    PART_MEASURES[part].map((measureIndex, local): MeasureAnchors => {
      const startPx = FAKE_SYSTEM_START_PX + local * FAKE_MEASURE_PX
      return {
        measureIndex,
        systemIndex: systemIndex === 0 ? 0 : 1,
        eventStartsPx: phrase.measures[measureIndex]!.events.map(
          (event) => startPx + 10 + (180 * event.startTick) / 16,
        ),
        barlinePx: startPx + FAKE_MEASURE_PX,
      }
    }),
  )
}

/** Intent: the fixed geometry every fake engraving reports. */
function fakeGeometry(viewport: StaffViewport) {
  return {
    staffSpacePx: 10,
    widthPx: 100,
    heightPx: 80,
    positionBlockPx: 80,
    requiredUnits: viewport.layout === 'split' ? 200 : 400,
    measureBoxes: [],
    measureAnchors: [],
  }
}

/** Intent: draw a whole phrase as the real engraver lays it out: one system, or two halves. */
function fakeEngraveWrittenPhrase(
  ...[targets, phrase, phraseNumber, , viewport]: Parameters<
    VexflowEngraverModule['engraveWrittenPhrase']
  >
): ReturnType<VexflowEngraverModule['engraveWrittenPhrase']> {
  const parts: readonly SystemPart[] =
    viewport.layout === 'split' ? ['opening', 'closing'] : ['whole']
  targets.forEach((target) => target.replaceChildren())
  const svgs = parts.map((part, index) => {
    const svg = fakeSystemSvg(phraseNumber, part)
    targets[index]!.appendChild(svg)
    return svg
  })
  return {
    svgs,
    systemCount: parts.length === 2 ? 2 : 1,
    ...fakeGeometry(viewport),
    measureAnchors: fakeMeasureAnchors(phrase, parts),
  }
}

/** Intent: draw one system part of a phrase into its host, as the real engraver does. */
function fakeEngravePhraseSystem(
  host: HTMLElement,
  _phrase: WrittenPhrase,
  phraseNumber: number,
  part: SystemPart,
  _containerWidthPx: number,
  viewport: StaffViewport,
): ReturnType<VexflowEngraverModule['engravePhraseSystem']> {
  if ((part === 'whole') !== (viewport.layout === 'one-system')) {
    throw new Error(`The ${part} system part is not drawn in the ${viewport.layout} layout.`)
  }
  const svg = fakeSystemSvg(phraseNumber, part)
  host.replaceChildren(svg)
  return { svg, ...fakeGeometry(viewport) }
}

export const fakePhraseEngraver = {
  ensureNotationFonts: vi.fn<VexflowEngraverModule['ensureNotationFonts']>(),
  engraveWrittenPhrase: vi.fn<VexflowEngraverModule['engraveWrittenPhrase']>(),
  engravePhraseSystem: vi.fn<VexflowEngraverModule['engravePhraseSystem']>(),
} satisfies FakePhraseEngraverModule

export const loadVexflowEngraver = vi.fn<() => Promise<FakePhraseEngraverModule>>()

/** Intent: put every spy back to drawing fake systems, with no calls recorded. */
export function resetFakePhraseEngraver(): void {
  fakePhraseEngraver.ensureNotationFonts.mockReset().mockResolvedValue(undefined)
  fakePhraseEngraver.engraveWrittenPhrase.mockReset().mockImplementation(fakeEngraveWrittenPhrase)
  fakePhraseEngraver.engravePhraseSystem.mockReset().mockImplementation(fakeEngravePhraseSystem)
  loadVexflowEngraver.mockReset().mockResolvedValue(fakePhraseEngraver)
}

resetFakePhraseEngraver()
