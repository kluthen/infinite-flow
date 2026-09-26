# Endgame — Infinite Flow as a Rhythm RPG

Status: draft v0.1 (direction only; nothing here is scoped or committed; D71)

This is the user's description from 2026-09-25, lightly structured. The inspiration is _Final Fantasy Theatrhythm_. Infinite Flow is the "music factory" behind it.

## Active play: the v2 loop, dressed as a game

- The core activity stays **what v2 builds**: a series of phrases to complete, though not quite infinite.
- It adds **choices, antagonists and companions**. **Several voices are played by the system**, not only the player's line.
- The guiding principle still applies (D66): acknowledge and encourage, never penalize or score, and anything adaptive is opt-in and visible.
  - _Open tension, to discuss later:_ RPG battles usually have win and lose outcomes. How that fits the principle is not yet discussed.

## Characters are restrictive musical presets

Characters are presets, like today's neutral and jazz profiles, but **more restrictive and more personal**. Examples from the user:

- **Scale-bound, with a banned note, and a signature.** Uses only the A scale and absolutely hates G. Loves trills. Has a specific gimmick.
- **Dark character.** Lower tones, punctuated by sharp, brief high-pitched notes.

What a character preset needs to express, as read from these examples:

- a scale or pitch-set restriction;
- forbidden or disliked pitches;
- ornament preferences, such as trills;
- a signature motif or gimmick;
- register tendencies, including sparse register "spikes".

## Fights are exchanges of short phrases

- A fight is a **call-and-response exchange of short phrases** between the sides.
- On their turn, the player **chooses between several options tied to their skills**.

## Off-phases

- Character improvement.
- Team building: recruiting and removing members.
- Quest taking.
- Exploration and progression, as in the preview (see [far vision](far-vision.md)).

## Status effects

Effects change **both what is displayed and what is generated**. The user's examples:

- **blindness**, which probably hides or obscures notation;
- **tone deaf**;
- **pitch scare**.

Their exact behavior is not defined.

## Architectural implications to keep in mind (observations, not decisions)

- **The profile seam grows into characters.**
  - Today's declarative profiles (neutral, jazz) and instrument templates (D57) are the ancestors of character presets.
  - ISS-004's long-term "rhythmic palette" and the v2/v3 embellishment flags (D59) feed the same concept.
- **Display may need to transform on purpose.**
  - Today the display is a pure, faithful redraw: the contract says display "never alters" the phrase.
  - Effects such as blindness change what the player *sees*, not what is generated.
  - That calls for a deliberate, explicit display-effect layer, not a change to the faithfulness rule.
- **The app moves from one line to several voices.** v1 is monophonic on a single staff. Multiple system voices (companions, antagonists) require multi-voice generation and playback, and possibly display. v4's accompaniment with roles (D70) is the first step.
- **Turn-based exchanges build on continuation.** A fight is continuation (D65) with alternating speakers. The antagonist "responds" to the player's phrase, just as v3 continues a played motif.
