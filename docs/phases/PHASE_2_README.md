# Phase 2: Hardware Assets, Software Licenses & Maintenance

Phase 2 introduces the hardware inventory and software asset management (ITAM) core, tracking physical hardware from procurement to disposal, managing software licenses and seats, recording maintenance tickets, and sending proactive alert notifications.

---

## 1. Scope & Modules

| Module / Resource        | Table Name                                  | Purpose                                                                                 |
| :----------------------- | :------------------------------------------ | :-------------------------------------------------------------------------------------- |
| **Hardware Assets**      | `assets`                                    | Physical machines, serial numbers, asset tags, specs, warranty dates, status, QR codes. |
| **Asset Assignments**    | `asset_assignments`                         | Assignment checkout to employees, check-in returns, condition tracking.                 |
| **Asset Maintenance**    | `asset_maintenance`                         | Service tickets, repair costs, vendors, temporary loaner asset allocation.              |
| **Software Catalog**     | `software`                                  | Software products, vendors, versions, categories, subscription models.                  |
| **Software Licenses**    | `software_licenses`                         | License keys, seats total, seats used, expiry dates, purchase cost.                     |
| **Software Assignments** | `software_assignments`                      | Seat allocation to employees, assignment and revocation timestamps.                     |
| **Notifications**        | `notifications`, `notification_preferences` | In-app alerts, warranty expiry reminders, license renewal warnings.                     |

---

## 2. Key Architecture & Features

### 2.1 Hardware Asset Lifecycle

- **Status State Machine**: `Available` (1), `Assigned` (2), `In Maintenance` (3), `Retired` (4), `Lost/Stolen` (5).
- **QR / Barcode Generation**: Server-side QR code generation embedding asset tag and detail URLs.
- **Atomic Checkout & Return**: Single transaction updates asset status, writes assignment record, and logs activity.

### 2.2 Software Seat Management

- Strict seat enforcement: Cannot allocate more seats than purchased (`seats_used <= total_seats`).
- License seat counters are maintained atomically inside database transactions.

### 2.3 Preventive Alerts & Maintenance Cron

- Automated daily jobs check for:
  - Assets with warranty expiring in 30, 15, and 7 days.
  - Software licenses expiring in 30, 15, and 7 days.
  - Overdue hardware returns past scheduled loaner return date.

---

## 3. API Endpoints Reference

### Assets & Assignments

- `POST /asset/list`, `GET /asset/get/:id`, `POST /asset/add`, `PUT /asset/update`
- `POST /asset/assign`: Assign asset to employee.
- `POST /asset/return`: Check in asset with condition notes.
- `GET /asset/qr/:id`: Generate QR code image.

### Software & Licenses

- `POST /software/list`, `GET /software/get/:id`, `POST /software/add`, `PUT /software/update`
- `POST /software-license/add`, `PUT /software-license/update`, `POST /software/assign-license`

### Maintenance

- `POST /asset-maintenance/list`, `POST /asset-maintenance/add`, `PUT /asset-maintenance/update`

---

## 4. Frontend Implementation

- **Pages**: `Assets.tsx`, `AssetDetail.tsx`, `Software.tsx`, `SoftwareDetail.tsx`, `Maintenance.tsx`, `Notifications.tsx`, `Dashboard.tsx`.
- **Modals & Dialogs**: `AssignAssetDialog`, `ReturnAssetDialog`, `AssetQrModal`, `AssignSoftwareDialog`, `CompleteMaintenanceDialog`.
