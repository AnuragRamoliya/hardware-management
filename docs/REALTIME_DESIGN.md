# Phase R: Real-Time System Architecture & Design Specification

**Monorepo:** `hardware-management` (`apps/api`, `apps/web`, `packages/shared`)  
**Branch:** `feature/phase-r-realtime`  
**Status:** Pre-flight Complete & Approved  
**Author:** Senior Full-Stack & Systems Architect

---

## 1. Executive Summary & Design Principles

The Hardware Management platform requires real-time synchronization for live notifications, request updates, timeline comments, credential approval queues, handover tasks, presence indicators, and dashboard metrics.

### Guiding Principles

1. **Database & REST as Single Source of Truth**:
   - WebSockets provide **at-most-once push delivery** for real-time reactivity.
   - All state mutations (creates, updates, deletes, approvals) remain **100% REST-based**, preserving request decryption, authentication middleware, permission checks, audit logging, and database transactions.
   - Sockets **never** accept mutation commands. The only permitted client-to-server messages are room join/leave requests, typing indicators, presence heartbeats, and acknowledgments.
   - If real-time is disabled (`REALTIME_ENABLED=false`) or disconnected, the application functions identically via REST polling and manual refetches.

2. **Strict Transactional Guarantees (`emitAfterCommit`)**:
   - Real-time events are emitted **only after** the corresponding Sequelize database transaction successfully commits.
   - If a transaction rolls back, zero events are emitted.
   - If no transaction is active, the event emits immediately following the successful database write.
   - All domain services emit through a single unified service: `RealtimeService.publish(event)`. Controllers never touch Socket.IO directly.

3. **Zero Secrets & Payload Minimization**:
   - Payloads contain only minimal IDs, statuses, titles, actor metadata, timestamps, and deep links.
   - Sensitive credentials, passwords, tokens, encryption IVs/tags, and software license keys are **strictly excluded** from real-time events.
   - Internal request comments are scoped **exclusively to staff rooms** (`staff:requests`) and are never dispatched to employee rooms.

4. **Self-Healing & Reconnection Recovery**:
   - Clients automatically recover from connection drops.
   - Upon reconnection, `apps/web` triggers targeted React Query cache invalidations and refreshes the unread notification count.
   - When disconnected, the client falls back to 60-second polling for notifications.

---

## 2. Pre-Flight Inspection Findings

### 2.1 Existing Notification Implementation

- **Schema (`notifications`)**:
  - Located in `apps/api/Database/Schema/phase2/notifications.ts` and migration `20261117120000-create-assets-software.js`.
  - Current columns: `id`, `status`, `recipient_user_id`, `kind`, `record_type`, `record_id`, `threshold_days`, `title`, `message`, `read_at`, `createdAt`, `updatedAt`.
  - Deduplication constraint: `notifications_alert_dedupe_unique` (`recipient_user_id`, `kind`, `record_type`, `record_id`, `threshold_days`).
- **Notification Calls in Codebase**:
  - `apps/api/Services/notification.ts`: Asset warranty expiry, software renewals, license expiry, overdue assignments, credential expiry, and overdue collection requests.
  - `apps/api/Jobs/request_sla.ts`: SLA breach alerts and need-info reminders.
  - `apps/api/Jobs/offboarding_daily.ts`: LWD reminder notices (7, 3, 1 days), overdue handover escalations, and clearance readiness.
  - `apps/api/Services/request.ts` & `portal_request.ts`: Request creation, status changes, review actions, and comment additions.
  - `apps/api/Services/credential_vault.ts`: Submission, approval, rejection, and collection requests.
  - `apps/api/Services/offboarding.service.ts`: Handover case initiation and assignment.
- **Client Implementation (`apps/web`)**:
  - Stub bell in `src/components/layout/AppShell.tsx:718` navigates directly to `/notifications`.
  - Static notifications page in `src/pages/Notifications.tsx` with mark-as-read mutation.
  - No live popover, day grouping, infinite scroll, sound, or desktop notification integration.

---

## 3. Architecture & Infrastructure Specification

