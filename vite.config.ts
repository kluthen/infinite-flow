import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

import { appVersionDefine } from './scripts/app-version-define.mjs'

export default defineConfig({
  define: appVersionDefine(),
  build: {
    // The lazy-loaded VexFlow engraver chunk (src/notation/vexflow-engraver-loader.ts) embeds the
    // Bravura/Academico fonts as data URIs and is ~726 kB minified; it is precached for offline use
    // but never part of the initial page load. Raise Vite's default 500 kB warning just above it so
    // that expected chunk stops being flagged as noise. Real per-chunk size budgets are still
    // enforced by scripts/verify-boundaries.mjs (npm run verify:boundaries).
    chunkSizeWarningLimit: 800,
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Infinite Flow',
        short_name: 'Infinite Flow',
        description: 'A browser-only workspace for musical phrase generation.',
        theme_color: '#f4f0e7',
        background_color: '#f4f0e7',
        display: 'standalone',
        icons: [
          {
            src: '/icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff2,png,svg,ico}'],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
