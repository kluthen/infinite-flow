/**
 * A stand-in for `@/notation/vexflow-engraver-loader` for the connection sheet's unit specs, which
 * `vi.mock` it with `() => import('<this file>')`: its `loadVexflowEngraver` resolves to a module
 * holding only the font wait and the check-note drawing, each a spy. Instead of VexFlow the drawing
 * puts a bare `svg.staff-svg` carrying the written MIDI note into the target.
 */
import { vi } from 'vitest'

import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** The part of the engraver module the check note uses. */
export type FakeCheckNoteEngraverModule = Pick<
  VexflowEngraverModule,
  'ensureNotationFonts' | 'engraveCheckNote'
>

export const fakeCheckNoteEngraver = {
  ensureNotationFonts: vi.fn<VexflowEngraverModule['ensureNotationFonts']>(),
  engraveCheckNote: vi.fn<VexflowEngraverModule['engraveCheckNote']>(),
} satisfies FakeCheckNoteEngraverModule

export const loadVexflowEngraver = vi.fn<() => Promise<FakeCheckNoteEngraverModule>>()

/** Intent: draw a bare staff SVG tagged with the written note, as the real drawing would fill it. */
function drawFakeCheckNote(target: HTMLElement, writtenMidi: number): void {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'staff-svg')
  svg.setAttribute('data-written-midi', String(writtenMidi))
  target.replaceChildren(svg)
}

/** Intent: put every spy back to its default (fonts ready, a fake drawing) with no calls. */
// @test-link [[rule_controller_transposition_check]]
export function resetFakeCheckNoteEngraver(): void {
  fakeCheckNoteEngraver.ensureNotationFonts.mockReset().mockResolvedValue(undefined)
  fakeCheckNoteEngraver.engraveCheckNote.mockReset().mockImplementation(drawFakeCheckNote)
  loadVexflowEngraver.mockReset().mockResolvedValue(fakeCheckNoteEngraver)
}

resetFakeCheckNoteEngraver()
