# API Reference & Conventions

The Hardware Management API is a RESTful HTTP and WebSocket service providing centralized IT Asset Management, credential management, offboarding lifecycle automation, and operational analytics.

- **Interactive Documentation**: Swagger UI available at `http://localhost:8000/api-docs`
- **Machine-Readable OpenAPI Specification**: Exported and committed at [`docs/openapi.json`](file:///home/itl-lp-lenovo-13/DTL%20Projects/DTL/hardware-management/docs/openapi.json).

---

## 1. Request & Response Standards

### 1.1 Base URLs

- Local Development: `http://localhost:8000`
- Production: `https://<domain>`

### 1.2 Common Response Envelope

Every response returns a structured JSON envelope:

```json
{
  "status": 200,
  "message": "Operation successful.",
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 1.3 Error Format

```json
{
  "status": 403,
  "message": "You do not have sufficient permissions to perform this action.",
  "error": "Forbidden"
}
```

---

## 2. Authentication & Authorization

### 2.1 JWT Bearer Tokens

All protected endpoints require an `Authorization` header:
`Authorization: Bearer <jwt-token>`
Tokens are signed with HMAC-SHA256 and expire according to `ACCESS_TOKEN_EXPIRES` (default: 1 hour).
Refreshing tokens is performed via `POST /user/refresh-token` with `{ refreshToken: "..." }`.

### 2.2 Permissions Matrix & Roles

- `super_admin`: Unrestricted administrative and system access.
- `hardware_manager`: Asset, hardware, vendor, and equipment maintenance management.
- `hr`: Employee records, departments, designations, and offboarding workflows.
- `employee`: Self-service portal (`/my-assets`, `/requests`, credential submission).

---

## 3. Core Endpoint Groups

1. **Health Probes**:
   - `GET /health` - Application uptime and liveness check.
   - `GET /ready` - Database connection and readiness verification.
2. **Authentication**:
   - `POST /user/login` - Authenticate credentials and receive access/refresh tokens.
   - `POST /user/logout` - Invalidate active session tokens.
   - `GET /user/login-history` - View login audit trail for user.
3. **Employees**:
   - `POST /employee/list` - Paginated employee list with search and filters.
   - `POST /employee` - Create employee record.
   - `GET /employee/:id` - Fetch detailed employee record.
4. **Assets**:
   - `POST /asset/list` - Paginated hardware inventory.
   - `POST /asset` - Register new physical hardware.
   - `POST /asset/assign` - Assign hardware to employee.
5. **Offboarding**:
   - `POST /offboarding/cases/list` - List active and archived offboarding cases.
   - `GET /offboarding/cases/:id/clearance-pdf` - Download tamper-evident clearance certificate.
   - `GET /offboarding/cases/:id/handover-pdf` - Download equipment return receipt.
6. **Reports & Analytics**:
   - `POST /reports/list` - Role-filtered report catalogue.
   - `POST /reports/run` - Synchronous report execution (up to 5,000 rows).
   - `POST /reports/export` - Asynchronous streaming export (CSV, XLSX, PDF).
   - `GET /reports/jobs/:id/download` - Stream finished export file.
