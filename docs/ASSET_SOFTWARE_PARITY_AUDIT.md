# Asset & Software UI Parity Audit (Baseline vs Employee Golden Reference)

> **Standardization Contract**: Bring the Assets and Software modules (and all sub-modules) into exact parity with the Employee golden reference module and [docs/UI_STANDARDS.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-app/hardware-management-web/docs/UI_STANDARDS.md).  
> Audit Date: **November 18, 2026**

---

## 1. Screen-by-Screen Parity Matrix

| Screen / Sub-Module | Employee Equivalent | What Differs (Gaps vs Standard) | Files to Change |
|---|---|---|---|
| **Assets List** (`/assets`) | Employees List (`ResourcePage` + `employeeConfig`) | No row selection, no `BulkActionBar`, custom inline `AssetStatus` instead of `StatusBadge`, no permission gating on Add action, inline `useQuery` and `useMutation`, columns defined inline instead of separate file, inline filter config. | `src/pages/Assets.tsx`, `src/pages/AssetsColumns.tsx`, `src/pages/AssetsFilters.ts`, `src/hooks/queries/assets.ts` |
| **Unassigned Assets** (`/assets/unassigned`) | Employees List (filtered view) | Shares monolithic `AssetsList` component with boolean prop, no dedicated column preset, no bulk assign toolbar, inline queries. | `src/pages/Assets.tsx`, `src/pages/AssetsColumns.tsx` |
| **AddEditAsset** (Form Drawer) | AddEdit Employee Drawer in `ResourcePage.tsx` | Uses modal `Dialog` instead of `Drawer` (desktop) / full-screen `Sheet` (mobile); raw state object (`useState<Record<string, string>>`) instead of `FormProvider`; raw `<select>` in `EndpointSelect`; no `FormSection`, `FormGrid`, or `FormActions`; no dirty guard (`useFormDrawer`); no prefill skeleton; no co-located Yup schema. | `src/components/assets/AddEditAsset.tsx`, `src/components/assets/Asset.schema.ts`, `src/pages/Assets.tsx` |
| **AssetDetail** (`/assets/:id`) | `EmployeeDetail.tsx` (header, tabs, overview) | Tabs are raw `<button>` elements with inline border classes instead of standard Radix/Tailwind tabs; overview is a basic `<dl>` without `KeyValueEditor`; assignment history, maintenance, accessories, and activity render ad-hoc cards with `Records` helper instead of standard timeline/table components; QR label lacks dedicated modal; retire/restore action lacks standard menu. | `src/pages/AssetDetail.tsx`, `src/components/assets/AssetQrModal.tsx`, `src/hooks/queries/assets.ts` |
| **AssignAssetDialog** | Employee action dialogs | Modal dialog with ad-hoc `form` state, raw native `<select>` for employee, lacks current-state summary card (asset tag, condition, current status), lacks conflict error display, inline mutation. | `src/components/assets/AssignAssetDialog.tsx`, `src/components/assets/AssetAction.schema.ts` |
| **ReturnAssetDialog** | Employee return action | Simple confirm/state trigger; lacks formal return form (condition selection, return notes, destination status: available / maintenance / retired / lost). | `src/components/assets/ReturnAssetDialog.tsx`, `src/components/assets/AssetAction.schema.ts` |
| **TransferAssetDialog** | Employee action dialog | Ad-hoc modal, native selects, lacks current assignee vs new assignee summary card, lacks dirty validation. | `src/components/assets/TransferAssetDialog.tsx`, `src/components/assets/AssetAction.schema.ts` |
| **Bulk Assign / Bulk Return Dialogs** | Employee bulk actions bar | Completely missing from UI; table does not expose row selection checkboxes or `BulkActionBar`. | `src/components/assets/BulkAssignAssetDialog.tsx`, `src/components/assets/BulkReturnAssetDialog.tsx`, `src/pages/Assets.tsx` |
| **Asset Import Dialog** | Employee CSV/XLSX Import Dialog | Custom modal with raw `<input type="file">`, custom error table, missing authenticated template download button, non-standard layout. | `src/components/assets/AssetImportDialog.tsx`, `src/pages/Assets.tsx` |
| **Maintenance List** (`/asset-maintenance`) | Employees List (`CommonTable`) | Columns defined inline in `Maintenance.tsx`, inline `useQuery`, badge uses basic logic instead of `StatusBadge` + constants, complete action missing from list rows, no drawer form for adding maintenance. | `src/pages/Maintenance.tsx`, `src/pages/MaintenanceColumns.tsx`, `src/pages/MaintenanceFilters.ts`, `src/hooks/queries/maintenance.ts` |
| **MaintenanceForm & Complete Action** | Standard AddEdit Drawer / Action Dialog | Maintenance creation only exists inside asset row actions using ad-hoc inputs; no dedicated `AddEditMaintenance` drawer form; "Complete Maintenance" action dialog with resolution and final cost is missing. | `src/components/maintenance/AddEditMaintenance.tsx`, `src/components/maintenance/CompleteMaintenanceDialog.tsx`, `src/components/maintenance/Maintenance.schema.ts` |
| **Software List** (`/software`) | Employees List (`ResourcePage` + `employeeConfig`) | Columns defined inline, uses raw `<select>` in `AsyncOptionSelect`, no bulk actions, Add/Edit software is an inline modal `Dialog` with raw `form` state, no `FormProvider`, no `FormSection`, no `FormGrid`, no `FormActions`, no Yup schema, seat usage is plain text. | `src/pages/Software.tsx`, `src/pages/SoftwareColumns.tsx`, `src/pages/SoftwareFilters.ts`, `src/components/software/AddEditSoftware.tsx`, `src/components/software/Software.schema.ts`, `src/hooks/queries/software.ts` |
| **SoftwareDetail** (`/software/:id`) | `EmployeeDetail.tsx` (header, tabs, overview) | Tabs are raw `<button>` elements; Overview is raw `<dl>` without `KeyValueEditor`; Licenses tab uses raw HTML `<table>` with inline styles instead of `CommonTable`; Assigned users uses custom cards with inline revoke mutation; Add license uses an inline modal `Dialog` with native inputs; activity tab is plain text paragraphs. | `src/pages/SoftwareDetail.tsx`, `src/components/software/AddEditLicenseDialog.tsx`, `src/components/software/License.schema.ts`, `src/hooks/queries/software.ts` |
| **Licenses List & AddEditLicense** | Employee sub-lists & drawers | Embedded raw `<table>` in `SoftwareDetail.tsx`, ad-hoc form with native inputs (`<input type="password">`, `<input type="date">`), lacks `FormProvider`, lacks masked key toggle, lacks prefill skeleton. | `src/components/software/AddEditLicenseDialog.tsx`, `src/components/software/LicenseColumns.tsx`, `src/components/software/License.schema.ts` |
| **AssignSoftwareDialog & Revoke Dialog** | Employee action dialogs | Inline modal with raw `<select>` and raw `form` state; revoke is a raw button without standard confirm layout; lacks dependent license filtering (showing available seats). | `src/components/software/AssignSoftwareDialog.tsx`, `src/components/software/RevokeSoftwareDialog.tsx`, `src/components/software/BulkAssignSoftwareDialog.tsx` |
| **EmployeeDetail "Hardware" & "Software" Tabs** | Employee Overview Cards | Ad-hoc card layout with inline buttons; return/revoke actions use raw mutations without `ConfirmDialog`; lacks due-date/warranty chips; lacks mobile card toggle. | `src/pages/EmployeeDetail.tsx` |
| **Portal MyAssets & MySoftware** | Employee self-service views | Render ad-hoc grid cards with inline `useQuery`, lacking responsive table/card view switching, empty state illustrations, and consistent token styling. | `src/pages/PortalAssets.tsx`, `src/pages/PortalSoftware.tsx` |
| **Dashboard Asset & Software Cards** | `StatCard` component in `Dashboard.tsx` | Cards use custom markup instead of shared `StatCard` primitive; missing icon/size/spacing tokens parity. | `src/pages/Dashboard.tsx` |
| **Sidebar Groups & Notifications** | `AppShell.tsx` navigation & badges | Slight icon/size/spacing misalignment; notifications popover lacks standardized tone badges and clear visual hierarchy. | `src/components/layout/AppShell.tsx`, `src/pages/Notifications.tsx` |

