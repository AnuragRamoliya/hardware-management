# API module standards

Follow the existing Express/Sequelize patterns. Keep each domain split into route, controller, service, model adapter, schema definition, migration, seed/RBAC, Swagger, and tests. `Routes/phase2.ts` is a composition root only.

```text
Routes/<resource>.ts
  -> Controllers/<resource>.ts
    -> Services/<resource>.ts
      -> Models/<resource>.ts
        -> Database/Schema/<resource>.ts
```

## Routes

- Use established `/list`, `/add`, `/update`, `/get/:id`, `/delete/:id`, `/options`, and `/activity` names where the resource needs them. Keep the URL and payload contract stable.
- Middleware order: `decryptPayload`, `userAuth`, resource `checkAccess`, `validate`, controller handler. Use the dedicated permission module and operation flags.
- Keep route files declarative: URL, middleware, validation, and controller call only. Put upload parsing/request mapping in a controller; database behavior belongs in a service.
- Use `listValidation`/`optionsValidation`, route params/body validators, and return 422 for malformed values. Never interpolate request input into SQL.

## Controllers and services

- Controllers adapt `Request` and the authenticated actor to typed service calls. Use the common route handler/response messages; do not embed Sequelize queries in controllers.
- Services own transactions, row locks, reference/consistency rules, soft deletes, whitelisted filters, pagination, and `createActivityLog` calls for every write.
- Use `getPagination` and shared filter/query helpers. Support arrays as `IN`, validated `{ from, to }` ranges, and booleans only on explicitly allowed fields.
- Writes use one transaction for record change and activity log. Soft delete uses `status`; preserve API response shape and do not leak encrypted secrets.
- Validate IDs exist and related IDs belong together. Keep concurrency guards in the database as well as service checks when a unique invariant is required.

## Models, schema, migration, and options

- Module model files export the domain's Sequelize records; schema files contain only that module's columns. The shared schema index applies common fields and associations.
- Keep migration names timestamped and migrations forward-only in shared environments. Add indexes for each supported list/search/filter path and unique constraints for concurrency invariants.
- Option builders whitelist resources and filter keys; use stable cursor pagination for large datasets.
- Update seeders idempotently. Register the permission module and role defaults in the existing RBAC seeder; do not grant write access by accident.

## Swagger and tests

- Document every public route with body/query/params, permission requirement, success shape, validation failure, and auth failure. Keep examples synchronized with validators.
- Add route tests for CRUD, validation, permission denial, filter whitelist/range behavior, and response shapes. Add database integration tests for transactions, concurrency, and foreign-key consistency. Keep optional external database tests explicitly gated.
- Before completion run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; use `npm run migrate` and the idempotent seed command against a disposable or approved database.

## Generator contract

The API `gen:module` command must validate the resource name/field grammar and create a route, controller, service, model adapter, schema, migration, seeder/RBAC entry, Swagger scaffold, options registration, activity constant, and test scaffold. It must refuse to overwrite existing files and print the next manual registration steps. Generated code must pass lint/typecheck/tests without hand-editing.
