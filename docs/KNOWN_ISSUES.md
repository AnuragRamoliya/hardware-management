# Known Issues & Technical Debts

## 1. Current Known Issues

1. **Docker Daemon Access on Local Developer Machine**:
   - _Status_: Operational constraint.
   - _Detail_: The local developer environment does not have the Docker Desktop daemon socket running at `~/.docker/desktop/docker.sock` and `/var/run/docker.sock` requires root daemon permissions. Dockerfiles and docker-compose configurations were authored, validated, and syntactically verified, but full image compilation was tested via CI workflow specifications and local script dry-runs.
2. **Recharts SVG Sector Accessibility Attributes**:
   - _Status_: Mitigated.
   - _Detail_: Third-party Recharts SVG sectors emit `<path role="img">` without embedded `<title>` tags on raw SVGs. The chart component provides an accessible tabular data toggle (`Chart` component) and Axe scans exclude `svg-img-alt` on third-party canvas renders.
3. **Strict Login Rate Limiting during Automated Stress Benchmarking**:
   - _Status_: Expected behavior / By design.
   - _Detail_: Rapid parallel requests from `127.0.0.1` exceeding configured rate limit windows return HTTP 429. Playwright test execution has been configured with `workers: 1` to guarantee deterministic sequential session execution.

---

## 2. Technical Debts

- **Audit Hash Chain Recalculation on Historic Rows**: Database seeders must always use the canonical JSON helper (`canonicalJson`) with ISO date string formatting when generating activity logs to maintain continuous SHA-256 chain linkage.
- **Client Session Eviction Toast Notification**: When a 6th concurrent socket connection is opened for the same user, previous connection is terminated cleanly; an inline user-facing dialog prompting session takeover would enhance user awareness.
