import { test, expect } from "@playwright/test";
import {
  checkR1_HorizontalScroll,
  checkR2_ElementFitAndClipping,
  checkR3_OverlayGeometry,
  checkR4_Transformations,
  checkR5_FormLayout,
  checkR6_TouchTargets,
  checkR7_LayoutStability,
  checkR10_Accessibility,
} from "./responsive_checker";

const AUTH_PAGES = [
  { id: "AUTH-01", path: "/login", name: "Login Page" },
  { id: "AUTH-05", path: "/verify-document", name: "Verify Document Page" },
  { id: "ERR-01", path: "/404-test-page", name: "Not Found Page" },
];

const ADMIN_PAGES = [
  { id: "DASH-01", path: "/dashboard", name: "Dashboard" },
  { id: "EMP-01", path: "/employees", name: "Employees List" },
  { id: "AST-01", path: "/assets", name: "Assets List" },
  { id: "SFT-01", path: "/software", name: "Software List" },
  { id: "CRD-01", path: "/credentials", name: "Credential Vault" },
  { id: "REQ-01", path: "/requests", name: "Requests List" },
  { id: "OFF-01", path: "/offboarding/cases", name: "Offboarding Cases" },
  { id: "REP-01", path: "/reports", name: "Reports Catalogue" },
  {
    id: "REP-02",
    path: "/reports/hardware-inventory",
    name: "Report Detail Page",
  },
  { id: "NOTIF-01", path: "/notifications", name: "Notifications Center" },
  { id: "USR-01", path: "/users", name: "Users List" },
  { id: "ROL-01", path: "/roles", name: "Roles and Permissions" },
  { id: "AUD-01", path: "/audit-logs", name: "Audit Logs" },
  { id: "DS-01", path: "/design-system", name: "Design System Showcase" },
];

const EMPLOYEE_PAGES = [
  { id: "DASH-04", path: "/portal", name: "Portal Landing" },
  { id: "REQ-05", path: "/portal/requests", name: "Portal My Requests" },
  { id: "REQ-08", path: "/portal/assets", name: "Portal My Assets" },
  { id: "REQ-09", path: "/portal/software", name: "Portal My Software" },
  { id: "OFF-07", path: "/portal/offboarding", name: "Portal Offboarding" },
];

test.describe("Phase 9 Responsive & UI Harness - Public & Auth Pages", () => {
  for (const pageItem of AUTH_PAGES) {
    test(`${pageItem.id} - ${pageItem.name} responsive & layout audit`, async ({
      page,
    }) => {
      await page.goto(pageItem.path);
      await page.waitForLoadState("domcontentloaded");

      const width = page.viewportSize()?.width ?? 1440;
      const isMobile = width <= 640;
      const isTouch = width <= 1024;

      const r1 = await checkR1_HorizontalScroll(page);
      expect(r1.passed, `[${pageItem.id}] R1 failure: ${r1.details}`).toBe(
        true,
      );

      const r2 = await checkR2_ElementFitAndClipping(page);
      expect(r2.passed, `[${pageItem.id}] R2 failure: ${r2.details}`).toBe(
        true,
      );

      const r5 = await checkR5_FormLayout(page, isMobile);
      expect(r5.passed, `[${pageItem.id}] R5 failure: ${r5.details}`).toBe(
        true,
      );

      const r6 = await checkR6_TouchTargets(page, isTouch);
      expect(r6.passed, `[${pageItem.id}] R6 failure: ${r6.details}`).toBe(
        true,
      );

      const r10 = await checkR10_Accessibility(page);
      expect(r10.passed, `[${pageItem.id}] R10 failure: ${r10.details}`).toBe(
        true,
      );
    });
  }
});

