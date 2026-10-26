---
id: module_session_lock_and_groups_choices
status: REVIEW
version: 0.2
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
src/components/workspace/workspace-session-lock-choices.ts. createSessionLockAndGroups(phase, saved) builds the holders, a SessionLockAndGroups (current(), a reactive reading of the three as a LockAndGroupsChoices: rhythmLockOn, allowedRhythmChanges and allowedGroups; and the setters setRhythmLockOn, setAllowedRhythmChanges and setAllowedGroups), over the controller's phase and from the saved choices the controller receives among its dependencies (savedSessionOptions); a change outside Idle, allowed changes that are not known kinds each once in RHYTHM_CHANGE_KINDS order, or groups other than exactly the six each on or off throw a SessionControllerError. chosenSessionSettings(idle, choices, phraseOne) builds the settings a session starts with, through sessionSettingsAtStart (src/session/session-intents.ts) and withRestrictionAtStart (src/session/settings-mutation.ts), into SessionSettings' rhythmLockOn, allowedRhythmChanges and allowedGroups (src/session/session-types.ts); Start (src/components/workspace/workspace-session-start.ts, the holders among its sides as lockAndGroups in workspace-session-active.ts) and the pre-generation's startOf (src/components/workspace/workspace-pregeneration.ts) both call it. The controller's readonly state rhythmLockOn, allowedRhythmChanges and allowedGroups and its actions setRhythmLockOn, setAllowedRhythmChanges and setAllowedGroups are declared in workspace-session-controller-types.ts and built in workspace-session-controller.ts. The stale-phrase comparison (src/components/workspace/workspace-stale-phrase.ts) and phraseOneSettings (src/session/stale-phrase-one.ts) keep false, [] and ALL_GROUPS_ALLOWED.

## EXPECTATION
- The three choices start from the player's saved choices (the lock off, no change allowed and all six groups allowed on a first visit), are kept from one session to the next while the page stays open and are never written to storage by the controller; changing one during the count-in or a running session throws.
- With a saved lock on, kinds allowed and a group off, the pre-generation's start settings equal Start's, and the ready phrases are spent at Start.
- With the defaults, Start and the pre-generation's start give the settings of v3.1.
