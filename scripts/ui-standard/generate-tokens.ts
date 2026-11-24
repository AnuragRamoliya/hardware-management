import * as fs from "fs";
import * as path from "path";

// Color helper: HSL string (e.g. "220 20% 98%") to RGB [0-255, 0-255, 0-255]
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

function parseHsl(str: string): [number, number, number] {
  const parts = str.trim().split(/\s+/);
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", ""));
  const l = parseFloat(parts[2].replace("%", ""));
  return hslToRgb(h, s, l);
}

// Relative luminance per WCAG 2.1
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  const lum1 = relativeLuminance(rgb1);
  const lum2 = relativeLuminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const lightHsl: Record<string, string> = {
  brand: "243 75% 59%",
  background: "220 20% 98%",
  foreground: "222 35% 12%",
  card: "0 0% 100%",
  popover: "0 0% 100%",
  "popover-foreground": "222 35% 12%",
  muted: "220 17% 95%",
  "muted-foreground": "220 9% 44%",
  border: "220 15% 90%",
  input: "220 15% 88%",
  ring: "243 75% 59%",
  primary: "243 75% 59%",
  "primary-foreground": "0 0% 100%",
  secondary: "220 17% 95%",
  "secondary-foreground": "222 24% 18%",
  accent: "239 100% 97%",
  "accent-foreground": "239 60% 38%",
  success: "152 58% 29%",
  "success-foreground": "0 0% 100%",
  warning: "35 92% 29%",
  "warning-foreground": "0 0% 100%",
  danger: "0 72% 45%",
  "danger-foreground": "0 0% 100%",
  info: "202 82% 32%",
  "info-foreground": "0 0% 100%",
};

const darkHsl: Record<string, string> = {
  brand: "243 75% 59%",
  background: "224 24% 9%",
  foreground: "220 20% 94%",
  card: "224 20% 12%",
  popover: "224 20% 12%",
  "popover-foreground": "220 20% 94%",
  muted: "222 18% 16%",
  "muted-foreground": "220 11% 66%",
  border: "222 15% 21%",
  input: "222 15% 25%",
  ring: "239 84% 72%",
  primary: "239 84% 72%",
  "primary-foreground": "240 30% 12%",
  secondary: "222 18% 17%",
  "secondary-foreground": "220 20% 94%",
  accent: "239 28% 20%",
  "accent-foreground": "239 90% 82%",
  success: "152 54% 46%",
  "success-foreground": "222 24% 9%",
  warning: "35 88% 55%",
  "warning-foreground": "222 24% 9%",
  danger: "0 68% 64%",
  "danger-foreground": "222 24% 9%",
  info: "202 76% 57%",
  "info-foreground": "222 24% 9%",
};

// Calculate contrasts
const contrastPairs = [
  { fg: "foreground", bg: "background", name: "Body Text on Page Background" },
  { fg: "foreground", bg: "card", name: "Card Body Text on Card Background" },
  { fg: "popover-foreground", bg: "popover", name: "Popover Text on Popover" },
  {
    fg: "muted-foreground",
    bg: "muted",
    name: "Muted Text on Muted Background",
  },
  {
    fg: "muted-foreground",
    bg: "background",
    name: "Muted Text on Page Background",
  },
  {
    fg: "primary-foreground",
    bg: "primary",
    name: "Primary Button Text on Primary",
  },
  {
    fg: "secondary-foreground",
    bg: "secondary",
    name: "Secondary Text on Secondary",
  },
  { fg: "accent-foreground", bg: "accent", name: "Accent Text on Accent" },
  {
    fg: "success-foreground",
    bg: "success",
    name: "Success Text on Success Badge",
  },
  {
    fg: "warning-foreground",
    bg: "warning",
    name: "Warning Text on Warning Badge",
  },
  {
    fg: "danger-foreground",
    bg: "danger",
    name: "Danger Text on Danger Button",
  },
  { fg: "info-foreground", bg: "info", name: "Info Text on Info Badge" },
];

