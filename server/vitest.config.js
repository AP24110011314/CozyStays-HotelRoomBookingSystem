import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', 'seeds/**', 'src/index.js'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});