# Generator Contract

Status: draft v0.1

## Purpose

This document defines the stable boundary around musical generation. It lets the four-measure generator, later MIDI-seeded continuation, notation renderer, optional backing arranger, and feedback evaluator evolve independently.

## Generation Request

A request is immutable and serializable. It contains:

- request identity and generator profile identifier
- deterministic random seed
- requested measure count; the first deliverable always requests four
- meter and tempo; the first deliverable always uses 4/4 with one user-selected BPM
- concert-pitch tonal center and selected scale or mode
- a selected validated declarative instrument profile with its inclusive active concert range and resolved whole-phrase register window: C MIDI keyboard `48-72` (Low `48-60`, Middle `54-66`, High `60-72`), B-flat tenor saxophone `46-70` (Low `46-58`, Middle `52-64`, High `58-70`), or E-flat alto saxophone `51-75` (Low `51-63`, Middle `57-69`, High `63-75`), independent of notation display convention
- normalized control policy for harmonic motion, tension, subdivision, syncopation, silence density, contour, register, leapiness, and arpeggio chaos
- optional recent phrase context; absent for the first deliverable and present only when later MIDI continuation needs it

The player-selected tonal center and scale or mode remain authoritative when a later MIDI seed phrase is supplied. The request does not contain notation transposition, browser state, audio nodes, UI widget values, or mutable session state.

## Generation Result

A result is an immutable concert-pitch timeline. It contains:

- the request identity and seed that created it
- ordered measures, each with its harmonic role and chord event or sustained harmony
- ordered note and rest events that fill every measure exactly
- musical annotations such as chord degree, tension role, phrase function, and source rule where they are available
- validation annotations that explain applied phrase, tension, or profile rules

The result does not contain rendered staff symbols, written pitches, MIDI device messages, audio scheduling timestamps, or scoring state. Notation derives written pitch from the result and the active transposition choice. Every returned result must fill its requested meter exactly and satisfy hard range constraints; otherwise generation fails explicitly rather than returning an invalid phrase.

## Stage Ownership

- The harmony planner owns chord events and phrase-level harmonic roles.
- The rhythm planner owns event start positions, durations, ties, and rests.
- The pitch planner owns concert pitches for note events under supplied harmonic and range constraints.
- The optional backing arranger reads the result and creates separate accompaniment events. It cannot alter lead events.
- The notation renderer reads the result and applies the independently selected Concert, B-flat tenor, or E-flat alto display convention without changing source events, the selected profile, its active range, or its resolved window.
- The MIDI layer emits incoming events; the initial display layer may compare them with visible proposal events, but evaluation and adaptation are later consumers.

## Determinism

The same request must produce the same result. The Re-generate action retains policy values and creates a new seed. This behavior is required for meaningful tests, debugging, player phrase retention, and later comparisons between generator profiles.
