# Design Tokens and Theming Architecture

**Generated**: 2026-11-24  
**Source Files**: `apps/web/tailwind.config.ts`, `apps/web/src/index.css`, `apps/web/src/components/common/Chart.tsx`  
**Machine-Readable Catalog**: `docs/ui-standard/tokens.json`  
**Generator Script**: `scripts/ui-standard/generate-tokens.ts`

---

## 1. Theming Strategy & Mode Switching

- **Dark Mode Strategy**: Class-based (`darkMode: ["class"]` in `apps/web/tailwind.config.ts:4`).
- **Target Element**: The `dark` class is applied directly to the root `<html>` element (`<html class="dark">` vs `<html class="light">`).
- **Theme State Management**: Handled reactively via `apps/web/src/zustand/site-setting.ts` and synced to localStorage key `theme`.
- **CSS Variables Source**: Defined in HSL channels (without `hsl(...)` wrapper) in `apps/web/src/index.css:6-64`:
  - `:root` for light mode.
  - `.dark` for dark mode.
- **Consumption Pattern**: Consumed in Tailwind config via `hsl(var(--<token>))` allowing direct opacity modifier support (e.g. `bg-primary/80`, `text-muted-foreground/50`).

---

## 2. Color Tokens & Semantic Mappings

| Semantic Token           | Light HSL (`:root`) | Dark HSL (`.dark`) | CSS Variable             | Tailwind Utility Class       | Usage Count in `src/` | Purpose / Semantic Role                                    |
| :----------------------- | :------------------ | :----------------- | :----------------------- | :--------------------------- | :-------------------- | :--------------------------------------------------------- |
| **background**           | `220 20% 98%`       | `224 24% 9%`       | `--background`           | `bg-background`              | 84                    | Page root canvas and main scrollable viewport background   |
| **foreground**           | `222 35% 12%`       | `220 20% 94%`      | `--foreground`           | `text-foreground`            | 148                   | Primary high-contrast body and heading text                |
| **card**                 | `0 0% 100%`         | `224 20% 12%`      | `--card`                 | `bg-card`                    | 62                    | Surface color for cards, table containers, and drawers     |
| **popover**              | `0 0% 100%`         | `224 20% 12%`      | `--popover`              | `bg-popover`                 | 31                    | Floating overlays (dropdowns, dialogs, popovers, tooltips) |
| **popover-foreground**   | `222 35% 12%`       | `220 20% 94%`      | `--popover-foreground`   | `text-popover-foreground`    | 12                    | Text and icons inside floating overlays                    |
| **muted**                | `220 17% 95%`       | `222 18% 16%`      | `--muted`                | `bg-muted`                   | 74                    | Subtle backgrounds, disabled states, skeleton loaders      |
| **muted-foreground**     | `220 9% 44%`        | `220 11% 66%`      | `--muted-foreground`     | `text-muted-foreground`      | 179                   | Secondary labels, descriptions, helper text, timestamps    |
| **border**               | `220 15% 90%`       | `222 15% 21%`      | `--border`               | `border-border`              | 118                   | Structural lines, table dividers, card outlines            |
| **input**                | `220 15% 88%`       | `222 15% 25%`      | `--input`                | `border-input`               | 46                    | Form control borders, switch tracks, checkbox borders      |
| **ring**                 | `243 75% 59%`       | `239 84% 72%`      | `--ring`                 | `ring-ring`                  | 38                    | Accessible keyboard focus rings (`:focus-visible`)         |
| **primary**              | `243 75% 59%`       | `239 84% 72%`      | `--primary`              | `bg-primary`, `text-primary` | 114                   | Core brand action buttons, active navigation indicators    |
| **primary-foreground**   | `0 0% 100%`         | `240 30% 12%`      | `--primary-foreground`   | `text-primary-foreground`    | 42                    | Text/icon on primary background elements                   |
| **secondary**            | `220 17% 95%`       | `222 18% 17%`      | `--secondary`            | `bg-secondary`               | 27                    | Secondary action buttons, subtle pill badges               |
| **secondary-foreground** | `222 24% 18%`       | `220 20% 94%`      | `--secondary-foreground` | `text-secondary-foreground`  | 14                    | Text on secondary elements                                 |
| **accent**               | `239 100% 97%`      | `239 28% 20%`      | `--accent`               | `bg-accent`                  | 22                    | Hover state highlight for table rows and dropdown items    |
| **accent-foreground**    | `239 60% 38%`       | `239 90% 82%`      | `--accent-foreground`    | `text-accent-foreground`     | 11                    | Highlighted text in active row or selection                |
| **success**              | `152 58% 29%`       | `152 54% 46%`      | `--success`              | `bg-success`, `text-success` | 32                    | Success badges, confirmation banners, active status        |
| **success-foreground**   | `0 0% 100%`         | `222 24% 9%`       | `--success-foreground`   | `text-success-foreground`    | 16                    | Text on success pill badges                                |
| **warning**              | `35 92% 29%`        | `35 88% 55%`       | `--warning`              | `bg-warning`, `text-warning` | 24                    | Warning badges, maintenance banners, pending approvals     |
| **warning-foreground**   | `0 0% 100%`         | `222 24% 9%`       | `--warning-foreground`   | `text-warning-foreground`    | 12                    | Text on warning elements                                   |
| **danger**               | `0 72% 45%`         | `0 68% 64%`        | `--danger`               | `bg-danger`, `text-danger`   | 48                    | Destructive buttons, error alerts, validation messages     |
| **danger-foreground**    | `0 0% 100%`         | `222 24% 9%`       | `--danger-foreground`    | `text-danger-foreground`     | 22                    | Text on destructive buttons                                |
| **info**                 | `202 82% 32%`       | `202 76% 57%`      | `--info`                 | `bg-info`, `text-info`       | 18                    | Informational banners, documentation callouts              |
| **info-foreground**      | `0 0% 100%`         | `222 24% 9%`       | `--info-foreground`      | `text-info-foreground`       | 9                     | Text on info badges                                        |

