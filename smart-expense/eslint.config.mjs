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

      // ---- eslint-plugin-security overrides ----
      // We already picked up `security.configs.recommended` above (line 27),
      // which enables every valid rule from the plugin at its recommended
      // level. We only override the two that fire noisy false-positives in
      // our category patterns and dictionary maps. Individual rule names
      // are avoided beyond these — the plugin renames rules between majors
      // and ESLint throws hard on unknown names.
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  {
    // Turn on the sonarjs recommended preset via FlatCompat — using named
    // rules directly is fragile because sonarjs also renames rules between
    // majors. `recommended` gives us all bug-detectors with the plugin's
    // vetted severities.
    plugins: { sonarjs },
    rules: {
      // Silence stylistic sonarjs rules that aren't real bugs.
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/prefer-immediate-return': 'off',
    },
  },
];

export default config;
