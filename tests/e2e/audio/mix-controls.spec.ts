/**
 * The audio mix in the score toolbar, on the workspace harness's fake audio clock: the `Backing`
 * and `Click` toggles and the `Volume` popover's two sliders set the transport's mix at every
 * landscape breakpoint; the popover opens, closes and moves focus as the design sets; the click
 * volume at its lowest step still sounds; the levels survive closing and reopening the popover;
 * and the mix takes its own toolbar line below `bp-tablet-landscape`, the trailing end from it up.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  advanceAudio,
  audibleClicks,
  audioMix,
  gotoAudioHarness,
  mixDesign,
  scheduledClicks,
  startAudio,
} from './audio-harness-helpers'

/** One viewport per landscape breakpoint the workspace supports. */
const VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 900, ownLine: false },
  { name: 'tablet landscape', width: 1200, height: 800, ownLine: false },
  { name: 'mobile landscape', width: 740, height: 360, ownLine: true },
] as const

/** The toolbar's toggles' names, in their order. */
type ToggleName = 'Backing' | 'Click' | 'Melody guide' | 'Rhythm guide'

/** The toolbar's four toggles, in order, then the guides alone with their mix fields. */
const TOGGLE_NAMES = ['Backing', 'Click', 'Melody guide', 'Rhythm guide'] as const
const GUIDES = [
  { name: 'Melody guide', on: 'melodyGuideOn', volume: 'melodyGuideVolume' },
  { name: 'Rhythm guide', on: 'rhythmGuideOn', volume: 'rhythmGuideVolume' },
] as const

/** The popover's four sliders' names, in their order. */
const SLIDER_NAMES = [
  'Backing volume',
  'Click volume',
  'Melody guide volume',
  'Rhythm guide volume',
] as const

/** Intent: the toolbar toggle named `name` (its accessible name is the name alone). */
function toggleButton(page: Page, name: ToggleName): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name, exact: true })
}

/** Intent: the toolbar's `Volume` button. */
function volumeButton(page: Page): Locator {
  return page.locator('.score-toolbar').getByRole('button', { name: 'Volume', exact: true })
}

/** Intent: the volume popover. */
function popover(page: Page): Locator {
  return page.locator('#mix-volume-popover')
}

/** Intent: the slider labelled `name`. */
function slider(page: Page, name: (typeof SLIDER_NAMES)[number]): Locator {
  return page.getByRole('slider', { name, exact: true })
}

/** Intent: open the popover with a click on the toolbar's `Volume`, and wait for it to show. */
async function openPopover(page: Page): Promise<void> {
  await volumeButton(page).click()
  await expect(popover(page)).toBeVisible()
}

/** Intent: land on the harness at `size`, its audio API ready. */
async function gotoAt(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size)
  await gotoAudioHarness(page)
}

