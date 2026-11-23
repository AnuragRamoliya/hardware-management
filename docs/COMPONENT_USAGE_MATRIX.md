# Component Usage Matrix

This document tracks all form fields, input controls, filter selectors, and date/phone pickers across every page and overlay in the application.

## Enforcement Strategy

- **Shared Library Requirement**: Native `<input>`, `<select>`, `<textarea>` and raw third-party primitives outside `apps/web/src/components/ui`, `components/common`, and `components/hook-form` are strictly forbidden.
- **AST Scan Enforcement**: Checked via `scripts/check_field_usage.ts` and ESLint AST rules.
- **Runtime Guard**: Every shared component emits a `data-hm="<kind>"` attribute verified by the Playwright responsive and component harness.

## Field Inventory & Mapping

| Page / Overlay     | Route / Component   | Field Name / Purpose       | Field Kind     | Component Used              | `data-hm` Attribute    | Compliance Status |
| :----------------- | :------------------ | :------------------------- | :------------- | :-------------------------- | :--------------------- | :---------------- |
| **Authentication** | `/login`            | Email                      | text/email     | `RHFTextField`              | `data-hm="text"`       | Compliant         |
| **Authentication** | `/login`            | Password                   | password       | `RHFPasswordField`          | `data-hm="password"`   | Compliant         |
| **Employees**      | Add Employee Drawer | First Name, Last Name      | text           | `RHFTextField`              | `data-hm="text"`       | Compliant         |
| **Employees**      | Add Employee Drawer | Phone Number               | phone          | `RHFPhoneField` (Planned)   | `data-hm="phone"`      | Migrating         |
| **Employees**      | Add Employee Drawer | Department                 | select (async) | `RHFSelect`                 | `data-hm="select"`     | Compliant         |
| **Employees**      | Add Employee Drawer | Designation                | select (async) | `RHFSelect`                 | `data-hm="select"`     | Compliant         |
| **Employees**      | Add Employee Drawer | Joining Date               | date           | `RHFDatePicker` (Planned)   | `data-hm="date"`       | Migrating         |
| **Assets**         | Add Asset Drawer    | Purchase Date              | date           | `RHFDatePicker` (Planned)   | `data-hm="date"`       | Migrating         |
| **Assets**         | Add Asset Drawer    | Warranty Expiry            | date           | `RHFDatePicker` (Planned)   | `data-hm="date"`       | Migrating         |
| **Assets**         | Filter Panel        | Status / Category / Vendor | select         | `Select`                    | `data-hm="select"`     | In Review         |
| **Assets**         | Filter Panel        | Purchase Date Range        | date-range     | `DateRangePicker` (Planned) | `data-hm="date-range"` | Migrating         |
| **Software**       | Add License Dialog  | Expiry Date                | date           | `RHFDatePicker` (Planned)   | `data-hm="date"`       | Migrating         |
| **Reports**        | Report Filter Panel | Date Range                 | date-range     | `DateRangePicker` (Planned) | `data-hm="date-range"` | Migrating         |
| **Vendors**        | Add Vendor Drawer   | Contact Phone              | phone          | `RHFPhoneField` (Planned)   | `data-hm="phone"`      | Migrating         |

_(Matrix will be populated comprehensively by `scripts/check_field_usage.ts` in Part A)_
