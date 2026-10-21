> **Archived 2026-10-21.** Closed range for the v3.1 milestone: v3.1 is released as version
> 3.1.0 (tag `v3.1.0`, 55364e7). These are the owner's first rulings on v3.1's presets
> (2026-10-07): what a preset holds, and its key and mode restriction. Archived IDs keep their
> meaning and may be cited anywhere; each decision's content is now stated as settled fact in
> [master spec Part B](../../versions/v3/master-spec.md#b6-presets), as the "where it now lives"
> table in [archive/v3/README.md](README.md) records. Relative links were written from `specs/`;
> their paths were repaired on 2026-10-21 so they resolve from this folder.

- **D228 (2026-10-07): v3.1 presets are generator configuration, kept modest (closes O126).** The
  owner: presets are "mostly generator configuration", and "a bit cheap" for now, as Neutral and
  Jazz already are. (1) **What a preset holds:** the generation settings only. Instrument, tempo,
  key and mode are out, so **a preset never sets the collection** (the scale or mode control),
  answering O126 against spec-writer's proposal; built-in presets lean on the other settings
  (and, once v3.1 has them, embellishment weights). (2) **Built-ins are ours:** the project
  provides its own configurations for various presets; the player may customize them. (3) **How
  a player makes one:** select a preset, change settings (as with Neutral and Jazz today, which
  shows "Custom"), then save it under a name. (4) **The preset selector becomes a combo box and
  moves higher in the controls** (the owner's direction for `ux-writer`). (5) **Presets do not
  intersect with "my instrument"** at all, for now. (6) **Later, not v3:** presets grow richer
  with gimmicks, preferred rhythm cues, and restrictions on range, notes, key and mode; they
  become integral to the endgame, where each character (protagonist, antagonist), location or
  event has its own preset, including an instrument preference and a tone.

- **D229 (2026-10-07): a key and mode restriction joins v3.1 presets, if it is cheap (amends
  D228).** The owner: "if key and mode restriction are easy to handle for v3.1 then add it (so
  that it preserve current selection)". A preset may carry a restriction on which keys and modes
  are allowed; selecting the preset **never changes the player's current key and mode**. Still a
  preset never _sets_ the key or mode (D228). Conditional on a cost check against the code
  (the v3.1 draft does it); if it is not cheap, it stays with the later, richer presets. Read by
  spec-writer as (proposed, to confirm): the restriction bounds what the app itself picks (Vary
  settings' key and mode moves; in v3.2, the key and mode suggestion's candidates); what happens
  when the current selection is already outside the restriction is open (O160).

- **D230 (2026-10-07): a preset may change the current key and mode (amends D228 and D229; closes
  O160).** The owner: "i will allow the preset to change current mode and key". This reverses
  D229's "selecting the preset never changes the player's current key and mode" and D228's "key
  and mode are out" as far as the restriction goes. Read by spec-writer as: when the player
  selects a preset whose key and mode restriction excludes the current selection, the selection
  moves inside the restriction; a restriction to one key and one mode therefore sets them; a
  current selection already inside is kept. Choosing a preset is the player's own act, so this
  does not break the rule that the app never switches key and mode on its own (D209). Which
  allowed key and mode the selection moves to is left to the v3.1 draft (proposed: the preset's
  first listed). Still conditional on D229's cost check.

- **D231 (2026-10-07): a preset's key and mode restriction guides, never blocks (refines D230).**
  The owner: when a preset restricted to some keys and modes is selected, the key and mode
  controls **highlight** the keys and modes for which the preset is valid; **nothing is
  prevented**, every key and mode stays selectable. Choosing one outside the restriction is
  opting out: the preset is **no longer the selected one**, exactly as today when a change to
  Jazz's settings leaves Jazz ("nothing actually really changed beside the new setting"; the
  selection then reads Custom, every other setting untouched). With D230, selecting the preset
  still moves an outside key and mode inside. The highlight is the owner's direction for
  `ux-writer`. Still conditional on D229's cost check. Proposed by spec-writer, to confirm in the
  v3.1 draft: Vary settings, when it moves key and mode under a restricted preset, stays inside
  the restriction, so the app never opts the player out of their preset by itself.
