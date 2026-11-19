# Phase R: Real-Time Push & Notification System

Phase R provides low-latency, bi-directional real-time communication using Socket.IO 4.8. It instantly synchronizes in-app notifications, request status changes, comments, approval queues, and task progress without polling.

---

## 1. Scope & Capabilities

| Capability                 | Component                        | Purpose                                                                                  |
| :------------------------- | :------------------------------- | :--------------------------------------------------------------------------------------- |
| **Realtime Gateway**       | `Realtime/gateway.ts`            | Socket.IO server initialization, CORS, connection lifecycle, Redis adapter support.      |
| **Handshake Auth**         | `Realtime/auth.ts`               | JWT access token validation, user identification, and connection rejection guards.       |
| **Security Rooms**         | `Realtime/rooms.ts`              | Automatic assignment of sockets to user (`user:<id>`) and role (`role:<role>`) channels. |
| **Transactional Dispatch** | `Utils/emit_after_commit.ts`     | Guarantees events emit **only after** Sequelize transactions successfully commit.        |
| **Notification API**       | `Controllers/notifications.ts`   | REST endpoints for fetching notifications, reading notifications, and badge counts.      |
| **Live Bell & Badge**      | `components/layout/AppShell.tsx` | Unread badge indicator updated via push events with cache invalidation.                  |

---

## 2. Key Architecture & Design Principles

### 2.1 REST as the Single Source of Truth

- Sockets are strictly **server-to-client push channels**.
- All state changes (creates, approvals, updates) remain 100% on REST API endpoints with full decryption, validation, and audit logging.
- Clients never execute mutations via WebSockets.

### 2.2 Transactional Guarantees (`afterCommit`)

- Events are dispatched using `emitAfterCommit(transaction, callback)`.
- If a database transaction fails or is rolled back, zero events are emitted, preventing phantom alerts.

### 2.3 Targeted Room Matrix

- `user:<userId>`: Private alerts, personal unread count badge.
- `role:admin`, `role:hardware_admin`: Administrative queues and inventory alerts.
- `request:<requestId>`: Specific request timeline updates and comments.
- `offboarding:<caseId>`: Handover progress tracking.

---

## 3. Real-Time Events Catalog

Defined in `@hm/shared` under `REALTIME_EVENTS`:

- `notification:new`: Dispatches live toast notification to user.
- `notification:count`: Updates unread notification bell badge in real time.
- `request:status_changed`: Real-time status update on active requests.
- `request:comment_added`: Appends new comment to active discussion.
- `credential:approved`: Notifies user that credential access has been approved.
- `offboarding:task_updated`: Live update on handover task check-off.
- `inventory:alert`: Escalation alert for expiring warranties or low license seats.

---

## 4. Reconnection & Resilience

- **Automatic Reconnection**: Exponential backoff on dropped network connections.
- **Cache Invalidation**: On reconnect, the client invalidates React Query caches to re-sync missed updates.
- **Graceful Fallback**: If WebSockets are blocked by corporate proxies, the client seamlessly falls back to 60-second polling.
