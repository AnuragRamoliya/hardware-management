# CI/CD Pipeline & GitHub Actions Reference

## Overview

The Hardware Management monorepo uses GitHub Actions for continuous integration, scheduled security audits, and containerized release packaging.

---

## 1. Workflows

### `ci.yml` (Continuous Integration)

- **Triggers**: Pull requests targeting `main`, pushes to `main` and feature branches (`feature/**`, `fix/**`).
- **Jobs**:
  1. **Secret Scan**: Uses `gitleaks-action` across full git commit history.
  2. **Lint & Quality**: Runs ESLint across all workspaces (`@hm/api`, `@hm/web`, `@hm/shared`), TypeScript type checking (`tsc --noEmit`), and UI standards validation (`npm run check:ui`).
  3. **Unit & Integration Tests**: Spins up MySQL 8.4 service container, applies Sequelize migrations (`npm run db:migrate`), runs test fixtures, golden report verifications, and API integration tests.
  4. **Playwright Responsive & Field Consistency Harness**: Runs across desktop (1440px), tablet (768px), and mobile (360px) in Chromium and Firefox. Validates runtime `data-hm` guards, touch targets >= 36-44px, zero horizontal overflow, and 0 Axe accessibility violations. Exclusively outputs text/JUnit results; trace, screenshot, and video captures are permanently disabled.
  5. **WebKit Verification (Docker & CI)**: Installs WebKit dependencies (`npx playwright install --with-deps webkit`) in CI and executes responsive tests across 360, 768, and 1440 viewports. For local Linux hosts lacking WebKit shared libraries, the official Playwright Docker container can be run directly:
     ```bash
     docker run --rm --network host -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.48.0-focal npx playwright test e2e/responsive/ --project=webkit-desktop --project=webkit-tablet --project=webkit-mobile
     ```
  6. **UI Inventory & Field Usage Guards**: Executes `npm run check:ui-inventory` (ensuring 100% of routes and overlays are covered) and `npm run check:field-usage` (AST scanner verifying no unapproved native inputs exist).
  7. **Build**: Builds production bundles for `@hm/shared`, `@hm/api`, and `@hm/web`.

### `security.yml` (Weekly Security Audits)

- **Triggers**: Scheduled cron every Monday at 02:00 UTC, and manual trigger (`workflow_dispatch`).
- **Jobs**:
  1. **Dependency Audit**: `npm audit --audit-level=high` across all workspaces to prevent high/critical vulnerabilities.
  2. **Pattern-Based Secret Scan**: Executes `scripts/secret-scan.mjs` to detect leaked high-entropy tokens, private keys, or API credentials.

### `release.yml` (Release & Container Packaging)

- **Triggers**: Pushes with semantic version tags (`v*.*.*`) or manual trigger.
- **Jobs**:
  1. **Container Builds**: Uses Docker Buildx to compile multi-stage production images for `@hm/api` and `@hm/web`.
  2. **Registry Push**: Pushes to GitHub Packages Container Registry (`ghcr.io`) if credentials are configured; otherwise performs dry-run image verification.

---

## 2. Required Repository Secrets

| Secret Name            | Purpose                                    | Example / Required Format         |
| ---------------------- | ------------------------------------------ | --------------------------------- |
| `DB_PASSWORD`          | MySQL production/test password             | Alphanumeric 32-character string  |
| `SECRET_KEY`           | JWT signing secret for access tokens       | High-entropy string (>= 32 bytes) |
| `VAULT_ENCRYPTION_KEY` | AES-256-GCM vault master key               | 32-byte hex or UTF-8 key          |
| `DOCKERHUB_TOKEN`      | (Optional) Container registry access token | Personal access token             |

---

## 3. Branch Protection Settings (`main`)

To preserve production stability and cryptographic integrity, the following branch protection rules must be configured in GitHub repository settings:

1. **Require pull request reviews before merging**: At least 1 approving review from a code owner.
2. **Require status checks to pass before merging**:
   - `ci / Build, Lint & Test`
   - `ci / Secret Scan`
3. **Require branches to be up to date before merging**: Enforces clean linear history or rebase merges.
4. **Do not allow bypassing the above settings**: Applies to administrators and bots.
5. **No direct pushes to `main`**: All modifications must flow through tested feature branches.
