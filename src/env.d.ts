// @lint-ignore-atd build plumbing: ambient types of Vite, the PWA plugin and the injected app version; no business rule
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The app's package version, injected at build time (scripts/app-version-define.mjs). */
declare const __APP_VERSION__: string

/** The short id of the commit the build comes from, or `unknown` (scripts/app-version-define.mjs). */
declare const __APP_COMMIT__: string