for (const viewport of VIEWPORTS) {
  // @test-link [[req_session_audio_mix]]
  test.describe(`audio mix at ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    // @test-link [[req_session_audio_mix]]
    test('the Backing and Click toggles turn each channel off and on, at idle', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      for (const name of ['Backing', 'Click'] as const) {
        const button = toggleButton(page, name)
        await expect(button).toHaveAttribute('aria-pressed', 'true')
        await expect(button).toHaveText(`${name} on`)

        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'false')
        const off = await audioMix(page)
        expect(name === 'Backing' ? off.backingOn : off.clickOn).toBe(false)

        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'true')
        const on = await audioMix(page)
        expect(name === 'Backing' ? on.backingOn : on.clickOn).toBe(true)
      }
    })

    // @test-link [[req_session_audio_mix]]
    // @test-link [[rule_click_volume_never_silent]]
    test('both sliders set the transport mix, the click one down to its audible minimum', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const { range, defaults } = await mixDesign(page)

      await openPopover(page)
      await expect(slider(page, 'Backing volume')).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      expect((await audioMix(page)).backingVolume).toBeLessThan(defaults.backingVolume)
      await page.keyboard.press('Home')
      expect((await audioMix(page)).backingVolume).toBe(range.backingVolumeMin)

      await slider(page, 'Click volume').focus()
      await page.keyboard.press('Home')
      expect((await audioMix(page)).clickVolume).toBe(range.clickVolumeMin)
      await expect(slider(page, 'Click volume')).toHaveAttribute(
        'min',
        String(range.clickVolumeMin),
      )
      await page.keyboard.press('End')
      expect((await audioMix(page)).clickVolume).toBe(range.volumeMax)
    })

    // @test-link [[req_session_audio_mix]]
    test(`the mix sits ${viewport.ownLine ? 'on its own toolbar line' : "at the toolbar's trailing end"}`, async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const toolbar = await page.locator('.score-toolbar').boundingBox()
      const title = await page.locator('#score-panel-title').boundingBox()
      const mix = await page.locator('.mix-controls').boundingBox()
      if (toolbar === null || title === null || mix === null) throw new Error('toolbar not shown')

      if (viewport.ownLine) {
        expect(mix.y).toBeGreaterThanOrEqual(title.y + title.height)
        expect(Math.abs(mix.x - toolbar.x)).toBeLessThanOrEqual(1)
      } else {
        expect(mix.y).toBeLessThan(title.y + title.height)
        expect(Math.abs(mix.x + mix.width - (toolbar.x + toolbar.width))).toBeLessThanOrEqual(1)
      }
    })

    // @test-link [[req_guide_playback]]
    test('the four toggles show in order, the guides off by default, then Volume', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const controls = page.locator('.mix-controls').getByRole('button')
      await expect(controls).toHaveText([
        'Backing on',
        'Click on',
        'Melody guide off',
        'Rhythm guide off',
        'Volume',
      ])
      for (const name of TOGGLE_NAMES) {
        await expect(toggleButton(page, name)).toBeVisible()
      }
      for (const { name } of GUIDES) {
        await expect(toggleButton(page, name)).toHaveAttribute('aria-pressed', 'false')
      }
      const mix = await audioMix(page)
      expect(mix.melodyGuideOn).toBe(false)
      expect(mix.rhythmGuideOn).toBe(false)
    })

    // @test-link [[req_guide_playback]]
    test('the Melody guide and Rhythm guide toggles turn each guide on and off, at idle', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      for (const { name, on } of GUIDES) {
        const button = toggleButton(page, name)
        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'true')
        await expect(button).toHaveText(`${name} on`)
        expect((await audioMix(page))[on]).toBe(true)

        await button.click()
        await expect(button).toHaveAttribute('aria-pressed', 'false')
        await expect(button).toHaveText(`${name} off`)
        expect((await audioMix(page))[on]).toBe(false)
      }
    })

    // @test-link [[req_guide_playback]]
    test('the guide sliders set the transport mix, down to silence, after the four sliders in order', async ({
      page,
    }) => {
      await gotoAt(page, viewport)
      const { range, defaults } = await mixDesign(page)

      await openPopover(page)
      await expect(popover(page).getByRole('slider')).toHaveCount(4)
      for (const [index, name] of SLIDER_NAMES.entries()) {
        await expect(popover(page).getByRole('slider').nth(index)).toHaveAccessibleName(name)
      }
      for (const { name, volume } of GUIDES) {
        const guideSlider = slider(page, `${name} volume`)
        await expect(guideSlider).toHaveAttribute('min', '0')
        expect(Number(await guideSlider.inputValue())).toBe(defaults[volume])
        await guideSlider.focus()
        await page.keyboard.press('ArrowLeft')
        expect((await audioMix(page))[volume]).toBeLessThan(defaults[volume])
        await page.keyboard.press('Home')
        expect((await audioMix(page))[volume]).toBe(0)
        await page.keyboard.press('End')
        expect((await audioMix(page))[volume]).toBe(range.volumeMax)
      }
    })
  })
}

// @test-link [[req_guide_playback]]
test("at the phone viewport the mix's controls keep their full labels and wrap in order, nothing hidden", async ({
  page,
}) => {
  const phone = VIEWPORTS.find((viewport) => viewport.ownLine)!
  await gotoAt(page, phone)

  const boxes = []
  for (const control of await page.locator('.mix-controls').getByRole('button').all()) {
    await expect(control).toBeVisible()
    const fits = await control.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
    )
    expect(fits, await control.innerText()).toBe(true)
    const box = await control.boundingBox()
    if (box === null) throw new Error('a mix control is not shown')
    boxes.push(box)
  }
  expect(boxes).toHaveLength(5)
  for (const name of ['Melody guide', 'Rhythm guide'] as const) {
    await expect(toggleButton(page, name)).toHaveText(`${name} off`)
  }

  const toolbar = await page.locator('.score-toolbar').boundingBox()
  if (toolbar === null) throw new Error('toolbar not shown')
  for (const [index, box] of boxes.entries()) {
    expect(box.x).toBeGreaterThanOrEqual(toolbar.x - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(toolbar.x + toolbar.width + 1)
    const before = boxes[index - 1]
    if (before === undefined) continue
    const sameLine = Math.abs(box.y - before.y) <= 1
    if (sameLine) expect(box.x).toBeGreaterThanOrEqual(before.x + before.width)
    else expect(box.y).toBeGreaterThanOrEqual(before.y + before.height)
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

// @test-link [[req_session_audio_mix]]
test.describe('the Volume popover', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAt(page, { width: 1600, height: 900 })
  })

  test('opening focuses the first slider; Escape closes it and returns focus to Volume', async ({
    page,
  }) => {
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(volumeButton(page)).toHaveAttribute('aria-controls', 'mix-volume-popover')

    await openPopover(page)
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(slider(page, 'Backing volume')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(volumeButton(page)).toBeFocused()
  })

  test('a pointer press outside closes it without moving focus to Volume', async ({ page }) => {
    await openPopover(page)

    await page.locator('#score-panel-title').click()

    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).not.toBeFocused()
  })

  test('Tab out of it, either way, closes it', async ({ page }) => {
    await openPopover(page)
    for (const name of SLIDER_NAMES.slice(1)) {
      await page.keyboard.press('Tab')
      await expect(slider(page, name)).toBeFocused()
      await expect(popover(page)).toBeVisible()
    }
    await page.keyboard.press('Tab')
    await expect(popover(page)).toBeHidden()

    await openPopover(page)
    await page.keyboard.press('Shift+Tab')
    await expect(popover(page)).toBeHidden()
    await expect(volumeButton(page)).toBeFocused()
  })

  test('a click on the open Volume closes it, and the levels survive reopening', async ({
    page,
  }) => {
    await openPopover(page)
    await page.keyboard.press('Home')
    await slider(page, 'Click volume').focus()
    await page.keyboard.press('End')
    const set = await audioMix(page)

    await volumeButton(page).click()
    await expect(popover(page)).toBeHidden()
    await openPopover(page)

    expect(Number(await slider(page, 'Backing volume').inputValue())).toBe(set.backingVolume)
    expect(Number(await slider(page, 'Click volume').inputValue())).toBe(set.clickVolume)
    expect(await audioMix(page)).toEqual(set)
  })
})

// @test-link [[rule_click_volume_never_silent]]
// @test-link [[req_session_audio_mix]]
test('the click at its lowest volume still sounds, and the mix stays live while audio runs', async ({
  page,
}) => {
  await gotoAt(page, { width: 1600, height: 900 })
  const { range } = await mixDesign(page)
  await openPopover(page)
  await slider(page, 'Click volume').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('Escape')

  await startAudio(page)
  await advanceAudio(page, 4)

  const scheduled = await scheduledClicks(page)
  const audible = await audibleClicks(page)
  expect(scheduled.length).toBeGreaterThan(4)
  expect(audible).toHaveLength(scheduled.length)
  for (const click of audible) expect(click.gain).toBe(range.clickVolumeMin)

  await toggleButton(page, 'Click').click()
  expect((await audioMix(page)).clickOn).toBe(false)
  await toggleButton(page, 'Click').click()
  expect((await audioMix(page)).clickOn).toBe(true)
})

// @test-link [[req_guide_playback]]
// @test-link [[rule_guide_switch_takes_effect]]
test('the guide toggles and sliders stay live while audio runs', async ({ page }) => {
  await gotoAt(page, { width: 1600, height: 900 })
  await startAudio(page)
  await advanceAudio(page, 1)

  for (const { name, on, volume } of GUIDES) {
    await toggleButton(page, name).click()
    expect((await audioMix(page))[on]).toBe(true)
    await openPopover(page)
    await slider(page, `${name} volume`).focus()
    await page.keyboard.press('Home')
    expect((await audioMix(page))[volume]).toBe(0)
    await page.keyboard.press('Escape')
    await toggleButton(page, name).click()
    expect((await audioMix(page))[on]).toBe(false)
  }
})
