import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/', 'dist/', 'coverage/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // `_name` marks a parameter that must exist (Express error handler) but is not used.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['log', 'error'] }],
    },
  },
);
