# Environment Variables Reference

This document provides a comprehensive inventory of all environment variables supported and validated across `@hm/api` and `@hm/web`.

---

## 1. Backend API (`apps/api`)

Validated at application startup via Zod schema in `apps/api/Config/env.ts`. Any missing required variable or invalid production configuration causes an immediate startup abort.

| Variable Name           | Required | Default Value           | Description                                               | Production Hardening Rule                   |
| ----------------------- | -------- | ----------------------- | --------------------------------------------------------- | ------------------------------------------- |
| `PORT`                  | No       | `8000`                  | Port on which Express and Socket.IO listen                | Must be an open unprivileged port           |
| `NODE_ENV`              | Yes      | `development`           | Runtime environment (`development`, `test`, `production`) | Production activates HSTS and strict CORS   |
| `DB_HOST`               | Yes      | `localhost`             | MySQL database hostname or container service name         | Must resolve to active MySQL instance       |
| `DB_PORT`               | No       | `3306`                  | MySQL database port                                       | Valid integer port                          |
| `DB_DATABASE`           | Yes      | `hardware_store`        | Target database schema name                               | Production must use dedicated schema        |
| `DB_USERNAME`           | Yes      | `root`                  | Database authentication username                          | Non-root user in production                 |
| `DB_PASSWORD`           | No       | `""`                    | Database authentication password                          | Non-empty strong password in production     |
| `DB_CONNECTION`         | No       | `mysql`                 | Sequelize dialect identifier                              | Supported: `mysql`                          |
| `DB_LOGGING`            | No       | `false`                 | Enable SQL query logging to stdout                        | Must be `false` in production               |
| `SECRET_KEY`            | Yes      | -                       | JWT signing key for HMAC-SHA256 access tokens             | Must be >= 32 characters; dev keys blocked  |
| `ACCESS_TOKEN_EXPIRES`  | No       | `1h`                    | Expiration window for JWT access tokens                   | Standard duration format (e.g. `15m`, `1h`) |
| `REFRESH_TOKEN_EXPIRES` | No       | `7d`                    | Expiration window for refresh tokens                      | Standard duration format (e.g. `7d`, `30d`) |
| `VAULT_ENCRYPTION_KEY`  | Yes      | -                       | AES-256-GCM symmetric key for credential vault            | Exactly 32 characters; default keys blocked |
| `CORS_ORIGINS`          | No       | `http://localhost:5173` | Comma-separated list of allowed origins                   | Production forbids wildcard `*`             |
| `ENCRYPTION_SECRET`     | No       | -                       | Payload cryptography secret key                           | Optional application-layer encryption       |
| `APP_TIMEZONE`          | No       | `UTC`                   | Application time zone for date calculations               | Recommended: `UTC`                          |
| `SYNC_ROW_LIMIT`        | No       | `5000`                  | Maximum rows processed in synchronous exports             | Higher volumes queued asynchronously        |
| `EXPORT_STORAGE_PATH`   | No       | `./storage/exports`     | Filesystem path for generated PDF/XLSX/CSV exports        | Persistent container volume mount           |

---

## 2. Frontend Web Application (`apps/web`)

Configured via Vite environment variables prefixed with `VITE_`.

| Variable Name     | Required | Default Value           | Description                                |
| ----------------- | -------- | ----------------------- | ------------------------------------------ |
| `VITE_API_URL`    | Yes      | `http://localhost:8000` | Base URL for REST API endpoints            |
| `VITE_SOCKET_URL` | No       | `http://localhost:8000` | Base URL for Socket.IO realtime connection |
| `VITE_APP_TITLE`  | No       | `ITAM Platform`         | Application title rendered in browser tab  |

---

## 3. Production Deployment Checklist

1. [ ] Set `NODE_ENV=production`.
2. [ ] Replace default `VAULT_ENCRYPTION_KEY` with a freshly generated 32-character high-entropy secret.
3. [ ] Set `SECRET_KEY` to a unique 32+ character random string.
4. [ ] Ensure `CORS_ORIGINS` explicitly names the production frontend domain (no `*`).
5. [ ] Provide dedicated MySQL non-root user credentials with strong password.
6. [ ] Mount persistent storage volumes for MySQL data (`/var/lib/mysql`) and exports (`/app/apps/api/storage/exports`).
7. [ ] Ensure reverse proxy terminates TLS/HTTPS with HSTS headers enabled.
