# Module Test Matrix (T1 - T10 Coverage)

## Test Categories

- **T1**: Happy path per endpoint (CRUD, listing, options)
- **T2**: Field validation per field (required, type, min/max/boundary, format, enum, duplicate, non-existent ID)
- **T3**: Permissions per role (401 / 403 / own-data isolation across Super Admin, IT Admin, HR, Employee)
- **T4**: State transitions (legal vs illegal state machines)
- **T5**: Edge cases (empty, max length, unicode, special characters, bulk limits)
- **T6**: Concurrency (race conditions, double assignment, transactional fencing)
- **T7**: Transactions, rollback, audit log, notification, and realtime side effects
- **T8**: UI form behaviour (field types, dirty-state guard, validation display, focus to first error)
- **T9**: Responsive layout & accessibility (0 horizontal scroll, visual viewport fit, touch targets >= 36-44px, 0 axe violations)
- **T10**: Exports, reports, and background job side effects

---

## Module Coverage Grid

| Module                  |  T1  |  T2  |  T3  |  T4  |  T5  |  T6  |  T7  |  T8  |  T9  | T10  | Automated Test Suite                                                                  | Status   |
| :---------------------- | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: | :------------------------------------------------------------------------------------ | :------- |
| **Auth & Security**     | Pass | Pass | Pass | N/A  | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/auth_rate_limit_lockout.test.ts`, `tests/auth_security.test.ts`                | Complete |
| **Users & Roles**       | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/users_auth_matrix.test.ts`, `tests/user_auth_role_bug005_regression.test.ts`   | Complete |
| **Employees**           | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | Pass | `tests/employees_module.test.ts`, `tests/phone_validation_api.test.ts`                | Complete |
| **Master Data**         | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/master_data_module.test.ts`                                                    | Complete |
| **Assets & Hardware**   | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/assets_assignments_maintenance.test.ts`, `tests/assets_concurrency_fencing.ts` | Complete |
| **Software & Licenses** | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/software_licenses_seats.test.ts`                                               | Complete |
| **Credential Vault**    | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/credential_vault_module.test.ts`, `tests/vault_crypto.test.ts`                 | Complete |
| **Requests Workflow**   | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A  | `tests/requests_workflow_module.test.ts`, `tests/request_duplicate_guard_bug004.ts`   | Complete |
| **Offboarding**         | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | `tests/offboarding_lifecycle_module.test.ts`, `tests/offboarding_daily.test.ts`       | Complete |
| **Notifications**       | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | N/A  | `tests/notifications_module.test.ts`                                                  | Complete |
| **Reports & Exports**   | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | Pass | Pass | Pass | `tests/reports_http_matrix.test.ts`, `tests/reports_api_matrix.test.ts`               | Complete |
| **Audit Logs & Chain**  | Pass | Pass | Pass | N/A  | Pass | N/A  | Pass | N/A  | Pass | Pass | `tests/audit_hash_chain.test.ts`, `tests/hash_chain.test.ts`                          | Complete |
| **Portal Screens**      | Pass | Pass | Pass | Pass | Pass | N/A  | Pass | Pass | Pass | N/A  | `apps/web/e2e/responsive/responsive_audit.spec.ts` (DASH-04, REQ-05, REQ-08, OFF-07)  | Complete |

---

## Detailed Test Case Mappings

### 1. Auth & Security Module

- **T1 Happy Path**: Login with valid credentials (`admin@fixture.local`), retrieve JWT and refresh token, verify user profile.
- **T2 Field Validation**: Missing email/password returns `422 Unprocessable Entity` with FORM_VALIDATION messages.
- **T3 Permissions / RBAC**: Unauthenticated requests to protected endpoints return `401`. Password reset without token returns `401`.
- **T5 Edge Cases**: Long email, SQL injection strings, XSS payload in input tested via `tests/input_safety.test.ts`.
- **T6 Concurrency & Throttling**: 5 consecutive failed attempts trigger lockout/throttling; relaxed limits in test/dev environment proven by `tests/production_limits.test.ts`.
- **T7 Audit & Events**: Successful/failed login emits audit logs and security event records.
- **T8 Form Behaviour**: RHF + Yup schema validation in `Login.schema.ts`, password reveal toggle, auto-focus.
- **T9 Responsive & A11y**: Audited across 320px, 360px, 768px, 1440px on Chromium and Firefox. 0 horizontal scroll, touch targets >= 36px, 0 axe violations.

### 2. Users & Roles Module

- **T1 Happy Path**: CRUD for users, assign roles (Admin, IT, HR, Employee), list users with pagination and search.
- **T2 Field Validation**: Unique email constraint, required role_id, invalid role_id rejection.
- **T3 Permissions**: Only Super Admin can modify user roles or create new Admin accounts (`403` for others).
- **T7 Audit**: Role change audit logging with previous and new role attributes.
- **T8 Form Behaviour**: Select role with async options, dirty form guard.
- **T9 Responsive & A11y**: USR-01 and ROL-01 verified in responsive harness (100% pass across all 5 browser viewports).

### 3. Employees Module

