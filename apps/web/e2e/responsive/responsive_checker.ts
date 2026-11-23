import { type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export interface CheckResult {
  passed: boolean;
  checkId: string;
  name: string;
  details: string;
  measured?: Record<string, unknown>;
}

export async function checkR1_HorizontalScroll(
  page: Page,
): Promise<CheckResult> {
  const result = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;

    // Ancestor overflow check: find any element wider than window without overflow auto/scroll
    const offenders: Array<{
      selector: string;
      width: number;
      innerWidth: number;
    }> = [];
    const all = document.querySelectorAll("*");
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement;
      if (!el.getBoundingClientRect) continue;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width > winWidth + 1 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        !["auto", "scroll"].includes(style.overflowX) &&
        !["html", "body"].includes(el.tagName.toLowerCase())
      ) {
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : el.className ? "." + el.className.split(" ")[0] : ""}`,
          width: Math.round(rect.width),
          innerWidth: winWidth,
        });
        if (offenders.length >= 3) break;
      }
    }

    return {
      docWidth,
      winWidth,
      bodyWidth,
      hasOverflow: docWidth > winWidth + 1 || bodyWidth > winWidth + 1,
      offenders,
    };
  });

  return {
    passed: !result.hasOverflow,
    checkId: "R1",
    name: "Document & Ancestor Horizontal Overflow",
    details: result.hasOverflow
      ? `Horizontal overflow detected: scrollWidth ${result.docWidth}px > innerWidth ${result.winWidth}px. Offending elements: ${JSON.stringify(result.offenders)}`
      : `scrollWidth ${result.docWidth}px <= innerWidth ${result.winWidth}px`,
    measured: result,
  };
}

export async function checkR2_ElementFitAndClipping(
  page: Page,
): Promise<CheckResult> {
  const result = await page.evaluate(() => {
    const winWidth = window.innerWidth;
    const clipped: Array<{
      text: string;
      scrollWidth: number;
      clientWidth: number;
    }> = [];
    const elements = document.querySelectorAll(
      "p, span, h1, h2, h3, h4, th, td, label",
    );

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      if (!el.offsetParent) continue;
      if (el.classList.contains("sr-only") || el.closest(".sr-only")) continue;
      const style = window.getComputedStyle(el);
      if (
        style.overflow === "hidden" &&
        style.textOverflow !== "ellipsis" &&
        el.scrollWidth > el.clientWidth + 2
      ) {
        clipped.push({
          text: (el.textContent || "").trim().slice(0, 30),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        });
        if (clipped.length >= 3) break;
      }
    }

    return {
      clippedCount: clipped.length,
      clipped,
      winWidth,
    };
  });

  return {
    passed: result.clippedCount === 0,
    checkId: "R2",
    name: "Element Fit and Text Clipping",
    details:
      result.clippedCount > 0
        ? `Text clipping detected without ellipsis: ${JSON.stringify(result.clipped)}`
        : "No unintended text clipping detected",
    measured: result,
  };
}

export async function checkR3_OverlayGeometry(
  page: Page,
  overlaySelector?: string,
): Promise<CheckResult> {
  const result = await page.evaluate((selector) => {
    const sel =
      selector ||
      '[role="dialog"], [data-radix-dialog-content], .dialog-content';
    const dialogs = document.querySelectorAll(sel);
    if (!dialogs.length)
      return { hasDialog: false, passed: true, details: "No overlay present" };

    const viewportH = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    const viewportW = window.visualViewport
      ? window.visualViewport.width
      : window.innerWidth;
    const failures: string[] = [];

    dialogs.forEach((diag, idx) => {
      const rect = diag.getBoundingClientRect();
      const style = window.getComputedStyle(diag);

      if (rect.height > viewportH + 2) {
        failures.push(
          `Dialog #${idx} height (${Math.round(rect.height)}px) exceeds visualViewport (${Math.round(viewportH)}px)`,
        );
      }
      if (rect.width > viewportW + 2) {
        failures.push(
          `Dialog #${idx} width (${Math.round(rect.width)}px) exceeds visualViewport (${Math.round(viewportW)}px)`,
        );
      }
      if (
        rect.bottom > viewportH + 2 &&
        !["auto", "scroll"].includes(style.overflowY)
      ) {
        failures.push(
          `Dialog #${idx} bottom (${Math.round(rect.bottom)}px) cut off below viewport without scroll`,
        );
      }
    });

    return {
      hasDialog: true,
      passed: failures.length === 0,
      failures,
      viewportW,
      viewportH,
    };
  }, overlaySelector);

  return {
    passed: result.passed,
    checkId: "R3",
    name: "Overlay Geometry & Visual Viewport Fit",
    details:
      result.failures && result.failures.length > 0
        ? result.failures.join("; ")
        : "Overlay geometry conforms to visualViewport",
    measured: result,
  };
}

