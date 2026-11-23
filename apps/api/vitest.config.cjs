const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
  },
});
