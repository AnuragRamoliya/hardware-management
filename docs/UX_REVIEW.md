# UX & Design System Heuristic Review

**Review Date**: 2026-11-23  
**Auditor**: Antigravity QA Engineering Team  
**Evaluation Scope**: Web Frontend (`apps/web`), Design System (`components/ui`, `components/common`, `components/hook-form`), Viewports (360px, 768px, 1024px, 1440px), Themes (Light & Dark), Accessibility (WCAG 2.1 AA / Axe).

---

## 1. Usability Heuristics Evaluation (Nielsen Norman 10 Heuristics)

### 1. Visibility of System Status

- **Status Badges**: Categorical entity states across Assets, Requests, Offboarding, and Licenses use strictly typed `StatusBadge` components with high-contrast text and background tokens.
- **Real-Time Indicators**: Live notification bell badge increments dynamically via Socket.IO events (`notification:created`) without requiring manual page refresh.
- **Asynchronous Operations**: Export generation displays indeterminate progress in the `ExportsDrawer`, with live polling and WebSockets transitioning to `COMPLETED` or `FAILED`.
- **Loading Skeletons**: Pre-fill skeletons render during async data hydration in edit dialogs, preventing Cumulative Layout Shift (CLS).

### 2. Match Between System and the Real World

- Standard terminology matching industry hardware asset lifecycle (`AVAILABLE`, `ASSIGNED`, `IN_REPAIR`, `ARCHIVED`).
- Clear currency formatting with standard ISO currency codes (`USD`, `EUR`, `INR`) and locale-aware number parsing.
- Intuitive date selectors and date bounds enforcing chronological business rules (`warranty_end >= warranty_start`, `due_return_date >= assigned_at`).

### 3. User Control and Freedom

- **Destructive Action Safeguards**: All critical operations (asset retirement, license revocation, offboarding clearance issuance, user deactivation) require confirmation via `ConfirmDialog`.
- **Dirty-State Guards**: Unsaved changes in multi-field drawers/sheets trigger navigation confirmation dialogs before unmounting.
- **Cancel Support**: Portal employees can cancel pending requests prior to staff review with immediate UI and database state updates.

### 4. Consistency and Standards

- **Component Reusability**: 100% of screens adhere to the golden standard established by the Employee reference module. Zero native inputs, selects, or textareas exist outside `src/components/ui`.
- **Form Architecture**: Standard `FormProvider -> FormSection -> FormGrid -> RHFField -> FormActions` composition across all forms.
- **Design Tokens**: Standardized CSS variables for palette, typography, radii, elevation, and transitions (`globals.css`).

### 5. Error Prevention

- **Schema-Level Validation**: Synchronous client-side Yup schema validation blocks submission of incomplete or malformed data before network calls.
- **Password Enforcement**: Dynamic password generator and real-time entropy calculation (`PasswordStrengthMeter`) preventing weak credentials (<12 characters, complexity requirements).
- **Concurrency Protections**: Backend state machine guards reject race conditions (e.g. concurrent single-seat allocation or double approval) with explicit 409 Conflict / 400 Bad Request.

### 6. Recognition Rather Than Recall

- Global search with debounced asynchronous option fetching in `RHFAsyncSelect` displaying readable identifiers, category tags, and secondary metadata.
- Data table filters provide clear pill tags indicating active filter criteria with one-click clear mechanisms.

### 7. Flexibility and Efficiency of Use

- **Keyboard Shortcuts**: Full keyboard tab navigation, modal escape handling, and enter key submission across all forms.
- **Responsive Layout Adapters**: Full-width side drawers on desktop (1440px/1024px) automatically collapse into responsive full-screen bottom sheets on mobile viewports (360px).

### 8. Aesthetic and Minimalist Design

- Clean typographic hierarchy with readable line heights, neutral slate surfaces, subtle borders, and soft shadows (`shadow-soft`).
- Empty states featuring contextual vector iconography, informative copy, and clear primary call-to-action buttons.

### 9. Help Users Recognize, Diagnose, and Recover from Errors

- Co-located validation error messages directly under failing fields with accessible `aria-describedby` associations.
- Network and server failures trigger accessible `ErrorState` banners with retry mechanisms (`Try again`).

### 10. Help and Documentation

- Descriptive placeholder text, input helper tooltips, and explanatory field guidelines across technical asset specification fields.

---

## 2. Responsive Viewport Parity Audit

| Viewport           | Device Profile                | Horizontal Scroll     | Navigation Behavior                     | Form Layout                             | Table / List Behavior                           |
| :----------------- | :---------------------------- | :-------------------- | :-------------------------------------- | :-------------------------------------- | :---------------------------------------------- |
| **360px x 740px**  | Mobile Small (Android/iPhone) | **0px (No overflow)** | Collapsed bottom nav / hamburger drawer | 1-column stacked `FormGrid`             | Horizontal scroll container with sticky actions |
| **768px x 1024px** | Tablet Portrait (iPad)        | **0px (No overflow)** | Collapsible sidebar                     | 2-column responsive `FormGrid`          | Full table with responsive column priority      |
| **1024px x 768px** | Tablet Landscape / Laptop     | **0px (No overflow)** | Fixed sidebar icon navigation           | 2-3 column `FormGrid`                   | Full data grid with inline filters              |
| **1440px x 900px** | Desktop Standard              | **0px (No overflow)** | Full expanded sidebar                   | 3-column `FormGrid` with sticky actions | Full data table with KPI summary strip          |

---

## 3. Accessibility (A11y) & WCAG 2.1 AA Compliance

- **Automated Axe Audits**: Executed on Login, Verify Document, Dashboard, and Reports Catalogue via `@axe-core/playwright` and `vitest-axe`.
- **Result**: **0 Violations**.
- **Keyboard Focus Rings**: Prominent focus outline (`focus-visible:ring-2 focus-visible:ring-ring`) across all interactive controls.
- **Screen Reader Support**: Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<dialog>`), `aria-live="polite"` for toast and dynamic notification updates, accessible SVGs with `aria-hidden="true"`.
- **Theme Contrast**: Light mode and Dark mode tokens tested; background-to-text contrast ratios exceed WCAG AA threshold of 4.5:1 for normal text and 3:1 for large text.
