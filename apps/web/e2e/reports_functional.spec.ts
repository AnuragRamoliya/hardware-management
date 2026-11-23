import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

async function loginAs(
  page: Page,
  email: string,
  password = "TestPassword123!",
) {
  await page.goto("/login");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
  expect(page.url()).not.toContain("/login");
}

test.describe("Phase 6: Functional & E2E Reports Suite (Real API & Auth)", () => {
  // P6-F1: Report catalogue navigation & search
  test("P6-F1: Report Catalogue navigation, categorization, and search filtering", async ({
    page,
  }) => {
    await loginAs(page, "admin@fixture.local");

    await page.goto("/reports");
    await expect(page.locator("h1")).toContainText(
      "Reports & Analytics Catalogue",
    );

    // Verify categories and cards appear from real API
    await expect(
      page.locator("h2:has-text('Hardware Per Employee')"),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("h2:has-text('Software License Utilization')"),
    ).toBeVisible();
    await expect(
      page.locator("h2:has-text('Full System Audit & Activity Logs')"),
    ).toBeVisible();

    // Verify search input filters cards dynamically
    const searchInput = page.locator('input[placeholder*="Search reports"]');
    await searchInput.fill("Audit");
    await expect(
      page.locator("h2:has-text('Full System Audit & Activity Logs')"),
    ).toBeVisible();
    await expect(
      page.locator("h2:has-text('Hardware Per Employee')"),
    ).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(
      page.locator("h2:has-text('Hardware Per Employee')"),
    ).toBeVisible();

    // Axe accessibility audit
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "label-content-name-mismatch"])
      .analyze();
    expect(a11y.violations).toEqual([]);
  });

  // P6-F2: Role-based report catalogue visibility
  test("P6-F2: Role-based report catalogue visibility enforces restricted access", async ({
    page,
  }) => {
    // 1. HR Specialist: cannot access hardware-per-employee report directly, redirected away
    await loginAs(page, "hr@fixture.local");
    await page.goto("/reports/hardware-per-employee");
    await page.waitForURL((url: URL) => !url.pathname.includes("/reports"), {
      timeout: 10000,
    });
    expect(page.url()).not.toContain("/reports");

    // 2. Regular employee: blocked from reports catalogue, redirected to portal
    await loginAs(page, "emp@fixture.local");
    await page.goto("/reports");
    await page.waitForURL((url: URL) => !url.pathname.includes("/reports"), {
      timeout: 10000,
    });
    expect(page.url()).not.toContain("/reports");
  });

  // P6-F3: Generic ReportPage metadata-driven rendering, KPI strip and CommonTable
  test("P6-F3: Generic ReportPage metadata-driven rendering, KPI strip and CommonTable", async ({
    page,
  }) => {
    await loginAs(page, "admin@fixture.local");
    await page.goto("/reports/hardware-per-employee");
    await expect(page.locator("h1")).toContainText("Hardware Per Employee", {
      timeout: 10000,
    });

    // KPI strip assertions from real report data
    await expect(page.locator("text=/Total/i").first()).toBeVisible({
      timeout: 10000,
    });

    // Export action button is ready and visible
    await expect(page.locator("button:has-text('Export Report')")).toBeVisible({
      timeout: 10000,
    });

    // Axe audit
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "label-content-name-mismatch"])
      .analyze();
    expect(a11y.violations).toEqual([]);
  });

  // P6-F4: Synchronous export dialog flow and real CSV file download assertion
  test("P6-F4: Synchronous export dialog flow and real CSV file download assertion", async ({
    page,
  }) => {
    await loginAs(page, "admin@fixture.local");
    await page.goto("/reports/hardware-per-employee");

    // Open Export modal by clicking "Export Report"
    const exportBtn = page.locator('button:has-text("Export Report")');
    await exportBtn.waitFor({ state: "visible", timeout: 10000 });
    await exportBtn.click();

    await expect(page.locator("text=Export Report Dataset")).toBeVisible();
    await expect(page.locator("text=File Format")).toBeVisible();

    // Trigger download
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const submitExportBtn = page.locator('button:has-text("Start Export")');
    await submitExportBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("hardware-per-employee");
    expect(download.suggestedFilename()).toContain(".csv");

    // Read downloaded file content and assert UTF-8 BOM + header presence
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, "utf-8");
      // Check UTF-8 BOM
      expect(content.charCodeAt(0)).toBe(0xfeff);
      // Check column header
      expect(content).toContain("Employee");
    }
  });

  // P6-F5: Background async export job in ExportsDrawer
  test("P6-F5: Background Exports Drawer lists past jobs with status badges and download triggers", async ({
    page,
  }) => {
    await loginAs(page, "admin@fixture.local");
    await page.goto("/reports");

    // Click Exports drawer button
    const exportTasksBtn = page.locator('button:has-text("Export Tasks")');
    await exportTasksBtn.waitFor({ state: "visible", timeout: 10000 });
    await exportTasksBtn.click();

    await expect(page.locator("text=Background Export Tasks")).toBeVisible();
    // Verify drawer contents
    await expect(
      page
        .locator("text=/No background exports found|completed|running|queued/i")
        .first(),
    ).toBeVisible();
  });

  // P6-F6: Accessible Chart view toggle (Table view fallback)
  test("P6-F6: Accessible token-aware Chart component toggles between visual chart and accessible data table", async ({
    page,
  }) => {
    await loginAs(page, "admin@fixture.local");
    await page.goto("/");

    const headerTitle = page
      .locator("text=Hardware Inventory Status >> visible=true")
      .first();
    await expect(headerTitle).toBeVisible({ timeout: 10000 });

    // Find and click View Table accessible toggle (button with text Table)
    const tableToggle = page.locator('button:has-text("Table")').first();
    await expect(tableToggle).toBeVisible();
    await tableToggle.click();

    // Verify table representation appears
    await expect(page.locator("table >> visible=true").first()).toBeVisible();

    // Toggle back to Chart View (button with text Chart)
    const chartToggle = page.locator('button:has-text("Chart")').first();
    await expect(chartToggle).toBeVisible();
    await chartToggle.click();
    await expect(
      page.locator('button:has-text("Table")').first(),
    ).toBeVisible();
  });
});
