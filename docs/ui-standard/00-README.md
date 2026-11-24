# UI Standard Pack: Master Index & Reading Guide

**Specification Version**: 1.0.0  
**Target Codebase**: `hardware-management` Monorepo (`apps/web`, `packages/shared`)  
**Audit Date**: 2026-11-24  
**Starter Kit Status**: Validated in clean-room environment (`/tmp/starter-kit-verification`)

---

## 1. Overview & Pack Map

This documentation pack provides a complete, evidence-based reference of how the UI architecture of this application is actually built. It translates the hard-won production patterns, field standards, responsive transformations, and automated guardrails into a portable "UI Standard Pack" ready to be adopted in other projects.

```
docs/ui-standard/
├── PROGRESS.md                          # Live task checklist and milestones
├── 00-README.md                         # This file: navigation & audience paths
├── 01-overview-and-principles.md        # Core philosophy, non-negotiables, layer map
├── 02-design-tokens.md                  # CSS variables, Tailwind tokens, WCAG AA contrast
├── 03-component-catalog.md              # 58 cataloged components, prop interfaces, AST tree
├── 04-field-standards.md                # 21 standard field kinds, DOM measurements, matrix
├── 05-page-patterns.md                  # Drawer recipes, Golden Employee module, CRUD
├── 06-responsive-standards.md           # R1-R10 checklist, multi-viewport harness results
├── 07-accessibility-ux-conventions.md   # Focus traps, 0 axe violations, copy guidelines
├── 08-frontend-architecture.md          # State management, API transport, module structure
├── 09-guardrails-and-automation.md      # 6 enforcement gates, failure proof logs
├── 10-gap-analysis.md                   # Empirical AST findings, maturity scores (4.69/5)
├── 11-portability-and-adoption-guide.md # Migration guide, starter kit verification proof
├── UI_STANDARD_SUMMARY.md               # Executive summary for leadership & architects
├── AGENT_PROMPT_FOR_NEW_PROJECT.md      # Copy-ready prompt for autonomous AI coding agents
├── tokens.json                          # Extracted design tokens (colors, font, radii, z-index)
├── component-catalog.json               # Full AST component metadata
├── field-measurements.json              # Playwright DOM geometry measurements
├── rules.json                           # Machine-readable architectural guardrail rules
└── starter-kit/                         # Copy-ready, zero-domain-leak starter package
    ├── MANIFEST.md                      # Starter kit inventory & quickstart guide
    ├── tokens/                          # globals.css & tailwind.preset.js
    ├── lib/                             # utils.ts (cn helper)
    ├── adapters/                        # apiClient, permissionAdapter, formatters
    ├── components/                      # ui/, common/, hook-form/
    ├── scripts/                         # check-ui.mjs & check-field-usage.ts
    ├── pages/                           # DesignSystemPage.tsx
    └── tests/                           # Vitest verification suite
```

---

## 2. Reading Order by Audience

### For Frontend Developers

1. Start with [01-overview-and-principles.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/01-overview-and-principles.md) to understand the non-negotiables.
2. Read [04-field-standards.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/04-field-standards.md) for field selection and form rules.
3. Reference [05-page-patterns.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/05-page-patterns.md) when building new pages, drawers, or dialogs.
4. Follow [09-guardrails-and-automation.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/09-guardrails-and-automation.md) to run pre-commit checks.

### For UI/UX & Design Systems Engineers

1. Read [02-design-tokens.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/02-design-tokens.md) for color tokens, dark mode, and WCAG AA contrast matrix.
2. Review [03-component-catalog.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/03-component-catalog.md) for component variants and primitives.
3. Review [07-accessibility-ux-conventions.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/07-accessibility-ux-conventions.md) for focus management and copy standards.

### For Software Architects & Engineering Leads

1. Read [UI_STANDARD_SUMMARY.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/UI_STANDARD_SUMMARY.md) for high-level scorecard and ROI.
2. Read [08-frontend-architecture.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/08-frontend-architecture.md) for generic vs domain code boundary.
3. Read [10-gap-analysis.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/10-gap-analysis.md) for technical debt and maturity evaluation.
4. Read [11-portability-and-adoption-guide.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/11-portability-and-adoption-guide.md) to bootstrap other projects in 30 minutes.

### For AI Coding Agents

1. Load [AGENT_PROMPT_FOR_NEW_PROJECT.md](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/AGENT_PROMPT_FOR_NEW_PROJECT.md) directly into system instructions.
2. Use [rules.json](file:///home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management/docs/ui-standard/rules.json) as machine-readable validation ruleset.
