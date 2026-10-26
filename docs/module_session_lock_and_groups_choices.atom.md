---
id: module_session_lock_and_groups_choices
status: DRAFT
version: 0.1
priority: 1
human_name: Rhythm Lock and Allowed Groups Choices in the Controller
dependents: []
type: MODULE
tags: [v3, release-v3.2, rhythm-lock, workspace, session]
parents:
  - [[req_rhythm_lock]]
  - [[rule_allowed_rhythm_changes]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_saved_setting_is_players_choice]]
  - [[rule_vary_settings_allowed_groups]]
  - [[service_workspace_session_flow]]
layer: ARCHITECTURE
---

# Rhythm Lock and Allowed Groups Choices in the Controller

## INTENT
Hold the player's rhythm lock, allowed rhythm changes and Vary settings' allowed groups for the page's lifetime, from the choices they saved, changeable only outside a session, and carry them into each session's start and into the Idle pre-generation's start alike.

## THE RULE / LOGIC
The session controller keeps three choices in memory in its state for the page's lifetime, kept from one session to the next, the way it keeps the Vary settings flag: whether the rhythm lock is on, the rhythm changes allowed, and the groups Vary settings may move. They enter at the controller's creation, never through its actions, with the player's saved choices loaded before the first draw (on a first visit, or for a missing or invalid record, the lock off, no change allowed and all six groups allowed). The controller never writes them to storage; the player's change handler saves a change the controller accepted. Each changes only outside a session, at Idle or while the review shows; changing one during the count-in or a running session throws. Start puts the three into the session's settings, and the Idle pre-generation builds the settings it starts its plan from with the same three, so a pre-generated phrase's request, its phrase 1 to 2 plan included, is the one the session re-derives at Start. With the defaults, both give the settings a session had before v3.2. The stale-phrase comparison and phrase 1's own settings keep the lock off and every group allowed: neither reaches a request.

## TECHNICAL INTERFACE
Not built yet; the names are filled in once built. The holders sit beside createVarySettingsFlag in src/components/workspace/workspace-session-settings.ts, from the saved choices the controller receives among its dependencies (savedSessionOptions); the controller's readonly state and setters are declared in workspace-session-controller-types.ts and built in workspace-session-controller.ts. Start (src/components/workspace/workspace-session-start.ts, its sides in workspace-session-active.ts) and the pre-generation's startOf (src/components/workspace/workspace-pregeneration.ts) put them in SessionSettings' rhythmLockOn, allowedRhythmChanges and allowedGroups (src/session/session-types.ts), in place of today's false, [] and ALL_GROUPS_ALLOWED.

## EXPECTATION
- The three choices start from the player's saved choices (the lock off, no change allowed and all six groups allowed on a first visit), are kept from one session to the next while the page stays open and are never written to storage by the controller; changing one during the count-in or a running session throws.
- With a saved lock on, kinds allowed and a group off, the pre-generation's start settings equal Start's, and the ready phrases are spent at Start.
- With the defaults, Start and the pre-generation's start give the settings of v3.1.
