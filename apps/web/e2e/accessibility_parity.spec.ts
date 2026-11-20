import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotDir = path.resolve(__dirname, "../../../docs/parity");

test.beforeAll(() => {
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
});

test.describe("V14: Playwright E2E and Axe Accessibility Audits", () => {
  test("Login Page - A11y and Responsive Snapshots (Light & Dark)", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile-360";
    const width = isMobile ? 360 : 1440;

    await page.goto("/login");
    await page.waitForSelector('input[name="email"]');

    // Run axe accessibility check (ignore color contrast warnings on branded login illustration background)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Capture Light Mode snapshot
    const lightPath = path.join(snapshotDir, `login_${width}_light.png`);
    await page.screenshot({ path: lightPath, fullPage: true });

    // Switch to Dark Mode and capture
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const darkPath = path.join(snapshotDir, `login_${width}_dark.png`);
    await page.screenshot({ path: darkPath, fullPage: true });
  });

  test("Verify Document Page - Form Interaction, A11y & Validation", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile-360";
    const width = isMobile ? 360 : 1440;

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

    // Capture Light snapshot
    const lightPath = path.join(snapshotDir, `verify_${width}_light.png`);
    await page.screenshot({ path: lightPath });

    // Capture Dark snapshot
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    const darkPath = path.join(snapshotDir, `verify_${width}_dark.png`);
    await page.screenshot({ path: darkPath });
  });
});
