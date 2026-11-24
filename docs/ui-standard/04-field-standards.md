# Field Standards & Form Architecture Specification

**Generated**: 2026-11-24  
**Source Directory**: `apps/web/src/components/hook-form/`, `apps/web/src/components/ui/`  
**DOM Measurements Source**: `docs/ui-standard/field-measurements.json`  
**Measurement Script**: `scripts/ui-standard/measure-fields.ts` (evaluated via Playwright on `/design-system`)

---

## 1. Field Anatomy & Structural Hierarchy

Every form field in the application strictly adheres to a standard 5-part anatomical structure:

```
┌──────────────────────────────────────────────────────────┐
│ Label Text * (Required Marker in text-danger)           │  <- 1. Label
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [Prefix/Icon]  Field Input Value      [Suffix/Clear] │ │  <- 2. Control Container
│ └──────────────────────────────────────────────────────┘ │
│ Helper text or guidance message                         │  <- 3. Helper / Hint
│ ⚠️ Validation error message (in text-danger text-xs)    │  <- 4. Error Message
└──────────────────────────────────────────────────────────┘
```

1. **Label**: Rendered via `<label className="text-sm font-medium text-foreground">` with `htmlFor={name}`. If required, followed by `<span className="text-danger ml-0.5">*</span>`.
2. **Control Box**: Shared primitive with `data-hm` guard attribute, rounded corners (`rounded-md` = 8px), border token `border-input`.
3. **Prefix / Suffix**: Integrated inside control (e.g., currency `₹`/`$`, search icon, password visibility toggle, clear icon).
4. **Helper Text**: `<p className="text-xs text-muted-foreground mt-1">` providing contextual guidance.
5. **Error Message**: `<p className="text-xs text-danger font-medium mt-1" role="alert">` rendered when validation fails; control receives `aria-invalid="true"`.

---

## 2. Real Browser DOM Measurements on `/design-system`

Measured across both **Desktop (1440x900)** and **Mobile (360x740)** viewports:

| Field Kind        | Control Component              | Desktop Height    | Mobile Height | Desktop Font     | Mobile Font (iOS Zoom Guard) | Border Radius      | Focus Ring / Outline             |
| :---------------- | :----------------------------- | :---------------- | :------------ | :--------------- | :--------------------------- | :----------------- | :------------------------------- |
| **Text**          | `Input` / `RHFTextField`       | 40px              | 40px          | 14px (`text-sm`) | **16px (`text-base`)**       | 8px (`rounded-md`) | `ring-2 ring-ring ring-offset-2` |
| **Textarea**      | `Textarea` / `RHFTextArea`     | min 80px          | min 80px      | 14px             | **16px**                     | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Number**        | `Input[type="number"]`         | 40px              | 40px          | 14px             | **16px**                     | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Currency**      | `RHFCurrencyField`             | 40px              | 40px          | 14px             | **16px**                     | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Password**      | `RHFPasswordField`             | 40px              | 40px          | 14px             | **16px**                     | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Phone**         | `PhoneField` / `RHFPhoneField` | 40px              | 40px          | 14px             | **16px**                     | 0px 8px 8px 0px    | `ring-2 ring-ring ring-offset-2` |
| **Phone Trigger** | Country Code Button            | **44px**          | **44px**      | 14px             | 14px                         | 8px 0px 0px 8px    | `ring-2 ring-ring ring-offset-2` |
| **Date**          | `DatePicker` / `RHFDatePicker` | 40px              | 40px          | 14px             | 14px                         | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Date Range**    | `DateRangePicker`              | 40px              | 40px          | 14px             | 14px                         | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Time**          | `TimePicker` / `RHFTimePicker` | 40px              | 40px          | 14px             | 14px                         | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Select**        | `SelectTrigger` / `RHFSelect`  | 40px (or 36px sm) | 40px          | 14px             | 14px                         | 8px                | `ring-2 ring-ring ring-offset-2` |
| **Switch**        | `Switch` / `RHFSwitch`         | 20px (track)      | 20px          | N/A              | N/A                          | 9999px (full)      | `ring-2 ring-ring ring-offset-2` |
| **Checkbox**      | `Checkbox` / `RHFCheckbox`     | 16px              | 16px          | N/A              | N/A                          | 4px                | `ring-2 ring-ring ring-offset-2` |

