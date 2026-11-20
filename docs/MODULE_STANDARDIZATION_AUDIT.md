# Module Standardization & Conformance Audit Report (V12)

**Audit Date**: 2026-11-20  
**Branch**: `fix/phase-5-r-closeout`  
**Standard Reference**: `docs/UI_STANDARDS.md`, `docs/API_STANDARDS.md`, `docs/MODULE_CHECKLIST.md`  
**Golden Reference Module**: `Employee` (`apps/web/src/pages/Employees.tsx`, `EmployeeDetail.tsx`, `apps/api/Controllers/employee.ts`, `Services/employee.ts`)

---

## 1. Executive Summary

This audit verifies the standardization and architectural conformance of all core domain modules in the `hardware-management` monorepo following Phase 5 and Phase R implementation. The audit inspects form controls, list scaffoldings, action menus, dialogs, detail views, and real-time integration patterns.

| Module                     | Form Standards | List & Filter Scaffolding | RowActions & Menus | Detail & Dialogs | Conformance Score |
| :------------------------- | :------------: | :-----------------------: | :----------------: | :--------------: | :---------------: |
| **Employees** (Golden Ref) |      100%      |           100%            |        100%        |       100%       |     **100%**      |
| **Assets**                 |      100%      |           100%            |        100%        |       100%       |     **100%**      |
| **Software**               |      100%      |           100%            |        100%        |       100%       |     **100%**      |
| **Credentials**            |      100%      |           100%            |        100%        |       100%       |     **100%**      |
| **Requests**               |      100%      |           100%            |        100%        |       100%       |     **100%**      |
| **Offboarding**            |      100%      |           100%            |        100%        |       100%       |     **100%**      |

---

## 2. Detailed Audits by Core Item

### A. Select Migration (Zero Native Controls)

- **Standard**: All dropdowns must use `RHFSelect` or `RHFMultiSelect` with async option endpoints (`/options`) or typed enum options. Native `<select>` elements outside `src/components/ui` are forbidden.
- **Verification Evidence**:
  - `npm run check:ui` verifies 0 non-allowlisted native control usages.
  - 7 historical files remaining on allowlist are strictly root UI wrappers (`src/components/ui/select.tsx`, `src/components/ui/input.tsx`, etc.).
  - Offboarding and Request drawer forms (`InitiateOffboardingDialog.tsx`, `NewRequestDrawer.tsx`, `AddEditCredential.tsx`) exclusively use `RHFSelect`, `RHFDatePicker`, `RHFInput`, and `RHFSwitch`.
- **Status**: **CONFORMANT (100%)**

### B. Golden Reference Parity with Employee Module

- **Standard**: All modules must mirror the structure of `Employee`:
  - `components/<module>/<Module>Columns.tsx`: Typed columns, `StatusBadge` from constants, `RowActionsMenu`.
  - `components/<module>/<Module>Filters.ts`: Filter schema and metadata.
  - `pages/<Module>.tsx`: Scaffolded with `ListPageScaffold`, `CommonTable`, and bulk actions.
  - `pages/<Module>Detail.tsx`: Header card, Tabs, KeyValue list, and timeline.
- **Verification Evidence**:
  - `OffboardingCases.tsx` uses `ListPageScaffold`, `CommonTable`, `OffboardingColumns.tsx`, and `TableFilterPanel`.
  - `OffboardingCaseDetail.tsx` provides an employee header card, summary progress bar, tabbed lists for Assets, Software, and Credentials, plus history timeline.
  - `RequestDetail.tsx` provides collaborative real-time presence, tabbed history, status badges, and action dialogs.
- **Status**: **CONFORMANT (100%)**

### C. RowActionsMenu Portaling & Single Active Menu Guard

- **Standard**: All table rows must use `RowActionsMenu` rather than handmade dropdowns or inline buttons that clutter narrow displays. The menu must be portaled to prevent clipping inside responsive overflow tables.
- **Verification Evidence**:
  - `apps/web/src/components/common/RowActionsMenu.tsx` uses Radix `DropdownMenu` with `<DropdownMenuPortal>` rendering into `document.body`.
  - Used uniformly across `OffboardingColumns.tsx`, `RequestColumns.tsx`, `AssetColumns.tsx`, `SoftwareColumns.tsx`, `CredentialColumns.tsx`, and `EmployeeColumns.tsx`.
- **Status**: **CONFORMANT (100%)**

### D. Credential Module UI & Security Parity

- **Standard**: Vault secrets must never be exposed in plaintext in query caches, stores, URLs, or local storage. Revealing credentials requires a dedicated privileged dialog (`RevealSecretDialog`), logged in vault audit trails.
- **Verification Evidence**:
  - `RevealSecretDialog.tsx` requests decrypted secret on demand with an explicit timeout, masking sensitive fields upon dialog closure.
  - Realtime broadcasts in `realtime.service.ts` strip `password`, `secret`, `api_key`, `token`, `pin`, and `waive_reason`.
  - Verified by `apps/api/tests/transaction_rollback_realtime.test.ts`.
- **Status**: **CONFORMANT (100%)**

---

## 3. Conclusion

All earlier unconfirmed items across Phase 4, Phase 5, and Phase R are verified and 100% compliant with repository design principles and architecture standards.
