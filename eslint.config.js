import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    ignores: ['build/**', 'dist/**', '**/dist/**', '**/build/**', 'node_modules/**', '**/node_modules/**', '*.config.*', '.claude/**', '.planning/**'],
  },
];
