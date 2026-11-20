# Phase 6: Operational Reports & Analytics Catalogue

This document defines the 10 operational and compliance reports available in the IT Asset Management (ITAM) platform. Each report is driven by declarative metadata, enforces strict role-based access control (RBAC), and supports streaming synchronous export (< 5,000 rows) or resilient async background job export (up to 200,000 rows) in CSV, XLSX, and PDF formats.

---

## 1. Hardware & Inventory Reports

### R1: Hardware Per Employee

- **Key**: `hardware-per-employee`
- **Category**: `hardware`
- **Title**: Hardware Per Employee
- **Description**: Company-wide visibility into hardware deployed to employees, department allocation, and warranty coverage status.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Tracked Assets`: Count of active assigned hardware devices
  - `Deployed Assets`: Count of active hardware assets deployed to employees
  - `Assigned Rate`: Percentage of assigned assets out of tracked assets
- **Columns**:
  - `employee_name` (string, sortable) — Full name of employee
  - `employee_code` (string, sortable) — Employee code
  - `department` (string, sortable) — Department name
  - `asset_tag` (string, sortable) — Unique hardware asset tag
  - `asset_name` (string, sortable) — Asset model / description
  - `category` (string, sortable) — Hardware category
  - `serial_number` (string, sortable) — Serial number
  - `assigned_date` (date, sortable) — Date of assignment
  - `warranty_status` (enum, sortable) — `active` | `expired`
- **Filter Parameters**: `employee_id`, `department_id`, `category_id`, `search`

### R2: Assets by Category and Department

- **Key**: `assets-by-category-department`
- **Category**: `inventory`
- **Title**: Assets by Category and Department
- **Description**: Cross-tabulation of hardware asset counts across asset categories and organizational departments.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Tracked Assets`: Grand total of hardware assets across all categories
  - `Active Assigned`: Total assets currently deployed
  - `Available Spare`: Total assets in stock / available
- **Columns**:
  - `category` (string, sortable) — Asset category name
  - `department` (string, sortable) — Assigned department name
  - `total_assets` (number, sortable) — Total hardware count in category/dept
  - `active_assets` (number, sortable) — Number of active in-use assets
  - `spare_assets` (number, sortable) — Number of spare / in-stock assets
  - `in_repair` (number, sortable) — Number of assets currently undergoing repair
  - `retired` (number, sortable) — Number of decommissioned / retired assets
- **Filter Parameters**: `category_id`, `department_id`

### R3: Assigned vs Unassigned Hardware

- **Key**: `assigned-vs-unassigned`
- **Category**: `inventory`
- **Title**: Assigned vs Unassigned Hardware
- **Description**: Inventory allocation ratio comparing deployed hardware against in-stock spare capacity.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Tracked Assets`: Grand total of assets
  - `Assigned Hardware`: Assets currently assigned to personnel
  - `In Stock (Spare)`: Assets available for deployment
  - `Allocation Rate`: Percentage of fleet deployed
- **Columns**:
  - `asset_tag` (string, sortable) — Asset tag
  - `category` (string, sortable) — Category name
  - `brand` (string, sortable) — Brand / manufacturer
  - `model` (string, sortable) — Hardware model
  - `serial_number` (string, sortable) — Serial number
  - `location` (string, sortable) — Storage or office location
  - `assignment_status` (enum, sortable) — `assigned` | `unassigned`
  - `assignee_name` (string, sortable) — Assigned employee or Unassigned
  - `assigned_date` (date, sortable) — Date of assignment
  - `days_deployed` (number, sortable) — Number of days deployed
- **Filter Parameters**: `category_id`, `location_id`, `assignment_status`

---

## 2. Software & License Reports

### R4: Software License Utilization

- **Key**: `software-license-utilization`
- **Category**: `software`
- **Title**: Software License Utilization
- **Description**: Software seat allocation efficiency, license occupancy rates, and over-allocation risk.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Software Seats`: Total purchased seat capacity
  - `Assigned Seats`: Total active seat assignments
  - `Average Utilization`: Overall percentage of purchased seats utilized
  - `Over-Allocated Products`: Number of titles with utilization exceeding 100%
