import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PATTERNS = [
  {
    name: "Private Key",
    regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY-----/,
  },
  {
    name: "AWS Access Key ID",
    regex:
      /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  },
  {
    name: "GitHub Personal Access Token",
    regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/,
  },
  {
    name: "Slack Token",
    regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}/,
  },
  {
    name: "Generic API Key / Secret",
    regex:
      /(?:api[_-]?key|api[_-]?secret|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i,
  },
  {
    name: "Hardcoded Password in Config",
    regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
];

const IGNORE_PATTERNS = [
  /\.git\//,
  /node_modules\//,
  /dist\//,
  /\.env\.example/,
  /package-lock\.json/,
  /secret-scan\.mjs/,
];

function scanTrackedFiles() {
  const files = execSync("git ls-files", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);
  const findings = [];

  for (const file of files) {
    if (IGNORE_PATTERNS.some((p) => p.test(file))) continue;
    if (!fs.existsSync(file)) continue;

    const stats = fs.statSync(file);
    if (stats.size > 1024 * 1024) continue; // skip files > 1MB

    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        // Skip comments or placeholders
        if (
          line.includes("DETERMINISTIC_") ||
          line.includes("fixture") ||
          line.includes("placeholder") ||
          line.includes("TestPassword123!")
        ) {
          return;
        }

        for (const pattern of PATTERNS) {
          if (pattern.regex.test(line)) {
            findings.push({
              file,
              line: idx + 1,
              type: pattern.name,
              masked: line.trim().substring(0, 40) + "...",
            });
          }
        }
      });
    } catch {
      // binary file
    }
  }

  return findings;
}

console.log("=== Secret & Credential Scanning Audit ===");
const findings = scanTrackedFiles();

if (findings.length === 0) {
  console.log(
    "✓ Secret scan passed: 0 exposed production secrets or credentials found in tracked files.",
  );
} else {
  console.log(`Found ${findings.length} potential secret(s) to review:`);
  for (const f of findings) {
    console.log(`  - [${f.type}] in ${f.file}:${f.line}`);
  }
}
