# Personas

Status: draft v0.15

Personas are the user's decisions. Anything not yet confirmed is tagged `(proposed)`. Settled 2026-09-25. The decisions behind this document (D48–D50, D54, D61) are in the [2026-09-25 archive](archive/2026-09-25-personas-and-vision/decisions-D47-D71.md). The shared context of use was added 2026-09-28 (D127, now in the [v2 archive](archive/v2/decisions-D109-D207.md)); the phone review pointer and the review candidates followed the same day (D128), then export by content and the session-keeping candidates (D129), then favorites moving to v3 (D130). On 2026-09-29 the session start and end wording was corrected to match the v2 master spec §6–§7 (a correction, no new decision). On 2026-10-07 "Who is not a target" was added, stating D117 here, and the audio-mix note was brought up to date (D188). The same day the review tooling was dropped and keeping sessions placed in v3.0 (D211, D212). On 2026-10-21 Chrome was named the one supported browser (D399).

| Persona                     | Role      | Core want                                  | Served mainly by                       |
| --------------------------- | --------- | ------------------------------------------ | -------------------------------------- |
| P1 — The Curious Improviser | Primary   | Learn improvisation by playing, gain speed | v1 (at own pace), then v2              |
| P2 — The Speed Builder      | Secondary | Read and play faster                       | v2 (rolling phrase, mild pressure)     |
| P3 — The Fledgling Composer | Secondary | Keep and grow ideas                        | v2 review/export, v3 favorites/seeding |

All persona names are working names.

## Context of use

