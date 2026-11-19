# @hm/api

The backend REST API and real-time WebSocket server for the IT Asset & Employee Management system. Built with Node.js, Express 5, Sequelize 6 ORM, and Socket.IO 4.8 in strict TypeScript.

---

## 1. Architecture & Structure

```
apps/api/
├── Config/            # Database, constants, environment & encryption configurations
├── Controllers/       # HTTP request handlers extending BaseCrudController
├── Database/
│   ├── Migrations/    # Sequelize schema migrations
│   ├── Schema/        # Table-wise Sequelize model definitions (<table_name>.ts)
│   └── Seeders/       # Idempotent database seeders
├── Jobs/              # Automated cron jobs (LWD reminders, SLA checks, auto-close)
├── Middleware/        # Authentication (JWT), access control (RBAC), crypto & logging
├── Models/            # ResourceModel and Entity definitions
├── Realtime/          # Socket.IO gateway, JWT handshake auth & security rooms
├── Routes/            # Domain-specific Express routers (<resource>.ts)
├── Services/          # Core business logic, transactions, and event emission
├── Swagger/           # OpenAPI / Swagger endpoint documentation
├── Types/             # TypeScript type definitions and API contracts
└── Utils/             # Cryptography, route factory, options builder, pagination
```

---

## 2. Requirements & Prerequisites

- **Node.js**: `>=22.23.4` (LTS Iron)
- **MySQL**: `>=8.0` (or Docker MySQL container)
- **Redis** (optional): For multi-replica Socket.IO adapter clustering

---

## 3. Environment Configuration

Copy `.env.example` to `.env` in `apps/api/`:

```env
PORT=8000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=itam_db
DB_USERNAME=itam_user
DB_PASSWORD=itampassword
SECRET_KEY=supersecretjwtkeyatleast32characterslong!
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
CORS_ORIGINS=http://localhost:5173
VAULT_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
REALTIME_ENABLED=true
```

---

## 4. Scripts Reference

| Command                        | Description                                                         |
| :----------------------------- | :------------------------------------------------------------------ |
| `npm run dev`                  | Starts API with hot reloading via `tsx watch`                       |
| `npm run build`                | Compiles TypeScript source to `dist/`                               |
| `npm start`                    | Runs the compiled production API from `dist/server.js`              |
| `npm run migrate`              | Executes Sequelize database migrations (`sequelize-cli db:migrate`) |
| `npm run seed`                 | Executes all seeders idempotently (`sequelize-cli db:seed:all`)     |
| `npm run seed:bulk`            | Seeds 100k load-test assets, employees, and offboarding records     |
| `npm run typecheck`            | Validates strict TypeScript compilation (`tsc --noEmit`)            |
| `npm run test`                 | Runs Vitest test suite (`vitest run --passWithNoTests`)             |
| `npm run gen:module -- <name>` | Scaffolds a new API module (Model, Controller, Route, Service)      |
| `npm run vault:generate-key`   | Generates a cryptographically secure 32-byte hexadecimal key        |
| `npm run vault:rotate`         | Rotates vault encryption key across stored credentials              |

---

## 5. API Conventions & Standards

- **Swagger Documentation**: Available at `http://localhost:8000/api-docs/`.
- **Payload Format**: Supports compatible AES encrypted payloads or plain-text mode with header `plain-text: true`.
- **Authentication**: Bearer/token sent via the `token` header.
- **List Contract**: `POST /<resource>/list` accepts `{ currentPage, itemsPerPage, filters, sortBy, general_search }` and returns `{ rows, count }`.
- **Soft Deletes**: Deletions set `status = 2` (Deleted). Active records use `status = 1`.
- **Audit Logging**: Every create, update, and delete writes a tamper-evident SHA-256 hash-chained log to `activity_logs`.
- **Real-Time Push**: State updates emit events to Socket.IO rooms (`emitAfterCommit`) only after transactions commit.