---

## 3. WCAG 2.1 Contrast Ratios (Light vs Dark)

All ratios computed deterministically by `scripts/ui-standard/generate-tokens.ts` using standard WCAG 2.1 relative luminance formulas:

| Context / Element Pair                                         | Light Ratio | Light WCAG AA (>= 4.5:1) | Light WCAG AAA (>= 7.0:1) | Dark Ratio  | Dark WCAG AA (>= 4.5:1) | Dark WCAG AAA (>= 7.0:1) |
| :------------------------------------------------------------- | :---------- | :----------------------- | :------------------------ | :---------- | :---------------------- | :----------------------- |
| **Body Text on Page Background** (`foreground` / `background`) | **16.61:1** | ✅ PASS                  | ✅ PASS                   | **15.99:1** | ✅ PASS                 | ✅ PASS                  |
| **Card Body Text on Card** (`foreground` / `card`)             | **17.36:1** | ✅ PASS                  | ✅ PASS                   | **14.81:1** | ✅ PASS                 | ✅ PASS                  |
| **Popover Text on Popover** (`popover-fg` / `popover`)         | **17.36:1** | ✅ PASS                  | ✅ PASS                   | **14.81:1** | ✅ PASS                 | ✅ PASS                  |
| **Muted Text on Muted Background** (`muted-fg` / `muted`)      | **4.64:1**  | ✅ PASS                  | ❌ (large text only)      | **6.14:1**  | ✅ PASS                 | ❌ (large text only)     |
| **Muted Text on Page Background** (`muted-fg` / `background`)  | **4.98:1**  | ✅ PASS                  | ❌ (large text only)      | **7.45:1**  | ✅ PASS                 | ✅ PASS                  |
| **Primary Button Text on Primary** (`primary-fg` / `primary`)  | **6.18:1**  | ✅ PASS                  | ❌ (large text only)      | **5.26:1**  | ✅ PASS                 | ❌ (large text only)     |
| **Secondary Text on Secondary** (`secondary-fg` / `secondary`) | **12.93:1** | ✅ PASS                  | ✅ PASS                   | **12.79:1** | ✅ PASS                 | ✅ PASS                  |
| **Accent Text on Accent** (`accent-fg` / `accent`)             | **9.92:1**  | ✅ PASS                  | ✅ PASS                   | **6.85:1**  | ✅ PASS                 | ❌ (large text only)     |
| **Success Badge Text on Success** (`success-fg` / `success`)   | **5.66:1**  | ✅ PASS                  | ❌ (large text only)      | **7.01:1**  | ✅ PASS                 | ✅ PASS                  |
| **Warning Badge Text on Warning** (`warning-fg` / `warning`)   | **6.08:1**  | ✅ PASS                  | ❌ (large text only)      | **8.36:1**  | ✅ PASS                 | ✅ PASS                  |
| **Danger Button Text on Danger** (`danger-fg` / `danger`)      | **5.83:1**  | ✅ PASS                  | ❌ (large text only)      | **5.47:1**  | ✅ PASS                 | ❌ (large text only)     |
| **Info Badge Text on Info** (`info-fg` / `info`)               | **6.48:1**  | ✅ PASS                  | ❌ (large text only)      | **6.91:1**  | ✅ PASS                 | ❌ (large text only)     |

**Result Summary**: 100% (12/12) of evaluated color pairings satisfy WCAG 2.1 Level AA contrast requirements in both Light and Dark themes.

---

## 4. Typography Scale & Hierarchy

### Font Families

- **Primary / Sans-Serif**: `["Inter", "ui-sans-serif", "system-ui"]` (`tailwind.config.ts:8`).
- **Monospace**: `["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]` (used for hashes, serial numbers, IP addresses, asset tags, and code tokens).
- **Font Features**: Configured via `apps/web/src/index.css:70`: `font-feature-settings: "cv11", "ss01";` for optimized tabular numbers and legibility.

### Font Scale & Weights

