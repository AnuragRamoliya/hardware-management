# Web UI standards

This document is the contract for new modules and refactors. Copy the closest pattern and keep server behavior in React Query/API layers.

## Page patterns

### List

Use `ResourcePage` as the config-driven reference and `CommonTable` for resource lists. Keep one query state (`useTableState`), debounced general search, filters in `filters`, and reset `currentPage` to `1` whenever filters/search change. `CommonTable` owns sorting, selection, column visibility, density, export, loading skeletons, mobile cards, empty state, and pagination.

```tsx
<PageHeader title="Employees" description="Manage employee records." action={<Button onClick={openCreate}><Plus />Add employee</Button>} />
<CommonTable
  columns={employeeColumns}
  rows={query.data?.rows ?? []}
  count={query.data?.count ?? 0}
  query={tableState}
  onQueryChange={setTableState}
  loading={query.isLoading}
  error={query.error?.message}
  onRetry={() => void query.refetch()}
  filterFields={employeeFilters}
/>
```

The table toolbar keeps search, the Filters button and active count, reset, view/density, and export together. Keep filter definitions in `<Resource>Filters.ts`; use `TableFilterPanel` for async selects, ranges, and booleans. Destructive row actions open `ConfirmDialog`. Use `Button` for actions and an accessible menu for crowded row actions. Do not add a second pagination or filter implementation beside `CommonTable`.

### Detail

Follow `AssetDetail`: `PageHeader` with breadcrumbs and status/actions; keyboard-operable tabs; overview as labeled key/value pairs; assignment/history and maintenance as readable timelines or records; activity through the activity endpoint. Keep IDs out of user-facing labels when a related display object exists.

### Form and action dialog

Desktop forms open in `Drawer`; on mobile the drawer fills the viewport. Show a loading skeleton while edit data is fetched. Keep form content scrollable and actions sticky. Do not close a dirty form without asking. Only the primary Save action submits the form; Cancel is `type="button"`.

```tsx
<FormProvider methods={methods} onSubmit={methods.handleSubmit(save)}>
  <FormSection title="Employee details" description="Basic work information.">
    <FormGrid>
      <RHFTextField name="first_name" label="First name" required autoFocus />
      <RHFAsyncSelect name="department_id" label="Department" endpoint="department/options" required />
    </FormGrid>
  </FormSection>
  <FormActions submitting={methods.formState.isSubmitting} onCancel={requestClose} />
</FormProvider>
```

Use `FormProvider` from `components/hook-form/form-provider.tsx`; `FormSection`, `FormGrid`, and `FormActions` from `components/common/FormLayout.tsx`; RHF fields from `components/hook-form/fields.tsx`. Put one yup schema beside each form as `<FormName>.schema.ts`. Validation messages come from `FORM_VALIDATION` and shared validators. Reset only after a successful mutation; toast the API message and invalidate query keys from the mutation hook.

Action dialogs use the same RHF fields and validation. Assign, return, and transfer forms show current state and only expose valid actions. Imports use a dedicated file picker, authenticated template download, pending state, and a row-error report table.

### Portal

Follow `PortalAssets` and `PortalSoftware`: read-only self data, compact cards on mobile, full table from `md`, clear status/date chips, and no client-supplied employee ID. Keep empty/loading/error states explicit.

## Field catalogue

| Data | Component |
| --- | --- |
| Plain text, email, URL | `RHFTextField` with the right input type |
| Password / confirmation | `RHFPasswordField` |
| Integer / decimal | `RHFNumberField` |
| Currency | `RHFCurrencyField` |
| Long text | `RHFTextArea` |
| Foreign key / ID | `RHFSelect` or `RHFAsyncSelect`; hydrate selected labels |
| Multi-valued foreign keys | `RHFMultiSelect` |
| Enum | `RHFSelect` or `RHFSegmentedControl` with module constants |
| Date / date interval | `RHFDatePicker` / `RHFDateRangePicker` |
| Boolean | `RHFSwitch` |
| Yes/no choice | `RHFRadioGroup` |
| Repeated tags / key-values | `RHFTagsInput` / shared `KeyValueEditor` |
| Phone, OTP, file, image | `RHFPhoneInput`, `RHFOtpInput`, `RHFFileUpload`, `RHFImageUpload` |

Every field has an associated label. Required fields show `*` and also validate. Put helper text under the control; replace it with the inline error when invalid. Use concise examples as placeholders, not as labels. Autofocus only the first field when a form opens. Native form submit preserves Enter-to-submit for text inputs.

## Data, names, and access

- API request/response types live in `src/api/<resource>/index.ts` and shared types in `src/types`.
- React Query hooks live in `src/hooks/queries/<resource>.ts`: `useXList`, `useX`, `useCreateX`, `useUpdateX`, `useDeleteX`. Mutations own toast and invalidation; pages do not pass refetch callbacks into forms.
- One `<resource>Constants.ts` owns enum values, labels, and badge tones. Use `StatusBadge` or a resource wrapper around it.
- Per-resource files: `components/<resource>/AddEdit<Resource>.tsx`, `<Resource>.schema.ts`, `<Resource>Columns.tsx`, `<Resource>Filters.ts`, and focused dialogs. Pages use plural names; routes are in `PATHS`; sidebar and guards use module permission constants.
- Keep auth/permission gating on routes, sidebar entries, create/edit/delete actions, bulk actions, and export. A hidden button is not API authorization.

## Responsive, accessibility, and theme

Use the shared spacing and color tokens (`bg-card`, `text-muted-foreground`, `border-input`, `text-danger`, etc.), never literal hex colors. Design mobile first: one form column below `md`, two at `md`, three at `xl`; dialogs become full-screen sheets below `md`; tables become cards below `md`. Avoid page-level horizontal scrolling; allow it only inside a table or tab strip. Interactive targets are at least 40px high. Preserve focus on close, expose expanded/selected/invalid states with ARIA, support keyboard operation, respect reduced motion, and check light/dark parity. Verify representative pages at 360, 768, 1024, and 1440px.
