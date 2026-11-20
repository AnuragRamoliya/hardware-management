# Agent Operating Standards & Browser-Based Verification Guidelines

## 1. Browser-Driven Functional & Realtime Verification

All UI testing is conducted in a real browser context against the live local application URL (e.g. `http://localhost:5173`).

- **No Screenshots**: Screenshots, image snapshots, before/after graphics, and video artifacts are strictly prohibited from commits.
- **Textual Evidence Only**: All behavioral verifications (DOM state, route changes, network calls, console logs, a11y violations) are recorded in `docs/UI_BROWSER_TEST_RESULTS.md`.
- **Axe Audits**: Every page must achieve zero axe accessibility violations (excluding intentional decorative elements).
- **Responsive Assertions**: Widths 360px, 768px, 1024px, and 1440px are asserted programmatically via `document.scrollWidth <= window.innerWidth` and touch targets >= 44px.

## 2. Standard Monorepo Conventions

- **Golden Reference**: The Employee module (`apps/web/src/pages/Employees.tsx`, `EmployeeDetail.tsx`, `apps/api/Controllers/employee.ts`, `Services/employee.ts`) represents the golden standard. All other modules mirror its patterns.
- **No One-Off UI**: Shared components only (`src/components/ui`, `src/components/common`, `src/components/hook-form`).
- **Data Flow**: Strict React Query hooks with targeted invalidation on realtime websocket events.
- **Quality Gates**: Every change must pass `check:ui`, `lint`, `typecheck`, `test`, `build`, and Playwright E2E with zero diagnostics.
