/**
 * Test-only build config for the workspace-session e2e harness page: mounts the real production
 * App/WorkspaceShell tree with the real worker-backed generation client and real VexFlow notation,
 * wrapped in deterministic/gated/failure-injecting seams (see tests/e2e/workspace-harness/main.ts)
 * -- never a test branch in src/ itself. No PWA plugin and no service worker: offline/precache
 * behavior is covered separately against the production preview build on port 4173.
 */
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'tests/e2e/workspace-harness',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      // The harness-only substitute for the lazy engraver loader: same public shape, but can arm
      // one forced NotationError from the resolved module's engraveWrittenPhrase (see
      // vexflow-engraver-loader-seam.ts) so `failNextNotation()` exercises PhraseScore's real
      // redraw/retry path end to end. Listed before the general `@` alias below so this more
      // specific entry wins.
      '@/notation/vexflow-engraver-loader': fileURLToPath(
        new URL('./tests/e2e/workspace-harness/vexflow-engraver-loader-seam.ts', import.meta.url),
      ),
      // The harness-only substitute for the Review's lazy export loader: the real load, with the
      // loaded module's file builder counted and able to fail once when armed (see
      // export-loader-seam.ts), so `failNextExport()` shows the Review's real export error.
      '@/export/load-generated-notes-export': fileURLToPath(
        new URL('./tests/e2e/workspace-harness/export-loader-seam.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../../../dist-workspace-harness',
    emptyOutDir: true,
  },
})
