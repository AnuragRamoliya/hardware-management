# Hardware & Employee Management Monorepo

An in-house IT Asset & Employee Management system built to manage employees, hardware (assigned/unassigned), software and licenses, access credentials, asset requests, maintenance workflows, and audit logging.

---

## 1. Monorepo Architecture Overview

This monorepo uses **npm workspaces** and **Turborepo** for unified dependency management, fast builds, and shared tooling across apps and packages.

```
hardware-management/
├── apps/
│   ├── api/                   # @hm/api: Node.js Express 5 + Sequelize 6 REST API
│   └── web/                   # @hm/web: React 18 + Vite + Tailwind + Radix UI Frontend
├── packages/
│   ├── shared/                # @hm/shared: Framework-free TypeScript types, constants & contracts
│   ├── tsconfig/              # @hm/tsconfig: Shared TypeScript configs (base, node, react)
│   └── eslint-config/         # @hm/eslint-config: Shared ESLint + Prettier rules
├── docs/                      # Architectural docs, UI/API standards, checklists & audits
├── docker/                    # Multi-stage Dockerfiles and Nginx configuration
├── .github/
│   ├── workflows/             # GitHub Actions CI & visual test pipelines
│   ├── CODEOWNERS             # Monorepo code ownership
│   ├── dependabot.yml         # Automated dependency update configuration
│   └── PULL_REQUEST_TEMPLATE.md
├── docker-compose.yml         # Full-stack production compose (MySQL, API, Web)
├── docker-compose.dev.yml     # Local dev compose (MySQL service container)
├── package.json               # Root workspaces configuration
└── turbo.json                 # Turborepo task pipeline cache definition
```

---

## 2. Prerequisites

- **Node.js**: `v22.23.4` (LTS Iron). Use `nvm use` to select the exact version.
- **npm**: `>=10.9.9`
- **MySQL**: 8.4 (either local installation or Docker container)
- **Docker & Docker Compose** (optional for local database container)

---

## 3. Quick Start Guide

### Step 1: Clone and Enter the Repository

```bash
git clone git@github.com:AnuragRamoliya/hardware-management.git
cd hardware-management
```

### Step 2: Use Required Node Version & Install Dependencies

```bash
nvm use
npm install --legacy-peer-deps
```

### Step 3: Configure Environment Variables

Copy example files and customize if needed:

```bash
# Root docker variables
cp .env.example .env

# API environment
cp apps/api/.env.example apps/api/.env

# Web environment
cp apps/web/.env.example apps/web/.env
```

### Step 4: Start Database Service

You can start a local MySQL instance with Docker:

```bash
docker compose -f docker-compose.dev.yml up -d
```

_(Or ensure your host MySQL service is active on port 3306)_

### Step 5: Run Database Migrations and Seeders

```bash
# Run migrations
npm run db:migrate

# Seed initial RBAC and Super Admin user
npm run db:seed

# (Optional) Seed bulk sample assets and employees
npm run db:seed:bulk
```

### Step 6: Start Full-Stack Development

```bash
npm run dev
```

- **Web App**: http://localhost:5173
- **API Server**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/api-docs/

---

## 4. Workspaces & Scripts Reference

Run these commands from the repository root:

| Command                | Description                                                          |
| :--------------------- | :------------------------------------------------------------------- |
| `npm run dev`          | Runs API, Web, and packages concurrently in watch mode via Turborepo |
| `npm run build`        | Builds all packages (`@hm/shared`, `@hm/api`, `@hm/web`)             |
| `npm run lint`         | Runs ESLint across all workspaces                                    |
| `npm run typecheck`    | Validates TypeScript types across all workspaces (`tsc --noEmit`)    |
| `npm run test`         | Runs unit tests across all workspaces                                |
| `npm run check:ui`     | Validates frontend adherence to UI standards (runs `check-ui.mjs`)   |
| `npm run format`       | Auto-formats code with Prettier                                      |
| `npm run format:check` | Checks formatting without modifying files                            |
| `npm run clean`        | Cleans build artifacts, `.turbo`, and `node_modules`                 |
| `npm run db:migrate`   | Runs Sequelize migrations in `@hm/api`                               |
| `npm run db:seed`      | Runs core seeders in `@hm/api` (RBAC + Admin)                        |
| `npm run db:seed:bulk` | Runs bulk test data seeders in `@hm/api`                             |
| `npm run docker:up`    | Starts production containers via `docker-compose.yml`                |
| `npm run docker:down`  | Stops production containers                                          |

---

## 5. Adding a New Resource / Module

We provide automated scaffolding scripts for both API and Web:

```bash
# Generate API module (Controller, Model, Route, Service, Validation)
npm run gen:module --workspace=@hm/api -- <resource_name>

# Generate Web module (Pages, Components, Form, Filters, Schema, Query Hooks)
npm run gen:module --workspace=@hm/web -- <resource_name>
```

Before opening a pull request, ensure the new module satisfies `docs/MODULE_CHECKLIST.md`.

---

## 6. Environment Variables Reference

### Root `.env` (Docker Compose)

| Key                | Default        | Description            |
| :----------------- | :------------- | :--------------------- |
| `DB_HOST`          | `localhost`    | MySQL host address     |
| `DB_PORT`          | `3306`         | MySQL port             |
| `DB_DATABASE`      | `itam_db`      | Database schema name   |
| `DB_USERNAME`      | `itam_user`    | Database user          |
| `DB_PASSWORD`      | `itampassword` | Database password      |
| `DB_ROOT_PASSWORD` | `rootpassword` | Root database password |
| `API_PORT`         | `8000`         | Exposed API port       |
| `WEB_PORT`         | `80`           | Exposed Web port       |

