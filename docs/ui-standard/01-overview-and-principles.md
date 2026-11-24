# UI Architecture Overview & Core Principles

**Generated**: 2026-11-24  
**Audit Scope**: Front-end architecture of `apps/web/src`  
**Standard Pack Master Index**: `docs/ui-standard/00-README.md`

---

## 1. Core Philosophy

The fundamental philosophy of this UI architecture is **strict uniformity through self-defending guardrails**:

1. **Single Source of Truth**: There is exactly one way to render a button, one way to collect an international telephone number, one way to present a paginated data table, and one way to lay out a form drawer.
2. **Zero One-Off UI**: Bespoke CSS classes, arbitrary inline styles, and unstyled native HTML elements are strictly prohibited in application screens. If a layout or input variant is required, it must be authored, typed, and tested in the shared component library first.
3. **Self-Defending Architecture**: Quality and consistency are not maintained through code review goodwill alone; they are enforced by 6 automated static and dynamic gates that fail pull requests immediately if an engineer attempts to bypass the shared standard.

---

## 2. The Five Non-Negotiables

Every engineer (human or AI) contributing to the codebase must observe these five non-negotiable rules:

|   #   | Non-Negotiable Rule                                                                                                                                                                                                    | Enforcement Mechanism                             |
| :---: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------ |
| **1** | **No Native Form Controls Outside `@/components/ui`**<br>Native `<input>`, `<select>`, and `<textarea>` elements in domain code are strictly forbidden. All forms must use `@/components/hook-form`.                   | AST Scanner: `npm run check:field-usage --strict` |
| **2** | **No Direct External Primitive Imports in Pages**<br>Domain modules must never import directly from `@radix-ui/*`, `date-fns`, or charting engines. All interaction must occur through encapsulated shared wrappers.   | Script: `apps/web/scripts/check-ui.mjs`           |
| **3** | **No Hard-Coded Colors or Arbitrary Spacing**<br>Hex colors (`#...`) and arbitrary bracket sizing (`w-[237px]`) are prohibited. All styling must derive from semantic design tokens in `tokens.json`.                  | Tailwind preset + ESLint color parser             |
| **4** | **Automatic Mobile Zoom Prevention (16px Font Rule)**<br>Every text input, select trigger, and picker must render with `text-base` (16px) on viewports `< 640px` to prevent iOS WebKit from forcing an automatic zoom. | Responsive E2E: `npm run test:responsive`         |
| **5** | **Accessible Touch Targets (>= 44px)**<br>Every interactive element on touch viewports must meet or exceed WCAG 2.5.5 minimum height (44px) via `min-h-[44px]`.                                                        | Playwright DOM geometry assertions                |

---

## 3. Architecture Layer Diagram

The architecture is structured into 6 concentric layers, where dependencies flow strictly downward:

```mermaid
flowchart TD
    subgraph L1["Layer 1: Design Tokens & Foundations"]
        T1["CSS Variables (:root & .dark)"]
        T2["Tailwind Preset (tokens.json)"]
        T3["WCAG AA Contrast Matrix"]
    end

    subgraph L2["Layer 2: Headless UI Primitives (@/components/ui)"]
        P1["Button, Input, Textarea, Badge"]
        P2["DatePicker, DateRangePicker, TimePicker"]
        P3["PhoneField (libphonenumber-js)"]
        P4["Select, MultiSelect, Popover, Dialog"]
    end

    subgraph L3["Layer 3: Composite Common Components (@/components/common)"]
        C1["CommonTable (Search, Sort, Paginate)"]
        C2["TableFilterPanel (Chip Bar)"]
        C3["PageHeader & Breadcrumbs"]
        C4["ConfirmDialog & RowActionsMenu"]
        C5["States (Empty, Loading, Error, Spinner)"]
    end

    subgraph L4["Layer 4: Form Integration Engine (@/components/hook-form)"]
        F1["FormProvider (React Hook Form)"]
        F2["RHFTextField, RHFTextarea, RHFSelect"]
        F3["RHFDatePicker, RHFTimePicker"]
        F4["RHFPhoneField (E.164 Sync)"]
        F5["Yup / Zod Validation Schemas"]
    end

    subgraph L5["Layer 5: Page & Workflow Recipes"]
        W1["List Page (CommonTable + FilterPanel)"]
        W2["Form in Drawer (Desktop) / Sheet (Mobile)"]
        W3["Detail View (StatCards + Activity Timeline)"]
        W4["Dirty-State Guard & Confirmation Dialog"]
    end

    subgraph L6["Layer 6: Quality Guardrails & Automation"]
        G1["npm run lint (ESLint)"]
        G2["npm run typecheck (tsc -b)"]
        G3["npm run check:ui (Anti-regression)"]
        G4["npm run check:field-usage --strict (AST)"]
        G5["npm run test:responsive (Multi-viewport)"]
    end

    L1 --> L2
    L2 --> L3
    L2 --> L4
    L3 --> L5
    L4 --> L5
    L5 -.->|Validated by| L6
```

---

## 4. How the Layers Interact

1. **Tokens feed Primitives**: CSS variables define the palette and radii. Primitives (`Button`, `Input`, `Dialog`) consume these tokens via Tailwind utility classes (`bg-primary`, `border-border`, `rounded-md`).
2. **Primitives feed Common Components**: Composite components (`CommonTable`, `TableFilterPanel`, `ConfirmDialog`) combine multiple primitives into reusable business workflow blocks.
3. **Primitives feed Form Wrappers**: The `@/components/hook-form` library wraps UI primitives with React Hook Form's `Controller`, providing automated error state binding (`aria-invalid`), helper text, and value conversion.
4. **Recipes combine Common & Form Layers**: Domain pages (like the golden Employee module) assemble pages from `PageHeader`, `CommonTable`, and `Drawer`-contained `FormProvider` instances.
5. **Guardrails Protect the Entire Stack**: Every git commit and CI pipeline executes the 6 guardrail layers, ensuring no drift or regression occurs.
