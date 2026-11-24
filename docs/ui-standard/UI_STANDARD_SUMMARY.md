# UI Architecture Standard: Executive Summary

**Project**: Enterprise Web UI Standard & Portable Component Architecture  
**Audit Scope**: Complete empirical audit of `hardware-management` front-end  
**Maturity Assessment**: **4.69 / 5.0** (Production Enterprise Grade)  
**Deliverables Register**: `docs/ui-standard/` + `docs/ui-standard/starter-kit/`

---

## 1. Executive Summary

This standard defines an enterprise-grade front-end architecture designed for multi-module web applications. Its core philosophy is **strict uniformity through self-defending guardrails**: every screen, form, table, dialog, and input is constructed strictly from an audited catalog of shared primitives. Zero unauthorized native form controls (`<input>`, `<select>`, `<textarea>`) are permitted outside the shared library, and 6 automated enforcement gates reject any code escaping this standard before it can reach production.

The complete architecture has been packaged into a zero-leak, portable **Starter Kit** in `docs/ui-standard/starter-kit/` and proven through clean-room verification in an isolated Vite + React 18 + Tailwind project with 100% passing tests and production builds.

---

## 2. Architecture Pillar Summary

```
                      ┌──────────────────────────────────────┐
                      │    Design Tokens (CSS Variables)     │
                      │   Light / Dark Mode, WCAG AA 100%    │
                      └──────────────────┬───────────────────┘
                                         │
                      ┌──────────────────▼───────────────────┐
                      │  Headless Primitives (components/ui) │
                      │   Button, Input, Popover, Date, Phone│
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                                                                 │
┌───────▼──────────────────────────┐             ┌────────────────────────▼────────────────────────┐
│     Form Engine (RHF Wrappers)   │             │   Data Patterns (components/common)             │
│ FormProvider, RHFSelect, Phone   │             │ CommonTable, TableFilterPanel, PageHeader       │
└───────┬──────────────────────────┘             └────────────────────────┬────────────────────────┘
        │                                                                 │
        └────────────────────────────────┬────────────────────────────────┘
                                         │
                      ┌──────────────────▼───────────────────┐
                      │    Page Patterns (Golden Module)     │
                      │ Table -> Drawer/Sheet -> Confirm ->  │
                      └──────────────────┬───────────────────┘
                                         │
                      ┌──────────────────▼───────────────────┐
                      │    Automated Quality Guardrails      │
                      │  check:ui, check:field-usage, E2E    │
                      └──────────────────────────────────────┘
```

### Pillar 1: Design Tokens & Theming (`02-design-tokens.md` + `tokens.json`)

- **Semantic CSS Variables**: All colors (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, etc.) defined in HSL CSS variables, enabling zero-rebuild runtime theme switching.
- **WCAG AA Compliance**: 100% of the 12 primary color contrast pairs pass WCAG AA standards (>= 4.5:1) in both light and dark modes (tested empirically).
- **Z-Index Scale**: Predictable 7-layer stack (`z-dropdown: 1000` to `z-toast: 1600`) preventing overlay clipping bugs.

### Pillar 2: Component Catalog (`03-component-catalog.md` + `component-catalog.json`)

- **58 Components**: Full AST analysis covering 47 active components, 9 form/OTP sub-primitives, and 2 composite wrappers.
- **Radix UI Encapsulation**: Primitives encapsulate accessibility, keyboard navigation, and focus management behind clean, opinionated APIs.

### Pillar 3: Field Standards (`04-field-standards.md` + `field-measurements.json`)

- **21 Standard Field Kinds**: Text, search, email, password, number, phone, date, date-range, time, single-select, multi-select, async-select, switch, checkbox, radio, textarea, file upload, currency, secret, tags, and read-only display.
- **Mobile Zoom Prevention**: Automatically adjusts font size from `text-xs`/`text-sm` (12–14px) on desktop to `text-base` (16px) on viewports `< 640px` to prevent iOS WebKit automatic viewport zoom.
- **Zero Native Escapes**: Measured across 260 files: 0 native form controls outside the UI library.

### Pillar 4: Page & Workflow Patterns (`05-page-patterns.md`)

