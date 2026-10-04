import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pilotwings-modern/' : '/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
}));
