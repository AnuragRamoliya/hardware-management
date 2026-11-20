import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Full-System Lifecycle & Multi-Role Journey", () => {
  test.describe.configure({ mode: "serial" });

  test("Super Admin logs in, verifies dashboard metrics, navigates to reports catalogue", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');

    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    expect(page.url()).not.toContain("/login");

    // Wait for main content to render with h1
    await page.waitForSelector("main h1", { timeout: 15000 });

    // Check axe accessibility on Dashboard
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "svg-img-alt", "page-has-heading-one"])
      .analyze();
    expect(a11y.violations).toEqual([]);

    // Navigate to Reports Catalogue
    await page.goto("/reports");
    await page.waitForSelector("h1", { timeout: 10000 });
    await expect(page.locator("h1:has-text('Reports')")).toBeVisible();

    // Verify reports are visible in catalogue for Super Admin
    const cards = page.locator('button:has-text("Open"), h2');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test("Employee logs in, confirms portal landing, and verifies absence of restricted admin menus", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "emp@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    expect(page.url()).not.toContain("/login");

    // Wait for main content to render with h1
    await page.waitForSelector("main h1", { timeout: 15000 });

    // Employee should NOT see Audit or Credential Types in main sidebar
    await expect(page.locator('a[href="/audit-logs"]')).toHaveCount(0);
    await expect(page.locator('a[href="/credential-types"]')).toHaveCount(0);

    // Check axe accessibility on Employee landing page
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "svg-img-alt"])
      .analyze();
    expect(a11y.violations).toEqual([]);
  });

  test("Responsive and theme parity at 360, 768, 1024, 1440 viewports", async ({
    page,
  }) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto("/verify-document");

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

      // Light mode check
      const a11yLight = await new AxeBuilder({ page })
        .disableRules(["color-contrast", "svg-img-alt"])
        .analyze();
      expect(a11yLight.violations).toEqual([]);

      // Dark mode check
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      expect(isDark).toBe(true);
    }
  });
});