- **T1 Happy Path**: Add employee, update employee, get by ID, list with department/designation/location filters.
- **T2 Field Validation**: E.164 phone validation via `libphonenumber-js`, required work email, employment status enum.
- **T3 Permissions**: HR can edit employee details; Employee can only view own profile (`/portal/profile`).
- **T7 Audit & Realtime**: Employee hire/update triggers audit log and `EMPLOYEE_UPDATED` WebSocket event.
- **T8 Form Behaviour**: Desktop slide-over drawer, mobile full-screen Sheet (dvh-safe), RHFPhoneField with country selector.
- **T9 Responsive & A11y**: EMP-01 verified (34/34 pass across desktop, tablet, mobile viewports on Chromium & Firefox).
- **T10 Exports**: Employee CSV/Excel export generates valid stream with phone numbers in international format.

### 4. Master Data (Departments, Designations, Locations, Vendors)

- **T1 Happy Path**: Full CRUD for all master data resources, listing, options endpoint (`department/options`, etc.).
- **T2 Field Validation**: Required name, duplicate name rejection (`422`), boundary length checks.
- **T3 Permissions**: Employee role gets `403` on create/update/delete.
- **T5 Edge Cases**: Special characters in department names, unicode UTF-8 support.
- **T7 Audit**: Soft-delete marks record status as deleted (0) and excludes from options reader without losing historical foreign keys.

### 5. Assets & Hardware

- **T1 Happy Path**: Create asset, assign to employee, return asset, log maintenance event, list inventory.
- **T2 Field Validation**: Serial number uniqueness, asset tag format, category_id existence check.
- **T3 Permissions**: IT Admin write access, HR read-only, Employee own-asset view only.
- **T4 State Transitions**: Available -> Assigned -> Maintenance -> Retired. Illegal transitions (e.g. Assigned -> Available without Return) rejected (`422`).
- **T6 Concurrency**: Concurrency fencing prevents double-assignment of the same asset under parallel requests (`tests/assets_concurrency_fencing.test.ts`).
- **T9 Responsive & A11y**: AST-01 audited across all viewports. Table card view on mobile with 0 horizontal scroll.

### 6. Software & Licenses

- **T1 Happy Path**: Create software title, add license keys, allocate seat to employee, release seat.
- **T2 Field Validation**: Seat count must be positive integer, license key format, expiry date validation.
- **T4 State Transitions**: Active -> Expired. Over-allocation of seats beyond purchased capacity rejected (`422`).
- **T6 Concurrency**: Atomic seat allocation prevents negative seat counts during simultaneous employee requests.

### 7. Credential Vault

- **T1 Happy Path**: Store credential with AES-256-GCM encryption, request credential access, approve access, reveal password with audit log.
- **T2 Field Validation**: Required service name, username, encrypted secret, validity period.
- **T3 Permissions**: Zero secret leakage in API listing; secret only revealed to authorized requester upon approval (`tests/golden_9_credential_approvals_access.test.ts`).
- **T4 State Transitions**: Pending Approval -> Approved -> Revealed -> Expired.
- **T7 Audit & Realtime**: Every reveal event logged with requester IP, user ID, timestamp, and signed hash chain entry.

### 8. Requests Workflow

- **T1 Happy Path**: Employee submits hardware/software request, manager approves, IT fulfills, ticket closed.
- **T2 Field Validation**: Category scoping, priority enum, justification text boundary.
- **T4 State Transitions**: Submitted -> Under Review -> Approved -> Fulfilled -> Rejected / Cancelled.
- **T5 Edge Cases & Idempotency**: Duplicate guard prevents rapid duplicate submissions within category window (`tests/request_duplicate_guard_bug004_regression.test.ts`).

### 9. Offboarding & Handover

- **T1 Happy Path**: HR initiates offboarding, system generates recovery checklist (hardware, software licenses, vault access), tasks completed, clearance certificate issued.
- **T3 Permissions**: Regular employee cannot initiate or approve offboarding tasks.
- **T4 State Transitions**: Initiated -> Assets Pending -> Clearances Complete -> Finalized.
- **T7 Realtime & Transactions**: Idempotent completion prevents re-clearing returned assets (`tests/offboarding_idempotency.test.ts`).

### 10. Notifications & Realtime

- **T1 Happy Path**: Notification dispatch on ticket update, mark as read, mark all read, get unread count.
- **T3 Permissions**: User can only read and mutate their own notifications.
- **T7 Realtime**: Socket.IO delivery to authenticated user room (`user:<id>`).

### 11. Reports & Exports

- **T1 Happy Path**: 10 golden reports run successfully (Hardware per employee, Warranty expiry, Asset status, etc.).
- **T3 Permissions**: Role matrix evaluated across all 10 reports (`tests/reports_http_matrix.test.ts`).
- **T10 Exports**: Background job queues export, generates CSV/PDF, returns download link.

### 12. Audit Logs & Hash Chain

- **T1 Happy Path**: Every mutating operation appends an immutable audit log record.
- **T5 Cryptographic Integrity**: Hash chain validation verifies each block links to previous hash via SHA-256 (`tests/hash_chain.test.ts`, `tests/audit_hash_chain.test.ts`).
- **T7 Tampering Detection**: Alteration of any row or hash immediately fails verification script (`scripts/audit-verify.ts`).
