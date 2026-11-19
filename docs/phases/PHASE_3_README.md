# Phase 3: Zero-Knowledge Credential Vault

Phase 3 delivers an enterprise-grade, zero-knowledge credential vault for securely storing, rotating, and sharing sensitive access credentials (email accounts, cloud logins, VPNs, server SSH keys, API tokens) with end-to-end encryption.

---

## 1. Scope & Modules

| Module / Resource       | Table Name                       | Purpose                                                                                    |
| :---------------------- | :------------------------------- | :----------------------------------------------------------------------------------------- |
| **Credentials**         | `credentials`                    | AES-256-GCM encrypted passwords and secrets. Secret fields excluded from default queries.  |
| **Credential Types**    | `credential_types`               | Master categories (Email, Server, VPN, Database, Portal) with complexity and expiry rules. |
| **Credential History**  | `credential_history`             | Historical audit trail of credential revisions and rotations.                              |
| **Collection Requests** | `credential_collection_requests` | Self-service requests prompting employees to securely submit credentials.                  |
| **Access Logs**         | `credential_access_logs`         | Immutable log of every secret decryption, reveal, or export action.                        |
| **Login History**       | `login_history`                  | User session logins, IP address, device, and user agent records.                           |

---

## 2. Key Architecture & Security Specifications

### 2.1 AES-256-GCM Cryptographic Architecture

- Every secret is encrypted using **AES-256-GCM** with a distinct 12-byte initialization vector (`iv`), generating a 16-byte authentication tag (`auth_tag`).
- Encryption keys are loaded from `VAULT_ENCRYPTION_KEY` (32-byte hexadecimal string).
- Multi-version key rotation support via `key_version`.

### 2.2 Strict Default Exclusions (`defaultScope`)

- The Sequelize model `credentials` defines a mandatory `defaultScope`:
  ```ts
  defaultScope: {
    attributes: {
      exclude: ["password_enc", "iv", "auth_tag", "key_version"];
    }
  }
  ```
- No query ever returns encrypted secret fields or decryption metadata unless explicitly queried using the privileged `.scope('withSecret')` method inside the vault service.

### 2.3 Access Logging & Auditability

- Revealing a password requires the specific `credentials:read` permission and creates an immediate `credential_access_logs` entry storing user ID, employee ID, IP address, and timestamp.

---

## 3. API Endpoints Reference

- `POST /credential/list`: Lists credential metadata without secrets.
- `POST /credential/add`: Encrypts and saves secret credentials.
- `POST /credential/reveal/:id`: Privileged reveal endpoint; decrypts secret and writes access log.
- `POST /credential/rotate/:id`: Re-encrypts password with new credentials or rotated master key.
- `POST /portal/credential/submit`: Employee self-service credential submission.
- `POST /credential-type/list`, `POST /credential-type/add`, `PUT /credential-type/update`.

---

## 4. Frontend Implementation

- **Pages**: `Credentials.tsx`, `CredentialTypes.tsx`, `CredentialApprovals.tsx`, `CredentialAccessLogs.tsx`, `PortalAccounts.tsx`.
- **Dialogs**: `RevealSecretDialog` (timed reveal modal with copy button and auto-hide timer), `CredentialHistoryDialog`, `CreateCollectionRequestDialog`.