const contrastResults = contrastPairs.map((pair) => {
  const lightRgbFg = parseHsl(lightHsl[pair.fg]);
  const lightRgbBg = parseHsl(lightHsl[pair.bg]);
  const lightRatio = Number(contrastRatio(lightRgbFg, lightRgbBg).toFixed(2));

  const darkRgbFg = parseHsl(darkHsl[pair.fg]);
  const darkRgbBg = parseHsl(darkHsl[pair.bg]);
  const darkRatio = Number(contrastRatio(darkRgbFg, darkRgbBg).toFixed(2));

  return {
    ...pair,
    lightRatio,
    lightPassAA: lightRatio >= 4.5,
    lightPassAAA: lightRatio >= 7.0,
    darkRatio,
    darkPassAA: darkRatio >= 4.5,
    darkPassAAA: darkRatio >= 7.0,
  };
});

// Scan all TSX and TS files in apps/web/src for usages and anomalies
const srcDir = path.resolve(__dirname, "../../apps/web/src");

function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(srcDir);

// Token usage counts
const tokenUsages: Record<string, number> = {};
for (const token of Object.keys(lightHsl)) {
  tokenUsages[token] = 0;
}

// Scans for anomalies
const hardcodedColors: { file: string; match: string; line: number }[] = [];
const arbitraryPx: { file: string; match: string; line: number }[] = [];
const arbitraryTailwind: { file: string; match: string; line: number }[] = [];
const importantUsages: { file: string; match: string; line: number }[] = [];
const zIndexUsages: Record<string, number> = {};

// Regex patterns
const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
const rgbRegex = /rgba?\([^)]+\)/g;
const hslRegex = /hsla?\([^)]+\)/g;
const arbitraryPxRegex = /\b[a-zA-Z0-9_-]+-\[(\d+px)\]/g;
const arbitraryTailwindRegex = /\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g;
// Search for !important in CSS or Tailwind !class within className attributes
const cssImportantRegex = /!important/g;
const twImportantRegex = /className=["'][^"']*\s!([a-zA-Z0-9_-]+)[^"']*["']/g;
const zIndexRegex = /\bz-(auto|\d+|\[[^\]]+\])\b/g;

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(path.resolve(__dirname, "../.."), file);
  const lines = content.split("\n");

  // Skip Chart.tsx from hardcoded color alert if it is just CHART_COLORS definition
  const isChartFile = file.endsWith("Chart.tsx");

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Token count
    for (const token of Object.keys(lightHsl)) {
      const regex = new RegExp(
        `\\b(bg|text|border|ring|fill|stroke)-${token}\\b`,
        "g",
      );
      const matches = line.match(regex);
      if (matches) {
        tokenUsages[token] = (tokenUsages[token] || 0) + matches.length;
      }
    }

    // z-index
    let zMatch;
    while ((zMatch = zIndexRegex.exec(line)) !== null) {
      zIndexUsages[zMatch[1]] = (zIndexUsages[zMatch[1]] || 0) + 1;
    }

    // Hardcoded colors (excluding CSS variables, string text like #102, or Chart.tsx palette)
    if (!file.endsWith(".css")) {
      let hexMatch;
      while ((hexMatch = hexRegex.exec(line)) !== null) {
        if (isChartFile && line.includes("CHART_COLORS")) continue;
        // ignore ticket numbers like #102 or hex in comments
        if (
          line.includes("Ticket") ||
          line.includes("REQ-") ||
          line.includes("ID") ||
          line.includes("Export")
        )
          continue;
        hardcodedColors.push({
          file: relPath,
          match: hexMatch[0],
          line: lineNum,
        });
      }

      let rgbMatch;
      while ((rgbMatch = rgbRegex.exec(line)) !== null) {
        hardcodedColors.push({
          file: relPath,
          match: rgbMatch[0],
          line: lineNum,
        });
      }

      let hslMatch;
      while ((hslMatch = hslRegex.exec(line)) !== null) {
        if (!line.includes("hsl(var(")) {
          hardcodedColors.push({
            file: relPath,
            match: hslMatch[0],
            line: lineNum,
          });
        }
      }
    }

    // Arbitrary px
    let pxMatch;
    while ((pxMatch = arbitraryPxRegex.exec(line)) !== null) {
      arbitraryPx.push({ file: relPath, match: pxMatch[0], line: lineNum });
    }

    // Arbitrary tailwind
    let twMatch;
    while ((twMatch = arbitraryTailwindRegex.exec(line)) !== null) {
      arbitraryTailwind.push({
        file: relPath,
        match: twMatch[0],
        line: lineNum,
      });
    }

    // !important in CSS or Tailwind
    let impMatch;
    while ((impMatch = cssImportantRegex.exec(line)) !== null) {
      importantUsages.push({
        file: relPath,
        match: impMatch[0],
        line: lineNum,
      });
    }
  });

  let twImpMatch;
  while ((twImpMatch = twImportantRegex.exec(content)) !== null) {
    importantUsages.push({ file: relPath, match: twImpMatch[0], line: 0 });
  }
}

