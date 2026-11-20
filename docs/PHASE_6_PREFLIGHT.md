# Phase 6 Pre-Flight Inventory & Reuse Strategy

**Date**: 2026-11-20  
**Branch**: `feature/phase-6-reports`  
**Base Commit**: `0f1a136` (`feat(closeout): complete Phase 5 and Phase R closeout verification (V1-V14)`)

---

## 1. Baseline Quality Gate Status (Step 0b)

All baseline verification gates are 100% green:

| Gate                      |  Status  | Details                                                                                |
| :------------------------ | :------: | :------------------------------------------------------------------------------------- |
| **`npm run check:ui`**    | **PASS** | 7 foundational UI allowlist files strictly preserved; 0 violations.                    |
| **`turbo run lint`**      | **PASS** | 0 problems (0 errors, 0 warnings) across `@hm/api`, `@hm/web`, `@hm/shared`.           |
| **`turbo run typecheck`** | **PASS** | 0 diagnostics across all packages.                                                     |
| **`turbo run test`**      | **PASS** | 20 total unit/integration tests (14 in `@hm/api`, 6 in `@hm/web`, 0 failed).           |
| **`turbo run build`**     | **PASS** | `@hm/shared` (tsup), `@hm/api` (tsc), `@hm/web` (vite) built cleanly in 27s.           |
| **Playwright E2E**        | **PASS** | 4/4 passed in 5.3s across desktop-1440 and mobile-360 viewports with 0 axe violations. |

---

## 2. Inventory of Reusable Assets for Phase 6

### A. Dashboard Endpoints & Widgets

- **API**: `DashboardController` (`apps/api/Controllers/dashboard.ts`) and `DashboardService` (`apps/api/Services/dashboard.ts`).
  - Currently exposes `/dashboard` summary endpoint aggregating active assets, warranty expirations (next 30 days), software seats usage, and active assignments.
  - Phase 6 will expand this to be role-aware (`super_admin`/`hardware_manager`, `hr`, `employee`), reusing report aggregate queries for consistent KPI counts.
- **Web**: `apps/web/src/pages/Dashboard.tsx`.
  - Reusable layout with `StatCard`, quick action links, offboarding summary widgets, and credential approval alerts.
  - Recharts is installed (`recharts` v2.15.4); will build a token-aware `Chart` wrapper with full text/table accessibility fallback for light and dark modes.

### B. Table Export Buttons & CSV Helpers

- **Web Helper**: `apps/web/src/hooks/use-export-csv.ts`.
  - Existing client-side helper for CSV export.
  - Will be upgraded with RFC 4180 compliance, UTF-8 BOM (`\uFEFF`), and spreadsheet formula injection protection (prefixing `=, +, -, @, \t, \r` with `'`).
- **Lists Integration**: `CommonTable` toolbar has export trigger. Phase 6 routes existing table export actions through the unified report engine when a report definition matches, or through the hardened CSV helper.

### C. Spreadsheet & PDF Generation

- **ExcelJS**: Installed in `apps/api` (`exceljs` v4.4.0), currently used in `employee_import.ts` and `assets.ts`.
  - Will be used for streaming XLSX export with styled headers, frozen header rows, filter metadata summary sheet, and typed currency/date column formatters.
- **PDFKit**: Installed in `apps/api` (`pdfkit` v0.20.2), currently used in `clearance_pdf.service.ts`.
  - Will be reused for formatted landscape/portrait report PDF streaming with running headers, footers, pagination (`Page X of Y`), and applied filter criteria block.

### D. App Settings & Timezone Strategy

- **Settings Store**: `app_settings` Sequelize model (`Database/Schema.ts`).
  - Stores system-wide configuration keys such as company name, currency, and `app.timezone`.
- **Timezone**: `APP_TIMEZONE` env variable with fallback to `app_settings` key `timezone` or `Asia/Kolkata`.
  - All date range boundaries and "today" calculations will evaluate against `APP_TIMEZONE` (inclusive start-of-day 00:00:00, inclusive end-of-day 23:59:59.999).

### E. Audit & Activity Logging

- **Activity Log**: `createActivityLog` in `apps/api/Utils/helpers.ts` records all administrative mutations.
- **Access Log**: `credential_access_logs` tracks vault actions and reveals.
- Report 10 (`audit-export`) will provide a tamper-evident export of activity and access logs with cryptographic hash-chain verification per page.

### F. Realtime Service & Socket Rooms

- **Realtime Service**: `apps/api/Services/realtime.service.ts` and `gateway.ts`.
  - Architectural test `tests/architectural_realtime.test.ts` guarantees zero `io.emit` calls outside `Realtime/`.
  - New export job lifecycle events (`EXPORT_JOB_STARTED`, `EXPORT_JOB_PROGRESS`, `EXPORT_JOB_COMPLETED`, `EXPORT_JOB_FAILED`) will be added to `REALTIME_EVENTS` in `packages/shared`, targeting `user:<id>` rooms exclusively.
  - Web client (`apps/web/src/lib/realtime.ts`) invalidates TanStack query cache on reconnect with 60s fallback polling during disconnections.

---

## 3. Scope Boundaries & Backlog

- **In Scope**:
  1. Config-driven Report Engine (10 reports, run, CSV/XLSX/PDF stream, async jobs).
  2. Background export processor with atomic row locking and TTL cleanup.
  3. Metadata-driven `ReportPage`, catalogue, and Exports drawer.
  4. Role-aware dashboards (`admin`/`hardware`, `hr`, `employee`).
  5. Bulk performance seeding (`npm run seed:reports-bulk`) and latency benchmarks.
  6. Full-system fixture (`npm run seed:test-fixture`) and comprehensive UAT plan (`docs/FULL_SYSTEM_TEST_PLAN.md`).
  7. Real-browser functional and realtime verification (RT-1 through RT-10).
- **Out of Scope** (deferred to `BACKLOG.md`):
  - Scheduled / emailed recurring reports.
  - Ad-hoc drag-and-drop custom report builder.
  - User-saved filter presets.
  - External BI connector integrations (PowerBI / Tableau).
