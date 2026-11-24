# Front-End Architecture & Conventions Specification

**Generated**: 2026-11-24  
**Source Directory**: `apps/web/src/`  
**Configuration**: `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `packages/eslint-config/`

---

## 1. Directory Tree & Naming Architecture

```
apps/web/src/
├── api/                  <- API transport, endpoint dictionary, and resource services
├── components/           <- Shared UI primitives and domain modules
│   ├── ui/               <- Low-level design system primitives (Button, Input, DatePicker)
│   ├── common/           <- Composed patterns (CommonTable, TableFilterPanel, PageHeader)
│   ├── hook-form/        <- React Hook Form integrations (RHFTextField, RHFSelect)
│   ├── layout/           <- Shell layout (AppShell, Navigation, TopHeader)
│   └── <module>/         <- Domain-specific UI pieces (employees/, assets/, software/)
├── hooks/                <- Reusable utility hooks and React Query resource hooks
│   └── queries/          <- Resource-scoped queries and mutations (employee.ts, asset.ts)
├── lib/                  <- Core libraries (queryClient, realtime, utils)
├── pages/                <- Route-level page components (Employees.tsx, Dashboard.tsx)
├── routes/               <- Route configuration (paths.ts, sections.tsx, navigation.ts)
├── schemas/              <- Shared validation schemas
├── types/                <- Global TypeScript definitions
├── utils/                <- Formatters, enum mappings, and constants
└── zustand/              <- Client-side application state stores (auth, permissions, theme)
```

### Naming Conventions

- **Component Files**: PascalCase (`CommonTable.tsx`, `PageHeader.tsx`, `AddEditEmployee.tsx`).
- **Hook Files**: camelCase prefixed with `use` (`useTableState.ts`, `useEmployeesQuery.ts`).
- **Utility / Script Files**: kebab-case or camelCase (`date-utils.ts`, `measure-fields.ts`).
- **Directory Names**: kebab-case (`asset-categories/`, `date-picker/`, `hook-form/`).

---

## 2. Standard Module File Structure

Every domain resource follows a standardized file decomposition:

```
src/
├── api/<module>/index.ts            <- Typed endpoint calls
├── hooks/queries/<module>.ts        <- React Query hooks with structured query keys
├── pages/<Pascal>.tsx               <- List page route
├── pages/<Pascal>Detail.tsx         <- Detail page route (if entity has 360-view)
└── components/<module>/
    ├── AddEdit<Pascal>.tsx          <- Drawer / Sheet form component
    ├── <Pascal>.schema.ts           <- Yup schema using FORM_VALIDATION messages
    ├── <Pascal>Columns.tsx          <- Table column definitions with StatusBadge
    ├── <Pascal>Filters.ts           <- Filter definitions for TableFilterPanel
    └── <Pascal>Dialogs.tsx          <- Action dialogs (assign, return, approve)