> [!NOTE]
> **iOS Auto-Zoom Guard**: On mobile viewports (<= 640px), text inputs automatically adopt `text-base` (16px computed font-size) via Tailwind class `text-base sm:text-sm`. This strictly prevents Mobile Safari and Chromium iOS from automatically zooming and distorting the page layout on input focus.

---

## 3. Comprehensive Field Kinds Register

### 1. Text Field

- **Component**: `Input` (`src/components/ui/input.tsx`)
- **RHF Wrapper**: `RHFTextField` (`src/components/hook-form/fields.tsx:84`)
- **Value Contract**: `string` (trimmed on submit)
- **Validation**: `yup.string().required(FORM_VALIDATION.required).max(100)`

### 2. Textarea Field

- **Component**: `Textarea` (`src/components/ui/textarea.tsx`)
- **RHF Wrapper**: `RHFTextArea` (`src/components/hook-form/fields.tsx:112`)
- **Value Contract**: `string`
- **Validation**: `yup.string().max(1000)`

### 3. Number Field

- **Component**: `Input` (`type="number"`)
- **RHF Wrapper**: `RHFNumberField` (`src/components/hook-form/fields.tsx:140`)
- **Value Contract**: `number | null` (parsed via `Number(val)`)
- **Validation**: `yup.number().typeError(FORM_VALIDATION.mustBeNumber).min(0)`

### 4. Currency Field

- **Component**: `Input` with currency prefix (`₹` or `$`)
- **RHF Wrapper**: `RHFCurrencyField` (`src/components/hook-form/fields.tsx:168`)
- **Value Contract**: `number` (stored in base currency, e.g. INR / USD)
- **Validation**: `yup.number().positive().required()`

### 5. Password Field with Generator & Strength Meter

- **Component**: `Input` with visibility toggle icon + `PasswordStrengthMeter`
- **RHF Wrapper**: `RHFPasswordField` (`src/components/hook-form/fields.tsx:210`)
- **Value Contract**: `string`
- **Validation**: `yup.string().min(8).matches(/[A-Z]/).matches(/[0-9]/).matches(/[^a-zA-Z0-9]/)`

### 6. Phone Field with Country Code & Dial Code Selector

- **Component**: `PhoneField` (`src/components/ui/phone-field/PhoneField.tsx`)
- **RHF Wrapper**: `RHFPhoneField` (`src/components/hook-form/RHFPhoneField.tsx`)
- **Features**: Country flag & dial code popover search, national number formatting on type, paste handler.
- **Value Contract**: Strict **E.164 string format** (e.g. `+919876543210`, `+12025550143`).
- **Validation**: `yup.string().test("is-phone", FORM_VALIDATION.invalidPhone, (val) => isValidPhoneNumber(val))`

### 7. Modern Date Picker

- **Component**: `DatePicker` (`src/components/ui/date-picker/DatePicker.tsx`)
- **RHF Wrapper**: `RHFDatePicker` (`src/components/hook-form/RHFDatePicker.tsx`)
- **Features**: Quick month/year dropdowns, clear button, accessible day-picker grid.
- **Value Contract**: String `YYYY-MM-DD` (**zero UTC drift guarantee**).
- **Validation**: `yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, FORM_VALIDATION.invalidDate)`

### 8. Date Range Picker

- **Component**: `DateRangePicker` (`src/components/ui/date-picker/DateRangePicker.tsx`)
- **RHF Wrapper**: `RHFDateRangePicker` (`src/components/hook-form/RHFDateRangePicker.tsx`)
- **Features**: Presets (Today, Last 7d, Last 30d, This Month, Indian FY).
- **Value Contract**: Object `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }`.

### 9. Time Picker

- **Component**: `TimePicker` (`src/components/ui/date-picker/TimePicker.tsx`)
- **RHF Wrapper**: `RHFTimePicker` (`src/components/hook-form/RHFTimePicker.tsx`)
- **Features**: 12-hour AM/PM and 24-hour hour/minute listboxes.
- **Value Contract**: String `HH:mm`.

