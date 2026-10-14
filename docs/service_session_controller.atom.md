---
id: service_session_controller
status: REVIEW
layer: ARCHITECTURE
human_name: Practice Session Controller
tags: workspace,session,session-state
parents:
  - [[req_rolling_practice_session]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_playhead_follows_audio_clock]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_session_never_pauses]]
  - [[rule_session_start_conditions]]
  - [[service_workspace_session_flow]]
dependents: []
type: SERVICE
version: 0.1
priority: 1
---

# Practice Session Controller

## INTENT
Own the one practice session the workspace runs at a time and drive it on the audio clock, from the Start click to the session's end.

## THE RULE / LOGIC
The workspace also builds the practice session controller, which owns the one session the workspace runs at a time. Its module, with the measurement of phrase 1's staff fixed parts, loads as its own chunk on a createSessionController call the app root makes once at setup; until it has loaded no session can start, and a controller that arrives after the app is torn down is disposed of at once. The controller judges the start conditions from the Idle state, the window's shape, whether a session is running and whether the last session's review shows, and exposes the first condition that blocks a start. The controller's load also loads the session runner (the engine and its failure ladder) through the workspace session's runner loader, so the runner is never in the entry chunk. From a session's start on, everything is driven by the audio clock, through an injected wake-up timer: the count-in display, the count-in's end, each phrase starting to sound and the engine's deadlines; every runner output is recorded in the session history, a phrase starting to sound at its scheduled start on the audio transport rather than at the engine's time, which may already have passed it when the wake-up fired. The fit check the runner is given judges each look-ahead phrase, with the intent of the attempt being checked, against the held staff layout and the current window's height budget, and the staff shows the session as the rolling display.

## TECHNICAL INTERFACE
The workspace session also exposes createSessionController(), which loads the controller's chunk and returns a session controller built over the Idle state and its startFreshPhrase action, the audio transport (queueBacking(phraseNumber, harmony, tempo), its click plan a piecewise tempo map with a new tempo segment from the first beat of each phrase queued at a new tempo, the count-in and phrase 1 at the starting tempo, and phraseStartsAt(phraseNumber) known up to the phrase after the last one queued), the session browser ports (wake lock, orientation lock, page visibility, window shape), the runner factory, the session clock (a wake-up timer factory, a wall clock and a frame loop), the idle layout gate's port, the measurement of phrase 1's staff fixed parts and a loader of the engraver's staff planner (loadSessionStaffFitPlanner, beside that measurement), which the session's fit checks use. The controller exposes readonly state (its phase: idle, count-in or running; the count-in display; the struggling notice; sessionTempo, the exact tempo in effect (the starting tempo during the count-in, then the tempo of the phrase sounding now, from its phrase-sounding output's tempo), null outside a session; adaptiveTempo, the page's flag, in memory for the page's lifetime; adaptiveTempoAvailable, true exactly while a controller is attached; varySettings, the page's vary-settings flag, in memory for the page's lifetime; tensionAcrossPhrases, the page's tension-across-phrases flag, in memory for the page's lifetime; shownSettings, the settings the read-only controls show during a session (its start settings during the count-in, then those the phrase now sounding was generated with), null outside a session; the held staff layout; canStart and the first start blocker; the staff the session shows and the highest phrase number it has readied, both null outside a session; the last end's summary and closed history; the last session's review, its closed history, whether it shows and tempoReached, the last sounded phrase's tempo, or null when none exists; lastSessionReachedTempo, the tempo the last session that ran adaptive tempo reached, or null before any such session, after an end of a session that did not run it, and after a reload), a query telling whether a phrase is on screen, and eight actions: start (synchronous, for the Start click; throws while a start condition does not hold), stop (throws with no session running), closeReview (throws unless the review shows), showReview (throws unless a review exists, does not show, and no session runs), setAdaptiveTempo(on) (throws during the count-in or a running session, and when turning the flag on while no controller is attached; turning it off at Idle always succeeds), setVarySettings(on) and setTensionAcrossPhrases(on) (each throws during the count-in or a running session) and dispose (ends a running session, stops reading the window and frees the wake-up timer). The runner's module is loaded by the workspace session's loadSessionRunner(), which createSessionController() calls as part of the controller's load.

## EXPECTATION
Building the session controller requests no lock and opens no audio; no session can start before its chunk has loaded. The session runner is not in the entry chunk.
