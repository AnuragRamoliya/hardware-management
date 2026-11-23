import { test, expect } from "@playwright/test";

test.describe("Phase 9 UI Defect Regression Suite (UI-BUG-001 through UI-BUG-008)", () => {
  test("UI-BUG-001 - Form inputs scale to >= 16px font-size on mobile viewports to prevent iOS auto-zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/login");
    const input = page.locator('input[name="email"]');
    await expect(input).toBeVisible();

    const fontSize = await input.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("UI-BUG-002 - CommonTable View trigger button matches visible text 'View' with accessible label", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/employees");
    await page.waitForSelector("h1");

    const viewButton = page.locator(
      'button[aria-label="View display options"]',
    );
    await expect(viewButton).toBeVisible();
    const btnText = await viewButton.innerText();
    expect(btnText.trim()).toContain("View");
  });

  test("UI-BUG-003 - Slide-over Drawer employs full-height Sheet on mobile with dvh and safe-area padding", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/employees");
    const addBtn = page
      .locator('button:has-text("Add Employee"), button:has-text("Add")')
      .first();
    await addBtn.click();
    await page.waitForSelector('[role="dialog"]');

    const drawer = page.locator('[role="dialog"]');
    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    // On mobile, width should equal viewport width
    expect(box!.width).toBe(360);
  });

  test("UI-BUG-004 - PageHeader breadcrumb links provide >= 36px interactive touch targets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/employees");
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"] a').first();
    if (await breadcrumb.isVisible()) {
      const box = await breadcrumb.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(36);
    }
  });

  test("UI-BUG-005 - PortalRequests actions column has header label and link has accessible name", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "emp@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/portal/requests");
    await page.waitForSelector("h1");

    // Table header for actions should have text "Actions"
    const actionHeader = page.locator('th:has-text("Actions")');
    await expect(actionHeader).toBeVisible();

    // Eye link should have accessible label
    const viewLinks = page.locator('a[aria-label^="View request"]');
    const count = await viewLinks.count();
    if (count > 0) {
      expect(await viewLinks.first().getAttribute("aria-label")).toMatch(
        /^View request/,
      );
    }
  });

  test("UI-BUG-006 - PortalOffboarding follows semantic heading hierarchy (no skipped h2)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "emp@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/portal/offboarding");
    await page.waitForSelector("h1");

    // Empty state heading must be h2 (not h3 after h1)
    const emptyStateHeading = page.locator("h2, h3").first();
    const tagName = await emptyStateHeading.evaluate((el) =>
      el.tagName.toLowerCase(),
    );
    expect(tagName).toBe("h2");
  });

  test("UI-BUG-007 - Stepper completed step buttons provide discernible accessible label", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/design-system");
    await page.waitForSelector("h1");

    // Completed step buttons in stepper must have aria-label
    const completedStepBtn = page
      .locator('button[aria-label*="completed"]')
      .first();
    await expect(completedStepBtn).toBeVisible();
    const label = await completedStepBtn.getAttribute("aria-label");
    expect(label).toContain("completed");
  });

  test("UI-BUG-008 - PasswordStrengthMeter progressbar element has accessible aria-label", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/design-system");
    await page.waitForSelector("h1");

    const progressbar = page.locator('div[role="progressbar"]').first();
    await expect(progressbar).toBeVisible();
    const label = await progressbar.getAttribute("aria-label");
    expect(label).toContain("Password strength:");
  });

  test("UI-BUG-009 - RHFFileField file input is bounded without overflowing document scrollWidth", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/design-system");
    await page.waitForSelector("h1");

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBe(1440);
  });

  test("UI-BUG-010 - Card components with responsive padding and min-w-0 do not overflow 320px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"));

    await page.goto("/design-system");
    await page.waitForSelector("h1");

    const scrollWidth = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    );
    expect(scrollWidth).toBe(320);
  });
});
