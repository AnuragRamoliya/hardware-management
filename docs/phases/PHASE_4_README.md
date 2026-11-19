# Phase 4: Employee Requests & Approval Engine

Phase 4 introduces the self-service procurement, repair, software, and replacement request portal for employees, coupled with a multi-tier review and atomic fulfilment workflow for administrators and department managers.

---

## 1. Scope & Modules

| Module / Resource    | Table Name               | Purpose                                                                                              |
| :------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------- |
| **Requests**         | `requests`               | Master request entity storing request type, priority, SLA dates, approval status, and linked assets. |
| **Request Comments** | `request_comments`       | Two-way communication thread between employee and IT administrators (supports internal staff notes). |
| **Status History**   | `request_status_history` | Complete historical timeline of state changes with actor and reason.                                 |
| **Attachments**      | `request_attachments`    | Uploaded supporting files (invoices, diagnostic screenshots, approvals).                             |

---

## 2. Request Types & State Machine

### 2.1 Request Types

1. **New Hardware**: Request for new laptop, monitor, or peripheral.
2. **Hardware Replacement**: Swap failing or outdated hardware with new inventory.
3. **Hardware Repair**: Report malfunctioning equipment to initiate maintenance.
4. **Software License**: Request access to SaaS or desktop software license seat.
5. **Asset Return**: Check in assigned equipment when no longer needed.

### 2.2 Deterministic Transition Rules

- `SUBMITTED` $\to$ `UNDER_REVIEW` | `REJECTED` | `CANCELLED`
- `UNDER_REVIEW` $\to$ `APPROVED` | `NEED_INFO` | `REJECTED` | `CANCELLED`
- `NEED_INFO` $\to$ `SUBMITTED` | `CANCELLED`
- `APPROVED` $\to$ `FULFILLED` | `CANCELLED`
- `FULFILLED` $\to$ `CLOSED`

### 2.3 Atomic Multi-Workflow Fulfilment

When a request is approved and fulfilled, the database executes an atomic transaction with row-level locks:

- **Hardware**: Checks out selected asset, sets `asset_status = 2` (Assigned), creates assignment record.
- **Replacement**: Returns old asset (`asset_status = 1`), checks out replacement asset.
- **Repair**: Automatically creates maintenance record in `asset_maintenance`.
- **Software**: Allocates available license seat and increments `seats_used`.

---

## 3. API Endpoints Reference

### Admin Endpoints

- `POST /request/list`: Comprehensive filtered request table.
- `GET /request/get/:id`: Detailed view with timeline, comments, and attachments.
- `POST /request/take-review/:id`: Claim request for review.
- `POST /request/approve/:id`: Approve request for fulfilment.
- `POST /request/fulfill/:id`: Execute atomic inventory allocation.
- `POST /request/reject/:id`: Reject with mandatory justification.
- `POST /request/comment/:id`: Add message or internal note.

### Employee Portal Endpoints

- `POST /portal/request/list`: View employee's personal requests.
- `POST /portal/request/submit`: Submit new request.
- `POST /portal/request/cancel/:id`: Cancel submitted request.
- `POST /portal/request/reply/:id`: Reply to `NEED_INFO` inquiries.

---

## 4. Frontend Implementation

- **Pages**: `Requests.tsx` (Admin queue), `RequestDetail.tsx`, `PortalRequests.tsx`, `PortalRequestDetail.tsx`.
- **Drawers & Modals**: `NewRequestDrawer`, `RequestActionDialogs` (Approve, Reject, Need Info, Fulfil).
