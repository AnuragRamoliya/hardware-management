import { test, expect } from "@playwright/test";
test("real login with fixture admin", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@fixture.local");
  await page.fill('input[name="password"]', "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });
  expect(page.url()).not.toContain("/login");
});
