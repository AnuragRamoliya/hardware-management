import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "components");

const allowedPrimitives = new Set([
  "components/ui/Input.tsx",
  "components/ui/Textarea.tsx",
  "components/ui/Checkbox.tsx",
  "components/ui/RadioGroup.tsx",
  "components/ui/Switch.tsx",
  "components/ui/Button.tsx",
]);

let violations = 0;

function walk(dir: string) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith(".tsx")) {
      const rel = path.relative(root, full);
      if (allowedPrimitives.has(rel)) continue;

      const code = fs.readFileSync(full, "utf8");
      const sf = ts.createSourceFile(
        full,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      function visit(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(sf);
          if (["input", "select", "textarea"].includes(tag)) {
            console.error(`[check:field-usage] Raw <${tag}> in ${rel}`);
            violations++;
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(sf);
    }
  }
}

walk(srcDir);

if (violations > 0) {
  console.error(`check:field-usage failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log("check:field-usage passed cleanly.");
}
