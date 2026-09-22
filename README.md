# Infinite Flow

Infinite Flow is a browser-only musical phrase workspace. The first release will generate a coherent, staff-notated four-measure phrase from player-selected musical controls. Step 1 establishes only the executable client shell and its quality gates; it does not implement generation, controls, notation, profiles, session orchestration, or responsive workspace behavior.

## Prerequisites

- Node.js `>=22.12.0`
- npm (the committed `package-lock.json` is the only supported package manager input)
- Playwright browser binaries for the current Chromium, Firefox, and WebKit regression projects

Install dependencies and browsers:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
```

## Commands

```sh
npm run dev                 # Run the local Vite development server
npm run build               # Strict typecheck, then create the production browser build
npm run preview             # Serve the existing production build locally
npm run format:check        # Check formatting for authored application and configuration files
npm run lint                # Run the flat ESLint configuration
npm run typecheck           # Run strict TypeScript and Vue template checks
npm run test:unit           # Run Vue component smoke tests
npm run verify:boundaries   # Reject authored persistence APIs and PWA runtime caching rules
npm run test:e2e            # Production-startup test through vite preview, all browser projects
npm run test:a11y           # Axe scan through vite preview, all browser projects
npm run atd:lint            # Validate ATD atom structure
npm run atd:check           # Check ATD source/test link coverage for the current diff
npm run quality             # Run the complete Step 1 quality gate
```

`test:e2e` and `test:a11y` serve the already-built `dist/` directory through `vite preview`; run `npm run build` first when invoking either test independently. The aggregate `quality` command builds once before both browser suites.

## Directory Boundaries

- `src/main.ts` is the browser-only entry point and service-worker registration boundary.
- `src/components/` holds Vue presentation components; `src/components/workspace/` currently holds the empty shell.
- `src/domain/` is reserved for future immutable musical contracts and planners.
- `src/composables/` is reserved for explicit in-memory UI/session coordination.
- `src/styles/` is the production Tailwind 4 styling authority, using local warm parchment and ink tokens derived from `ui_ux/ui_common.css`.
- `tests/unit/` holds Vitest and Vue Test Utils component coverage; `tests/e2e/` holds Playwright production-browser checks.
- `public/` contains static public assets, including the PWA icon. `src/public/` is retained as a boundary marker for future source-owned public-asset metadata.
- `scripts/verify-boundaries.mjs` deterministically inspects authored `src/` files and PWA configuration.

## Runtime Constraints

The client has no backend, SSR process, API server, or server runtime dependency. State is ephemeral: authored application code is prohibited from using `localStorage`, `sessionStorage`, IndexedDB, and the Cache API. ESLint restrictions and the deterministic boundary verifier enforce this policy.

The PWA uses `vite-plugin-pwa` with `generateSW` to precache emitted application assets, including the revisioned `index.html` navigation fallback. Its Workbox policy explicitly sets `runtimeCaching: []` and does not cache user, session, or application state. The generated service worker is build output rather than authored application state logic. Deterministic offline reload testing is deferred to later release verification, when the required phrase loop exists; Step 1 instead verifies the generated service-worker/precache output and its source policy.

Playwright runs the startup and axe gates in current Chromium, Firefox, and WebKit projects. This matrix is a current-engine regression suite, not a promise to support every historical browser. Vite's current default browser target is an implementation baseline, not a contractual browser-support claim.

## Step 1 Verification Matrix

| Gate                     | Command                                 | Scope                                                                   |
| ------------------------ | --------------------------------------- | ----------------------------------------------------------------------- |
| Install reproducibility  | `npm ci`                                | Lockfile-only dependency installation                                   |
| Formatting               | `npm run format:check`                  | Authored app, tests, scripts, and configuration                         |
| Static analysis          | `npm run lint && npm run typecheck`     | Flat ESLint and strict TypeScript/Vue checks                            |
| Component shell          | `npm run test:unit`                     | App mount and empty accessible workspace semantics                      |
| Production artifact      | `npm run build`                         | Static browser bundle and generated PWA files                           |
| Persistence/PWA boundary | `npm run verify:boundaries`             | No authored persistence APIs or runtime cache rule                      |
| Production startup       | `npm run test:e2e`                      | `vite preview` in Chromium, Firefox, and WebKit                         |
| Automated accessibility  | `npm run test:a11y`                     | Axe gate in Chromium, Firefox, and WebKit; not a full conformance claim |
| ATD structure/coverage   | `npm run atd:lint && npm run atd:check` | Existing documentation integrity without tooling links                  |

## Product References

- [First-release master specification](specs/first-release-master-spec.md) is the implementation handoff and definition of done.
- [First-release implementation plan](specs/first_release_plan.md) sequences delivery steps and boundaries.
- [UI/UX index](ui_ux/index.md) links the approved interaction and visual authority.
- [ATD documentation](docs/) records business intent. Step 1 tooling and shell scaffolding deliberately have no business traceability links.

Generated lead playback, MIDI integration, persistence, microphone capture, automatic key detection, scoring, and the rolling continuation flow remain outside this delivery step.
