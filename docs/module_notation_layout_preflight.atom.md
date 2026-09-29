---
id: module_notation_layout_preflight
status: REVIEW
priority: 1
tags: notation
parents:
  - [[req_landscape_phrase_workspace]]
  - [[rule_notation_display_preserves_phrase]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_staff_needs_room_notice]]
dependents: []
type: MODULE
human_name: Notation Layout Preflight
version: 0.5
layer: ARCHITECTURE
notes: Rewritten 2026-09-29 to the v2 planner: split below 64rem at idle as in a session, one system from 64rem up, a scale fitting the height as well as the width below 64rem, one engraving per system position, two positions always reserved, and two typed layout failures (no room, notes too wide). This replaces the v1 one-system-first rule with its two-line phone fallback and content-derived height. Status returned from REVIEW to DRAFT pending the owner's sign-off on the rewritten text, which the owner gave on 2026-09-29 for version 0.5, promoting it DRAFT to REVIEW; the 5 px legibility floor keeps its 2026-09-24 sign-off. Same-day post-task sync precision fix: the no-room width test counts the fixed padding and depends on the key signature (a setting), not the notes; a window too short for the staff splits its height budget equally between the two positions.
---

# Notation Layout Preflight

## INTENT
Guarantee the four-measure written phrase is drawn legibly in the staff layout the window's width selects, within the window's width and, below the tablet-landscape breakpoint, its height too, and report a phrase that cannot be drawn as one of two distinct typed layout failures: no room for the staff, or notes too wide.

## THE RULE / LOGIC
The staff layout is chosen from the viewport width alone, never from a phrase's content, and one layout is never tried before the other. At viewport widths at or above the 64rem tablet-landscape breakpoint, the one-system layout draws all four measures on one staff system, with clef, key signature and the 4/4 time signature at its start and chord symbols above their harmonic events. Below 64rem, the split layout draws bars 1-2 on a top system, with clef, key signature and time signature, and bars 3-4 on a bottom system, with clef and key signature repeated and no time signature; this holds for every phrase, however short.

The staff area always reserves two system positions, one above the other, in every state (no phrase yet, loading, ready, failed). Both positions have one block size, set from the viewport and never from a phrase: a named system height, in engraving units, times the largest scale the viewport allows; below 64rem, a window too short for the staff at the floor instead splits its whole height budget equally between the two positions. Each position that shows notes holds its own engraving, a separate SVG. In the one-system layout the phrase fills the top position and the bottom position stays blank; in the split layout the top position holds bars 1-2 and the bottom one bars 3-4, both drawn at the phrase's one scale with aligned measure columns, so bar 3 sits under bar 1 and bar 4 under bar 2.

Every measure is drawn at one equal width: the widest of the four measures' minimum widths, and never less than a named minimum measure width. A system needs the leading width (clef, key signature, and on the first system the time signature) plus its measure count (four, or two in the split layout) times that width, plus a fixed padding. The engraving scale is one uniform value for the whole phrase, never above a named maximum and never below the legibility floor. At or above 64rem it is the largest that fits the width. Below 64rem it is the largest that fits both the width and the height: the two system positions must fit the height budget, which is read from the staff frame's computed maximum block size minus its padding and border. The stylesheet builds that maximum from the small viewport height (browser toolbars showing) minus the row above the staff, so a browser toolbar showing or hiding never changes the scale and never redraws the staff.

A phrase that cannot be drawn at the legibility floor fails in one of two ways, each its own typed failure. No room: the window cannot hold the layout at the floor whatever notes the phrase holds, because it is too narrow for the leading width plus the fixed padding with every measure at the minimum measure width (the leading width depends on the key signature, which the selected key sets, never on the notes), or, below 64rem, too short for the two system positions. Notes too wide: the window has room, but this phrase's widest measure needs more width than the floor allows. The layout module only reports which one happened; what the workspace shows for each is decided by its caller. Other failures (notation fonts unavailable, no usable container, an engraving-library failure, drawn content wider than its container) stay typed, retryable notation errors. No partial staff is ever shown: the notation never scrolls horizontally, is never clipped, and is never split into more than two systems.

Engraving waits until the notation fonts and the container size are ready. It re-engraves when the phrase changes, or when the container width, the height budget or the layout changes; any other viewport change leaves the drawn staff untouched. Every successful engraving is paired with a semantic text description of the whole written phrase (the selected instrument profile's written pitch, clef, key, meter, and each measure's chord symbols, notes, rests, durations and ties) for assistive technology, attached to the top system's engraving; in the split layout the bottom system's engraving is hidden from assistive technology, since the same description already covers its measures. A failed or superseded engraving clears that description with the staff. The legibility floor is 5 CSS pixels per staff space, signed off by the user on 2026-09-24; the 12 CSS-pixel maximum is an engineering choice, not a product decision.

## TECHNICAL INTERFACE
Layout accepts the written phrase's measured widths, the score container width, and the viewport: the one-system layout at or above the 64rem tablet-landscape breakpoint, or, below it (`NOTATION_PHONE_LAYOUT_MEDIA_QUERY`, a width-only query mirroring 64rem), the split layout with its height budget in CSS pixels. It returns either a plan (layout, system count, uniform scale, system position block size, system and measure widths) or one of two typed failures: no room for the staff (too narrow or too short) or notes too wide. A phrase-independent companion gives the system positions' block size, or no room, from the viewport alone. Engraving draws one SVG per system position that shows notes, or throws a typed notation error whose code tells the two layout failures (`notation_no_room`, `notation_notes_too_wide`) apart from the retryable ones.

## EXPECTATION
- At 64rem and above, all four measures render on one staff system in the top position, and the bottom position is reserved and blank; below 64rem, every phrase renders split, bars 1-2 on top and bars 3-4 below, with clef and key signature repeated on the bottom system and the time signature only on the top one.
- Both system positions are always reserved, with one block size that depends on the viewport and never on a phrase.
- Below 64rem, a shorter window lowers the scale; a window too short for two systems at the legibility floor gives "no room", whatever the phrase.
- A window too narrow for the layout's fixed parts at the floor gives "no room"; a window with room but a phrase whose measures are too wide gives "notes too wide"; the two are distinct typed outcomes.
- The scale is never below the floor or above the maximum, and all measures render at one aligned equal width.
- A browser toolbar showing or hiding never re-engraves the staff.
- Every successful engraving is paired with a text description of the whole phrase; a failed one clears it.
