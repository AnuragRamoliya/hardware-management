# Project Status and Claim Verification Report

This document records the exact, verified status of all claims in the Project Brief against the live codebase as of November 18, 2026. All checks were executed in a read-only manner against the source files, test suites, and database migrations.

---

## 1. Executive Verification Summary

| Phase / Initiative | Claimed Status | Verified Status | Completion % | Key Evidence & Gaps |
|---|---|---|---|---|
| **Phase 1: Foundation & Core Admin** | DONE | **DONE** | 100% | Full auth, RBAC, users, employees, master tables, audit logs, notifications stub, app shell, design system. |
| **Select System & Options API** | DONE | **PARTIAL** | 80% | High-performance options builder with keyset paging and 100k seed exists; `docs/OPTIONS_PAGINATION_REPORT.md` is **MISSING**. |
| **Select Migration** | DONE | **PARTIAL** | 65% | Web forms use async selects; API active validation (`validateExists`) and joined display objects in list responses are **MISSING** (documented as Planned in `SELECT_MIGRATION_AUDIT.md`). |
| **Phase 2: Assets, Assignments, Software** | DONE | **DONE** | 95% | Assets, QR, accessories, specs, assignments with row locking, maintenance, software, licenses (AES-256-GCM encrypted), seat limits, expiry cron job, portal pages all functional. Missing Swagger documentation for Phase 2 routes. |
| **UI Standardization** | UNKNOWN | **PARTIAL** | 50% | `UI_STANDARDS.md`, `UI_CONFORMANCE_AUDIT.md`, `check-ui.mjs`, and shared form layouts exist; 15 files remain on the native-control allowlist; React Query hooks remain inline in pages rather than modularized in `hooks/queries/`; visual/a11y test suites **MISSING**. |
| **Assets/Software UI Parity with Employees** | UNKNOWN | **NOT DONE** | 15% | `docs/ASSET_SOFTWARE_PARITY_AUDIT.md` is **MISSING**; before/after screenshots **MISSING**; `Assets.tsx` and `Software.tsx` still rely on unstandardized native controls and ad-hoc dialogs. |
| **Phase 3: Credentials Vault** | PLANNED | **NOT STARTED** | 5% | AES-256-GCM encryption helper exists; `Services/credential_vault.ts` is an empty class stub; no DB table or routes exist. |
| **Phase 4: Employee Portal Requests** | PLANNED | **NOT STARTED** | 0% | `Services/request_workflow.ts` is an empty class stub; no DB table or routes exist. |
| **Phase 5: Offboarding Automation** | PLANNED | **NOT STARTED** | 0% | `Services/offboarding.ts` is an empty class stub; no DB table or routes exist. |
| **Phase 6: Reports & Analytics** | PLANNED | **NOT STARTED** | 10% | Dashboard summary card endpoint exists; report generator, PDF/Excel export, and scheduled reports not started. |
| **Phase 7: Security Review, E2E, Docker, CI/CD** | PLANNED | **NOT STARTED** | 0% | No Dockerfile, docker-compose, CI workflows, or E2E tests exist. |

---

## 2. Command Execution & Test Results

### 2.1 API Project (`hardware-mnagement-api`)

| Command | Status | Result Summary | Notes |
|---|---|---|---|
| `npm run typecheck` (`tsc --noEmit -p tsconfig.json`) | **PASS** | 0 errors | Strict TypeScript check passed cleanly. |
| `npm run lint` (`eslint .`) | **PASS** | 0 errors, 0 warnings | ESLint v9 flat config. |
| `npm run build` (`tsc -p tsconfig.json`) | **PASS** | 0 errors | Output generated cleanly in `dist/`. |
| `npm run test` (`vitest run`) | **PASS (with skips)** | 3 test files passed, 2 skipped; 18 tests passed, 9 skipped | Database integration tests are gated behind env flags. |
| `OPTIONS_DB_INTEGRATION=1 PHASE2_DB_INTEGRATION=1 npm run test` | **PASS** | 5 test files passed, 26 tests passed, 1 skipped | All live database integration tests passed. |
| `OPTIONS_PERF_TEST=1 OPTIONS_DB_INTEGRATION=1 npx vitest run tests/options_builder.test.ts` | **PASS** | 8 tests passed (0 skipped) | 100k-row options search p95 benchmark passed in 502ms. |
| Clean DB Migration & Seed (`db:migrate` + `db:seed:all`) | **PASS** | 3 migrations, 4 seeders completed | Verified against fresh test database `itam_clean_test_db`; seeded 100k employees and 100k assets cleanly. |

