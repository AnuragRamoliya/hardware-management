# Phase R: Real-Time Architecture & Notification System - Completion Report

This report documents the architectural design, security protocols, transactional guarantees, and integration details for **Phase R: Real-Time System** in the `hardware-management` platform.

---

## 1. Executive Summary

Phase R introduces full-duplex, low-latency push capability via **Socket.IO 4.8** with optional Redis multi-node clustering. It provides instantaneous state notifications across the platform (requests, asset handovers, credential approvals, inventory alerts, and user toasts) while maintaining 100% adherence to REST as the sole transactional source of truth.

---

## 2. Core Architectural Principles

1. **REST as the Single Source of Truth**:
   - WebSockets are used strictly for **server-to-client push events** and presence/room tracking.
   - Sockets never process mutation commands. All state transitions, validations, encryption, decryption, and audit logging remain on authenticated REST endpoints.
2. **Transactional Event Dispatching (`emitAfterCommit`)**:
   - Implemented via `apps/api/Utils/emit_after_commit.ts` and `apps/api/Services/realtime.service.ts`.
   - Binds to Sequelize transaction hooks (`afterCommit`). Events are dispatched **only if and when the database transaction successfully commits**.
   - If an operation fails or rolls back, zero events are emitted, preventing phantom alerts.
3. **Targeted Room Matrix**:
   - Prevents indiscriminate broadcasting. Events target specific security scopes:
     - `user:<userId>`: Private alerts and personal inbox badges.
     - `role:<roleName>`: Team-wide administrative queues (e.g., `role:admin`, `role:hardware_admin`).
     - `request:<requestId>`: Stakeholders following a specific request conversation.
     - `offboarding:<caseId>`: Handover parties and HR managers.
4. **Payload Minimization & Zero Secrets**:
   - Events omit sensitive credentials, passwords, cryptographic IVs, auth tags, and tokens.
   - Payloads contain only entity IDs, status identifiers, human-readable titles, timestamps, and deep links.

---

## 3. Real-Time Events Catalog

Defined in `packages/shared/src/index.ts` under `REALTIME_EVENTS`:

| Event Name                 | Target Room                 | Purpose                                              |
| :------------------------- | :-------------------------- | :--------------------------------------------------- |
| `notification:new`         | `user:<id>`                 | In-app push notification with toast alert            |
| `notification:count`       | `user:<id>`                 | Live update of the unread notification bell badge    |
| `request:status_changed`   | `request:<id>`, `user:<id>` | Live update on request approval/rejection/fulfilment |
| `request:comment_added`    | `request:<id>`              | Instant timeline comment append                      |
| `credential:approved`      | `user:<id>`, `role:admin`   | Notice of credential reveal authorization            |
| `offboarding:task_updated` | `offboarding:<id>`          | Task check-off and handover progress tracking        |
| `inventory:alert`          | `role:hardware_admin`       | Low license count or maintenance escalation          |

---

## 4. Implementation Components

### 4.1 Backend (`apps/api`)

- **`Realtime/gateway.ts`**: Initializes the Socket.IO server, registers middleware, configures CORS, and wires optional Redis adapter (`@socket.io/redis-adapter`) when `REDIS_URL` is set.
- **`Realtime/auth.ts`**: Authenticates incoming socket handshakes using JWT access tokens, validates user activity, and populates `socket.data.user`.
- **`Realtime/rooms.ts`**: Automatically joins connected sockets to their user and role rooms upon handshake.
- **`Services/realtime.service.ts`**: Provides domain services with a clean typed API (`publish(event, payload, room)`).
- **`Controllers/notifications.ts` & `Routes/notifications.ts`**: REST endpoints for fetching notifications, reading notifications, and unread counts.

### 4.2 Frontend (`apps/web`)

- **`components/layout/AppShell.tsx`**:
  - Live notification bell counter dynamically reflecting unread alerts.
  - Defensive parsing for notifications list payload supporting both array and `{ rows, count }` formats.
- **`hooks/queries/notifications.ts`**:
  - React Query hooks for fetching and marking notifications as read with targeted query cache invalidation.

---

## 5. Resilience & Disconnection Handling

- **Automatic Reconnection**: The Socket.IO client automatically attempts reconnection with exponential backoff.
- **Cache Invalidation on Reconnect**: When a reconnected event fires, the frontend triggers targeted React Query cache invalidations (`invalidateQueries`) to re-sync any missed updates.
- **Graceful Degradation**: If WebSockets are disabled or blocked by corporate firewalls, the application functions seamlessly via REST polling and manual refresh.
