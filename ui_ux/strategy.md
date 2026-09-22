# Interface Strategy

## Problem Alignment

Infinite Flow helps a C MIDI keyboard player, B-flat tenor saxophone player, or E-flat alto saxophone player obtain one readable, playable four-measure idea without writing a progression, interpreting an opaque randomizer, or being graded. The interface makes a single deliberate loop obvious: set musical character, inspect all four measures, then regenerate the whole phrase when a different proposal is wanted.

The phrase is the primary object. Mobile and tablet support is landscape-only; desktop supports either orientation when sufficient width is available. The full staff receives the complete primary row, and controls remain beneath it without claiming score width.

## Mental Model

The player approaches the screen as a music stand with a compact set of musical directions beside it. Chord symbols sit above the staff where lead-sheet readers expect them; barlines make the four-bar form immediately countable; the selected notation mode is visible next to the score rather than hidden in a settings area.

Controls are grouped by the musical decision they influence: foundation, rhythm, melodic shape, and character. They follow the score in a downward-scrolling section and reorient from a horizontal set of groups on wide screens to compact stacked groups on mobile landscape. Each presents named musical outcomes rather than unexplained numeric values. Advanced character controls are disclosed only after the foundational controls, because a player can choose a usable phrase with tempo, tonal context, rhythm, and contour alone.

## Visual Direction

(proposed) The workspace has the quiet authority of a marked-up music desk: warm off-white paper with graphite notation and a restrained brass action color in light mode; deep ink with parchment notation and muted brass in dark mode. The interface avoids decorative instrument imagery and gradients that could reduce staff contrast. Editorial display type gives the title personality; controls use a highly legible sans serif. The staff itself always uses a dedicated SMuFL notation font.

## Trade-offs

- A full-width horizontal staff is chosen over individual measure cards. It preserves phrase-level rhythm, harmonic movement, and the relationship between question and answer.
- A scrollable, below-score control section is chosen over a desktop side rail. The score needs the entire width for readable engraved detail, especially when viewed at a distance.
- Named segmented options are chosen over freeform knobs or continuous sliders. The generator has discrete first-release policy values, and labels make the consequences inspectable.
- Chord symbols transpose with the selected notation mode. The underlying harmony remains concert-pitch data, but a displayed lead sheet must keep written notes, tonal label, key, chord labels, and slash bass in the same reading convention.
- Concert, B-flat, and E-flat display modes all use treble G2 clef. The selected display convention transforms notation only; it never changes the concert phrase or selected instrument profile.

## Engraving Policy

The renderer must engrave a semantic event timeline, not approximate notes with CSS or arbitrary vertical offsets. It must calculate pitch placement from the active clef and display transposition; choose a key signature from the selected tonal context; calculate accidentals from the displayed key and local measure state; and render duration, rests, dots, beams, ties, tuplets if later supported, barlines, and the 4/4 signature according to conventional engraving rules.

Each displayed measure has a visible chord symbol above its first harmonic event. A harmony change within a measure receives its own correctly aligned chord symbol. The system validates that every measure occupies exactly four beats before it becomes visible. A rejected or incomplete result replaces no existing phrase.

## Edge-Case Policy

- **Initial empty:** Explain that a four-measure idea will appear here. The workspace-header generation action remains the single primary action; keep the control sheet usable.
- **Generating:** Disable only the phrase-generation action, retain controls as read-only context, preserve the previous phrase until a complete new result is ready, and announce generation status non-visually.
- **Generation failure:** Keep the previous valid phrase visible. Put a concise error message beside the regeneration action and offer retry; do not show a partial staff.
- **Notation failure:** Preserve the generated phrase data but replace the score with an error panel. The workspace-header action changes to retry notation; never render a misleading fallback of letter names as the score.
- **Display-mode switch:** Redraw the same phrase promptly with no seed or control changes. Keep the staff frame stable; fade the contents only after correct engraving is ready.
- **Instrument-profile switch:** Validate the unchanged concert phrase against the new active range and resolved whole-phrase register window. Retain and redraw it only when it fits; otherwise preserve controls and regenerate a complete replacement with a fresh seed. Never transpose source events to fit.
- **Optional MIDI:** MIDI feedback is deferred from the current flow and screen set. When scheduled, connection and match states remain quiet secondary indicators; mismatch never exposes the incoming pitch or creates a score.
- **Offline:** Required behavior remains available because generation and notation are browser-local. If a browser capability is unavailable, explain the affected optional capability without blocking phrase generation.

## Flow Index

| Flow | Goal | Design |
| --- | --- | --- |
| Generate phrase | Set musical character and explicitly create or replace one complete phrase. | `flows/generate-phrase/` |
