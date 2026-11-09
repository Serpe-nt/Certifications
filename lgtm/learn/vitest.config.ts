import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // The server tests share port 8096 (8097 and 8098 belong to card D1 in wave 1).
    fileParallelism: false,
  },
});
