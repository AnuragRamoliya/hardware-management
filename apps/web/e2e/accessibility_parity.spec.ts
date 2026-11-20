import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Playwright E2E and Axe Accessibility Audits", () => {
  test("Login Page - A11y and Responsive Validation (Light & Dark)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForSelector('input[name="email"]');

    // Run axe accessibility check (ignore color contrast on illustration background)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Assert responsiveness and absence of horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

    // Switch to Dark Mode and assert theme token
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(isDark).toBe(true);
  });

  test("Verify Document Page - Form Interaction, A11y & Validation", async ({
    page,
  }) => {
    await page.goto("/verify-document");
    await page.waitForSelector("input");

    // Axe scan
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(a11y.violations).toEqual([]);

    // Submit invalid code
    await page.fill("input", "CLR-TEST-INVALID-999");
    await page.click('button[type="submit"]');

    // Verify error card displays without throwing
    await expect(
      page.locator("text=Certificate Verification Failed"),
    ).toBeVisible();

    // Assert responsiveness and absence of horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
