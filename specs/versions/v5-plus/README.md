# v5+ — Library and Microphone

Status: direction (2026-09-25). These are far placements: "maybe v5 material", and microphone
"v5 or 8".

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

## Depends on

- v3's persistence and earlier-session review.
- v4's whole-file seed, or whichever version ends up hosting it.
- Early building blocks: [prerequisites.md](../prerequisites.md), being drafted.
