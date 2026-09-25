# Third-Party Licenses

This file lists every third-party component that ships inside the production browser bundle
(`dist/`), plus the fonts and PWA runtime that are compiled into that bundle at build time. It does
not enumerate build-only tooling (bundler, linter, test runner) that never reaches the shipped
`dist/` output; those are named briefly at the end for completeness.

Versions are the exact pinned versions resolved in [`package-lock.json`](package-lock.json).
Licenses were verified against each package's own `package.json` `license` field and its bundled
`LICENSE`/`OFL.txt`/`README` file under `node_modules/`, not guessed from public reputation.

## Project license

Infinite Flow itself is released under the [MIT License](LICENSE). The MIT license covers the
project's own code only; every third-party component below keeps its own license.

## License texts shipped with the build

The full license text of every runtime component is vendored in
[`public/licenses/`](public/licenses/), so Vite copies it into `dist/licenses/` and it travels with the
shipped assets:

| File                                                                     | Covers                                  |
| ------------------------------------------------------------------------ | --------------------------------------- |
| [`vue-MIT.txt`](public/licenses/vue-MIT.txt)                             | Vue                                     |
| [`vexflow-MIT.txt`](public/licenses/vexflow-MIT.txt)                     | VexFlow code                            |
| [`bravura-OFL-1.1.txt`](public/licenses/bravura-OFL-1.1.txt)             | Bravura (embedded in VexFlow)           |
| [`academico-OFL-1.1.txt`](public/licenses/academico-OFL-1.1.txt)         | Academico and Academico Bold (embedded) |
| [`fraunces-OFL-1.1.txt`](public/licenses/fraunces-OFL-1.1.txt)           | Fraunces                                |
| [`source-sans-3-OFL-1.1.txt`](public/licenses/source-sans-3-OFL-1.1.txt) | Source Sans 3                           |
| [`workbox-MIT.txt`](public/licenses/workbox-MIT.txt)                     | Workbox runtime                         |
| [`vite-plugin-pwa-MIT.txt`](public/licenses/vite-plugin-pwa-MIT.txt)     | vite-plugin-pwa registration glue       |

These files are not precached by the service worker (the precache glob covers only
`html,js,css,woff2,png,svg,ico`), so they are available online but not offline.

## Runtime components (ship in the production bundle)

