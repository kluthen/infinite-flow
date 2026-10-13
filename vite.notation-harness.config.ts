/**
 * Test-only build config for the notation engraving harness page: a minimal Vue app (no PWA plugin,
 * no service worker) that mounts PhraseScore inside a real `staff-frame` against a fixed
 * fixture/width pair so the Playwright notation spec can drive it without the production app shell.
 * Tailwind runs as in the app, because the harness loads the app's own stylesheet: the notation
 * layout reads its height budget from `staff-frame`'s computed `max-block-size`.
 */
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import { appVersionDefine } from './scripts/app-version-define.mjs'

export default defineConfig({
  define: appVersionDefine(),
  root: 'tests/e2e/notation-harness',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../../../dist-notation-harness',
    emptyOutDir: true,
  },
})
