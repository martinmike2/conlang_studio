import { test, expect } from '@playwright/test'

test('apply -> save -> load -> apply overlay', async ({ page }) => {
  await page.goto('/overlays/diff')

  // Ensure the page loaded
  await expect(page.locator('text=Variant Overlay Diff')).toBeVisible()

  // Click Apply overlay
  await page.click('text=Apply overlay')

  // Save overlay (opens dialog)
  await page.click('text=Save overlay')
  await expect(page.locator('text=Confirm save')).toBeVisible()

  // Enter a name and save
  const name = 'e2e-overlay-' + Date.now()
  await page.getByLabel('Overlay name').fill(name)
  // Click the Save button within the Confirm save dialog using role
  await page.locator('div[role="dialog"]').getByRole('button', { name: 'Save' }).click()

  // Wait for success snackbar
  await expect(page.locator('text=Saved overlay id=')).toBeVisible()

  // Load overlays list
  await page.click('text=Load overlays')
  await expect(page.locator('text=Stored overlays')).toBeVisible()

  // Click Apply on the stored overlay with the name we just created
  await page.locator('li', { hasText: name }).locator('text=Apply').click()

  // Expect applied rules list to contain the updated rule with id=1
  await expect(page.locator('li', { hasText: 'id=1 priority=' })).toBeVisible()
})