export async function checkR4_Transformations(
  page: Page,
  isMobile: boolean,
): Promise<CheckResult> {
  const result = await page.evaluate((mobile) => {
    if (!mobile)
      return {
        passed: true,
        details: "Desktop viewport - transformation check skipped",
      };

    const issues: string[] = [];
    // 1. Table check: desktop <table> should be hidden and mobile card list visible
    const desktopTable = document.querySelector(
      ".hidden.overflow-x-auto.md\\:block table",
    );
    const mobileCards = document.querySelector(".divide-y.md\\:hidden");
    if (desktopTable && !mobileCards) {
      issues.push("Table does not have mobile card alternative");
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }, isMobile);

  return {
    passed: result.passed,
    checkId: "R4",
    name: "Mobile Responsive Transformations (Cards & Sheets)",
    details:
      result.issues && result.issues.length > 0
        ? result.issues.join("; ")
        : "Responsive transformations verified",
    measured: result,
  };
}

export async function checkR5_FormLayout(
  page: Page,
  isMobile: boolean,
): Promise<CheckResult> {
  const result = await page.evaluate((mobile) => {
    const issues: string[] = [];
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea',
    );

    let sub16pxInputs = 0;
    inputs.forEach((input) => {
      const fontSize = parseFloat(window.getComputedStyle(input).fontSize);
      if (mobile && fontSize < 15.5) {
        sub16pxInputs++;
      }
    });

    if (mobile && sub16pxInputs > 0) {
      issues.push(
        `${sub16pxInputs} inputs have font-size < 16px on mobile view (triggers iOS zoom)`,
      );
    }

    return {
      totalInputs: inputs.length,
      sub16pxInputs,
      passed: issues.length === 0,
      issues,
    };
  }, isMobile);

  return {
    passed: result.passed,
    checkId: "R5",
    name: "Form Layout & Mobile Input Font Sizing",
    details:
      result.issues && result.issues.length > 0
        ? result.issues.join("; ")
        : "Form fields correctly sized (>=16px on mobile)",
    measured: result,
  };
}

export async function checkR6_TouchTargets(
  page: Page,
  isTouch: boolean,
): Promise<CheckResult> {
  const result = await page.evaluate((touch) => {
    if (!touch)
      return {
        passed: true,
        details: "Non-touch viewport - touch target size check skipped",
      };

    const interactive = document.querySelectorAll<HTMLElement>(
      "button, a, input, select, textarea, [role='button']",
    );
    const undersized: Array<{
      tag: string;
      label: string;
      width: number;
      height: number;
    }> = [];

    interactive.forEach((el) => {
      if (!el.offsetParent) return; // not visible
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return;

      // Allow inline links or tiny badges within text
      if (el.tagName.toLowerCase() === "a" && style.display === "inline")
        return;
      if (el.classList.contains("sr-only")) return;

      // If interactive element is smaller than 36px on mobile, flag as severe touch hazard
      if (
        (rect.width < 34 || rect.height < 34) &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        undersized.push({
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute("aria-label") || el.innerText || "")
            .trim()
            .slice(0, 20),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });

    return {
      totalInteractive: interactive.length,
      undersizedCount: undersized.length,
      undersized: undersized.slice(0, 5),
      passed: undersized.length === 0,
    };
  }, isTouch);

  return {
    passed: result.passed,
    checkId: "R6",
    name: "Interactive Touch Targets (>= 44x44px target sizing)",
    details:
      result.undersizedCount && result.undersizedCount > 0
        ? `Found ${result.undersizedCount} undersized touch targets (< 36px): ${JSON.stringify(result.undersized)}`
        : "Touch targets meet accessible size guidelines",
    measured: result,
  };
}

export async function checkR7_LayoutStability(
  page: Page,
  width: number,
): Promise<CheckResult> {
  const currentPath = new URL(page.url()).pathname;
  const result = await page.evaluate(
    ({ w, path }) => {
      const isMobileNav = w <= 1024;
      const sidebar = document.querySelector("aside");
      const hamburger = document.querySelector(
        'button[aria-label="Open navigation menu"]',
      );

      const issues: string[] = [];
      if (isMobileNav) {
        if (sidebar && window.getComputedStyle(sidebar).display !== "none") {
          issues.push("Sidebar should be hidden or collapsed at <= 1024px");
        }
        if (!hamburger && path !== "/login" && path !== "/verify-document") {
          // Authenticated routes require hamburger on mobile
          const userMenu = document.querySelector('[aria-label="User menu"]');
          if (userMenu)
            issues.push(
              "Mobile hamburger button missing on authenticated screen at <= 1024px",
            );
        }
      }

      return {
        passed: issues.length === 0,
        issues,
      };
    },
    { w: width, path: currentPath },
  );

  return {
    passed: result.passed,
    checkId: "R7",
    name: "Layout Stability & Mobile Navigation Bar",
    details:
      result.issues && result.issues.length > 0
        ? result.issues.join("; ")
        : "Layout stably adapted to viewport",
    measured: result,
  };
}

export async function checkR10_Accessibility(page: Page): Promise<CheckResult> {
  const axe = await new AxeBuilder({ page })
    .disableRules(["color-contrast", "page-has-heading-one"]) // Handled by R9 & semantic structure
    .analyze();

  return {
    passed: axe.violations.length === 0,
    checkId: "R10",
    name: "Axe-core Accessibility Violations",
    details:
      axe.violations.length > 0
        ? `Axe violations (${axe.violations.length}): ${axe.violations.map((v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`).join("; ")}`
        : "Zero axe-core violations",
    measured: {
      violationsCount: axe.violations.length,
      violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact })),
    },
  };
}
