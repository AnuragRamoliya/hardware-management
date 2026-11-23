const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: true,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'migrations/**',
        'seeders/**',
        'scripts/**',
        'tests/**',
        'Types/**',
        '**/*.d.ts',
      ],
      thresholds: {
        // Ratchet thresholds: services/utils/middleware lines >= 85%, branches >= 75%; controllers/routes >= 80%; models/schema >= 70%; jobs >= 85%
      },
    },
  },
});
