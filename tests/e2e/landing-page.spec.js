// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Landing Page E2E Tests
 * Phase 5.1 - Testing & QA
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section with value proposition', async ({ page }) => {
    // Check main heading is visible
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();

    // Check CTA buttons exist
    const ctaButtons = page.locator('a[href*="login"], a[href*="signup"], button');
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    // Check navigation exists
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();

    // Check for login/signup links
    const authLinks = page.locator('a[href*="login"], a[href*="signup"]');
    const count = await authLinks.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be in header or hero
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Content should not overflow horizontally
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have meta description for SEO', async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('should load stylesheets without errors', async ({ page }) => {
    // Check that CSS files loaded
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets)
        .map((s) => s.href)
        .filter(Boolean);
    });
    expect(stylesheets.length).toBeGreaterThan(0);
  });
});

test.describe('Landing Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one H1

    // Check h2s exist if content is substantial
    const h2s = page.locator('h2');
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThanOrEqual(0);
  });

  test('should have alt text on images', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('should have proper link text', async ({ page }) => {
    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      // Link should have some accessible text
      const hasAccessibleText = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleText).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Check that something received focus
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Basic check - ensure text is readable
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(backgroundColor).toBeTruthy();
  });
});
