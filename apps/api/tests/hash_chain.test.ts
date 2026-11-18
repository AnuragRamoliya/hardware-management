import { describe, it, expect } from 'vitest';
import { canonicalJson, computeRowHash, verifyHashChain, GENESIS_HASH } from '../Utils/hash_chain';

describe('Hash Chaining & Tamper Detection', () => {
  it('produces deterministic canonical JSON regardless of object key order', () => {
    const a = { z: 1, a: 2, m: { y: 'test', x: 10 } };
    const b = { a: 2, m: { x: 10, y: 'test' }, z: 1 };

    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":2,"m":{"x":10,"y":"test"},"z":1}');
  });

  it('computes and verifies an untampered hash chain', () => {
    const rows = [
      { id: 1, action: 'reveal', reason: 'Audit check', prev_hash: '', hash: '' },
      { id: 2, action: 'copy', reason: 'Deployment', prev_hash: '', hash: '' },
      { id: 3, action: 'export', reason: 'Compliance', prev_hash: '', hash: '' },
    ];

    let prev = GENESIS_HASH;
    for (const row of rows) {
      row.prev_hash = prev;
      row.hash = computeRowHash(prev, { id: row.id, action: row.action, reason: row.reason });
      prev = row.hash;
    }

    const verification = verifyHashChain(rows, (r) => ({
      id: r.id,
      action: r.action,
      reason: r.reason,
    }));

    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBe(3);
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
