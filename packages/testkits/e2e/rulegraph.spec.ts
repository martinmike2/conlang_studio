import { test, expect } from '@playwright/test';

// RuleGraph smoke test: opens the page, searches a node, navigates to editor

test.describe('RuleGraph UI', () => {
  test('opens graph, searches node, navigates to editor', async ({ page }) => {
    // Go to RuleGraph page
    await page.goto('/languages/rule-graph');
    await expect(page.locator('h1, h2, h3')).toContainText(['Rule Graph', 'Rule Dependency Graph']);

    // Wait for graph data to load
    await expect(page.locator('pre')).toBeVisible();

    // Search for a node (use a sample label, e.g. 'rule' or 'loan')
    await page.fill('input[placeholder="Search nodes..."]', 'rule');
    const nodeCount = await page.locator('ul li').count();
    expect(nodeCount).toBeGreaterThan(0);

    // Click the first node's editor button
    const firstButton = page.locator('ul li button').first();
    await expect(firstButton).toBeVisible();
    await firstButton.click();

    // Expect navigation to editor (URL should change)
    await expect(page).toHaveURL(/\/languages\/rules\/edit\/.+/);
  });
});