### 10. Date & Time Combined Picker

- **Component**: `DateTimePicker` (`src/components/ui/date-picker/DateTimePicker.tsx`)
- **RHF Wrapper**: `RHFDateTimePicker` (`src/components/hook-form/RHFDateTimePicker.tsx`)
- **Value Contract**: ISO-8601 string `YYYY-MM-DDTHH:mm:ss`.

### 11. Select (Single Value)

- **Component**: `SelectTrigger` & `SelectList` (`src/components/ui/select/`)
- **RHF Wrapper**: `RHFSelect` (`src/components/hook-form/fields.tsx:320`)
- **Value Contract**: `string` or `number` (e.g. enum key or ID string).

### 12. Async Select (Server-driven Options)

- **Component**: `RHFAsyncSelect` (`src/components/hook-form/fields.tsx:480`)
- **Features**: Debounced search, react-query caching, hydration of prefilled ID into label.
- **Value Contract**: `string` (foreign key ID).

### 13. MultiSelect Field

- **Component**: `RHFMultiSelect` (`src/components/hook-form/fields.tsx:640`)
- **Features**: Removable tag chips inside trigger, searchable option list.
- **Value Contract**: `string[]` (array of selected ID strings).

### 14. Segmented Control

- **Component**: `RHFSegmentedControl` (`src/components/hook-form/fields.tsx:750`)
- **Features**: Pill button group for 2-4 mutual exclusive options.
- **Value Contract**: `string`.

### 15. Switch Field

- **Component**: `Switch` (`src/components/ui/switch.tsx`)
- **RHF Wrapper**: `RHFSwitch` (`src/components/hook-form/fields.tsx:810`)
- **Value Contract**: `boolean` (`true` / `false`).

### 16. Checkbox Field

- **Component**: `Checkbox` (`src/components/ui/checkbox.tsx`)
- **RHF Wrapper**: `RHFCheckbox` (`src/components/hook-form/fields.tsx:840`)
- **Value Contract**: `boolean`.

### 17. Radio Group Field

- **Component**: `RadioGroup` & `Radio` (`src/components/ui/radio.tsx`)
- **RHF Wrapper**: `RHFRadioGroup` (`src/components/hook-form/fields.tsx:870`)
- **Value Contract**: `string`.

### 18. Tags Input Field

- **Component**: `RHFTagsInput` (`src/components/hook-form/fields.tsx:910`)
- **Features**: Press `Enter` or `,` to add chip, backspace to delete.
- **Value Contract**: `string[]`.

### 19. File Upload Field

- **Component**: `RHFFileUpload` / `RHFFileField` (`src/components/hook-form/fields.tsx:960`)
- **Features**: Drag-and-drop zone, file size/type validation, upload progress indicator.
- **Value Contract**: `File | null` or uploaded URL string.

### 20. Search Field

- **Component**: `RHFSearchInput` (`src/components/hook-form/fields.tsx:1020`)
- **Features**: Leading search icon, debounced typing (300ms), trailing clear button.
- **Value Contract**: `string`.

### 21. OTP / PIN Input

- **Component**: `RHFOtpInput` (`src/components/hook-form/fields.tsx:1060`)
- **Features**: 4 or 6 discrete input cells, auto-focus next on digit input, backspace navigation.
- **Value Contract**: `string`.

---

## 4. Async Options Endpoint Contract

All `RHFAsyncSelect` and `TableFilterPanel` dropdowns consume a unified REST API contract:

### Request Query Parameters

```http
GET /api/{resource}/options?search=eng&page=1&limit=50&status=active
```

- `search` (optional string): Case-insensitive substring match on name/label.
- `page` (number, default: 1): Page number for infinite scroll.
- `limit` (number, default: 50): Number of options per page.
- `ids` (optional comma-separated string, e.g. `?ids=12,15`): Hydration parameter used in edit drawers to prefetch specific record labels before user searches.

### Response Payload Structure

