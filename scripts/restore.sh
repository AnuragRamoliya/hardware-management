#!/usr/bin/env bash
# ==============================================================================
# Database Restore Script for Hardware Management System
# ==============================================================================
# Usage: ./scripts/restore.sh <path_to_backup.sql.gz> [target_database]
# Restores a compressed SQL dump into the target database.
# ==============================================================================
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: Backup file must be specified."
  echo "Usage: $0 <path_to_backup.sql.gz> [target_database]"
  exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-}"
DB_NAME="${2:-${DB_DATABASE:-hardware_store}}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

echo "[INFO] Restoring database '${DB_NAME}' from '${BACKUP_FILE}' at $(date -u +"%Y-%m-%dT%H:%M:%SZ")..."

MYSQL_OPTS=(--host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}")
if [ -n "${DB_PASS}" ]; then
  MYSQL_OPTS+=(--password="${DB_PASS}")
else
  MYSQL_OPTS+=(--skip-password)
fi

# Create database if it does not exist
mysql "${MYSQL_OPTS[@]}" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;"

# Decompress and stream to MySQL
gzip -dc "${BACKUP_FILE}" | mysql "${MYSQL_OPTS[@]}" "${DB_NAME}"

echo "[SUCCESS] Database '${DB_NAME}' restored successfully from '${BACKUP_FILE}'."
