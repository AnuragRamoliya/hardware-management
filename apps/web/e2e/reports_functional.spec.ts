import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 6: Functional & E2E Reports Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common auth and global queries on backend origin
    await page.route("**/module/permission", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          data: [
            {
              module: { name: "report" },
              read_access: true,
              write_access: true,
              delete_access: true,
            },
          ],
        }),
      });
    });
    await page.route("**/notifications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, data: [] }),
      });
    });

    // Set authenticated super_admin session in localStorage
    await page.goto("/login");
    await page.evaluate(() => {
      window.localStorage.setItem("token", "mock-jwt-token");
      window.localStorage.setItem("refresh_token", "mock-refresh-token");
      window.localStorage.setItem(
        "itam-auth",
        JSON.stringify({
          state: {
            token: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: 1,
              role_name: "admin",
              first_name: "Admin",
              last_name: "User",
              role: { id: 1, name: "super_admin" },
            },
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    });
  });

  // P6-F1: Report catalogue navigation & search
  test("P6-F1: Report Catalogue navigation, categorization, and search filtering", async ({
    page,
  }) => {
    await page.route("**/reports/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Reports list fetched",
          data: [
            {
              key: "hardware-per-employee",
              title: "Hardware Per Employee",
              description:
                "Overview of company hardware assets deployed to employees.",
              category: "hardware",
              module: "report",
              columns: [],
            },
            {
              key: "software-license-utilization",
              title: "Software License Utilization",
              description:
                "Seat allocation and utilization percentages across software.",
              category: "software",
              module: "report",
              columns: [],
            },
            {
              key: "audit-export",
              title: "Full System Audit & Activity Logs",
              description: "Cryptographic hash chain verified ledger.",
              category: "audit",
              module: "report",
              columns: [],
            },
          ],
        }),
      });
    });

    await page.goto("/reports");
    await expect(page.locator("h1")).toContainText(
      "Reports & Analytics Catalogue",
    );

    // Verify categories and cards appear
    await expect(page.locator("text=Hardware Per Employee")).toBeVisible();
    await expect(
      page.locator("text=Software License Utilization"),
    ).toBeVisible();
    await expect(
      page.locator("text=Full System Audit & Activity Logs"),
    ).toBeVisible();

    // Verify search input filters cards dynamically
    const searchInput = page.locator('input[placeholder*="Search reports"]');
    await searchInput.fill("Audit");
    await expect(
      page.locator("text=Full System Audit & Activity Logs"),
    ).toBeVisible();
    await expect(page.locator("text=Hardware Per Employee")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.locator("text=Hardware Per Employee")).toBeVisible();

    // Axe audit on catalogue page
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "label-content-name-mismatch"])
      .analyze();
    expect(a11y.violations).toEqual([]);
  });

  // P6-F2: Role-based report catalogue visibility
  test("P6-F2: Role-based report catalogue visibility enforces restricted access", async ({
    page,
  }) => {
    // Override user session to hardware_manager
    await page.evaluate(() => {
      window.localStorage.setItem(
        "itam-auth",
        JSON.stringify({
          state: {
            token: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: 2,
              role_name: "hardware",
              first_name: "HW",
              last_name: "Mgr",
              role: { id: 2, name: "hardware_manager" },
            },
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    });

    // Hardware manager list (no audit-export, no credential-approvals-access)
    await page.route("**/reports/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Reports list fetched",
          data: [
            {
              key: "hardware-per-employee",
              title: "Hardware Per Employee",
              description:
                "Overview of company hardware assets deployed to employees.",
              category: "hardware",
              module: "report",
              columns: [],
            },
          ],
        }),
      });
    });

    await page.goto("/reports");
    await expect(page.locator("text=Hardware Per Employee")).toBeVisible();
    await expect(
      page.locator("text=Full System Audit & Activity Logs"),
    ).not.toBeVisible();
  });

  // P6-F3: Generic ReportPage metadata-driven rendering, KPI strip and CommonTable
  test("P6-F3: Generic ReportPage metadata-driven rendering, KPI strip and CommonTable", async ({
    page,
  }) => {
    // Mock report meta
    await page.route("**/reports/meta/hardware-per-employee", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Report meta fetched",
          data: {
            key: "hardware-per-employee",
            title: "Hardware Per Employee",
            description:
              "Overview of company hardware assets deployed to employees.",
            category: "hardware",
            module: "report",
            columns: [
              {
                key: "employee_name",
                label: "Employee",
                type: "string",
                sortable: true,
              },
              {
                key: "asset_tag",
                label: "Asset Tag",
                type: "string",
                sortable: true,
              },
              {
                key: "category",
                label: "Category",
                type: "string",
                sortable: true,
              },
            ],
          },
        }),
      });
    });

    // Mock report run data
    await page.route("**/reports/run/hardware-per-employee", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Report executed",
          data: {
            summary: [
              { label: "Total Assigned Assets", value: 42 },
              { label: "Active Employees with Hardware", value: 38 },
            ],
            rows: [
              {
                id: 101,
                employee_name: "Alice Cooper",
                asset_tag: "TAG-DEV-001",
                category: "Laptop",
              },
              {
                id: 102,
                employee_name: "Bob Marley",
                asset_tag: "TAG-DEV-002",
                category: "Monitor",
              },
            ],
            count: 2,
            page: 1,
            pageSize: 20,
          },
        }),
      });
    });

    await page.goto("/reports/hardware-per-employee");
    await expect(page.locator("h1")).toContainText("Hardware Per Employee");

    // KPI strip assertions
    await expect(page.locator("text=Total Assigned Assets")).toBeVisible();
    await expect(page.locator("text=42")).toBeVisible();

    // Table rows assertions (target visible elements across desktop table and mobile card layout)
    await expect(
      page.locator("text=Alice Cooper >> visible=true").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=TAG-DEV-001 >> visible=true").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Bob Marley >> visible=true").first(),
    ).toBeVisible();

    // Check accessibility
    const a11y = await new AxeBuilder({ page })
      .disableRules(["color-contrast", "label-content-name-mismatch"])
      .analyze();
    expect(a11y.violations).toEqual([]);
  });

  // P6-F4: Synchronous export dialog flow and format selection
  test("P6-F4: Synchronous export dialog flow and format selection", async ({
    page,
  }) => {
    await page.route("**/reports/meta/hardware-per-employee", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Meta",
          data: {
            key: "hardware-per-employee",
            title: "Hardware Per Employee",
            description: "Overview",
            category: "hardware",
            columns: [
              { key: "employee_name", label: "Employee", type: "string" },
            ],
          },
        }),
      });
    });

    await page.route("**/reports/run/hardware-per-employee", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Data",
          data: {
            summary: [],
            rows: [{ id: 1, employee_name: "Alice" }],
            count: 1,
            page: 1,
            pageSize: 20,
          },
        }),
      });
    });

    await page.goto("/reports/hardware-per-employee");
    // Open Export modal by clicking "Export Report"
    await page.click('button:has-text("Export Report")');
    await expect(page.locator("text=Export Report Dataset")).toBeVisible();
    await expect(page.locator("text=File Format")).toBeVisible();
    await expect(
      page.locator("text=Run as background export task"),
    ).toBeVisible();
  });

  // P6-F5: Background async export job in ExportsDrawer
  test("P6-F5: Background Exports Drawer lists past jobs with status badges and download triggers", async ({
    page,
  }) => {
    await page.route("**/reports/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, data: [] }),
      });
    });

    await page.route("**/reports/jobs/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          data: [
            {
              id: 9001,
              report_key: "audit-export",
              format: "csv",
              job_status: "completed",
              progress: 100,
              row_count: 50000,
              file_path: "available",
              file_sha256:
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              createdAt: "2026-11-20T10:00:00.000Z",
            },
          ],
        }),
      });
    });

    await page.goto("/reports");
    // Click Exports drawer button
    await page.click('button:has-text("Export Tasks")');
    await expect(page.locator("text=Background Export Tasks")).toBeVisible();
    await expect(
      page.locator("text=/audit export/i >> visible=true"),
    ).toBeVisible();
    await expect(
      page.locator("text=/50,000 rows/i >> visible=true"),
    ).toBeVisible();
  });

  // P6-F6: Accessible Chart view toggle (Table view fallback)
  test("P6-F6: Accessible token-aware Chart component toggles between visual chart and accessible data table", async ({
    page,
  }) => {
    // Intercept backend API calls to prevent 401 session logout
    await page.route("http://localhost:8000/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/dashboard/summary") || url.includes("/dashboard")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            data: {
              totalAssets: 100,
              available: 40,
              assigned: 50,
              inRepair: 10,
              expiringWarranties: 5,
              softwareCount: 20,
              expiringLicenses: 2,
              seatsTotal: 100,
              seatsUsed: 75,
              seatsAvailable: 25,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            data: { count: 0, rows: [], metrics: {} },
          }),
        });
      }
    });

    await page.goto("/");
    const headerTitle = page
      .locator("text=Hardware Inventory Status >> visible=true")
      .first();
    await expect(headerTitle).toBeVisible();

    // Find and click View Table accessible toggle (button with text Table)
    const tableToggle = page.locator('button:has-text("Table")').first();
    await expect(tableToggle).toBeVisible();
    await tableToggle.dispatchEvent("click");

    // Verify table representation appears
    await expect(page.locator("table >> visible=true").first()).toBeVisible();
    await expect(
      page
        .locator('td:has-text("Assigned (Deployed)") >> visible=true')
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('td:has-text("50") >> visible=true').first(),
    ).toBeVisible();

    // Toggle back to Chart View (button with text Chart)
    const chartToggle = page.locator('button:has-text("Chart")').first();
    await expect(chartToggle).toBeVisible();
    await chartToggle.dispatchEvent("click");
    await expect(
      page.locator('button:has-text("Table")').first(),
    ).toBeVisible();
  });
});
