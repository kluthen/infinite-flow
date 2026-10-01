/**
 * The browser adapter of the window-shape port. The width is `window.innerWidth`, the width the
 * stylesheet's media queries compare against the breakpoints. The small viewport height and the
 * rem size come from a probe: one hidden, fixed, zero-width element sized `100svh` at
 * `font-size: medium`. The browser resolves `100svh` with its toolbars showing, so a toolbar
 * showing or hiding never changes the reading (unlike `innerHeight`), and `medium` is the
 * browser's initial font size, the rem that media queries use whatever the root element's size.
 * The probe is the same `100svh` the phone staff budget (`--staff-systems-phone-block-budget` in
 * src/styles/theme.css) is built on.
 */
import type { WindowShape } from '@/session/session-browser-ports'

/** The slice of `window` the adapter reads. */
// @spec-link [[rule_session_ends_on_portrait_view]]
export interface WindowShapeWindowLike {
  readonly innerWidth: number
  addEventListener(type: 'resize', listener: () => void): void
  removeEventListener(type: 'resize', listener: () => void): void
}

/** The probe's two readings, in CSS px. */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface ViewportProbe {
  readonly smallHeightPx: () => number
  readonly remPx: () => number
}

/** The probe's inline style: out of the flow, invisible, inert, and sized by the small viewport. */
const PROBE_STYLE: Readonly<Record<string, string>> = {
  position: 'fixed',
  'inset-block-start': '0',
  'inset-inline-start': '0',
  'inline-size': '0',
  'block-size': '100svh',
  'font-size': 'medium',
  visibility: 'hidden',
  'pointer-events': 'none',
}

/** Intent: guard a probe reading is a finite positive size, naming it in the error. */
function assertLaidOut(name: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`viewport probe: the ${name} reads ${value}; the probe is not laid out`)
  }
  return value
}

/**
 * Intent: a probe in `doc`, added to its body on the first reading and kept for the page's
 * lifetime, so later readings only measure. A reading that is not a positive size means the
 * probe is not laid out (no layout, or a detached body), which is a defect and throws.
 */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function createViewportProbe(doc: Document): ViewportProbe {
  let element: HTMLElement | null = null

  /** Intent: the probe element, created and attached on first use. */
  function probe(): HTMLElement {
    if (element !== null) return element
    const created = doc.createElement('div')
    created.setAttribute('aria-hidden', 'true')
    created.dataset.viewportProbe = 'small-viewport'
    for (const [property, value] of Object.entries(PROBE_STYLE)) {
      created.style.setProperty(property, value)
    }
    doc.body.append(created)
    element = created
    return created
  }

  /** Intent: the computed style of the probe, from the document's own window. */
  function computedStyle(): CSSStyleDeclaration {
    const view = doc.defaultView
    if (view === null) throw new Error('viewport probe: the document has no window')
    return view.getComputedStyle(probe())
  }

  return {
    smallHeightPx: () =>
      assertLaidOut('small viewport height', probe().getBoundingClientRect().height),
    remPx: () => assertLaidOut('initial font size', parseFloat(computedStyle().fontSize)),
  }
}

/**
 * Intent: adapt a window and a probe to the window-shape port: a read takes the window's width and
 * the probe's two readings now; a subscriber hears every `resize`, which the browser fires on
 * every viewport size change, a turned device included.
 */
// @spec-link [[rule_session_ends_on_portrait_view]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function createWindowShape(win: WindowShapeWindowLike, probe: ViewportProbe): WindowShape {
  return {
    read: () => ({
      widthPx: win.innerWidth,
      smallHeightPx: probe.smallHeightPx(),
      remPx: probe.remPx(),
    }),
    subscribe: (listener) => {
      const onResize = (): void => listener()
      win.addEventListener('resize', onResize)
      return () => win.removeEventListener('resize', onResize)
    },
  }
}

/** Intent: the window shape of this browser tab. */
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function createBrowserWindowShape(): WindowShape {
  return createWindowShape(window, createViewportProbe(document))
}
