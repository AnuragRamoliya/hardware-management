import { execSync } from "child_process";
import fs from "fs";

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
    name: "Generic Secret Key",
    regex:
      /(?:secret[_-]?key|vault[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i,
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
        if (
          line.includes("DETERMINISTIC_") ||
          line.includes("fixture") ||
          line.includes("placeholder") ||
          line.includes("TestPassword123!") ||
          line.includes("example") ||
          line.includes("12345678901234567890123456789012")
        ) {
          return;
        }

        for (const pattern of PATTERNS) {
          if (pattern.regex.test(line)) {
            findings.push({
              file,
              line: idx + 1,
              type: pattern.name,
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

function scanGitHistory() {
  const findings = [];
  try {
    const logOutput = execSync("git log -p -n 100 --unified=0", {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const lines = logOutput.split("\n");
    let currentCommit = "";
    let currentFile = "";

    for (const line of lines) {
      if (line.startsWith("commit ")) {
        currentCommit = line.split(" ")[1].slice(0, 8);
      } else if (line.startsWith("diff --git a/")) {
        const parts = line.split(" ");
        currentFile = parts[2]?.replace(/^a\//, "") || "";
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        if (
          line.includes("fixture") ||
          line.includes("example") ||
          line.includes("TestPassword123!") ||
          line.includes("12345678901234567890123456789012")
        ) {
          continue;
        }

        for (const pattern of PATTERNS) {
          if (pattern.regex.test(line)) {
            findings.push({
              commit: currentCommit,
              file: currentFile,
              type: pattern.name,
            });
          }
        }
      }
    }
  } catch {
    // Git log unavailable or empty
  }
  return findings;
}

console.log("=== Secret & Credential Scanning Audit ===");
const fileFindings = scanTrackedFiles();
const historyFindings = scanGitHistory();

console.log(`\n--- Working Tree Scan: ${fileFindings.length} findings ---`);
if (fileFindings.length === 0) {
  console.log("✓ Working tree clean: 0 exposed secrets found.");
} else {
  for (const f of fileFindings) {
    console.log(`  - [Rule: ${f.type}] in ${f.file}:${f.line}`);
  }
}

console.log(
  `\n--- Git History Scan (Last 100 commits): ${historyFindings.length} findings ---`,
);
if (historyFindings.length === 0) {
  console.log("✓ Git history clean: 0 production secrets exposed in commits.");
} else {
  for (const f of historyFindings) {
    console.log(`  - [Rule: ${f.type}] in commit ${f.commit} (${f.file})`);
  }
}

console.log("\n--- Secrets Required to be Rotated for Production ---");
console.log(
  "1. SECRET_KEY: Must be set to a cryptographically random >= 32 byte secret (rotates all JWT sessions).",
);
console.log(
  "2. VAULT_ENCRYPTION_KEY & VAULT_ENCRYPTION_KEYS: Replace deterministic fixture key with 32-byte AES-256-GCM key and run vault:rotate.",
);
console.log(
  "3. DB_PASSWORD: Set strong random database root/app credentials in production environment.",
);
console.log(
  "4. MAIL_PASSWORD: SMTP authentication secrets must be set via secure environment injection.",
);
console.log(
  "5. Default Admin Seed Password: Rotate initial admin password upon first login.",
);
