# v2 — Rolling Phrase: UI/UX Design

Status: **released as version 2.0.0** (the v2.0 release gate passed on 2026-10-07; the `v2.0.0`
tag waits for the owner's approval). This folder is the design as it shipped, frozen: it is never
edited again, except to correct it to match what v2.0.0 actually shipped. Work on later versions
happens outside `versions/`, at the `ui_ux/` root. The product scope of this version is in
[`specs/versions/v2/`](../../../specs/versions/v2/README.md); the working record that produced
this design (decision log, closed questions, work tracker) is in
[`archive/v2/`](../../archive/v2/README.md). The v1 design it extends is in
[`versions/v1/`](../v1/README.md).

v2 was planned as four releases, v2.0, v2.1, v2.2 and v2.4, and shipped as one, v2.0. The
documents here still use those names as labels for parts of the scope: v2.1 for the played notes
in the review and varying settings, v2.2 for the rising tempo and the tension across phrases.

## What v2 is

The single phrase of v1 becomes a practice session. From the phrase on screen the player starts
a session, with a button or, with a MIDI controller attached, by playing its first note; after a
count-in, phrases keep coming on their own over a backing and a click, two staff systems taking
turns, and the notes played right light up quietly. When the session ends, the review of the
last session takes the staff's place, shows every phrase it played and, on request, the notes the
player played, and exports either as a file. The idle workspace of v1 is still there between
sessions, on the same screen.

## The decisions worth keeping, and why

Each line is a v2 choice that later versions build on.

- **One screen, extended, not a second one.** The session runs on the v1 workspace, and the
  phrase already on screen becomes the session's first phrase, so there is no separate "session"
  screen to learn. ([phrase-workspace intent](screens/phrase-workspace/intent.md),
  [play-session intent](flows/play-session/intent.md#starting))
- **Two alternating staff systems.** The player reads one while the other refills, top then
  bottom, like reading down a page: nothing scrolls, and the music never moves under the eyes.
  ([strategy](strategy.md#trade-offs),
  [play-session intent](flows/play-session/intent.md#the-rolling-display))
- **Hands-free between start and end.** With a controller, the first note starts the session,
  silence ends it and replugging recovers an unplug; nothing in between needs a pointer or a key.
  ([strategy](strategy.md#context-of-use), [play-session intent](flows/play-session/intent.md))
- **Interruptions end a session; there is no pause.** A hidden tab, a window too small for the
  staff, a long silence or an unplug not fixed within 30 seconds ends it as Stop does, and the
  only thing that asks for attention mid-session is the disconnect countdown.
  ([strategy](strategy.md#edge-case-policy))
- **Acknowledgement is positive only.** A note played right lights on the staff; a miss shows
  nothing, and the played note is never drawn during a session. Nothing is ever graded.
  ([strategy](strategy.md#edge-case-policy),
  [screen handoff](screens/phrase-workspace/handoff.md#notation-contract))
- **The controller is optional and quiet.** Connecting happens only between sessions, in a
  dismissable sheet; its ordinary states are neutral, and only a browser block or a mid-session
  unplug takes the error tone. The transposition check is a diagnostic, never a test.
  ([flow intent](flows/controller-connection/intent.md#why-only-two-connection-states-use-the-error-tone),
  [screen intent](screens/controller-connection/intent.md))
- **No room means a plain sentence, not an error.** A window too small for the staff gets one
  sentence naming the cure; a phrase too wide is quietly replaced at idle; the phone always uses
  the split two-system layout, sized to its height too, and has no sixteenth-note density.
  ([strategy](strategy.md#edge-case-policy),
  [screen intent](screens/phrase-workspace/intent.md#when-the-staff-has-no-room))
- **The review is a mode between sessions.** It takes the staff's place, the controls stay
  usable, the player leaves it with `Close review` before a session can start, and it lives in
  memory only until the next session. The phone gets the minimum: phrases, played notes on
  request, export.
  ([review-and-export intent](flows/review-and-export/intent.md#reviewing-is-a-mode-and-playing-starts-outside-it),
  [review intent](screens/last-session-review/intent.md))
- **Export by content.** One button for the generated notes, one for the notes played; played
  notes are shown beside the music in their own lane, never judged against it.
  ([review-and-export intent](flows/review-and-export/intent.md#taking-it-out),
  [review intent](screens/last-session-review/intent.md#the-notes-the-player-played))
- **Session options are opt-in and quiet.** Rising tempo, tension across phrases and varying
  settings are chosen between sessions; during a session the controls follow the music without
  highlight or movement, and everything the app changed returns at the end.
  ([screen intent](screens/phrase-workspace/intent.md#the-session-options),
  [strategy](strategy.md#edge-case-policy))

## Contents

| Document                                                       | What it is                                                                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [strategy.md](strategy.md)                                     | Personas served, context of use, mental model, trade-offs, engraving and edge-case policy, flow index                                                |
| [motion.md](motion.md)                                         | Motion and effects rules                                                                                                                             |
| [flows/generate-phrase/](flows/generate-phrase/intent.md)      | Generating and replacing a phrase between sessions: [intent](flows/generate-phrase/intent.md), [handoff](flows/generate-phrase/handoff.md)           |
| [flows/controller-connection/](flows/controller-connection/intent.md) | Connecting a MIDI controller and the transposition check: [intent](flows/controller-connection/intent.md), [handoff](flows/controller-connection/handoff.md) |
| [flows/play-session/](flows/play-session/intent.md)            | The continuous session, from start to every way it ends: [intent](flows/play-session/intent.md), [handoff](flows/play-session/handoff.md)            |
| [flows/review-and-export/](flows/review-and-export/intent.md)  | Looking back at the last session and exporting it: [intent](flows/review-and-export/intent.md), [handoff](flows/review-and-export/handoff.md)        |
| [screens/phrase-workspace/](screens/phrase-workspace/intent.md) | The workspace, idle and in session: [intent](screens/phrase-workspace/intent.md), [handoff](screens/phrase-workspace/handoff.md)                    |
| [screens/controller-connection/](screens/controller-connection/intent.md) | The connection sheet: [intent](screens/controller-connection/intent.md), [handoff](screens/controller-connection/handoff.md)                 |
| [screens/last-session-review/](screens/last-session-review/intent.md) | The review of the last session: [intent](screens/last-session-review/intent.md), [handoff](screens/last-session-review/handoff.md)                 |

The documents keep their v2 change marks: each opens with a **Changes since v1** block, and each
changed spot carries a **[v2 new]** or **[v2 changed]** tag, so this copy also records what v2
changed from v1. The design tokens and component classes are not copied: they live in
`src/styles/theme.css` and `src/styles/components.css`, and the `v2.0.0` tag, once created, holds
the state they shipped in. This copy was taken from the `ui_ux/` root on 2026-10-07, after the
v2.0 release gate.
