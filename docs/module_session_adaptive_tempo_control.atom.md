---
id: module_session_adaptive_tempo_control
status: REVIEW
type: MODULE
priority: 1
human_name: Adaptive Tempo Control
parents:
  - [[req_adaptive_tempo]]
  - [[rule_adaptive_tempo_resets_after_session]]
  - [[service_workspace_session_flow]]
layer: ARCHITECTURE
version: 0.2
tags: workspace,session,tempo
dependents: []
---

# Adaptive Tempo Control

## INTENT
Hold the player's adaptive-tempo choice for the page's lifetime, from the choice they saved, and show the tempo a session plays at, without the session ever writing the Idle tempo control.

## THE RULE / LOGIC
The controller keeps the adaptive-tempo flag in memory in its state for the page's lifetime, not reset when a session ends. The flag enters at the controller's creation, never through its actions, with the player's saved choice loaded before the first draw (off on a first visit): a saved on enters even while no controller is attached, and is then only unavailable. The controller never writes the flag to storage; the player's change handler saves a change the controller accepted. The flag is available exactly while a controller is attached. It changes only at Idle: changing it during the count-in or a running session throws, and so does turning it on while it is unavailable; turning it off at Idle is always allowed, and when the controller goes away at Idle the flag stays on, only unavailable until a controller is attached again. A session runs adaptive tempo only when the flag is on and the session starts with a controller. The controller's session tempo is the exact tempo in effect: the starting tempo during the count-in, then the tempo of the phrase sounding now, taken from each phrase sounding output, and none outside a session. The session's settings keep the starting tempo, and the session never writes the Idle tempo control, so the control shows the starting tempo again once the session ends, while the review gets the tempo reached, the last sounded phrase's tempo. The controller also keeps, in memory for the page's lifetime, the tempo the last session that ran adaptive tempo reached, for the screen's reached-tempo note: an end once phrase 1 has sounded sets it to the review's tempo reached when that session ran adaptive tempo and clears it when it did not; a session start and an end during the count-in leave it as it is. The screen shows the adaptive-tempo control from the flag and its availability, judged live at Idle and while the review shows, and during a session from whether the session has a controller, as it stood at the start; the read-only tempo control shows the session tempo during a session, a value off the tempo control's list included.

## TECHNICAL INTERFACE
The controller's readonly state includes sessionTempo, the exact tempo in effect (the starting tempo during the count-in, then the tempo of the phrase sounding now, from its phrase-sounding output's tempo), null outside a session; adaptiveTempo, the page's flag, from the player's saved choice and then in memory for the page's lifetime; adaptiveTempoAvailable, true exactly while a controller is attached; and lastSessionReachedTempo, the tempo the last session that ran adaptive tempo reached, or null before any such session, after an end of a session that did not run it, and after a reload. Its action setAdaptiveTempo(on) throws during the count-in or a running session, and when turning the flag on while no controller is attached; turning it off at Idle always succeeds. The flag is createAdaptiveTempoFlag(controllerState, phase, initialOn) in src/components/workspace/workspace-adaptive-tempo.ts, initialOn being the saved choice the controller receives among its dependencies (savedSessionOptions.risingTempo), beside isControllerAttached and forwardPresence, which turns a session's controller presence into the controller event dispatched through the engine time floor; the flag keeps whether the session started last runs adaptive tempo (forSession) and the last session's reached tempo, set through sessionEnded(tempoReached), which the controller calls at an end once phrase 1 has sounded. The shell reads the control's state through useRisingTempoControl in src/components/workspace/use-rising-tempo-control.ts.

## EXPECTATION
The adaptive-tempo flag starts from the player's saved choice (off on a first visit), a saved on included while no controller is attached, is kept from one session to the next while the page stays open and is never written to storage by the controller, and a session runs adaptive tempo only when the flag is on and it starts with a controller. The flag is available exactly while a controller is attached; changing it during the count-in or a running session throws, as does turning it on while it is unavailable; turning it off at Idle always succeeds, and it stays on when the controller goes away at Idle. The controller's session tempo is the starting tempo during the count-in, then the tempo of the phrase sounding now, and null outside a session. At the end the Idle tempo control shows the starting tempo and the review gets the tempo reached. The last session's reached tempo is set by an end once phrase 1 has sounded of a session that ran adaptive tempo, cleared by such an end of a session that did not, and left as it is by a session start and by an end during the count-in.
