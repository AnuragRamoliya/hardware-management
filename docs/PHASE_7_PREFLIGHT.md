# Phase 7 Pre-Flight Inventory & Baseline Findings

**Date**: 2026-11-20  
**Branch**: `feature/phase-7-release`  
**Base Commit**: `63dffc4` (`feat(reports): complete Phase 6 closeout verification, test suites, and documentation`)  
**Standard**: `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/API_STANDARDS.md`, `docs/UI_STANDARDS.md`

---

## 1. Baseline Quality Gate Output

Executed on branch `feature/phase-7-release` at base commit `63dffc4`:

| Check                  | Command                           | Result / Real Numbers                                                 |  Status  |
| :--------------------- | :-------------------------------- | :-------------------------------------------------------------------- | :------: |
| **Lint**               | `turbo run lint`                  | 0 errors, 0 warnings across all 5 packages in scope                   | **PASS** |
| **Typecheck**          | `turbo run typecheck`             | 0 errors across `@hm/shared`, `@hm/api`, `@hm/web`, `@hm/tsconfig`    | **PASS** |
| **UI Control Ast**     | `npm run check:ui`                | 0 non-allowlisted native controls (7 reviewed foundation files)       | **PASS** |
| **Shared Unit Tests**  | `npm test --workspace=@hm/shared` | 10 passed, 0 failed                                                   | **PASS** |
| **API Vitest Suite**   | `npm test --workspace=@hm/api`    | 25 test files: 75 passed, 1 skipped (options perf bench)              | **PASS** |
| **Web Vitest Suite**   | `npm test --workspace=@hm/web`    | 5 test files: 15 passed, 0 failed                                     | **PASS** |
| **Spec Fixture Suite** | `npm run test:all-fixture`        | 138 checks passed, 0 failed (R1–R10, RBAC, hash chains)               | **PASS** |
| **Monorepo Build**     | `turbo run build`                 | Built `@hm/shared` (tsup), `@hm/api` (tsc), `@hm/web` (vite) in 34.3s | **PASS** |
| **Playwright & Axe**   | `npx playwright test`             | 18 passed in 17.0s (360px & 1440px, light & dark, 0 a11y violations)  | **PASS** |

---

## 2. Docker & CI/CD Files Inventory

| Path                                | Purpose / Description                                   | Status / Gap Analysis                                                                 |
| :---------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------ |
| `docker/api.Dockerfile`             | Multi-stage builder & production runner for Node.js API | Production non-root nodejs user; needs healthcheck & tini entrypoint                  |
| `docker/web.Dockerfile`             | Multi-stage Vite build and Nginx 1.27 production server | SPA routing fallback; needs security headers and gzip configuration                   |
| `docker-compose.yml`                | Multi-container orchestration (MySQL 8.4, API, Web)     | Healthchecks configured for MySQL; needs one-shot migrate service                     |
| `docker-compose.dev.yml`            | Local developer compose configuration                   | MySQL service on port 3306 with volumes                                               |
| `.github/workflows/ci.yml`          | GitHub Actions CI pipeline                              | Runs gitleaks, lint, typecheck, build, Playwright; needs complete service integration |
| `.github/workflows/visual-a11y.yml` | Accessibility and visual regression action              | Playwright workflow                                                                   |
| `.dockerignore`                     | Build context exclusions                                | Needs complete coverage (`node_modules`, `.git`, `dist`, `.env`)                      |

---

## 3. Environment Variables Inventory

### API (`apps/api`) - Managed via `Config/env.ts` (Zod Schema Validation)

