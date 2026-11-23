const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'Database/Migrations/**', 'Database/Seeders/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
