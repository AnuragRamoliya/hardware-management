#!/usr/bin/env bash
set -e

VERIFY_DIR="/tmp/starter-kit-verification"
REPO_ROOT="/home/itl-lp-lenovo-13/DTL Projects/DTL/hardware-management"
STARTER_KIT="$REPO_ROOT/docs/ui-standard/starter-kit"

echo "=== STEP 1: Setting up app in $VERIFY_DIR ==="
mkdir -p "$VERIFY_DIR"
cd "$VERIFY_DIR"

if [ ! -d "node_modules" ]; then
# Initialize package.json
cat << 'EOF' > package.json
{
  "name": "starter-kit-verification",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/ --ext .ts,.tsx",
    "test": "vitest run"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "libphonenumber-js": "^1.11.14",
    "lucide-react": "^0.462.0",
    "react": "^18.3.1",
    "react-day-picker": "^10.0.2",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.10.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
EOF

# Install dependencies using root npm cache to be fast
echo "=== STEP 2: Installing dependencies ==="
npm install --prefer-offline --no-audit
fi

# Configure tsconfig.json
cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
EOF

# Configure tailwind.config.cjs
cat << 'EOF' > tailwind.config.cjs
const preset = require("./src/tokens/tailwind.preset.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
};
EOF

# Configure postcss.config.cjs
cat << 'EOF' > postcss.config.cjs
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

# Configure vite.config.ts
cat << 'EOF' > vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
EOF

# Configure eslint.config.js
cat << 'EOF' > eslint.config.js
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        RequestInit: "readonly",
        Response: "readonly",
        fetch: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLButtonElement: "readonly",
        Intl: "readonly",
        URLSearchParams: "readonly",
        React: "readonly",
        navigator: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "off",
    },
  },
  {
    files: ["src/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
];
EOF

# Copy starter-kit into src/
echo "=== STEP 3: Copying starter-kit into src/ ==="
rm -rf src/*
mkdir -p src
cp -r "$STARTER_KIT"/* src/

# Create test setup file
cat << 'EOF' > src/setupTests.ts
import '@testing-library/jest-dom';
EOF

# Create index.html and main.tsx
cat << 'EOF' > index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter Kit Verification</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat << 'EOF' > src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesignSystemPage } from './pages/DesignSystemPage';
import './tokens/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesignSystemPage />
  </React.StrictMode>
);
EOF

echo "=== STEP 4: Running typecheck ==="
npm run typecheck

echo "=== STEP 5: Running lint ==="
npx eslint src/

echo "=== STEP 6: Running tests ==="
npm test

echo "=== STEP 7: Running production build ==="
npm run build

echo "=== VERIFICATION SUCCESSFUL! ==="
