# v5+ — Library and Microphone

Status: direction (2026-09-25). These are far placements: "maybe v5 material", and microphone
"v5 or 8". A cross-device review candidate was added 2026-09-28 (D128), placed no earlier than
v6.

## Settled direction

- **Library (around v5).**
  - External files and past sessions are displayed alike.
  - The player selects a snippet and hands it over as a continuation seed.
- **"Not a DAW" boundary.**
  - Selecting a snippet is allowed **only as a way to create a seed**.
  - Editing, cutting and splicing, arranging and multitrack are out of scope. The app must not
    become "too professional".
- **Microphone input** ("v5 or 8").
  - Acoustic pitch detection as an input kind, alongside MIDI.
  - It plugs into v3's "my instrument" input-kind setting.
  - It stays far out because browser-side detection adds latency and uncertainty.

## Candidates (not committed)

- **Cross-device review by export, then import (no earlier than v6).** Recorded 2026-09-28
  (D128, from ux D64).
  - The case: a player plays on the phone and wants a real review on a larger screen. They
    export the session, import it on another device, and it reopens for review.
  - The owner's words: "a maybe, but not prior v6", and "mostly composer stuff". It serves P3's
    C1, reviewing a session ([personas](../../personas.md#p3--the-fledgling-composer-secondary-d61)).
  - No version plans it today. v4's whole-file seed feeds a continuation, not a review.
  - Two things to settle if it is ever specced, noted here without a design:
    - **What an export carries.** A v2 export holds less than a review shows. The played notes
      travel only as their own MIDI file, when the player picks them as the export's content
      (D129); MusicXML and the generated-notes MIDI file never hold them. No file holds the
      phrases' reproduction inputs
      ([v2 master spec §7](../v2/master-spec.md#7-sessions-review-export-and-privacy)).
    - **Overlap with the library above.** The library already displays past sessions alongside
      external files.

## Depends on

- v3's persistence and earlier-session review.
- v4's whole-file seed, or whichever version ends up hosting it.
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
