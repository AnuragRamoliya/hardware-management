import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('V1: Architectural Test - Blocking Raw Numeric Status Literals in Services and Jobs', () => {
  const targetFiles = [
    'Services/offboarding.service.ts',
    'Services/offboarding_tasks.service.ts',
    'Services/clearance_pdf.service.ts',
    'Services/asset_maintenance.ts',
    'Jobs/offboarding_daily.ts',
  ];

  it('ensures no raw status/asset_status numeric literals are present in targeted domain modules', () => {
    const apiRoot = path.resolve(__dirname, '..');
    const violations: Array<{ file: string; line: number; text: string }> = [];

    // Pattern matching raw numeric assignments like asset_status: 3, asset_status: 4, etc.
    const rawAssetStatusRegex = /asset_status:\s*[0-9]/;

    for (const relPath of targetFiles) {
      const fullPath = path.join(apiRoot, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
      lines.forEach((line, idx) => {
        if (rawAssetStatusRegex.test(line)) {
          violations.push({ file: relPath, line: idx + 1, text: line.trim() });
        }
      });
    }

    expect(
      violations,
      `Raw asset_status numeric literals found: ${JSON.stringify(violations)}`,
    ).toHaveLength(0);
  });
});
