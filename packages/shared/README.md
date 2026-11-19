# @hm/shared

Pure, framework-free TypeScript contracts, types, enums, real-time events, and constants shared between `@hm/api` and `@hm/web`.

---

## 1. Exports Overview

- **Core Enums & Constants**:
  - `STATUS`, `STATUS_CODES`, `STATUS_MESSAGES`
  - `MODULES`, `ACCESS_TYPES`, `ROLES`, `ACTIVITY_ACTIONS`
  - `EMPLOYMENT_STATUS`, `ASSET_STATUS`, `ASSET_CONDITIONS`
  - `SOFTWARE_CATEGORIES`, `SOFTWARE_LICENSE_TYPES`
  - `CREDENTIAL_CATEGORIES`
  - `REQUEST_TYPES`, `REQUEST_PRIORITIES`, `REQUEST_STATUSES`, `REQUEST_TRANSITIONS`
  - `OFFBOARDING_CASE_STATUSES`, `OFFBOARDING_TASK_TYPES`, `OFFBOARDING_TASK_STATUSES`, `OFFBOARDING_CASE_TRANSITIONS`
- **Real-Time Push Events & Room Matrix**:
  - `REALTIME_EVENTS`: `notification:new`, `notification:count`, `request:status_changed`, `request:comment_added`, `credential:approved`, `offboarding:task_updated`, `inventory:alert`
  - `REALTIME_ROOMS`: Helper functions for generating room strings (`userRoom`, `roleRoom`, `requestRoom`, `offboardingRoom`)
- **API Contracts**:
  - `ApiResponse<T>`, `ApiResult<T>`, `Paginated<T>`
  - `ListRequest`, `OptionsRequest`, `OptionsResponse`, `OptionItem`, `ApiError`
- **DTOs**:
  - `EmployeeDto`, `AssetDto`, `SoftwareDto`, `MaintenanceDto`, `CredentialDto`, `RequestDto`, `OffboardingCaseDto`, `OffboardingTaskDto`

---

## 2. Build & Scripts

```bash
# Build TypeScript declaration files, ESM, and CJS
npm run build --workspace=@hm/shared

# Run strict typecheck
npm run typecheck --workspace=@hm/shared
```

Outputs ESM (`dist/index.js`), CJS (`dist/index.cjs`), and declaration types (`dist/index.d.ts`) via `tsup`.
