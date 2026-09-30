/**
 * The wait every notation baseline takes before its screenshot: let the staff's entrance fade end
 * on its own. Playwright's default `animations: 'disabled'` finishes a running animation from the
 * page's main thread, but Chromium now and then keeps compositing the opacity the fade had at that
 * moment, so the capture shows the ink half-faded (grey) while the page itself already reports full
 * opacity, and the next capture repeats it. After this wait there is no animation left to finish,
 * so the capture is the settled staff the baselines show.
 */
import type { Page } from '@playwright/test'

/** Intent: wait until every animation on the page, the staff's entrance fade included, has ended. */
// @test-link [[module_notation_layout_preflight]]
export async function waitForStaffFadeSettled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => animation.finished))
  })
}
