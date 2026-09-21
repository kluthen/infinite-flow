# Music Reference

Status: draft v0.1

## Purpose

This reference describes the musical vocabulary behind Infinite Flow's generators in language useful to both implementers and players. It is self-contained: each rule states what it means and when it applies. Candidate defaults are marked `(proposed)` until validated through generated phrases and player feedback.

## Current Profiles

- [Neutral profile](neutral-profile.md): diatonic four-measure phrases in a selected major, minor, or modal collection.
- [Jazz profile](jazz-profile.md): the neutral harmonic plan with limited chromatic approaches and enclosures.
- [Terms](terms.md): concise shared definitions for player-facing explanations and implementation annotations.
- [Research sources](research-sources.md): retained theory sources and the specific questions they inform.
- [Saxophone profile ranges](saxophone-profile-ranges.md): adopted instrument ranges, whole-phrase register windows, and independent notation-display transforms.

## Shared Principles

- A generated result is a short phrase, not a sequence of independently random bars.
- A tension control changes observable musical choices such as harmonic function, non-chord-tone placement, rhythmic displacement, contour, leap size, and space. It is not an objective universal score.
- Strong expectations are style- and mode-dependent. Modal material does not automatically use dominant-to-tonic behavior that belongs to tonal practice.
- Range, breath, and difficulty constraints use a selected declarative instrument profile. First release supports C MIDI keyboard concert MIDI `48-72`, B-flat tenor saxophone `46-70`, and E-flat alto saxophone `51-75`, each with one resolved Low, Middle, or High window for the whole phrase. `Varying` deterministically selects a feasible window and never changes it mid-phrase; notation display remains independent of the profile.
