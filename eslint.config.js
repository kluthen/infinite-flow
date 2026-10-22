import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Browser storage no authored file may use, in any directory of src/, src/storage/ included:
// IndexedDB under src/storage/ is the app's only store (see storageDirectoryGlobals below).
// @spec-link [[rule_ephemeral_session_state]]
// @spec-link [[specification_ephemeral_state_verification]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
const forbiddenPersistenceApis = [
  { name: 'localStorage', message: 'Browser persistence is outside the ephemeral-state boundary.' },
  {
    name: 'sessionStorage',
    message: 'Browser persistence is outside the ephemeral-state boundary.',
  },
  { name: 'caches', message: 'The Cache API is not available to authored application code.' },
]

// Globals no authored file may use, in any directory of src/: the network (the app is
// browser-only, and session data is never sent anywhere), media-element playback and the Cookie
// Store API. Reachable as bare identifiers, and mirrored below as window/globalThis/self
// properties.
// @spec-link [[specification_browser_only_operation_verification]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[rule_optional_midi_privacy]]
const alwaysForbiddenGlobals = [
  {
    name: 'Audio',
    message:
      'Media-element playback is forbidden everywhere in src/; Web Audio lives under src/audio/.',
  },
  ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({
    name,
    message: 'Network access is forbidden everywhere in src/: session data is never sent.',
  })),
  {
    name: 'cookieStore',
    message: 'Cookies are forbidden everywhere in src/: session data is never stored.',
  },
]

// navigator/document members no authored file may use, in any directory of src/: the
// microphone/camera, the beacon network call and cookies. They are never bare globals themselves.
// @spec-link [[specification_browser_only_operation_verification]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[rule_optional_midi_privacy]]
const alwaysForbiddenProperties = [
  {
    object: 'navigator',
    property: 'mediaDevices',
    message: 'Microphone/camera access is forbidden everywhere in src/.',
  },
  {
    property: 'getUserMedia',
    message: 'Microphone/camera access is forbidden everywhere in src/.',
  },
  {
    object: 'navigator',
    property: 'sendBeacon',
    message: 'Network access is forbidden everywhere in src/: session data is never sent.',
  },
  {
    object: 'document',
    property: 'cookie',
    message: 'Cookies are forbidden everywhere in src/: session data is never stored.',
  },
]

// Web Audio contexts: allowed only under src/audio/ (see the override block below). The live
// AudioContext, its legacy webkitAudioContext name and OfflineAudioContext, which renders audio
// off-line, count as one capability.
// @spec-link [[specification_browser_only_operation_verification]]
const audioContextGlobals = ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext'].map(
  (name) => ({ name, message: 'Web Audio contexts may be created only under src/audio/.' }),
)

// Web MIDI access: allowed only under src/midi/ (see the override block below). Matched on the
// property name alone, so it is caught however navigator is reached.
// @spec-link [[specification_browser_only_operation_verification]]
const midiAccessProperties = [
  {
    property: 'requestMIDIAccess',
    message: 'MIDI access may be requested only under src/midi/.',
  },
]

// On-device storage: IndexedDB and the storage manager (navigator.storage, which asks for
// persistent storage and reports usage) are allowed only under src/storage/ (see the override
// block below), so everything the app saves on the device is written in one auditable place.
// @spec-link [[req_on_device_storage]]
const storageDirectoryMessage =
  'IndexedDB and navigator.storage may be used only under src/storage/.'
const storageDirectoryGlobals = [{ name: 'indexedDB', message: storageDirectoryMessage }]
const storageDirectoryProperties = [
  { object: 'navigator', property: 'storage', message: storageDirectoryMessage },
]

// vexflow imports: allowed only in the four engraving files of src/notation/ (see the block
// near the end, which ignores them).
const vexflowImportPattern = {
  group: ['vexflow', 'vexflow/*'],
  message:
    'Only src/notation/vexflow-mapping.ts, vexflow-engraver.ts, vexflow-two-system-engraver.ts and vexflow-check-note-engraver.ts may import vexflow.',
}