- **Golden Reference Module**: The Employee module (`apps/web/src/modules/employees/`) serves as the architectural reference.
- **Form Drawer Pattern**: Forms open in an accessible slide-over Drawer (`w-[540px]`) on desktop and automatically convert to a full-screen Sheet (`h-[92vh]`) on mobile.
- **Dirty-State Guard**: Automatically detects unsaved changes and prompts before navigation or drawer closure.

### Pillar 5: Responsive Standards (`06-responsive-standards.md`)

- **R1–R10 Quality Checklist**: Verifies touch targets (>= 44px min-height), zero horizontal viewport scroll, modal-to-sheet transformation, and horizontal scrolling on tables across 5 standard viewport widths (360px to 1440px).

### Pillar 6: Accessibility & UX (`07-accessibility-ux-conventions.md`)

- **Zero Violations**: 0 axe-core accessibility violations across all 81 application routes.
- **Focus Management**: Automated focus trapping in drawers and modals, with escape key restoration.
- **Copy Standards**: Strict sentence-case labels, clear action verbs, and standardized confirmation copy.

### Pillar 7: Guardrails & Automation (`09-guardrails-and-automation.md` + `rules.json`)

- **6 Independent Enforcement Gates**:
  1. `npm run lint` (ESLint)
  2. `npm run typecheck` (`tsc --noEmit`)
  3. `npm run check:ui` (forbids console.log, direct axios, raw actions)
  4. `npm run check:field-usage --strict` (AST-based gate blocking unauthorized inputs)
  5. `npm run check:ui-inventory` (guarantees every route is tracked in UI inventory)
  6. `npm run test:responsive` (Playwright geometry, overflow, and axe assertions)

---

## 3. Maturity Scorecard Summary

| Dimension                |  Score (0-5)   | Grade  | Status                                                    |
| :----------------------- | :------------: | :----: | :-------------------------------------------------------- |
| Design Tokens & Theming  |      4.5       |   A    | Complete semantic variables, 100% WCAG AA contrast        |
| Component Catalog        |      4.5       |   A    | 58 components cataloged via AST, full Radix encapsulation |
| Field Standards          |      5.0       |   A+   | 21 field types, 100% RHF integration, zero native escapes |
| Page Patterns            |      4.8       |   A+   | Golden Employee blueprint, drawer/sheet responsive layout |
| Responsive Architecture  |      4.7       |   A+   | R1–R10 compliance, touch targets >= 44px, table wrappers  |
| Accessibility & UX       |      4.8       |   A+   | 0 axe violations on 81 routes, sentence case, focus traps |
| Guardrails & Automation  |      5.0       |   A+   | 6 automated layers, self-defending architecture           |
| Automated Testing        |      4.2       |   B+   | Multi-viewport Playwright suite + Vitest unit tests       |
| **OVERALL ARCHITECTURE** | **4.69 / 5.0** | **A+** | **Production Enterprise Standard**                        |

---

## 4. Documentation Index

The complete UI standard specification is organized into the following modules:

1. `docs/ui-standard/00-README.md`: Quick navigation guide and index.
2. `docs/ui-standard/01-overview-and-principles.md`: Core philosophy, non-negotiables, and architecture map.
3. `docs/ui-standard/02-design-tokens.md`: CSS variables, Tailwind configuration, and WCAG contrast matrix.
4. `docs/ui-standard/03-component-catalog.md`: Complete component registry and prop contracts.
5. `docs/ui-standard/04-field-standards.md`: 21 field types, decision matrix, and DOM measurements.
6. `docs/ui-standard/05-page-patterns.md`: Layout recipes, drawer workflows, and Golden Module reference.
7. `docs/ui-standard/06-responsive-standards.md`: Breakpoints, touch target rules, and multi-viewport harness.
8. `docs/ui-standard/07-accessibility-ux-conventions.md`: WCAG AA guidelines, axe-core rules, and copy guide.
9. `docs/ui-standard/08-frontend-architecture.md`: Module structure, state management, and API transport.
10. `docs/ui-standard/09-guardrails-and-automation.md`: 6 enforcement gates, failure proofs, and rules matrix.
11. `docs/ui-standard/10-gap-analysis.md`: Empirical AST gap scan findings and prioritized backlog.
12. `docs/ui-standard/11-portability-and-adoption-guide.md`: Migration guide and Starter Kit specification.
13. `docs/ui-standard/AGENT_PROMPT_FOR_NEW_PROJECT.md`: Ready-to-use prompt for autonomous AI coding agents.
