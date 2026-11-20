# Operations & Maintenance Runbook

## 1. Routine Service Operations

### 1.1 Starting and Stopping Services

- **Docker Compose**:
  - Start: `docker compose up -d`
  - Stop: `docker compose down`
  - View Logs: `docker compose logs -f api`
- **Native / PM2**:
  - Start: `pm2 start hm-api`
  - Restart: `pm2 reload hm-api`
  - Stop: `pm2 stop hm-api`

---

## 2. Database Backup & Disaster Recovery

### 2.1 Generating a Backup

Run the backup script (compresses dump and applies retention policy):

```bash
./scripts/backup.sh /var/backups/itam
```

### 2.2 Restoring from Backup

```bash
./scripts/restore.sh /var/backups/itam/db_backup_hardware_store_20261120_120000.sql.gz target_db_name
```

> [!IMPORTANT]
> `VAULT_ENCRYPTION_KEY` and `SECRET_KEY` must be backed up separately from MySQL database dumps. A restored database cannot decrypt credential vault entries without the exact matching encryption key version!

---

## 3. Cryptographic Key Rotation & Audit Verification

### 3.1 Verifying Audit Hash Chains

Verify tamper-free state of all activity and access logs:

```bash
npm run audit:verify --workspace=@hm/api
```

Expected output:
`[Audit Integrity Verifier] ALL AUDIT CHAINS ARE VALID AND TAMPER-FREE`

### 3.2 Vault Key Rotation

To rotate vault encryption keys:

1. Append the new 32-byte key to `VAULT_ENCRYPTION_KEYS` in environment configuration.
2. Run key rotation script:
   ```bash
   npm run vault:rotate --workspace=@hm/api
   ```
3. Verify previously stored credentials remain decryptable.

---

## 4. Troubleshooting Common Incidents

### 4.1 Stuck Export Jobs

If an export worker was halted mid-job:

- The system automatically transitions jobs in `processing` longer than 30 minutes to `failed`.
- To manually clean up stale export records:
  ```sql
  UPDATE export_jobs SET status = 'failed', error_message = 'Process terminated unexpectedly' WHERE status = 'processing' AND updated_at < NOW() - INTERVAL 1 HOUR;
  ```

### 4.2 Handling HTTP 429 Too Many Requests

If legitimate administrative operations receive rate-limit blocks:

- Adjust `windowMs` or `limit` settings in `apps/api/Middleware/rate_limiter.ts`.
- Ensure reverse proxy correctly forwards `X-Forwarded-For` header with trusted proxy configuration (`app.set('trust proxy', 1)`).
