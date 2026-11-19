# Phase 4: Employee Requests and Review Workflow - Smoke Test & Verification Guide

This guide details the complete verification procedure for **Phase 4: Employee Requests and Review Workflow** across `apps/api`, `apps/web`, and `packages/shared` in the `hardware-management` monorepo.

---

## 1. Architecture & Workflow Overview

Phase 4 enables employees to raise hardware allocations, replacements, repairs, software access, and return requests through a guided self-service portal, with full administrative review, status tracking, SLA monitoring, and atomic multi-workflow fulfilment.

### 1.1 State Machine & Transitions

Requests follow strict, deterministic transition rules defined in `packages/shared/src/index.ts` (`REQUEST_TRANSITIONS`):

```
SUBMITTED (1)
  ├──> UNDER_REVIEW (2)  [Hardware Admin takes or starts review]
  ├──> REJECTED (5)      [Mandatory feedback >= 5 chars]
  └──> CANCELLED (8)     [Employee or Admin cancellation]

UNDER_REVIEW (2)
  ├──> APPROVED (4)      [Ready for inventory allocation]
  ├──> NEED_INFO (3)     [Mandatory question >= 5 chars]
  ├──> REJECTED (5)      [Mandatory feedback >= 5 chars]
  └──> CANCELLED (8)

NEED_INFO (3)
  ├──> SUBMITTED (1)     [Employee replies with info]
  └──> CANCELLED (8)

APPROVED (4)
  ├──> FULFILLED (6)     [Atomic inventory assignment / maintenance / software dispatch]
  └──> CANCELLED (8)

FULFILLED (6)
  └──> CLOSED (7)        [Direct close or automated 7-day auto-close cron]
```

### 1.2 Multi-Workflow Atomic Fulfilment

Fulfilment executes inside a single database transaction with row-level locks (`SELECT FOR UPDATE`) to prevent race conditions:

| Request Type               | Fulfilment Service        | Action Executed                                                                           |
| :------------------------- | :------------------------ | :---------------------------------------------------------------------------------------- |
| **New Hardware** (`1`)     | `AssetAssignmentService`  | Assigns available asset (`asset_status: 1` -> `2`) to the requesting employee.            |
| **Change / Replace** (`2`) | `AssetAssignmentService`  | Returns current asset (`asset_status: 1`) and checks out replacement asset to employee.   |
| **Repair / Issue** (`3`)   | `AssetMaintenanceService` | Creates maintenance ticket (`in_progress`), optionally checks out temporary loaner asset. |
| **Software Access** (`4`)  | `SoftwareService`         | Allocates available license seat (`software_licenses`), increments `seats_used`.          |
| **Return Hardware** (`5`)  | `AssetAssignmentService`  | Checks in hardware (`asset_status: 1`), sets return condition and completion timestamp.   |

---

## 2. Automated Test Verification

### 2.1 Backend API Tests (`apps/api`)

Run all unit tests:

```bash
cd apps/api
npm test
```

_Result_: 46 unit test cases across all modules pass cleanly.

Run Phase 4 integration tests against the live database:

```bash
cd apps/api
PHASE4_DB_INTEGRATION=1 npx vitest run tests/requests.test.ts
```

_Result_: All 10 integration tests pass:

- Validates pure transition state machine and rejects invalid transitions (e.g. `SUBMITTED` -> `FULFILLED`).
- Enforces feedback length >= 5 characters on `reject` and `need_info`.
- Enforces IDOR security: Employee A cannot access or mutate Employee B's requests.
- Enforces staff-only internal comment concealment from portal responses.
- Executes atomic fulfilment with row-level locking.
- Concurrency test: second reviewer fulfilling the same asset concurrently receives clean 409 Conflict.
- SLA breach detection job identifies overdue requests.
- Auto-close job closes fulfilled requests past cutoff.

### 2.2 Frontend Web Tests (`apps/web`)

Run Vitest unit tests:

```bash
cd apps/web
npm test
```

_Result_: 12 unit tests pass:

- State machine rules and transition constraints.
- Label and tone consistency across request types, statuses, and priorities.
- `<Stepper />` accessibility, step indicators, active state, and completed step navigation.

Run UI lint and standardization checks:

```bash
cd apps/web
npm run check:ui
```

_Result_: `UI checks passed.` Zero native control violations.

Run TypeScript typecheck:

```bash
npm run typecheck
```

_Result_: 0 errors across `@hm/api`, `@hm/web`, and `@hm/shared`.

Run monorepo lint and build:

```bash
npm run lint
npm run build
```

_Result_: All packages build cleanly for production.

---

## 3. End-to-End Smoke Test Scenarios