```
                                  +------------------------------------+
                                  |         Web Browser Client         |
                                  |   (React 18 + RealtimeProvider)    |
                                  +-----------------+------------------+
                                                    |
                                    REST (Mutations)| WebSocket /realtime
                                                    v
+----------------------------------------------------------------------+
|                           Express 5 API                              |
|                                                                      |
|  [REST Controllers] ---> [Domain Services] ---> [Sequelize Models]   |
|                                   |                    |             |
|                                   | write              | commit      |
|                                   v                    v             |
|                     [emitAfterCommit / RealtimeService]              |
|                                   |                                  |
|                                   v                                  |
|                        [Socket.IO Gateway /realtime]                 |
|                                   |                                  |
|                  +----------------+----------------+                 |
|                  | (Optional Redis Streams/Adapter)|                 |
+------------------+----------------+----------------+-----------------+
                                    |
                                    v
                           [MariaDB / Redis]
```

### 3.1 Transport & Configuration

- **Library**: `socket.io` v4.8+ (API) and `socket.io-client` v4.8+ (Web).
- **Endpoint**: `/realtime` on existing Express HTTP server.
- **Transports**: `['websocket', 'polling']` (WebSocket first with HTTP long-polling fallback).
- **Environment Variables**:
  ```env
  REALTIME_ENABLED=true
  REALTIME_PATH=/realtime
  REALTIME_REDIS_URL=redis://localhost:6379  # optional, multi-instance
  REALTIME_MAX_SOCKETS_PER_USER=5
  ```
- **Redis Adapter**: When `REALTIME_REDIS_URL` is set, attach `@socket.io/redis-adapter` with `ioredis`. When absent, run the standard in-memory adapter.
- **Reverse Proxy / Nginx & Vite**:
  - Set `Upgrade: $http_upgrade` and `Connection: "Upgrade"`.
  - `proxy_read_timeout 86400s`.
  - Vite dev proxy configured with `ws: true`.

---

## 4. Shared Contract (`packages/shared`)

### 4.1 Event Envelope

All server-to-client events conform to the versioned envelope:

```typescript
export interface RealtimeEnvelope<T = unknown> {
  id: string; // UUID v4 event identifier
  event: string; // e.g. "notification.created", "request.updated"
  version: number; // Schema version (currently 1)
  ts: number; // Epoch millisecond timestamp
  actor?: {
    id: number;
    name: string;
    role?: string;
  };
  data: T; // Strongly typed payload
}
```

### 4.2 Standard Real-Time Events (`REALTIME_EVENTS`)

- **Notifications**: `notification.created`, `notification.read_updated`
- **Requests**: `request.created`, `request.updated`, `request.status_changed`, `request.assigned`, `request.fulfilled`, `request.comment_added`
- **Credentials**: `credential.submitted`, `credential.approved`, `credential.rejected`, `credential.needs_change`, `credential.collection_requested`
- **Assets & Software**: `asset.assigned`, `asset.returned`, `asset.status_changed`, `software.assigned`, `software.revoked`
- **Offboarding**: `offboarding.initiated`, `offboarding.case_updated`, `offboarding.task_updated`, `employee.status_changed`
- **System & Session**: `session.revoked`, `account.locked`, `permissions.changed`, `stats.updated`, `system.broadcast`
- **Presence & Collaboration**: `presence.updated`, `typing.updated`

### 4.3 Room Naming Helpers (`REALTIME_ROOMS`)

```typescript
export const REALTIME_ROOMS = {
  user: (userId: number | string) => `user:${userId}`,
  role: (roleName: string) => `role:${roleName}`,
  request: (requestId: number | string) => `request:${requestId}`,
  requestStaff: (requestId: number | string) => `request:${requestId}:staff`,
  offboarding: (caseId: number | string) => `offboarding:${caseId}`,
  queueRequests: () => "queue:requests",
  queueApprovals: () => "queue:approvals",
  queueHandover: () => "queue:handover",
  queueDashboard: () => "queue:dashboard",
} as const;
```

---

## 5. Security & Authorization Matrix

### 5.1 Handshake Authentication (`Realtime/auth.ts`)