```

---

## 3. Routing Architecture

- **Path Dictionary (`src/routes/paths.ts`)**: All URLs are declared as string constants in a single centralized dictionary:
  ```typescript
  export const PATHS = {
    ROOT: "/",
    LOGIN: "/login",
    DASHBOARD: "/dashboard",
    EMPLOYEES: "/employees",
    EMPLOYEE_DETAIL: "/employees/:id",
    ASSETS: "/assets",
    // ...
  };
  ```
- **Code Splitting & Lazy Loading (`src/routes/sections.tsx`)**:
  - Every route-level page is imported via `React.lazy()` to maintain minimal initial bundle size:
    ```typescript
    const EmployeesPage = lazy(() =>
      import("@/pages/Employees").then((m) => ({ default: m.Employees })),
    );
    ```
  - Routes are wrapped in a central `<Suspense fallback={<LoadingState />}>`.
- **Permission & Auth Guards**:
  - `AuthGuard`: Checks token in `useAuthStore`. Redirects unauthenticated users to `/login`.
  - `PermissionGuard`: Evaluates user permissions. Renders `ForbiddenState` (403) if unauthorized.

---

## 4. API Layer Architecture & Error Normalization

- **HTTP Transport (`src/api/callApi.ts`)**:
  - Wrapped Axios client handling JWT session headers (`token` and custom header `plain-text: "true"`).
  - Centralized refresh token queue (`refreshSession()`) preventing parallel refresh storms on 401s.
- **Endpoint Dictionary (`src/api/endpoint.ts`)**:
  - Centralized dictionary of REST endpoints (`endPoints.employees.list`, `endPoints.assets.create`).
- **Response Envelope Contract**:
  ```typescript
  export interface ApiResponse<T> {
    message: string;
    data: T;
    pagination?: PaginationMeta;
  }
  ```
- **Error Normalization**:
  - Catches network, 401, 403, 404, 422, and 500 responses.
  - Formats errors into a predictable result:
    ```typescript
    export interface ApiResult<T> {
      status: boolean;
      message: string;
      data?: T;
      errors?: Record<string, string>;
    }
    ```

---

## 5. React Query Conventions

- **Query Key Factories (`src/hooks/queries/<resource>.ts`)**:
  - Standardized hierarchal array query keys ensuring granular invalidation:
    ```typescript
    export const employeeKeys = {
      all: ["employees"] as const,
      lists: () => [...employeeKeys.all, "list"] as const,
      list: (params: Record<string, any>) =>
        [...employeeKeys.lists(), params] as const,
      details: () => [...employeeKeys.all, "detail"] as const,
      detail: (id: string | number) => [...employeeKeys.details(), id] as const,
      options: (query?: string) =>
        [...employeeKeys.all, "options", query] as const,
    };
    ```
- **Mutation Invalidation**:
  - All write mutations (`create`, `update`, `delete`, `statusChange`) automatically invalidate their respective resource lists and related dropdown option caches in `onSuccess`.

---

## 6. Client State Stores (Zustand)

Application state is kept minimal, partitioned across dedicated stores:

1. `useAuthStore` (`src/zustand/user-store.ts`): Stores JWT access token, refresh token, user profile, and role.
2. `usePermissionStore` (`src/zustand/permission-store.ts`): Caches permission set for RBAC evaluation.
3. `useThemeStore` (`src/zustand/themeStore.ts`): Manages Light/Dark mode state and synchronizes with localStorage and `<html>` classes.

---

## 7. Realtime Client (`src/lib/realtime.ts`)

- Realtime notification delivery and live status updates implemented via WebSocket/SSE client.
- Auto-reconnect with exponential backoff and message deduplication.

---

## 8. Error Boundary & Test Conventions

- **Error Boundary (`src/components/common/ErrorBoundary.tsx`)**:
  - React error boundary wrapping top-level application and individual module routes.
  - Catches runtime rendering exceptions and displays `ErrorState` with retry option and error log identifier.
- **Test Conventions (Vitest + React Testing Library)**:
  - Co-located unit tests (`*.test.tsx`).
  - Shared test environment setup in `src/test/setup.ts` configuring `@testing-library/jest-dom` matchers and mock matchMedia / ResizeObserver polyfills.

---

## 9. Generic vs. Project-Specific Separation

To enable portability to other projects, the front-end code is partitioned into two clear categories:

| Layer / Folder              | Generic (Portable to Another Project)                                                                         | Project-Specific (Domain / Backend Coupled)                               |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------ |
| **`components/ui/`**        | ✅ **100% Portable** (Button, Input, Textarea, DatePicker, PhoneField, Switch, Checkbox, Radio, Dialog, Tabs) | None                                                                      |
| **`components/common/`**    | ✅ **Portable with Adapter** (`CommonTable`, `TableFilterPanel`, `ConfirmDialog`, `PageHeader`, `States`)     | Role/permission helpers in `RowActionsMenu`                               |
| **`components/hook-form/`** | ✅ **100% Portable** (All `RHF*` input wrappers and `FormProvider`)                                           | None                                                                      |
| **`lib/`**                  | ✅ `utils.ts` (`cn`, `twMerge`), `queryClient.ts`                                                             | `roles.ts`, backend SSE channels in `realtime.ts`                         |
| **`routes/`**               | ⚠️ Generic routing pattern and lazy suspense wrapper                                                          | Specific URL paths in `paths.ts` and route map in `sections.tsx`          |
| **`api/`**                  | ⚠️ Architecture pattern of `callApi` and `endpoint.ts`                                                        | Hardcoded backend headers (`token`, `plain-text`), specific API endpoints |
| **`zustand/`**              | ⚠️ Store architecture                                                                                         | Specific user roles and domain permission flags                           |
| **`components/<module>/`**  | ❌ Project-specific domain implementations                                                                    | Domain business logic (assets, hardware, software licenses, offboarding)  |
