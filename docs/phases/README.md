# Project Implementation Phases Overview

Welcome to the phase-by-phase implementation guide for the **Hardware & Employee Management Monorepo**. This directory contains comprehensive, easy-to-read README files for each milestone delivered across the API, Web, and Shared packages.

---

## Quick Phase Navigation

| Phase       | Title                           | Summary                                                                                                  | Documentation Link                                                                                                      |
| :---------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** | Foundation & Core RBAC          | Authentication (JWT), RBAC engine, SHA-256 audit logs, and core organizational entities.                 | [PHASE_1_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_1_README.md) |
| **Phase 2** | Assets & Software Inventory     | Hardware lifecycle, serial/tag tracking, software license seats, assignments, and maintenance tickets.   | [PHASE_2_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_2_README.md) |
| **Phase 3** | Zero-Knowledge Credential Vault | AES-256-GCM secret encryption, key rotation, access audit trails, and employee collection portal.        | [PHASE_3_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_3_README.md) |
| **Phase 4** | Requests & Approvals Engine     | Self-service portal for assets/software, multi-tier approvals, timeline comments, and atomic fulfilment. | [PHASE_4_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_4_README.md) |
| **Phase 5** | Offboarding & Hardware Handover | Checklist templates, task automation, equipment recovery, account lock, and clearance PDF certificates.  | [PHASE_5_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_5_README.md) |
| **Phase R** | Real-Time Push & Notifications  | Socket.IO gateway, transactional event emission (`afterCommit`), user/role rooms, and live badges.       | [PHASE_R_README.md](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/phases/PHASE_R_README.md) |

---

## Architectural Principles Across All Phases

1. **Modular Table-Wise Architecture**:
   - Schemas are modularized table-by-table in `apps/api/Database/Schema/<table_name>.ts`.
   - Domain services (`apps/api/Services/`), controllers (`apps/api/Controllers/`), and Express routers (`apps/api/Routes/`) are organized cleanly per resource.
2. **Single Source of Truth**:
   - All state mutations are handled via typed, validated REST endpoints.
   - Sockets and UI cache layers mirror backend database state and invalidate queries on state change.
3. **Strict RBAC & Auditability**:
   - Every read and write checks user permissions (`checkAccess`).
   - Every state change writes an immutable entry into `activity_logs`.
4. **Standardized UI**:
   - Zero one-off components. All UI screens use shared components from `src/components/ui/`, `src/components/common/`, and `src/components/hook-form/`.
