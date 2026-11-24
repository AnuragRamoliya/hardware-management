import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const webSrcDir = path.resolve(process.cwd(), "apps/web/src");

interface ScanResults {
  nativeControlsOutsideUi: { file: string; line: number; tag: string }[];
  directRadixOutsideUi: { file: string; line: number; importClause: string }[];
  hardcodedColors: { file: string; line: number; match: string }[];
  arbitraryPxTailwind: { file: string; line: number; match: string }[];
  inlineStyles: { file: string; line: number; style: string }[];
  consoleStatements: { file: string; line: number; call: string }[];
  todosAndFixmes: { file: string; line: number; comment: string }[];
  filesOutsideModuleStructure: string[];
}

const results: ScanResults = {
  nativeControlsOutsideUi: [],
  directRadixOutsideUi: [],
  hardcodedColors: [],
  arbitraryPxTailwind: [],
  inlineStyles: [],
  consoleStatements: [],
  todosAndFixmes: [],
  filesOutsideModuleStructure: [],
};

// 1. Walk webSrcDir
function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allTsFiles = walkDir(webSrcDir);

const uiDirs = [
  path.join(webSrcDir, "components", "ui"),
  path.join(webSrcDir, "components", "hook-form"),
];

function isInsideUi(filePath: string): boolean {
  return uiDirs.some((d) => filePath.startsWith(d));
}

// Allowed folders in apps/web/src
const standardRoots = [
  "api",
  "components",
  "config",
  "contexts",
  "hooks",
  "layouts",
  "lib",
  "modules",
  "pages",
  "providers",
  "routes",
  "schemas",
  "services",
  "store",
  "styles",
  "test",
  "types",
  "utils",
];

for (const file of allTsFiles) {
  const relPath = path.relative(webSrcDir, file);
  const topDir = relPath.split(path.sep)[0];
  if (!relPath.includes(path.sep)) {
    // Root level files in src/ like App.tsx, main.tsx
    continue;
  }
  if (!standardRoots.includes(topDir)) {
    results.filesOutsideModuleStructure.push(relPath);
  }

  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  // Regex scans line by line
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Hard-coded hex colors (#fff, #123456, etc.) except inside comments, SVG fill="currentColor", or in styles/tokens
    if (
      !file.includes("styles") &&
      !file.includes("tokens") &&
      !file.includes("test")
    ) {
      const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hexMatches) {
        for (const m of hexMatches) {
          // ignore eslint-disable or url fragments
          if (
            !line.includes("eslint") &&
            !line.includes("http") &&
            !line.includes("data:")
          ) {
            results.hardcodedColors.push({
              file: relPath,
              line: lineNum,
              match: m,
            });
          }
        }
      }
    }

    // Arbitrary px tailwind classes e.g. w-[100px], h-[32px], top-[15px]
    const arbitraryPx = line.match(/\b[a-z0-9-]+-\[\d+px\]/g);
    if (arbitraryPx) {
      for (const m of arbitraryPx) {
        results.arbitraryPxTailwind.push({
          file: relPath,
          line: lineNum,
          match: m,
        });
      }
    }

    // Inline style={{ ... }}
    if (line.includes("style={{") && !file.includes(".test.")) {
      results.inlineStyles.push({
        file: relPath,
        line: lineNum,
        style: line.trim(),
      });
    }

    // Console statements
    if (
      /\bconsole\.(log|warn|error|info|debug)\b/.test(line) &&
      !file.includes(".test.")
    ) {
      results.consoleStatements.push({
        file: relPath,
        line: lineNum,
        call: line.trim(),
      });
    }

    // TODO / FIXME markers
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) {
      results.todosAndFixmes.push({
        file: relPath,
        line: lineNum,
        comment: line.trim(),
      });
    }
  });

  // AST Scans
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node: ts.Node) {
    // 1. Direct Radix imports outside components/ui
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"]/g, "");
      if (
        (moduleSpecifier.startsWith("@radix-ui") ||
          moduleSpecifier === "lucide-react") &&
        !isInsideUi(file)
      ) {
        // Lucide is allowed everywhere, but Radix should generally be encapsulated
        if (moduleSpecifier.startsWith("@radix-ui")) {
          const lineNum =
            sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          results.directRadixOutsideUi.push({
            file: relPath,
            line: lineNum,
            importClause: moduleSpecifier,
          });
        }
      }
    }

    // 2. Native form controls (<input>, <select>, <textarea>, <button>) outside components/ui
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (
        ["input", "select", "textarea"].includes(tagName) &&
        !isInsideUi(file)
      ) {
        const lineNum =
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        results.nativeControlsOutsideUi.push({
          file: relPath,
          line: lineNum,
          tag: tagName,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log("=== GAP ANALYSIS SCAN RESULTS ===");
console.log(`Scanned ${allTsFiles.length} files in apps/web/src`);
console.log(
  `Native controls outside components/ui: ${results.nativeControlsOutsideUi.length}`,
);
results.nativeControlsOutsideUi.forEach((x) =>
  console.log(`  ${x.file}:${x.line} <${x.tag}>`),
);

console.log(
  `Direct @radix-ui imports outside components/ui: ${results.directRadixOutsideUi.length}`,
);
results.directRadixOutsideUi.forEach((x) =>
  console.log(`  ${x.file}:${x.line} ${x.importClause}`),
);

console.log(`Hard-coded hex colors: ${results.hardcodedColors.length}`);
console.log(
  `Arbitrary px Tailwind classes: ${results.arbitraryPxTailwind.length}`,
);
console.log(`Inline style={{ ... }} usages: ${results.inlineStyles.length}`);
console.log(
  `Console statements (non-test): ${results.consoleStatements.length}`,
);
results.consoleStatements.forEach((x) =>
  console.log(`  ${x.file}:${x.line} ${x.call}`),
);

console.log(`TODO/FIXME comments: ${results.todosAndFixmes.length}`);
console.log(
  `Files outside standard structure: ${results.filesOutsideModuleStructure.length}`,
);
results.filesOutsideModuleStructure.forEach((x) => console.log(`  ${x}`));

fs.writeFileSync(
  path.resolve(process.cwd(), "docs/ui-standard/gap-scan-results.json"),
  JSON.stringify(results, null, 2),
  "utf-8",
);
console.log("Saved to docs/ui-standard/gap-scan-results.json");
