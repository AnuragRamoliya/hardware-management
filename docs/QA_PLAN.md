# Phase 8 QA Plan: Full Product Verification & Quality Engineering

## 1. Executive Summary & Scope

The goal of Phase 8 is comprehensive quality assurance across the entire Hardware Management product. This encompasses all backend micro-services, APIs, database transactions, background workers, WebSocket gateways, and frontend user interfaces across mobile and desktop breakpoints.

### Core Objectives

1. **Zero Untested Modules**: Implement rigorous unit and integration tests across all 20 API modules and all Web UI subsystems.
2. **Deterministic Quality Gates**: Enforce strict coverage thresholds (Lines $\ge$ 85% on services/utils, $\ge$ 80% on routes/controllers, $\ge$ 90% on schemas) with zero skips.
3. **Property-Based Verification**: Apply property testing with `fast-check` to all core pure utilities (filters, options, sorting, formatting, crypto).
4. **Usability & Accessibility**: Run full heuristic evaluations (Nielsen 10), WCAG 2.1 AA audits (`vitest-axe` and Playwright Axe), and cross-browser E2E testing (Chromium, Firefox, WebKit) with `--repeat-each=3`.
5. **Red-Green Bug Workflow**: Every discovered defect is logged in `docs/BUGS.md`, reproduced with a failing test, resolved, and verified via a dedicated regression test naming the bug ID.

---

## 2. Risk Ranking & Module Classification

Modules are categorized into three risk tiers based on business criticality, data privacy, concurrency exposure, and security sensitivity:

| Tier       | Risk Level          | Modules                                                                                                                                                                                            | Key Focus Areas                                                                                                                                                |
| :--------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1** | **Critical / High** | 1. Auth & Users<br>2. Roles & Permissions (RBAC)<br>3. Credential Vault<br>4. Activity & Access Logs (Hash Chain)<br>5. Offboarding<br>6. Requests & Approvals<br>7. Software & License Allocation | Token security, cryptographic safety, IDOR resistance, tamper detection, state machine validity, concurrent seat consumption, multi-approver deadlocks.        |
| **Tier 2** | **Medium**          | 8. Assets & Inventory<br>9. Asset Assignments<br>10. Asset Maintenance<br>11. Employees<br>12. Realtime WebSocket Gateway<br>13. Reports & Async Export Jobs<br>14. Jobs & Schedulers              | State transitions, concurrent assignment conflicts, soft-delete exclusion, WebSocket authentication & room isolation, large dataset exports, cron idempotency. |
| **Tier 3** | **Standard**        | 15. Master Data (Depts, Desigs, Locs, Vendors, Cats)<br>16. Dashboard Summaries<br>17. Notifications & Preferences<br>18. Settings (App Settings)<br>19. Middleware<br>20. Pure Utilities          | CRUD boundaries, unique constraints, payload decryption, error contract consistency, options building, pagination stability.                                   |

---

## 3. Test Types & Standards

### 3.1 API Unit & Integration Standards (11 Mandatory Facets per Module)

1. **Happy Path**: Complete coverage of all service methods, controller actions, and HTTP routes.
2. **Validation & Boundaries**: Null/undefined inputs, empty strings, boundary lengths, invalid enums, non-existent foreign keys (`validateExists`), and duplicate constraints.
3. **Authorization & RBAC**: Unauthenticated (401), unauthorized roles (403), employee own-data restrictions.
4. **State Transitions**: Exhaustive verification of allowed vs forbidden state changes (e.g. Asset: AVAILABLE $\to$ ASSIGNED vs ARCHIVED $\to$ ASSIGNED).
5. **Atomic Transactions**: Midway failure simulation proving 100% rollback of primary records, audit logs, and realtime events.
6. **Soft Delete Compliance**: Verifying `status: 2` items are omitted from lists, options, and foreign key references where disallowed.
7. **Listing & Pagination**: Pagination bounds (page 0, high pages, item limits), deterministic sorting, filter combinations, sanitization of SQL/script injection payloads.
8. **Concurrency**: Real parallel operations testing race conditions (e.g. 2 users taking last seat, 2 approvers on 1 credential).
9. **Idempotency & Timezones**: Re-running tasks and cron jobs yielding identical state; boundary times in `Asia/Kolkata`.
10. **Property-Based Testing**: `fast-check` generators for pure utilities (filters, options builder, pagination, sorting, redaction, date helpers).
11. **Error Contract**: Normalized `{ message, data }` responses with no internal stack traces or database error leaks.

### 3.2 Web UI & Component Standards

1. **Shared Design System**: Verify rendering, props, variants, disabled states, keyboard accessibility, and ARIA compliance with `vitest-axe`.
2. **Yup Schemas**: Complete validation rule coverage matching backend validation contracts.
3. **Columns, Filters & Badges**: Exhaustive status badge tone coverage with neutral fallback for unknown keys.
4. **Hooks & Global Stores**: Query cache invalidation, API error normalization, token refresh/expiration handling, offline recovery.
5. **RTL Page Walkthroughs**: Testing dirty state guards, prefill skeletons, dynamic select hydration, and keyboard navigation.

### 3.3 UI/UX & Browser Verification

- **Playwright Cross-Browser**: Chromium, Firefox, WebKit on headless runners with `--repeat-each=3`.
- **Responsive Viewports**: 360px (mobile card conversion, zero horizontal scroll), 768px (tablet), 1024px (desktop), 1440px (wide desktop).
- **Usability Heuristics**: Detailed walkthrough of user journeys against Nielsen's 10 usability heuristics recorded in `docs/UX_REVIEW.md`.

---

## 4. Quality Gate Thresholds

| Area / Package               | Metric                   | Threshold                                             |
| :--------------------------- | :----------------------- | :---------------------------------------------------- |
| **API Services & Utils**     | Line / Branch Coverage   | $\ge$ 85% Lines / $\ge$ 75% Branches                  |
| **API Controllers & Routes** | Line Coverage            | $\ge$ 80% Lines                                       |
| **API Background Jobs**      | Line Coverage            | $\ge$ 85% Lines                                       |
| **Web Schemas**              | Line Coverage            | $\ge$ 90% Lines                                       |
| **Web Hooks & Stores**       | Line Coverage            | $\ge$ 85% Lines                                       |
| **Web Shared Components**    | Line Coverage            | $\ge$ 80% Lines                                       |
| **Web Pages & Forms**        | Line Coverage            | $\ge$ 65% Lines                                       |
| **Mutation Testing**         | Mutation Score (Stryker) | $\ge$ 70% on critical security/business logic         |
| **Playwright E2E**           | Stability                | 100% pass across Chromium, Firefox, WebKit (repeat=3) |