| Variable                        | Type / Format                       | Default                            | Required in Production | Description                                       |
| :------------------------------ | :---------------------------------- | :--------------------------------- | :--------------------: | :------------------------------------------------ |
| `PORT`                          | Integer                             | `8000`                             |        Optional        | HTTP listening port for Express server            |
| `NODE_ENV`                      | `development \| test \| production` | `development`                      |      **Required**      | Application runtime environment                   |
| `DB_USERNAME`                   | String                              | -                                  |      **Required**      | MySQL database username                           |
| `DB_PASSWORD`                   | String                              | `""`                               |      **Required**      | MySQL database password                           |
| `DB_HOST`                       | String                              | -                                  |      **Required**      | MySQL database host / hostname                    |
| `DB_PORT`                       | Integer                             | `3306`                             |        Optional        | MySQL database port                               |
| `DB_DATABASE`                   | String                              | -                                  |      **Required**      | MySQL database schema name                        |
| `DB_CONNECTION`                 | Literal `'mysql'`                   | `'mysql'`                          |        Optional        | Sequelize dialect                                 |
| `DB_LOGGING`                    | Boolean                             | `false`                            |        Optional        | Enables raw SQL query logging                     |
| `SECRET_KEY`                    | String (>=32 chars)                 | -                                  |      **Required**      | HMAC SHA-256 JWT signing secret key               |
| `ACCESS_TOKEN_EXPIRES`          | Duration (`1h`, `15m`, etc.)        | `'1h'`                             |        Optional        | JWT access token validity period                  |
| `REFRESH_TOKEN_EXPIRES`         | Duration (`7d`, `30d`, etc.)        | `'7d'`                             |        Optional        | JWT refresh token validity period                 |
| `CORS_ORIGINS`                  | Comma-separated URLs                | -                                  |      **Required**      | Allowed origins for HTTP and Socket.IO            |
| `ENCRYPTION_SECRET`             | String (>=1 char)                   | -                                  |      **Required**      | AES encryption secret for client payload crypto   |
| `VAULT_ENCRYPTION_KEY`          | 32-byte string                      | `12345678901234567890123456789012` | **Required (custom)**  | Active AES-256-GCM vault encryption key           |
| `VAULT_ENCRYPTION_KEYS`         | JSON / versioned map                | `""`                               |        Optional        | Key rotation registry `{"1":"key1","2":"key2"}`   |
| `VAULT_KEY_VERSION`             | String                              | `'1'`                              |        Optional        | Active key version identifier for new secrets     |
| `SUPER_ADMIN_EMAIL`             | Email                               | -                                  |      **Required**      | Bootstrap Super Administrator email address       |
| `SUPER_ADMIN_PASSWORD`          | String (>=12 chars)                 | -                                  |      **Required**      | Bootstrap Super Administrator initial password    |
| `TZ`                            | String (Timezone)                   | `'UTC'`                            |        Optional        | System runtime timezone                           |
| `APP_TIMEZONE`                  | String (Timezone)                   | `'Asia/Kolkata'`                   |        Optional        | Reporting and display boundary timezone           |
| `REALTIME_ENABLED`              | Boolean                             | `true`                             |        Optional        | Socket.IO server toggle                           |
| `REALTIME_PATH`                 | String                              | `'/realtime'`                      |        Optional        | Socket.IO connection path                         |
| `REALTIME_REDIS_URL`            | Redis URI                           | `""`                               |        Optional        | Redis adapter for multi-instance clustering       |
| `REALTIME_MAX_SOCKETS_PER_USER` | Integer                             | `5`                                |        Optional        | Max concurrent connections per authenticated user |

### Web (`apps/web`) - Vite Client Environment

| Variable        | Type | Default                 | Description                                       |
| :-------------- | :--- | :---------------------- | :------------------------------------------------ |
| `VITE_HOST_API` | URL  | `http://localhost:8000` | Backend API base URL for axios client and sockets |

---

## 4. Scheduled Jobs Inventory (`apps/api/Jobs/`)

| Job Name                   | Schedule                     | Implementation              | Purpose & Idempotency Guarantee                                                           |
| :------------------------- | :--------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------- |
| `exportWorker`             | Polling Loop (1s)            | `Reports/export_worker.ts`  | Polls `export_jobs` table for `queued` status, generates file, updates to `done`/`failed` |
| `runSlaCheck`              | Hourly (`0 * * * *`)         | `Jobs/request_sla.ts`       | Identifies open requests exceeding SLA turnaround time; flags breached status             |
| `runExpiryAlerts`          | Daily Midnight (`0 0 * * *`) | `Services/notification.ts`  | Checks asset warranty and software license renewals; dispatches notifications             |
| `runCredentialVaultJobs`   | Daily Midnight (`0 0 * * *`) | `Services/notification.ts`  | Alerts on expired credentials or upcoming password change rotations                       |
| `runNeedInfoReminders`     | Daily Midnight (`0 0 * * *`) | `Jobs/request_sla.ts`       | Sends reminders to users on tickets in `need_info` state                                  |
| `runAutoCloseFulfilled`    | Daily Midnight (`0 0 * * *`) | `Jobs/request_sla.ts`       | Auto-closes fulfilled tickets older than 7 days with no user response                     |
| `runOffboardingReminders`  | Daily Midnight (`0 0 * * *`) | `Jobs/offboarding_daily.ts` | Notifies managers and employees of upcoming last working days (LWD)                       |
| `runLwdProcessing`         | Daily Midnight (`0 0 * * *`) | `Jobs/offboarding_daily.ts` | Auto-suspends accounts or revokes credentials on LWD if configured                        |
| `runOverdueCheck`          | Daily Midnight (`0 0 * * *`) | `Jobs/offboarding_daily.ts` | Flags unreturned assets past LWD as `EXCEPTION`                                           |
| `runPendingClearanceCheck` | Daily Midnight (`0 0 * * *`) | `Jobs/offboarding_daily.ts` | Checks cases ready for final HR signoff and clearance PDF generation                      |
| `cleanupExpiredExports`    | Daily Midnight (`0 0 * * *`) | `Reports/export_worker.ts`  | Deletes generated files past retention period; transitions status to `expired`            |

