# Full-System Test Plan & Golden Assertions Matrix

## 1. Scope & Strategy

This test plan defines the end-to-end verification strategy for the IT Asset Management (ITAM) platform, spanning all modules:

- Employees, Departments, Designations, Locations
- Hardware Assets, Asset Categories, Vendors, Maintenance
- Software Licenses, Seat Allocations, Contract Renewals
- Service Requests, SLAs, Approvals
- Offboarding Cases, Asset Retrieval, Clearance Verification
- Credential Vault, Access Requests, Audit Logs
- Operational Reports, Streaming Exporters, Background Async Worker

---

## 2. Test Levels & Tooling

| Level                             | Framework                              | Scope / Coverage                                                                                    |
| --------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **L1: Static Analysis**           | ESLint 9 + TypeScript 5.8              | Monorepo lint (0 errors, 0 warnings), strict types (0 `any`, full DTO parity)                       |
| **L2: Standard UI Compliance**    | `check:ui` custom AST scanner          | Enforces 0 native `<input>`, `<select>`, `<button>` outside UI component library                    |
| **L3: Unit & Exporter Tests**     | Vitest                                 | Report registry, CSV injection neutralization, ExcelJS streaming, PDFKit layout, formula prevention |
| **L4: Golden Fixture Assertions** | `test:all-fixture` runner              | 138 deterministic golden assertions across 10 reports, 5 user roles, RBAC matrix                    |
| **L5: End-to-End Functional**     | Playwright (Desktop 1440 & Mobile 360) | UI flows: Catalogue navigation, dynamic filters, export drawer, token-aware charts                  |
| **L6: Automated Accessibility**   | `@axe-core/playwright`                 | Zero WCAG 2.1 AA violations on all report pages and catalogue viewports                             |
| **L7: Performance & Concurrency** | Autocannon / Benchmark runner          | 50,000-row streaming throughput, memory leak validation, async worker processing                    |

---

## 3. Golden Assertion Traceability Matrix

The deterministic test fixture is seeded via `npm run seed:test-fixture` using predictable tags (`TAG-FIX-001` through `TAG-FIX-010`) and fixed IDs.

| Test ID      | Report Key                     | Assertion Target                | Expected Value                                     | Status         |
| ------------ | ------------------------------ | ------------------------------- | -------------------------------------------------- | -------------- |
| **GA-R1.1**  | `hardware-per-employee`        | Total assigned asset count      | `>= 3`                                             | PASS (138/138) |
| **GA-R1.2**  | `hardware-per-employee`        | Specific employee asset mapping | `Alice Cooper -> TAG-FIX-001`                      | PASS (138/138) |
| **GA-R2.1**  | `asset-lifecycle`              | Depreciated salvage calculation | `TAG-FIX-001: $1,200 purchase -> $480 depreciated` | PASS (138/138) |
| **GA-R3.1**  | `warranty-expiry`              | 30-day urgent horizon           | `TAG-FIX-002: expires within 30 days`              | PASS (138/138) |
| **GA-R4.1**  | `maintenance-history`          | Repair expenditure tracking     | `TAG-FIX-003: cost $150.00, vendor Vendor One`     | PASS (138/138) |
| **GA-R5.1**  | `software-license-utilization` | Seat utilization calculation    | `Figma Enterprise: 85% utilization`                | PASS (138/138) |
| **GA-R6.1**  | `expiring-software`            | Subscription renewal horizon    | `JetBrains All Products: expiring within 45 days`  | PASS (138/138) |
| **GA-R7.1**  | `request-sla-performance`      | SLA fulfillment classification  | `REQ-FIX-001: within_sla (2.5 hrs)`                | PASS (138/138) |
| **GA-R8.1**  | `offboarding-clearance`        | Pending case hardware return    | `CASE-FIX-001: 2 assigned, 2 returned, fulfilled`  | PASS (138/138) |
| **GA-R9.1**  | `credential-approvals-access`  | Super Admin access              | Returns unmasked access history                    | PASS (138/138) |
| **GA-R9.2**  | `credential-approvals-access`  | Hardware Manager access         | HTTP 403 Forbidden                                 | PASS (138/138) |
| **GA-R9.3**  | `credential-approvals-access`  | HR Manager access               | HTTP 403 Forbidden                                 | PASS (138/138) |
| **GA-R10.1** | `audit-export`                 | Super Admin audit access        | Cryptographic SHA-256 chain verified               | PASS (138/138) |
| **GA-R10.2** | `audit-export`                 | Non-Admin role access           | HTTP 403 Forbidden                                 | PASS (138/138) |
| **GA-SEC.1** | Security Zero Secret Leak      | Payload inspection              | `password`, `secret_value`, `token` omitted        | PASS (138/138) |

---

## 4. RBAC Permission Matrix

| Role                 | Hardware (R1-R4) | Software (R5-R6) | Service/Offboarding (R7-R8) | Credentials (R9) | Audit (R10) |
| -------------------- | :--------------: | :--------------: | :-------------------------: | :--------------: | :---------: |
| **super_admin**      |      ALLOW       |      ALLOW       |            ALLOW            |      ALLOW       |    ALLOW    |
| **admin**            |      ALLOW       |      ALLOW       |            ALLOW            |      ALLOW       |    ALLOW    |
| **hardware_manager** |      ALLOW       |      ALLOW       |           R7 only           |     403 DENY     |  403 DENY   |
| **hr_manager**       |     R1 only      |     403 DENY     |            ALLOW            |     403 DENY     |  403 DENY   |
| **employee**         |     403 DENY     |     403 DENY     |          403 DENY           |     403 DENY     |  403 DENY   |

---

## 5. Execution Schedule & Automation Gates

To maintain high code quality across all workspaces, the continuous integration pipeline runs the following verification gates sequentially:

```bash
npm run check:ui       # Zero native inputs or buttons outside UI library
npm run lint           # Monorepo ESLint (0 errors, 0 warnings)
npm run typecheck      # Monorepo TypeScript (0 errors across 5 workspaces)
npm run test           # Vitest unit test suites
npm run test:all-fixture # 138 Golden Fixture Assertions
npm run build          # Production rollup/Vite bundle validation
npx playwright test    # Desktop-1440 and Mobile-360 E2E & Axe accessibility
```
