# Phase 6 Closeout: Read-Only Audit & Baseline Findings

**Date**: 2026-11-20  
**Branch**: `feature/phase-6-reports`  
**Base Commit**: `0f1a136` (`fix/phase-5-r-closeout`)  
**Status**: Step 0 Read-Only Audit Completed

---

## 1. Base and Merge Order Audit (Item a)

### Git Commit Log & Ancestry Check

```bash
$ git log --oneline -n 6
0416e2b fix(reports): resolve permission check module name and super admin role normalization
8ad0e8b feat(reports): complete Phase 6 reports, exports, dashboards and system fixture
9113ca3 chore(testing): remove screenshot artifacts and switch to browser-based textual verification
69e0138 docs(preflight): complete Phase 6 preflight inventory and baseline verification
0f1a136 feat(closeout): complete Phase 5 and Phase R closeout verification (V1-V14)
34da8c6 docs: add Phase 5 and R closeout verification and audit report
```

### Merge Order Verification

- **Ancestry Confirmation**: `git branch --contains 0f1a136` confirms that `fix/phase-5-r-closeout` commit `0f1a136` is the direct ancestor of `feature/phase-6-reports`.
- **Round 2 Verification**: Commit `0f1a136` contains all Round 2 closeout items (V1–V14), including the SHA-256 digest comparison for `timingSafeEqual`, the strict `StatusBadge` string typing, and the verification document route.
- **Merge Order Lineage**:
  `main` -> `feature/phase-5-offboarding` -> `feature/phase-r-realtime` -> `fix/phase-5-r-gap-closure` -> `fix/phase-5-r-closeout` (`0f1a136`) -> `feature/phase-6-reports` (`0416e2b`).
- **Conclusion**: Round 2 is fully included.

---

## 2. Test Inventory Audit (Item b)

### Test Configurations and File Inventory

- **API (`apps/api`)**:
  - Config: `apps/api/vitest.config.cjs` (`environment: 'node'`, `exclude: ['dist/**', 'node_modules/**']`).
  - Active test files (7 files, 19 tests):
    1. `apps/api/tests/architectural_realtime.test.ts` (1 test)
    2. `apps/api/tests/no_raw_status_literals.test.ts` (1 test)
    3. `apps/api/tests/offboarding_daily.test.ts` (2 tests)
    4. `apps/api/tests/realtime_rooms.test.ts` (5 tests)
    5. `apps/api/tests/reports.test.ts` (5 tests)
    6. `apps/api/tests/transaction_rollback_realtime.test.ts` (2 tests)
    7. `apps/api/tests/verify_document.test.ts` (3 tests)
- **Web (`apps/web`)**:
  - Config: `apps/web/vite.config.ts` (`environment: 'jsdom'`, `include: ["src/**/*.{test,spec}.{ts,tsx}"]`, `exclude: ["node_modules", "e2e/**"]`).
  - Active test files (1 file, 6 tests):
    1. `apps/web/src/components/common/StatusBadge.test.tsx` (6 tests)
- **Shared (`packages/shared`)**:
  - Config: `packages/shared/package.json` (`"test": "node --test 'test/**/*.test.js' 2>/dev/null || exit 0"`).
  - Active test files: 0 files.

### Historical Difference Analysis (Phase 4: 65 tests vs Current: 25 tests)

- Git history reveals commit `c7bc2a20e3f18f6e99286103b49be6e7803d062d` ("chore: remove all test files and update test scripts") executed on Nov 19.
- That commit removed 15 backend test suites in `apps/api/tests/` (e.g. `api.test.ts`, `credentials.test.ts`, `requests.test.ts`, `offboarding.test.ts`, `options_builder.test.ts`), 1 frontend test in `apps/web/src/components/requests/__tests__/requests.test.tsx`, and 2 test files in `packages/shared/test/`.
- During Phase 5/R closeout and Phase 6, new focused test files were introduced, bringing the count back to 19 API tests and 6 web tests.
- **Action for Closeout**: Reinstate and restore legitimate test suites and add the required golden and unit test suites to exceed previous baselines.

---

## 3. Diff Review of Risky Edits (Item c)

Comparing `0f1a136` (base) to `HEAD`:

1. `eslint.config.js`:
   - Diff: **0 lines changed**. No rules loosened.
2. `playwright.config.ts`:
   - Diff: **0 lines changed**. No timeouts or assertions loosened.
3. `apps/web/src/api/callApi.ts`:
   - Diff: Normalized URL prefixing (`baseUrl` with trailing slash, `cleanedUrl` stripped of leading slash).
   - Reason: Fixed double-slash routing issues (e.g. `http://localhost:8000//reports/...`).
   - Loosening check: None.
4. `apps/api/Types/api.ts`:
   - Diff: Added optional `role?: string | { id: number; name: string }` and `role_name?: string` to `UserInfo`.
   - Reason: Type safety for request actor extraction across middleware and controllers.
   - Loosening check: None.
5. `apps/web/src/hooks/use-export-csv.ts`:
   - Diff: Added UTF-8 BOM (`\uFEFF`) and CRLF (`\r\n`) row termination, plus explicit anchor download element lifecycle (`appendChild` -> `click` -> `removeChild`).
   - Reason: Fixes Excel character encoding and browser popup blockers.
   - Loosening check: None.
6. `apps/web/src/components/layout/AppShell.tsx`:
   - Diff: Added Reports navigation link in main sidebar.
   - Reason: Accessibility and discoverability for operational analytics.
   - Loosening check: None.
7. `apps/web/src/pages/Dashboard.tsx`:
   - Diff: Added visual distribution charts and direct quick-links to the 4 primary operational reports.
   - Reason: Implemented dashboard widgets required by Part B3.
   - Loosening check: None.
8. `apps/api/Controllers/dashboard.ts`:
   - Diff: Passed request actor into `dashboard.summary(actor)`.
   - Reason: Enforces role-scoping (employee sees only own assignments; admin sees company-wide metrics).
   - Loosening check: None.
9. `apps/web/e2e/reports_functional.spec.ts`:
   - Diff: Added E2E tests with `page.route` mocks and `localStorage` auth token injection.
   - Reason: Early functional test draft.
   - Loosening check: **Flagged**. Must be replaced with real form login and live local backend API calls per honesty audit.
10. `apps/api/scripts/test_all_fixture.ts`:
    - Diff: Added standalone fixture verification script with 138 deterministic checks.
    - Reason: Golden baseline verification.
    - Loosening check: None.

---

## 4. Reports Truth Table Audit (Item d)

| #   | Spec Report Key                 | Registry Code Key (`registry.ts`) | Catalogue Doc Key (`REPORTS_CATALOGUE.md`) | Status                  | Action Required     |
| --- | ------------------------------- | --------------------------------- | ------------------------------------------ | ----------------------- | ------------------- |
| 1   | `hardware-per-employee`         | `hardware-per-employee`           | `hardware-per-employee`                    | Mismatch in docs        | Align catalogue doc |
| 2   | `assets-by-category-department` | `assets-by-category-department`   | `asset-lifecycle` (WRONG)                  | Code correct, doc wrong | Rewrite doc for R2  |
| 3   | `assigned-vs-unassigned`        | `assigned-vs-unassigned`          | `warranty-expiry` (WRONG)                  | Code correct, doc wrong | Rewrite doc for R3  |
| 4   | `software-license-utilization`  | `software-license-utilization`    | `maintenance-history` (WRONG)              | Code correct, doc wrong | Rewrite doc for R4  |
| 5   | `warranty-expiry`               | `warranty-expiry`                 | `software-license-utilization`             | Code correct, doc wrong | Rewrite doc for R5  |
| 6   | `repair-history`                | `repair-history`                  | `expiring-software` (WRONG)                | Code correct, doc wrong | Rewrite doc for R6  |
| 7   | `request-turnaround-sla`        | `request-turnaround-sla`          | `request-sla-performance` (WRONG)          | Code correct, doc wrong | Rewrite doc for R7  |
| 8   | `offboarding-status`            | `offboarding-status`              | `offboarding-clearance` (WRONG)            | Code correct, doc wrong | Rewrite doc for R8  |
| 9   | `credential-approvals-access`   | `credential-approvals-access`     | `credential-approvals-access`              | Code correct            | Align catalogue doc |
| 10  | `audit-export`                  | `audit-export`                    | `audit-export`                             | Code correct            | Align catalogue doc |