| Class       | Computed Size   | Computed Line Height | Weight Values Used         | Semantic Role                                            |
| :---------- | :-------------- | :------------------- | :------------------------- | :------------------------------------------------------- |
| `text-xs`   | 12px (0.75rem)  | 16px (1rem)          | 400 (normal), 500 (medium) | Table headers, badges, helper text, timestamps           |
| `text-sm`   | 14px (0.875rem) | 20px (1.25rem)       | 400, 500, 600 (semibold)   | Standard body text, form field labels, table cell text   |
| `text-base` | 16px (1rem)     | 24px (1.5rem)        | 400, 500, 600              | Mobile form inputs (prevents iOS auto-zoom), card titles |
| `text-lg`   | 18px (1.125rem) | 28px (1.75rem)       | 600                        | Modal headings, stat card values, section headers        |
| `text-xl`   | 20px (1.25rem)  | 28px (1.75rem)       | 600, 700 (bold)            | Page title (mobile), dialog title                        |
| `text-2xl`  | 24px (1.5rem)   | 32px (2rem)          | 600, 700                   | PageHeader title (desktop), dashboard major metric       |
| `text-3xl`  | 30px (1.875rem) | 36px (2.25rem)       | 700                        | Hero metrics, login title                                |
| `text-4xl`  | 36px (2.25rem)  | 40px (2.5rem)        | 700                        | Large display numbers                                    |

---

## 5. Spacing, Radii, Shadows, and Elevation

### Border Radii (`tailwind.config.ts:49`)

- `rounded-sm`: **6px** (small badges, tags, inner chips)
- `rounded-md`: **8px** (standard buttons, form inputs, dropdown menus, table cells)
- `rounded-lg`: **12px** (cards, stat widgets, popovers)
- `rounded-xl`: **16px** (dialogs, sheet drawer corners)
- `rounded-full`: **9999px** (circular avatars, status dots, icon buttons)

### Elevation & Shadows

- `shadow-soft`: `0 1px 3px hsl(222 30% 10% / .05), 0 8px 24px hsl(222 30% 10% / .04)` (`tailwind.config.ts:51`).
- `shadow-sm`: Standard subtle borders.
- `shadow-md`: Floating dropdown menus and popover cards.
- `shadow-lg` / `shadow-xl`: Modal dialogs and right-hand side drawers.

### Z-Index Layers Architecture

Z-index values are strictly constrained across the application to avoid layering collisions:

- `z-10` (5 usages): Sticky table headers and sticky filter toolbars.
- `z-20` (4 usages): AppShell sticky top header and navigation bar.
- `z-30` (2 usages): Fixed sidebar and drawer overlay backdrop.
- `z-50` (23 usages): Floating modal dialogs, full-screen mobile navigation sheets, toasts (`sonner`), and date/time popovers.

---

## 6. Responsive Breakpoints & Viewport Containers

Default Tailwind breakpoint contracts enforced without custom overrides:

- `sm`: **640px** (Mobile to Tablet boundary: forms collapse 2 columns to 1 column, inputs switch from `text-base` to `text-sm`, drawers become full-screen Sheets).
- `md`: **768px** (Tablet portrait: sidebar switches from slide-over drawer to collapsed rail or full sidebar).
- `lg`: **1024px** (Desktop: touch target requirements relax from 44px to 36px, full multi-column layout rendered).
- `xl`: **1280px** (Large desktop: maximum standard content width).
- `2xl`: **1536px** (Ultra-wide: wide data tables).

---

## 7. Motion & Reduced Motion Contracts

- **Standard Transition Duration**: `180ms` (`duration-180` in `tailwind.config.ts:53`).
- **Timing Function**: Standard `ease-in-out` / `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Accessible Reduced Motion Enforcement** (`apps/web/src/index.css:86-94`):
  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## 8. Chart Palette & Icon System

- **Icon Set**: `lucide-react` v0.462.0. Standard sizing conventions:
  - `h-3.5 w-3.5` (14px): Micro indicators, dropdown chevrons.
  - `h-4 w-4` (16px): Inline button icons, form validation markers, table action icons.
  - `h-5 w-5` (20px): Navigation sidebar icons, page header actions.
  - `h-6 w-6` (24px): Empty state illustrations, modal status headers.
- **Chart Palette** (`apps/web/src/components/common/Chart.tsx:19-28`):
  ```typescript
  const CHART_COLORS = [
    "#2563EB", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#64748B", // Slate
  ];
  ```

---

## 9. Codebase Scan & Style Violation Audit

Automated scan of all 261 files in `apps/web/src`:

- **Hard-coded Colors Found**: 16 occurrences.
  - _Top Offenders_:
    - `AssetQrModal.tsx`: `#000` and `#555` used in HTML5 canvas QR code matrix rendering.
    - `Chart.tsx`: `#888888` used in SVG coordinate axes for Recharts.
    - (Other hits were ticket / ID string text literals such as `#102` in test fixtures).
- **Arbitrary Pixel Utilities** (`w-[...px]`, `h-[...px]`): 140 occurrences.
  - _Primary reason_: Responsive touch target guards enforcing `min-h-[44px]`, `min-h-[36px]`, and modal max dimensions `max-h-[92dvh]`.
- **Arbitrary Tailwind Utilities**: 232 occurrences.
- **`!important` Usages**: Strictly 3 occurrences across the whole codebase, located exclusively inside `apps/web/src/index.css:90-92` to override animations for users requesting reduced motion.
