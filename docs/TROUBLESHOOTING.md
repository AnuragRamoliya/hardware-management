# Troubleshooting & Incident Resolution Guide

## 1. Quick Diagnostic Flowchart

```mermaid
flowchart TD
    Start["Service Issue Reported"] --> CheckHealth["Curl GET /health"]
    CheckHealth -->|Fails / Timeout| RestartAPI["Check API Process / PM2 / Docker logs"]
    CheckHealth -->|200 OK| CheckReady["Curl GET /ready"]
    CheckReady -->|503 Unhealthy| CheckDB["Verify MySQL connection, credentials, and host"]
    CheckReady -->|200 OK| CheckBrowser["Check Browser Console & Network Tab"]
    CheckBrowser -->|401/403 Error| CheckAuth["Check Token Expiry & Role Permissions"]
    CheckBrowser -->|429 Error| CheckRateLimit["Review rate limiting windows"]
```

---

## 2. Common Errors and Solutions

### 2.1 "You do not have sufficient permissions to perform this action" (HTTP 403)

- **Root Cause**: The user's role does not have the required access permission for this module or action.
- **Resolution**:
  - Super admins can adjust role permissions in **Administration** -> **Roles & Permissions**.
  - For reports: Verify whether the report is restricted to specific roles (e.g. Credential Approvals report is restricted to `super_admin`).

### 2.2 "Cannot connect to server" (HTTP Error / ECONNREFUSED)

- **Root Cause**: Backend API server is stopped or crashing on boot.
- **Resolution**:
  - Check process logs: `docker compose logs api` or check stdout.
  - Test connectivity directly: `curl -v http://localhost:8000/health`.
  - Verify database connectivity: Ensure MySQL port 3306 is listening.

### 2.3 "Certificate Verification Failed"

- **Root Cause**: Submitted document verification code does not match any completed offboarding clearance or has been tampered with.
- **Resolution**: Confirm code format matches `CLR-YYYY-XXXXX` and case has reached `Completed` status.
