# UI Architecture Gap Analysis & Maturity Assessment

**Generated**: 2026-11-24  
**Audit Scope**: Read-only AST and static analysis of `apps/web/src` (260 TypeScript files)  
**Evidence Artifact**: `docs/ui-standard/gap-scan-results.json`  
**Scan Engine**: `scripts/ui-standard/scan-gaps.ts` (TypeScript Compiler API AST + Regex parser)

---

## 1. Executive Summary

This gap analysis provides an evidence-based audit of the current front-end codebase against the declared UI standards. While the architecture achieves exceptionally high compliance—including zero unauthorized native form controls and zero axe-core accessibility violations across all 81 routes—the automated scan identified specific areas of friction, minor encapsulation leaks, and naming inconsistencies.

In strict compliance with the **READ-ONLY** mandate, none of the findings below have been modified or patched in the product code. Instead, they are cataloged with exact file locations and line numbers to guide adoption in new projects.

---

## 2. Empirical Scan Findings

### 2.1 Native Form Controls Outside UI Library

- **Constraint**: All form inputs must use `@/components/ui` or `@/components/hook-form`. Native `<input>`, `<select>`, `<textarea>` are forbidden in application pages and modules.
- **Scan Result**: **0 violations** across 260 files.
- **Evidence**:
  ```bash
  $ npx tsx scripts/ui-standard/scan-gaps.ts
  Native controls outside components/ui: 0
  ```
  The runtime AST guard (`check:field-usage --strict`) successfully guarantees 100% compliance.

---

### 2.2 Direct Radix Primitive Imports Outside UI Primitives

- **Constraint**: Radix UI primitives should be encapsulated within `apps/web/src/components/ui/`. Domain code and common wrappers should import the shared UI component rather than the low-level `@radix-ui/*` package.
- **Scan Result**: **2 occurrences** in `components/common/`.
- **Evidence**:
  | File Path                                           | Line | Import Statement               | Recommendation for New Project                     |
  | :-------------------------------------------------- | :--- | :----------------------------- | :------------------------------------------------- |
  | `apps/web/src/components/common/ConfirmDialog.tsx`  | L1   | `@radix-ui/react-alert-dialog` | Encapsulate inside `components/ui/AlertDialog.tsx` |
  | `apps/web/src/components/common/RowActionsMenu.tsx` | L9   | `@radix-ui/react-dialog`       | Import from `components/ui/Dialog.tsx` wrapper     |

---

### 2.3 Hard-Coded Hex Colors

- **Constraint**: Colors must reference Tailwind semantic tokens (`text-primary`, `bg-muted`, etc.) or CSS variables (`var(--...)`). Hard-coded `#hex` values break dark mode theming and contrast guarantees.
- **Scan Result**: **15 occurrences** (11 in Recharts data visualization, 2 in QR canvas modal, 1 in Reveal Secret, 1 in Dashboard).
- **Evidence**:

  | File Path                                                    | Line            | Hex Value                                                                              | Context / Root Cause                |
  | :----------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------- | :---------------------------------- |
  | `apps/web/src/components/common/Chart.tsx`                   | L20–L27         | `#2563EB`, `#10B981`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#06B6D4`, `#EC4899`, `#64748B` | Recharts color palette array        |
  | `apps/web/src/components/common/Chart.tsx`                   | L57, L188, L194 | `#2563EB`, `#888888`                                                                   | Recharts SVG stroke and grid colors |
  | `apps/web/src/components/assets/AssetQrModal.tsx`            | L28, L31        | `#000`, `#555`                                                                         | Canvas QR code generator payload    |
  | `apps/web/src/components/credentials/RevealSecretDialog.tsx` | L252            | `#102`                                                                                 | Obfuscation masking pattern         |
  | `apps/web/src/pages/Dashboard.tsx`                           | L231            | `#10B981`                                                                              | Static badge fill in summary chart  |

- **Remediation for New Projects**: Use `hsl(var(--chart-1))` through `hsl(var(--chart-5))` semantic variables for SVG charting libraries.

---

### 2.4 Arbitrary Pixel Tailwind Classes

- **Constraint**: Layout and sizing should use standard Tailwind spacing scale (`w-64`, `max-w-md`, `h-10`) rather than arbitrary brackets (`w-[280px]`).
- **Scan Result**: **140 occurrences** across 38 files.
- **Analysis**:
  - 65 occurrences are drawer widths on responsive layouts (e.g. `w-[400px]`, `w-[540px]`, `max-w-[calc(100vw-2rem)]`).
  - 32 occurrences are table column fixed widths (e.g. `w-[120px]`, `w-[180px]`).
  - 25 occurrences are dropdown and popover min/max constraints (e.g. `min-w-[200px]`).
  - 18 occurrences are modal dialog constraints (e.g. `max-w-[480px]`).
