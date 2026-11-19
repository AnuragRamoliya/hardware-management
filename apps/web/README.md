# @hm/web

The frontend web application for the IT Asset & Employee Management system. Built with React 18, Vite, Tailwind CSS, Radix UI primitives, React Hook Form, TanStack React Query, and Zustand.

---

## 1. Architecture & Structure

```
apps/web/src/
├── api/               # Typed REST API service layer per resource
├── components/
│   ├── auth/          # ProtectedRoute, permission guards, login forms
│   ├── common/        # CommonTable, ActionDialog, ConfirmDialog, States, Breadcrumb
│   ├── hook-form/     # FormProvider, RHFInput, RHFSelect, RHFSwitch, RHFPasswordField
│   ├── layout/        # AppShell, Sidebar, Header, MobileNav, live Notification Bell
│   └── ui/            # Shared Radix UI components (Button, Select, Dialog, Tabs, etc.)
├── hooks/
│   ├── queries/       # React Query hooks for fetching, mutating, and invalidating state
│   ├── use-debounce.ts
│   └── use-tableState.ts # Central table query state manager
├── lib/               # Axios HTTP client, token management, role utilities
├── pages/             # Route page views (Dashboard, Assets, Software, Requests, etc.)
├── routes/            # React Router 6 route definitions and navigation bridge
├── store/             # Zustand persistent auth and preference stores
└── types/             # Frontend interfaces, DTOs, and component prop types
```

---

## 2. Requirements & Setup

- **Node.js**: `>=22.23.4`
- **Backend API**: Running at `http://localhost:8000/`

Copy `.env.example` to `.env` in `apps/web/`:

```env
VITE_HOST_API=http://localhost:8000/
```

---

## 3. Scripts Reference

| Command                        | Description                                                      |
| :----------------------------- | :--------------------------------------------------------------- |
| `npm run dev`                  | Starts Vite local development server on `http://localhost:5173`  |
| `npm run build`                | Compiles and builds production assets with Vite                  |
| `npm run preview`              | Previews the production build locally                            |
| `npm run typecheck`            | Validates TypeScript types across the web app (`tsc -b`)         |
| `npm run lint`                 | Runs ESLint across all files                                     |
| `npm run test`                 | Runs unit tests (`vitest run --passWithNoTests`)                 |
| `npm run check:ui`             | Validates strict adherence to UI standards and shared components |
| `npm run gen:module -- <name>` | Scaffolds a complete web resource module                         |

---

## 4. UI Standards & Form Guidelines

1. **Shared Components Only (No One-Off Controls)**:
   - All screens are built using shared design system components (`src/components/ui/`, `src/components/common/`).
   - Native `<input>`, `<select>`, `<textarea>`, `<button>` elements outside `src/components/ui` are strictly forbidden.
   - Enforced automatically by `npm run check:ui`.

2. **Form Layout & Slide-out Drawers**:
   - Add/Edit forms render inside responsive `<Drawer>` slide-out panels (right drawer on desktop, full-screen sheet on mobile).
   - Layout is structured using `<FormGrid>` (default 2 columns):
     - Paired 50% inputs span 1 column (`span={1}`).
     - Multi-line textareas, security credentials, and full-width fields span both columns (`span={2}`).
   - Forms include sticky `<FormActions>` at the footer.

3. **Dirty-State Guard**:
   - Every form drawer includes unsaved changes detection (`isDirty`).
   - Attempting to close a modified drawer triggers the shared `<ConfirmDialog>` destructive modal to prevent accidental data loss.

4. **Data Tables & Pagination**:
   - Built on `CommonTable` providing sortable columns, debounced search, active filter count badges, column visibility toggles, CSV exports, mobile card view, and standard Radix `Select` for rows-per-page selection.
