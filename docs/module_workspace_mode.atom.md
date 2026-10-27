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
version: 0.1
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

The first press of Jam in a visit waits for Jam's code to load (module_jam_code_boundary): meanwhile the workspace is held as during Loading, and pressing Session cancels the opening. If the load fails, session mode stays exactly as it was and a notice offers Try again and Dismiss. Later presses in the visit wait for nothing.

While Jam mode shows, session mode keeps its state as it was left (the phrase on screen, its prepared phrases and its banners), discards nothing and prepares nothing new; leaving Jam mode shows it exactly as it was. Not built yet.

## TECHNICAL INTERFACE
The mode is workspace state read by src/components/workspace/WorkspaceShell.vue; the mode switch (`segmented-control mode-switch`) sits in src/components/workspace/WorkspaceHeader.vue. Jam's view, src/jam/JamWorkspace.vue, is reached only through Jam's loader, src/components/workspace/load-jam-mode.ts (module_jam_code_boundary). Session mode's pre-generation orchestrator, src/components/workspace/workspace-pregeneration.ts (module_idle_pregeneration_queue), prepares nothing while Jam mode shows. Not built yet.

## EXPECTATION
- Every load of the app, a reload included, opens in session mode; the mode is never saved.
- The switch changes the mode at Idle only, and is read-only while Loading, during a session or a Jam, and while the review shows.
- A failed first load of Jam's code leaves session mode as it was and shows the notice with Try again and Dismiss.
- Leaving Jam mode shows session mode's phrase, prepared phrases and banners untouched; nothing of session mode's was discarded or prepared while Jam mode showed.
- A controller attaching or leaving never changes the mode.
