import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(repoRoot, "apps/web/src");
const matrixPath = path.resolve(repoRoot, "docs/COMPONENT_USAGE_MATRIX.md");

interface FieldUsage {
  file: string;
  line: number;
  component: string;
  kind: string;
  element: string;
  compliant: boolean;
  notes?: string;
}

const fieldUsages: FieldUsage[] = [];
const violations: string[] = [];

// Whitelisted UI component files where native controls or raw primitives are implemented
const allowedComponentPaths = new Set([
  "components/ui/input.tsx",
  "components/ui/textarea.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/switch.tsx",
  "components/ui/radio.tsx",
  "components/ui/button.tsx",
  "components/ui/native-select.tsx",
]);

function getFieldKind(name: string, props: Map<string, string>): string {
  const typeProp = props.get("type");
  if (name === "RHFTextField" || name === "Input") {
    if (typeProp === "password") return "password";
    if (typeProp === "number") return "number";
    if (typeProp === "date") return "date";
    if (typeProp === "search") return "search";
    if (typeProp === "file") return "file";
    if (typeProp === "email") return "text/email";
    return "text";
  }
  if (name === "RHFPasswordField") return "password";
  if (name === "RHFNumberField") return "number";
  if (name === "RHFTextArea" || name === "Textarea") return "textarea";
  if (name === "RHFSelect" || name === "Select") return "select";
  if (name === "RHFAsyncSelect") return "select (async)";
  if (name === "RHFMultiSelect") return "multiselect";
  if (
    name === "RHFPhoneField" ||
    name === "PhoneField" ||
    name === "RHFPhoneInput"
  )
    return "phone";
  if (name === "RHFDatePicker" || name === "DatePicker") return "date";
  if (name === "RHFTimePicker" || name === "TimePicker") return "time";
  if (name === "RHFDateTimePicker" || name === "DateTimePicker")
    return "datetime";
  if (name === "RHFDateRangePicker" || name === "DateRangePicker")
    return "date-range";
  if (name === "RHFCheckbox" || name === "Checkbox") return "checkbox";
  if (name === "RHFSwitch" || name === "Switch") return "switch";
  if (name === "RHFRadioGroup" || name === "Radio") return "radio";
  if (name === "RHFSearchInput") return "search";
  if (name === "RHFCurrencyField") return "currency";
  if (name === "RHFOtpInput") return "otp";
  if (name === "RHFTagsInput") return "tags";
  if (name === "RHFFileUpload" || name === "RHFFileField") return "file";
  return "custom";
}

function scanFile(filePath: string) {
  if (
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".spec.tsx") ||
    filePath.endsWith(".spec.ts")
  ) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const sf = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const relPath = path.relative(srcDir, filePath).split(path.sep).join("/");

  // Check forbidden imports outside components/ui and components/common
  const isSharedComp =
    relPath.startsWith("components/ui/") ||
    relPath.startsWith("components/common/");
  if (!isSharedComp) {
    const importRegex =
      /from\s+["'](@radix-ui\/react-select|@radix-ui\/react-popover|react-day-picker)["']/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      violations.push(
        `${relPath}: Direct third-party primitive import '${match[1]}' outside shared components.`,
      );
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sf);
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));

      // Extract props
      const propMap = new Map<string, string>();
      for (const attr of node.attributes.properties) {
        if (ts.isJsxAttribute(attr) && attr.initializer) {
          if (ts.isStringLiteral(attr.initializer)) {
            propMap.set(attr.name.getText(sf), attr.initializer.text);
          } else if (
            ts.isJsxExpression(attr.initializer) &&
            attr.initializer.expression
          ) {
            propMap.set(
              attr.name.getText(sf),
              attr.initializer.expression.getText(sf),
            );
          }
        }
      }

      // Check for raw native controls outside whitelisted ui implementation files
      if (["input", "select", "textarea"].includes(tagName)) {
        const isAllowed = allowedComponentPaths.has(relPath);
        if (!isAllowed) {
          violations.push(
            `${relPath}:${line + 1} Native <${tagName}> element used directly. Must use shared component.`,
          );
          fieldUsages.push({
            file: relPath,
            line: line + 1,
            component: `native <${tagName}>`,
            kind: propMap.get("type") || tagName,
            element: tagName,
            compliant: false,
            notes: "Direct native control",
          });
        }
      }

      // Check for shared and RHF field usages
      if (
        tagName.startsWith("RHF") ||
        tagName === "Input" ||
        tagName === "Textarea" ||
        tagName === "Select" ||
        tagName === "Checkbox" ||
        tagName === "Switch" ||
        tagName === "Radio" ||
        tagName === "PhoneField" ||
        tagName === "DatePicker" ||
        tagName === "DateRangePicker" ||
        tagName === "TimePicker" ||
        tagName === "DateTimePicker"
      ) {
        const kind = getFieldKind(tagName, propMap);
        fieldUsages.push({
          file: relPath,
          line: line + 1,
          component: tagName,
          kind,
          element: tagName,
          compliant: true,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

function walkDir(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "e2e"].includes(entry.name)) continue;
      walkDir(fullPath);
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      scanFile(fullPath);
    }
  }
}

console.log(
  "Scanning apps/web/src for field component usages and forbidden controls...",
);
walkDir(srcDir);

// Generate Markdown Matrix
let matrixContent = `# Component Usage Matrix\n\n`;
matrixContent += `Generated: ${new Date().toISOString()}\n`;
matrixContent += `Total scanned field usages: ${fieldUsages.length}\n`;
matrixContent += `Violations detected: ${violations.length}\n\n`;

matrixContent += `## Summary by Component Type\n\n`;
const summaryMap: Record<string, number> = {};
for (const u of fieldUsages) {
  summaryMap[u.component] = (summaryMap[u.component] || 0) + 1;
}
matrixContent += `| Component | Usage Count |\n| :--- | :--- |\n`;
for (const [comp, count] of Object.entries(summaryMap).sort(
  (a, b) => b[1] - a[1],
)) {
  matrixContent += `| \`${comp}\` | ${count} |\n`;
}

matrixContent += `\n## Detailed Field Usage Register\n\n`;
matrixContent += `| File:Line | Component | Kind | Status | Notes |\n`;
matrixContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
for (const u of fieldUsages) {
  const statusBadge = u.compliant ? "✅ Compliant" : "❌ Violation";
  matrixContent += `| \`${u.file}:${u.line}\` | \`${u.component}\` | ${u.kind} | ${statusBadge} | ${u.notes || ""} |\n`;
}

fs.writeFileSync(matrixPath, matrixContent, "utf-8");
console.log(
  `Updated ${path.relative(repoRoot, matrixPath)} with ${fieldUsages.length} usages.`,
);

if (violations.length > 0) {
  console.error(`\n❌ Field usage violations found (${violations.length}):`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  if (process.argv.includes("--strict")) {
    process.exit(1);
  }
} else {
  console.log(
    `\n✅ 0 field violations found! All field controls strictly comply with shared UI standards.`,
  );
}
