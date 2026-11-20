# Phase 7 User Acceptance Testing (UAT) & Verification Report

## 1. Summary of Execution

- **Total UAT Cases Tested**: 18
- **Passed**: 18
- **Failed**: 0
- **Pass Rate**: 100%
- **Tested Roles**: `super_admin`, `hardware_manager`, `hr`, `employee`
- **Testing Environments**: Automated Playwright Headless Chromium, Real Browser Session Audits, HTTP Fixture Verification Suite (`npm run test:all-fixture`).

---

## 2. Test Case Traceability Matrix

| Case ID    | Feature / Module           | Tested Role        | Preconditions                     | Steps Executed                                 | Expected Result                                                                                                | Actual Result                                     | Status   |
| ---------- | -------------------------- | ------------------ | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| **UAT-01** | Authentication & Session   | `super_admin`      | Seeded fixture database           | Fill `admin@fixture.local`, submit login form  | Redirected to `/`, tokens stored in state, dashboard mounted                                                   | Redirected to `/`, dashboard rendered within 1.8s | **PASS** |
| **UAT-02** | Authentication & Session   | `employee`         | Seeded fixture database           | Fill `emp@fixture.local`, submit login form    | Redirected to portal landing page (`/my-assets` or `/requests`)                                                | Redirected to portal landing page                 | **PASS** |
| **UAT-03** | RBAC Menu Visibility       | `employee`         | Logged in as `employee`           | Inspect sidebar navigation links               | Restricted menus (`/audit-logs`, `/credential-types`) absent                                                   | 0 matching elements in DOM                        | **PASS** |
| **UAT-04** | RBAC Menu Visibility       | `super_admin`      | Logged in as `super_admin`        | Inspect sidebar navigation links               | Full navigation tree visible (Employees, Assets, Software, Credentials, Requests, Offboarding, Reports, Admin) | All menus present and navigable                   | **PASS** |
| **UAT-05** | Reports Catalogue Access   | `super_admin`      | Logged in as `super_admin`        | Navigate to `/reports`                         | All 10 reports visible across categories                                                                       | 10 report cards rendered                          | **PASS** |
| **UAT-06** | Reports Catalogue Access   | `hardware_manager` | Logged in as `hardware_manager`   | Call `POST /reports/list`                      | Hardware/Asset/Maintenance reports visible; Credential & Audit reports hidden                                  | R1-R7 returned; R8-R10 hidden                     | **PASS** |
| **UAT-07** | Reports Catalogue Access   | `employee`         | Logged in as `employee`           | Call `POST /reports/list`                      | Blocked with HTTP 403 Forbidden                                                                                | HTTP 403 Forbidden returned                       | **PASS** |
| **UAT-08** | Synchronous CSV Export     | `super_admin`      | Filtered report view              | Click Export -> Format CSV -> Submit           | Download stream begins with UTF-8 BOM, valid CSV headers, escaped formulas                                     | Export completed; 35 rows with BOM                | **PASS** |
| **UAT-09** | Synchronous XLSX Export    | `super_admin`      | Filtered report view              | Click Export -> Format XLSX -> Submit          | Valid binary XLSX file generated                                                                               | Valid binary Excel stream (10,140 bytes)          | **PASS** |
| **UAT-10** | Synchronous PDF Export     | `super_admin`      | Filtered report view              | Click Export -> Format PDF -> Submit           | Formatted PDF document generated                                                                               | Valid PDF binary stream (6,739 bytes)             | **PASS** |
| **UAT-11** | Offboarding Document IDOR  | `employee`         | Logged in as non-case employee    | Request `/offboarding/cases/:id/clearance-pdf` | HTTP 403 Forbidden returned                                                                                    | HTTP 403 Forbidden asserted                       | **PASS** |
| **UAT-12** | Handover Receipt IDOR      | `employee`         | Logged in as non-case employee    | Request `/offboarding/cases/:id/handover-pdf`  | HTTP 403 Forbidden returned                                                                                    | HTTP 403 Forbidden asserted                       | **PASS** |
| **UAT-13** | Credential Reveal IDOR     | `employee`         | Logged in as non-owner employee   | Request `POST /credentials/:id/reveal`         | HTTP 403 Forbidden returned                                                                                    | HTTP 403 Forbidden asserted                       | **PASS** |
| **UAT-14** | Audit Hash Chain Ledger    | System             | 436 activity logs, 1 access log   | Run `npm run audit:verify`                     | All cryptographic SHA-256 hash chains valid                                                                    | 100% valid; zero tampered rows                    | **PASS** |
| **UAT-15** | Document Verification Form | Public / Anonymous | `/verify-document`                | Submit invalid verification code               | Clear certificate verification failed card rendered                                                            | "Certificate Verification Failed" card visible    | **PASS** |
| **UAT-16** | Responsive Layout (360px)  | Public / Employee  | Viewport 360 x 640                | Inspect `document.scrollWidth`                 | `scrollWidth <= innerWidth` (no horizontal overflow)                                                           | `scrollWidth <= 360px`                            | **PASS** |
| **UAT-17** | Dark Mode Theme Tokens     | Any                | Viewport 1440 x 900               | Add `dark` class to `<html>`                   | Theme tokens toggle; background and foreground inverse                                                         | Confirmed `dark` class token applied              | **PASS** |
| **UAT-18** | Axe WCAG 2.1 AA Compliance | Any                | `/login`, `/verify-document`, `/` | Run `@axe-core/playwright`                     | Zero accessibility violations                                                                                  | 0 violations across all audited routes            | **PASS** |

---

## 3. Real Browser Evidence Log

- **Headless Chromium Suite**: 24 tests executed across `desktop-1440` and `mobile-360` profiles.
- **Fixture Verification**: 138 automated assertions executed in `scripts/test_all_fixture.ts`.
- **Result**: Zero regressions, zero unhandled errors, zero horizontal page overflows.
