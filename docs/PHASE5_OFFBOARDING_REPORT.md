# Phase 5: Employee Offboarding & Hardware Handover - Verification & Completion Report

This report documents the architectural implementation, database schemas, services, automation crons, security guardrails, and verification procedures for **Phase 5: Employee Offboarding & Hardware Handover** in the `hardware-management` platform.

---

## 1. Executive Summary

Phase 5 delivers end-to-end lifecycle automation for employee departures. When an offboarding case is initiated, the system automatically binds checklist templates, generates tasks across IT, HR, and departmental stakeholders, facilitates asset reassignment or recovery, revokes access credentials, releases software licenses, and generates cryptographically auditable clearance PDF certificates.

---

## 2. Database Schema & Architecture

Phase 5 introduces three core database tables under `apps/api/Database/Schema/`:

### 2.1 `offboarding_checklist_templates`

- **Path**: `apps/api/Database/Schema/offboarding_checklist_templates.ts`
- **Columns**: `id`, `title`, `description`, `department_id`, `is_default`, `tasks` (JSON definition of checklist items), `status`, `created_by`, `updated_by`, `createdAt`, `updatedAt`.
- **Purpose**: Reusable master task definitions per department (or system defaults) used to instantiate actionable task items when an employee departure is scheduled.

### 2.2 `offboarding_cases`

- **Path**: `apps/api/Database/Schema/offboarding_cases.ts`
- **Columns**: `id`, `case_no` (e.g. `OFF-000001`), `employee_id`, `initiated_by`, `handover_to`, `manager_id`, `reason`, `last_working_day`, `exit_date`, `case_status` (1: Initiated, 2: Pending Handover, 3: In Review, 4: Completed, 5: Cancelled), `clearance_status`, `notes`, `certificate_path`, `handover_receipt_path`, `completed_at`, `status`, `createdAt`, `updatedAt`.
- **Foreign Keys**: Linked to `employees`, `users` (initiator, handover recipient), and has many `offboarding_tasks`.

### 2.3 `offboarding_tasks`

- **Path**: `apps/api/Database/Schema/offboarding_tasks.ts`
- **Columns**: `id`, `case_id`, `task_type` (1: Hardware Return, 2: Credential Revoke, 3: Software License, 4: Knowledge Transfer, 5: General Task), `title`, `description`, `assigned_to`, `task_status` (1: Pending, 2: In Progress, 3: Completed, 4: Waived, 5: Blocked), `priority` (1: Low, 2: Medium, 3: High, 4: Critical), `due_date`, `completed_at`, `completed_by`, `waived_by`, `waive_reason`, `notes`, `status`, `createdAt`, `updatedAt`.

---

## 3. Core Business Services

Located under `apps/api/Services/`:

1. **`OffboardingService` (`Services/offboarding.service.ts`)**:
   - Manages case initiation, status transitions, checklist generation, validation, and completion sign-off.
   - Enforces strict state machine transition validation using `OFFBOARDING_CASE_TRANSITIONS`.
   - Generates unique sequential case numbers (`OFF-000001`).

2. **`OffboardingTasksService` (`Services/offboarding_tasks.service.ts`)**:
   - Handles individual task updates, assignee delegation, completion verification, and task waiving with mandatory justifications.
   - Validates that high-priority tasks (e.g., hardware asset check-in) are resolved before case sign-off.

3. **`OffboardingTemplateService` (`Services/offboarding_template.ts`)**:
   - CRUD and options endpoint for checklist templates with default template fallback.

4. **`ClearancePdfService` (`Services/clearance_pdf.service.ts`)**:
   - Built with PDFKit to generate digitally styled, printable handover receipts and formal Clearance Certificates.
   - Embeds corporate header, employee details, complete asset return ledger (serial numbers, asset tags, return condition), credential revocations, and timestamped sign-off signatures.

---

## 4. Automation Crons & Background Jobs

Located under `apps/api/Jobs/offboarding_daily.ts` (triggered daily at 00:00 UTC via Node-Cron):

1. **Last Working Day (LWD) Reminders**:
   - Dispatches automated reminders at T-7 days, T-3 days, and T-1 day before the employee's last working day to the employee, manager, and hardware admins.
2. **Automated Account Deactivation**:
   - On the exit date, the employee's system user account (`users`) is automatically locked and set to inactive.
3. **Overdue Task Escalations**:
   - Identifies incomplete hardware return tasks past the LWD and raises urgent notification alerts.

---

## 5. Security & Assignment Guardrails

To prevent asset leaks during resignation/notice periods, the following guardrails are enforced across the platform:

- **Asset Checkout Guard (`Services/asset_assignment.ts`)**: Reject new asset checkout if the target employee has an active offboarding case.
- **Software Assignment Guard (`Services/software.ts`)**: Disallow new software seat assignments to offboarding employees.
- **Portal Request Guard (`Services/portal_request.ts`)**: Automatically block requests for new hardware or software from employees in notice/offboarding status.

---

## 6. REST API Endpoints

| Method | Endpoint                         | Description                                                     |
| :----- | :------------------------------- | :-------------------------------------------------------------- |
| `POST` | `/offboarding/list`              | Filtered list of offboarding cases with pagination & sorting    |
| `GET`  | `/offboarding/get/:id`           | Detailed case profile with linked tasks and return items        |
| `POST` | `/offboarding/initiate`          | Initiates new case, assigns handover recipient, generates tasks |
| `PUT`  | `/offboarding/update/:id`        | Updates case status, notes, and milestones                      |
| `POST` | `/offboarding/task/list`         | Lists tasks linked to a case or assigned user                   |
| `PUT`  | `/offboarding/task/update/:id`   | Updates task status, marks complete or waived                   |
| `GET`  | `/offboarding/:id/clearance-pdf` | Downloads generated clearance PDF certificate                   |
| `GET`  | `/offboarding/:id/receipt-pdf`   | Downloads equipment handover receipt PDF                        |
| `GET`  | `/offboarding/template/options`  | Serves available checklist templates                            |