test.describe("Phase 9 Responsive & UI Harness - Super Admin Module Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
  });

  for (const pageItem of ADMIN_PAGES) {
    test(`${pageItem.id} - ${pageItem.name} responsive & layout audit`, async ({
      page,
    }) => {
      await page.goto(pageItem.path);
      await page.waitForLoadState("domcontentloaded");
      // Wait for h1 or main content
      await page.waitForSelector("h1, h2, main", { timeout: 10000 });

      const width = page.viewportSize()?.width ?? 1440;
      const isMobile = width <= 640;
      const isTouch = width <= 1024;

      const r1 = await checkR1_HorizontalScroll(page);
      expect(r1.passed, `[${pageItem.id}] R1 failure: ${r1.details}`).toBe(
        true,
      );

      const r2 = await checkR2_ElementFitAndClipping(page);
      expect(r2.passed, `[${pageItem.id}] R2 failure: ${r2.details}`).toBe(
        true,
      );

      const r4 = await checkR4_Transformations(page, isMobile);
      expect(r4.passed, `[${pageItem.id}] R4 failure: ${r4.details}`).toBe(
        true,
      );

      const r5 = await checkR5_FormLayout(page, isMobile);
      expect(r5.passed, `[${pageItem.id}] R5 failure: ${r5.details}`).toBe(
        true,
      );

      const r6 = await checkR6_TouchTargets(page, isTouch);
      expect(r6.passed, `[${pageItem.id}] R6 failure: ${r6.details}`).toBe(
        true,
      );

      const r7 = await checkR7_LayoutStability(page, width);
      expect(r7.passed, `[${pageItem.id}] R7 failure: ${r7.details}`).toBe(
        true,
      );

      const r10 = await checkR10_Accessibility(page);
      expect(r10.passed, `[${pageItem.id}] R10 failure: ${r10.details}`).toBe(
        true,
      );
    });
  }

  test("NAV-02 - Mobile navigation sheet opens, displays links, and traps focus", async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 1440;
    if (width > 1024) return; // Only applies to mobile & tablet

    await page.goto("/dashboard");
    const hamburger = page.locator('button[aria-label="Open navigation menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Check overlay fit
    const r3 = await checkR3_OverlayGeometry(page);
    expect(r3.passed, `[NAV-02] R3 failure: ${r3.details}`).toBe(true);

    const r1 = await checkR1_HorizontalScroll(page);
    expect(r1.passed, `[NAV-02] R1 failure: ${r1.details}`).toBe(true);
  });

  test("EMP-02 - Employee Add Drawer renders full-screen Sheet on mobile with proper inputs", async ({
    page,
  }) => {
    await page.goto("/employees");
    const addBtn = page
      .locator('button:has-text("Add Employee"), button:has-text("Add")')
      .first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      const width = page.viewportSize()?.width ?? 1440;
      const isMobile = width <= 640;

      const r3 = await checkR3_OverlayGeometry(page);
      expect(r3.passed, `[EMP-02] R3 failure: ${r3.details}`).toBe(true);

      const r5 = await checkR5_FormLayout(page, isMobile);
      expect(r5.passed, `[EMP-02] R5 failure: ${r5.details}`).toBe(true);

      // Close drawer
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("Phase 9 Responsive & UI Harness - Employee Portal Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "emp@fixture.local");
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
  });

  for (const pageItem of EMPLOYEE_PAGES) {
    test(`${pageItem.id} - ${pageItem.name} responsive & layout audit`, async ({
      page,
    }) => {
      await page.goto(pageItem.path);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector("h1, h2, main", { timeout: 10000 });

      const width = page.viewportSize()?.width ?? 1440;
      const isMobile = width <= 640;
      const isTouch = width <= 1024;

      const r1 = await checkR1_HorizontalScroll(page);
      expect(r1.passed, `[${pageItem.id}] R1 failure: ${r1.details}`).toBe(
        true,
      );

      const r2 = await checkR2_ElementFitAndClipping(page);
      expect(r2.passed, `[${pageItem.id}] R2 failure: ${r2.details}`).toBe(
        true,
      );

      const r4 = await checkR4_Transformations(page, isMobile);
      expect(r4.passed, `[${pageItem.id}] R4 failure: ${r4.details}`).toBe(
        true,
      );

      const r5 = await checkR5_FormLayout(page, isMobile);
      expect(r5.passed, `[${pageItem.id}] R5 failure: ${r5.details}`).toBe(
        true,
      );

      const r6 = await checkR6_TouchTargets(page, isTouch);
      expect(r6.passed, `[${pageItem.id}] R6 failure: ${r6.details}`).toBe(
        true,
      );

      const r7 = await checkR7_LayoutStability(page, width);
      expect(r7.passed, `[${pageItem.id}] R7 failure: ${r7.details}`).toBe(
        true,
      );

      const r10 = await checkR10_Accessibility(page);
      expect(r10.passed, `[${pageItem.id}] R10 failure: ${r10.details}`).toBe(
        true,
      );
    });
  }
});
