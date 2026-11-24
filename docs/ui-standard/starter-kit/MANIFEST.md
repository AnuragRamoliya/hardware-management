# UI Standard Starter Kit Manifest

**Version**: 1.0.0  
**License**: MIT / Proprietary  
**Compatibility**: React >= 18.2, Tailwind CSS >= 3.4, TypeScript >= 5.0

---

## 1. Directory Structure

```
starter-kit/
├── tokens/
│   ├── globals.css           # Semantic CSS variables for light & dark themes
│   ├── tailwind.preset.js    # Tailwind configuration preset
│   └── tokens.json           # Machine-readable token definitions
├── lib/
│   └── utils.ts              # cn() utility (clsx + tailwind-merge)
├── adapters/
│   ├── apiClient.ts          # Generic API client wrapper (fetch-based)
│   ├── permissionAdapter.ts  # PermissionProvider, usePermissions(), and <Can />
│   └── formatters.ts         # Date, currency, and phone formatters
├── hooks/
│   └── use-debounce.ts       # Debounce state hook
├── components/
│   ├── ui/                   # Portable UI Primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Checkbox.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── Switch.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── popover.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tabs.tsx
│   │   ├── date-picker/      # DatePicker, DateRangePicker, TimePicker
│   │   ├── select/           # Multi-select, Searchable select
│   │   └── phone-field/      # International phone input with country select
│   ├── common/               # Shared Composite Components
│   │   ├── CommonTable.tsx   # Searchable, sortable, paginated table
│   │   ├── TableFilterPanel.tsx # Chip filter bar
│   │   ├── ConfirmDialog.tsx # Accessible confirmation modal
│   │   ├── PageHeader.tsx    # Header with title & breadcrumbs
│   │   ├── RowActionsMenu.tsx # Action dropdown
│   │   └── States.tsx        # EmptyState, LoadingState, ErrorState, Spinner
│   └── hook-form/            # React Hook Form Integrations
│       ├── FormProvider.tsx
│       ├── fields.tsx        # RHFTextField, RHFCheckbox, RHFSwitch, RHFTextarea
│       ├── RHFDatePicker.tsx
│       ├── RHFDateRangePicker.tsx
│       ├── RHFTimePicker.tsx
│       └── RHFPhoneField.tsx
├── scripts/
│   ├── check-ui.mjs          # AST & regex anti-regression linter
│   └── check-field-usage.ts  # Guardrail blocking unauthorized native inputs
├── pages/
│   └── DesignSystemPage.tsx  # Full showcase / living kitchen-sink page
└── tests/
    └── StarterKit.test.tsx   # Vitest verification suite
```

---

## 2. Declared NPM Dependencies

To consume this starter kit, install the following packages in your target project:

### Runtime Dependencies

```bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-switch class-variance-authority clsx date-fns lucide-react react-day-picker react-hook-form tailwind-merge
```

### Dev Dependencies

```bash
npm install -D tailwindcss postcss autoprefixer typescript @types/react @types/react-dom vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 3. Quickstart Integration (30-Minute Guide)

1. **Copy Files**: Copy `starter-kit/` into your project's `src/` folder.
2. **Add Tailwind Preset**: In your `tailwind.config.js`, import and add `presets: [require('./src/tokens/tailwind.preset.js')]`.
3. **Import CSS**: In your entry point (`main.tsx` or `App.tsx`), add `import "./tokens/globals.css"`.
4. **Wire Permissions**: Wrap your root provider with `<PermissionProvider permissions={userPermissions}>`.
5. **Add Guardrail Scripts**: Add `"check:ui": "node src/scripts/check-ui.mjs"` to your `package.json`.
6. **Mount Design System**: Route `/design-system` to `<DesignSystemPage />` to inspect all components.
