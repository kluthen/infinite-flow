/**
 * The staff's ink, measured on pixels: how far each engraved system's drawn content reaches, in
 * engraving units from its system position's top edge. Measured on pixels rather than with
 * `getBBox()`, since VexFlow draws every music glyph as SVG `<text>`, whose box is the font's whole
 * line box, far taller than the glyph: each `svg.staff-svg` is screenshotted over a transparent
 * page and its first and last rows holding ink are found in the page's own canvas. Shared by the
 * calibration sweep and the layout spec.
 */
import type { Page } from '@playwright/test'

/** VexFlow engraving units per staff space (NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE in the layout policy). */
export const NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE = 10

/** The engraved extent of one system's drawn content, in engraving units from its position's top. */
export interface SystemExtent {
  readonly top: number
  readonly bottom: number
  /** The SVG's own height, in engraving units: the system position's height. */
  readonly positionUnits: number
  /** The staff's top line, in engraving units from the position's top. */
  readonly topLine: number
  /** The drawn start marker's top edge, for the system holding phrase 1's first attack. */
  readonly markerTop: number | null
}

/**
 * Intent: find each system's inked rows, start marker included, in engraving units from its SVG's
 * top edge (the system position's top), by screenshotting the SVG over a transparent page and
 * scanning the alpha channel of the decoded PNG in the page's own canvas; and the drawn start
 * marker's own top edge, in the system that holds it.
 */
export async function measureInk(
  page: Page,
  staffSpacePx: number,
  staffTopLineUnits: number,
): Promise<readonly SystemExtent[]> {
  await page.addStyleTag({
    content: 'html, body, .staff-frame { background: transparent !important; }',
  })
  const scale = staffSpacePx / NOTATION_ENGRAVING_UNITS_PER_STAFF_SPACE
  const systems = page.locator('svg.staff-svg')
  const extents: SystemExtent[] = []
  for (let index = 0; index < (await systems.count()); index += 1) {
    const svg = systems.nth(index)
    const markerTopPx = await svg.evaluate((element) => {
      const marker = element.querySelector('.start-note-marker')
      if (marker === null) return null
      return marker.getBoundingClientRect().top - element.getBoundingClientRect().top
    })
    const png = await svg.screenshot({ omitBackground: true })
    const rows = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const alpha = context.getImageData(0, 0, canvas.width, canvas.height).data
      const inked = (x: number, y: number): boolean => alpha[(y * canvas.width + x) * 4 + 3]! > 32
      let top = -1
      let bottom = -1
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (inked(x, y)) {
            if (top < 0) top = y
            bottom = y + 1
            break
          }
        }
      }
      return { top, bottom, height: canvas.height }
    }, png.toString('base64'))
    extents.push({
      top: rows.top / scale,
      bottom: rows.bottom / scale,
      positionUnits: rows.height / scale,
      topLine: staffTopLineUnits,
      markerTop: markerTopPx === null ? null : markerTopPx / scale,
    })
  }
  return extents
}
