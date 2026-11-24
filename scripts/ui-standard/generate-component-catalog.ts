import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const repoRoot = path.resolve(__dirname, "../..");
const webSrc = path.join(repoRoot, "apps/web/src");

const sharedDirs = [
  path.join(webSrc, "components/ui"),
  path.join(webSrc, "components/common"),
  path.join(webSrc, "components/hook-form"),
  path.join(webSrc, "components/layout"),
];

function getAllFiles(dir: string, pattern: RegExp): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full, pattern));
    } else if (pattern.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const allWebSrcFiles = getAllFiles(webSrc, /\.(tsx?|jsx?)$/);
const componentFiles = sharedDirs
  .flatMap((d) => (fs.existsSync(d) ? getAllFiles(d, /\.tsx$/) : []))
  .filter((f) => !f.endsWith(".test.tsx") && !f.endsWith(".spec.tsx"));

// Map of file contents for fast searching
const fileContents = new Map<string, string>();
for (const f of allWebSrcFiles) {
  fileContents.set(f, fs.readFileSync(f, "utf8"));
}

const designSystemContent =
  fileContents.get(path.join(webSrc, "pages/DesignSystem.tsx")) || "";

interface ComponentMeta {
  name: string;
  file: string;
  props: {
    name: string;
    type: string;
    optional: boolean;
    defaultVal?: string;
  }[];
  variantsAndSizes: string[];
  slotsAndChildren: string;
  accessibility: {
    roles: string[];
    ariaAttributes: string[];
    keyboardHandlers: string[];
    focusManagement: string[];
  };
  externalDeps: string[];
  internalSharedDeps: string[];
  usageCount: number;
  inDesignSystem: boolean;
  designSystemStates: string[];
  hasTests: boolean;
  testFile?: string;
  realUsageSnippet?: { file: string; line: number; snippet: string };
  status: "active" | "unused" | "near-duplicate";
  notes?: string;
}

const catalog: ComponentMeta[] = [];

for (const compFile of componentFiles) {
  const relPath = path.relative(repoRoot, compFile);
  const code = fileContents.get(compFile) || "";
  const sourceFile = ts.createSourceFile(
    compFile,
    code,
    ts.ScriptTarget.Latest,
    true,
  );

  // Extract exported functions / components
  const exportedComponents: string[] = [];
  const propsList: {
    name: string;
    type: string;
    optional: boolean;
    defaultVal?: string;
  }[] = [];
  const externalDeps: Set<string> = new Set();
  const internalSharedDeps: Set<string> = new Set();

  // Find imports
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      if (
        moduleSpecifier.startsWith("@radix-ui") ||
        moduleSpecifier === "lucide-react" ||
        moduleSpecifier === "react-day-picker" ||
        moduleSpecifier === "libphonenumber-js" ||
        moduleSpecifier === "recharts"
      ) {
        externalDeps.add(moduleSpecifier);
      } else if (
        moduleSpecifier.startsWith("@/components/ui") ||
        moduleSpecifier.startsWith("@/components/common") ||
        moduleSpecifier.startsWith("@/components/hook-form")
      ) {
        internalSharedDeps.add(moduleSpecifier);
      }
    }

    // Find interfaces / type aliases for Props
    if (
      ts.isInterfaceDeclaration(node) &&
      (node.name.text.endsWith("Props") || node.name.text.endsWith("Options"))
    ) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const propName = member.name.getText(sourceFile);
          const propType = member.type
            ? member.type.getText(sourceFile)
            : "any";
          const optional = !!member.questionToken;
          propsList.push({ name: propName, type: propType, optional });
        }
      }
    }

    // Find exported functions
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      exportedComponents.push(node.name.text);
    } else if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          // Ignore non-component constants if lowercase unless common
          if (/^[A-Z]/.test(name)) {
            exportedComponents.push(name);
          }
        }
      }
    }
  });

  const mainComponentName =
    exportedComponents[0] || path.basename(compFile, ".tsx");

  // Accessibility AST extraction
  const roles = new Set<string>();
  const ariaAttributes = new Set<string>();
  const keyboardHandlers = new Set<string>();
  const focusManagement = new Set<string>();

  const roleMatches = code.match(/role=["']([^"']+)["']/g);
  if (roleMatches) {
    roleMatches.forEach((m) => roles.add(m.replace(/role=["']|["']/g, "")));
  }

  const ariaMatches = code.match(/\baria-[a-zA-Z]+(?==)/g);
  if (ariaMatches) {
    ariaMatches.forEach((m) => ariaAttributes.add(m));
  }

  const keyMatches = code.match(/\bon(KeyDown|KeyUp|KeyPress)\b/g);
  if (keyMatches) {
    keyMatches.forEach((m) => keyboardHandlers.add(m));
  }

  if (
    code.includes("focus()") ||
    code.includes("focus-visible") ||
    code.includes("autoFocus") ||
    code.includes("tabIndex")
  ) {
    focusManagement.add("focus-management-present");
  }

  // Variants & sizes
  const variantsAndSizes: string[] = [];
  if (code.includes("sizeVariant") || code.includes("size")) {
    variantsAndSizes.push("sm", "md", "lg");
  }
  if (code.includes("variant")) {
    const varMatches = code.match(/variant:\s*\{([^}]+)\}/);
    if (varMatches) {
      variantsAndSizes.push(
        ...varMatches[1]
          .split("\n")
          .map((s) => s.trim().split(":")[0])
          .filter(Boolean),
      );
    }
  }

  // Check tests
  const testPath1 = compFile.replace(/\.tsx$/, ".test.tsx");
  const testPath2 = path.join(
    path.dirname(compFile),
    "__tests__",
    path.basename(compFile).replace(/\.tsx$/, ".test.tsx"),
  );
  const hasTests = fs.existsSync(testPath1) || fs.existsSync(testPath2);
  const testFile = hasTests
    ? path.relative(repoRoot, fs.existsSync(testPath1) ? testPath1 : testPath2)
    : undefined;

  // Usages count across apps/web/src (excluding itself and test files)
  let usageCount = 0;
  let realUsageSnippet:
    { file: string; line: number; snippet: string } | undefined;

  const usageRegex = new RegExp(`<${mainComponentName}\\b`, "g");
  for (const [f, c] of fileContents.entries()) {
    if (f === compFile || f.endsWith(".test.tsx") || f.endsWith(".spec.ts"))
      continue;
    const matches = c.match(usageRegex);
    if (matches) {
      usageCount += matches.length;
      if (!realUsageSnippet && !f.includes("DesignSystem.tsx")) {
        const lines = c.split("\n");
        const matchIdx = lines.findIndex((l) =>
          l.includes(`<${mainComponentName}`),
        );
        if (matchIdx !== -1) {
          const snippet = lines
            .slice(matchIdx, matchIdx + 4)
            .join("\n")
            .trim();
          realUsageSnippet = {
            file: path.relative(repoRoot, f),
            line: matchIdx + 1,
            snippet,
          };
        }
      }
    }
  }

  // In DesignSystem.tsx?
  const inDesignSystem = designSystemContent.includes(`<${mainComponentName}`);
  const designSystemStates: string[] = [];
  if (inDesignSystem) {
    if (designSystemContent.includes("disabled"))
      designSystemStates.push("disabled");
    if (
      designSystemContent.includes("error") ||
      designSystemContent.includes("invalid")
    )
      designSystemStates.push("error");
    if (designSystemContent.includes("loading"))
      designSystemStates.push("loading");
    if (designSystemContent.includes("default"))
      designSystemStates.push("default");
  }

  // Check duplicates / near-duplicates / status
  let status: "active" | "unused" | "near-duplicate" = "active";
  let notes = "";
  if (usageCount === 0 && !inDesignSystem) {
    status = "unused";
    notes =
      "Zero usages in application and not displayed in DesignSystem showcase";
  } else if (
    compFile.includes("SelectFilter.tsx") &&
    fs.existsSync(path.join(webSrc, "components/common/TableSelectFilter.tsx"))
  ) {
    status = "near-duplicate";
    notes = "Near-duplicate of TableSelectFilter";
  } else if (
    compFile.includes("DropdownMenu.tsx") &&
    compFile.includes("common") &&
    fs.existsSync(path.join(webSrc, "components/ui/dropdown-menu.tsx"))
  ) {
    status = "near-duplicate";
    notes = "Common wrapper around components/ui/dropdown-menu";
  }

  catalog.push({
    name: mainComponentName,
    file: relPath,
    props: propsList,
    variantsAndSizes: Array.from(new Set(variantsAndSizes)),
    slotsAndChildren: code.includes("children")
      ? "children (ReactNode)"
      : "none",
    accessibility: {
      roles: Array.from(roles),
      ariaAttributes: Array.from(ariaAttributes),
      keyboardHandlers: Array.from(keyboardHandlers),
      focusManagement: Array.from(focusManagement),
    },
    externalDeps: Array.from(externalDeps),
    internalSharedDeps: Array.from(internalSharedDeps),
    usageCount,
    inDesignSystem,
    designSystemStates,
    hasTests,
    testFile,
    realUsageSnippet,
    status,
    notes,
  });
}

// Generate Mermaid Dependency Graph
const mermaidLines = ["graph TD"];
for (const item of catalog) {
  for (const dep of item.internalSharedDeps) {
    const depName = path.basename(dep);
    mermaidLines.push(`  ${item.name} --> ${depName}`);
  }
}

const finalCatalog = {
  totalComponents: catalog.length,
  activeComponents: catalog.filter((c) => c.status === "active").length,
  unusedComponents: catalog.filter((c) => c.status === "unused").length,
  nearDuplicates: catalog.filter((c) => c.status === "near-duplicate").length,
  components: catalog,
  dependencyGraphMermaid: mermaidLines.join("\n"),
};

const catalogJsonPath = path.resolve(
  __dirname,
  "../../docs/ui-standard/component-catalog.json",
);
fs.writeFileSync(catalogJsonPath, JSON.stringify(finalCatalog, null, 2));

console.log("Component catalog generated at:", catalogJsonPath);
console.log("Total components analyzed:", catalog.length);
console.log("Active components:", finalCatalog.activeComponents);
console.log("Unused components (0 usages):", finalCatalog.unusedComponents);
console.log("Near-duplicates:", finalCatalog.nearDuplicates);