1. Client passes access token in `socket.handshake.auth.token` or `Authorization: Bearer <token>`.
2. Validated against `user_tokens` table for existence, expiration, and active status (`is_revoked = 0`).
3. User verified active in `users` (`status = 1`, not locked, linked employee not exited).
4. Sockets automatically join:
   - `user:{user.id}`
   - `role:{role.name}`
5. If user has $> 5$ open connections (`REALTIME_MAX_SOCKETS_PER_USER`), the oldest socket is disconnected with code `EVICTED_OLDEST`.
6. Rate limiting on client socket events: max 30 messages per 10 seconds. Exceeding triggers warning and temporary socket throttle.

### 5.2 Room Join Authorization Matrix (`Realtime/rooms.ts`)

| Room Name            | Permitted Actors                                              | Validation Rule                                                                                |
| :------------------- | :------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| `user:{id}`          | Socket owner only                                             | Automatic on connection                                                                        |
| `role:{name}`        | Users possessing role                                         | Automatic on connection                                                                        |
| `request:{id}`       | Requester employee OR Staff with `requests` read permission   | Lookup `requests.employee_id == user.employee_id` OR `hasPermission(role, 'requests', 'read')` |
| `request:{id}:staff` | Staff with `requests` read permission ONLY                    | Never accessible to employee role                                                              |
| `offboarding:{id}`   | Offboarding subject employee OR Staff with `offboarding` read | Lookup `case.employee_id == user.employee_id` OR `hasPermission(role, 'offboarding', 'read')`  |
| `queue:requests`     | Roles with `requests` write or approve access                 | Super admin, Hardware manager, Reviewer                                                        |
| `queue:approvals`    | Roles with `credential_vault` approve access                  | Super admin, Security auditor                                                                  |
| `queue:handover`     | Roles with `offboarding` write access                         | Super admin, Hardware manager                                                                  |
| `queue:dashboard`    | Authenticated staff roles                                     | Staff users only                                                                               |

---

## 6. Event Catalogue & Routing

| Event                      | Trigger Service           | Emitted Rooms                                              | Payload Data                                            | Web Consumer / Invalidation                    |
| :------------------------- | :------------------------ | :--------------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------- |
| `notification.created`     | `NotificationService`     | `user:{recipientId}`                                       | Notification DTO (id, title, body, link, priority)      | AppShell bell, notifications cache, toast      |
| `request.created`          | `RequestService`          | `queue:requests`, `role:hardware_manager`                  | `{ id, request_no, title, priority, employee_id }`      | Requests list, New requests banner, KPI cards  |
| `request.status_changed`   | `RequestWorkflowService`  | `request:{id}`, `queue:requests`, `user:{ownerId}`         | `{ id, status, prev_status, reason }`                   | RequestDetail status badge, timeline, portal   |
| `request.comment_added`    | `RequestService`          | `request:{id}` (public) or `request:{id}:staff` (internal) | `{ id, request_id, comment, author_name, is_internal }` | RequestDetail comments thread                  |
| `credential.submitted`     | `CredentialVaultService`  | `queue:approvals`, `user:{ownerId}`                        | `{ id, label, credential_type_id, employee_id }`        | Credential Approvals queue                     |
| `credential.approved`      | `CredentialVaultService`  | `queue:approvals`, `user:{ownerId}`                        | `{ id, label, approval_status }`                        | Approvals list, Employee Accounts tab, Portal  |
| `asset.assigned`           | `AssetAssignmentService`  | `queue:dashboard`, `user:{ownerId}`, `asset:{id}`          | `{ asset_id, employee_id, assigned_at }`                | Asset detail, Employee Hardware tab, Dashboard |
| `asset.returned`           | `AssetAssignmentService`  | `queue:dashboard`, `user:{ownerId}`, `asset:{id}`          | `{ asset_id, employee_id, condition }`                  | Asset detail, Handover tasks queue             |
| `offboarding.task_updated` | `OffboardingTasksService` | `offboarding:{caseId}`, `queue:handover`, `user:{ownerId}` | `{ task_id, case_id, task_status, condition }`          | Offboarding detail, Handover queue             |
| `permissions.changed`      | `RoleService`             | `role:{roleName}`                                          | `{ role_id, module_id, access }`                        | Permission store refresh                       |
| `session.revoked`          | `UserService`             | `user:{id}`                                                | `{ user_id, reason }`                                   | Logout redirect with alert                     |
| `presence.updated`         | `RealtimeGateway`         | `request:{id}`                                             | `{ viewers: [{ userId, name, avatar }] }`               | Request detail viewer avatars                  |
| `typing.updated`           | `RealtimeGateway`         | `request:{id}`                                             | `{ userId, name, isTyping }`                            | Request detail typing bubble                   |