#### Notes on API Test Configuration:
- `tests/setup.ts` overrides DB credentials to `itam_test` unless `OPTIONS_DB_INTEGRATION === '1'` or `PHASE2_DB_INTEGRATION === '1'`. Running `OPTIONS_PERF_TEST=1` without `OPTIONS_DB_INTEGRATION=1` causes an authentication failure against `itam_test`.

### 2.2 Web Project (`hardware-management-web`)

| Command | Status | Result Summary | Notes |
|---|---|---|---|
| `npm run typecheck` (`tsc -b --pretty`) | **PASS** | 0 errors | Full TypeScript project reference check passed. |
| `npm run lint` (`eslint .`) | **PASS** | 0 errors, 0 warnings | ESLint v9 passed cleanly. |
| `npm run build` (`tsc -b && vite build`) | **PASS** | 0 errors | Production bundle built in ~4.5s. |
| `npm run test` (`vitest run`) | **PASS** | 11 test files passed, 31 tests passed, 0 failures | Components, hooks, stores, and API layer covered. |
| `npm run check:ui` (`node scripts/check-ui.mjs`) | **PASS** | Guardrail passed with 15 files on allowlist | No direct axios, no console.logs, no hex colors. 15 legacy files remain on native-control migration allowlist. |

---

## 3. Claim-by-Claim Verification Matrix

### 3.1 Stack & Architecture

