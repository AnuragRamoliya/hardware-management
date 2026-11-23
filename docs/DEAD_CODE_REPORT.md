# Dead Code Report & Analysis

This report tracks potential dead code, unreferenced exports, obsolete dependencies, and legacy components audited during Phase 10.

## Assessment Rules

- **DELETE**: Zero references across web, api, shared, tests, configs, and CI. Safe to eliminate.
- **KEEP (Reason)**: Dynamic imports, reflection, route registry lookup, seeder/fixture usage, public contract enum.
- **OWNER DECISION**: API endpoints without current UI callers or orphaned legacy data structures that may be retained for external consumers.

---

## Audit Findings & Decisions

| Category         | Item Name / Path                     | Evidence of Use / Audit Findings                                                                    | Decision | Rationale / Resolution                                                                                             |
| :--------------- | :----------------------------------- | :-------------------------------------------------------------------------------------------------- | :------: | :----------------------------------------------------------------------------------------------------------------- |
| **Pickers**      | Legacy Native Date Inputs            | AST Scanner: Filter panels previously used raw string inputs; now replaced by modern `DatePicker`   |  DELETE  | Replaced across `TableFilterPanel`, `date-utils.ts`, and RHF wrappers. No orphaned legacy pickers remain.          |
| **Components**   | `NativeSelect` (`native-select.tsx`) | Used in `RequestActionDialogs.tsx` and `NewRequestDrawer.tsx` for mobile drawer actions             |   KEEP   | Retained for native mobile select ergonomics; reinforced with `data-hm="select"` runtime attribute.                |
| **Phone**        | Legacy raw phone strings             | Replaced with `@hm/shared` `libphonenumber-js` parsing and E.164 normalization                      |  DELETE  | Replaced across API models, route factories, services, and web UI. Data migration script created.                  |
| **Dependencies** | `@hm/web` Dependencies (27 pkgs)     | Audited all 27 packages in `package.json` against imports across `src/`                             |   KEEP   | 100% active utilization (Radix UI, TanStack Query, Lucide, Recharts, Zustand, React Day Picker, Date-fns, Sonner). |
| **Dependencies** | `@hm/api` Dependencies               | Audited express, sequelize, mysql2, vitest, winston, jsonwebtoken, crypto                           |   KEEP   | All dependencies required for production runtime, cryptographic hashing, and integration tests.                    |
| **Scripts**      | `scripts/` utility toolset           | Verified: `check_field_usage.ts`, `migrate_phone_numbers.ts`, `check_ui_inventory.ts`, audit-verify |   KEEP   | All scripts actively run in CI, pre-commit hooks, or maintenance workflows.                                        |

---

## Production Build & Bundle Metrics

| Package / Artifact       | Minified Size | Gzipped Size | Module Count  | Build Time | Status |
| :----------------------- | :-----------: | :----------: | :-----------: | :--------: | :----: |
| `@hm/web` `index.js`     |   685.79 kB   |  208.74 kB   | 3,044 modules |   14.34s   |  PASS  |
| `@hm/web` `Dashboard.js` |   437.77 kB   |  118.13 kB   | (code-split)  |     -      |  PASS  |
| `@hm/web` `DesignSystem` |   28.23 kB    |   7.51 kB    | (code-split)  |     -      |  PASS  |
| `@hm/shared` ESM Bundle  |   22.35 kB    |   5.82 kB    |    Unified    |   146 ms   |  PASS  |
| `@hm/shared` CJS Bundle  |   27.08 kB    |   6.94 kB    |    Unified    |   140 ms   |  PASS  |
| `@hm/shared` DTS Types   |   43.92 KB    |   10.15 kB   | Declarations  |  3,489 ms  |  PASS  |

---

## Summary of Cleanup Actions

1. Native date inputs systematically eliminated and replaced with headless accessible `DatePicker` / `DateRangePicker` components with bottom-sheet support for <= 640px.
2. Inconsistent phone input formats unified under E.164 normalization with country selector.
3. Ast scanner (`scripts/check_field_usage.ts`) guarantees 0 unshared/native `<input>` / `<select>` / `<textarea>` / `<button>` violations.
4. All 0-skip and 0-warning quality gates maintained.
