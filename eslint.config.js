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

// First release has no MIDI, audio playback/synthesis, microphone, or network/server coupling:
// browser-only, no optional scope. Globals reachable as bare identifiers (and mirrored below as
// window/globalThis/self properties); navigator/document-scoped members are listed separately
// since they are never bare globals themselves.
const forbiddenOptionalScopeGlobals = [
  {
    name: 'AudioContext',
    message: 'Audio playback/synthesis is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'webkitAudioContext',
    message: 'Audio playback/synthesis is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'OfflineAudioContext',
    message: 'Audio playback/synthesis is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'Audio',
    message: 'Audio playback/synthesis is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'fetch',
    message: 'Network access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'XMLHttpRequest',
    message: 'Network access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'WebSocket',
    message: 'Network access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    name: 'EventSource',
    message: 'Network access is outside the browser-only, no-optional-scope boundary.',
  },
]

const forbiddenOptionalScopeProperties = [
  {
    object: 'navigator',
    property: 'requestMIDIAccess',
    message: 'MIDI access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    object: 'navigator',
    property: 'mediaDevices',
    message: 'Microphone/camera access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    property: 'getUserMedia',
    message: 'Microphone/camera access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    object: 'navigator',
    property: 'sendBeacon',
    message: 'Network access is outside the browser-only, no-optional-scope boundary.',
  },
  {
    object: 'document',
    property: 'cookie',
    message: 'Cookies are outside the browser-only, no-optional-scope boundary.',
  },
]

export default [
  {
    ignores: [
      'dist/**',
      'dist-notation-harness/**',
      'dist-workspace-harness/**',
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
    files: ['src/**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': [
        'error',
        ...forbiddenPersistenceApis,
        ...forbiddenOptionalScopeGlobals,
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis'].flatMap((object) =>
          forbiddenPersistenceApis.map(({ name, message }) => ({
            object,
            property: name,
            message,
          })),
        ),
        ...['window', 'globalThis', 'self'].flatMap((object) =>
          forbiddenOptionalScopeGlobals.map(({ name, message }) => ({
            object,
            property: name,
            message,
          })),
        ),
        ...forbiddenOptionalScopeProperties,
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
