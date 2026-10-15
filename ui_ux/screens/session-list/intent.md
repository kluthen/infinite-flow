# Session List Intent

> **New in v3.**

> **Changes since v3.0**
>
> - _v3.1 changed:_ a row names the preset the session started with ([Focal Point](#focal-point))
> - _v3.2 new:_ a Jam session's row says "Jam" ([Focal Point](#focal-point))

## What This Screen Is

The session list, titled **All sessions**, is the second level of the workspace's review mode.
Like a session's review, it takes the staff's place under the same header and score toolbar,
with the controls still below it; no session starts while it shows, and the header's session
button reads `Close review`. It lists every session the app keeps on this device, newest first,
and opens any of them in the review. The reasoning for that shape, and for how the player gets
here and back, is in [`flows/kept-sessions/intent.md`](../../flows/kept-sessions/intent.md).

It is written for the Fledgling Composer (P3), who comes back to find a session they liked
(P3.C1) and take its phrases out (P3.C2). Personas are defined in
[`specs/personas.md`](../../../specs/personas.md). The Curious Improviser (P1) and the Speed
Builder (P2) may never open it; nothing about it reaches the screen they play from except one
small link.

## Focal Point

The rows are the point, and in each row its title: the date and time the session was played. It
is the first thing read, the one way to open the session, and the way most players remember a
session ("the one on Tuesday evening"). It is drawn as text in the body's colour and weight
rather than as a framed button, so a column of dates reads as a list, not as a wall of buttons;
it still has a button's target size, focus ring and loading state.

**[v3.1 changed]** Under the title, two quiet lines describe the session: what it was (length,
phrases, instrument, the preset it started with), then how it is kept (favorites, played notes
kept, pinned or not). Then the first words of the comment, in the body's colour because the
player wrote them, cut to one line: the review shows the whole comment. The preset is the one the
session was played with, written as it was then; renaming or deleting it later changes nothing
on the row, which records what was played.

**[v3.2 new]** A Jam session's first line starts with the word "Jam", so a player looking for the
session where they grew their own idea finds it at a glance. A word rather than an icon, because a
word needs no legend and reads the same to a screen reader; and only that word, since the row's
title, the date, is still how a session is told apart.

The row's two buttons, `Pin` or `Unpin` and `Delete`, sit at the row's end, plain and equal.
Neither is the page's primary action: that stays `Close review` in the header, the way back for
every player.

## The Header

The title is "All sessions", the same words as the link that leads here and the review's button
back here, so the player always knows they are in the same place. It is a heading the page can
move focus to, so arriving lands a screen-reader player at the top.

Beside it, a `Your data` button opens the sheet listing everything the app keeps. It sits here
because a player looking at their kept sessions is the one most likely to wonder what else is
kept and how much room it takes; the page footer offers the same sheet everywhere else.

Under the title, one line says how keeping works: the most recent session is kept until the next
one is saved, and pinning keeps a session for good. The rows then need only "Pinned" or "Not
pinned: deleted when your next session is saved." to be understood.

## What Is Deliberately Left Out

- **No figure about how the player played.** No note counts, no accuracy, no tempo reached
  shown as an achievement, nothing to compare across rows. A list of sessions is where such a
  figure would become a progress chart, and the product never grades the player.
- **No row-wide click target.** The title opens the session; the buttons act on it. A whole-row
  target would put `Delete` inside something that also opens, and a mis-tap on a tablet would do
  the wrong thing.
- **No search, sort, filter or rename.** Newest first is the order a player looks in, and the
  comment is how they tell sessions apart.
- **No way out inside the panel.** `Close review`, in the header, leaves from here as from a
  review.

## The Rows at the Edges

- **The most recent session** carries "Last session" after its date, matching the link the
  player may have come from.
- **A session saved by a newer version of the app** in another tab cannot be opened here. Its
  row stays, with its title unavailable and one line in place of the comment saying why and what
  to do: reload the page. It has no buttons: meeting it means this tab is outdated, and an
  outdated tab pins and deletes nothing of a session it cannot read. Hiding the row would tell the
  player a session they kept is gone when it is not.
- **In an outdated tab** (a newer version of the app has saved data), no row offers `Delete`: the
  tab saves and deletes nothing until it is reloaded, and the notice above the workspace asks for
  that reload. A deletion that only hid the session for this visit would show a result the device
  does not hold. `Pin` and `Unpin` stay, in memory only for the visit, as the notice says.
- **A session that fails to open** (the device refused or failed the read) says so on its row and
  can be tried again; nothing else on the page changes, and nothing is deleted.
- **A damaged session** (one the app cannot read correctly) is deleted, with an apology in the
  notice row, as the master spec rules. Opened from its row, the row leaves and focus moves on as
  after a deletion, rather than a note promising a retry that can never work. One whose summary
  is damaged never has a row: its date, length and status would all be guesses. The count behind
  `All sessions` and Your data's counts follow the rows, so the link never leads to a list with
  nothing in it.
- **Opening** takes a moment at most, and only the title pressed shows it is working: the list
  does not dim or lock.
- **No kept session:** one plain sentence says the next session will be kept here. There is no
  call to action: the way to make a session is to close this and play.
- **Saved data that cannot be used this visit:** the sentence says the kept sessions cannot be
  read in this visit, rather than claiming there are none.

## On a Phone

The phone shows the same list with the same functions. Each row's two buttons move under its
text, since a phone's width cannot hold them beside a readable title and two lines of detail;
the title keeps the full width. The `Your data` button wraps under the heading when the two do
not fit on one line.
