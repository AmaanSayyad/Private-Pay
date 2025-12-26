import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: [
      'src/**/*.test.js',
      'tests/**/*.test.js',
      'aleo/**/*.test.js'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        '**/*.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@aleo': resolve(__dirname, './aleo'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});