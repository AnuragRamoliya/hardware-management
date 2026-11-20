# Phase 6: Operational Reports & Analytics Catalogue

This document defines the 10 operational and compliance reports available in the IT Asset Management (ITAM) platform. Each report is driven by declarative metadata, enforces strict role-based access control (RBAC), and supports streaming synchronous export (< 5,000 rows) or resilient async background job export (up to 200,000 rows) in CSV, XLSX, and PDF formats.

---

## 1. Hardware Reports

### R1: Hardware Per Employee

- **Key**: `hardware-per-employee`
- **Category**: `hardware`
- **Description**: Company-wide visibility into hardware deployed to employees, department allocation, and warranty coverage status.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`, `hr_manager`
- **KPI Strip**:
  - `Total Assigned Assets`: Count of active assigned hardware devices
  - `Active Employees with Hardware`: Count of distinct employees holding at least 1 hardware asset
- **Columns**:
  - `employee_name` (string, sortable) — Full name of employee
  - `department` (string, sortable) — Department name
  - `asset_tag` (string, sortable) — Unique hardware asset tag
  - `asset_name` (string, sortable) — Asset model / description
  - `category` (string, sortable) — Laptop, Desktop, Monitor, Peripheral, Mobile
  - `assigned_date` (date, sortable) — Date of assignment
  - `warranty_status` (enum, sortable) — `active` | `expired`
- **Filter Parameters**: `department_id`, `category_id`, `search`, `start_date`, `end_date`

### R2: Asset Lifecycle & Depreciation

- **Key**: `asset-lifecycle`
- **Category**: `lifecycle`
- **Description**: Financial depreciation tracker calculating straight-line salvage value, book value, and asset age.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Asset Acquisition Cost`: Sum of original purchase costs
  - `Current Portfolio Book Value`: Current depreciated balance across all assets
- **Columns**:
  - `asset_tag` (string, sortable) — Asset tag
  - `asset_name` (string, sortable) — Name / model
  - `purchase_date` (date, sortable) — Date acquired
  - `purchase_cost` (currency, sortable) — Original acquisition cost (USD)
  - `useful_life_years` (number, sortable) — Expected useful life
  - `depreciated_value` (currency, sortable) — Calculated current book value
  - `lifecycle_status` (enum, sortable) — `active` | `expiring_soon` | `salvaged`
- **Filter Parameters**: `status`, `min_cost`, `max_cost`, `purchase_year`

### R3: Warranty Expiration Forecast

- **Key**: `warranty-expiry`
- **Category**: `lifecycle`
- **Description**: Forward-looking 30/60/90-day warranty expiration forecast for proactive hardware refresh and maintenance planning.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`
- **KPI Strip**:
  - `Expiring Within 30 Days`: Urgent replacements / warranty renewals needed
  - `Expiring Within 90 Days`: Quarterly budget planning forecast
- **Columns**:
  - `asset_tag` (string, sortable) — Hardware asset tag
  - `asset_name` (string, sortable) — Asset model
  - `assigned_to` (string, sortable) — Current assignee or "Unassigned"
  - `vendor` (string, sortable) — Vendor / OEM supplier
  - `warranty_expiry_date` (date, sortable) — Date warranty expires
  - `days_remaining` (number, sortable) — Number of days until expiration
  - `risk_level` (enum, sortable) — `critical` (<=30d) | `moderate` (31-90d) | `normal` (>90d)
- **Filter Parameters**: `days_horizon` (30, 60, 90, 180), `vendor_id`

### R4: Maintenance & Repair History

- **Key**: `maintenance-history`
- **Category**: `hardware`
- **Description**: Historical log of hardware failures, servicing events, repair costs, and downtime metrics.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Maintenance Expenditure`: Cumulative cost of all completed repairs
  - `Currently Under Repair`: Assets currently in service
