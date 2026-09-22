import { expect, test } from '@playwright/test'

test('serves the browser client shell from the production build', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Infinite Flow')
  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeVisible()
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
})
