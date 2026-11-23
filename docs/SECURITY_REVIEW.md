# Security Review & Vulnerability Assessment Report

**Date**: 2026-11-20  
**Target Monorepo**: `hardware-management` (`apps/api`, `apps/web`, `packages/shared`)  
**Scope**: Authentication, Authorization (IDOR), Transport & Headers, Input/Output Safety, Secrets Management, Audit Logging, Realtime Security  
**Audit Status**: **ALL FINDINGS RESOLVED & VERIFIED**

---

## 1. Vulnerability Findings & Resolutions Summary

| Finding ID | Title / Vulnerability Area                        |  Severity  |  Status   | Evidence & Resolution                                                                                                                                                                                                                                                                                                                 |
| :--------- | :------------------------------------------------ | :--------: | :-------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SEC-01** | **Offboarding Document Download IDOR**            |  **HIGH**  | **FIXED** | Routes `/offboarding/clearance/:id` and `/offboarding/handover-receipt/:id` did not verify if an authenticated non-staff user owned the case. Fixed in `offboarding.service.ts` by asserting `ownEmpId === caseEmpId` or staff role (`super_admin`, `hardware_manager`, `hr`). Automated in `tests/idor_and_rbac_boundaries.test.ts`. |
| **SEC-02** | **Credential Vault Reveal Rate Limiting**         | **MEDIUM** | **FIXED** | While an hourly DB log limit existed, HTTP layer burst protection was missing. Implemented `revealRateLimiter` (20 req/min per IP) in `Middleware/rate_limiter.ts` attached to `/credential/reveal/:id` and `/portal/credential/reveal/:id`.                                                                                          |
| **SEC-03** | **Export Generation Flood Protection**            | **MEDIUM** | **FIXED** | Heavy streaming report generation endpoints could be subject to denial-of-service through rapid concurrent requests. Added `exportRateLimiter` (15 req/min per IP) in `Middleware/rate_limiter.ts` attached to `/reports/export/:key` and `/reports/jobs/download/:id`.                                                               |
| **SEC-04** | **Production Startup Secret Validation**          |  **HIGH**  | **FIXED** | `Config/env.ts` did not fail startup if default development keys or wildcard CORS were left in production. Added Zod `.superRefine` in `Config/env.ts` preventing production boot with default `VAULT_ENCRYPTION_KEY`, dev fixture passwords, or `*` in `CORS_ORIGINS`. Tested in `tests/route_guard_audit.test.ts`.                  |
| **SEC-05** | **Audit Hash Chain Date Serialization**           |  **HIGH**  | **FIXED** | `canonicalJson` in `Utils/hash_chain.ts` did not inspect `Date` instances, producing `{}` during object sorting. Updated `canonicalJson` to serialize `Date` as ISO strings. Verified via `npm run audit:verify` passing across `credential_access_logs` and `activity_logs`.                                                         |
| **SEC-06** | **Container Health & Readiness Endpoints**        | **MEDIUM** | **FIXED** | Container orchestrators lacked standard `/health` (liveness) and `/ready` (DB ping) probes. Implemented in `Config/app.ts` with zero sensitive metadata exposure. Tested in `tests/route_guard_audit.test.ts`.                                                                                                                        |
| **SEC-07** | **Realtime Token Extraction via Query Parameter** |  **HIGH**  | **FIXED** | Handshake query parameter tokens leak into web server logs. Strictly forbidden in `Realtime/auth.ts`: socket connections passing `?token=` are rejected with explicit error. Tested in `tests/realtime_security.test.ts`.                                                                                                             |

---

## 2. Route Guard Audit & Middleware Enforcement (A1)

Automated architectural test `apps/api/tests/route_guard_audit.test.ts` scans the entire Express 5 router stack (256 routes) to ensure zero unprotected endpoints.

### Public Allowlist (Explicitly Permitted Without `userAuth`)

1. `GET /` - Root service ping
2. `GET /health` - Liveness health check
3. `GET /ready` - Database readiness health check
4. `GET /api-docs/*` - OpenAPI / Swagger interactive documentation
5. `POST /user/login` - User authentication (rate-limited via `loginLimiter`)
6. `POST /user/refresh/token` - Token rotation (rate-limited via `loginLimiter`)
7. `POST /user/forgot/password` - Password recovery request (rate-limited via `recoveryLimiter`)
8. `POST /user/forgot/otp/verify` - OTP verification (rate-limited via `recoveryLimiter`)
9. `PUT /user/reset/password` - Password reset confirmation (rate-limited via `recoveryLimiter`)
10. `POST /offboarding/verify-document` - Constant-time public clearance verification (rate-limited via `verifyDocumentRateLimiter`)

### Protected Routes

Every remaining route in the system requires `userAuth` AND `checkAccess` (or strict self-service portal scoping). Unprotected route count: **0**.

---

## 3. IDOR & Access Control Audit (A2)

Verified via automated tests in `apps/api/tests/idor_and_rbac_boundaries.test.ts`:

- **Employees**:
  - Employee cannot access administrative routes (`/employee/list`, `/assets/list`, `/credential/list`, `/offboarding/list`, `/reports/list`). Access rejected with HTTP 403 Forbidden.
  - Employee cannot view, update, cancel, or comment on another employee's request via `/portal/request/*`. Access rejected with HTTP 404 / 403.
  - Employee cannot reveal another employee's credential via `/portal/credential/reveal/:id`. Access rejected with HTTP 403 Forbidden.
  - Employee cannot download another employee's clearance certificate or handover receipt. Access rejected with HTTP 403 Forbidden.
  - Employee cannot download another user's export file via `/reports/jobs/download/:id`. Access rejected with HTTP 403 Forbidden.
