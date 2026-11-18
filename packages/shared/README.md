# @hm/shared

Pure framework-free TypeScript contracts, types, and constants shared between `@hm/api` and `@hm/web`.

## Exports

- **Enums & Constants**: `STATUS`, `STATUS_CODES`, `STATUS_MESSAGES`, `MODULES`, `ACCESS_TYPES`, `ROLES`, `ACTIVITY_ACTIONS`, `EMPLOYMENT_STATUS`, `ASSET_STATUS`, `ASSET_CONDITIONS`, `SOFTWARE_CATEGORIES`, `SOFTWARE_LICENSE_TYPES`.
- **Contracts**: `ApiResponse<T>`, `ApiResult<T>`, `Paginated<T>`, `ListRequest`, `OptionsRequest`, `OptionsResponse`, `OptionItem`, `ApiError`.
- **DTOs**: `EmployeeDto`, `AssetDto`, `SoftwareDto`, `MaintenanceDto`.

## Build

```bash
npm run build --workspace=@hm/shared
```

Outputs ESM (`dist/index.mjs`), CJS (`dist/index.cjs`), and TypeScript declaration files (`dist/index.d.ts`) using `tsup`.