```json
{
  "message": "Options retrieved successfully",
  "data": [
    {
      "value": "12",
      "label": "Engineering Department",
      "subLabel": "Code: ENG-01",
      "disabled": false
    },
    {
      "value": "15",
      "label": "Human Resources",
      "subLabel": "Code: HR-01",
      "disabled": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## 5. Validation Architecture & Server Error Normalization

- **Yup Schema Convention**: Every form defines a co-located schema `<ModuleName>.schema.ts`.
- **Validation Messages**: Sourced from shared `FORM_VALIDATION` constants to guarantee uniform copy across all screens:
  ```typescript
  export const FORM_VALIDATION = {
    required: "This field is required",
    email: "Please enter a valid email address",
    invalidPhone: "Please enter a valid phone number with country code",
    invalidDate: "Please enter a valid date in YYYY-MM-DD format",
    minLength: (n: number) => `Must be at least ${n} characters`,
    maxLength: (n: number) => `Must not exceed ${n} characters`,
    positiveNumber: "Must be a positive number",
  };
  ```
- **Server Error Normalization**: When an API endpoint returns HTTP 422 Unprocessable Entity, the error response is parsed into `{ [fieldName]: string }` and mapped directly into React Hook Form via:
  ```typescript
  Object.entries(apiErrors).forEach(([field, message]) => {
    methods.setError(field as any, { type: "server", message });
  });
  ```

---

## 6. Field Decision Table: Data Type -> Shared Component

| Backend Data Type / Concept          | Recommended Shared Component    | RHF Wrapper Component | Value Contract                    |
| :----------------------------------- | :------------------------------ | :-------------------- | :-------------------------------- |
| **Short text (Name, Title, Code)**   | `Input`                         | `RHFTextField`        | `string`                          |
| **Long text (Description, Remarks)** | `Textarea`                      | `RHFTextArea`         | `string`                          |
| **Numeric quantity (Count, Stock)**  | `Input[type="number"]`          | `RHFNumberField`      | `number`                          |
| **Money / Price (Cost, Salary)**     | `Input` (currency formatted)    | `RHFCurrencyField`    | `number`                          |
| **Password / Secret**                | `Input[type="password"]`        | `RHFPasswordField`    | `string`                          |
| **Phone number**                     | `PhoneField`                    | `RHFPhoneField`       | `string` (E.164: `+<cc><number>`) |
| **Calendar Date (Birth, Purchase)**  | `DatePicker`                    | `RHFDatePicker`       | `string` (`YYYY-MM-DD`)           |
| **Date Range (Report range, FY)**    | `DateRangePicker`               | `RHFDateRangePicker`  | `{ from: string; to: string }`    |
| **Time of day**                      | `TimePicker`                    | `RHFTimePicker`       | `string` (`HH:mm`)                |
| **Timestamp (Schedule time)**        | `DateTimePicker`                | `RHFDateTimePicker`   | `string` (`YYYY-MM-DDTHH:mm:ss`)  |
| **Fixed enum (< 5 choices)**         | `RHFSegmentedControl` / `Radio` | `RHFSegmentedControl` | `string`                          |
| **Fixed enum (>= 5 choices)**        | `SelectTrigger`                 | `RHFSelect`           | `string` / `number`               |
| **Foreign key ID (User, Category)**  | `SelectTrigger` (Async)         | `RHFAsyncSelect`      | `string` (ID)                     |
| **Multiple foreign keys / Roles**    | `RHFMultiSelect`                | `RHFMultiSelect`      | `string[]`                        |
| **Boolean toggle (Active, Enabled)** | `Switch`                        | `RHFSwitch`           | `boolean`                         |
| **Single boolean agreement (Terms)** | `Checkbox`                      | `RHFCheckbox`         | `boolean`                         |
| **File / Document attachment**       | `RHFFileUpload`                 | `RHFFileUpload`       | `File` or URL `string`            |
| **Search query string**              | `Input` (search variant)        | `RHFSearchInput`      | `string`                          |
| **Verification Code (MFA, PIN)**     | `RHFOtpInput`                   | `RHFOtpInput`         | `string`                          |
