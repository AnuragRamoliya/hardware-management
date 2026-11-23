import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  canonicalJson,
  canonicalJsonLegacy,
  computeRowHash,
  computeRowHashLegacy,
  verifyHashChain,
  GENESIS_HASH,
} from '../Utils/hash_chain';

describe('Hash Chaining & Tamper Detection', () => {
  it('produces deterministic canonical JSON regardless of object key order', () => {
    const a = { z: 1, a: 2, m: { y: 'test', x: 10 } };
    const b = { a: 2, m: { x: 10, y: 'test' }, z: 1 };

    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":2,"m":{"x":10,"y":"test"},"z":1}');
  });

  it('serializes Date objects as ISO string in v1 canonicalJson and {} in legacy v0', () => {
    const d = new Date('2026-11-23T10:00:00.000Z');
    expect(canonicalJson(d)).toBe('"2026-11-23T10:00:00.000Z"');
    expect(canonicalJsonLegacy(d)).toBe('{}');
  });

  it('computes and verifies an untampered hash chain with independent non-circular hashing', () => {
    const rows = [
      { id: 1, action: 'reveal', reason: 'Audit check', prev_hash: '', hash: '' },
      { id: 2, action: 'copy', reason: 'Deployment', prev_hash: '', hash: '' },
      { id: 3, action: 'export', reason: 'Compliance', prev_hash: '', hash: '' },
    ];

    let prev = GENESIS_HASH;
    for (const row of rows) {
      row.prev_hash = prev;
      // Compute hash INDEPENDENTLY in test to prove non-circularity
      // Canonical key order: action, id, reason
      const canonicalPayload = `{"action":${JSON.stringify(row.action)},"id":${row.id},"reason":${JSON.stringify(row.reason)}}`;
      const independentHash = crypto
        .createHash('sha256')
        .update(prev + canonicalPayload, 'utf8')
        .digest('hex');

      // Must match computeRowHash
      expect(computeRowHash(prev, { id: row.id, action: row.action, reason: row.reason })).toBe(
        independentHash,
      );

      row.hash = independentHash;
      prev = row.hash;
    }

    const verification = verifyHashChain(rows, (r) => ({
      id: r.id,
      action: r.action,
      reason: r.reason,
    }));

    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBe(3);
    expect(verification.legacyVerified).toBe(0);
  });

  it('verifies a legacy v0 row containing Date object and flags it as legacyVerified', () => {
    const accessedAt = new Date('2026-01-01T00:00:00.000Z');
    const legacyRow = {
      id: 1,
      accessed_at: accessedAt,
      prev_hash: GENESIS_HASH,
      hash: '',
    };

    // Old format row computed with legacy Date serialization ({})
    legacyRow.hash = computeRowHashLegacy(GENESIS_HASH, {
      id: 1,
      accessed_at: accessedAt,
    });

    const verification = verifyHashChain([legacyRow], (r) => ({
      id: r.id,
      accessed_at: r.accessed_at,
    }));

    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBe(1);
    expect(verification.legacyVerified).toBe(1);
  });

  it('detects a modified row in the middle of the chain', () => {
    const rows = [
      { id: 1, action: 'reveal', prev_hash: '', hash: '' },
      { id: 2, action: 'copy', prev_hash: '', hash: '' },
      { id: 3, action: 'export', prev_hash: '', hash: '' },
    ];

    let prev = GENESIS_HASH;
    for (const row of rows) {
      row.prev_hash = prev;
      row.hash = computeRowHash(prev, { id: row.id, action: row.action });
      prev = row.hash;
    }

    // Tamper with row 2's action
    rows[1].action = 'tampered_action';

    const verification = verifyHashChain(rows, (r) => ({
      id: r.id,
      action: r.action,
    }));

    expect(verification.valid).toBe(false);
    expect(verification.brokenIndex).toBe(1);
  });

  it('detects an inserted or deleted row', () => {
    const rows = [
      { id: 1, action: 'reveal', prev_hash: '', hash: '' },
      { id: 2, action: 'copy', prev_hash: '', hash: '' },
      { id: 3, action: 'export', prev_hash: '', hash: '' },
    ];

    let prev = GENESIS_HASH;
    for (const row of rows) {
      row.prev_hash = prev;
      row.hash = computeRowHash(prev, { id: row.id, action: row.action });
      prev = row.hash;
    }

    // Delete row 2
    const tamperedRows = [rows[0], rows[2]];

    const verification = verifyHashChain(tamperedRows, (r) => ({
      id: r.id,
      action: r.action,
    }));

    expect(verification.valid).toBe(false);
    expect(verification.brokenIndex).toBe(1);
  });
});
