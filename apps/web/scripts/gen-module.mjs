import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const [rawName, ...args] = process.argv.slice(2);
if (!rawName || !/^[a-z][a-z0-9-]*$/.test(rawName)) {
  console.error(
    'Usage: npm run gen:module -- <name> [--fields "name:text,status:enum"]',
  );
  process.exit(1);
}
const name = rawName.toLowerCase();
const pascal = name
  .split("-")
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join("");
const fieldsArg = args.indexOf("--fields");
const fields = fieldsArg >= 0 ? (args[fieldsArg + 1] ?? "") : "";
const fieldNames = fields
  .split(",")
  .filter(Boolean)
  .map((item) => item.split(":")[0].trim())
  .filter((field) => /^[a-z][a-z0-9_]*$/.test(field));
const root = process.cwd();
const files = new Map([
  [
    `src/api/${name}/index.ts`,
    `export type ${pascal}Record = { id: number; ${fieldNames.map((field) => `${field}?: string | number | boolean | null`).join("; ")} }\n\nexport const ${name.replaceAll("-", "")}Api = {\n  // Add typed endpoints here, preserving the API response envelope.\n};\n`,
  ],
  [
    `src/hooks/queries/${name}.ts`,
    `// Add React Query list/detail/mutation hooks for ${pascal} here.\n// Keep query keys stable and invalidate related lists after writes.\nexport const ${name.replaceAll("-", "")}Keys = { all: ["${name}"] as const };\n`,
  ],
  [
    `src/pages/${pascal}.schema.ts`,
    `import * as yup from "yup";\n\nexport const ${name.replaceAll("-", "")}Schema = yup.object({\n${fieldNames.map((field) => `  ${field}: yup.mixed().nullable(),`).join("\n")}\n});\n`,
  ],
  [
    `src/pages/${pascal}Filters.ts`,
    `import type { FilterField } from "@/components/common/TableFilters/types";\n\nexport const ${name.replaceAll("-", "")}Filters: FilterField[] = [\n${fieldNames.map((field) => `  { key: "${field}", label: "${field.replaceAll("_", " ")}", type: "text" },`).join("\n")}\n];\n`,
  ],
  [
    `src/pages/${pascal}Columns.tsx`,
    `import type { TableColumn } from "@/components/common/CommonTable";\n\nexport type ${pascal}Row = { id: number; ${fieldNames.map((field) => `${field}?: string | number | boolean | null`).join("; ")} };\nexport const ${name.replaceAll("-", "")}Columns: TableColumn<${pascal}Row>[] = [\n${fieldNames.map((field) => `  { id: "${field}", label: "${field.replaceAll("_", " ")}", render: (row) => row.${field} ?? "—" },`).join("\n")}\n];\n`,
  ],
  [
    `src/pages/${pascal}.tsx`,
    `import { PageHeader } from "@/components/common/PageHeader";\nimport { CommonTable } from "@/components/common/CommonTable";\nimport { useTableState } from "@/hooks/use-tableState";\nimport { ${name.replaceAll("-", "")}Columns, type ${pascal}Row } from "@/pages/${pascal}Columns";\nimport { ${name.replaceAll("-", "")}Filters } from "@/pages/${pascal}Filters";\n\nexport function ${pascal}() {\n  const { tableState, setTableState } = useTableState();\n  const rows: ${pascal}Row[] = []; // Replace with the module list query.\n  return <><PageHeader title="${pascal}" /><CommonTable columns={${name.replaceAll("-", "")}Columns} rows={rows} count={rows.length} query={tableState} onQueryChange={setTableState} filterFields={${name.replaceAll("-", "")}Filters} emptyTitle="No ${name.replaceAll("-", " ")}" /></>;\n}\n`,
  ],
  [
    `src/pages/${pascal}.test.tsx`,
    `// Add list, filter and form smoke coverage for ${pascal}.\n`,
  ],
]);
let conflicts = [];
for (const file of files.keys()) {
  try {
    await access(path.join(root, file), constants.F_OK);
    conflicts.push(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
if (conflicts.length) {
  console.error(
    `Refusing to overwrite existing files:\n${conflicts.join("\n")}`,
  );
  process.exit(1);
}
for (const [file, contents] of files) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
}
console.log(
  `Generated ${files.size} starter files for ${pascal}. Register routes, sidebar, permissions, and API endpoints before use.`,
);