- **Columns**:
  - `asset_tag` (string, sortable) — Asset tag
  - `asset_name` (string, sortable) — Hardware name
  - `issue_description` (string) — Reported fault or maintenance description
  - `service_vendor` (string, sortable) — Repair shop / OEM service provider
  - `cost` (currency, sortable) — Total repair cost
  - `status` (enum, sortable) — `under_repair` | `fulfilled` | `unrepairable`
  - `completed_at` (date, sortable) — Service completion date
- **Filter Parameters**: `status`, `vendor_id`, `start_date`, `end_date`

---

## 2. Software & License Reports

### R5: Software License Utilization

- **Key**: `software-license-utilization`
- **Category**: `software`
- **Description**: License seat utilization rates, allocated vs available headroom, and over-allocation risk.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Licensed Seats`: Global capacity across SaaS & installed licenses
  - `Average Seat Utilization`: Percentage of seats currently occupied
- **Columns**:
  - `software_name` (string, sortable) — Software title
  - `license_type` (string, sortable) — Subscription, Per-Seat, Enterprise, OEM
  - `total_seats` (number, sortable) — Total seats purchased
  - `allocated_seats` (number, sortable) — Seats deployed to employees
  - `utilization_pct` (number, sortable) — Calculated % occupancy
  - `status` (enum, sortable) — `optimal` | `expiring_soon` | `over_allocated`
- **Filter Parameters**: `license_type`, `search`

### R6: Expiring Software Subscriptions

- **Key**: `expiring-software`
- **Category**: `software`
- **Description**: Contract renewal and subscription expiration radar for annual, monthly, and multi-year SaaS agreements.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`
- **KPI Strip**:
  - `Renewals Due Next 30 Days`: Immediate renewals requiring purchasing approval
  - `Annual Renewal Commit`: Estimated annual commitment for expiring software
- **Columns**:
  - `software_name` (string, sortable) — Software title
  - `vendor` (string, sortable) — Publisher / Reseller
  - `cost` (currency, sortable) — Annual contract cost
  - `renewal_date` (date, sortable) — Subscription expiry date
  - `days_until_renewal` (number, sortable) — Days until next payment/renewal
  - `status` (enum, sortable) — `active` | `expiring_soon` | `expired`
- **Filter Parameters**: `days_horizon`, `vendor_id`

---

## 3. Operational & Service-Level Reports

### R7: Request SLA Performance

- **Key**: `request-sla-performance`
- **Category**: `service-level`
- **Description**: IT support desk velocity, ticket fulfillment times, and SLA breach ratios.
- **Allowed Roles**: `super_admin`, `admin`, `hardware_manager`, `hr_manager`
- **KPI Strip**:
  - `Overall SLA Compliance Rate`: Percentage of requests fulfilled within designated SLA
  - `Average Resolution Time`: Average turnaround time in hours
- **Columns**:
  - `request_no` (string, sortable) — Request identifier
  - `requester_name` (string, sortable) — Requesting employee
  - `item_type` (string, sortable) — Hardware, Software, Access
  - `sla_status` (enum, sortable) — `within_sla` | `breached`
  - `hours_to_fulfill` (number, sortable) — Turnaround duration in decimal hours
  - `created_at` (date, sortable) — Timestamp request logged
- **Filter Parameters**: `sla_status`, `item_type`, `start_date`, `end_date`

### R8: Offboarding Clearance & Recovery

- **Key**: `offboarding-clearance`
- **Category**: `service-level`
- **Description**: Employee separation hardware recovery status, credential revocation tracking, and clearance certificates.
- **Allowed Roles**: `super_admin`, `admin`, `hr_manager`
- **KPI Strip**:
  - `Pending Offboarding Cases`: Active departures requiring asset check-in
  - `Asset Recovery Rate`: Percentage of deployed assets retrieved
