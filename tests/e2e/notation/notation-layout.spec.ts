/**
 * End-to-end coverage of the staff layout, against the notation harness (PhraseScore inside a real
 * `staff-frame` with the app's stylesheet). Below the tablet-landscape breakpoint every phrase is
 * split, sparse or dense: bars 1-2 in the top system position and bars 3-4 in the bottom one, each
 * its own `staff-content` engraving, measure columns aligned, one time signature, clef and key
 * signature on both systems, and a tie crossing bars 2 -> 3 drawn as a partial tie in each. From
 * the breakpoint up one system holds the phrase and the bottom position stays reserved and blank.
 * The layout's two failures are distinct typed outcomes. Below the breakpoint the scale fits the
 * height budget read from the frame's `max-block-size`, and a browser toolbar showing or hiding
 * never re-engraves.
 */
import { expect, test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:4174' })

const PHONE_VIEWPORT = { width: 740, height: 360 } as const
const DESKTOP_VIEWPORT = { width: 1280, height: 800 } as const
/** The harness frame's outer width on the phone viewport (the app's staff frame is about this wide). */
const PHONE_FRAME_WIDTH = 700

/** Intent: wait until the harness publishes a settled (ready or error) engrave outcome. */
async function waitForHarnessSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => window.__notationHarness && window.__notationHarness.state !== 'pending',
  )
}

/** Intent: open a fixture at a viewport and frame width, and return the settled harness state. */
async function engraveFixture(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
  fixture: string,
  frameWidth: number,
): Promise<NotationHarnessState> {
  await page.setViewportSize(viewport)
  await page.goto(`/?fixture=${fixture}&width=${frameWidth}`)
  await waitForHarnessSettled(page)
  return page.evaluate(() => window.__notationHarness)
}

/** Intent: read the two system positions (the staff-systems root's first two children). */
async function readPositions(page: Page) {
  return page.evaluate(() => {
    const positions = Array.from(document.querySelectorAll('[data-system-position]'))
    return positions.map((position) => ({
      name: position.getAttribute('data-system-position'),
      blockSize: position.getBoundingClientRect().height,
      units: position.querySelectorAll(':scope > .staff-content').length,
      svgs: position.querySelectorAll('svg.staff-svg').length,
      systemIndices: Array.from(position.querySelectorAll('g.measure-slot')).map((group) =>
        Number(group.getAttribute('data-system-index')),
      ),
    }))
  })
}

// @test-link [[module_notation_layout_preflight]]
test('below the breakpoint a sparse phrase is split: bars 1-2 on top, bars 3-4 below, never one system first', async ({
  page,
}) => {
  const harnessState = await engraveFixture(page, PHONE_VIEWPORT, 'simple', PHONE_FRAME_WIDTH)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(2)

  const positions = await readPositions(page)
  expect(positions.map((position) => position.name)).toEqual(['top', 'bottom'])
  expect(positions[0]).toMatchObject({ units: 1, svgs: 1, systemIndices: [0, 0] })
  expect(positions[1]).toMatchObject({ units: 1, svgs: 1, systemIndices: [1, 1] })
  expect(Math.abs(positions[0]!.blockSize - positions[1]!.blockSize)).toBeLessThanOrEqual(0.5)
})

