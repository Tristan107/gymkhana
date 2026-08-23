import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'json', 'html', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
        '**/e2e/**',
        '**/types/**',
        'src/firebase/**',
        'src/hooks/useOnlineGame.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'playwright.config.ts',
      ],
    },
  },
})