const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: true,
    testTimeout: 20000,
  },
});