const tokensCatalog = {
  theming: {
    darkModeStrategy: "class",
    htmlElementTarget: "html.dark",
    cssVariablesSource: "apps/web/src/index.css",
    tailwindConfigSource: "apps/web/tailwind.config.ts",
  },
  colorTokens: Object.keys(lightHsl).map((name) => ({
    name,
    cssVariable: `--${name}`,
    tailwindClass: name,
    light: {
      hsl: lightHsl[name],
      rgb: parseHsl(lightHsl[name]),
    },
    dark: {
      hsl: darkHsl[name],
      rgb: parseHsl(darkHsl[name]),
    },
    usageCountInSrc: tokenUsages[name] || 0,
  })),
  contrastMatrix: contrastResults,
  typography: {
    fontFamilies: {
      sans: ["Inter", "ui-sans-serif", "system-ui"],
      mono: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "monospace",
      ],
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSizeScale: [
      { name: "text-xs", size: "12px", lineHeight: "16px" },
      { name: "text-sm", size: "14px", lineHeight: "20px" },
      { name: "text-base", size: "16px", lineHeight: "24px" },
      { name: "text-lg", size: "18px", lineHeight: "28px" },
      { name: "text-xl", size: "20px", lineHeight: "28px" },
      { name: "text-2xl", size: "24px", lineHeight: "32px" },
      { name: "text-3xl", size: "30px", lineHeight: "36px" },
      { name: "text-4xl", size: "36px", lineHeight: "40px" },
    ],
  },
  radii: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  shadows: {
    soft: "0 1px 3px hsl(222 30% 10% / .05), 0 8px 24px hsl(222 30% 10% / .04)",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
  motion: {
    transitionDurationDefault: "180ms",
    reducedMotionOverride: "0.01ms !important on animations and transitions",
  },
  chartPalette: [
    "#2563EB",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#64748B",
  ],
  zIndexLayers: zIndexUsages,
  codebaseScan: {
    scannedFilesCount: allSrcFiles.length,
    hardcodedColorsCount: hardcodedColors.length,
    arbitraryPxCount: arbitraryPx.length,
    arbitraryTailwindCount: arbitraryTailwind.length,
    importantCount: importantUsages.length,
    topHardcodedColors: hardcodedColors.slice(0, 15),
    topArbitraryPx: arbitraryPx.slice(0, 15),
    topImportant: importantUsages.slice(0, 15),
  },
};

const outputPath = path.resolve(
  __dirname,
  "../../docs/ui-standard/tokens.json",
);
fs.writeFileSync(outputPath, JSON.stringify(tokensCatalog, null, 2));

console.log("Tokens catalog successfully generated at:", outputPath);
console.log("Total color tokens:", tokensCatalog.colorTokens.length);
console.log("Scanned files:", allSrcFiles.length);
console.log("Hardcoded colors found:", hardcodedColors.length);
console.log("Arbitrary px found:", arbitraryPx.length);
console.log("Arbitrary Tailwind classes found:", arbitraryTailwind.length);
console.log("!important occurrences found:", importantUsages.length);
console.table(contrastResults);
