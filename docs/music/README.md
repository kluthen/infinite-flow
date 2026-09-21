# Music Reference

Status: draft v0.1

## Purpose

This reference describes the musical vocabulary behind Infinite Flow's generators in language useful to both implementers and players. It is self-contained: each rule states what it means and when it applies. Candidate defaults are marked `(proposed)` until validated through generated phrases and player feedback.

## Current Profiles

- [Neutral profile](neutral-profile.md): diatonic four-measure phrases in a selected major, minor, or modal collection.
- [Jazz profile](jazz-profile.md): the neutral harmonic plan with limited chromatic approaches and enclosures.
- [Terms](terms.md): concise shared definitions for player-facing explanations and implementation annotations.
- [Research sources](research-sources.md): retained theory sources and the specific questions they inform.

## Shared Principles

- A generated result is a short phrase, not a sequence of independently random bars.
- A tension control changes observable musical choices such as harmonic function, non-chord-tone placement, rhythmic displacement, contour, leap size, and space. It is not an objective universal score.
- Strong expectations are style- and mode-dependent. Modal material does not automatically use dominant-to-tonic behavior that belongs to tonal practice.
- Range, breath, and difficulty constraints require an instrument-specific policy. The initial profile targets tenor saxophone and uses concert MIDI 45 through 58, corresponding to written `B3` through `C5`; later versions may expose a player-selected range.
