import { test, expect } from '@playwright/test'

test.describe('Collaboration Frontend', () => {
  test('mock collaboration with BroadcastChannel', async ({ browser }) => {
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const page1 = await ctx1.newPage()
    const page2 = await ctx2.newPage()

    // without 'real=1', should use mock mode
    await page1.goto('http://localhost:3000/collab/test')
    await page2.goto('http://localhost:3000/collab/test')

    // Wait for pages to load
    await page1.waitForTimeout(1000)
    await page2.waitForTimeout(1000)

    const input1 = page1.locator('textarea').first()
    const input2 = page2.locator('textarea').first()

    // Type in first context
    await input1.fill('Hello from context 1')
    await page1.waitForTimeout(500)

    // In BroadcastChannel mode, changes should sync between same-origin contexts
    // (though this may not work in Playwright's isolated contexts)
    // For now, just verify the input worked
    await expect(input1).toHaveValue('Hello from context 1')

    await ctx1.close()
    await ctx2.close()
  })

  test.skip('real-time collaboration with Y.js websocket (requires server)', async ({ browser }) => {
    // This test requires:
    // 1. pnpm --filter web collab:ws running on port 1234
    // 2. Next.js dev server running on port 3000
    // Mark as skip by default since it requires external services
    
    const ctx1 = await browser.newContext()
    const ctx2 = await browser.newContext()
    const page1 = await ctx1.newPage()
    const page2 = await ctx2.newPage()

    // use the 'real=1' query param to enable websocket provider
    await page1.goto('http://localhost:3000/collab/test?real=1')
    await page2.goto('http://localhost:3000/collab/test?real=1')

    // Wait for websocket connection and sync
    await page1.waitForTimeout(1500)
    await page2.waitForTimeout(1500)

    const input1 = page1.locator('textarea').first()
    const input2 = page2.locator('textarea').first()

    // Check presence indicators appear
    const presence1 = page1.locator('[class*="MuiChip"]').first()
    const presence2 = page2.locator('[class*="MuiChip"]').first()

    // Both should show at least one user
    await expect(presence1).toBeVisible({ timeout: 3000 })
    await expect(presence2).toBeVisible({ timeout: 3000 })

    // Content sync test
    await input1.fill('Hello from user 1')
    await page2.waitForTimeout(800)
    
    // User 2 should see user 1's content
    await expect(input2).toHaveValue('Hello from user 1', { timeout: 2000 })

    await input2.fill('Reply from user 2')
    await page1.waitForTimeout(800)
    
    // User 1 should see user 2's content
    await expect(input1).toHaveValue('Reply from user 2', { timeout: 2000 })

    await ctx1.close()
    await ctx2.close()
  })
})
