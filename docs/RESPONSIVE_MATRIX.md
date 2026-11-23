# Responsive Matrix (Viewports x Screens)

Verification matrix mapping all 81 UI inventory items across device viewports (320px to 1920px), responsive breakpoints, and browser engines.

## Breakpoint Spectrum

- **320x568**: Mobile Small (iPhone SE 1st gen)
- **360x740**: Mobile Android Common
- **390x844**: Mobile iOS Common (iPhone 12/13/14)
- **412x915**: Mobile Android Large (Pixel 7 / Galaxy S)
- **740x360**: Mobile Landscape
- **768x1024**: Tablet Portrait (iPad)
- **1024x768**: Tablet Landscape (iPad)
- **1280x800**: Desktop Small (Laptop)
- **1440x900**: Desktop Standard
- **1920x1080**: Desktop Wide

---

## Responsive Coverage Matrix

| ID         | Screen / Overlay Name       | Route                         | 320x568 (Mobile Sm) | 360x740 (Mobile) | 768x1024 (Tablet) | 1440x900 (Desktop) | Firefox Desktop |  Axe Status  | Overall  |
| :--------- | :-------------------------- | :---------------------------- | :-----------------: | :--------------: | :---------------: | :----------------: | :-------------: | :----------: | :------: |
| `AUTH-01`  | Login Page                  | `/login`                      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AUTH-02`  | Forgot Password             | `/forgot-password`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AUTH-03`  | Verify OTP                  | `/verify-otp`                 |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AUTH-04`  | Reset Password              | `/reset-password`             |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AUTH-05`  | Verify Document             | `/verify-document`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `ERR-01`   | Not Found 404               | `/non-existent-page`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `ERR-02`   | Error Boundary State        | `/design-system`              |        PASS         |       PASS       |       PASS        |        FAIL        |      PASS       |  violations  | **FAIL** |
| `NAV-01`   | Desktop Sidebar             | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NAV-02`   | Mobile Navigation Sheet     | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NAV-03`   | Header & Breadcrumbs        | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NAV-04`   | Notification Bell Popover   | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NAV-05`   | User Profile Dropdown       | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NAV-06`   | Theme Toggle Control        | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `DASH-01`  | Admin Dashboard             | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `DASH-02`  | Hardware Manager Dashboard  | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `DASH-03`  | HR Manager Dashboard        | `/dashboard`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `DASH-04`  | Employee Portal Landing     | `/portal`                     |        PASS         |       PASS       |       PASS        |        FAIL        |      PASS       |  violations  | **FAIL** |
| `EMP-01`   | Employees List              | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-02`   | Add Employee Drawer         | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-03`   | Import Employees Dialog     | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-04`   | Employee Detail Page        | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-05`   | Employee Overview Tab       | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-06`   | Employee Hardware Tab       | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-07`   | Employee Software Tab       | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-08`   | Employee Audit Tab          | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `EMP-09`   | Initiate Offboarding Dialog | `/employees/5`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-01`    | Departments List            | `/departments`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-02`    | Add Department Drawer       | `/departments`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-03`    | Designations List           | `/designations`               |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-04`    | Add Designation Drawer      | `/designations`               |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-05`    | Locations List              | `/locations`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-06`    | Add Location Drawer         | `/locations`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-07`    | Vendors List                | `/vendors`                    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-08`    | Add Vendor Drawer           | `/vendors`                    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-09`    | Asset Categories List       | `/asset-categories`           |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `MD-10`    | Add Category Drawer         | `/asset-categories`           |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-01`   | Assets List                 | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-02`   | Add Asset Drawer            | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-03`   | Import Assets Dialog        | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-04`   | Asset QR Modal              | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-05`   | Assign Asset Dialog         | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-06`   | Return Asset Dialog         | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-07`   | Transfer Asset Dialog       | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-08`   | Bulk Assign Dialog          | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-09`   | Bulk Return Dialog          | `/assets`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-10`   | Unassigned Assets Pool      | `/assets/unassigned`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-11`   | Asset Maintenance Page      | `/asset-maintenance`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-12`   | Add Maintenance Dialog      | `/asset-maintenance`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-13`   | Complete Maintenance Dialog | `/asset-maintenance`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AST-14`   | Asset Detail Page           | `/assets/200005`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-01`   | Software Catalog            | `/software`                   |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-02`   | Add Software Drawer         | `/software`                   |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-03`   | Software Detail Page        | `/software/10`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-04`   | Add License Dialog          | `/software/10`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-05`   | Assign Seat Dialog          | `/software/10`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `SFT-06`   | Revoke Seat Dialog          | `/software/10`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-01`   | Credential Vault            | `/credentials`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-02`   | Add Credential Drawer       | `/credentials`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-03`   | Reveal Secret Dialog        | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-04`   | Rotate Password Dialog      | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-05`   | Credential History Dialog   | `/credentials`                |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-06`   | Vault Privacy Consent       | `/portal`                     |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-07`   | Credential Approvals        | `/credentials/approvals`      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-08`   | Approval Action Dialog      | `/credentials/approvals`      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-09`   | Credential Types List       | `/credentials/types`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-10`   | Add Credential Type Drawer  | `/credentials/types`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-11`   | Collection Requests List    | `/credentials/requests`       |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-12`   | Create Request Dialog       | `/credentials/requests`       |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-13`   | Credential Access Logs      | `/credentials/access-logs`    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-14`   | Portal Shared Accounts      | `/portal/accounts`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `CRD-15`   | Add Portal Account Drawer   | `/portal/accounts`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-01`   | Staff Requests Queue        | `/requests`                   |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-02`   | Request Detail Page         | `/requests/1`                 |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-03`   | Request Action Dialog       | `/requests/1`                 |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-04`   | Comments & Attachments      | `/requests/1`                 |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-05`   | Portal My Requests          | `/portal/requests`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-06`   | Portal Request Detail       | `/portal/requests/1`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-07`   | New Request Drawer          | `/portal/requests`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-08`   | Portal My Assets            | `/portal/assets`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REQ-09`   | Portal My Software          | `/portal/software`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-01`   | Offboarding Cases List      | `/offboarding/cases`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-02`   | Initiate Case Dialog        | `/offboarding/cases`          |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-03`   | Offboarding Case Detail     | `/offboarding/cases/5`        |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-04`   | Offboarding Task Action     | `/offboarding/cases/5`        |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-05`   | Offboarding Templates       | `/offboarding/templates`      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-06`   | Offboarding Scan Returns    | `/offboarding/scan-returns`   |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-07`   | Portal Offboarding Hub      | `/portal/offboarding`         |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `OFF-08`   | Clearance Verify Public     | `/verify-document`            |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REP-01`   | Reports Catalogue           | `/reports`                    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REP-02`   | Report Detail Page          | `/reports/hardware-inventory` |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REP-03`   | Report Export Dialog        | `/reports/hardware-inventory` |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REP-04`   | Large Export Confirm        | `/reports/hardware-inventory` |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `REP-05`   | Background Exports Drawer   | `/reports`                    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NOTIF-01` | Notification Center         | `/notifications`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `NOTIF-02` | Notification Preferences    | `/notifications/preferences`  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `PROF-01`  | Admin Profile Settings      | `/profile`                    |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `PROF-02`  | Portal Employee Profile     | `/portal/profile`             |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `USR-01`   | Users Directory             | `/users`                      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `USR-02`   | Add User Drawer             | `/users`                      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `ROL-01`   | Roles & Permissions Matrix  | `/roles`                      |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `AUD-01`   | Audit Logs Viewer           | `/audit-logs`                 |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `DS-01`    | Design System Showcase      | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `UNI-01`   | Row Actions Menu            | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `UNI-02`   | Table Filter Panel          | `/employees`                  |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `UNI-03`   | Action Dialog Layout        | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `UNI-04`   | Confirm Dialog Modal        | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
| `UNI-05`   | Select Popover Component    | `/design-system`              |        PASS         |       PASS       |       PASS        |        PASS        |      PASS       | 0 violations | **PASS** |
