# Phase 10 Progress Tracker: Common Component Enforcement, Phone/Date Pickers, Testing & Dead Code Removal

## Status Overview

| Phase Area                                 | Status      | Focus / Key Deliverables                                                                                                                                            | Completion Date |
| :----------------------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- |
| **Step 0: Baseline & Infrastructure**      | In Progress | Baseline measurements (lint, typecheck, test counts, coverage, harness, build), stack verification, tracker docs                                                    | 2026-11-23      |
| **Part A: Common Field Enforcement**       | Pending     | AST static scan (`scripts/check_field_usage.ts`), ESLint restrictions, runtime guard (`data-hm`), TableFilterPanel migrations, design system showcase               | -               |
| **Part B: Phone Field with Country Code**  | Pending     | `PhoneField` (`RHFPhoneField`, `PhoneDisplay`, country selector sheet, libphonenumber-js), shared E.164 validator, data migration dry run, usage migration          | -               |
| **Part C: Modern Date/Time/Range Pickers** | Pending     | Headless date pickers (`DatePicker`, `TimePicker`, `DateTimePicker`, `DateRangePicker`), popovers + mobile sheets, token styling, AST migration, old picker removal | -               |
| **Part D: Browser Walkthrough & Audit**    | Pending     | Audit all 81+ inventory items with real clicks at 360/768/1440 in light & dark, DOM geometry, touch target measurement, zero axe violations                         | -               |
| **Part E: Module Test Matrix & Coverage**  | Pending     | Test cases T1-T10 across all modules in `docs/MODULE_TEST_MATRIX.md`, enforce coverage thresholds, mutation testing, flaky test resolution                          | -               |
| **Part F: Dead Code Removal**              | Pending     | Knip, depcheck, unused exports/components/deps cleanup, `docs/DEAD_CODE_REPORT.md`, bundle size comparison                                                          | -               |
| **Part G: CI Harness & Quality Gates**     | Pending     | CI job for responsive harness, WebKit status, deterministic test accounts, final quality gate runs                                                                  | -               |

---

## Detailed Task Checklist

### Step 0: Baseline

- [x] Branch `ui/phase-10-components` created from `ui/phase-9-responsive`
- [ ] Record baseline measurements: lint, typecheck, test counts, test:count, build, check:ui, check:ui-inventory, test:all-fixture
- [ ] Record baseline coverage per package/module
- [ ] Verify local stack running (API on 8000, Web on 5173, DB on 3306)
- [x] Initialize documentation files (`PHASE10_PROGRESS.md`, `COMPONENT_USAGE_MATRIX.md`, `DEAD_CODE_REPORT.md`, `MODULE_TEST_MATRIX.md`)
- [ ] Initial baseline commit

### Part A: Common Field Enforcement

- [ ] Create AST-based scanner `scripts/check_field_usage.ts`
- [ ] Implement ESLint `no-restricted-imports` and `no-restricted-syntax` rules for native/non-shared inputs
- [ ] Add `data-hm` runtime guard attributes to all shared field components (`select`, `phone`, `date`, `date-range`, `datetime`, `time`, `text`, `textarea`, `number`, `currency`, `password`, `switch`, `checkbox`, `radio`, `tags`, `file`, `search`, `otp`)
- [ ] Extend Playwright responsive harness with `data-hm` and design-system styling conformance checks
- [ ] Add non-conforming dev/test fixture page to prove harness failure detection
- [ ] Migrate all filter selects in `<Module>Filters.ts` configs and toolbars to shared `Select` / `MultiSelect`
- [ ] Verify URL state round-trip in real browser
- [ ] Update `/design-system` page to showcase all field kinds x states x sizes

### Part B: Phone Field with Country Code Selector

- [ ] Install and configure `libphonenumber-js`
- [ ] Build shared `PhoneField`, `RHFPhoneField`, and filter phone component with searchable country selector bottom-sheet / popover
- [ ] Implement accessible flags (SVG/CSS or text ISO codes, no emoji-only dependency)
- [ ] Build `PhoneDisplay` component with formatted national/international view, `tel:` link, and copy button
- [ ] Implement shared E.164 phone validator in `@hm/shared` (used by Yup and express-validator)
- [ ] Create data migration dry-run report (`docs/PHONE_MIGRATION.md`)
- [ ] Replace every phone input across the application (employees, users, vendors, locations, profile, portal, offboarding)
- [ ] Comprehensive unit, component, API, and Playwright tests for phone input and formatting

### Part C: Modern Date, Time, Date-Time & Range Pickers

- [ ] Implement headless accessible date pickers (`DatePicker`, `TimePicker`, `DateTimePicker`, `DateRangePicker`, and RHF wrappers)
- [ ] Build popover calendar with desktop collision handling and <= 640px bottom-sheet adaptation
- [ ] Implement quick-select dropdowns for month/year, range presets (Today, Yesterday, Last 7d, 30d, month, year, FY, custom)
- [ ] Ensure APP_TIMEZONE (Asia/Kolkata) compliance and YYYY-MM-DD date-only value contract
- [ ] Migrate all date/time usages in forms, filter panels, reports, dashboard, export dialogs
- [ ] Remove old native inputs and legacy date picker components
- [ ] Unit, component, and Playwright tests for all pickers and timezone edge cases

### Part D: Real Browser Walkthrough & Audit

- [ ] Verify all 81+ inventory items with real clicks
- [ ] Test across 360px, 768px, 1440px on Chromium and Firefox in light and dark themes
- [ ] Measure DOM geometry, scrollWidth, visualViewport fit, touch targets >= 44x44px, zero axe violations
- [ ] Log results into `docs/RESPONSIVE_QA_LOG.md`

### Part E: Module Test Matrix & Coverage

- [ ] Document T1-T10 test cases per module in `docs/MODULE_TEST_MATRIX.md`
- [ ] Implement all MISSING test cases
- [ ] Enforce coverage thresholds in CI / vitest config
- [ ] Run mutation testing (Stryker) on crypto, hash chain, permissions, state machines, phone/date logic
- [ ] Run shuffled suite and repeated Playwright runs to eliminate flakiness

### Part F: Dead Code Removal

- [ ] Run knip, depcheck, and unreferenced export scans
- [ ] Classify findings in `docs/DEAD_CODE_REPORT.md` (DELETE / KEEP / OWNER DECISION)
- [ ] Safely remove dead components, helpers, styles, and dependencies in separate commits
- [ ] Measure and report bundle size and line counts before/after

### Part G: CI Automation & Final Quality Gates

- [ ] Register responsive harness job in CI
- [ ] Address WebKit environment status and provide Docker runner instructions
- [ ] Implement deterministic fixture account handling
- [ ] Full quality gate verification across all packages