// @test-link [[module_notation_layout_preflight]]
test('a dense phrase splits into two aligned systems, each its own engraving', async ({ page }) => {
  const harnessState = await engraveFixture(page, PHONE_VIEWPORT, 'dense', PHONE_FRAME_WIDTH)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(2)

  await expect(page.locator('.staff-content')).toHaveCount(2)
  await expect(page.locator('svg.staff-svg')).toHaveCount(2)
  await expect(page.locator('g.measure-slot')).toHaveCount(4)

  const counts = await page.evaluate(() => ({
    clef: document.querySelectorAll('svg.staff-svg g.vf-clef').length,
    timesignature: document.querySelectorAll('svg.staff-svg g.vf-timesignature').length,
    keysignature: document.querySelectorAll('svg.staff-svg g.vf-keysignature').length,
    topTimesignature: document.querySelectorAll(
      '[data-system-position="top"] svg.staff-svg g.vf-timesignature',
    ).length,
  }))
  expect(counts).toEqual({ clef: 2, timesignature: 1, keysignature: 2, topTimesignature: 1 })

  const bounds = await page.evaluate(() => {
    const frame = document.querySelector('.staff-frame')!
    const frameBox = frame.getBoundingClientRect()
    const style = getComputedStyle(frame)
    return {
      frameBox,
      frameScrollWidth: frame.scrollWidth,
      frameClientWidth: frame.clientWidth,
      maxBlockSize: parseFloat(style.maxBlockSize),
      svgBoxes: Array.from(document.querySelectorAll('svg.staff-svg')).map((svg) =>
        svg.getBoundingClientRect(),
      ),
      groupBoxes: Array.from(document.querySelectorAll('g.measure-slot')).map((group) =>
        group.getBoundingClientRect(),
      ),
    }
  })

  // Contained in the frame on both axes: no horizontal scroll, nothing below the frame's bottom.
  expect(bounds.frameScrollWidth).toBeLessThanOrEqual(bounds.frameClientWidth)
  expect(bounds.frameBox.height).toBeLessThanOrEqual(bounds.maxBlockSize + 0.5)
  for (const svgBox of bounds.svgBoxes) {
    expect(svgBox.left).toBeGreaterThanOrEqual(bounds.frameBox.left)
    expect(svgBox.right).toBeLessThanOrEqual(bounds.frameBox.right)
    expect(svgBox.bottom).toBeLessThanOrEqual(bounds.frameBox.bottom)
  }

  const [bar1, bar2, bar3, bar4] = bounds.groupBoxes
  // Bar 3 aligns under bar 1 and bar 4 under bar 2: same left edge and same width, within 1px.
  expect(Math.abs(bar3!.left - bar1!.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(bar4!.left - bar2!.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(bar3!.width - bar1!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(bar4!.width - bar2!.width)).toBeLessThanOrEqual(1)
  // Bars 3-4 are the bottom system, wholly below the top one (compared on the SVGs: a measure
  // group's box includes its glyphs' whole font boxes, so it says little about the ink).
  const [topSvg, bottomSvg] = bounds.svgBoxes
  expect(bottomSvg!.top).toBeGreaterThanOrEqual(topSvg!.bottom - 0.5)
})

// @test-link [[module_notation_layout_preflight]]
test('a tie crossing the bar 2 -> 3 line break draws as a partial tie in each system', async ({
  page,
}) => {
  const harnessState = await engraveFixture(page, PHONE_VIEWPORT, 'denseTie', PHONE_FRAME_WIDTH)
  expect(harnessState.state).toBe('ready')

  const tieCounts = await page.evaluate(() =>
    ['top', 'bottom'].map(
      (name) =>
        document.querySelectorAll(`[data-system-position="${name}"] svg.staff-svg g.vf-stavetie`)
          .length,
    ),
  )
  // denseTie's only tie crosses the line break: one partial tie leaves bar 2, one enters bar 3.
  expect(tieCounts).toEqual([1, 1])
})

// @test-link [[module_notation_layout_preflight]]
test('from the breakpoint up one system holds the phrase and the bottom position stays reserved and blank', async ({
  page,
}) => {
  const harnessState = await engraveFixture(page, DESKTOP_VIEWPORT, 'simple', 1200)
  expect(harnessState.state).toBe('ready')
  expect(harnessState.engraved?.systemCount).toBe(1)

  const positions = await readPositions(page)
  expect(positions[0]).toMatchObject({ units: 1, svgs: 1, systemIndices: [0, 0, 0, 0] })
  expect(positions[1]).toMatchObject({ units: 0, svgs: 0, systemIndices: [] })
  expect(positions[1]!.blockSize).toBeGreaterThan(0)
  expect(Math.abs(positions[0]!.blockSize - positions[1]!.blockSize)).toBeLessThanOrEqual(0.5)
})

// @test-link [[module_notation_layout_preflight]]
test('the two positions keep one block size for a viewport, whatever the phrase', async ({
  page,
}) => {
  await engraveFixture(page, PHONE_VIEWPORT, 'simple', PHONE_FRAME_WIDTH)
  const sparse = await readPositions(page)
  await engraveFixture(page, PHONE_VIEWPORT, 'dense', PHONE_FRAME_WIDTH)
  const dense = await readPositions(page)

  expect(dense[0]!.blockSize).toBeCloseTo(sparse[0]!.blockSize, 1)
  expect(dense[1]!.blockSize).toBeCloseTo(sparse[1]!.blockSize, 1)
})

// @test-link [[module_notation_layout_preflight]]
test('in one small container a dense phrase gets "notes too wide" and a sparse one engraves', async ({
  page,
}) => {
  const dense = await engraveFixture(page, PHONE_VIEWPORT, 'dense', 400)
  expect(dense.state).toBe('error')
  expect(dense.errorCode).toBe('notation_notes_too_wide')
  await expect(page.locator('svg.staff-svg')).toHaveCount(0)
  await expect(page.locator('.score-description')).toHaveCount(0)

  const sparse = await engraveFixture(page, PHONE_VIEWPORT, 'simple', 400)
  expect(sparse.state).toBe('ready')
  expect(sparse.engraved?.systemCount).toBe(2)
})

// @test-link [[module_notation_layout_preflight]]
test('a window with no room gives "no room" for the dense phrase and the sparse one alike', async ({
  page,
}) => {
  // Too short: below the breakpoint, the two systems cannot fit the height budget at the floor.
  const tooShort = { width: 740, height: 260 } as const
  // Too narrow: the frame cannot hold the fixed parts with every measure at the minimum width.
  for (const [viewport, frameWidth] of [
    [tooShort, PHONE_FRAME_WIDTH],
    [PHONE_VIEWPORT, 120],
  ] as const) {
    for (const fixture of ['dense', 'simple']) {
      const harnessState = await engraveFixture(page, viewport, fixture, frameWidth)
      expect(harnessState.state, `${fixture} at ${frameWidth}x${viewport.height}`).toBe('error')
      expect(harnessState.errorCode, `${fixture} at ${frameWidth}x${viewport.height}`).toBe(
        'notation_no_room',
      )
      await expect(page.locator('svg.staff-svg')).toHaveCount(0)
    }
  }
})

// @test-link [[module_notation_layout_preflight]]
test('below the breakpoint a shorter window lowers the scale and the staff stays inside the frame', async ({
  page,
}) => {
  const tall = await engraveFixture(page, PHONE_VIEWPORT, 'simple', PHONE_FRAME_WIDTH)
  const short = await engraveFixture(page, { width: 740, height: 330 }, 'simple', PHONE_FRAME_WIDTH)

  expect(tall.state).toBe('ready')
  expect(short.state).toBe('ready')
  expect(short.engraved!.staffSpacePx).toBeLessThan(tall.engraved!.staffSpacePx)
  expect(short.engraved!.staffSpacePx).toBeGreaterThanOrEqual(5)

  const fit = await page.evaluate(() => {
    const frame = document.querySelector('.staff-frame')!
    const style = getComputedStyle(frame)
    const frameBox = frame.getBoundingClientRect()
    return {
      frameHeight: frameBox.height,
      frameBottom: frameBox.bottom,
      maxBlockSize: parseFloat(style.maxBlockSize),
      svgBottoms: Array.from(document.querySelectorAll('svg.staff-svg')).map(
        (svg) => svg.getBoundingClientRect().bottom,
      ),
    }
  })
  expect(fit.frameHeight).toBeLessThanOrEqual(fit.maxBlockSize + 0.5)
  for (const bottom of fit.svgBottoms) expect(bottom).toBeLessThanOrEqual(fit.frameBottom)
})

// @test-link [[module_notation_layout_preflight]]
test('a browser toolbar showing or hiding never re-engraves; a real height change does', async ({
  page,
}) => {
  const first = await engraveFixture(page, PHONE_VIEWPORT, 'simple', PHONE_FRAME_WIDTH)
  expect(first.state).toBe('ready')
  expect(first.engraveCount).toBe(1)
  await page.evaluate(() => {
    for (const svg of document.querySelectorAll<SVGSVGElement>('svg.staff-svg')) {
      svg.dataset.firstEngraving = '1'
    }
  })

  // Headless Chromium has no toolbar to show or hide, so this fires what a toolbar change fires
  // (window and visual-viewport resize events, the dynamic viewport height moving) while the small
  // viewport height the budget is built from (`100svh`) stays put. An element sized in `100dvh`
  // stands in for everything on the page that follows the dynamic height.
  await page.evaluate(async () => {
    const dynamic = document.createElement('div')
    dynamic.style.blockSize = '100dvh'
    document.body.appendChild(dynamic)
    const frames = (): Promise<void> =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    for (const height of ['90dvh', '100dvh', '95dvh']) {
      dynamic.style.blockSize = height
      window.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('resize'))
      await frames()
    }
    await frames()
  })

  const afterToolbar = await page.evaluate(() => ({
    harness: window.__notationHarness,
    marked: Array.from(document.querySelectorAll<SVGSVGElement>('svg.staff-svg')).filter(
      (svg) => svg.dataset.firstEngraving === '1',
    ).length,
  }))
  expect(afterToolbar.harness.engraveCount).toBe(1)
  expect(afterToolbar.marked).toBe(2)

  // Control: a real change of the viewport's height moves `100svh`, so the budget and the scale
  // change and the staff re-engraves at the new size.
  await page.evaluate(() => {
    window.__notationHarness = { state: 'pending' }
  })
  await page.setViewportSize({ width: 740, height: 320 })
  await waitForHarnessSettled(page)
  const afterResize = await page.evaluate(() => window.__notationHarness)
  expect(afterResize.state).toBe('ready')
  expect(afterResize.engraveCount).toBe(2)
  expect(afterResize.engraved!.staffSpacePx).toBeLessThan(first.engraved!.staffSpacePx)
})