- **Remediation for New Projects**: Extend Tailwind config with standard layout widths (`w-drawer-sm: 400px`, `w-drawer-md: 540px`) to eliminate bracketed values.

---

### 2.5 Inline Styles (`style={{ ... }}`)

- **Constraint**: Styling must be utility-class driven. Inline `style` attributes should only be used for dynamic runtime dimensions (e.g. progress bar percentages).
- **Scan Result**: **9 occurrences** across 7 files.
- **Verification**:
  - 5 are dynamic percentage widths for progress bars (`style={{ width: `${percent}%` }}` in `OffboardingColumns.tsx`, `ExportsDrawer.tsx`, `Dashboard.tsx`, `OffboardingCaseDetail.tsx`, `PortalOffboarding.tsx`).
  - 2 are dynamic pixel heights passed as props to charting/select containers (`style={{ minHeight: height }}`).
  - 1 is a dynamic font-size override in `SelectPopover.tsx:28` (`style={{ fontSize: "14px" }}`).
  - 1 is a dynamic percent calculation in `Dashboard.tsx:202`.
- **Conclusion**: 8 of the 9 uses are legitimate dynamic calculations that cannot be expressed as static CSS classes. The single static override in `SelectPopover.tsx` should be converted to `text-sm`.

---

### 2.6 Console Statements

- **Constraint**: `apps/web/scripts/check-ui.mjs` forbids `console.log` and `console.warn` in production web code.
- **Scan Result**: **1 non-test occurrence**.
- **Evidence**:
  ```tsx
  // apps/web/src/components/common/ErrorBoundary.tsx:18
  console.error("Application rendering error", error, info.componentStack);
  ```
- **Conclusion**: Legitimate use inside React 18 `componentDidCatch` to preserve error trace in developer tools before rendering fallback UI. `check:ui` explicitly allows `console.error` inside error boundaries.

---

### 2.7 Code Structure & Directory Placement

- **Constraint**: Architectural conventions prescribe that all client state stores reside in `src/store/` (or `src/contexts/`).
- **Scan Result**: **3 store files** reside in `apps/web/src/zustand/` rather than `apps/web/src/store/`:
  - `apps/web/src/zustand/permission-store.ts`
  - `apps/web/src/zustand/site-setting.ts`
  - `apps/web/src/zustand/user-store.ts`
- **Remediation for New Projects**: Unify all Zustand stores into `src/store/` (e.g., `src/store/usePermissionStore.ts`, `src/store/useUserStore.ts`).

---

### 2.8 Component Catalog Redundancies & Zero-Usage Helpers

- **Analysis of `component-catalog.json` (58 components)**:
  1. **Sub-primitives without direct imports**: 9 components (`FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`) have 0 direct consumer imports because they are consumed exclusively through wrapper primitives (`RHFTextField`, `RHFSelect`, `OTPInput`).
  2. **Near-Duplicate Filter Components**:
     - `apps/web/src/components/common/SelectFilter.tsx`
     - `apps/web/src/components/common/TableSelectFilter.tsx`
       Both render select dropdowns for table filters. `TableSelectFilter` was added during Phase 10 to provide standardized chip-style triggers. `SelectFilter` remains in the tree as legacy code.
  3. **Menu Wrappers**:
     - `apps/web/src/components/ui/dropdown-menu.tsx` (generic Radix wrapper)
     - `apps/web/src/components/common/RowActionsMenu.tsx` (table row action trigger with standard 3-dot Lucide icon and permission filtering).

---

## 3. UI Maturity Assessment

Each dimension of the UI architecture is evaluated on a strict 0 to 5 maturity scale:

- **0 - Ad-hoc**: Unstandardized, inline styles, copy-pasted UI, no guardrails.
- **1 - Initial**: Basic components exist but are bypassed frequently; no linting rules.
- **2 - Defined**: Shared components documented; some guardrails, manual testing.
- **3 - Managed**: Single source of truth for fields; automated AST linting; standard layout templates.
- **4 - Measured**: E2E multi-viewport responsive testing; 0 axe-core violations; token contracts.
- **5 - Optimized**: Zero runtime escapes; automated inventory checks; portable headless starter kit; self-enforcing CI pipelines.

