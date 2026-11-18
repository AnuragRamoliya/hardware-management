# itam-api

Phase 1 foundation for the IT Asset and Employee Management API. Runtime source is strict
TypeScript. Sequelize CLI migrations and seeders are CommonJS JavaScript so `sequelize-cli` can
execute them directly before the TypeScript application is compiled.

## Requirements

- Node.js 22+
- MySQL 8+
- npm

## Local setup

1. Copy `.env.example` to `.env` and set the database, secret, CORS, encryption, super-admin and
   mail settings. `SECRET_KEY` must have at least 32 characters; `VAULT_ENCRYPTION_KEY` must be
   exactly 32 characters. `SUPER_ADMIN_PASSWORD` must have at least 12 characters.
2. Install dependencies with `npm ci`.
3. Create the configured MySQL database and user.
4. Run `npm run migrate`, then `npm run seed`.
5. Run `npm run dev`, or run `npm run build && npm start`.

The API validates its required runtime configuration during startup. The database CLI uses the
same MySQL settings and independently validates its connection configuration. Seeders use
idempotent MySQL upserts. Re-running `npm run migrate` and `npm run seed` is safe.

## Scripts

| Command                                  | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `npm run dev`                            | Run TypeScript with file watching  |
| `npm run build`                          | Compile to `dist/`                 |
| `npm start`                              | Start the compiled API             |
| `npm run migrate`                        | Apply Sequelize migrations         |
| `npm run seed`                           | Apply idempotent seeders           |
| `NODE_ENV=development npm run seed:bulk` | Insert 100,000 load-test employees |
| `npm run lint`                           | Run ESLint                         |
| `npm run typecheck`                      | Run strict TypeScript checks       |
| `npm test`                               | Run Vitest and Supertest           |

Husky runs lint-staged and TypeScript checks before commits.

## API conventions

- Swagger UI: `GET /api-docs`
- Requests/responses use the compatible CryptoJS AES payload format by default. Send
  `plain-text: true` to bypass payload decryption and response encryption.
- Authenticated API requests send the access token in the `token` header.
- List endpoints accept `currentPage`, `itemsPerPage` (maximum 100), `filters`, `sortBy`, and
  `general_search`; list data is returned as `{ rows, count }`.
- Deletes are soft deletes (`status = 2`). Status values are 0 inactive, 1 active, and 2 deleted.
- The default module set is pre-seeded, including modules reserved for later phases. Phase 1 does
  not implement asset, assignment, software, credential, request, offboarding, or report business
  APIs.
- Employee spreadsheet imports accept CSV or XLSX in a `file` multipart field and return
  per-row errors.
- Options endpoints accept `{ search, page, limit, ids, filters }`. `limit` is capped at 50; ID
  hydration ignores paging and includes inactive/deleted records with `meta.inactive`. Routes:
  `/user/options`, `/employee/options`, `/department/options`, `/designation/options`,
  `/location/options`, `/vendor/options`, `/asset_category/options`, and `/role/options`.
  Access requires the resource's read permission or its `options_access` flag; unknown filter keys
  are ignored.
- The options migration adds BTREE indexes on active status plus option search/label columns
  (user first/last name and email; role name/type; module, department, designation, location,
  vendor name/contact/email; asset-category name). Employees use the stored generated
  `search_text` column (`first_name + last_name + employee_code`) with `(status, search_text)`,
  plus `(status, employee_code)` and `(status, email)`. These support active prefix searches and
  stable option ordering; `%term%` matching is a contains-search fallback.
- The load-test seeder refuses to run unless `NODE_ENV=development`, uses the `LOADTEST-` employee
  code prefix, and is safe to rerun. Remove only those records with
  `NODE_ENV=development npx sequelize-cli db:seed:undo --seed 20261117110000-seed-bulk-employees.js`.

## Phase 1 scope

Includes authentication and rotating refresh tokens, role/module/permission management, user and
employee APIs, department/designation/location/vendor/asset-category CRUD, activity/audit
endpoints, MySQL migrations/seeders, mail integration, payload encryption, API docs, and job/service
scaffolds.

## Reference deviations

This project follows the provided `invsys-api` resource URL style, response envelope, activity
history route, and CryptoJS payload convention. Security and reliability fixes intentionally replace
the reference's non-expiring access token, plaintext token storage, permissive CORS, global state,
and raw error responses. Migrations/seeders remain CommonJS for direct Sequelize CLI compatibility;
the application, models, middleware, services, routes, and configuration are strict TypeScript.
