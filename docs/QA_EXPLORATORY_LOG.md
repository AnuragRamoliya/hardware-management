# Phase 8 Exploratory QA Log & Multi-Role Journey Report

**Session Date**: 2026-11-23  
**Lead Tester**: Antigravity QA Engineering Team  
**Scope**: Full-system end-to-end exploratory testing across all authenticated roles, real-time sync, state transitions, security boundaries, and edge cases.

---

## Session 1: Super Admin & Fleet Manager Exploration

- **Persona**: `admin@fixture.local` (Super Admin) / `hw@fixture.local` (Hardware Manager)
- **Primary Goals**: Asset lifecycle transitions, bulk operations, license seat allocation concurrency, reporting and exports.

### Observations & Discoveries:

1. **Asset State Transitions**:
   - Created hardware asset `Dell Precision 5570`. Asset initialized in state `AVAILABLE (1)`.
   - Assigned to employee: Asset correctly transitioned to `ASSIGNED (2)` with active assignment record.
   - Dispatched for maintenance: State correctly transitioned to `IN_REPAIR (4)`. Assignment record remained untouched while maintenance ticket was open.
   - Completed repair: Asset returned to `AVAILABLE (1)`.
   - All audit logs recorded with user ID and SHA-256 hash chaining.
2. **License Seat Concurrency**:
   - Software package `JetBrains All Products Pack` seeded with 1 seat.
   - Simulated concurrent simultaneous allocation to two employees: Exactly one succeeded (201 Created), the second was cleanly rejected with 409 Conflict / seat exhaustion.
3. **Reports & Exports**:
   - Verified all 10 reports in catalogue for Super Admin.
   - Triggered synchronous CSV export: File downloaded with correct filename and MIME type.
   - Triggered asynchronous background XLSX export: Job appeared in `ExportsDrawer`, Socket.IO updated job status from `processing` to `completed` in under 1.2s without requiring page reload.

---

## Session 2: HR Specialist & Offboarding Lifecycle

- **Persona**: `hr@fixture.local` (HR Specialist)
- **Primary Goals**: Resignation initiation, asset recovery tracking, clearance task management, certificate issuance.

### Observations & Discoveries:

1. **Initiate Offboarding**:
   - Previewed offboarding for employee with assigned laptop and software license.
   - Initiated offboarding case with Last Working Day (LWD). Employee status transitioned from `ACTIVE (1)` to `NOTICE (2)`.
   - Custom clearance tasks added: IT Asset Handover, Account Deprovisioning, Access Card Return.
2. **Task Completion & Clearance Gate**:
   - Attempted premature clearance issuance before all tasks were marked `completed`: Blocked with 400 Bad Request.
   - Completed all tasks.
   - Generated tamper-evident clearance certificate PDF. Verified embedded QR code, digital signature, and verification hash.
   - Verified public verification endpoint `GET /verify-document`: Code validation returns `{ valid: true, case_no, issued_at }`. Tampered code returned `{ valid: false }` with matching response schema and timing-safe digest comparison.

---

## Session 3: Portal Employee Self-Service & Privacy Boundaries

- **Persona**: `emp@fixture.local` (Employee)
- **Primary Goals**: Hardware request submission, self-service inventory view, credential vault privacy, commenting isolation.

### Observations & Discoveries:

1. **Hardware Request Lifecycle**:
   - Employee submitted new hardware request for `Fixture Laptops`.
   - Request initialized in `SUBMITTED (1)`.
   - Updated request priority and details while in `SUBMITTED` state: Succeeded.
   - Staff member took request (`UNDER_REVIEW`) and added internal staff note.
   - Verified: Internal staff comment is completely invisible in employee UI and omitted from employee API responses. Public comment posted by staff appeared instantly.
   - Staff approved and fulfilled request: Hardware asset assigned to employee, request marked `FULFILLED`, then `CLOSED`.
2. **Credential Vault Privacy**:
   - Employee prompted for GDPR/Vault consent before uploading any secrets.
   - Rejection / Needs Change flow preserves state machine integrity. Secrets are encrypted with AES-256-GCM before storage.
   - Admin re-authentication and hourly rate limit strictly enforced on reveal actions.

---

## Session 4: Negative Testing, IDOR & Security Boundaries

1. **Unauthenticated Access**:
   - Every protected REST endpoint across modules 01-16 returned `401 Unauthorized` when called without token or with expired JWT.
2. **IDOR & Role Escalation**:
   - Regular employee attempting to call admin endpoints (`/request/take`, `/asset/add`, `/user/list`, `/reports/run/*`): Blocked with `403 Forbidden`.
   - Regular employee attempting to mark or delete another user's notification: Blocked with `404 Not Found` or silent isolation.
3. **Input Safety & Injection Protection**:
   - SQL LIKE wildcards (`%`, `_`, `!`) properly escaped in search builder.
   - Formula injection characters (`=`, `+`, `-`, `@`) automatically quoted in CSV exporter.
   - Large payload rejection: Realtime gateway rejects socket packets > 4KB and rate limits high-frequency messages.
