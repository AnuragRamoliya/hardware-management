# Backlog & Technical Debt Tracking

This document tracks identified gaps, non-blocking technical debt, and deferred items across completed and in-progress phases of the `hardware-management` monorepo.

---

## Phase 4 Gap Analysis & Audit Status

Audited on **November 19, 2026** during Phase 5 pre-flight:

| Item                                     | Status                        | Notes / Location                                                                                                                                                                                                    |
| :--------------------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Request Attachments**                  | **Partial (API Schema Only)** | `request_attachments` table and DB relations exist (`apps/api/Services/request.ts`); upload endpoints and front-end file picker UI deferred (non-blocking for Phase 5).                                             |
| **Awaiting-Stock Flag & Queue**          | **Implemented**               | `awaiting_stock` column, index, query filters, and UI queue tab fully operational in `apps/api` and `apps/web/src/pages/Requests.tsx`.                                                                              |
| **Request Stats Endpoint**               | **Implemented**               | `GET /requests/stats` active with real-time status counts, SLA metrics, and category aggregations (`apps/api/Routes/requests.ts:121`).                                                                              |
| **Auto-Close & Need-Info Reminder Jobs** | **Implemented**               | `runSlaCheck`, `runNeedInfoReminders`, and `runAutoCloseFulfilled` implemented in `apps/api/Jobs/request_sla.ts` and covered by automated tests.                                                                    |
| **Request Settings in `app_settings`**   | **Implemented**               | Seeded with defaults (`request_manager_approval_required`, `request_sla_hours_hardware`, `request_auto_close_days`).                                                                                                |
| **Manager-Approval Setting**             | **Implemented**               | `request_manager_approval_required` seeded in `20261119121000-seed-phase4-requests.js` and enforced conditionally in `portal_request.ts`.                                                                           |
| **20k-Request `seed:bulk`**              | **Missing / Deferred**        | `apps/api/package.json` `seed:bulk` seeds employees, assets, and credentials, but not 20,000 requests. Deferred to future performance benchmarking.                                                                 |
| **Playwright Visual / Axe Baselines**    | **Missing / Deferred**        | Unit and component tests pass via Vitest and `check:ui`, but end-to-end Playwright visual regression snapshots were not configured.                                                                                 |
| **Phase 4 Smoke Test Execution**         | **Executed & Passing**        | `PHASE4_DB_INTEGRATION=1 npx vitest run tests/requests.test.ts` was executed against local database. After fixing asset selection query to ensure unassigned asset allocation, all 10/10 test cases passed cleanly. |
