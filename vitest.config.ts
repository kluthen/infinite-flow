import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { appVersionDefine } from './scripts/app-version-define.mjs'
import { lexiconWordsPlugin } from './scripts/lexicon-words-plugin.ts'

export default defineConfig({
  define: appVersionDefine(),
  plugins: [vue(), lexiconWordsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
  },
})