---

## 2. Deviations in Employee Module (Where UI_STANDARDS.md Wins)

While the Employee module serves as the functional golden reference, several patterns in `ResourcePage.tsx` and `EmployeeDetail.tsx` deviate from `UI_STANDARDS.md`:
1. **Drawer Container**: `ResourcePage.tsx` uses a modal `Dialog` for employee creation/editing, whereas `UI_STANDARDS.md` mandates `Drawer` on desktop and full-screen `Sheet` on mobile. The standardized modules will implement `Drawer` + `Sheet`.
2. **Form Layout Primitives**: `ResourcePage.tsx` renders fields in a dynamic two-column grid without explicit `FormSection` headings or `FormGrid` wrappers. The new asset and software forms will implement clean semantic sections ("Basic Details", "Purchase & Warranty", "Specifications", "Notes").
3. **Query Hook Modularization**: `ResourcePage.tsx` and `EmployeeDetail.tsx` define queries inline. As required by `UI_STANDARDS.md`, all queries and mutations for Assets, Software, and Maintenance will be organized into dedicated modules in `src/hooks/queries/`.
4. **Action Confirmations**: `EmployeeDetail.tsx` performs immediate return/revoke on button clicks without confirmation. The standardized dialogs will always confirm destructive operations via `ConfirmDialog`.

---

## 3. Baseline ("Before") Screenshots Catalog

Screenshots were captured at **1440px** (desktop) and **360px** (mobile) in light mode and stored in `docs/parity/before/`:

- `employees_list_1440.png` / `employees_list_360.png` (Golden Reference)
- `employee_detail_1440.png` / `employee_detail_360.png`
- `employee_detail_hardware_1440.png` / `employee_detail_hardware_360.png`
- `employee_detail_software_1440.png` / `employee_detail_software_360.png`
- `assets_list_1440.png` / `assets_list_360.png`
- `assets_add_dialog_1440.png` / `assets_add_dialog_360.png`
- `assets_unassigned_1440.png` / `assets_unassigned_360.png`
- `asset_detail_1440.png` / `asset_detail_360.png`
- `asset_detail_history_1440.png` / `asset_detail_history_360.png`
- `asset_detail_maintenance_1440.png` / `asset_detail_maintenance_360.png`
- `asset_detail_accessories_1440.png` / `asset_detail_accessories_360.png`
- `asset_detail_activity_1440.png` / `asset_detail_activity_360.png`
- `maintenance_list_1440.png` / `maintenance_list_360.png`
- `software_list_1440.png` / `software_list_360.png`
- `software_add_dialog_1440.png` / `software_add_dialog_360.png`
- `software_detail_1440.png` / `software_detail_360.png`
- `software_detail_licenses_1440.png` / `software_detail_licenses_360.png`
- `software_detail_users_1440.png` / `software_detail_users_360.png`
- `software_detail_activity_1440.png` / `software_detail_activity_360.png`
- `dashboard_1440.png` / `dashboard_360.png`
- `notifications_1440.png` / `notifications_360.png`
- `portal_assets_1440.png` / `portal_assets_360.png`
- `portal_software_1440.png` / `portal_software_360.png`
