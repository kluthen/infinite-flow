import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const applicationRoot = new URL('../src/', import.meta.url)
const sourceExtensions = new Set(['.css', '.js', '.jsx', '.ts', '.tsx', '.vue'])
const forbiddenPersistence = /\b(localStorage|sessionStorage|indexedDB|caches)\b/u

async function authoredSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        return authoredSourceFiles(entryPath)
      }

      return sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf('.'))) ? [entryPath] : []
    }),
  )

  return nested.flat()
}

const sourcePath = applicationRoot.pathname
const files = await authoredSourceFiles(sourcePath)
const violations = []

for (const file of files) {
  const contents = await readFile(file, 'utf8')
  if (forbiddenPersistence.test(contents)) {
    violations.push(relative(process.cwd(), file))
  }
}

const viteConfigPath = new URL('../vite.config.ts', import.meta.url)
const viteConfig = await readFile(viteConfigPath, 'utf8')
if (!/runtimeCaching\s*:\s*\[\s*\]/u.test(viteConfig)) {
  violations.push('vite.config.ts (runtimeCaching must be an explicit empty array)')
}

const serviceWorkerPath = new URL('../dist/sw.js', import.meta.url)
const serviceWorker = await readFile(serviceWorkerPath, 'utf8')
if (!/precacheAndRoute\(\[[\s\S]*?\{url:"index\.html",revision:/u.test(serviceWorker)) {
  violations.push('dist/sw.js (index.html is missing from precacheAndRoute)')
}

if (violations.length > 0) {
  throw new Error(`Persistence or runtime-cache boundary violated in: ${violations.join(', ')}`)
}

console.log(`Boundary verification passed for ${files.length} authored source files.`)
