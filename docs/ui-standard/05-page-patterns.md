# Page and Pattern Standards Specification

**Generated**: 2026-11-24  
**Golden Reference**: `apps/web/src/pages/Employees.tsx` & `apps/web/src/components/employees/*`  
**Generator Reference**: `apps/web/scripts/gen-module.mjs`

---

## 1. Pattern 1: App Shell Architecture

### Recipe Summary

The top-level application wrapper managing persistent layout structure: responsive sidebar navigation, mobile navigation sheet, top utility bar, search, notification popover, user profile menu, and dark mode toggle.

- **Composing Components**:
  - `AppShell` (`src/components/layout/AppShell.tsx`)
  - Navigation Sidebar with active path highlighting
  - Mobile Sheet overlay (`role="dialog"`, `aria-label="Mobile navigation"`)
  - Top header (`z-20`) with search shortcut, notification bell with badge counter, and user avatar dropdown
  - Theme toggle button (`Sun` / `Moon` icons syncing with `useThemeStore`)
- **Required Props / State**:
  - `children: ReactNode`
  - Current user session (`useAuthStore`)
  - Notification count (`useNotificationStore`)
- **Responsive Behavior**:
  - Desktop (>= 1024px): 260px fixed left sidebar, main content with `pl-[260px]`.
  - Tablet (768px - 1023px): Collapsible navigation rail or top bar.
  - Mobile (<= 767px): Hamburger icon button (`aria-label="Open navigation menu"`), opens full-height navigation Sheet with focus trapping.
- **Minimal Real Code Example** (`apps/web/src/components/layout/AppShell.tsx:45`):
  ```tsx
  <div className="min-h-screen bg-background text-foreground">
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
      <NavBrand />
      <NavMenu items={NAVIGATION_ITEMS} />
    </aside>
    <div className="lg:pl-64 flex flex-col flex-1">
      <TopHeader onOpenMobileNav={() => setMobileOpen(true)} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  </div>
  ```

---

## 2. Pattern 2: List Page Architecture

### Recipe Summary

The standard full-featured data management view. Combines search, filter drawer, URL state synchronization, responsive table, pagination, row actions, bulk actions, and export.

- **Composing Components**:
  - `PageHeader` (`src/components/common/PageHeader.tsx`): Title, breadcrumbs, primary action button.
  - Toolbar container: Debounced `Input` (search), Filter trigger button with active filter counter badge, Column visibility dropdown, Export button.
  - `TableFilterPanel` (`src/components/common/TableFilters/TableFilterPanel.tsx`): Slide-over drawer with reset and apply buttons.
  - Active filter chips bar: Removable pills showing applied filters with "Clear all".
  - `CommonTable` (`src/components/common/CommonTable.tsx`): TanStack table wrapper with sorting, loading skeletons, and empty state.
  - Mobile fallback: Card list representation on viewports <= 640px.
- **URL Synchronization**: Table state (`page`, `limit`, `search`, `sortBy`, `sortOrder`, filter keys) is synchronized to URL query parameters via `useSearchParams` to ensure shareable, refresh-safe URLs.
- **Minimal Real Code Example** (`apps/web/src/pages/Employees.tsx:85`):
  ```tsx
  export function Employees() {
    const { params, setParam, resetParams } = useTableUrlState();
    const { data, isLoading } = useEmployeesQuery(params);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
      null,
    );

    return (
      <div className="space-y-4">
        <PageHeader
          title="Employees"
          breadcrumbs={[{ label: "Directory" }, { label: "Employees" }]}
          actions={
            <Button
              onClick={() => {
                setSelectedEmployee(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          }
        />
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search employees..."
            value={params.search || ""}
            onChange={(e) => setParam("search", e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4 mr-2" /> Filters{" "}
            {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </div>
        <CommonTable
          columns={employeeColumns}
          data={data?.items || []}
          totalCount={data?.total || 0}
          isLoading={isLoading}
        />
        <AddEditEmployee
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          employeeId={selectedEmployee?.id}
        />
      </div>
    );
  }
  ```

---

## 3. Pattern 3: Form in Drawer / Sheet Architecture

### Recipe Summary

The mandatory form pattern for creating and editing entities. Rendered in a right-hand slide-over Drawer on desktop and full-screen Sheet on mobile.

- **Composing Components & Order**:
  ```
  Drawer / Sheet
  └─ FormProvider (react-hook-form)
     └─ form (onSubmit={handleSubmit})
        ├─ DrawerHeader (Title & Description)
        ├─ DrawerBody (overflow-y-auto max-h-[calc(100dvh-140px)])
        │  └─ FormSection (Logical grouping card)
        │     └─ FormGrid (1/2/3 responsive columns)
        │        └─ RHF Field Components (RHFTextField, RHFSelect, etc.)
        └─ FormActions (Sticky bottom footer)
           ├─ Button variant="outline" (Cancel)
           └─ Button type="submit" (Submit with loading spinner)
  ```
