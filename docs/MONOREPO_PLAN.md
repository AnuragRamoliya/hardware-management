# Monorepo Migration Plan & Architecture Document

**Date**: 2026-11-18  
**Author**: Senior DevOps / Full-Stack Engineer  
**Target Repository**: `git@github.com:AnuragRamoliya/hardware-management.git`  
**Workspace Root**: `hardware-management/`

---

## 1. Pre-Flight Findings & Source Audit

### 1.1 Source Repositories

| Component | Source Path                             | Size (with node_modules) | Git Status            | Commits    | Large Files (> 5MB) | Lockfile            |
| :-------- | :-------------------------------------- | :----------------------- | :-------------------- | :--------- | :------------------ | :------------------ |
| **API**   | `/hardware-app/hardware-mnagement-api`  | ~289 MB                  | Not a git repo        | 0          | None                | `package-lock.json` |
| **WEB**   | `/hardware-app/hardware-management-web` | ~316 MB                  | Clean repo (`master`) | 19 commits | None                | `package-lock.json` |
| **DOCS**  | `/hardware-app/docs`                    | ~84 KB                   | Tracked in root       | N/A        | None                | N/A                 |

### 1.2 Target Remote Inspection

- Command: `git ls-remote git@github.com:AnuragRamoliya/hardware-management.git`
- Status: **Accessible via SSH**.
- Existing Remote Content: `5bb2da090c6deb4fd4c0fb7fefcde715ec99b15b refs/heads/main` (Initial commit containing a 1-line `README.md`).
- **Policy Compliance**: Remote is non-empty. In strict accordance with Step 0 / Step 5 instructions:
  - Do NOT overwrite or force-push.
  - Clone existing repository and branch off `chore/monorepo-setup`.
  - Deliver changes on `chore/monorepo-setup` for PR review.

### 1.3 Secret Scan Results

- **API Scan**:
  - Raw findings in local `.env` (contains local database password placeholders, JWT secrets, mail config).
  - `.env.example` verified: purely empty placeholder strings.
  - No committed credentials in code files.
- **WEB Scan**:
  - Git history scanned (`git log -p --all`): 15 regex hits, all verified to be standard form schema fields (`new_password`, `confirm_password`, `SUPER_ADMIN_EMAIL`), no committed keys or tokens.
  - `.env.example` verified: clean `VITE_HOST_API=http://localhost:8000/`.
- **Policy Enforcement**:
  - Root and app-level `.gitignore` files strictly ignore `.env`, `.env.*`, and only allow `.env.example`.
  - Gitleaks CI workflow step configured in `.github/workflows/ci.yml`.

### 1.4 Runtime & Infrastructure Environment

- **Node.js**: `v22.23.4` (LTS Iron).
- **npm**: `10.9.9`. Lockfile format: npm `package-lock.json` only.
- **Docker**: Docker CLI `29.8.2` and Docker Compose `v5.6.1` installed; local Docker Desktop socket inactive. Multi-stage Dockerfiles and compose configs will be created and documented as untested locally.
- **Database**: Local MySQL 8.4 active on port 3306.

---

## 2. Target Workspace Architecture

```
hardware-management/
├── apps/
│   ├── api/                   (@hm/api: Node.js Express 5 + Sequelize 6)
│   └── web/                   (@hm/web: React 18 + Vite + Tailwind + Radix)
├── packages/
│   ├── shared/                (@hm/shared: framework-free TypeScript contracts, types, constants)
│   ├── tsconfig/              (@hm/tsconfig: base.json, node.json, react.json)
│   └── eslint-config/         (@hm/eslint-config: base, node, react configurations)
├── docs/                      (Consolidated architectural docs, parity audits, standards)
├── docker/                    (api.Dockerfile, web.Dockerfile, nginx.conf)
├── .github/
│   ├── workflows/             (ci.yml, visual-a11y.yml)
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                    (pre-commit: lint-staged + typecheck; commit-msg: commitlint)
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .nvmrc                     (22.23.4)
├── .npmrc
├── package.json               (workspaces: ["apps/*", "packages/*"], turbo)
├── turbo.json                 (pipeline caching for build, lint, typecheck, test, check:ui)
├── docker-compose.yml         (mysql volume + api + web)
├── docker-compose.dev.yml     (mysql service container for local dev)
├── .env.example               (root docker-compose variables)
└── README.md                  (Comprehensive monorepo guide)
```

---

## 3. Migration Decisions & Step-by-Step Strategy

### 3.1 App Code Import

1. **WEB (`apps/web`)**:
   - Source has 19 high-quality, verified commits with clean parity standardization and test cleanup.
   - Import using `git subtree add --prefix=apps/web <web-source-path> master` to preserve complete commit history and blame fidelity.
2. **API (`apps/api`)**:
   - Source is not a git repository.
   - Import as a clean snapshot excluding `node_modules`, `.env`, logs, and temporary files.
   - Commit as `feat(api): import API application into monorepo`.
3. **Docs Consolidation (`docs/`)**:
   - Merge `hardware-app/docs/`, `api/docs/`, and `web/docs/` into root `docs/`.
   - Maintain parity screenshots (`docs/parity/before/` and `docs/parity/after/`).

### 3.2 Tooling Packages

1. **`@hm/tsconfig`**:
   - `base.json`: ES2022, strict, isolatedModules, skipLibCheck, resolveJsonModule.
   - `node.json`: extends `base.json`, ModuleResolution NodeNext / Node16, types `["node"]`.
   - `react.json`: extends `base.json`, ModuleResolution Bundler, JSX react-jsx, DOM types.
2. **`@hm/eslint-config`**:
   - Shared rules prohibiting native form inputs outside `components/ui`, direct axios outside `src/api`, untyped `any`, hardcoded color classes outside theme tokens.
3. **`@hm/shared`**:
   - Framework-free TypeScript package compiled via `tsup` to ESM (`dist/index.mjs`), CJS (`dist/index.cjs`), and TypeScript types (`dist/index.d.ts`).
   - Exports:
     - `ApiResponse<T>`, `Paginated<T>`, `ListRequest`, `OptionsRequest`, `OptionsResponse`, `OptionItem`, `ApiError`.
     - `STATUS` (0: inactive, 1: active, 2: deleted), `MODULES`, `ACCESS_TYPES`, Role names.
     - Asset status/condition, employee employment status, software license types.
     - Common DTO interfaces (`Employee`, `Asset`, `Software`, `Maintenance`).

### 3.3 Path & Configuration Adjustments

- Update `apps/api`:
  - `package.json`: name `@hm/api`, add dependency `"@hm/shared": "*"` and devDependencies `"@hm/tsconfig": "*"`.
  - `.sequelizerc`: verify relative paths to models, migrations, seeders.
  - `tsconfig.json`: extend `@hm/tsconfig/node.json`.
- Update `apps/web`:
  - `package.json`: name `@hm/web`, add dependency `"@hm/shared": "*"` and devDependencies `"@hm/tsconfig": "*"`.
  - `tsconfig.json`: extend `@hm/tsconfig/react.json`.
  - `vite.config.ts`: ensure proxy to `/api` works seamlessly with dev servers.
  - Replace duplicate type declarations and constants with `@hm/shared`.

### 3.4 Verification & Clean Clone Test

- Clone to a temporary directory (`/tmp/hardware-management-verify`).
- Run `npm ci`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run check:ui`.
- Verify database migration and seeding on local MySQL.
- Verify hot-reloading and shared package link.
