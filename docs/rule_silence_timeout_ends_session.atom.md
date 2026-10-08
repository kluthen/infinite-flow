---
id: rule_silence_timeout_ends_session
status: STABLE
type: RULE
version: 0.2
human_name: Silence Timeout Ends a Session
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, midi, session-end]
parents:
  - [[req_midi_controller_input]]
  - [[rule_stop_ends_session]]
dependents:
  - [[module_session_silence_timeout]]
  - [[service_workspace_session_flow]]
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A8), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. A Jam started without a held doodle does not arm the timer with its home note or its doodle notes, and ends before its phrase 1 when no doodle note comes within 30 seconds after its count-in. Earlier: Text unchanged. The product owner accepted on 2026-10-05 (spec D184) the silence timer as v2 chunk 17 built it, which this rule already states - the starting note arms it as the first played note, and after a reattachment it counts again from the reconnection once a played note has armed it.
---

# Silence Timeout Ends a Session

## INTENT
End a session with a controller once the player has clearly stopped playing.

## THE RULE / LOGIC
With a controller attached, a session ends after more than 30 seconds without any note played. The 30-second timer only starts counting once the player has played at least one note in the session, so clicking Start and taking a moment before playing never times out a session. In a Jam started without a held doodle, neither the home note that starts it nor the doodle's notes count as that first note: the timer waits for a first note played from phrase 1 on, as after a Start click. Before that Jam's phrase 1 sounds, it ends for silence only under its own rule: if no doodle note comes within 30 seconds after its count-in, it ends as a Jam ended before phrase 1 sounds. A Jam on a held doodle starts on phrase 1's first note, and its timer works as in any session. Only a played note (a note-on with non-zero velocity) counts as activity. While a connected controller falls silent mid-session, because the player is catching a breath or has lost their place, phrases keep being generated and played at tempo, and expected notes that fall due during the silence simply go unacknowledged, like any note not played. Falling silent is not losing the controller: a lost controller follows its own reconnection rule, and the silence timer is suspended while no controller is attached.

## TECHNICAL INTERFACE
A silence timer runs during a session with a controller attached, armed by the first played note (in a Jam started without a held doodle, the first note played from phrase 1 on) and reset by every played note.

## EXPECTATION
- With a controller attached, once the timer is armed, more than 30 seconds without a played note, counted from the latest played note, ends the session.
- Before the timer is armed, silence never ends a session, except a Jam with no doodle note within 30 seconds after its count-in.
- In a Jam started without a held doodle, neither the home note that starts it nor a doodle note arms the timer; it waits for a first note played from phrase 1 on.
- Silence alone ends a session only under this rule, or, for a Jam before its phrase 1, under its wait for a first doodle note.
