# Personas

Status: draft v0.7

Personas are the user's decisions. Anything not yet confirmed is tagged `(proposed)`. Settled 2026-09-25. The decisions behind this document (D48–D50, D54, D61) are in the [2026-09-25 archive](../archive/2026-09-25-decisions-D47-D71.md).

| Persona                     | Role      | Core want                                  | Served mainly by                   |
| --------------------------- | --------- | ------------------------------------------ | ---------------------------------- |
| P1 — The Curious Improviser | Primary   | Learn improvisation by playing, gain speed | v1 (at own pace), then v2          |
| P2 — The Speed Builder      | Secondary | Read and play faster                       | v2 (rolling phrase, mild pressure) |
| P3 — The Fledgling Composer | Secondary | Keep and grow ideas                        | v2 review/export, v3 seeding       |

All persona names are working names.

## P1 — The Curious Improviser (primary; D48)

### Who

- A musician who can already play. They read most standard notation, but still struggle to read quickly and to perform at speed.
- A **beginner at improvisation**.
- A "player" in the game-player sense. **For now this is an attitude** (D50): curious, playful, enthusiastic, and inclined to poke at settings to see what happens. There are no game mechanics in the near term. The far future is covered in [far vision](../vision/far-vision.md).
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
- **They pull hardest toward progress tracking.** Examples: "what BPM did I reach?" or a BPM ladder. The guiding principle (acknowledge, never score; adaptation is opt-in and visible; see [far vision](../vision/far-vision.md)) bounds what can serve this.
- **Nice to have: adaptive tempo (v2).** An opt-in checkbox. The BPM slowly rises as long as the player keeps an "acceptable level" of matching notes, which depends on O24 in [v2](../versions/v2/README.md).

## P3 — The Fledgling Composer (secondary; D61)

### Who

- A musician starting to make their own material. They use the generator as a source of ideas and as a sparring partner, not only as practice.

### What they want

- **C1 — Review a session.** At the end, look back at what was displayed and eventually what they played. Mark the parts they liked ("this part there, I really liked it").
- **C2 — Take it out.** Export the marked material to a widely known music format so it can live on in other tools.
- **C3 — Grow an idea.** "I liked that gimmick." They play it, and the app's generation continues it ("auto-completion") to see where it goes. This is MIDI-seeded continuation, placed in v3 (D53).

### How the plan serves them

- **C1 and C2 → v2 (D62).** At the end of a session the player reviews it, marks favorites and exports them as MusicXML or MIDI. A session runs from the first MIDI input or a Start click until 30 s without input or a Stop click. Keeping a history of generated notes is cheap: each phrase already retains its seed.
- **Played notes are private.** Reviewing them reuses v2's played-note tracking. They stay on the player's system, or leave it only through an export the player chooses. Keeping them across sessions is opt-in and deletable (v3).
- **C3 → v3 (D53).** v2's rolling phrase already continues the app's own output, which is the simpler form of the same mechanism (D65).
- **Later (D65).** A whole MusicXML or MIDI file can seed a continuation. Around v5, a library lets the player pick a snippet from a file or a past session. Snippet selection exists only to create a seed; Infinite Flow stays "not a DAW" (D68).

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

None. The one persona-related question still open is O24, owned by [v2](../versions/v2/README.md).
