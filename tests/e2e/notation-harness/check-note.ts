/**
 * The notation harness's check-note hook, published as `window.__notationCheckNote`: it draws a
 * written MIDI note with the real engraver module's `engraveCheckNote` (fonts loaded) into one
 * `.check-note` host kept on the page, styled by the app's own stylesheet as in the connection
 * sheet, and returns a serialisable snapshot of what the host holds, so a spec can assert on the
 * drawing and run axe on the host.
 */
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import { NotationError } from '@/notation/notation-error'

/** Intent: the page's one `.check-note` host, created on first use and kept for axe and screenshots. */
function checkNoteHost(): HTMLElement {
  const existing = document.getElementById('check-note-host')
  if (existing) return existing
  const host = document.createElement('div')
  host.id = 'check-note-host'
  host.className = 'check-note'
  document.body.append(host)
  return host
}

/** Intent: whether the inner box lies inside the outer one, allowing sub-pixel rounding. */
function boxInside(inner: DOMRect, outer: DOMRect): boolean {
  const epsilon = 0.5
  return (
    inner.left >= outer.left - epsilon &&
    inner.right <= outer.right + epsilon &&
    inner.top >= outer.top - epsilon &&
    inner.bottom <= outer.bottom + epsilon
  )
}

/** Intent: the host's content box: its border box less its borders and padding. */
function contentBox(host: HTMLElement): DOMRect {
  const style = getComputedStyle(host)
  const box = host.getBoundingClientRect()
  const left = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
  const right = parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight)
  const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop)
  const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom)
  return new DOMRect(
    box.left + left,
    box.top + top,
    box.width - left - right,
    box.height - top - bottom,
  )
}

/** Intent: snapshot the host's drawn check note in a serialisable form; crash if nothing was drawn. */
function checkNoteSnapshot(host: HTMLElement): NotationHarnessCheckNoteSnapshot {
  const svg = host.querySelector('svg')
  if (!svg) throw new Error('The check note host holds no SVG.')
  const texts = [...svg.querySelectorAll('g.vf-notehead > text')]
  const notehead = texts[0]
  if (!notehead) throw new Error('The check note has no notehead glyph.')
  const rendered = svg.getBoundingClientRect()
  return {
    svgCount: host.querySelectorAll('svg').length,
    hostChildCount: host.childElementCount,
    className: svg.getAttribute('class'),
    role: svg.getAttribute('role'),
    ariaLabel: svg.getAttribute('aria-label'),
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox'),
    clefCount: svg.querySelectorAll('g.vf-clef').length,
    timeSignatureCount: svg.querySelectorAll('g.vf-timesignature').length,
    keySignatureCount: svg.querySelectorAll('g.vf-keysignature').length,
    staveNoteCount: svg.querySelectorAll('g.vf-stavenote').length,
    noteheadGroupTexts: texts.map((text) => text.textContent ?? ''),
    noteheadY: Number(notehead.getAttribute('y')),
    ledgerLineStrokes: [...svg.querySelectorAll('g.vf-stavenote > path')].map((path) =>
      path.getAttribute('stroke'),
    ),
    fitsHost: boxInside(rendered, contentBox(host)),
    renderedWidthPx: rendered.width,
    renderedHeightPx: rendered.height,
    hostColour: getComputedStyle(host).color,
    noteheadFill: getComputedStyle(notehead).fill,
  }
}

/** Intent: describe a thrown value in a serialisable form, keeping a NotationError's code. */
function thrownSnapshot(error: unknown): NotationHarnessThrown {
  return {
    name: error instanceof Error ? error.name : typeof error,
    code: error instanceof NotationError ? error.code : null,
    message: error instanceof Error ? error.message : String(error),
  }
}

/** Intent: build the `window.__notationCheckNote` hook on the engraver `readyEngraver` loads. */
// @test-link [[rule_controller_transposition_check]]
export function notationCheckNoteHook(
  readyEngraver: () => Promise<VexflowEngraverModule>,
): NotationHarnessCheckNote {
  return {
    async engrave(writtenMidi) {
      const engraver = await readyEngraver()
      const host = checkNoteHost()
      engraver.engraveCheckNote(host, writtenMidi)
      return checkNoteSnapshot(host)
    },
    async engraveFailure(writtenMidi) {
      const engraver = await readyEngraver()
      const host = checkNoteHost()
      const previous = host.querySelector('svg')
      let thrown: NotationHarnessThrown | null = null
      try {
        engraver.engraveCheckNote(host, writtenMidi)
      } catch (error) {
        thrown = thrownSnapshot(error)
      }
      return {
        thrown,
        hostChildCount: host.childElementCount,
        previousSvgKept: previous !== null && previous.parentElement === host,
      }
    },
  }
}