---

## 5. Socket.IO Event Inventory (`@hm/shared` & `apps/api/Realtime/`)

### A. Client-to-Server Inbound Events

- `room:join` - Join an authorized room (validated against user id, role, or request participant rules)
- `room:leave` - Leave a joined room
- `typing:start` - Typing indicator for request comments (rate-limited, staff-only in request staff rooms)
- `typing:stop` - Typing stopped indicator

### B. Server-to-Client Outbound Events

- `notification.created` - Targeted notification dispatched to `user:<id>`
- `notification.read_updated` - Status update on notification read
- `notification.read_all` - Clears notification count badge
- `request.created` / `request.updated` / `request.status_changed` - Live ticket updates
- `request.assigned` / `request.fulfilled` / `request.comment_added` - Staff collaboration events
- `credential:submitted` / `credential:approval_changed` / `credential:revealed` - Vault activity events
- `asset:assigned` / `asset:returned` / `asset:status_changed` - Inventory updates
- `software:assigned` / `software:revoked` - License seat updates
- `offboarding:initiated` / `offboarding:case_updated` / `offboarding:task_updated` - Lifecycle events
- `export:progress` / `export:completed` - Asynchronous report export progress and completion
- `presence:update` - Active viewer presence pills in collaborative rooms

---

## 6. API Route & Security Middleware Inventory

All API endpoints require `decryptPayload` -> `userAuth` -> `checkAccess` unless explicitly designated as public:

### A. Public Route Allowlist (No `userAuth` required)

1. `GET /` - Root health/service liveness ping.
2. `GET /api-docs` - Swagger UI interactive documentation.
3. `POST /user/login` - User login endpoint with `loginLimiter` (5 req / 15m) and credential validation.
4. `POST /user/refresh/token` - Token rotation endpoint with `loginLimiter`.
5. `POST /user/forgot/password` - Password reset request with `recoveryLimiter` (5 req / 60m).
6. `POST /user/forgot/otp/verify` - OTP verification endpoint with `recoveryLimiter`.
7. `PUT /user/reset/password` - Password reset execution endpoint with `recoveryLimiter`.
8. `POST /offboarding/verify-document` - Constant-time clearance document hash verification with `verifyDocumentRateLimiter` (30 req / min).

### B. Protected Protected Routes (Require `userAuth` + `checkAccess` / Self-Service Guard)

- **User & Auth**: `/user/profile`, `/user/profile/update`, `/user/change/password`, `/user/reauth`, `/user/sessions`, `/user/session/:id`, `/user/login-history`, `/user/logout`
- **Employee Management**: `/employee/*` (Add, Update, Get, List, Options, Delete, Activity)
- **Hardware Assets**: `/assets/*` (Add, Update, Get, List, Options, Delete, QR, Maintenance, Assignments)
- **Software & Licenses**: `/software/*`, `/software-licenses/*` (Add, Update, Get, List, Options, Assign, Revoke)
- **Credentials Vault**: `/credentials/*` (Submit, Approve, Reject, Needs-Change, Reveal, Copy, Access-Log)
- **Service Requests**: `/requests/*` (Create, Update, Assign, Need-Info, Cancel, Fulfil, Comments, Stats)
- **Offboarding**: `/offboarding/*`, `/offboarding/template/*` (Initiate, List, Cases, Tasks, Waive, Exception, Scan, Clearance-PDF)
- **Reporting & Analytics**: `/reports/list`, `/reports/meta/:key`, `/reports/run/:key`, `/reports/export/:key`, `/reports/jobs/*`
- **Dashboard**: `/dashboard/summary` (Role-scoped statistics)
- **Notifications**: `/notifications/*` (List, Unread-count, Read, Read-all)
