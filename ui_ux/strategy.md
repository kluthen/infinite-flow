# Interface Strategy

## Problem Alignment

Infinite Flow helps a C MIDI keyboard player, B-flat tenor saxophone player, or E-flat alto saxophone player obtain one readable, playable four-measure idea without writing a progression, interpreting an opaque randomizer, or being graded. The interface makes a single deliberate loop obvious: set musical character, inspect all four measures, then regenerate the whole phrase when a different proposal is wanted.

The phrase is the primary object. Mobile and tablet support is landscape-only; desktop supports either orientation when sufficient width is available. The full staff receives the complete primary row, and controls remain beneath it without claiming score width.

## Mental Model

The player approaches the screen as a music stand with a compact set of musical directions beside it. Chord symbols sit above the staff where lead-sheet readers expect them; barlines make the four-bar form immediately countable; the score simply reads in the selected instrument profile's own written pitch, with no separate notation-display concept to surface next to it or hide in a settings area.

Controls are grouped by the musical decision they influence: foundation, rhythm, melodic shape, and character. They follow the score in a downward-scrolling section and reorient from a horizontal set of groups on wide screens to compact stacked groups on mobile landscape. Each presents named musical outcomes rather than unexplained numeric values. The character group is placed last in reading order but is always visible and never collapsible — it holds only Arpeggio chaos in first release, and a static group with one field needs no progressive-disclosure interaction.

## Visual Direction

(proposed) The workspace has the quiet authority of a marked-up music desk: warm off-white paper with graphite notation and a restrained brass action color in light mode; deep ink with parchment notation and muted brass in dark mode. The interface avoids decorative instrument imagery and gradients that could reduce staff contrast. Editorial display type gives the title personality; controls use a highly legible sans serif. The staff itself always uses a dedicated SMuFL notation font.

## Trade-offs

- A full-width horizontal staff is chosen over individual measure cards. It preserves phrase-level rhythm, harmonic movement, and the relationship between question and answer.
- A scrollable, below-score control section is chosen over a desktop side rail. The score needs the entire width for readable engraved detail, especially when viewed at a distance.
- Named segmented options are chosen over freeform knobs or continuous sliders. The generator has discrete first-release policy values, and labels make the consequences inspectable.
- Chord symbols transpose with the selected instrument profile's own written pitch. The underlying harmony remains concert-pitch data, but a displayed lead sheet must keep written notes, key, chord labels, and slash bass in the same written-pitch reading.
- Every instrument profile uses treble G2 clef. Only that profile's own fixed transposition changes what is written; it never changes the concert phrase or requires a separate notation-display selection.

## Engraving Policy

The renderer must engrave a semantic event timeline, not approximate notes with CSS or arbitrary vertical offsets. It must calculate pitch placement from the active clef and the selected instrument profile's own fixed transposition; choose a key signature from the player's written-key selection; calculate accidentals from the displayed key and local measure state; and render duration, rests, dots, beams, ties, tuplets if later supported, barlines, and the 4/4 signature according to conventional engraving rules.

Each displayed measure has a visible chord symbol above its first harmonic event. A harmony change within a measure receives its own correctly aligned chord symbol. The system validates that every measure occupies exactly four beats before it becomes visible. A rejected or incomplete result replaces no existing phrase.

## Edge-Case Policy

- **Initial empty:** Explain that a four-measure idea will appear here. The workspace-header generation action remains the single primary action; keep the control sheet usable.
- **Generating:** Disable only the phrase-generation action, retain controls as read-only context, preserve the previous phrase until a complete new result is ready, and announce generation status non-visually.
- **Generation failure:** Keep the previous valid phrase visible. Put a concise error message beside the regeneration action and offer retry; do not show a partial staff.
- **Notation failure:** Preserve the generated phrase data but replace the score with an error panel. The workspace-header action changes to retry notation; never render a misleading fallback of letter names as the score.
- **Co-active generation and notation failure:** When an out-of-band notation redraw on the phrase retained after an earlier generation failure itself fails, keep both indicators visible — the generation-failure message above the score, and the notation-error panel replacing the score itself — rather than dropping either, even though the one action that can address either of them sits separately in the workspace header. The single workspace-header action goes to the notation failure, since it is the narrower, phrase-preserving fix and does not depend on current control values the way a fresh generation attempt does. Resolving the notation failure restores the generation-failure message's own retry action automatically; it never clears or re-validates the generation-failure message itself.
- **Instrument-profile switch:** Never validate the outgoing phrase against the new profile's range. With a phrase shown, always take a fresh seed, keep every other control, and regenerate a complete replacement immediately under the new profile — unless the current rhythm-control combination is already unsupported, in which case the switch still applies but clears the phrase to Empty instead of regenerating. With no phrase shown, the switch only changes the selection. Never transpose source events to fit.
- **Optional MIDI:** connecting a controller is always optional and never blocking — a session is always startable with no controller connected (`flows/controller-connection/`), and every connection state (unsupported browser, permission denied, no device found, a controller lost mid-session) is a quiet, neutral status, never an error-colored one: absence of a controller is a normal, fully supported way to use the app, not a fault. A note that fails to match the expected pitch produces no visible change of any kind — the same "no mismatch hint, ever" principle carried through from v1 — and the played note itself is never rendered.
- **Offline:** Required behavior remains available because generation and notation are browser-local. If a browser capability is unavailable, explain the affected optional capability without blocking phrase generation.

## Flow Index

| Flow | Goal | Design |
| --- | --- | --- |
| Generate phrase | Set musical character and explicitly create or replace one complete phrase. | `flows/generate-phrase/` |
| Controller connection | Connect a MIDI controller, resolve which device to use, and confirm it agrees with the instrument template's written pitch before a session relies on it. | `flows/controller-connection/` |
