# Guardrails & Automation Specification

**Generated**: 2026-11-24  
**Machine-Readable Ruleset**: `docs/ui-standard/rules.json`  
**Guard Scripts**: `apps/web/scripts/check-ui.mjs`, `scripts/check_field_usage.ts`, `scripts/check_ui_inventory.ts`

---

## 1. Automated Enforcement Mechanisms

The project maintains 6 independent layers of automated quality gates preventing regressions:

| Layer                       | Tool / Command               | What It Enforces                                              | Failure Impact          |
| :-------------------------- | :--------------------------- | :------------------------------------------------------------ | :---------------------- |
| **L1: Syntax & Style**      | `npm run lint`               | ESLint rules, hooks compliance, imports                       | Blocks commit via Husky |
| **L2: Type Strictness**     | `npm run typecheck`          | Strict TypeScript compilation (`tsc --noEmit`)                | Blocks commit via Husky |
| **L3: UI Guardrail Script** | `npm run check:ui`           | Forbids console.log, direct axios, raw actions, details       | Fails build & CI        |
| **L4: Field AST Scanner**   | `npm run check:field-usage`  | Forbids raw inputs outside UI primitives, validates `data-hm` | Fails CI                |
| **L5: UI Inventory Guard**  | `npm run check:ui-inventory` | Ensures every route in `paths.ts` is in `UI_INVENTORY.md`     | Fails CI                |
| **L6: Responsive E2E**      | `npm run test:responsive`    | Real-browser geometry, touch targets, 0 axe violations        | Fails CI                |

---

## 2. Allowlist Analysis: `legacyNativeAllowlist` in `check-ui.mjs`

The `check-ui.mjs` script contains an explicit allowlist of 11 files permitted to contain native HTML controls (`<input>`, `<select>`, `<button>`):

| File Path                                             | Permitted Elements        | Technical Justification                                           |
| :---------------------------------------------------- | :------------------------ | :---------------------------------------------------------------- |
| `components/ui/button.tsx`                            | `<button>`                | Core design system primitive implementation                       |
| `components/ui/input.tsx`                             | `<input>`                 | Core design system primitive implementation                       |
| `components/ui/select/SelectChip.tsx`                 | `<button>`                | Accessible chip removal trigger inside Select                     |
| `components/layout/AppShell.tsx`                      | `<button>`, `<a>`         | Accessible mobile hamburger button & skip-to-content link         |
| `components/common/RowActionsMenu.tsx`                | `<button>`                | Three-dot menu trigger button                                     |
| `components/common/CommonTable.tsx`                   | `<button>`, `<input>`     | Pagination page buttons and rows-per-page selector                |
| `components/common/TableFilters/TableFilterPanel.tsx` | `<button>`                | Clear all / Apply filter trigger buttons                          |
| `components/common/TableSelectFilter.tsx`             | `<button>`                | Filter dropdown trigger                                           |
| `components/hook-form/fields.tsx`                     | Native DOM bindings       | React Hook Form controller wrappers forwarding refs to primitives |
| `pages/DesignSystem.tsx`                              | Native controls           | Showcase demonstrating raw disabled and error states              |
| `pages/Roles.tsx`                                     | `<input type="checkbox">` | High-density permission matrix grid                               |

---

## 3. Comprehensive Rules Matrix

