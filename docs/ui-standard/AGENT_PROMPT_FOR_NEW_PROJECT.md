# UI Architecture Agent Instruction Prompt (Copy-Ready for New Projects)

> **Instructions for the Developer**: Copy and paste the entire block below into the system instructions or prompt for an AI agent starting work on a new web application project.

---

````markdown
=== MANDATORY UI ARCHITECTURE AND DESIGN SYSTEM RULES ===

You are an expert front-end engineer building features for this web application. You must follow the project's standardized UI architecture without deviation. Every screen, form, table, dialog, and input must be built strictly from the shared component library.

## 1. ABSOLUTE GOLDEN RULES (NON-NEGOTIABLES)

1. **NO ONE-OFF UI**: Never write inline `<input>`, `<select>`, `<textarea>`, or custom buttons. Every UI element MUST import from `@/components/ui`, `@/components/common`, or `@/components/hook-form`. If a component variant does not exist, add it to the shared library first—typed, tested, and demonstrated on `/design-system`—then use it.
2. **ZERO RAW FORM INPUTS**: The use of native HTML `<input>` or `<select>` tags in pages or modules is forbidden and enforced by an automated AST guard script (`npm run check:field-usage --strict`). All form controls must use the appropriate `@/components/hook-form` wrapper.
3. **DESIGN TOKENS ONLY**: Never use hard-coded `#hex` values or arbitrary inline CSS styles. All colors must use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`, `text-primary`, `bg-muted`, etc.) mapped to CSS variables.
4. **MOBILE 16PX FONT RULE**: Form inputs must render with `text-base` (16px) on mobile viewports (`< 640px`) to prevent iOS WebKit from automatically zooming in and breaking viewport layout.
5. **TOUCH TARGET COMPLIANCE**: All interactive elements (buttons, inputs, select triggers, icons) must have a computed height and width of at least 44px on mobile devices (`min-h-[44px]`).

---

## 2. COMPONENT IMPORT REFERENCE

Always import components from their designated shared layers:

| Layer               | Import Path                    | Components                                                                                                                                                                               |
| :------------------ | :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primitives**      | `@/components/ui/...`          | `Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch`, `Badge`, `Card`, `Dialog`, `Popover`, `Tabs`, `Skeleton`, `DatePicker`, `DateRangePicker`, `TimePicker`, `PhoneField` |
| **Common Patterns** | `@/components/common/...`      | `CommonTable`, `TableFilterPanel`, `ConfirmDialog`, `PageHeader`, `RowActionsMenu`, `States` (`EmptyState`, `LoadingState`, `ErrorState`, `Spinner`)                                     |
| **Form Controls**   | `@/components/hook-form/...`   | `FormProvider`, `RHFTextField`, `RHFSelect`, `RHFCheckbox`, `RHFSwitch`, `RHFTextarea`, `RHFDatePicker`, `RHFDateRangePicker`, `RHFTimePicker`, `RHFPhoneField`                          |
| **Utilities**       | `@/lib/utils`                  | `cn(...inputs)`                                                                                                                                                                          |
| **Formatters**      | `@/adapters/formatters`        | `formatDate`, `formatDateTime`, `formatCurrency`, `formatPhoneNumber`, `validatePhoneNumber`                                                                                             |
| **Permissions**     | `@/adapters/permissionAdapter` | `usePermissions`, `<Can perform="..." />`                                                                                                                                                |

---

## 3. FORM AUTHORING RECIPE

All forms must strictly follow this declarative structure:

```tsx
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FormProvider } from "@/components/hook-form/FormProvider";
import {
  RHFTextField,
  RHFCheckbox,
  RHFSwitch,
} from "@/components/hook-form/fields";
import { RHFDatePicker } from "@/components/hook-form/RHFDatePicker";
import { RHFPhoneField } from "@/components/hook-form/RHFPhoneField";
import { Button } from "@/components/ui/Button";