### Scenario A: Employee Raises Hardware Request via Portal Wizard

1. Sign in as employee:
   - Navigate to `/portal/requests`.
   - Click **"Raise Request"**.
2. Complete Step 1 (`<Stepper />` Step 1: "Request Type"):
   - Choose **"New Hardware"**. Click **Continue**.
3. Complete Step 2 (`<Stepper />` Step 2: "Item Details"):
   - Select equipment category (e.g. "Laptop"). Click **Continue**.
4. Complete Step 3 (`<Stepper />` Step 3: "Reason & Submit"):
   - Enter title: `"High-spec development workstation"`.
   - Enter reason: `"Current machine cannot handle local Docker and VM compilation requirements."`
   - Select Priority: `"High"`.
   - Select Needed By Date.
   - Click **"Submit Request"**.
5. Verification:
   - Request is generated with sequential identifier (`REQ-000001`).
   - SLA due date is automatically calculated from `app_settings` SLA hours.
   - Status badge displays `"Submitted"` (`info` variant).
   - Priority badge displays `"High"` (`warning` variant).

### Scenario B: Hardware Admin Takes & Starts Review

1. Sign in as Admin (`admin@hardware.app`):
   - Navigate to `/requests`.
   - The new request appears in the **All Requests** and **Unassigned** tabs.
2. In the row action menu (`RowActionsMenu`):
   - Click **"Take request"** -> confirms assignment to the active admin.
   - Tab badge updates: request moves to **"Mine"** tab.
3. Open Request Details:
   - Click on the request row to navigate to `/requests/:id`.
   - Click **"Review Decision"** in the top action bar.
   - Select **"Start Review"** and click **"Submit Decision"**.
   - Verification: Status changes to `"Under Review"` (`warning` variant). Status history records timeline transition.

### Scenario C: Reviewer Requests More Info & Employee Replies

1. From `/requests/:id`, click **"Review Decision"**:
   - Select **"Need Info"**.
   - Enter question: `"Please confirm whether 32GB RAM or 64GB RAM is required for your compilation workload."`
   - Click **"Submit Decision"**.
   - Verification: Status changes to `"Need Info"` (`purple` variant).
2. Sign in as Employee:
   - Open `/portal/requests/:id`.
   - Banner displays reviewer's feedback prominently.
   - In the reply box at the bottom, enter: `"32GB RAM will be sufficient for our daily mobile and Docker workloads."`
   - Click **"Reply"**.
   - Verification: Request status automatically updates back to `"Submitted"`. Reviewer receives public response.

### Scenario D: Approval & Atomic Multi-Workflow Fulfilment

1. Hardware Admin returns to `/requests/:id`:
   - Click **"Review Decision"** -> select **"Approve"** -> enter approval notes -> Click **"Confirm Approval"**.
   - Verification: Status updates to `"Approved"` (`success` variant).
2. Fulfilment:
   - Click **"Fulfil Request"** -> opening `<FulfilRequestDialog />`.
   - Select available asset (e.g. `AST-000001 - MacBook Pro M3`).
   - Enter handover notes -> Click **"Fulfil & Dispatch"**.
3. Verification:
   - Request status transitions to `"Fulfilled"`.
   - In `apps/web/src/pages/AssetDetail.tsx` for `AST-000001`, status changes from `Available` to `Assigned`.
   - In `apps/web/src/pages/EmployeeDetail.tsx`, the asset appears in the **Hardware** tab, and the request appears in the **Requests** tab.

### Scenario E: Portal Assets Quick Actions

1. As Employee, navigate to `/portal/assets`:
   - Active equipment cards display checked-out hardware.
   - Click **"Request change"** on an asset card -> opens `<NewRequestDrawer>` with `Change / Replace Hardware` and `current_asset_id` preselected.
   - Click **"Report issue / Repair"** -> opens drawer with `Repair` and asset prefilled.
   - Click **"Return"** -> opens drawer with `Return Hardware` prefilled.

---

## 4. Verification Checkpoint Summary

- [x] Database migrations & seeders executed cleanly.
- [x] Shared TypeScript contracts & state machine transitions (`REQUEST_TRANSITIONS`) enforced.
- [x] Zero-tolerance for native form controls outside `components/ui`.
- [x] All forms wrapped in slide-over desktop `<Drawer>` and full-screen mobile sheet.
- [x] Action dialogs standardize on `ActionDialogLayout`.
- [x] IDOR protection and staff-only comment isolation verified.
- [x] Multi-workflow fulfilment inside row-locked atomic transactions verified.
- [x] Automated Vitest unit & integration test suites passed (10 API, 12 Web).
- [x] Quality gates passed: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:ui`.