| Rule ID     | Statement                                                                | Source                   | Implemented? | Enforced By                      | Evidence File:Line                                     |
| :---------- | :----------------------------------------------------------------------- | :----------------------- | :----------- | :------------------------------- | :----------------------------------------------------- |
| **R-UI-01** | No one-off UI; build from shared components only                         | AGENTS.md                | **Yes**      | `check:ui` & `check:field-usage` | `scripts/check_field_usage.ts:40`                      |
| **R-UI-02** | Native controls outside `components/ui` forbidden                        | UI_STANDARDS.md          | **Yes**      | `check:field-usage`              | `scripts/check_field_usage.ts:133`                     |
| **R-UI-03** | Forms follow `FormProvider -> FormSection -> FormGrid -> sticky Actions` | FORM_FIELD_GUIDELINES.md | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:89`                     |
| **R-UI-04** | Drawer on desktop, full-screen Sheet on mobile (<= 640px)                | UI_STANDARDS.md          | **Yes**      | Responsive test                  | `apps/web/e2e/responsive/responsive_audit.spec.ts:168` |
| **R-UI-05** | Dirty-state guard before closing drawer/modal                            | UI_STANDARDS.md          | **Yes**      | Unit test                        | `AddEditEmployee.tsx:95`                               |
| **R-UI-06** | Edit mode forms render prefill skeletons                                 | UI_STANDARDS.md          | **Yes**      | Code / RTL                       | `AddEditEmployee.tsx:135`                              |
| **R-UI-07** | Co-located `<Name>.schema.ts` using `FORM_VALIDATION`                    | FORM_FIELD_GUIDELINES.md | **Yes**      | TypeScript / Vitest              | `components/employees/Employee.schema.ts`              |
| **R-UI-08** | Data tables must use `CommonTable`                                       | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:93`                     |
| **R-UI-09** | Raw `<details>/<summary>` dropdowns forbidden                            | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:53`                     |
| **R-UI-10** | Raw `MoreHorizontal`/`MoreVertical` icons forbidden                      | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:57`                     |
| **R-UI-11** | Custom row menus in table columns forbidden                              | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:65`                     |
| **R-UI-12** | Destructive actions require `ConfirmDialog`                              | UI_STANDARDS.md          | **Yes**      | Code / Vitest                    | `components/common/ConfirmDialog.tsx`                  |
| **R-UI-13** | Touch targets >= 44px on touch viewports                                 | UI_STANDARDS.md          | **Yes**      | Playwright (R6)                  | `apps/web/e2e/responsive/responsive_checker.ts:160`    |
| **R-UI-14** | Mobile input font-size >= 16px (iOS zoom guard)                          | UI_STANDARDS.md          | **Yes**      | Playwright (R5)                  | `apps/web/src/components/ui/input.tsx:16`              |
| **R-UI-15** | Zero horizontal scroll down to 320px                                     | UI_STANDARDS.md          | **Yes**      | Playwright (R1)                  | `apps/web/e2e/responsive/responsive_checker.ts:15`     |
| **R-UI-16** | Overlays respect `dvh` & safe-area insets                                | UI_STANDARDS.md          | **Yes**      | Playwright (R3)                  | `apps/web/e2e/responsive/responsive_checker.ts:60`     |
| **R-UI-17** | All routes cataloged in `UI_INVENTORY.md`                                | MODULE_CHECKLIST.md      | **Yes**      | `check:ui-inventory`             | `scripts/check_ui_inventory.ts`                        |
| **R-UI-18** | Zero axe-core accessibility violations                                   | UI_STANDARDS.md          | **Yes**      | Playwright (R10)                 | `apps/web/e2e/responsive/responsive_checker.ts:240`    |
| **R-UI-19** | Console.log forbidden in production code                                 | AGENTS.md                | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:47`                     |
| **R-UI-20** | Direct axios imports outside `src/api` forbidden                         | AGENTS.md                | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:42`                     |
| **R-UI-21** | Direct `window.location` navigation forbidden                            | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:49`                     |
| **R-UI-22** | Literal `#hex` colors in style/class forbidden                           | UI_STANDARDS.md          | **Yes**      | `check:ui`                       | `apps/web/scripts/check-ui.mjs:51`                     |
| **R-UI-23** | Strict TypeScript compilation with 0 errors                              | AGENTS.md                | **Yes**      | `typecheck` / Husky              | `turbo run typecheck`                                  |

---

## 4. Empirical Proof of Guardrail Failures

To prove that the automated guardrails actively catch violations, 5 deliberate breakages were introduced in a scratch test and their failure output recorded:

### Proof 1: Deliberately breaking `check:ui` with `console.log`

```
> hardware-management@1.0.0 check:ui
> turbo run check:ui

@hm/web:check:ui: UI checks failed:
@hm/web:check:ui: - pages/Dashboard.tsx: console.log found
@hm/web:check:ui: npm error Lifecycle script `check:ui` failed with error:
@hm/web:check:ui: npm error code 1
ERROR: command (/home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/apps/web) npm run check:ui exited (1)
```

### Proof 2: Deliberately breaking `check:ui` with direct `axios` import

```
> hardware-management@1.0.0 check:ui
> turbo run check:ui

@hm/web:check:ui: UI checks failed:
@hm/web:check:ui: - pages/Dashboard.tsx: direct axios import; use src/api
@hm/web:check:ui: npm error Lifecycle script `check:ui` failed with error:
@hm/web:check:ui: npm error code 1
ERROR: command (/home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/apps/web) npm run check:ui exited (1)
```

### Proof 3: Deliberately breaking `check:field-usage` with raw native `<input>`

```
> hardware-management@1.0.0 check:field-usage -- --strict
> tsx scripts/check_field_usage.ts --strict

Scanning apps/web/src for field component usages and forbidden controls...
❌ Field usage violations found (1):
  - pages/Dashboard.tsx:95 Native <input> element used directly. Must use shared component.
Process exited with code 1.
```

### Proof 4: Deliberately breaking `check:ui-inventory` with unregistered route

```
> hardware-management@1.0.0 check:ui-inventory
> tsx scripts/check_ui_inventory.ts

Verifying UI Inventory coverage against registered application routes...
UI Inventory registered items: 81
Missing route in docs/UI_INVENTORY.md: [UNREGISTERED_TEST_ROUTE] /unregistered-path
UI Inventory check failed: 1 route(s) missing from inventory.
Process exited with code 1.
```

### Proof 5: Deliberately breaking `typecheck` with type mismatch

```
> hardware-management@1.0.0 typecheck
> turbo run typecheck

@hm/web:typecheck: src/pages/Dashboard.tsx:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.
@hm/web:typecheck: 1 const __badType: number = "not-a-number";
@hm/web:typecheck:         ~~~~~~~~~
@hm/web:typecheck: Found 2 errors.
ERROR: command (/home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/apps/web) npm run typecheck exited (2)
```