| Component                                                                                                                                                | Version                    | License                                                                                                    | Copyright holder                                                   | Upstream                                                                                                                                                                                                                      | Used for                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vue](https://vuejs.org/)                                                                                                                                | 3.5.43                     | MIT                                                                                                        | Yuxi (Evan) You                                                    | <https://github.com/vuejs/core>                                                                                                                                                                                               | Application framework (components, reactivity, app mount).                                                                                                                                                                                                            |
| [VexFlow](https://www.vexflow.com/)                                                                                                                      | 5.0.0                      | MIT                                                                                                        | VexFlow contributors; Mohit Muthanna Cheppudira                    | <https://github.com/vexflow/vexflow>                                                                                                                                                                                          | Staff notation engraving (`vexflow/bravura` entry point), loaded lazily via `src/notation/vexflow-engraver-loader.ts` into the `vexflow-engraver` chunk (`dist/assets/vexflow-engraver-*.js`).                                                                        |
| Bravura (embedded in VexFlow)                                                                                                                            | bundled with vexflow 5.0.0 | SIL Open Font License 1.1 (see [Notes on bundled fonts](#notes-on-bundled-fonts-sil-open-font-license-11)) | Steinberg Media Technologies GmbH (Reserved Font Name "Bravura")   | Bundled as a base64 `woff2` data URI in `node_modules/vexflow/build/esm/src/fonts/bravura.js`; license text from [`@vexflow-fonts/bravura`](https://www.npmjs.com/package/@vexflow-fonts/bravura)                             | The music-notation (SMuFL) glyph font VexFlow uses to draw noteheads, clefs, accidentals, and other engraving symbols.                                                                                                                                                |
| Academico / Academico Bold (embedded in VexFlow)                                                                                                         | bundled with vexflow 5.0.0 | SIL Open Font License 1.1 (see [Notes on bundled fonts](#notes-on-bundled-fonts-sil-open-font-license-11)) | Steinberg Media Technologies GmbH (Reserved Font Name "Academico") | Bundled as base64 `woff2` data URIs in `node_modules/vexflow/build/esm/src/fonts/academico.js` and `academicobold.js`; license text from [`@vexflow-fonts/academico`](https://www.npmjs.com/package/@vexflow-fonts/academico) | Companion text font VexFlow uses for engraved text in the `Bravura`/`Academico` font stack selected by `vexflow/bravura`.                                                                                                                                             |
| [@fontsource-variable/fraunces](https://fontsource.org/fonts/fraunces)                                                                                   | 5.3.0                      | SIL Open Font License 1.1                                                                                  | The Fraunces Project Authors (github.com/undercasetype/Fraunces)   | <https://github.com/fontsource/fontsource>                                                                                                                                                                                    | Display/serif UI typeface, self-hosted as a `woff2` in `dist/assets/fraunces-latin-wght-normal-*.woff2` (see `src/styles/fonts.css`).                                                                                                                                 |
| [@fontsource-variable/source-sans-3](https://fontsource.org/fonts/source-sans-3)                                                                         | 5.3.0                      | SIL Open Font License 1.1                                                                                  | Google Inc.                                                        | <https://github.com/fontsource/fontsource>                                                                                                                                                                                    | Body/UI typeface, self-hosted as a `woff2` in `dist/assets/source-sans-3-latin-wght-normal-*.woff2` (see `src/styles/fonts.css`).                                                                                                                                     |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)                                                                                                     | 1.3.0                      | MIT                                                                                                        | antfu and vite-plugin-pwa contributors                             | <https://github.com/vite-pwa/vite-plugin-pwa>                                                                                                                                                                                 | Generates the manifest and service-worker registration glue (`virtual:pwa-register`, imported in `src/main.ts`); the actual `sw.js`/`workbox-*.js` content is produced by Workbox (below).                                                                            |
| Workbox runtime (`workbox-core`, `workbox-routing`, `workbox-precaching`, `workbox-strategies`, `workbox-window`, plus `workbox-build`'s generated glue) | 7.4.1                      | MIT                                                                                                        | Google LLC                                                         | <https://github.com/GoogleChrome/workbox>                                                                                                                                                                                     | Precaching and navigation-fallback logic compiled by `vite-plugin-pwa`'s `generateSW` step into `dist/sw.js` and `dist/workbox-*.js`; `workbox-window` also ships client-side as `dist/assets/workbox-window.prod.es5-*.js`, used by `registerSW()` in `src/main.ts`. |

Note on Tailwind CSS: `@tailwindcss/vite` (a devDependency) compiles utility classes into the
production stylesheet (`dist/assets/index-*.css`), but the Tailwind engine itself is a build-time
tool, not a runtime library shipped as JavaScript. It is listed under dev-only tooling below rather
than as a runtime component.

## Notes on bundled fonts (SIL Open Font License 1.1)

Fraunces and Source Sans 3 ship their own `LICENSE` files under
`node_modules/@fontsource-variable/<name>/LICENSE`, each the full SIL OFL 1.1 text with a
copyright/attribution header (quoted above). Both `LICENSE` files include the OFL's standard
"Reserved Font Name" definition clause, but neither attribution header itself declares a Reserved
Font Name, so no specific reserved name notice needs to be reproduced beyond the copyright lines
already quoted in the table above.

Bravura and Academico do not ship as separate npm packages here. VexFlow's build embeds their
`woff2` data directly into `node_modules/vexflow/build/esm/src/fonts/{bravura,academico,academicobold}.js`.
Grepping the built `dist/assets/vexflow-engraver-*.js` chunk for woff2 signatures confirms that exactly
these three fonts ship; VexFlow's other embedded fonts (Petaluma, Petaluma Script, Gonville) are not in
the bundle. VexFlow's own MIT `LICENSE` covers its code, not these fonts.

The OFL text for both fonts was taken from the upstream npm packages VexFlow publishes them under,
`@vexflow-fonts/bravura@1.0.2` (Bravura 1.392) and `@vexflow-fonts/academico@1.0.1` (Academico 0.902),
whose `package.json` `license` field is `OFL-1.1`. Both `LICENSE.txt` headers read "Copyright ©
Steinberg Media Technologies GmbH" (2019 for Bravura, 2022 for Academico), with the Reserved Font Names
"Bravura" and "Academico". The embedded woff2 files are used unmodified, so the Reserved Font Names
impose no renaming obligation.

Under SIL OFL 1.1, as verified from the Fraunces/Source Sans 3 license text:

- Bundling and embedding the fonts inside an application (including as a `woff2` in a JS bundle) is
  permitted.
- The fonts may not be sold by themselves, separate from the software they are bundled with.
- The license text must travel with the fonts. All four fonts satisfy this through
  [`public/licenses/`](public/licenses/), which ships as `dist/licenses/`.

## Dev-only tooling (not shipped in `dist/`)

A short, non-exhaustive list of the build/test toolchain, all MIT-licensed per their own
`package.json`: `vite`, `typescript`, `vue-tsc`, `eslint` + `typescript-eslint` +
`eslint-plugin-vue` + `eslint-config-prettier`, `prettier`, `vitest` + `@vitest/coverage-v8`,
`@vue/test-utils`, `@playwright/test`, `@axe-core/playwright`, `@tailwindcss/vite`, `jsdom`,
`@vitejs/plugin-vue`, `@vue/tsconfig`. None of these are imported by authored `src/` code or present
in `dist/`; verify any individual tool's license directly under `node_modules/<name>/package.json`
if needed for a compliance audit.

## Enumeration method

Runtime imports were enumerated with:

```sh
grep -rhoE "from '[^'.][^']*'" src | sort -u
```

This surfaces every bare-specifier import in `src/`; internal `@/...` aliases and `virtual:pwa-register`
were excluded from the table above as non-third-party. `vexflow/bravura` and `vue` were the only
external package imports found. The PWA/Workbox and font-loading entries were added from
`vite.config.ts`, `src/main.ts`, `src/styles/fonts.css`, and the built `dist/sw.js` /
`dist/workbox-*.js`, since those ship in the production output without an explicit `src/` import.
