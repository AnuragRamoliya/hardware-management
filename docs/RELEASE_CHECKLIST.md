# Release Readiness Checklist (Phase 7 Final Release)

## 1. Security & Hardening

- [x] **Route Guard Audit**: Automated route traversal in `apps/api/tests/route_guard_audit.test.ts` asserts that all non-allowlisted routes require `userAuth` and `checkAccess`.
- [x] **IDOR & Boundary Checks**: Validated in `apps/api/tests/idor_and_rbac_boundaries.test.ts` (clearance PDFs, handover receipts, credential reveals, export downloads strictly bounded to case owners or authorized staff).
- [x] **Transport Security**: Helmet headers configured (HSTS in production, `X-Powered-By` removed). CORS production wildcard blocked.
- [x] **Rate Limiting**: Rate limiters applied to `/user/login`, `/export`, `/reveal`, and `/options` endpoints.
- [x] **Cryptographic Vault & Secrets**:
  - `VAULT_ENCRYPTION_KEY` validated by Zod at startup. Default keys blocked in production.
  - Secret scan (`scripts/secret-scan.mjs`) reports zero unencrypted live credentials in tracking.
- [x] **Audit Integrity**: Cryptographic SHA-256 hash chains intact and validated via `npm run audit:verify` (100% tamper-free).
- [x] **Realtime Security**: Socket.IO connection token validation, 4KB packet limits, connection evictions at 5 concurrent links tested in `apps/api/tests/realtime_security.test.ts`.

---

## 2. Testing & Quality Gate

- [x] **Unit & Integration Tests**: All workspace tests passing (`npm run test`).
- [x] **Full-System Fixture Verification**: `npm run test:all-fixture` executed (138/138 assertions passing).
- [x] **End-to-End & Playwright**: 24 tests passing across desktop (1440x900) and mobile (360x740) viewports.
- [x] **Accessibility**: Zero Axe WCAG 2.1 AA violations on all scanned routes (`/login`, `/verify-document`, `/`).
- [x] **Type Safety**: TypeScript check (`npm run typecheck`) passes with 0 errors across `@hm/shared`, `@hm/api`, `@hm/web`.
- [x] **Linting**: ESLint (`npm run lint`) passes cleanly with 0 errors.
- [x] **UI Standards**: `npm run check:ui` passes with 0 violations.

---

## 3. Infrastructure, Docker & Operations

- [x] **Docker Multi-Stage Builds**: `docker/api.Dockerfile` and `docker/web.Dockerfile` with unprivileged runner users.
- [x] **Docker Compose**: `docker-compose.yml` with health checks, depends_on conditions, and persistent volumes.
- [x] **Container Health Probes**: `GET /health` (liveness) and `GET /ready` (readiness with DB ping) active and responsive.
- [x] **Backup & Disaster Recovery**: `scripts/backup.sh` and `scripts/restore.sh` verified with row-count equality check across 36 database tables.
- [x] **CI/CD Automation**: GitHub workflows configured (`ci.yml`, `security.yml`, `release.yml`).
- [x] **Environment Reference**: Detailed parameter specifications documented in `docs/ENV_REFERENCE.md`.

---

## 4. Production Bootstrap & First-Run Steps

1. **Database Provisioning**: Create clean production database schema (`itam_db`).
2. **Apply Migrations**: Execute `npm run db:migrate` via Sequelize CLI.
3. **Provision First Super Admin**: Execute `npm run db:seed:admin` (or run manual bootstrap script) to create the initial administrative account with an enforced temporary password.
4. **Load Core Master Data**: Seed organization departments, designations, locations, and asset categories via admin portal or administrative seed.
5. **Purge Dev Fixture Accounts**: Verify no `@fixture.local` accounts exist in production (`DELETE FROM users WHERE email LIKE '%@fixture.local'`).
6. **Key Safeguards**: Ensure `VAULT_ENCRYPTION_KEY` and `SECRET_KEY` are stored in an external secret manager (e.g. AWS Secrets Manager, HashiCorp Vault) and backed up separately from MySQL database dumps.
