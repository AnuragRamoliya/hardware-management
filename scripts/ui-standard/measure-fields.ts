import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function measure() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login as admin
  await page.goto("http://localhost:5173/login");
  await page.fill('input[name="email"]', "admin@fixture.local");
  await page.fill('input[name="password"]', "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  console.log("Logged in successfully. Navigating to /design-system...");
  await page.goto("http://localhost:5173/design-system");
  await page.waitForSelector("h1, h2, main", { timeout: 10000 });

  // Measure desktop (1440px)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  const measureElement = async (selector: string) => {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        selector: sel,
        tag: el.tagName.toLowerCase(),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
        color: style.color,
      };
    }, selector);
  };

  const selectors = [
    { kind: "text", selector: 'input[name="text"]' },
    { kind: "textarea", selector: 'textarea[name="textarea"]' },
    { kind: "select", selector: '[data-hm="select"]' },
    { kind: "date", selector: '[data-hm="date-picker"]' },
    { kind: "phone", selector: '[data-hm="phone"] input' },
    { kind: "phone-trigger", selector: '[data-hm="phone"] button' },
    { kind: "currency", selector: 'input[name="currency"]' },
    { kind: "password", selector: 'input[name="password"]' },
    { kind: "switch", selector: '[data-hm="switch"]' },
    { kind: "checkbox", selector: '[data-hm="checkbox"]' },
  ];

  const desktopMeasurements: Record<string, any> = {};
  for (const item of selectors) {
    desktopMeasurements[item.kind] = await measureElement(item.selector);
  }

  // Switch to mobile (360px)
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(500);

  const mobileMeasurements: Record<string, any> = {};
  for (const item of selectors) {
    mobileMeasurements[item.kind] = await measureElement(item.selector);
  }

  await browser.close();

  const results = {
    measuredAt: new Date().toISOString(),
    viewports: {
      desktop: "1440x900",
      mobile: "360x740",
    },
    desktop: desktopMeasurements,
    mobile: mobileMeasurements,
  };

  const outPath = path.resolve(
    __dirname,
    "../../docs/ui-standard/field-measurements.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("Field measurements saved to:", outPath);
  console.log("\n=== DESKTOP vs MOBILE FONT SIZE & HEIGHT MEASUREMENTS ===");
  for (const item of selectors) {
    const d = desktopMeasurements[item.kind];
    const m = mobileMeasurements[item.kind];
    if (d && m) {
      console.log(
        `${item.kind.padEnd(14)}: Desktop Height: ${d.height}px, Font: ${d.fontSize} | Mobile Height: ${m.height}px, Font: ${m.fontSize} (Radius: ${d.borderRadius})`,
      );
    }
  }
}

measure().catch((err) => {
  console.error("Measurement error:", err);
  process.exit(1);
});
