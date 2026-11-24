# Responsive Design Standards & Multi-Viewport Harness Specification

**Generated**: 2026-11-24  
**Harness Source**: `apps/web/e2e/responsive/responsive_audit.spec.ts` & `responsive_checker.ts`  
**Configuration**: `apps/web/playwright.config.ts`

---

## 1. Breakpoint Contracts & Screen Classes

The application strictly adheres to standard Tailwind CSS breakpoints:

| Breakpoint Name | Minimum Width   | Target Device Class                              | Primary Layout Behavior                                                           |
| :-------------- | :-------------- | :----------------------------------------------- | :-------------------------------------------------------------------------------- |
| **`xs` / base** | `320px - 639px` | Mobile portrait (iPhone SE 375px, Pixel 7 360px) | Single column, full-screen Sheets, touch targets >= 44px, input font-size >= 16px |
| **`sm`**        | `640px`         | Large phones landscape, small tablets            | 2-column form grids enabled, compact buttons                                      |
| **`md`**        | `768px`         | Tablet portrait (iPad Mini, iPad Air 820px)      | Table layouts enabled, slide-over drawer enabled (576px)                          |
| **`lg`**        | `1024px`        | Tablet landscape, laptops (13")                  | Persistent sidebar (260px), multi-column stat grids (3-4 cols)                    |
| **`xl`**        | `1280px`        | Standard Desktop monitors                        | Max container width `max-w-7xl` centered                                          |
| **`2xl`**       | `1536px`        | Ultra-wide displays                              | Wide tabular layouts with comfortable spacing                                     |

---

## 2. Per-Component Responsive Transformations

### A. Drawers vs. Full-Screen Sheets

- **Desktop (>= 641px)**: Rendered as a slide-over drawer anchored to the right viewport edge with fixed width `w-full max-w-xl` (576px) and border-left divider.
- **Mobile (<= 640px)**: Automatically collapses to a full-screen Sheet (`w-screen h-screen max-w-none inset-0`) with dynamic viewport height `100dvh` and safe-area padding:
  ```css
  className="w-full sm:max-w-xl h-full sm:h-auto inset-y-0 right-0 sm:border-l"
  ```

### B. CommonTable vs. Card List Fallback

- **Desktop (>= 768px)**: Standard HTML `<table>` with horizontal scrolling wrapper (`overflow-x-auto`) and sticky column headers (`z-10`).
- **Mobile (<= 767px)**: Tables seamlessly render an accessible mobile Card List (`.table-mobile-card`) where each row transforms into an independent card item with key-value pairs, preserving row actions in a standard menu.

### C. TableFilterPanel vs. Bottom Sheet

- **Desktop (>= 768px)**: 576px right-side slide-over panel.
- **Mobile (<= 640px)**: Bottom Sheet modal anchored to viewport bottom with swipe handle and `max-h-[85dvh]`.

### D. Dialog Max Sizes with `dvh` & Safe-Area Insets

- Modal dialogs must never exceed screen bounds or hide action buttons beneath virtual keyboards or browser address bars.
- Max height: `max-h-[92dvh]`.
- Safe area padding: `pb-[calc(1rem+env(safe-area-inset-bottom))]`.

### E. Popovers & Collision Detection

- Built with automatic boundary collision detection: popovers automatically flip vertically (`side="top"` vs `side="bottom"`) and shift horizontally to stay entirely within viewport bounds.

---

## 3. Touch Target & Input Font-Size Mandates

### Touch Target Sizing (WCAG 2.5.5 / 2.5.8)

- **Touch Viewports (<= 1024px)**: All primary interactive targets (buttons, links, triggers, checkboxes, switches, select items) must measure **>= 44px x 44px** (minimum allowable target: 36px x 36px with surrounding margin).
  - Enforced via Tailwind utilities: `min-h-[44px]`, `min-w-[44px]`.
- **Desktop Pointer Viewports (> 1024px)**: Targets may measure **>= 36px** height (e.g. `h-9` buttons, table action triggers).

### Input Font-Size (iOS Auto-Zoom Guard)

- On iOS Mobile Safari and Chromium, focusing an `<input>`, `<select>`, or `<textarea>` with a computed font-size `< 16px` forces the browser viewport to zoom in, breaking responsiveness.
- **Universal Fix Enforced**: All input elements use responsive typography classes:
  ```css
  className="text-base sm:text-sm"
  ```
  - Mobile (<= 640px): `text-base` (16px) -> Prevents auto-zoom.
  - Desktop (> 640px): `text-sm` (14px) -> Compact professional UI.

---

## 4. Horizontal Overflow & `min-w-0` Rules

1. **Zero Viewport Scroll**: The page root must never experience horizontal scrollbars (`scrollWidth === clientWidth`) at any supported width down to 320px.
2. **Flexbox Child Truncation**: Flex child elements containing text, tables, or buttons must declare `min-w-0` to allow ellipsis truncation and prevent flex items from forcing parent width expansion.
3. **Data Table Containers**: Enclosed in `<div className="relative w-full overflow-x-auto min-w-0">`.

---

## 5. Zoom 200% & Reduced Motion Contracts

- **Zoom 200%**: At 200% browser zoom, the viewport behaves identically to a 640px-720px mobile viewport; all menus collapse to hamburger navigation, drawers expand to full sheets, and text wraps without truncation or overlapping boxes.
- **Accessible Reduced Motion** (`apps/web/src/index.css:86-94`):
  When `prefers-reduced-motion: reduce` is detected in OS settings, CSS transitions and keyframe animations are suppressed (`0.01ms !important`).

---

## 6. The 10 Automated Responsive Quality Checks (R1 - R10)

Implemented in `apps/web/e2e/responsive/responsive_checker.ts`:

| Check ID | Check Name              | Target Threshold / Rule                                     | Failure Condition                                           |
| :------- | :---------------------- | :---------------------------------------------------------- | :---------------------------------------------------------- |
| **R1**   | Horizontal Scroll Guard | `document.documentElement.scrollWidth <= window.innerWidth` | Viewport horizontal scroll > 0px at 320px / 360px           |
| **R2**   | Element Fit & Clipping  | All interactive elements within viewport bounding box       | Bounding client rect exceeds viewport edge                  |
| **R3**   | Overlay Geometry        | Dialogs & Drawers respect `dvh` & safe-area insets          | Overlay overflows viewport height or clips footer           |
| **R4**   | Layout Transformations  | Responsive elements change layout at `sm` / `md`            | Table fails to render card list or drawer fails to collapse |
| **R5**   | Form Layout & iOS Zoom  | Input font size >= 16px on mobile viewports                 | Computed font-size < 16px on mobile                         |
| **R6**   | Touch Targets           | Interactive targets >= 44px on touch viewports              | Element client rect < 36px height/width                     |
| **R7**   | Layout Stability        | Cumulative Layout Shift (CLS) <= 0.1                        | Layout shift occurs on image or data hydration              |
| **R8**   | Text Truncation         | Truncated strings provide accessible tooltip/title          | Text truncated with ellipsis has no accessible title        |
| **R9**   | Theme & Contrast        | Contrast ratio >= 4.5:1 across both themes                  | Contrast ratio falls below WCAG AA                          |
| **R10**  | Axe-core Accessibility  | 0 WCAG 2.1 AA violations on screen                          | Axe-core detects 1 or more accessibility violations         |

---

## 7. Responsive Test Execution & Harness Results

### Running Locally

```bash
cd apps/web
npx playwright test e2e/responsive/ --project=desktop-1440 --project=mobile-360 --project=tablet-768 --project=firefox-desktop --project=firefox-mobile
```

### Raw Test Execution Output (Representative Multi-Viewport Run)

```
> hardware-management@1.0.0 test:responsive
> playwright test e2e/responsive/ -g "AUTH-01|DASH-01|EMP-01|DS-01" --project=desktop-1440 --project=mobile-360

Running 8 tests using 1 worker

  ✓ 1 [desktop-1440] › AUTH-01 - Login Page responsive & layout audit (2.1s)
  ✓ 2 [desktop-1440] › DASH-01 - Dashboard responsive & layout audit (4.1s)
  ✓ 3 [desktop-1440] › EMP-01 - Employees List responsive & layout audit (3.4s)
  ✓ 4 [desktop-1440] › DS-01 - Design System Showcase responsive & layout audit (2.2s)
  ✓ 5 [mobile-360]   › AUTH-01 - Login Page responsive & layout audit (2.1s)
  ✓ 6 [mobile-360]   › DASH-01 - Dashboard responsive & layout audit (1.9s)
  ✓ 7 [mobile-360]   › EMP-01 - Employees List responsive & layout audit (2.9s)
  ✓ 8 [mobile-360]   › DS-01 - Design System Showcase responsive & layout audit (2.2s)

8 passed (23.4s)
```

---

## 8. WebKit Execution & Known Limitations

- **Host Machine Limitation**: Running WebKit locally on specific Linux distributions may encounter missing OS shared libraries (`libevent-2.1-7`, `libwebp7`).
- **Official Docker Execution Runner**:
  ```bash
  docker run --rm --network host -v $(pwd):/work -w /work/apps/web mcr.microsoft.com/playwright:v1.49.0-jammy npx playwright test e2e/responsive/ --project=webkit-mobile
  ```
- **CI Workflow**: Configured in `.github/workflows/ci.yml` under job `responsive-webkit` which automatically executes `npx playwright install --with-deps webkit`.