---

## 7. Database Upgrades: Notifications & Preferences

### 7.1 Schema Changes

1. **Extend `notifications` table**:
   - `category`: `VARCHAR(50)` (`request`, `credential`, `asset`, `software`, `offboarding`, `system`).
   - `entity_type`: `VARCHAR(50)` (e.g. `request`, `credential`, `asset`).
   - `entity_id`: `BIGINT UNSIGNED` nullable.
   - `body`: `TEXT` (maps to or replaces legacy `message`).
   - `link`: `VARCHAR(255)` deep link URL.
   - `priority`: `TINYINT UNSIGNED` default 1 (`1=low`, `2=normal`, `3=high`, `4=urgent`).
2. **Create `notification_preferences` table**:
   - `user_id`: Reference `users(id)`.
   - `category`: `VARCHAR(50)` (`request`, `credential`, `asset`, `software`, `offboarding`, `system`).
   - `in_app`: `TINYINT UNSIGNED` default 1.
   - `email`: `TINYINT UNSIGNED` default 1.
   - `desktop`: `TINYINT UNSIGNED` default 0.
   - `sound`: `TINYINT UNSIGNED` default 1.
   - Unique key on `(user_id, category)`.

---

## 8. Frontend Realtime Architecture (`apps/web`)

### 8.1 Provider & Hook Ecosystem

- `src/realtime/RealtimeProvider.tsx`:
  - Mounted inside `AppShell` for authenticated sessions.
  - Automatically reconnects with exponential backoff and jitter.
  - Handles `session.revoked` / `account.locked` by dispatching logout navigation.
  - Exposes `connectionState` (`connected`, `connecting`, `reconnecting`, `disconnected`).
- **Hooks**:
  - `useRealtimeEvent<T>(event, callback)`: Listen to specific typed event.
  - `useRoomSubscription(room)`: Join room on mount, leave on unmount, auto-rejoin on reconnect.
  - `usePresence(room)`: Track collaborative viewers in request/offboarding screens.
  - `useTypingIndicator(room)`: Dispatch and receive typing pulses with 5-second auto-expiry.
- `src/realtime/realtimeInvalidation.ts`:
  - Central map resolving real-time events to React Query query keys.
  - Invalidation calls debounced within a **300ms window** to avoid render thrashing.

### 8.2 Shared Components

1. `ConnectionStatus`: Header pill indicating `Live` (emerald), `Reconnecting` (amber), or `Offline` (zinc).
2. `NotificationItem`: Popover/list item with category icon, unread indicator, timestamp, action button.
3. `NotificationCenter`: Popover and full sheet with All/Unread tabs, Day grouping, Mark all read, and Preferences shortcut.
4. `PresenceAvatars`: Stacked avatar list showing active viewers.
5. `TypingIndicator`: Animated dot bubble with auto-dismiss.
6. `NewItemsBanner`: Sticky floating pill informing user of pending new rows without shifting list scroll.

---

## 9. Verification & Performance Targets

1. **Load Test Target (`npm run load:realtime`)**:
   - 500 concurrent socket connections.
   - 50 events/second sustained throughput.
   - p95 message delivery latency $< 300\text{ ms}$.
   - Zero memory leaks over 10-minute continuous run.
2. **Automated Integration Tests**:
   - Socket authentication & invalid token rejection.
   - Room authorization matrix & employee access restrictions.
   - Internal comments isolation (never sent to non-staff).
   - `emitAfterCommit` rollback test (no events emitted on failed transaction).
   - Multi-context Playwright flow verifying live collaboration between Employee and Hardware Manager.

---

_End of Design Specification. Ready for Phase R execution._