This applies to all three personas (D127). It comes mainly from the product owner's own setup as
P1, so it carries the same bias P1 does (see [P1 — Who](#who)). P2's and P3's conditions are
assumed to match until an outside tester shows otherwise.

- **Devices.**
  - **Main:** a laptop or desktop, in Chrome. Chrome is the one supported browser (D399): other
    Chromium-based browsers, Edge included, are not tested and may or may not work.
  - **Tablet:** a tablet on the music stand is a good candidate. For v2 this means an Android
    tablet in Chrome: the owner's own tablet is an iPad, and v2 does not run on iPad (WebKit has no Web
    MIDI; see [browser scope](roadmap.md#engineering-carry-overs-not-tied-to-one-version)).
  - **Phone, occasionally:** a landscape phone (the owner's Samsung Galaxy S20 FE), used outside
    with the Travel Sax. The owner calls this "probably not ideal".
    - On the phone the Review is the plain baseline: the functions the spec gives it on every
      device, and nothing more (D128, ux D64). A player who wants a real review of a phone
      session exports it and moves to a larger screen. Its layout is `ux-writer`'s.
- **Distance and posture.** The screen is read at music-stand distance, often while standing.
- **During a session.** The hands, and the mouth on a sax or Travel Sax, are on the instrument.
  The player expects to click nothing while playing. Consequence: nothing the player has to do
  mid-session may need a click or a key press. The v2 spec already fits this: playing the starting
  note (the note phrase 1 begins on) can start a session, and silence ends one
  ([v2 master spec §6–§7](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)).
- **Between sessions.** The hands are free. The owner explicitly does not want oversized controls
  for reading at a distance: the normal accessibility floor is enough.
- **Sessions.** About 5 to 30 minutes, alone. Usually at home; the phone case above is the outdoor
  exception.
- **Sound.**
  - An acoustic sax is loud in the room.
  - A Travel Sax or a keyboard plays through the same speakers or headphones as the backing.
  - Balancing the backing and click levels against the player's own sound is a real problem that
    the owner cannot quantify yet. It needs listening tests. The spec already requires separate
    backing and click volume controls, reachable at all times
    ([v2 master spec §6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)). Their
    ranges and defaults as built are final for v2.0 (D188).

## Who is not a target

- **Blind and screen-reader users** (D117). Neither the spec nor the UI/UX design has to make the
  app usable without sight. This covers non-visual use only. It does not by itself waive other
  accessibility concerns, such as contrast, low vision or keyboard operation, which stay
  `ux-writer`'s to weigh.

## P1 — The Curious Improviser (primary; D48)

### Who

- A musician who can already play. They read most standard notation, but still struggle to read quickly and to perform at speed.
- A **beginner at improvisation**.
- A "player" in the game-player sense. **For now this is an attitude** (D50): curious, playful, enthusiastic, and inclined to poke at settings to see what happens. There are no game mechanics in the near term. The far future is covered in [far vision](vision/far-vision.md).
- No age or gender target. Probably under about 60.
- The product owner fits this persona. P2 and P3 exist to balance that bias.

### What they want from a session

- **G1 — Vocabulary by exposure.** Play whatever gets generated, and feel how these ideas sound. Get to know the possibilities rather than study theory.
- **G2 — Real-time reading and dexterity.** Adjust on the fly to notes as they come, train finger dexterity, and gradually raise the BPM they can manage.

### How their goals map to releases

- **v1 serves G1 fully and G2 at the player's own pace.** There is no time pressure, by design (D49): the player reads a static four-bar phrase and regenerates it when they choose.
- **v2 serves G2 with mild pressure** (D51). The phrase rolls forward as new material is generated. A MIDI controller acknowledges correct notes and never penalizes the player (D52).

### Instruments (D54)

- P1 is **not tied to an instrument**.
- Practical constraints come from the product owner's setup: tenor saxophone, and a Travel Sax 2 (MIDI wind controller) used for testing.
- Other testers are expected on other MIDI controllers and keyboards.
- Adding an instrument template MUST stay easy.

### How they think about pitch

They read in their instrument's own pitch: written pitch on a transposing saxophone, concert pitch on a keyboard. When they pick "C", they mean C on _their_ instrument. The product consequence is D56: transposition belongs to the instrument, and the key is chosen in written pitch.

## P2 — The Speed Builder (secondary; D61)

This persona merges the earlier keyboard-tester and sight-reading-student candidates.

### Who

- A musician whose main aim is **speed**: reading faster and playing faster. Improvisation matters less to them, or not at all.
- Often on a keyboard or a generic MIDI controller, and therefore often a concert-pitch reader. This is typical, not defining; the persona is instrument-agnostic (D54).
- Represents the expected outside testers.

### What they want from a session

- **S1 — An endless supply of fresh material** they can't memorize, read at a steadily higher BPM.

### Why they matter to the spec

- **They test the concert-pitch side of D56 and the "easy to add an instrument" rule (D57).** P1's saxophone habits don't cover these.
- **They care most about variety (D59).** Material that is too uniform can be memorized and stops training reading.
- **v2 is their real release.** v1 gives them fresh material but no tempo reference (D49).
- **They pull hardest toward progress tracking.** Examples: "what BPM did I reach?" or a BPM ladder. The guiding principle (acknowledge, never score; adaptation is opt-in and visible; see [far vision](vision/far-vision.md)) bounds what can serve this.
- **Nice to have: adaptive tempo (v2.2).** An opt-in checkbox. Settled (D101): the BPM rises on a
  flat, unconditional schedule (+5 BPM every 2 phrases) rather than reacting to how well the
  player matches notes — a performance-linked version is deferred to v3+. See
  [v2/master-spec.md §10](versions/v2/master-spec.md#10-adaptive-tempo).

## P3 — The Fledgling Composer (secondary; D61)

### Who

- A musician starting to make their own material. They use the generator as a source of ideas and as a sparring partner, not only as practice.

### What they want

- **C1 — Review a session.** At the end, look back at what was displayed and eventually what they played. Mark the parts they liked ("this part there, I really liked it").
- **C2 — Take it out.** Export the marked material to a widely known music format so it can live on in other tools.
- **C3 — Grow an idea.** "I liked that gimmick." They play it, and the app's generation continues it ("auto-completion") to see where it goes. This is MIDI-seeded continuation, placed in v3 (D53).

### How the plan serves them

- **C1 and C2 → v2, marking → v3 (D62, D130).** At the end of a session the player looks back at it and exports the whole session: the generated notes as MusicXML or MIDI, the played notes as a MIDI file of their own, each through its own export action (D129, D130). Marking the parts they liked, and exporting only the marked material, are v3: favorites are settled there ([v3](versions/v3/README.md#favorites)). A session runs from a Start click or the starting note (the note phrase 1 begins on, [§6](versions/v2/master-spec.md#6-backing-click-count-in-and-tempo)) until a Stop click or, with a controller, more than 30 s without a note played ([§7](versions/v2/master-spec.md#7-sessions-review-export-and-privacy) gives the full rules). Keeping a history of generated notes is cheap: each phrase already retains its seed.
- **Played notes are private.** Reviewing them reuses v2's played-note tracking. They stay on the player's system, or leave it only through an export the player chooses. Keeping them across sessions is opt-in and deletable (v3).
- **C3 → v3 (D53).** v2's rolling phrase already continues the app's own output, which is the simpler form of the same mechanism (D65).
- **Later (D65).** A whole MusicXML or MIDI file can seed a continuation. Around v5, a library lets the player pick a snippet from a file or a past session. Snippet selection exists only to create a seed; Infinite Flow stays "not a DAW" (D68).
- **Candidates and their placements (D128, D129, D211).** For C1: a cross-device review, where a session exported on one device is imported on another and reopens for review, placed no earlier than v6 ([v5+](versions/v5-plus/README.md#candidates-not-committed)); richer review tooling on tablet and desktop was dropped (D211; [v3](versions/v3/README.md#review-tooling)). For C1 and C2 (D129): keeping sessions only on request (pinning), suitable access to older sessions, and an optional comment on a session are v3.0 scope since D211 and D212 ([v3](versions/v3/README.md#keeping-sessions)).

## Fit against v1 (findings)

- **F1 — Instrument and display are modeled separately (archived D39).** P1's pitch model says transposition belongs to the instrument. This is the root of ISS-003. → Resolved by D56.
- **F2 — v1 applies no time pressure.** This is intended (D49). v1 has no metronome, playback or playhead, and tempo is only a generation parameter.
- **F3 — "Game player" vs no scoring.** For now there is no conflict, because game play is an attitude (D50). The principle was reworded to "acknowledge and encourage, never penalize or score; anything adaptive is opt-in and visible" (D66).
- **F4 — ISS-004 (rhythmic variety).** → Resolved by D59 and D60. Variety covers shorter and longer values, the default is _Slightly varied_, and Mixed is retired.
- **F5 — Adding an instrument is not easy in v1 (conflicts with D54).**
  - `NotationMode` is a closed set, and transposition uses literal types (`chromatic: 0 | 9 | 14`).
  - Instrument profiles carry no transposition of their own.
  - → D57: transposition becomes open data on the instrument template. This is part of ISS-003.
- **F6 — v1 has no session history or export.** This is P3's gap. → Addressed in v2 (D62).

## Open Questions

None. O24 (the persona-related question about what "fits the chord" means) is resolved — see
D108 and [v2/master-spec.md §9](versions/v2/master-spec.md#9-the-end-of-measure-chord-fit-check).