| Brief Claim | Verified Status | Evidence (Files & Lines) | Analysis / Gaps |
|---|---|---|---|
| Web: React 18 + TS + Vite + Tailwind + Radix UI + Zustand + React Query + RHF + Yup | **DONE** | [package.json](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/package.json#L24-L44) | All versions match: React 18.3.1, Vite 6.4.1, Tailwind 3.4.17, Zustand 5.0.11, TanStack Query 5.83.0, RHF 7.61.1, Yup 1.7.1. |
| API: Node.js + Express 5 + TS + Sequelize 6 + MySQL | **DONE** | [package.json](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/package.json#L23-L44) | Express 5.2.1, Sequelize 6.37.8, MySQL2 3.24.4, TypeScript 5.9.3. |
| Roles: `super_admin`, `hardware_manager`, `hr`, `employee` | **DONE** | [20261117091000-seed-rbac.js](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Seeders/20261117091000-seed-rbac.js#L29-L34), [roles.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/lib/roles.ts#L3-L17) | Mapped and seeded with explicit module permission rules. Normalized in Web as `admin`, `hardware`, `hr`, `employee`. |
| API layers: Routes -> Controllers -> Models (+ Services) | **DONE** | [API_MODULE_LAYOUT.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/docs/API_MODULE_LAYOUT.md#L3-L9) | Consistent 4-tier separation across both Phase 1 and Phase 2 modules. |
| Web layers: api/ -> pages/ -> components/ -> hooks/ -> zustand/ -> routes/ | **DONE** | [src/](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/) | Conforms to architecture layout. |
| Response envelope: `res.handler` `{ message, data }` | **DONE** | [response_handler.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Config/response_handler.ts#L10-L75) | Standard envelope across all routes. |
| User tokens table & session handling | **DONE** | [Schema/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Schema/index.ts#L33-L42), [user_tokens migration](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Migrations/20261117090000-create-phase-one-tables.js#L42-L55) | Tokens stored hashed (`sha256`); access and refresh tokens supported. |
| List API contract: `POST /<res>/list` with pagination, filters, sortBy, search | **DONE** | [validations.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Utils/validations.ts#L22-L46), [resource.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Models/resource.ts#L80-L140) | Standard contract returning `{ rows, count }`. |
| Status 0/1/2 soft delete & audit fields | **DONE** | [Schema/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Schema/index.ts#L10-L16) | `commonAttributes` applied across all 21 models. |
| Activity logs written via `createActivityLog` in same transaction | **DONE** | [helpers.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Utils/helpers.ts#L45-L75) | Verified in `assets.ts`, `software.ts`, `asset_assignment.ts`, `employees.ts`, `users.ts`, `resource.ts`. |
| Crypto-js payload encryption kept in API (Web sends `plain-text: true`) | **DONE** | [cryptography.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Middleware/cryptography.ts#L10-L38), [callApi.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/api/callApi.ts#L57) | API decrypts payload when encrypted; bypasses when `plain-text: true` is provided. |
| Improvements over invsys: Helmet, Rate limit, CORS from env, Zod env | **DONE** | [app.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Config/app.ts#L15-L35), [env.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Config/env.ts#L1-L38) | Validated Zod environment parsing; Helmet and rate-limiting active. |
| Docker support claimed in improvements | **MISSING** | Root & subdirectories | No Dockerfile, docker-compose.yml, or container configuration exists. (Deferred to Phase 7). |

---

### 3.2 Phase 1: Foundation & Core Admin

| Feature | Verified Status | Evidence (Files & Lines) | Notes / Gaps |
|---|---|---|---|
| Authentication (login, logout, refresh, forgot, OTP, reset, change password, profile) | **DONE** | [Routes/users.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/users.ts#L45-L105) | All 8 endpoints implemented with rate limits and validation. |
| Users CRUD | **DONE** | [Routes/users.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/users.ts#L107-L185) | Add, update, get, list, options, delete, activity. |
| Roles + Module/Permission matrix | **DONE** | [Routes/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/index.ts#L100-L140), [Roles.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Roles.tsx#L1-L220) | Visual matrix editor in UI; checks read, write, delete, and options_access. |
| Employees CRUD + Login creation | **DONE** | [Routes/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/index.ts#L141-L245), [employees.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/employees.ts#L25-L95) | Creates linked User in a single transaction when `create_login: true`. |
| Bulk employee import (CSV/XLSX) | **DONE** | [employee_import.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/employee_import.ts#L1-L120) | Parses CSV and XLSX; returns row-level error reporting. |
| Master tables (Departments, Designations, Locations, Vendors, Asset Categories) | **DONE** | [Routes/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/index.ts#L36-L98) | Generic resource registration handles all 5 masters. |
| Audit logs | **DONE** | [Routes/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/index.ts#L247-L260), [AuditLogs.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/AuditLogs.tsx#L1-L150) | Table view with filters and CSV export. |
| Notifications stub | **DONE** | [Routes/notifications.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/notifications.ts#L1-L50), [Notifications.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Notifications.tsx#L1-L100) | Header bell with unread badge in AppShell; mark read and mark-all-read. |
| App shell, design system showcase, role routing, portal shell | **DONE** | [AppShell.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/components/layout/AppShell.tsx#L1-L250), [sections.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/routes/sections.tsx#L1-L200) | Complete layout with collapsible sidebar, theme switch, role guards. |

---

### 3.3 Select System, Options API & Migration

| Feature | Verified Status | Evidence (Files & Lines) | Notes / Gaps |
|---|---|---|---|
| Options API (`POST /<res>/options`) contract | **DONE** | [options_builder.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Utils/options_builder.ts#L1-L230) | Body `{ search, page, limit, ids[], filters{}}` returning `{ rows: [{value, label, subLabel, meta}], count, hasMore, page }`. |
| Keyset cursor pagination & 100k search p95 (<10ms) | **DONE** | [options_builder.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Utils/options_builder.ts#L160-L215), [options_database.test.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/tests/options_database.test.ts#L1-L150) | Cursor paging with tiebreaker; p95 benchmark test logged 1.36ms first page / 1.41ms deep cursor. |
| Options report: `docs/OPTIONS_PAGINATION_REPORT.md` | **MISSING** | `docs/` | File does not exist anywhere in either project. |
| Web Select components (Async, Multi, Popover, Virtualized) | **DONE** | [select/index.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/components/ui/select/index.tsx#L1-L120), [fields.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/components/hook-form/fields.tsx#L120-L220) | Radix popover, keyboard search, infinite scroll, removable chips. |
| Select migration audit: `docs/SELECT_MIGRATION_AUDIT.md` | **DONE** | [SELECT_MIGRATION_AUDIT.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/docs/SELECT_MIGRATION_AUDIT.md#L1-L200) | Thorough audit recording field mappings and pending backend tasks. |
| API: `validateExists` on foreign keys | **MISSING** | [Routes/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/index.ts#L150-L180) | Employee add/update only validates `employee_code` and email uniqueness; foreign key references (`department_id`, `designation_id`, `manager_id`, `location_id`) are not checked for existence/active state. |
| API: Joined display objects in list responses | **MISSING** | [resource.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Models/resource.ts#L85-L125) | `ResourceModel.list` queries plain rows without Sequelize association includes. Front-end hydrates labels via `ReferenceLabel`. |

---

### 3.4 Phase 2: Assets, Assignments, Software

| Feature | Verified Status | Evidence (Files & Lines) | Notes / Gaps |
|---|---|---|---|
| Assets (auto tag `AST-XXXXXX`, serial, category, vendor, location, specs JSON, warranty, condition) | **DONE** | [assets.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/assets.ts#L30-L75) | Auto-tag generation uses zero-padded sequence formatting `AST-000001`. |
| QR Code generation for assets | **DONE** | [assets.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/assets.ts#L100-L115), [Routes/assets.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Routes/assets.ts#L60-L70) | Serves QR code data URL via `qrcode` package. |
| Accessories hierarchy (parent/child assets) | **DONE** | [Schema/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Schema/index.ts#L155-L157), [phase2_database.test.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/tests/phase2_database.test.ts#L50-L80) | `parent_asset_id` on assets; accessories automatically cascade on parent assignment and return. |
| Asset assignments with row locking | **DONE** | [asset_assignment.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/asset_assignment.ts#L15-L60) | Assign, return, transfer, bulk assign, bulk return all use `lock: transaction.LOCK.UPDATE`. |
| DB-level single concurrent asset assignment guarantee | **DONE** | [create-assets-software.js](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Migrations/20261117120000-create-assets-software.js#L55-L65) | Virtual stored column `open_asset_id` with unique index `asset_assignments_open_asset_unique`. |
| Asset maintenance tracking | **DONE** | [asset_maintenance.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/asset_maintenance.ts#L1-L90), [Maintenance.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Maintenance.tsx#L1-L80) | Creates maintenance record, changes asset status to `IN_REPAIR` (4), restores on completion. |
| Software management & seat limits | **DONE** | [software.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/software.ts#L115-L165) | Enforces total seat availability across active licenses; rejects assignment when seats are exhausted. |
| Software license key AES-256-GCM encryption | **DONE** | [software_licenses.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/software_licenses.ts#L55-L65) | License keys encrypted with `encryptVaultSecret`; never returned in `list` or `get` queries. |
| DB-level single active software assignment per employee | **DONE** | [create-assets-software.js](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Database/Migrations/20261117120000-create-assets-software.js#L95-L102) | Persistent column `open_employee_software` with unique index `software_assignments_open_employee_unique`. |
| Expiry alert cron job | **DONE** | [Jobs/index.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Jobs/index.ts#L1-L15), [notification.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/notification.ts#L25-L75) | Runs daily at 00:00; checks 30/15/7-day thresholds for warranty, license expiry, software renewal, and overdue returns. Idempotent via unique DB constraint. |
| CSV asset import / template / export | **DONE** | [assets.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/assets.ts#L190-L280) | Parses CSV with row-by-row error reporting; exports current filter result to CSV. |
| Employee Hardware/Software tabs | **DONE** | [EmployeeDetail.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/EmployeeDetail.tsx#L85-L160) | Overview, Hardware (with direct return action), Software (with direct revoke action), Activity tabs. |
| Portal My Assets & My Software | **DONE** | [PortalAssets.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/PortalAssets.tsx#L1-L50), [PortalSoftware.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/PortalSoftware.tsx#L1-L50) | Scoped strictly to authenticated employee session; does not accept employee ID parameter. |
| Dashboard cards & metrics | **DONE** | [dashboard.ts](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Services/dashboard.ts#L1-L60), [Dashboard.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Dashboard.tsx#L1-L110) | Total assets, assigned/available, total software, upcoming warranty/renewal alerts, cost summary. |
| Swagger documentation for Phase 2 routes | **MISSING** | [Swagger/](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/Swagger/) | Only Phase 1 (`resources.ts` and `users.ts`) documented in Swagger. Phase 2 routes (`/asset/*`, `/software/*`, `/portal/*`, etc.) are absent. |

---

### 3.5 UI Standardization & Parity Status

| Requirement | Verified Status | Evidence (Files & Lines) | Notes / Gaps |
|---|---|---|---|
| `docs/UI_STANDARDS.md` | **DONE** | [UI_STANDARDS.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/docs/UI_STANDARDS.md#L1-L120) | Comprehensive contract for page layouts, field library, React Query, forms, responsive tokens. |
| UI conformance audit | **DONE** | [UI_CONFORMANCE_AUDIT.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/docs/UI_CONFORMANCE_AUDIT.md#L1-L70) | Records 35 audited components/pages with failure codes across forms, queries, and accessibility. |
| Shared UI primitives & form helpers | **PARTIAL** | [components/common/](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/components/common/) | `FormLayout.tsx`, `KeyValueEditor.tsx`, `RowActionsMenu.tsx`, `Drawer.tsx`, `use-form-drawer.ts` built; but not yet adopted in all module pages. |
| ESLint / guardrail script (`check:ui`) | **DONE** | [scripts/check-ui.mjs](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/scripts/check-ui.mjs#L1-L65) | Validates direct axios, console.log, window.location, and raw controls. 15 legacy files on allowlist. |
| Module code generators (`gen:module`) | **PARTIAL** | [api/gen-module.mjs](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-mnagement-api/scripts/gen-module.mjs), [web/gen-module.mjs](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/scripts/gen-module.mjs) | Generates scaffold/placeholders; does not generate working CRUD, migrations, RBAC seeder entries, or Swagger docs. |
| React Query hook modularization (`hooks/queries/`) | **MISSING** | `src/hooks/queries/` | Directory does not exist. All `useQuery` / `useMutation` calls are currently declared inline in page files. |
| Visual regression and axe accessibility tests | **MISSING** | `src/test/` | Vitest unit and DOM tests only. No Playwright, Cypress, Axe-core, or screenshot tests. |
| Asset/Software parity audit doc: `docs/ASSET_SOFTWARE_PARITY_AUDIT.md` | **MISSING** | `docs/` | File does not exist anywhere. |
| Before/after parity screenshots | **MISSING** | `docs/` or `public/` | No screenshot assets exist. |
| Assets/Software pages refactored to standard | **NOT DONE** | [Assets.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Assets.tsx), [Software.tsx](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/src/pages/Software.tsx) | Both files remain on the `check:ui` native allowlist; forms use local component state and native HTML controls instead of FormProvider and Drawer. |

---

## 4. Planned Future Phases (Read-Only Verification)

| Phase | Description | Current Code Status |
|---|---|---|
| **Phase 3: Credentials Vault** | Company & employee accounts/passwords, approval workflow, reveal with re-auth, access logs | **Not started.** `encryptVaultSecret` helper exists; `Services/credential_vault.ts` is an empty class. No database schema or endpoints. |
| **Phase 4: Employee Portal Requests** | Request hardware, replace/repair, software access, approval flow, review comments | **Not started.** `Services/request_workflow.ts` is an empty class. No database schema or endpoints. |
| **Phase 5: Offboarding Automation** | Resignation workflow, asset return checklists, access revocation, clearance PDF | **Not started.** `Services/offboarding.ts` is an empty class. No database schema or endpoints. |
| **Phase 6: Reports & Dashboards** | Utilization, warranty, turnaround reports, PDF/Excel generation | **Not started.** Basic dashboard summary card endpoint exists; no report generator or export pipeline. |
| **Phase 7: Security & Deployment** | E2E test suites, security penetration testing, Docker containers, CI/CD pipelines | **Not started.** No container or CI files. |

