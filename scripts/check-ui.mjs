import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const legacyNativeAllowlist = new Set([
  "components/common/CommonTable.tsx",
  "components/common/TableFilters/TableFilterPanel.tsx",
  "components/common/TableSelectFilter.tsx",
  "components/hook-form/fields.tsx",
  "components/layout/AppShell.tsx",
  "components/ui/button.tsx",
  "components/ui/input.tsx",
  "components/ui/select/SelectChip.tsx",
  "pages/AuditLogs.tsx",
  "pages/DesignSystem.tsx",
  "pages/Profile.tsx",
  "pages/ResourcePage.tsx",
  "pages/Roles.tsx",
]);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "test", "tests"].includes(entry.name)) continue;
      await walk(file);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      files.push(file);
    }
  }
}
await walk(src);
const failures = [];
let legacyControls = 0;
for (const file of files) {
  const relative = path.relative(src, file).split(path.sep).join("/");
  const source = await readFile(file, "utf8");
  if (relative.startsWith("api/") === false && /from\s+["']axios["']/.test(source)) failures.push(`${relative}: direct axios import; use src/api`);
  if (/console\.log\s*\(/.test(source)) failures.push(`${relative}: console.log found`);
  if (/window\.location(?:\.|\s*=)/.test(source)) failures.push(`${relative}: window.location navigation found`);
  if (/(?:className|style)\s*=\s*\{?[^\n]*#[0-9a-fA-F]{3,8}\b/.test(source)) failures.push(`${relative}: literal hex color found`);
  const hasNativeControls = /<(?:input|select|textarea|button)(?:\s|>)/.test(source);
  if (hasNativeControls && !relative.startsWith("components/ui/")) {
    if (relative.startsWith("modules/")) failures.push(`${relative}: raw native control outside components/ui`);
    else if (legacyNativeAllowlist.has(relative)) legacyControls += 1;
    else failures.push(`${relative}: native controls need a shared components/ui field or documented exception`);
  }
  if (relative.startsWith("modules/") && /AddEdit[^/]*\.tsx$/.test(relative) && !source.includes("FormProvider")) failures.push(`${relative}: form is missing FormProvider`);
  if (relative.startsWith("modules/") && /ListPage\.tsx$/.test(relative) && !source.includes("CommonTable")) failures.push(`${relative}: list page is missing CommonTable`);
  if (["api/", "hooks/", "utils/"].some((prefix) => relative.startsWith(prefix)) && /from\s+["']@\/pages\//.test(source)) failures.push(`${relative}: infrastructure imports a page`);
}
if (failures.length) {
  console.error("UI checks failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(`UI checks passed. ${legacyControls} existing files remain on the reviewed native-control migration allowlist.`);
}
