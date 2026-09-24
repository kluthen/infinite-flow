# Phrase Workspace Review Mockups

- `phrase-workspace.html` is the interactive review prototype. It imports `../ui_common.css`; use the `System`, `Light`, and `Dark` presentation control to inspect each resolved palette.

The prototype is a visual review artifact for the desktop landscape composition. It demonstrates hierarchy and theme behavior, not final music engraving or a functional application. The implementation must use the semantic notation contract in `../screens/phrase-workspace/handoff.md` rather than reproduce the illustrative notes.

`../ui_common.css` is a frozen design reference as of Step 9. It is not the production styling source and is not imported by the app: production tokens and component classes live in `src/styles/theme.css` and `src/styles/components.css` in the application repo, owned by ux-writer. This mockup keeps using `ui_common.css` because updating the prototype was out of scope for Step 9; treat it as representative of the design intent at that time and expect it to drift from production styling until it is next refreshed.
