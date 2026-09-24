import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const forbiddenPersistenceApis = [
  { name: 'localStorage', message: 'Browser persistence is outside the ephemeral-state boundary.' },
  {
    name: 'sessionStorage',
    message: 'Browser persistence is outside the ephemeral-state boundary.',
  },
  { name: 'indexedDB', message: 'Browser persistence is outside the ephemeral-state boundary.' },
  { name: 'caches', message: 'The Cache API is not available to authored application code.' },
]

export default [
  {
    ignores: [
      'dist/**',
      'dist-notation-harness/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': ['error', ...forbiddenPersistenceApis],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis'].flatMap((object) =>
          forbiddenPersistenceApis.map(({ name, message }) => ({
            object,
            property: name,
            message,
          })),
        ),
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'playwright.config.ts', 'vitest.config.ts', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    ignores: [
      'src/notation/vexflow-mapping.ts',
      'src/notation/vexflow-engraver.ts',
      'src/notation/vexflow-two-system-engraver.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vexflow', 'vexflow/*'],
              message:
                'Only src/notation/vexflow-mapping.ts, vexflow-engraver.ts and vexflow-two-system-engraver.ts may import vexflow.',
            },
          ],
        },
      ],
    },
  },
  prettier,
]