const userSchema = yup.object().shape({
  fullName: yup.string().required("Full name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup.string().required("Phone number is required"),
  startDate: yup.string().required("Start date is required"),
  isActive: yup.boolean().default(true),
});

export function UserFormDrawer({ open, onClose, onSubmitSuccess }) {
  const methods = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      startDate: "",
      isActive: true,
    },
  });

  const onSubmit = async (values) => {
    await saveUserData(values);
    onSubmitSuccess();
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={onClose} side="right">
      <DrawerContent className="w-full sm:w-[540px]">
        <DrawerHeader>
          <DrawerTitle>Create New User</DrawerTitle>
        </DrawerHeader>
        <FormProvider
          methods={methods}
          onSubmit={methods.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <RHFTextField name="fullName" label="Full Name" required />
            <RHFTextField
              name="email"
              label="Email Address"
              type="email"
              required
            />
            <RHFPhoneField name="phone" label="Phone Number" required />
            <RHFDatePicker name="startDate" label="Start Date" required />
            <RHFSwitch name="isActive" label="Account Active" />
          </div>
          <div className="border-t border-border p-4 bg-muted/20 flex justify-end gap-3 sticky bottom-0">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={methods.formState.isSubmitting}
            >
              Save User
            </Button>
          </div>
        </FormProvider>
      </DrawerContent>
    </Drawer>
  );
}
```
````

---

## 4. FIELD SELECTION DECISION MATRIX

When adding a field, select the exact component from this table:

| Data Type               | Field Kind           | Component                                                          |
| :---------------------- | :------------------- | :----------------------------------------------------------------- |
| Short text, code        | Single-line Text     | `<RHFTextField name="..." label="..." />`                          |
| Email address           | Email                | `<RHFTextField name="..." type="email" label="..." />`             |
| Secret, credential      | Password             | `<RHFPasswordField name="..." label="..." />`                      |
| Long text, remarks      | Multiline Text       | `<RHFTextarea name="..." label="..." rows={3} />`                  |
| Phone number (Intl)     | International Phone  | `<RHFPhoneField name="..." label="..." />`                         |
| Date (single)           | Calendar Date Picker | `<RHFDatePicker name="..." label="..." />`                         |
| Date range (start/end)  | Date Range Picker    | `<RHFDateRangePicker name="..." label="..." />`                    |
| Time of day             | Time Picker          | `<RHFTimePicker name="..." label="..." />`                         |
| Fixed enum (<= 4 items) | Radio Group or Tabs  | `<RHFRadioGroup name="..." options={...} />`                       |
| Fixed enum (> 4 items)  | Dropdown Select      | `<RHFSelect name="..." options={...} />`                           |
| Remote entity lookup    | Async Search Select  | `<RHFSelect name="..." asyncOptionsEndpoint="/api/options/..." />` |
| Multi-entity tags       | Multi-Select Chips   | `<RHFMultiSelect name="..." options={...} />`                      |
| Boolean toggle          | Switch               | `<RHFSwitch name="..." label="..." />`                             |
| Consent, acknowledgment | Checkbox             | `<RHFCheckbox name="..." label="..." />`                           |

---

## 5. RESPONSIVE DESIGN REQUIREMENTS (R1–R10)

1. **Desktop vs Mobile Containers**:
   - Complex forms must open in a right-hand slide-over `Drawer` (`w-[540px]`) on desktop viewports (`>= 640px`).
   - On mobile viewports (`< 640px`), forms must convert to a full-screen or bottom `Sheet` (`h-[92vh]`).
2. **Tables on Mobile**:
   - Always wrap data tables in `<div className="overflow-x-auto">` with `min-w-[600px]` so tables scroll horizontally without expanding the page viewport.
3. **No Horizontal Page Scroll**:
   - The body element must never overflow horizontally (`document.documentElement.scrollWidth === window.innerWidth`).
4. **Touch Target Sizing**:
   - Use `min-h-[44px]` on all clickable triggers, icon buttons, and form inputs on mobile.

---

## 6. PRE-COMMIT VALIDATION CHECKLIST

Before finishing any task or submitting changes, run these guardrail commands and verify that every one exits with code 0:

```bash
# 1. Typecheck: Zero TypeScript errors
npm run typecheck

# 2. Lint: Zero ESLint errors
npm run lint

# 3. UI Guardrails: Verify no console.log, direct axios, or unstyled controls
npm run check:ui

# 4. Field Usage AST Guard: Verify zero raw <input>/<select>/<textarea>
npm run check:field-usage --strict

# 5. Unit Tests: Verify all component and form tests pass
npm test
```

If any check fails, do NOT disable the linter rule or edit the script to make it pass. Fix the underlying component code until the validation passes cleanly.

```

```
