# Feature Note: v1 — First Release

Status: reached (implemented), 2026-09-25; gate amendments noted 2026-09-26. The v1.0 gate is still open (see below).

## Summary

v1 is a browser-only, client-side practice partner for a monophonic player. It generates one
coherent, staff-notated four-measure 4/4 phrase from player-selected controls. The player
regenerates the whole phrase explicitly to get a new variation. Its value is a musically legible
proposal to read and play. It does not play the phrase back, score the player, or run an endless
session.

- **Release candidate:** `v1.0-rc1` = commit `2418069`
- **Master spec (what was built):** [first-release-master-spec.md](../first-release-master-spec.md)
- **Working record:** [archive/v1](../archive/v1/README.md). Decisions D1–D46 are archived there.

## What v1 delivers

- Four measures in 4/4 at a stable 60–240 BPM, regenerated all at once with a new, retained seed.
  A seed reproduces its phrase exactly.
- Harmony (chord labels) plus a monophonic line generated from one concert-pitch event timeline.
- Instrument profiles: C MIDI keyboard, B♭ tenor sax and E♭ alto sax. Each has a hard concert
  range and a register window that holds for the whole phrase.
- Notation display in Concert, B♭ or E♭ as a pure redraw. B♭ is the first-load default. _At the v1.0
  gate (ISS-003) this changes: the instrument carries its transposition, the key is chosen in
  written pitch, and the separate display selector is removed._
- Tonal controls: all twelve tonal centers × major, minor and the church modes.
- Musical controls: harmonic motion, tension arc, note density, syncopation, silence density,
  contour, register, leapiness and arpeggio chaos. _At the v1.0 gate (ISS-004) rhythmic variety
  is added and the Mixed note density is retired._
- Neutral (default) and jazz profile presets, each replacing a complete control bundle.
- Rhythm combinations with no legal plan are blocked with an explanation. A search that reaches
  its work limit offers a retry.
- A landscape mobile/tablet and desktop workspace, system or manual light/dark theme, and offline
  use after one online load. Chromium only.

## Explicitly excluded

Excluded from v1: playback, required backing, MIDI input and feedback, microphone capture,
continuous generation or a rolling staff, persistence or export, scoring, tempo variation, meters
other than 4/4, chord-progression authoring, altered dominants, substitutions, modulation and
altissimo. Details are in the master spec's "Explicitly Excluded" section. Post-v1 candidates are
in [deferred-scope.md](../../docs/release/deferred-scope.md).

## Evidence

- [Release checklist](../../docs/release/release-checklist.md) (the v1.0 gate)
- [DoD acceptance matrix](../../docs/release/dod-acceptance-matrix.md)
- [Reconciliation report](../../docs/release/reconciliation-report.md)
- [Browser and offline limits](../../docs/release/browser-and-offline-limits.md)

## Remaining v1.0 gate items

The v1.0 gate requires no open issue in [`issues/`](../../issues/README.md). Two issues are open.
Their semantics are settled; they go through ux-writer, then implementation. See
[versions/v1](../versions/v1/README.md) for the order and scope.

- **ISS-003:** the tonal center is chosen in the instrument's written key, and transposition
  becomes instrument data.
- **ISS-004:** rhythmic variety. It starts with a rhythm-grammar feasibility review.
- **D73:** musical-profile behavior is gated by named capabilities, not profile names. Output is
  unchanged.

The [master spec](../first-release-master-spec.md) (draft v2.0) already states the amended v1.0
behavior.
