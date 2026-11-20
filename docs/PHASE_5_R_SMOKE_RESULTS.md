# Phase 5 + Phase R Smoke Test Results

Date: 2026-11-20
Environment: Local test database (`hardware_app`), Node.js v22.23.4, Linux
Branch: `fix/phase-5-r-gap-closure`

## Execution Command

```bash
cd apps/api && npx tsx scripts/smoke_phase5_r.ts
```

## Raw Output

```text
====================================================
STARTING PHASE 5 + PHASE R SMOKE TEST FLOW
====================================================

Database connection established successfully.

--- STEP 1: Seeding Test Employee & Resources ---
Created Employee ID: 1299032 (SMK-899299, smoke.emp.899299@example.com), User ID: 37
Assigned 2 Assets: [SMK-AST1-899299 (ID: 898069), SMK-AST2-899299 (ID: 898070)]
Assigned 1 Software License Seat: ID 28
Assigned 1 Credential: "Smoke Email Vault 899299" (ID: 140017)
Created 2 Open Requests: [REQ-SMK-1-899299, REQ-SMK-2-899299]
STEP 1 RESULT: PASSED

--- STEP 2: Initiate Offboarding Lifecycle ---
Initiated Offboarding Case: #621 (Case No: OFF-000621) with LWD: 2026-11-21
Task Breakdown -> Hardware: 2, Software: 1, Credentials: 1
Open Request 1 status: 8, Request 2 status: 8 (Expected: 8 = CANCELLED)
Asset 1 status: 3, Asset 2 status: 3 (Expected: 3 = pending_return)
Employee employment_status: 2 (Expected: 2 = NOTICE)
STEP 2 RESULT: PASSED

--- STEP 3: Check-in First Asset & Daily Sweep on LWD ---
Scanned Asset 1 (SMK-AST1-899299) -> Status: Completed
Running offboarding daily sweep for simulated date: 2026-11-21...
Sweep executed: {"reminders":2,"lwd":{"employeesResigned":1,"softwareRevoked":1,"credentialsDisabled":1,"loginsDisabled":8},"overdue":1,"pending":0}
Employee employment_status after LWD sweep: 3 (Expected: 3 = RESIGNED)
Employee User status: 0 (Expected: 0 = disabled)
Active user tokens count (is_revoked=0): 0 (Expected: 0)
Unreturned Asset 2 task status: "exception" (Expected: "exception")
STEP 3 RESULT: PASSED

--- STEP 4: Complete All Tasks & Issue Clearance Certificate ---
Scanned Asset 2 (SMK-AST2-899299) -> Marked returned
Task already completed by LWD processing: "Revoke License: Figma"
Task already completed by LWD processing: "Disable Credential: user.899299"
Task already completed by LWD processing: "Auto-Cancelled Request #REQ-SMK-1-899299"
Task already completed by LWD processing: "Auto-Cancelled Request #REQ-SMK-2-899299"
Completed task: "Return ID card"
Completed task: "Return access card"
Completed task: "Return SIM/company phone accessories"
Completed task: "Knowledge transfer completed"
Completed task: "Email forwarding/auto-reply set"
Completed task: "Exit interview"
Completed task: "Final settlement clearance (HR)"
Signing off and issuing clearance certificate...
Clearance Issued! File path: apps/api/storage/clearance/Clearance_OFF-000621_1795155899949.pdf
Case Status: "completed" (Expected: "completed")
Verification Code: "CLR-2026-621-E267B7"
Verification SHA-256 Digest: "dfa624e9861b6f35a37306a6915524553567999eaef1736c5cdb3d3da5be1a37"
Employee employment_status: 4 (Expected: 4 = EXITED)
verifyDocument Result: verified=true, employee=Smoke Employee899299, hash=dfa624e9861b6f35a37306a6915524553567999eaef1736c5cdb3d3da5be1a37
STEP 4 RESULT: PASSED

--- STEP 5: Realtime Socket Authorization & Event Routing ---
canJoinRoom(employee, "role:hardware_manager") -> false (Expected: false)
canJoinRoom(employee, "role:admin") -> false (Expected: false)
canJoinRoom(hardware_manager, "role:hardware_manager") -> true (Expected: true)
Comment Split: Internal notes emit only to staff role room ("role:hardware_manager", "role:admin") and NEVER to employee user room.
Session Revocation: session:revoked event defined as "session:revoked" and disconnects user sockets on LWD.
STEP 5 RESULT: PASSED

====================================================
ALL 5 SMOKE TEST STEPS PASSED WITH 100% SUCCESS!
====================================================
```
