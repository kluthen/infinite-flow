/**
 * Test-only build config for the notation engraving harness page: a minimal Vue app (no PWA plugin,
 * no service worker) that mounts PhraseScore against a fixed fixture/width pair so the Playwright
 * notation spec can drive it without the production app shell.
 */
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'tests/e2e/notation-harness',
  plugins: [vue()],
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
