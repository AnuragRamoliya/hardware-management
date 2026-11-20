#!/usr/bin/env bash
# ==============================================================================
# Database Backup Script for Hardware Management System
# ==============================================================================
# Usage: ./scripts/backup.sh [output_dir]
# Dumps MySQL database, compresses with gzip, and applies retention policy.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-}"
DB_NAME="${DB_DATABASE:-hardware_store}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup for '${DB_NAME}' at $(date -u +"%Y-%m-%dT%H:%M:%SZ")..."

# Prepare credentials
DUMP_OPTS=(--host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}")
if [ -n "${DB_PASS}" ]; then
  DUMP_OPTS+=(--password="${DB_PASS}")
else
  DUMP_OPTS+=(--skip-password)
fi

# Dump database with single transaction and consistency
mysqldump \
  "${DUMP_OPTS[@]}" \
  --single-transaction \
  --quick \
  --skip-routines \
  --triggers \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[SUCCESS] Backup created successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Apply retention policy: remove backups older than RETENTION_DAYS
echo "[INFO] Cleaning up backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "db_backup_${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "[INFO] Backup routine complete."
