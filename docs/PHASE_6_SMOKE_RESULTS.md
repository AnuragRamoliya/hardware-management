# Phase 6: Operational Smoke Test Results

## 1. Test Overview

This test suite executes direct HTTP requests against the backend API server (`http://localhost:8000`) to verify all 10 report endpoints, metadata registry, RBAC role gating, streaming file downloads (CSV, XLSX, PDF), formula injection prevention, and background export task lifecycle.

---

## 2. Report Endpoint Execution & Verification Log

| #   | Endpoint / Test Description                         | Method | Role               | HTTP Status | Response Details / Verification                                                                                                                                             | Result |
| --- | --------------------------------------------------- | ------ | ------------------ | :---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| 1   | `GET /reports/meta/hardware-per-employee`           | GET    | `admin`            |     200     | Returns schema columns: `employee_name`, `department`, `asset_tag`, `category`, `assigned_date`, `warranty_status`                                                          |  PASS  |
| 2   | `POST /reports/run/hardware-per-employee`           | POST   | `admin`            |     200     | Returns `{ summary: [{ label: 'Total Assigned Assets', value: 42 }], rows: [...] }`                                                                                         |  PASS  |
| 3   | `POST /reports/export/hardware-per-employee` (CSV)  | POST   | `admin`            |     200     | Content-Type: `text/csv`, BOM `\uFEFF` present, Content-Disposition: `attachment`                                                                                           |  PASS  |
| 4   | `POST /reports/export/hardware-per-employee` (XLSX) | POST   | `admin`            |     200     | Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, dual tabs: `Report Data`, `Export Summary`                                               |  PASS  |
| 5   | `POST /reports/export/hardware-per-employee` (PDF)  | POST   | `admin`            |     200     | Content-Type: `application/pdf`, PDFKit landscape, KPI metrics strip, dynamic page footer                                                                                   |  PASS  |
| 6   | `POST /reports/run/asset-lifecycle`                 | POST   | `hardware_manager` |     200     | Straight-line depreciation values calculated; book value <= acquisition cost                                                                                                |  PASS  |
| 7   | `POST /reports/run/warranty-expiry`                 | POST   | `hardware_manager` |     200     | 30/60/90-day expiration horizons mapped; `days_remaining` accurate                                                                                                          |  PASS  |
| 8   | `POST /reports/run/maintenance-history`             | POST   | `hardware_manager` |     200     | Logs maintenance costs, vendor IDs, repair statuses (`under_repair`, `fulfilled`)                                                                                           |  PASS  |
| 9   | `POST /reports/run/software-license-utilization`    | POST   | `admin`            |     200     | License occupancy percentages calculated; utilization_pct = (allocated / total) * 100                                                                                       |  PASS  |
| 10  | `POST /reports/run/expiring-software`               | POST   | `admin`            |     200     | SaaS contract renewal countdown and cost projections verified                                                                                                               |  PASS  |
| 11  | `POST /reports/run/request-sla-performance`         | POST   | `hr_manager`       |     200     | Average fulfillment hours computed; `sla_status` tags (`within_sla`, `breached`)                                                                                            |  PASS  |
| 12  | `POST /reports/run/offboarding-clearance`           | POST   | `hr_manager`       |     200     | Recovery rate computed: retrieved assets / assigned assets                                                                                                                  |  PASS  |
| 13  | `POST /reports/run/credential-approvals-access`     | POST   | `admin`            |     200     | Returns access history; zero secrets or passwords in payload                                                                                                                |  PASS  |
| 14  | `POST /reports/run/credential-approvals-access`     | POST   | `hardware_manager` |     403     | Forbidden: Role does not have permission for credential access report                                                                                                       |  PASS  |
| 15  | `POST /reports/run/credential-approvals-access`     | POST   | `hr_manager`       |     403     | Forbidden: Role does not have permission for credential access report                                                                                                       |  PASS  |
| 16  | `POST /reports/run/audit-export`                    | POST   | `admin`            |     200     | Returns immutable SHA-256 event ledger; chain verified                                                                                                                      |  PASS  |
| 17  | `POST /reports/run/audit-export`                    | POST   | `hardware_manager` |     403     | Forbidden: Role does not have permission for audit export report                                                                                                            |  PASS  |
| 18  | `POST /reports/run/audit-export`                    | POST   | `employee`         |     403     | Forbidden: Employee role blocked across all reporting endpoints                                                                                                             |  PASS  |
| 19  | CSV Formula Injection Neutralization                | POST   | `admin`            |     200     | Input `=CMD('calc')` neutralized to `'=CMD('calc')` in streamed CSV output                                                                                                  |  PASS  |
| 20  | Background Export Worker Job Lifecycle              | POST   | `admin`            |     200     | `POST /reports/export/audit-export` with `{ async: true }` creates job -> worker claims (`processing`) -> streams 50k rows to disk -> computes SHA-256 -> marks `completed` |  PASS  |

---

## 3. Smoke Test Summary

- **Total Endpoints Tested**: 20
- **Passed**: 20
- **Failed**: 0
- **Enforcement Highlights**:
  - Strict 403 HTTP status code returned for all unauthorized role attempts.
  - Exporter output formats validated for integrity, headers, and formula injection sanitization.
  - Background worker atomic locking (`job_status = 'processing'`) prevents duplicate execution.
