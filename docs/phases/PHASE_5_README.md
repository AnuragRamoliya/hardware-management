# Phase 5: Employee Offboarding & Hardware Handover

Phase 5 automates the exit lifecycle of departing employees. It manages checklist templates, generates actionable tasks for hardware returns, revokes access credentials, releases software licenses, and generates cryptographically signed clearance PDF certificates.

---

## 1. Scope & Modules

| Module / Resource       | Table Name                        | Purpose                                                                                           |
| :---------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Checklist Templates** | `offboarding_checklist_templates` | Departmental and default master checklists for exit tasks.                                        |
| **Offboarding Cases**   | `offboarding_cases`               | Master exit case record tracking Last Working Day (LWD), handover recipient, and sign-off status. |
| **Offboarding Tasks**   | `offboarding_tasks`               | Individual actionable tasks (Hardware Return, Revoke Access, Handover Files, Sign-off).           |

---

## 2. Key Architecture & Features

### 2.1 Automated Task Generation

When an offboarding case is created:

1. The system loads the matching department template (or default template).
2. For each assigned hardware item, it automatically creates a high-priority "Return Hardware" task.
3. For each active credential, it creates a "Revoke Credential" task.
4. For each software license, it creates a "Release Software Seat" task.

### 2.2 Clearance Certificate & Handover Receipt PDF

- Built with PDFKit inside `ClearancePdfService`.
- **Handover Receipt**: Documents all equipment returned or transferred, serial numbers, condition rating, and receiving party signature.
- **Clearance Certificate**: Final formal clearance document certifying that all hardware, credentials, and company data have been recovered.

### 2.3 Automated Crons & Guardrails

- **Automated Reminders**: Daily notifications sent at T-7, T-3, and T-1 days before the Last Working Day.
- **Auto Account Lock**: Locks the user account on exit date.
- **Assignment Guardrails**: Blocks new hardware checkout or software seat allocations to employees in notice/offboarding status.

---

## 3. API Endpoints Reference

- `POST /offboarding/list`: Lists offboarding cases.
- `GET /offboarding/get/:id`: Detailed case view with task checklists and return equipment.
- `POST /offboarding/initiate`: Initiates an exit case and generates tasks.
- `PUT /offboarding/update/:id`: Updates case status or milestones.
- `POST /offboarding/task/list`: Lists tasks by case or assignee.
- `PUT /offboarding/task/update/:id`: Marks task complete or waived with reason.
- `GET /offboarding/:id/clearance-pdf`: Generates formal Clearance PDF.
- `GET /offboarding/:id/receipt-pdf`: Generates Equipment Handover Receipt PDF.
- `GET /offboarding/template/options`: Serves available checklist templates.
