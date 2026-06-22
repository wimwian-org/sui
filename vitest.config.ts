import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['components/**/*.{test,spec}.{ts,js,svelte.ts}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      include: ['components/**/*.{ts,svelte}'],
      exclude: ['components/**/*.{test,spec}.ts'],
    },
  },
});
