# Deterministic Test Fixture Specification

## 1. Overview

The deterministic test fixture provides known test entities across employees, hardware inventory, software licenses, maintenance tickets, service requests, offboarding workflows, credentials vault, and audit ledger. It is designed to verify golden outputs across all 10 reports, role permissions, and streaming exports.

**Seeder Command**: `npm run seed:test-fixture`
**Test Verification Command**: `npm run test:all-fixture`
**Fixed Fixture Anchor Date**: `2026-11-20T10:00:00.000Z`

---

## 2. Fixture Records & Golden Assertions

### R1: Hardware Per Employee

- **Employee**: Alice Fixture (`FIX-EMP-001`, `alice.fixture@example.com`)
- **Department**: Engineering Fixture
- **Designation**: Fixture Staff
- **Assigned Asset**: `TAG-FIX-001` (Dell Latitude 7420 Fixture, Serial: `SN-FIX-001`)
- **Assigned Date**: `2024-01-20T10:00:00.000Z`
- **Condition**: Good
- **Warranty End**: `2027-01-10`

### R2: Assets by Category and Department

- **Category**: Fixture Laptops (`FIX-LAP`)
- **Department**: Engineering Fixture
- **Total Tracked Assets**: 2 (1 in Engineering Fixture, 1 in Stock/Spare)

### R3: Assigned vs Unassigned

- **Assigned Asset**: `TAG-FIX-001` (Status: `assigned`, Assignee: Alice Fixture)
- **Unassigned (In-Stock) Asset**: `TAG-FIX-002` (Status: `unassigned`, Serial: `SN-FIX-002`, Location: Fixture HQ)

### R4: Software License Utilization

- **Software**: Fixture IDE Enterprise (`Developer Tools`)
- **Vendor**: Fixture Tech Solutions
- **License Key**: `KEY-FIXTURE-DEV-9999`
- **Total Seats**: 10
- **Assigned Seats**: 1 (Assigned to Alice Fixture)
- **Available Seats**: 9
- **Utilization Rate**: 10%
- **Over-Allocated**: No

### R5: Hardware Warranty Expiry

- **Expired Asset**: `TAG-FIX-003` (Apple MacBook Pro 14 Fixture, Serial: `SN-FIX-003`)
- **Warranty Expiry**: `2026-11-15` (Expired relative to fixture date `2026-11-20`)
- **Status Flag**: `expired`

### R6: Hardware Repair & Maintenance History

- **Maintenance Ticket Asset**: `TAG-FIX-003`
- **Vendor**: Fixture Tech Solutions
- **Reported Issue**: "Battery swelling and keyboard replacement"
- **Status**: Under Repair (`maintenance_status = 1`)
- **Sent Date**: `2026-11-10T10:00:00.000Z`
- **Repair Cost**: \$350.00

### R7: Hardware Request Turnaround & SLA Compliance

- **Request #**: `REQ-FIX-001`
- **Requester**: Alice Fixture
- **Type**: Hardware Allocation (1)
- **Priority**: Medium (2)
- **Created At**: `2026-11-18T09:00:00.000Z`
- **Fulfilled At**: `2026-11-19T11:00:00.000Z`
- **Turnaround Duration**: 26 hours
- **SLA Breach Status**: `within_sla` (`sla_breached = 0`)

### R8: Employee Offboarding & Asset Recovery Status

- **Case #**: `OFF-FIX-001`
- **Employee**: Bob Fixture (`FIX-EMP-002`)
- **Exit Type**: Resignation (1)
- **Last Working Date**: `2026-11-30`
- **Case Status**: `open`
- **Pending Asset Tasks**: 1 ("Return company issued laptop")

### R9: Credential Approvals & Access Audits

- **Credential Label**: `Fixture Production API Token`
- **Credential Type**: Fixture API Key (`API & Tokens`)
- **Username**: `service_fixture_svc`
- **Approval Status**: Approved (2)
- **Submitted At**: `2026-11-15T08:30:00.000Z`
- **Access Reveals**: >= 1 logged reveal
- **Zero-Exposure Security Guarantee**: Under all circumstances, fields `password_enc`, `iv`, `auth_tag`, and `key_version` are completely stripped and excluded from API responses and exported files.

### R10: Full System Audit & Activity Logs

- **Log Module**: `reports`
- **Action**: `EXPORT`
- **Description Marker**: `DETERMINISTIC_FIXTURE_AUDIT_LOG_INITIALIZATION`
- **Hash Chain Verification**: SHA-256 chain links `prev_hash` to `hash` and validates tamper-evidence (`is_chain_valid = 'verified'`).

---

## 3. Role Access Control Matrix

| Role                 | Reports 1–6 (Hardware/Assets/Software/Maintenance) | Report 7 (Request Turnaround SLA) | Report 8 (Offboarding Status) | Report 9 (Credential Approvals) | Report 10 (Audit Ledger) |
| :------------------- | :------------------------------------------------- | :-------------------------------- | :---------------------------- | :------------------------------ | :----------------------- |
| **super_admin**      | ALLOWED                                            | ALLOWED                           | ALLOWED                       | ALLOWED                         | ALLOWED                  |
| **hardware_manager** | ALLOWED                                            | ALLOWED                           | FORBIDDEN (403)               | FORBIDDEN (403)                 | FORBIDDEN (403)          |
| **hr**               | FORBIDDEN (403)                                    | ALLOWED                           | ALLOWED                       | FORBIDDEN (403)                 | FORBIDDEN (403)          |
| **employee**         | FORBIDDEN (403)                                    | FORBIDDEN (403)                   | FORBIDDEN (403)               | FORBIDDEN (403)                 | FORBIDDEN (403)          |