- **Mandatory Behaviors**:
  1. **Dirty State Guard**: If form is dirty (`formState.isDirty`), closing via Escape, overlay click, or Cancel prompts a confirmation alert to prevent accidental data loss.
  2. **Prefill Skeleton**: When `isEdit=true` and data is loading, renders form skeleton fields rather than an empty form.
  3. **Sticky Actions**: Form footer is sticky (`sticky bottom-0 bg-card border-t border-border p-4`) so Save/Cancel buttons remain accessible during long scrolling.
  4. **Submit-in-Flight**: Submit button shows `<Spinner />` and disables inputs during network submission.
- **Minimal Real Code Example** (`apps/web/src/components/employees/AddEditEmployee.tsx:120`):
  ```tsx
  <Drawer open={open} onOpenChange={handleCloseGuard}>
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="flex flex-col h-full"
      >
        <DrawerHeader>
          <DrawerTitle>
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingPrefill ? (
            <FormPrefillSkeleton />
          ) : (
            <FormSection title="Personal Information">
              <FormGrid cols={2}>
                <RHFTextField name="first_name" label="First Name" required />
                <RHFTextField name="last_name" label="Last Name" required />
                <RHFPhoneField name="phone" label="Phone Number" required />
                <RHFTextField name="email" label="Work Email" required />
              </FormGrid>
            </FormSection>
          )}
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseGuard}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Employee" : "Create Employee"}
          </Button>
        </div>
      </form>
    </FormProvider>
  </Drawer>
  ```

---

## 4. Pattern 4: Action Dialog Architecture

### Recipe Summary

A focused, modal dialog for medium-complexity multi-step actions (e.g. Assign Asset to Employee, Transfer License, Return Equipment).

- **Composing Components**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `ActionDialogLayout`.
- **Dimensions & Responsive Contract**: Centered on desktop (`max-w-lg lg:max-w-xl`), max height `max-h-[92dvh]`, full-width with safe-area padding on mobile.
- **Minimal Real Code Example** (`apps/web/src/components/assets/AssignAssetDialog.tsx:55`):
  ```tsx
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[92dvh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Assign Asset</DialogTitle>
        <DialogDescription>
          Assign this asset to an active employee.
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        <RHFAsyncSelect name="employee_id" label="Employee" required />
        <RHFDatePicker name="assigned_date" label="Assignment Date" required />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleAssign}>Confirm Assignment</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```

---

## 5. Pattern 5: Confirm Dialog for Destructive Actions

### Recipe Summary

An accessible, high-gravity confirmation dialog mandatory for all destructive actions (Delete, Terminate, Revoke, Retire).

- **Composing Component**: `ConfirmDialog` (`src/components/common/ConfirmDialog.tsx`).
- **Required Props**: `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `variant="danger"`, `onConfirm`, `isLoading`.
- **Accessibility**: Employs `role="alertdialog"`, `aria-labelledby`, `aria-describedby`, traps focus on the Cancel button by default to prevent accidental trigger on `Enter`.
- **Minimal Real Code Example** (`apps/web/src/pages/Assets.tsx:210`):
  ```tsx
  <ConfirmDialog
    open={deleteConfirmOpen}
    onOpenChange={setDeleteConfirmOpen}
    title="Delete Asset Record"
    description="Are you sure you want to delete asset AST-0021? This operation permanently removes the hardware record and history."
    variant="danger"
    confirmLabel="Delete Permanently"
    onConfirm={handleDeleteConfirm}
    isLoading={isDeleting}
  />
  ```

---

## 6. Pattern 6: Detail Page Architecture

### Recipe Summary

The canonical 360-degree view of a single entity.

- **Composing Components**:
  - Header card with avatar/icon, primary title, subtitle, status badge, and action buttons.
  - Tab navigation (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`): Overview, Assignments, Activity Timeline, Specifications.
  - `KeyValue` grid (`src/components/common/DataDisplay.tsx`): 2-4 column responsive grid of label/value pairs.
  - Timeline component (`src/components/common/Timeline.tsx`): Chronological log of audit events with icons and timestamps.
- **Minimal Real Code Example** (`apps/web/src/pages/EmployeeDetail.tsx:75`):
  ```tsx
  <div className="space-y-6">
    <PageHeader title={employee.fullName} breadcrumbs={BREADCRUMBS} />
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={employee.fullName} />
          <div>
            <h2 className="text-xl font-bold">{employee.fullName}</h2>
            <p className="text-sm text-muted-foreground">
              {employee.designation}
            </p>
          </div>
        </div>
        <StatusBadge status={employee.status} />
      </div>
    </Card>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="assets">Allocated Assets</TabsTrigger>
        <TabsTrigger value="timeline">History</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <KeyValueGrid items={OVERVIEW_FIELDS} data={employee} />
      </TabsContent>
    </Tabs>
  </div>
  ```

