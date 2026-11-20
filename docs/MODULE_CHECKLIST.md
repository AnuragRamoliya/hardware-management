# New/refactored module checklist

## Build a module in about 10 minutes

1. Add the typed API contract under `src/api/<resource>/index.ts`; define route strings in `src/api/endpoint.ts` only when needed.
2. Add module enums, labels, and badge tones to `src/utils/constants.ts` (or a focused resource constants file).
3. Add typed query/mutation hooks under `src/hooks/queries/<resource>.ts`; mutations own API message toasts and related query invalidation.
4. Add `<Resource>Filters.ts`, `<Resource>Columns.tsx`, and a `CommonTable` list page with `PageHeader`, `useTableState`, filter chips/panel, error/retry, skeleton, empty, mobile card behavior, permissions, and row/bulk actions.
5. Add `components/<resource>/AddEdit<Resource>.tsx` and `<Resource>.schema.ts`. Use `FormProvider`, `FormSection`, `FormGrid`, RHF fields, `Drawer`/mobile sheet behavior, dirty-close guard, and `FormActions`.
6. Add action/import dialogs only when needed; use RHF fields, Yup schema, `ConfirmDialog` for destructive actions, and row-level import reports.
7. Add a detail page if the resource has a detail route: header/status/actions, accessible tabs, overview key/value display, history, activity.
8. Register `PATHS`, lazy route, `PermissionGuard`, sidebar group/permission, resource constants, and API activity/options as applicable.
9. Add component/page tests, including success/error, filter state, permissions, keyboard operation, and responsive/mobile states.
10. Run `npm run lint`, `npm run check:ui`, `npm run typecheck`, `npm test`, and `npm run build`; use the visual/a11y checks listed below before marking responsive/a11y complete.

## Pull request checks

- [ ] API payloads, URL, permissions, and behavior are unchanged unless the PR explicitly changes the contract.
- [ ] One schema per form beside the form; schema messages come from `FORM_VALIDATION`; reusable validators are used.
- [ ] IDs use select fields, enums use constants, money/phone/date/boolean use the dedicated RHF field.
- [ ] Form sections/grid/actions, pending state, edit prefill, dirty-close guard, and reset-after-success follow `UI_STANDARDS.md`.
- [ ] List uses `PageHeader` + shared toolbar/filters/chips + `CommonTable`; mobile has a card layout.
- [ ] Destructive actions are confirmed; toast text uses API messages; React Query keys are invalidated by mutation hooks.
- [ ] Route, sidebar, toolbar, row, bulk, and export visibility follow module permissions; server authorization is retained.
- [ ] No native controls outside `components/ui`, direct axios outside `src/api`, unjustified `any`, console logging, hard-coded hex colors, or `window.location` navigation.
- [ ] Unit and browser tests cover the form, list filters, errors, role access, and keyboard access.
- [ ] Verified 360/768/1024/1440 widths, light/dark parity, no page horizontal scroll, keyboard/focus behavior, and axe checks. Screenshots are forbidden; UI is verified in a real browser at the local URL and results are recorded as text in `docs/UI_BROWSER_TEST_RESULTS.md`.
- [ ] Related API lint/typecheck/tests/build, migration/seed, and smoke checks pass when API behavior is touched.
