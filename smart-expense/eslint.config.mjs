import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next still ships in the legacy shape, so we bridge it into
// flat config via FlatCompat (recommended by Next docs).
const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'drizzle/**',
      '.husky/**',
      'next-env.d.ts',
      'scripts/**', // small maintenance scripts don't need lint gating
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  security.configs.recommended,
  {
    plugins: { sonarjs },
    rules: {
      // ---- Baseline relaxations (unchanged) ----
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn',

      // ---- Extra correctness rules (all warn — never breaks a commit) ----
      'eqeqeq': ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-implicit-coercion': 'warn',
      'no-throw-literal': 'warn',
      'prefer-template': 'warn',
      'require-await': 'warn',

      // ---- eslint-plugin-security — dial down noisy defaults, keep bug-catchers ----
      // Regex-literal false positives are common in our category patterns;
      // downgrade to warn so the linter never blocks a commit.
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off', // very noisy on maps/records
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudo-random-bytes': 'warn',

      // ---- eslint-plugin-sonarjs — bug/smell detectors, all warn ----
      'sonarjs/no-identical-conditions': 'warn',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-redundant-boolean': 'warn',
      'sonarjs/no-unused-collection': 'warn',
      'sonarjs/no-useless-catch': 'warn',
      'sonarjs/prefer-immediate-return': 'off', // stylistic, not a bug
      'sonarjs/cognitive-complexity': 'off', // too noisy for hackathon pace
      'sonarjs/no-nested-template-literals': 'off',
    },
  },
];

export default config;
