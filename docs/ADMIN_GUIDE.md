# Administrator Guide

This guide describes operational workflows for users with elevated administrative roles (`super_admin`, `hardware_manager`, `hr`).

---

## 1. Role Capabilities Matrix

| Capability / Section                                    | `super_admin`  | `hardware_manager` | `hr`                   |
| ------------------------------------------------------- | -------------- | ------------------ | ---------------------- |
| Dashboard Analytics & Metrics                           | Full           | Hardware & Assets  | Staffing & Requests    |
| User & Role Management                                  | Yes            | No                 | No                     |
| Hardware Asset Lifecycle (Create, Edit, Repair, Retire) | Yes            | Yes                | Read-Only              |
| Asset Assignments & Returns                             | Yes            | Yes                | Read-Only              |
| Software & License Seat Allocations                     | Yes            | Yes                | Read-Only              |
| Credential Vault Management & Secret Reveals            | Yes            | Approval-Gated     | No                     |
| Offboarding Case Management & Clearance                 | Yes            | Task Fulfillment   | Case Creation & Review |
| Reports & Streaming Exports                             | All 10 Reports | Reports 1-7        | Reports 7 & 8          |
| Audit Logs & Tamper-Evident Ledger                      | Yes            | No                 | No                     |

---

## 2. Common Administrative Procedures

### 2.1 Managing Asset Lifecycle

1. Navigate to **Assets** in the navigation bar.
2. Click **Add Asset** to register a new physical device with serial number, asset tag, and category.
3. To assign hardware: Select device -> Click **Assign** -> Choose employee -> Submit.
4. To track repair: Update status to `In Repair` and log maintenance cost and vendor notes.

### 2.2 Processing Offboarding Cases

1. HR initiates offboarding by creating a new case under **Offboarding Cases**.
2. Tasks are automatically populated from the matching department checklist template.
3. Hardware manager collects hardware, confirms serial numbers, and marks asset return tasks fulfilled.
4. Once all checklist tasks reach completion, the case status changes to `Completed` and generates a cryptographically signed clearance certificate PDF.
