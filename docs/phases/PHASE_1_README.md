# Phase 1: Foundation, Authentication, RBAC & Core Resources

Phase 1 provides the core foundation of the application, establishing security, authentication, role-based access control (RBAC), tamper-evident audit logging, and fundamental organization master data.

---

## 1. Scope & Modules

Phase 1 includes the following modules and tables:

| Module / Resource           | Table Name                        | Purpose                                                                |
| :-------------------------- | :-------------------------------- | :--------------------------------------------------------------------- |
| **Authentication & Tokens** | `users`, `user_tokens`            | JWT-based auth, refresh tokens, device tracking, rate limiting.        |
| **RBAC Security**           | `roles`, `modules`, `permissions` | Granular Read/Write/Delete permissions per module and role.            |
| **Audit Logs**              | `activity_logs`, `app_settings`   | Cryptographic SHA-256 hash-chained immutable audit trail.              |
| **Departments**             | `departments`                     | Organizational departments with active employee count tracking.        |
| **Designations**            | `designations`                    | Company job titles and organizational roles.                           |
| **Locations**               | `locations`                       | Physical office sites, branches, and warehouses.                       |
| **Vendors**                 | `vendors`                         | Hardware/software suppliers, contact details, and contracts.           |
| **Asset Categories**        | `asset_categories`                | Categorization hierarchy for physical hardware and IT assets.          |
| **Employees**               | `employees`                       | Full employee master records, manager hierarchy, and portal user link. |

---

## 2. Key Architecture & Features

### 2.1 Security & Authentication

- **Dual-Token System**: Access tokens (short-lived, 15m) and refresh tokens (long-lived, 7d) with automatic rotation.
- **Payload Encryption**: REST requests and responses support AES encryption via CryptoJS or plain-text mode with `plain-text: true`.
- **Brute-Force Protection**: Account lockout after 5 consecutive failed login attempts.

### 2.2 Tamper-Evident SHA-256 Audit Trail

- Every write across all modules writes an immutable record to `activity_logs`.
- Records include previous hash (`prev_hash`) and computed hash (`hash = SHA256(prev_hash + data)`), creating a tamper-evident blockchain-style hash chain.

### 2.3 Options Paging & High Performance Search

- High-performance `/options` endpoints supporting exact matches, prefix matches, and sub-string search.
- Virtual columns and index optimization for sub-2ms query times.

---

## 3. API Endpoints Reference

All resources follow standard REST patterns:

- `POST /<resource>/list`: Filtered, paginated, and sorted table records (`{ rows, count }`).
- `GET /<resource>/get/:id`: Single record retrieval with joined relations.
- `POST /<resource>/add`: Record creation inside an atomic transaction.
- `PUT /<resource>/update`: Partial or full record updates.
- `DELETE /<resource>/delete/:id`: Soft deletion (`status: 2`).
- `POST /<resource>/options`: Lightweight label/value pairs for frontend select boxes.

---

## 4. Frontend Implementation

- **Pages**: `Users.tsx`, `Roles.tsx`, `Employees.tsx`, `Departments.tsx`, `Designations.tsx`, `Locations.tsx`, `Vendors.tsx`, `AssetCategories.tsx`, `AuditLogs.tsx`.
- **Forms**: Slide-out drawers with responsive `FormGrid`, React Hook Form + Zod schema validation, and unsaved changes dirty-state guards.
- **Tables**: `CommonTable` with sorting, search, column toggle, CSV export, and standard rows-per-page select box.