// Imports of the storage code, by alias or by relative path: forbidden in src/session/ and
// src/export/ (see the override block near the end).
// @spec-link [[module_on_device_database]]
const storageImportPattern = {
  group: ['@/storage', '@/storage/**', '**/storage', '**/storage/**'],
  message: 'src/session/ and src/export/ stay storage-free: they never import src/storage/.',
}

// Imports of the doodle quantizer, by alias or by relative path: forbidden everywhere in src/
// outside src/jam/ (see the block near the end, which ignores src/jam/).
// @spec-link [[module_doodle_quantizer]]
const doodleQuantizerImportPattern = {
  group: ['@/jam/doodle-quantizer', '**/jam/doodle-quantizer'],
  message: 'Only src/jam/ may import the doodle quantizer (src/jam/doodle-quantizer.ts).',
}

/**
 * Intent: the no-restricted-globals / no-restricted-properties rule pair for one part of src/,
 * given the directory-scoped globals and properties still forbidden there. The forbidden
 * persistence APIs and the always-forbidden APIs are included everywhere, src/storage/ included.
 *
 * @param {{ name: string, message: string }[]} scopedGlobals
 * @param {{ object?: string, property: string, message: string }[]} scopedProperties
 */
function boundaryRules(scopedGlobals, scopedProperties) {
  const globalsFromWindow = [...alwaysForbiddenGlobals, ...scopedGlobals]
  return {
    'no-restricted-globals': ['error', ...forbiddenPersistenceApis, ...globalsFromWindow],
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
        globalsFromWindow.map(({ name, message }) => ({ object, property: name, message })),
      ),
      ...alwaysForbiddenProperties,
      ...scopedProperties,
    ],
  }
}

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
    rules: boundaryRules(
      [...audioContextGlobals, ...storageDirectoryGlobals],
      [...midiAccessProperties, ...storageDirectoryProperties],
    ),
  },
  // src/audio/ may create Web Audio contexts; everything else stays forbidden there, MIDI and
  // storage included.
  // @spec-link [[specification_browser_only_operation_verification]]
  {
    files: ['src/audio/**/*.{js,mjs,ts,vue}'],
    rules: boundaryRules(storageDirectoryGlobals, [
      ...midiAccessProperties,
      ...storageDirectoryProperties,
    ]),
  },
  // src/midi/ may request MIDI access; everything else stays forbidden there, audio and storage
  // included.
  // @spec-link [[specification_browser_only_operation_verification]]
  {
    files: ['src/midi/**/*.{js,mjs,ts,vue}'],
    rules: boundaryRules(
      [...audioContextGlobals, ...storageDirectoryGlobals],
      storageDirectoryProperties,
    ),
  },
  // src/storage/ may use IndexedDB and navigator.storage; everything else stays forbidden there,
  // localStorage, sessionStorage, caches and cookies included.
  // @spec-link [[req_on_device_storage]]
  {
    files: ['src/storage/**/*.{js,mjs,ts,vue}'],
    rules: boundaryRules(audioContextGlobals, midiAccessProperties),
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
      'src/notation/vexflow-check-note-engraver.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [vexflowImportPattern] }],
    },
  },
  // src/session/ and src/export/ never import src/storage/: the session history and the export
  // modules stay storage-free, and the rest of the app reaches the database only through the
  // injected port. A flat-config override replaces the rule's options for its files, so the
  // vexflow pattern is kept here too; this block sits after the vexflow one so it wins.
  {
    files: ['src/session/**/*.{js,mjs,ts,vue}', 'src/export/**/*.{js,mjs,ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [vexflowImportPattern, storageImportPattern] },
      ],
    },
  },
  // Nothing outside src/jam/ imports the doodle quantizer: Jam's code alone turns a capture into
  // a quantized doodle. The typescript-eslint variant of the rule is used on purpose: it is a
  // separate rule, so this block does not replace the core no-restricted-imports options of the
  // vexflow and storage blocks above.
  // @spec-link [[module_doodle_quantizer]]
  {
    files: ['src/**/*.{js,mjs,ts,vue}'],
    ignores: ['src/jam/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [doodleQuantizerImportPattern] },
      ],
    },
  },
  prettier,
]