---

## 7. Pattern 7: Wizard / Stepper Architecture

### Recipe Summary

Multi-stage guided progression (e.g. Employee Offboarding flow, Bulk Hardware Ingestion).

- **Composing Component**: `Stepper` (`src/components/common/Stepper.tsx`).
- **Features**: Visual progress bar, step indicators with accessible step numbers (`aria-current="step"`), completed checks, Prev/Next navigation guards.

---

## 8. Pattern 8: Dashboard Architecture

### Recipe Summary

Metric overview screen balancing high-level telemetry and detailed tabular drill-downs.

- **Composing Components**:
  - KPI Stat Cards (`src/components/common/StatCard.tsx`): 1 to 4 responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`). Shows metric value, label, trend pill, and icon.
  - Chart Section (`src/components/common/Chart.tsx`): Responsive Recharts wrapper with accessible toggle between visual Chart and accessible HTML data Table.

---

## 9. Pattern 9: Notification Center Architecture

### Recipe Summary

Unified alert and message center.

- Top navigation popover displaying unread count and latest 5 notifications.
- Dedicated full page (`/notifications`) with tabbed filtering (All, Unread, Mentions, System), mark all as read action, and real-time push updates via SSE/WebSocket.

---

## 10. Pattern 10: Report & Analytics Page

### Recipe Summary

Report catalogue and report viewer (`/reports/*`).

- Filter bar with quick presets (`DateRangePicker`, Department select, Status filter).
- Export drawer (`ExportsDrawer.tsx`): Format selection (CSV, XLSX, PDF), column selection checkboxes, asynchronous generation with progress indicator.

---

## 11. Pattern 11: Permission-Gated UI Architecture

### Recipe Summary

Role-Based Access Control (RBAC) enforced declaratively across views and actions:

- **Component-Level Gate**: `<PermissionGate permission="employee.create">` hides or renders a disabled state with tooltip explaining insufficient permissions.
- **Route-Level Guard**: `ProtectedRoute` checks active permissions from `useAuthStore`. If unpermitted, renders `Forbidden` state rather than blank white screen.

---

## 12. Pattern 12: Empty, Loading, Error & 404 States

Every state is represented by a shared component from `src/components/common/States.tsx`:

- **Loading**: `LoadingState` with skeleton layout matching expected page shape.
- **Empty**: `EmptyState` with icon, title, description, and primary call-to-action button.
- **Error**: `ErrorState` with retry button.
- **Forbidden**: `ForbiddenState` (403) with back to dashboard button.
- **Not Found**: `NotFoundState` (404).

---

## 13. Pattern 13: Toast & Notification Copy Rules

- **Toast Library**: `sonner`.
- **Usage Rules**:
  - Triggered exclusively on completed user actions (Save, Delete, Update, Copy). Never on initial page load.
  - Position: `bottom-right` on desktop, `top-center` on mobile.
  - Format: Success (`toast.success("Employee created successfully")`), Error (`toast.error("Failed to update record: " + msg)`).

---

## 14. Golden Reference Module: Employees

The Employee module is the reference implementation:

```
apps/web/src/
├── api/employees/index.ts            <- Typed endpoints using callApi envelope
├── hooks/queries/employee.ts         <- React Query keys, list, detail, mutation hooks
├── pages/Employees.tsx               <- Standard List Page recipe
├── pages/EmployeeDetail.tsx          <- Standard Detail Page recipe
└── components/employees/
    ├── AddEditEmployee.tsx           <- Form in Drawer recipe (with dirty guard & prefill)
    ├── Employee.schema.ts            <- Yup validation using FORM_VALIDATION
    ├── EmployeeColumns.tsx           <- Table column definitions with StatusBadge & RowActionsMenu
    ├── EmployeeFilters.ts            <- Filter configuration consuming TableFilterPanel
    └── EmployeeImportDialog.tsx      <- CSV import action dialog recipe
```

### Module Generator (`gen:module`)

Scaffolding a new resource follows `apps/web/scripts/gen-module.mjs`:

```bash
npm run gen:module -- <resource-name> --fields "field1:text,field2:enum"
```

Generated artifacts:

1. `src/api/<resource>/index.ts`: Typed REST client.
2. `src/hooks/queries/<resource>.ts`: Query keys and React Query hooks.
3. `src/pages/<Pascal>.schema.ts`: Yup validation schema.
4. `src/pages/<Pascal>Filters.ts`: Filter panel definitions.
5. `src/pages/<Pascal>Columns.tsx`: Table column definitions.
6. `src/pages/<Pascal>.tsx`: Full List Page scaffold.
7. `src/pages/<Pascal>.test.tsx`: Vitest smoke test scaffold.