- **Columns**:
  - `case_no` (string, sortable) — Case tracking code
  - `employee_name` (string, sortable) — Departing employee
  - `separation_date` (date, sortable) — Official last working day
  - `assigned_assets_count` (number, sortable) — Number of assets held
  - `returned_assets_count` (number, sortable) — Number of assets returned
  - `recovery_status` (enum, sortable) — `pending` | `in_progress` | `fulfilled`
- **Filter Parameters**: `recovery_status`, `start_date`, `end_date`

---

## 4. Security & Audit Reports

### R9: Credential Vault Approvals & Access Audit

- **Key**: `credential-approvals-access`
- **Category**: `security`
- **Description**: Privileged secret access request ledger, approvals, time-bounded grants, and check-out events.
- **Allowed Roles**: `super_admin`, `admin` (Strictly restricted; hardware_manager and hr_manager receive 403 Forbidden)
- **KPI Strip**:
  - `Total Privileged Access Grants`: Historical count of approved secret authorizations
  - `Active Unexpired Grants`: Secrets currently unlocked for engineer use
- **Columns**:
  - `credential_name` (string, sortable) — Safe secret title
  - `requester_name` (string, sortable) — Engineer who requested access
  - `approver_name` (string, sortable) — Admin who authorized access
  - `access_duration_minutes` (number, sortable) — Approved TTL duration
  - `approved_at` (date, sortable) — Grant timestamp
  - `status` (enum, sortable) — `active` | `expired` | `revoked`
- **Filter Parameters**: `status`, `start_date`, `end_date`

### R10: System-Wide Audit & Activity Trail

- **Key**: `audit-export`
- **Category**: `audit`
- **Description**: Tamper-evident immutable ledger with SHA-256 hash chains, entity change history, actor IP addresses, and user-agent forensics.
- **Allowed Roles**: `super_admin`, `admin` (Strictly restricted; hardware_manager and hr_manager receive 403 Forbidden)
- **KPI Strip**:
  - `Total Audit Events Recorded`: Total system ledger records
  - `Cryptographic Chain Status`: `VERIFIED` (SHA-256 integrity unbroken)
- **Columns**:
  - `event_id` (number, sortable) — Sequential sequence index
  - `entity_type` (string, sortable) — asset, employee, credential, user, request
  - `action` (string, sortable) — CREATE, UPDATE, DELETE, ACCESS, EXPORT
  - `actor_name` (string, sortable) — User executing the action
  - `ip_address` (string) — Source IP address
  - `record_hash` (string) — Cryptographic SHA-256 hash
  - `created_at` (date, sortable) — Immutable ISO-8601 timestamp
- **Filter Parameters**: `entity_type`, `action`, `actor_id`, `start_date`, `end_date`

---

## 5. Export Capabilities & Worker Architecture

| Feature           | Specification                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSV Format**    | UTF-8 with BOM (`\uFEFF`) for Excel auto-detection; neutralizing formula injection (`=`, `+`, `-`, `@`, `\t`, `\r` escaped with `'`).                                                                                                             |
| **XLSX Format**   | Streaming ExcelJS workbook with dual tabs: `Report Data` (typed numbers/currencies/dates, auto-fit columns) and `Export Summary` (audit metadata, row count, generated timestamp, timezone).                                                      |
| **PDF Format**    | PDFKit landscape layout, primary brand header banner, KPI metric summary strip, alternating striped data table rows, right-aligned numbers, and dynamic footer (`Page X of Y`, confidentiality notice).                                           |
| **Sync Limit**    | Requests `<= 5,000` rows stream directly over HTTP with Content-Disposition attachment.                                                                                                                                                           |
| **Async Worker**  | Requests `> 5,000` rows (or user preference) create an atomic job in `export_jobs` table. Worker claims via `job_status = 'processing'`, streams to disk in `/exports`, updates row progress %, computes SHA-256 checksum, and flags `completed`. |
| **Max Cap**       | Strict limit of `200,000` rows per export job.                                                                                                                                                                                                    |
| **Job Retention** | Automated cron cleans completed jobs older than 24 hours.                                                                                                                                                                                         |