**Finding**: The backend code in `apps/api/Reports/definitions/` already registers the exact 10 spec keys. However, `docs/REPORTS_CATALOGUE.md` documented fictitious report keys (`asset-lifecycle`, `expiring-software`, etc.). `docs/REPORTS_CATALOGUE.md` will be rewritten to match the exact 10 spec keys and their schema columns.

---

## 5. Playwright Honesty Audit (Item e)

- **Audit of `apps/web/e2e/reports_functional.spec.ts`**:
  - Found `page.route("**/module/permission", ...)` mocking module permissions.
  - Found `page.route("**/notifications", ...)` mocking notifications.
  - Found `window.localStorage.setItem("token", "mock-jwt-token")` injecting fake credentials.
- **Remediation**:
  - Remove all `page.route` intercepts and fake token injection.
  - Implement real login via `/login` filling in `#email` and `#password` with deterministic fixture users (`admin@fixture.local`, `hw@fixture.local`, `hr@fixture.local`, `employee@fixture.local`).
  - Rely exclusively on real responses from `http://localhost:8000`.

---

## 6. Evidence Audit of Documentation (Item f)

1. `docs/PHASE_6_SMOKE_RESULTS.md`:
   - Contained entries for `POST /reports/run/asset-lifecycle`, `expiring-software`, etc.
   - Status: **Unproven / Fictitious**.
   - Remediation: Re-run smoke tests through the API against actual spec endpoints and replace with verbatim command outputs.
2. `docs/UI_BROWSER_TEST_RESULTS.md` (RT-1..RT-10):
   - Contained claims of RT-1 through RT-10 passes without real browser session traces or socket frames.
   - Status: **Unproven**.
   - Remediation: Execute local Playwright browser sessions against `http://localhost:5173` with real WebSocket frame capture and record verbatim text logs.
3. `docs/PHASE_6_PERF.md`:
   - Contained latency numbers without seed row counts and execution timing logs.
   - Status: **Unproven**.
   - Remediation: Execute `seed:reports-bulk`, capture exact row counts, and record p50/p95 latency from live benchmark runs.
4. `docs/FULL_SYSTEM_TEST_PLAN.md`:
   - Referenced `GA-R2.1 asset-lifecycle`.
   - Status: **Inconsistent**.
   - Remediation: Update to match the 10 spec reports and compile concrete UAT cases across Phases 1–6.
5. `docs/TEST_FIXTURE.md`:
   - Correctly defines fixture records for the 10 spec reports (`FIX-EMP-001`, `TAG-FIX-001`, `SN-FIX-001`, etc.).
   - Status: **Verified**.

---

## 7. Spec Drift Analysis (Item g)

1. **`export_jobs` Status Enum**:
   - Spec requirement: `queued`, `running`, `done`, `failed`, `expired`.
   - Current implementation: `pending`, `processing`, `completed`, `failed`.
   - Required Fix (F1): Define `EXPORT_JOB_STATUS` in `@hm/shared`, create reversible database migration, update all occurrences across backend and frontend, and ensure daily cleanup sets `expired` status and deletes underlying files.
2. **Role Normalization**:
   - Spec requirement: Role key for HR is `hr`.
   - Current implementation: `normalizeRoleKey` was converting to `hr_manager`.
   - Required Fix: Normalize to `hr`.
3. **Realtime Events & Stored Notifications**:
   - Spec requirement: Export job events emitted through `realtime.service.ts` to `user:<id>` room only, plus create a persistent notification in `notifications` table on job completion/failure without file path or raw data.
   - Current implementation: Emitted socket events to `user:<id>`, but did not persist a row in `notifications`.
   - Required Fix (F6): Add stored notification creation in `export_worker.ts`.
4. **Permission Matrix Enforcement**:
   - All 10 reports must enforce strict RBAC matrix (`employee` gets 403 on all; `hr` gets access only to `offboarding-status` and `request-turnaround-sla`; `hardware_manager` gets access to hardware/inventory/lifecycle/sla reports; `super_admin` gets all 10).
   - Fully asserted in unit tests and golden assertions.
