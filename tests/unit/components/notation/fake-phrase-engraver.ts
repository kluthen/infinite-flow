/**
 * A stand-in for `@/notation/vexflow-engraver-loader` for PhraseScore's unit specs, which
 * `vi.mock` it with `() => import('<this file>')`: its `loadVexflowEngraver` resolves to a module
 * holding the font wait and the two drawing functions PhraseScore calls, each a spy. Instead of
 * VexFlow they draw a bare `svg.staff-svg` per system with one `g.measure-slot` per measure (its
 * band rectangle recorded) holding one tagged notehead, enough for the score overlays to draw on.
 */
import { vi } from 'vitest'

import type { MeasureIndex } from '@/domain/events/measure'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
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

/** Intent: the fixed geometry every fake engraving reports. */
function fakeGeometry(viewport: StaffViewport) {
  return {
    staffSpacePx: 10,
    widthPx: 100,
    heightPx: 80,
    positionBlockPx: 80,
    requiredUnits: viewport.layout === 'split' ? 200 : 400,
    measureBoxes: [],
  }
}

/** Intent: draw a whole phrase as the real engraver lays it out: one system, or two halves. */
function fakeEngraveWrittenPhrase(
  ...[targets, , phraseNumber, , viewport]: Parameters<
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
  return { svgs, systemCount: parts.length === 2 ? 2 : 1, ...fakeGeometry(viewport) }
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
