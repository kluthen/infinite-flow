import { expect, test } from '@playwright/test'

test('serves the browser client shell from the production build', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto('/')

  await expect(page).toHaveTitle('Infinite Flow')
  await expect(page.getByRole('heading', { level: 1, name: 'Infinite Flow' })).toBeVisible()
  await expect(page.getByText('Generate a phrase to begin.')).toBeVisible()
  await expect(
    page
      .getByRole('radiogroup', { name: 'Display notation' })
      .getByRole('radio', { name: 'B-flat' }),
  ).toHaveAttribute('aria-checked', 'true')

  expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([])
})
