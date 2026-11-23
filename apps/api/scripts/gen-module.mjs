import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const [name] = process.argv.slice(2);
if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
  console.error("Usage: npm run gen:module -- <snake_case_resource>");
  process.exit(1);
}
const pascal = name.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const files = new Map([
  [`Routes/${name}.ts`, `// Register resource routes here, preserving the existing auth/permission middleware order.\nexport const ${name}RouteModule = "${name}";\n`],
  [`Controllers/${name}.ts`, `// Adapt Express request/actor data to typed ${name} service calls.\nexport const ${name}ControllerModule = "${name}";\n`],
  [`Services/${name}.ts`, `// Implement ${name} business rules, transactions, whitelisted filters, and activity logs here.\nexport const ${name}ServiceModule = "${name}";\n`],
  [`Models/${name}.ts`, `// Export ${pascal} Sequelize model types from the module schema.\nexport type ${pascal}Module = { readonly resource: "${name}" };\n`],
  [`Database/Schema/${name}.ts`, `// Define only ${name} columns and associations in the established schema format.\nexport const ${name}SchemaModule = "${name}";\n`],
  [`Swagger/${name}.ts`, `// Add OpenAPI path and response documentation for ${name}.\nexport const ${name}SwaggerTag = "${name}";\n`],
  [`tests/${name}.test.ts`, `import { describe, it, expect } from "vitest";\n\ndescribe("${name} module scaffold", () => {\n  it("is registered for implementation", () => {\n    expect("${name}").toBe("${name}");\n  });\n});\n`],
]);
for (const file of files.keys()) {
  try {
    await access(path.resolve(file), constants.F_OK);
    console.error(`Refusing to overwrite ${file}`);
    process.exit(1);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
for (const [file, content] of files) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}
console.log(`Created ${files.size} ${name} scaffold files. Register the route, schema, RBAC, migrations, options, activity constants, and Swagger paths.`);
