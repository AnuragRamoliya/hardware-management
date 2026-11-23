import crypto from 'node:crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function canonicalJson(data: unknown): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (data instanceof Date) {
    return JSON.stringify(data.toISOString());
  }

  if (Array.isArray(data)) {
    return `[${data.map(canonicalJson).join(',')}]`;
  }

  const keys = Object.keys(data as Record<string, unknown>)
    .filter((k) => k !== 'hash' && (data as Record<string, unknown>)[k] !== undefined)
    .sort();

  const pairs = keys.map((k) => {
    const val = (data as Record<string, unknown>)[k];
    return `${JSON.stringify(k)}:${canonicalJson(val)}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * Legacy canonical JSON (v0) where Date objects were serialized as empty objects {}
 * because Object.keys(new Date()) is empty. Kept for backwards-compatible verification
 * of existing legacy database records without requiring breaking data loss.
 */
export function canonicalJsonLegacy(data: unknown): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return `[${data.map(canonicalJsonLegacy).join(',')}]`;
  }

  const keys = Object.keys(data as Record<string, unknown>)
    .filter((k) => k !== 'hash' && (data as Record<string, unknown>)[k] !== undefined)
    .sort();

  const pairs = keys.map((k) => {
    const val = (data as Record<string, unknown>)[k];
    return `${JSON.stringify(k)}:${canonicalJsonLegacy(val)}`;
  });

  return `{${pairs.join(',')}}`;
}

export function computeRowHash(prevHash: string, rowData: Record<string, unknown>): string {
  const content = prevHash + canonicalJson(rowData);
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeRowHashLegacy(prevHash: string, rowData: Record<string, unknown>): string {
  const content = prevHash + canonicalJsonLegacy(rowData);
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export interface VerificationResult {
  valid: boolean;
  totalVerified: number;
  legacyVerified: number;
  brokenIndex?: number;
  expectedHash?: string;
  actualHash?: string;
  errorMessage?: string;
}

export function verifyHashChain<T extends { prev_hash: string; hash: string }>(
  rows: T[],
  extractRowData: (row: T) => Record<string, unknown>,
): VerificationResult {
  if (rows.length === 0) {
    return { valid: true, totalVerified: 0, legacyVerified: 0 };
  }

  let expectedPrevHash = GENESIS_HASH;
  let legacyCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    if (row.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        totalVerified: i,
        legacyVerified: legacyCount,
        brokenIndex: i,
        expectedHash: expectedPrevHash,
        actualHash: row.prev_hash,
        errorMessage: `Broken hash chain at row index ${i}: prev_hash mismatch.`,
      };
    }

    const rowData = extractRowData(row);
    const computedHash = computeRowHash(row.prev_hash, rowData);

    if (row.hash !== computedHash) {
      // Check if row was hashed under legacy v0 serialization (empty object for Date)
      const legacyComputedHash = computeRowHashLegacy(row.prev_hash, rowData);
      if (row.hash === legacyComputedHash) {
        legacyCount++;
      } else {
        return {
          valid: false,
          totalVerified: i,
          legacyVerified: legacyCount,
          brokenIndex: i,
          expectedHash: computedHash,
          actualHash: row.hash,
          errorMessage: `Broken hash chain at row index ${i}: data hash mismatch (tampered content).`,
        };
      }
    }

    expectedPrevHash = row.hash;
  }

  return { valid: true, totalVerified: rows.length, legacyVerified: legacyCount };
}
