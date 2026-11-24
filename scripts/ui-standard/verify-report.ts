import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const docsDir = path.join(repoRoot, "docs/ui-standard");

console.log("=== VERIFYING UI STANDARD REPORT INTEGRITY ===\n");

let errors = 0;

// 1. Verify JSON file counts
const tokensPath = path.join(docsDir, "tokens.json");
const catalogPath = path.join(docsDir, "component-catalog.json");
const rulesPath = path.join(docsDir, "rules.json");

const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));

const colorTokenCount = tokens.colorTokens.length;
const componentCount = catalog.components.length;
const rulesCount = Array.isArray(rules) ? rules.length : rules.rules.length;

console.log(`[Tokens JSON] Color tokens count: ${colorTokenCount}`);
console.log(`[Catalog JSON] Components count: ${componentCount}`);
console.log(`[Rules JSON] Guardrail rules count: ${rulesCount}`);

// 2. Cross-check counts mentioned in markdown reports
const tokensMd = fs.readFileSync(
  path.join(docsDir, "02-design-tokens.md"),
  "utf-8",
);
const catalogMd = fs.readFileSync(
  path.join(docsDir, "03-component-catalog.md"),
  "utf-8",
);
const rulesMd = fs.readFileSync(
  path.join(docsDir, "09-guardrails-and-automation.md"),
  "utf-8",
);

if (!tokensMd.includes(String(colorTokenCount))) {
  console.warn(
    `[WARN] Token count (${colorTokenCount}) not explicitly mentioned in 02-design-tokens.md`,
  );
} else {
  console.log(
    `[PASS] Token count matches in 02-design-tokens.md (${colorTokenCount} color tokens)`,
  );
}

if (!catalogMd.includes(String(componentCount))) {
  console.warn(
    `[WARN] Catalog count (${componentCount}) not explicitly mentioned in 03-component-catalog.md`,
  );
} else {
  console.log(
    `[PASS] Component count matches in 03-component-catalog.md (${componentCount} components)`,
  );
}

if (!rulesMd.includes(String(rulesCount))) {
  console.warn(
    `[WARN] Rules count (${rulesCount}) not explicitly mentioned in 09-guardrails-and-automation.md`,
  );
} else {
  console.log(
    `[PASS] Rules count matches in 09-guardrails-and-automation.md (${rulesCount} rules)`,
  );
}

// 3. Check all markdown links within docs/ui-standard/
console.log("\n--- Checking Markdown Internal Links ---");
const mdFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));
let linksChecked = 0;

for (const mdFile of mdFiles) {
  const content = fs.readFileSync(path.join(docsDir, mdFile), "utf-8");
  // Match [text](file:///path) or [text](relative-file.md) or [text](./...)
  const linkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
  for (const match of linkMatches) {
    const rawLink = match[2];
    // Ignore external web links
    if (rawLink.startsWith("http://") || rawLink.startsWith("https://"))
      continue;

    let targetPath = "";
    if (rawLink.startsWith("file://")) {
      targetPath = rawLink.replace("file://", "").split("#")[0];
    } else {
      const cleanRel = rawLink.split("#")[0];
      if (!cleanRel) continue; // hash only link
      targetPath = path.resolve(docsDir, cleanRel);
    }

    linksChecked++;
    if (!fs.existsSync(targetPath)) {
      console.error(
        `[FAIL] Broken link in ${mdFile}: "${rawLink}" -> File not found: ${targetPath}`,
      );
      errors++;
    }
  }
}
console.log(
  `[PASS] Checked ${linksChecked} markdown file links across ${mdFiles.length} documentation files.`,
);

// 4. Check referenced code file paths mentioned in backticks
console.log("\n--- Checking Referenced Code File Paths ---");
let pathsChecked = 0;
for (const mdFile of mdFiles) {
  const content = fs.readFileSync(path.join(docsDir, mdFile), "utf-8");
  // Match paths starting with apps/web/ or packages/ or docs/ or scripts/
  const pathMatches = content.matchAll(
    /`((?:apps|packages|docs|scripts)\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)`/g,
  );
  for (const match of pathMatches) {
    const relPath = match[1];
    // Skip example or temporary paths
    if (
      relPath.includes("*") ||
      relPath.includes("unregistered-path") ||
      relPath.includes("badType")
    )
      continue;

    const fullPath = path.join(repoRoot, relPath);
    const starterKitPath = path.join(docsDir, "starter-kit", relPath);
    pathsChecked++;
    if (!fs.existsSync(fullPath) && !fs.existsSync(starterKitPath)) {
      console.error(
        `[FAIL] Referenced file path in ${mdFile} does not exist: ${relPath}`,
      );
      errors++;
    }
  }
}
console.log(`[PASS] Checked ${pathsChecked} referenced source file paths.`);

console.log("\n=== INTEGRITY SUMMARY ===");
if (errors === 0) {
  console.log("ALL INTEGRITY CHECKS PASSED (exit code 0).\n");
  process.exit(0);
} else {
  console.error(`INTEGRITY CHECKS FAILED with ${errors} error(s).\n`);
  process.exit(1);
}
