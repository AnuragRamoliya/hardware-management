# Phase 8 Defect & Bug Register

## Severity Classification

- **S1 (Critical)**: Data loss, data corruption, severe security vulnerability (auth bypass, unhashed secrets, privilege escalation, IDOR), server crash / unhandled exception.
- **S2 (Major)**: Core business function completely broken, wrong business calculation, incorrect state transition, concurrency violation (double-claim, double-assignment).
- **S3 (Minor)**: Non-blocking functional defect, minor UX/validation inconsistency with workaround, subtle edge case formatting.
- **S4 (Cosmetic)**: Visual imperfection, minor alignment/typography defect, typo in non-critical copy, cosmetic layout shift.

---

## Metrics Summary

| Severity          | Found | Fixed | Open | Moved to Backlog |
| :---------------- | :---- | :---- | :--- | :--------------- |
| **S1 (Critical)** | 0     | 0     | 0    | 0                |
| **S2 (Major)**    | 5     | 5     | 0    | 0                |
| **S3 (Minor)**    | 0     | 0     | 0    | 0                |
| **S4 (Cosmetic)** | 0     | 0     | 0    | 0                |
| **Total**         | 5     | 5     | 0    | 0                |

---

## Detailed Bug Register

| ID          | Sev | Module                       | Title                                                                                              | Steps to Reproduce                                                                                                                                 | Expected Result                                                 | Actual Result                                                                 | Root Cause                                                                                                                                                                          | Status | Fix Commit | Regression Test                                             |
| :---------- | :-- | :--------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :--------- | :---------------------------------------------------------- |
| **BUG-001** | S2  | Pure Utils / Options Builder | SQL 3VL bug causes records with NULL search fields to disappear from prefix/contains search phases | 1. Create record with null optional search field (e.g. `contact_name: null` on vendor).<br>2. Call options search with prefix query matching name. | Record is returned in prefix search phase.                      | Record omitted because SQL `NOT (col = ?)` evaluates to NULL instead of TRUE. | SQL Three-Valued Logic: `NOT (UNKNOWN)` yields `UNKNOWN` (falsy in WHERE). Fixed with `IS NOT TRUE`.                                                                                | Fixed  | d44d551    | `tests/options_builder_bug001_regression.test.ts`           |
| **BUG-002** | S2  | Credential Vault             | Privacy policy consent fails to persist due to missing `vault_consent_accepted_at` on employee     | 1. Accept consent via `POST /portal/credential/consent`.<br>2. Submit credential via `POST /portal/credential/add`.                                | Consent persists and employee can add credentials.              | Always returns 403 Forbidden because consent status remains false.            | `vault_consent_accepted_at` missing in `employees` schema definition and DB column, causing Sequelize update to drop the field. Added migration & schema definition.                | Fixed  | 1c4321f    | `tests/vault_consent_bug002_regression.test.ts`             |
| **BUG-003** | S2  | Credential Vault             | State machine invariants missing on `reject` and `needsChange` plus invalid column in user query   | 1. Call `reject` or `needsChange` on an already approved/rejected credential.<br>2. Trigger notification to employee without `user_id`.            | Returns 400 Bad Request; doesn't crash with 500.                | Throws 500 SQL error or permits invalid state transition.                     | `reject` and `needsChange` lacked status guard check; `getEmployeeUserId` erroneously queried non-existent `users.employee_id`. Added status guard and corrected foreign key query. | Fixed  | 1c4321f    | `tests/credential_approval_state_bug003_regression.test.ts` |
| **BUG-004** | S2  | Requests Workflow            | Portal request duplicate check blocks different hardware categories due to missing `category_id`   | 1. Submit a `NEW_HARDWARE` request for category A.<br>2. Submit a second `NEW_HARDWARE` request for category B.                                    | Both requests accepted as they target different hardware items. | Second request rejected with 409 Conflict.                                    | `PortalRequestService.add` duplicate guard checked `current_asset_id` and `software_id`, but omitted `category_id` from query criteria. Fixed by adding `dupWhere.category_id`.     | Fixed  | d4cad66    | `tests/request_duplicate_guard_bug004_regression.test.ts`   |
| **BUG-005** | S2  | Authentication Middleware    | `userAuth` middleware fails to hydrate `role` on `req.userInfo`, breaking staff authorization      | 1. Login with staff token (e.g. Super Admin, HR).<br>2. Attempt action requiring staff role check (e.g. `getClearancePdf`).                        | Role name populated on `req.userInfo` and staff checks pass.    | Role is undefined; user treated as non-staff and rejected with 403.           | `userAuth` middleware constructed `req.userInfo` with `id`, `role_id`, `first_name`, `last_name`, `email` but omitted `role` and `role_name`. Fixed by copying role name.           | Fixed  | Pending    | `tests/user_auth_role_bug005_regression.test.ts`            |

---

## Late-Discovered Bug Escape Analysis

| Bug ID   | Severity | Root Cause | Why Previous Gate Missed It | Required Test to Prevent Recurrence |
| :------- | :------- | :--------- | :-------------------------- | :---------------------------------- |
| _(None)_ |          |            |                             |                                     |

---

# Phase 9 Responsive & UI Defect Register

## Severity Classification (UI / Responsive)

- **S1 (Critical)**: Screen or overlay completely unusable on mobile/tablet (e.g. content cut off with no way to scroll, primary submit/action inaccessible, crash on viewport resize, touch targets completely unclickable).
- **S2 (Major)**: Significant layout overflow (horizontal scroll on page), modal exceeding viewport height with hidden action buttons, drawer failing to adapt to full-screen Sheet on mobile, form field labels clipped or obscured, touch target size < 44x44px for primary actions, focus trapped permanently without escape.
- **S3 (Minor)**: Non-blocking visual misalignment, table cards missing secondary column metadata, icon button lacking visible focus ring or accessible name, suboptimal wrap on secondary buttons, minor spacing variance between design system tokens.
- **S4 (Cosmetic)**: Micro-alignment variance (1-2px), subtle theme color contrast edge cases on muted secondary text, cosmetic transition glitch on drawer close.

## UI Defect Summary

| Severity          | Found | Fixed | Open | Moved to Backlog |
| :---------------- | :---- | :---- | :--- | :--------------- |
| **S1 (Critical)** | 0     | 0     | 0    | 0                |
| **S2 (Major)**    | 0     | 0     | 0    | 0                |
| **S3 (Minor)**    | 0     | 0     | 0    | 0                |
| **S4 (Cosmetic)** | 0     | 0     | 0    | 0                |
| **Total**         | 0     | 0     | 0    | 0                |

---

## Detailed UI Defect Register

| ID  | Sev | Module | Component / Selector | Viewport & Browser | Expected Behavior | Actual Behavior | Root Cause | Status | Fix Commit | Regression Test |
| :-- | :-- | :----- | :------------------- | :----------------- | :---------------- | :-------------- | :--------- | :----- | :--------- | :-------------- |
