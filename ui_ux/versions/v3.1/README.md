# v3.1 — Presets and Embellishment Figures: UI/UX Design

Status: **approved by the owner on 2026-10-19, not built yet.** This folder is the v3.1 design as
approved, frozen on 2026-10-19 so that the v3.1 build reads a design that no longer moves while
v3.2 and v3.3 are still being reviewed at the `ui_ux/` root. It is never edited again, except to
correct it to match what v3.1 actually ships (each such correction is recorded in the root
`decisions.md`, and the same correction is applied at the root). The working record that produced
this design (decision log, open questions, work tracker) is still in the live registers at the
root, and goes to `archive/` when v3.1 is released. The product scope is Part B of
[`specs/versions/v3/master-spec.md`](../../../specs/versions/v3/master-spec.md#part-b--v31). The
v3.0 design it extends is in [`versions/v3.0/`](../v3.0/README.md).

At the root, v3.1, v3.2 and v3.3 were designed back to back, each release's changes marked apart
and every v3.2 or v3.3 change written as its own tagged paragraph, item or annotation. This copy
is the root with every v3.2 and v3.3 part left out: their tagged paragraphs, list items, table
rows, change-block lines, code-block annotations and the sections they open, and the Jam flow
(`flows/jam/`), which is new in v3.2. Nothing else was reworded, except where v3.2 had rewritten
earlier text in place: the strategy's flow index gives Play session and Review and export their
v3.0 goals back. Link paths were adjusted to this folder.

The documents keep their marks. A `[v3 new]` or `[v3 changed]` tag, and each document's
unprefixed **Changes since v2** items, show what v3.0 changed from v2; a `[v3.1 new]` or
`[v3.1 changed]` tag, and the change-block items prefixed `_v3.1 new:_`, `_v3.1 changed:_` or
`_v3.1 removed:_`, show what v3.1 changes from v3.0. Removed wording is in
[`versions/v3.0/`](../v3.0/README.md). A document new in v3.1 says so under its title.
`grep -rn "v3\(\.1\)\? \(new\|changed\)"` finds every mark.

The v3.1 token-source additions are in [`token-source-v3.1.md`](token-source-v3.1.md), the v3.1
part of the root's `token-source-v3.1-v3.2.md`. They are written into `src/styles/theme.css` and
`components.css` by v3.1's token-source pass; once v3.1 ships, the shipped state of those two
files is the release tag's.

## What v3.1 is

The player gets presets: one dropdown at the top of the controls sets many settings in one step,
from eight built-in starting points or from presets of their own, saved, renamed and deleted in
one short sheet. A preset may be meant for some keys and modes, which the key and mode controls
mark. Any change of a setting a preset holds shows as Custom, based on the preset it came from.
The melody's decorations become seven embellishment figures, each with a level from Off to Very
often. Kept sessions name the preset they started with, and Your data lists the player's presets.
The workspace is the v3.0 screen, extended again.

## The decisions worth keeping, and why

- **The preset is a native dropdown, first in the controls.** Choosing a starting point comes
  before fine-tuning, and a native `select` is the most familiar and robust list for eight to
  fifty-eight entries, grouped into Practice, Styles and Your presets.
  ([phrase-workspace intent](screens/phrase-workspace/intent.md#the-preset-bar),
  [presets intent](flows/presets/intent.md#a-starting-point-first))
- **The box names the selection; a line under it describes it.** Custom reads "Custom, based on
  {name}", and only choosing a preset leaves it, so the player always knows where their settings
  came from. ([presets intent](flows/presets/intent.md#custom-and-its-base))
- **Choosing a preset keeps the phrase on screen.** It is a change of settings like any other:
  nothing is generated until the player asks.
  ([presets intent](flows/presets/intent.md#choosing-a-preset))
- **A preset's keys and modes are marked, never enforced.** A small dot on each allowed segment
  and a sentence in words; no segment is disabled, and colour is never the only signal.
  ([presets intent](flows/presets/intent.md#the-key-and-mode-a-preset-is-meant-for),
  [phrase-workspace intent](screens/phrase-workspace/intent.md#the-key-and-mode-marks))
- **Seven figure levels, always shown, in plain words.** Off, Rarely, Often, Very often, each
  figure explained with an example and the rhythm it needs; a hidden group would hide what a
  preset changed. ([phrase-workspace intent](screens/phrase-workspace/intent.md#embellishments))
- **Saving, renaming and deleting a preset happen in one short sheet**, its name prefilled and
  never blocking a save, its key and mode choice defaulting to the restriction in force.
  ([preset-sheet intent](screens/preset-sheet/intent.md#one-sheet-four-short-modes),
  [presets intent](flows/presets/intent.md#keeping-what-you-found))
- **During a session the preset row holds still.** The box is read-only, the buttons stay as
  they were at the start, and a setting Vary settings moves shows only as Custom in the box; the
  selection returns with the settings at the end.
  ([presets intent](flows/presets/intent.md#during-a-session))
- **A kept session names its preset as it was then.** A snapshot: a later rename or deletion
  never rewrites what was played. ([kept-sessions intent](flows/kept-sessions/intent.md#the-list))
- **Your data lists the player's presets**, each deletable there too, and `Delete everything`
  removes them. ([your-data intent](screens/your-data/intent.md#focal-point))
