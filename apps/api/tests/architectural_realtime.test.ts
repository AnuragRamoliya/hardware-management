import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('V10: Architectural Guard - Realtime Gateway Emission Isolation', () => {
  function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (
          file === 'node_modules' ||
          file === 'dist' ||
          file === 'Realtime' ||
          file === 'tests' ||
          file === 'scripts'
        ) {
          continue;
        }
        getAllTsFiles(fullPath, fileList);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('ensures no application service or controller directly invokes io.emit or socket.emit', () => {
    const apiRoot = path.resolve(__dirname, '..');
    const sourceFiles = getAllTsFiles(apiRoot);

    const violations: Array<{ file: string; match: string }> = [];
    const directEmitRegex = /\b(io|socket)\.(to\([^)]+\)\.)?emit\(/g;

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(directEmitRegex);
      if (matches) {
        violations.push({
          file: path.relative(apiRoot, filePath),
          match: matches.join(', '),
        });
      }
    }

    expect(
      violations,
      `Direct socket.io emit calls found outside Realtime service: ${JSON.stringify(violations)}`,
    ).toHaveLength(0);
  });
});