### API (`apps/api/.env`)

| Key                     | Description                                              |
| :---------------------- | :------------------------------------------------------- |
| `PORT`                  | API server port (default 8000)                           |
| `NODE_ENV`              | Environment mode (`development` / `production` / `test`) |
| `DB_*`                  | Database connection parameters                           |
| `SECRET_KEY`            | JWT signing secret                                       |
| `ACCESS_TOKEN_EXPIRES`  | JWT access token lifespan (e.g. `15m`, `1h`)             |
| `REFRESH_TOKEN_EXPIRES` | Refresh token lifespan (e.g. `7d`)                       |
| `CORS_ORIGINS`          | Allowed CORS origins (comma-separated)                   |
| `VAULT_ENCRYPTION_KEY`  | 32-byte AES-256-GCM secret for credential vault          |

### Web (`apps/web/.env`)

| Key             | Description                                                 |
| :-------------- | :---------------------------------------------------------- |
| `VITE_HOST_API` | Base URL of the backend API (e.g. `http://localhost:8000/`) |

---

## 7. Frontend Form & UI Standards

All add and edit forms across modules strictly adhere to shared UI standards:

- **Slide-out Drawer**: All Add and Edit forms render in `<Drawer>` (desktop right-panel, mobile full-screen), never centered dialog modals.
- **Responsive Form Grid**: Forms use `FormGrid` (default 2 columns) with `FormGridItem`. Single-line inputs are paired in 1-column spans (`span={1}`), while full-width inputs and multi-line textareas (address, notes, descriptions) span both columns (`span={2}`) to prevent vertical misalignment.
- **Unsaved Changes Guard**: Every drawer integrates dirty-state detection (`isDirty`). Attempting to close or cancel a modified form triggers the shared `<ConfirmDialog>` (destructive variant) before discarding changes. Native `window.confirm` is forbidden.

---

## 8. Documentation Index

### Core Standards & Architecture

- [PROJECT_CONTEXT.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/PROJECT_CONTEXT.md): System architecture and core business logic
- [UI_STANDARDS.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/UI_STANDARDS.md): Design system and frontend patterns
- [API_STANDARDS.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/API_STANDARDS.md): REST API conventions and endpoint shapes
- [MODULE_CHECKLIST.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/MODULE_CHECKLIST.md): Production checklist for all modules
- [FORM_FIELD_GUIDELINES.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/FORM_FIELD_GUIDELINES.md): RHF form field catalogue and validation patterns
- [CREDENTIAL_VAULT_SECURITY.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/CREDENTIAL_VAULT_SECURITY.md): AES-256-GCM zero-knowledge vault specification

### Phase Implementation Guides

Detailed documentation for each project phase is maintained in [docs/phases/](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/README.md):

- [Phase 1: Foundation, Authentication, RBAC & Core Resources](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_1_README.md)
- [Phase 2: Hardware Assets, Software Licenses & Maintenance](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_2_README.md)
- [Phase 3: Zero-Knowledge Credential Vault](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_3_README.md)
- [Phase 4: Employee Requests & Approval Engine](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_4_README.md)
- [Phase 5: Employee Offboarding & Hardware Handover](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_5_README.md)
- [Phase R: Real-Time Push & Notification System](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_R_README.md)

---

## 9. Implementation Phases & Historical Roadmap

The codebase follows a modular, table-wise architecture (`apps/api/Database/Schema/<table_name>.ts`, dedicated Services, Controllers, and Routes). Phase progress is preserved below for milestone tracking:

| Phase        | Milestone Name                     | Key Capabilities Delivered                                                                                                                                                                                            | Schema / Tables                                                                                                                                                                    |
| :----------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1**  | Foundation & Core RBAC             | Authentication (JWT + refresh), RBAC permissions engine, tamper-evident SHA-256 audit logs, core organizational resources (Departments, Designations, Locations, Vendors, Asset Categories, Employees).               | `users`, `roles`, `modules`, `permissions`, `user_tokens`, `activity_logs`, `app_settings`, `departments`, `designations`, `locations`, `vendors`, `asset_categories`, `employees` |
| **Phase 2**  | Assets & Software Inventory        | Hardware asset lifecycle (specifications, serials, QR/barcodes, status tracking), asset assignments & returns, maintenance logs, software catalog, license seat management, employee inventory, in-app notifications. | `assets`, `asset_assignments`, `asset_maintenance`, `software`, `software_licenses`, `software_assignments`, `notifications`, `notification_preferences`                           |
| **Phase 3**  | Zero-Knowledge Credential Vault    | AES-256-GCM encrypted credential vault with key rotation, employee credential collection requests, audit logging for credential reveals, credential history tracking.                                                 | `credentials`, `credential_types`, `credential_history`, `credential_collection_requests`, `credential_access_logs`, `login_history`                                               |
| **Phase 4**  | Request Workflows & Approvals      | Multi-type requests (asset, software, license, repair), approval workflows (Admin/Manager), status transition history, rich comments, file attachments, employee self-service portal.                                 | `requests`, `request_comments`, `request_status_history`, `request_attachments`                                                                                                    |
| **Phase 5**  | Offboarding & Lifecycle Automation | Configurable checklist templates, automated offboarding task generation, hardware asset handover/reassignment, credential revocation, audit sign-off.                                                                 | `offboarding_checklist_templates`, `offboarding_cases`, `offboarding_tasks`                                                                                                        |
| **Realtime** | Socket.IO & Realtime Alerts        | Realtime server push via Socket.IO with Redis adapter support, live notification counter, toast alerts on state changes, subquery active count aggregations.                                                          | Realtime server events, client listeners & query cache invalidations                                                                                                               |