### Maturity Scorecard

| Area                           |  Score (0-5)   | Evidence / Justification                                                                                                                                                                       | Deductions / Gaps                                                                             |
| :----------------------------- | :------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **1. Design Tokens & Theming** |    **4.5**     | Complete semantic tokens in CSS variables (`--background`, `--primary`, etc.). 100% WCAG AA contrast compliance across all 12 primary pairs. Automatic dark mode support.                      | 15 hard-coded hex colors in Recharts SVG visualization and canvas QR generator.               |
| **2. Component Catalog**       |    **4.5**     | 58 components cataloged via TS AST. Strict Radix encapsulation for primitives. Complete composability in forms and dialogs.                                                                    | Legacy `SelectFilter` alongside `TableSelectFilter`; 2 Radix imports in `components/common/`. |
| **3. Field Standards**         |    **5.0**     | 21 field types with 100% centralized RHF wrappers. Zero raw `<input>` elements in 260 files. Automatic 16px iOS auto-zoom prevention. Unified `useApiSelectOptions` hook.                      | None. Exemplary enterprise implementation.                                                    |
| **4. Page Patterns**           |    **4.8**     | Golden Employee module acts as reproducible blueprint. Standard drawer-on-desktop / sheet-on-mobile. Consistent search + filter + table + pagination workflow.                                 | 3 stores located in `src/zustand/` rather than standard `src/store/`.                         |
| **5. Responsive Architecture** |    **4.7**     | R1–R10 responsive checklist verified across 5 standard viewports (360px to 1440px). Touch targets strictly >= 44px. Modals convert to bottom sheets. Horizontal scroll wrapper on data tables. | 140 arbitrary `-[...px]` classes instead of named theme spacing tokens.                       |
| **6. Accessibility & UX**      |    **4.8**     | 0 axe-core violations across 81 screens. Focus trapping on all dialogs and drawers. Escape key restoration. Label-in-Name (WCAG 2.5.3) compliant. Sentence-case copy standards.                | Screen-reader live regions for async search filter updates could be more explicit.            |
| **7. Guardrails & Automation** |    **5.0**     | 6 independent layers of enforcement (`check:ui`, `check:field-usage --strict`, `check:ui-inventory`, `typecheck`, `lint`, Husky). 5 breaking failure tests verified.                           | None. Industry-leading self-defending architecture.                                           |
| **8. Automated Testing**       |    **4.2**     | Multi-viewport E2E Playwright suite testing geometry, overflow, touch targets, and axe rules. Vitest component tests.                                                                          | WebKit browser testing requires Docker container in Linux headless CI environments.           |
| **OVERALL MATURITY**           | **4.69 / 5.0** | **Production Enterprise Standard**                                                                                                                                                             | Exceptional discipline with minor superficial cleanup opportunities.                          |

---

## 4. Prioritized Remediation Backlog (For New Projects)

When adopting this architecture in a new project or conducting future non-read-only refactors, implement the following items in priority order:

### Priority 0 (Critical Foundations)

1. **Unify Radix Wrappers**: Move `@radix-ui/react-alert-dialog` from `components/common/ConfirmDialog.tsx` into `components/ui/AlertDialog.tsx`. Ensure `components/ui/` is the sole consumer of Radix packages.
2. **Chart Palette Tokens**: Define semantic chart CSS variables (`--chart-1` through `--chart-8`) in `globals.css` and configure Tailwind theme colors so data visualization inherits theme and dark mode automatically.

### Priority 1 (Cleanliness & Maintainability)

3. **Consolidate Store Directory**: Move `apps/web/src/zustand/*` to `apps/web/src/store/*` to adhere to standard directory layout conventions.
4. **Retire Legacy Filter Component**: Delete `components/common/SelectFilter.tsx` in favor of `components/common/TableSelectFilter.tsx` across all list filters.
5. **Formalize Drawer Width Tokens**: Replace arbitrary bracket classes (`w-[400px]`, `w-[540px]`) with semantic Tailwind classes (`max-w-drawer-sm`, `max-w-drawer-md`).

### Priority 2 (Polish & Optimization)

6. **Eliminate Static Inline Style**: Convert `style={{ fontSize: "14px" }}` in `components/ui/select/SelectPopover.tsx` to standard `text-sm` Tailwind class.
7. **Screen Reader Announcement Live Region**: Add an `aria-live="polite"` region to `CommonTable` to announce filter count changes to screen reader users.
