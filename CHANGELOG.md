# Changelog

All notable changes to the Hardware Management (ITAM) platform are documented in this file.

---

## [Phase 7] - 2026-11-20

### Added

- Comprehensive security review (`docs/SECURITY_REVIEW.md`) covering SEC-01 through SEC-07.
- Automated route guard test (`apps/api/tests/route_guard_audit.test.ts`) traversing 256 Express routes.
- Automated IDOR boundary tests (`apps/api/tests/idor_and_rbac_boundaries.test.ts`).
- Realtime WebSocket security suite (`apps/api/tests/realtime_security.test.ts`).
- Container health endpoints `GET /health` (liveness) and `GET /ready` (readiness with DB check).
- Performance & load benchmarking suite (`docs/PHASE_7_LOAD.md`).
- Multi-role full-system end-to-end journey tests in Playwright (`e2e/full_system_lifecycle.spec.ts`).
- Disaster recovery backup and restore scripts (`scripts/backup.sh`, `scripts/restore.sh`).
- CI/CD GitHub workflows (`security.yml`, `release.yml`, updated `ci.yml`).
- Machine-readable OpenAPI 3.0 export (`docs/openapi.json`).
- Complete documentation suite: `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/ADMIN_GUIDE.md`, `docs/USER_GUIDE.md`, `docs/TROUBLESHOOTING.md`, `docs/RELEASE_CHECKLIST.md`, `docs/INDEX.md`, `docs/PROJECT_HANDOFF.md`.

### Changed

- Rate limiters hardened for authentication, exports, reveals, and options.
- AppShell accessibility labels aligned with visible text, resolving WCAG 2.5.3 (Label in Name).
- Playwright configuration configured with `workers: 1` for deterministic sequential session testing.

### Fixed

- IDOR vulnerability on clearance and handover receipt PDF downloads in `offboarding.service.ts`.
- IDOR boundary leak on employee portal credential reveals in `credential_vault.ts`.
- Cryptographic hash chain canonicalization for `Date` objects in `hash_chain.ts`.

---

## [Phase 6] - 2026-11-20

### Added

- Reports and operational analytics module with 10 production report definitions.
- Streaming asynchronous export worker supporting CSV, XLSX, and PDF formats.
- High-volume 100,000 asset seed dataset.
- Realtime export job progress drawer and status notifications.

---

## [Phase 5 & R] - 2026-11-20

### Added

- Employee offboarding lifecycle and checklist template automation.
- Cryptographically verified clearance certificates with public verification portal (`/verify-document`).
- Realtime WebSocket gateway (`/realtime`) with role-based rooms and toast notifications.

---

## [Phase 4] - 2026-11-19

### Added

- Asset and hardware request workflow with approval escalation.
- Request turnaround SLA metrics and comment timeline.

---

## [Phase 3] - 2026-11-18

### Added

- Credential vault with AES-256-GCM authenticated encryption and key rotation.
- Tamper-evident SHA-256 audit hash chain ledger.

---

## [Phase 1 & 2] - 2026-11-18

### Added

- Workspaces monorepo setup with Turborepo, `@hm/api`, `@hm/web`, and `@hm/shared`.
- Core employee, asset inventory, department, designation, and location models.
