import fs from "node:fs";
import path from "node:path";

interface CountResult {
  package: string;
  files: number;
  tests: number;
}

function countInDirectory(
  dir: string,
  pattern: RegExp,
): { fileCount: number; testCount: number } {
  let fileCount = 0;
  let testCount = 0;

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "dist", ".turbo"].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (pattern.test(entry.name)) {
        fileCount += 1;
        const content = fs.readFileSync(fullPath, "utf8");
        // Count `it(`, `it.skip(`, `it.only(`, `test(`, `test.skip(`, `performanceTest(`
        const matches = content.match(
          /\b(it|test|performanceTest)\s*(\.skip|\.only)?\s*\(/g,
        );
        if (matches) {
          testCount += matches.length;
        }
      }
    }
  }

  walk(dir);
  return { fileCount, testCount };
}

const rootDir = path.resolve(__dirname, "..");

const api = countInDirectory(
  path.join(rootDir, "apps/api/tests"),
  /\.test\.ts$/,
);
const web = countInDirectory(
  path.join(rootDir, "apps/web/src"),
  /\.(test|spec)\.(ts|tsx)$/,
);
const shared = countInDirectory(
  path.join(rootDir, "packages/shared/test"),
  /\.test\.js$/,
);
const e2e = countInDirectory(path.join(rootDir, "apps/web/e2e"), /\.spec\.ts$/);

console.log("=== TEST SUITE COUNT REPORT ===");
console.log(
  `@hm/api (apps/api/tests):          ${api.fileCount} files, ~${api.testCount} tests`,
);
console.log(
  `@hm/web (apps/web/src):            ${web.fileCount} files, ~${web.testCount} tests`,
);
console.log(
  `@hm/shared (packages/shared/test): ${shared.fileCount} files, ~${shared.testCount} tests`,
);
console.log(
  `@hm/web e2e (apps/web/e2e):        ${e2e.fileCount} files, ~${e2e.testCount} test blocks`,
);
console.log(
  `Total Unit & Integration:          ${api.fileCount + web.fileCount + shared.fileCount} files, ~${api.testCount + web.testCount + shared.testCount} tests`,
);
console.log(
  `Grand Total (including E2E):       ${api.fileCount + web.fileCount + shared.fileCount + e2e.fileCount} files, ~${api.testCount + web.testCount + shared.testCount + e2e.testCount} tests`,
);
