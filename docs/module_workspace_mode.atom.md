---
id: module_workspace_mode
status: DRAFT
parents:
  - [[rule_app_opens_in_session_mode]]
  - [[rule_leaving_jam_mode_keeps_session_mode]]
  - [[rule_mode_button_at_idle_only]]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.2
tags: [v3, release-v3.2, jam, session-mode, workspace]
priority: 1
human_name: The Workspace's Mode
---

# The Workspace's Mode

## INTENT
Hold which of the two modes, session mode or Jam mode, the one workspace shows, so both modes share the generator, the audio, the controller connection and saving while each keeps its own Idle.

## THE RULE / LOGIC
The mode is workspace state, session or Jam, and is never saved: every load of the app, a reload included, starts in session mode. The workspace shell reads it and shows session mode's view or Jam's view over the same workspace: one generation worker, one audio engine, one controller connection and one saving path, shared by both modes.

The mode switch, a segmented control in the header labelled Mode with the options Session and Jam, changes the mode at Idle only: it is read-only while Loading, while a session or a Jam runs and while the review shows. A change is instant and focus stays on the chosen segment. Only the switch, and Jam again on this doodle in a kept Jam session's review, change the mode; no controller attaching or leaving, no played note and no preset does.

The first press of Jam in a visit waits for Jam's code to load (module_jam_code_boundary): meanwhile the workspace is held as during Loading, and pressing Session cancels the opening. What is live during Loading stays live while it loads. If the load fails, session mode stays exactly as it was and a notice offers Try again and Dismiss, focus moving to Try again unless a sheet is open, where it stays; Try again presses Jam again. Later presses in the visit wait for nothing.

While Jam mode opens or shows, session mode is held: it keeps its state as it was left (the phrase on screen, its prepared phrases and its banners), prepares nothing new, names no starting note and no played note starts a session; leaving Jam mode shows it exactly as it was.

## TECHNICAL INTERFACE
src/components/workspace/use-workspace-mode.ts: `useWorkspaceMode(deps)` holds the mode (`WorkspaceMode`, `session` or `jam`, `session` at creation), whether Jam mode is opening, whether session mode is `held`, Jam's loaded code and view, the load-failure notice and the switch's `view` (`WorkspaceModeView`), with `select`, `retry` and `dismissFailure`; it reads only whether an Idle operation runs, a session runs or the review mode shows, and Jam's loader. src/components/workspace/WorkspaceShell.vue builds it with `loadJamMode` (src/components/workspace/load-jam-mode.ts, module_jam_code_boundary) and reports the hold upward (`session-mode-held-change`), which src/App.vue writes into the workspace session's `sessionModeHeld` (src/components/workspace/create-workspace-session.ts); the session controller hands it to session mode's pre-generation orchestrator (src/components/workspace/workspace-pregeneration.ts, module_idle_pregeneration_queue) and to its starting note (src/components/workspace/workspace-session-starting-note.ts, module_session_starting_note). The mode switch (`segmented-control mode-switch`) is src/components/workspace/ModeSwitch.vue in src/components/workspace/WorkspaceHeader.vue; Jam's view, src/jam/JamWorkspace.vue, reached only through Jam's loaded code, shows in src/components/workspace/ScorePanel.vue.

## EXPECTATION
- Every load of the app, a reload included, opens in session mode; the mode is never saved.
- The switch changes the mode at Idle only, and is read-only while Loading, during a session or a Jam, and while the review shows.
- A failed first load of Jam's code leaves session mode as it was and shows the notice with Try again and Dismiss.
- Leaving Jam mode shows session mode's phrase, prepared phrases and banners untouched; nothing of session mode's was discarded or prepared while Jam mode showed.
- A controller attaching or leaving never changes the mode.
