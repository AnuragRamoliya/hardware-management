import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "components");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "tests"].includes(entry.name)) continue;
      await walk(file);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(file);
    }
  }
}

await walk(src);
let violations = 0;

for (const file of files) {
  const content = await readFile(file, "utf8");
  const rel = path.relative(root, file);

  if (/\bconsole\.(log|warn)\b/.test(content)) {
    console.error(`[check:ui] Disallowed console log in ${rel}`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`check:ui failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log("check:ui passed cleanly.");
}
