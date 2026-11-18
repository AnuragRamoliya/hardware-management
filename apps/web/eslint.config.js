import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-properties": ["error",
        { object: "window", property: "location", message: "Use React Router navigation." },
        { object: "console", property: "log", message: "Remove debug logging." },
      ],
      "no-restricted-imports": ["error", { paths: [{ name: "axios", message: "Call APIs through src/api." }] }],
    },
  },
  {
    files: ["src/api/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/hooks/**/*.{ts,tsx}", "src/utils/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "axios", message: "Call APIs through src/api." }],
        patterns: [{ group: ["@/pages/*", "@/pages/**/*"], message: "Infrastructure must not import pages." }],
      }],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "JSXOpeningElement[name.name='input']", message: "Use a shared component from components/ui." },
        { selector: "JSXOpeningElement[name.name='select']", message: "Use a shared component from components/ui." },
        { selector: "JSXOpeningElement[name.name='textarea']", message: "Use a shared component from components/ui." },
        { selector: "JSXOpeningElement[name.name='button']", message: "Use Button from components/ui." },
      ],
    },
  },
  prettier,
);