- **Hardware Managers & HR**:
  - Hardware Manager cannot reveal credentials without `approve_access: 1` permission.
  - Hardware Manager and HR cannot access Report 9 (`credential-approvals-access`) or Report 10 (`audit-export`). Access rejected with HTTP 403 Forbidden.
  - Hardware Manager and HR cannot modify system roles or permissions. Access rejected with HTTP 403 Forbidden.

---

## 4. Authentication Hardening (A3)

- **JWT Expiry & Rotation**: Short-lived access tokens (`ACCESS_TOKEN_EXPIRES=1h`) paired with refresh token rotation stored in `user_tokens` table.
- **Token Invalidation**: Session revocation deletes hash from `user_tokens`. Realtime socket disconnects immediately via `userSocketsMap`.
- **Account Lockout**: 5 failed consecutive logins triggers a 15-minute account lock (`locked_until`). Account resets counter upon successful authentication.
- **Exited Employees**: Accounts linked to employees with `employment_status = 4` (Exited) are rejected with HTTP 403 during login and disconnected from active sockets.
- **Timing Attacks**: Token hashes verified via SHA-256; document verification codes compared via `crypto.timingSafeEqual` with constant timing.

---

## 5. Transport & Security Headers (A5)

- **Helmet**: Configured on Express application.
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production)
  - `X-Powered-By` disabled (`app.disable('x-powered-by')`).
- **CORS**: Validated from `CORS_ORIGINS` environment variable. Production boot rejects `*` wildcard origin.
- **Request Size**: Limited to 10MB across JSON, urlencoded, and raw text payloads.
- **Error Handling**: `errorHandler` intercepts all uncaught exceptions, logs stack traces to Winston file transport, and returns sanitized generic error JSON (`STATUS_MESSAGES.SERVER_ERROR`) to clients with zero internal leaks.

---

## 6. Secrets & Cryptography (A6)

- **Vault Key Management**: Versioned AES-256-GCM encryption with Additional Authenticated Data (`AAD: id + employee_id`).
- **Key Rotation**: `scripts/vault-rotate.ts` executes atomic re-encryption from previous key versions to `VAULT_KEY_VERSION` with dry-run support.
- **Secret Scan**: Pattern scanner (`scripts/secret-scan.mjs`) verified zero exposed production private keys, AWS tokens, GitHub PATs, or Slack tokens in tracked files.

---

## 7. Logging & Audit Verification (A7)

- **Redaction**: Winston logger and activity logging redact all passwords, secret values, auth tags, IVs, and tokens using `Utils/redaction.ts`.
- **Cryptographic Hash Chain**: Both `credential_access_logs` and `activity_logs` maintain chained SHA-256 hashes linking each record to `prev_hash`.
- **Audit Verification**: `npm run audit:verify` validates 100% of chained entries in the database without tampering.

---

## 8. Realtime Security (A9)

- **Handshake Validation**: Rejects tokens passed in query strings (`socket.handshake.query.token`). Requires Authorization header or auth payload.
- **Payload Size Limit**: `clientEventRateLimiter` enforces 4KB maximum packet size.
- **Client Rate Limiting**: Max 30 client events per 10-second sliding window per socket.
- **Concurrent Connections**: Max 5 active sockets per user (`REALTIME_MAX_SOCKETS_PER_USER`). Excess connections evict oldest socket with `session:revoked` event.

---

## 9. Phase 7 Final Proof Automated Test Evidence (Part B)

| Requirement                      | Test Suite / Script                                 | Results            | Findings & Controls                                                                                                                                                                                   |
| :------------------------------- | :-------------------------------------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1: IDOR Matrix**              | `apps/api/tests/idor_and_rbac_boundaries.test.ts`   | 5/5 PASSED         | Rejects access across requests, comments, credentials, clearance certificates, export jobs. Hardware manager blocked from R9/R10.                                                                     |
| **B2: Auth & Token Security**    | `apps/api/tests/auth_security.test.ts`              | 6/6 PASSED         | Verified JWT expiry, refresh rotation, revoked token rejection, lockout after 5 consecutive failed logins, inactive/disabled user rejection on REST endpoints, refusal of tokens in URL query params. |
| **B3: Input Safety & XSS**       | `apps/api/tests/input_safety.test.ts`               | 5/5 PASSED         | SQLi neutralization in report queries/filters, CSV formula injection sanitization (`=,+,-,@,\t,\r`), path traversal rejection, stored XSS preservation without script execution.                      |
| **B4: Secrets & Vault Rotation** | `apps/api/tests/vault_rotation_and_secrets.test.ts` | 3/3 PASSED         | `vault:rotate` validated end-to-end with v1 -> active re-encryption and reveal capability preserved; production boot rejection of default secrets, fixture passwords, and wildcard CORS.              |
| **B5: Redaction**                | `apps/api/tests/vault_rotation_and_secrets.test.ts` | 3/3 PASSED         | Activity logs, app logs, and CSV exports verified to contain no plaintext passwords, secrets, or JWT tokens.                                                                                          |
| **B6: Secret Scan**              | `scripts/secret-scan.mjs`                           | Clean (0 findings) | Scanned all git tracked files and last 100 git commits; 0 leaked credentials found.                                                                                                                   |
| **B7: Dependency Audit**         | `npm audit --workspaces`                            | 0 High, 0 Critical | 12 moderate vulnerabilities in dev/transitive tools (`esbuild`, `glob`, `minimatch`, `react-router`, `uuid`). Retained pinned to avoid breaking changes.                                              |
