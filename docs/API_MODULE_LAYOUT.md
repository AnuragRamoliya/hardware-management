# API module layout

Phase 2 uses one domain per file across the request and persistence layers:

```text
Routes/<module>.ts
  -> Controllers/<module>.ts
    -> Services/<module>.ts
      -> Models/<module>.ts
        -> Database/Schema/phase2/<module>.ts
```

`Routes/phase2.ts` only composes the module routers. `Routes/index.ts` mounts that composition beside the existing API routes.

| Domain                      | Route                                              | Controller                          | Service                          | Model/schema                                                                 |
| --------------------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Assets                      | `Routes/assets.ts`                                 | `Controllers/assets.ts`             | `Services/assets.ts`             | `Models/assets.ts`, `Database/Schema/phase2/assets.ts`                       |
| Assignments                 | `Routes/asset_assignments.ts`                      | `Controllers/asset_assignments.ts`  | `Services/asset_assignment.ts`   | `Models/asset_assignment.ts`, `Database/Schema/phase2/asset_assignments.ts`  |
| Maintenance                 | `Routes/asset_maintenance.ts`                      | `Controllers/asset_maintenance.ts`  | `Services/asset_maintenance.ts`  | `Models/asset_maintenance.ts`, `Database/Schema/phase2/asset_maintenance.ts` |
| Software                    | `Routes/software.ts`                               | `Controllers/software.ts`           | `Services/software.ts`           | `Models/software.ts`, `Database/Schema/phase2/software.ts`                   |
| Software licenses           | `Routes/software_licenses.ts`                      | `Controllers/software_licenses.ts`  | `Services/software_licenses.ts`  | `Models/software_license.ts`, `Database/Schema/phase2/software_licenses.ts`  |
| Employee inventory / portal | `Routes/employee_inventory.ts`, `Routes/portal.ts` | `Controllers/employee_inventory.ts` | Assignment and software services | Assignment/software models                                                   |
| Dashboard                   | `Routes/dashboard.ts`                              | `Controllers/dashboard.ts`          | `Services/dashboard.ts`          | Asset/software/license models                                                |
| Notifications               | `Routes/notifications.ts`                          | `Controllers/notifications.ts`      | `Services/notification.ts`       | `Models/notifications.ts`, `Database/Schema/phase2/notifications.ts`         |

The shared `Database/Schema/index.ts` remains responsible for applying common columns, defining Sequelize tables, and wiring associations. Phase 2 column definitions live under `Database/Schema/phase2/`; module model files expose only the domain's records to services.
