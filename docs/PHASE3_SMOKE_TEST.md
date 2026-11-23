# Phase 3: Secure Credential Vault - Smoke Test & Verification Guide

This guide details the complete manual and automated verification procedure for the **Phase 3 Secure Credential Vault with Approval Workflow and Tamper-Evident Access Trail** in `hardware-management`.

---

## 1. Architecture & Security Overview

The Credential Vault provides high-assurance secret management for enterprise IT operations:

- **Authenticated Encryption at Rest**: AES-256-GCM with row-bound Additional Authenticated Data (`AAD = credential:${id}:employee:${employee_id}`). Any unauthorized tampering or moving of ciphertext between rows invalidates the GCM authentication tag.
- **Strict Zero-Knowledge Memory Lifetime**: Decrypted secrets are never stored in database default scopes, React Query caches, Zustand stores, or persistent local storage.
- **Re-Authentication Gate**: Password re-challenge (`POST /user/reauth`) granting a short-lived 5-minute single-purpose ticket for secret reveal, rate limited to 10 reveals/hour with mandatory justification.
- **Tamper-Evident Hash Chains**: `credential_access_logs` and `activity_logs` maintain forward-secure cryptographic hash chains: `hash = SHA-256(prev_hash + canonical_json)`.
- **Approval State Machine**: Employee-submitted accounts must be reviewed and authorized before activation.
- **Access Hardening**: Account lockout after 5 consecutive failed sign-ins (15-minute lock), active session revocation, and immutable sign-in history.

---

## 2. Automated Test Suite Verification

Run the dedicated Phase 3 cryptographic and access control unit/integration tests:

```bash
cd apps/api
npm test -- tests/credentials.test.ts
```

### Verified Test Cases

1. `AES-256-GCM Roundtrip`: Verifies correct encryption and decryption using active vault key.
2. `AAD Tamper Rejection`: Verifies that modifying ciphertext, changing employee ID in AAD, or swapping records throws an authentication failure error.
3. `Secret Leak Scanning`: Verifies that `findAndCountAll` queries never leak `encrypted_secret` or plaintext secrets in unauthenticated responses.
4. `Password Policy Enforcement`: Verifies complexity rules (minimum length, uppercase, lowercase, numbers, symbols, forbidden substrings).
5. `Re-Auth & Reveal Gating`: Verifies that secret reveal requires a valid, unexpired re-auth token and rate-limits abuse.
6. `Cryptographic Hash Chain Verification`: Verifies unbroken hash linkage across sequential audit log entries and detects intentional log corruption.

All 44 test suites across `@hm/api` execute cleanly.

---

## 3. End-to-End Smoke Test Workflows

### Scenario A: Admin Creates Company-Provided Credential

1. **Navigate**: Sign in as Admin (`admin@dtl.com`) and open **Credentials > Vault** (`/credentials`).
2. **Action**: Click **Add credential**.
3. **Form Entry**:
   - Target Employee: Select an active employee.
   - Credential Type: Select `Email / Google Workspace` or `VPN`.
   - Label: `dtl-work-account`.
   - Username: `john.doe@company.com`.
   - Password: Click the **Generate** button (observes password strength indicator update).
   - Require password change on first use: Toggle ON.
4. **Verification**:
   - Record appears in the table with origin badge `Company Provided` and status `Approved`.
   - Inspect database: `encrypted_secret` is encrypted in AES-256-GCM format (`iv:tag:ciphertext`), zero plaintext in database or response.

### Scenario B: Reveal Secret via Re-Auth Modal

1. **Navigate**: In the Credentials list or Employee Detail **Accounts** tab (`/employees/:id`), click the **Reveal** action on any credential.
2. **Step 1 - Re-Authentication**:
   - Modal prompts for current admin password.
   - Enter password and mandatory audit justification (e.g. `Emergency server access for maintenance`).
   - Click **Verify & Proceed**.
3. **Step 2 - Secret Display**:
   - Secret is revealed in monospace format with copy button.
   - Notice the **30-second clipboard clearing timer** and **60-second modal auto-close timer**.
   - Decrypted secret is never cached in React Query or browser state.
4. **Verification**:
   - Navigate to **Credentials > Access Logs** (`/credentials/access-logs`).
   - A new immutable audit entry is logged with action `REVEAL`, recording the accessor, timestamp, IP address, and justification.

### Scenario C: Employee Self-Service & Consent Gate (Portal)

1. **Navigate**: Sign in as an employee (`portal` role) and go to **My Accounts** (`/portal/accounts`).
2. **Consent Modal**:
   - On first visit, the employee privacy and collection policy consent modal appears.
   - Review policy and click **Acknowledge & Consent**.
3. **Submit Account**:
   - Click **Add account**.
   - Select allowed submission type (e.g. `Git / Personal GitHub` or `Laptop BitLocker`).
   - Fill in username and secret.
   - Click **Submit for IT Review**.
4. **Verification**:
   - Account appears in portal list with status `Pending Review`.
   - Sign in as Admin: Account appears in **Credentials > Approvals Queue** (`/credentials/approvals`).
   - Admin can **Approve**, **Reject**, or request modifications with **Needs Change** feedback.

### Scenario D: Collection Request Dispatch

1. **Admin Action**: Open **Credentials > Collection Requests** (`/credentials/requests`).
2. **Create Request**:
   - Click **New Collection Request**.
   - Select Target Employee, Credential Type (e.g. `Laptop BitLocker Key`), and Due Date.
   - Click **Dispatch Request**.
3. **Employee Portal**:
   - Employee opens `/portal/accounts`.
   - An alert banner displays: `"Action Required: 1 outstanding credential request"`.
   - Employee clicks **Submit Requested Account** to fulfill.
4. **Completion**:
   - Request status transitions from `PENDING` to `FULFILLED`.

### Scenario E: Cryptographic Hash Chain Audit Verification

1. **Web UI Verification**:
   - Navigate to **Credentials > Access Logs** (`/credentials/access-logs`).
   - Click **Verify Audit Integrity**.
   - The modal verifies the entire sequential SHA-256 chain and displays verification status: `Audit Chain Valid - Zero Tampering Detected`.
2. **CLI Integrity Tool**:
   - Run the standalone verification script:
     ```bash
     cd apps/api
     npm run audit:verify
     ```
   - Output verifies both `credential_access_logs` and `activity_logs` hash integrity.

### Scenario F: Security Hardening (Lockout & Active Sessions)

1. **Account Lockout**:
   - Attempt to log in with 5 consecutive incorrect passwords.
   - On the 5th attempt, the API returns HTTP 423: `"Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes."`.
2. **Session Management**:
   - In **Profile > Security** (`/profile`), inspect the **Active Sessions** list.
   - Current session is badged `Current Session`.
   - Click **Revoke Other Sessions** to invalidate all other active tokens immediately.