- **Columns**:
  - `software_name` (string, sortable) — Application name
  - `category` (string, sortable) — Software category
  - `vendor` (string, sortable) — Vendor / publisher
  - `license_type` (enum, sortable) — `perpetual` | `subscription` | `seat` | `site`
  - `total_seats` (number, sortable) — Purchased seats
  - `assigned_seats` (number, sortable) — Deployed seats
  - `available_seats` (number, sortable) — Available seat buffer
  - `utilization_pct` (number, sortable) — Utilization percentage
  - `utilization_status` (enum, sortable) — `normal` | `high` | `over_allocated`
  - `expiration_date` (date, sortable) — License expiration / renewal date
- **Filter Parameters**: `category`, `vendor_id`, `utilization_status`

---

## 3. Lifecycle & Maintenance Reports

### R5: Hardware Warranty Expiry

- **Key**: `warranty-expiry`
- **Category**: `lifecycle`
- **Title**: Hardware Warranty Expiry
- **Description**: Hardware approaching end-of-warranty horizons (30, 60, 90 days) or already expired.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Matching Assets`: Total assets in filter window
  - `Expired Warranties`: Total assets with expired warranty
  - `Expiring in 30 Days`: Immediate upcoming expirations
  - `Expiring in 90 Days`: Medium-term renewals
- **Columns**:
  - `asset_tag` (string, sortable) — Asset tag
  - `category` (string, sortable) — Category
  - `brand` (string, sortable) — Brand
  - `model` (string, sortable) — Model
  - `serial_number` (string, sortable) — Serial number
  - `vendor_name` (string, sortable) — Vendor name
  - `warranty_end` (date, sortable) — Expiration date
  - `days_remaining` (number, sortable) — Days remaining (negative if expired)
  - `warranty_status` (enum, sortable) — `active` | `expired`
  - `assignee_name` (string, sortable) — Current assignee
- **Filter Parameters**: `window_days` (`30`, `60`, `90`, `all`), `category_id`, `vendor_id`

### R6: Hardware Repair & Maintenance History

- **Key**: `repair-history`
- **Category**: `lifecycle`
- **Title**: Hardware Repair & Maintenance History
- **Description**: Asset maintenance logs, cumulative repair expenses, recurring failure trends, and turnaround time.
- **Allowed Roles**: `super_admin`, `hardware_manager`
- **KPI Strip**:
  - `Total Maintenance Records`: Maintenance tickets matching criteria
  - `Total Repair Cost`: Sum of repair costs incurred
  - `Under Active Repair`: Assets currently under repair
- **Columns**:
  - `asset_tag` (string, sortable) — Asset tag
  - `asset_name` (string, sortable) — Asset name / model
  - `category` (string, sortable) — Category
  - `issue_description` (string, sortable) — Reported fault / issue
  - `start_date` (date, sortable) — Date sent for maintenance
  - `end_date` (date, sortable) — Date repair completed
  - `cost` (number, sortable) — Maintenance cost in base currency
  - `repair_status` (enum, sortable) — `in_repair` | `repaired` | `unrepairable`
  - `vendor_name` (string, sortable) — Service provider / vendor
- **Filter Parameters**: `asset_id`, `repair_status`, `vendor_id`, `start_date`, `end_date`

---

## 4. Service Level & Operations Reports

### R7: Hardware Request Turnaround & SLA Compliance

- **Key**: `request-turnaround-sla`
- **Category**: `service-level`
- **Title**: Hardware Request Turnaround & SLA Compliance
- **Description**: Service request fulfillment velocity, average resolution duration, and SLA breach rate.
- **Allowed Roles**: `super_admin`, `hardware_manager`, `hr`
- **KPI Strip**:
  - `Total Requests Evaluated`: Evaluated requests count
  - `Average Turnaround Hours`: Average fulfillment duration in hours
  - `SLA Compliance Rate`: Percentage of requests fulfilled within SLA target
  - `Breached SLA Requests`: Count of breached requests
- **Columns**:
  - `request_number` (string, sortable) — Request identifier
  - `requester_name` (string, sortable) — Requester employee name
  - `department` (string, sortable) — Department
  - `item_type` (string, sortable) — Requested item type
  - `priority` (enum, sortable) — `low` | `medium` | `high` | `urgent`
  - `sla_hours` (number, sortable) — SLA threshold hours
  - `turnaround_hours` (number, sortable) — Actual resolution hours
  - `sla_status` (enum, sortable) — `met` | `breached` | `pending`
  - `created_at` (date, sortable) — Request date
  - `fulfilled_at` (date, sortable) — Fulfillment date
- **Filter Parameters**: `department_id`, `priority`, `sla_status`, `start_date`, `end_date`

### R8: Employee Offboarding & Asset Recovery Status

- **Key**: `offboarding-status`
- **Category**: `lifecycle`
- **Title**: Employee Offboarding & Asset Recovery Status
- **Description**: Offboarding clearance workflows, asset retrieval completion, overdue returns, and certificate generation.
- **Allowed Roles**: `super_admin`, `hardware_manager`, `hr`
- **KPI Strip**:
  - `Total Offboarding Cases`: Tracked cases
  - `Completed Clearances`: Fully closed and cleared cases
  - `Pending Asset Returns`: Cases with unrecovered hardware
  - `Overdue Cases`: Cases past last working day with pending assets
- **Columns**:
  - `case_number` (string, sortable) — Case number
  - `employee_name` (string, sortable) — Offboarding employee
  - `department` (string, sortable) — Department
  - `last_working_day` (date, sortable) — Last working day
  - `status` (enum, sortable) — Case status (`initiated`, `in_progress`, `completed`, `cancelled`)
  - `clearance_status` (enum, sortable) — Clearance status
  - `total_assets_to_return` (number, sortable) — Assets required to return
  - `assets_returned` (number, sortable) — Recovered assets
  - `certificate_issued` (boolean, sortable) — Document generated
- **Filter Parameters**: `status`, `clearance_status`, `department_id`, `start_date`, `end_date`

---

## 5. Security & Compliance Reports

### R9: Credential Approvals & Access Audits

- **Key**: `credential-approvals-access`
- **Category**: `security`
- **Title**: Credential Approvals & Access Audits
- **Description**: Audit ledger of credential vault approvals, reveal events, checkout windows, and privileged access.
- **Allowed Roles**: `super_admin`
- **Security Guard**: Strictly redacts and excludes raw passwords, ciphertext, and private vault secrets from all exports.
- **KPI Strip**:
  - `Total Access Events`: Total logged approval/reveal events
  - `Approved Requests`: Total approved credentials
  - `Active Checkouts`: Currently checked-out credentials
- **Columns**:
  - `credential_title` (string, sortable) — Vault credential identifier
  - `credential_type` (string, sortable) — Credential category
  - `requester_name` (string, sortable) — Requesting employee
  - `approver_name` (string, sortable) — Approving manager / admin
  - `access_type` (enum, sortable) — Access requested
  - `status` (enum, sortable) — Approval status
  - `revealed_at` (date, sortable) — Timestamp revealed
  - `expires_at` (date, sortable) — Access expiration
- **Filter Parameters**: `status`, `credential_type_id`, `start_date`, `end_date`

### R10: Full System Audit & Activity Logs

- **Key**: `audit-export`
- **Category**: `audit`
- **Title**: Full System Audit & Activity Logs
- **Description**: Immutable append-only audit trail capturing user actions, administrative interventions, entity modifications, and security events.
- **Allowed Roles**: `super_admin`
- **KPI Strip**:
  - `Total Log Entries`: Total recorded activity logs
  - `Action Types`: Count of distinct recorded actions
  - `Active Operators`: Number of distinct users performing actions
- **Columns**:
  - `timestamp` (date, sortable) — ISO timestamp of event
  - `actor_name` (string, sortable) — Full name of actor
  - `actor_email` (string, sortable) — Actor email
  - `module` (string, sortable) — Affected domain module
  - `action` (string, sortable) — Action verb (`CREATE`, `UPDATE`, `DELETE`, etc.)
  - `record_id` (number, sortable) — Target entity ID
  - `ip_address` (string, sortable) — Client IP address
- **Filter Parameters**: `module`, `action`, `actor_id`, `start_date`, `end_date`
