# Kept Sessions Intent

> **New in v3.**

> **Changes since v3.0**
>
> - _v3.1 changed:_ a row names the preset the session started with, as it was then
>   ([The List](#the-list))
> - _v3.2 new:_ Jam sessions in the list, kept and deleted like any, and sessions kept before
>   v3.2 ([Jam Sessions](#jam-sessions))

## Whose Flow This Is

This flow is how a player gets back to the sessions the app keeps on their device. It serves the
Fledgling Composer (P3) first: looking back at a session they played days ago, not only the one
that just ended (P3.C1), and taking the phrases they liked out to other tools (P3.C2). Personas
are defined in [`specs/personas.md`](../../../specs/personas.md).

The Curious Improviser (P1) and the Speed Builder (P2) rarely come here. For them the flow's job
is to cost nothing: nothing is asked before a session, nothing appears during one, and the two
ways in are small links that show only when there is something to reach. What they gain is quiet:
the last session survives a reload, so closing the laptop lid by mistake loses nothing.

What happens inside one session's review (favorites, the comment, the export, the played notes)
is in [`flows/review-and-export/`](../review-and-export/intent.md). This flow covers the way in,
the list of every kept session, opening one, and pinning, unpinning and deleting from the list.

## Kept Sessions Live Inside the Review

The review already is a mode of the workspace: it takes the staff's place, no session starts
while it shows, the header's session button reads `Close review`, and the audio mix, tempo and
settings stay within reach. The list of kept sessions is a second level of that same mode, drawn
in the same place. A session's review and the list switch with one press each, and `Close review`
leaves the whole mode from either level, back to the staff.

This keeps the product to one rule the player already knows: when you are looking back, you are
not playing, and the button where `Start session` usually sits takes you back. Three other shapes
were rejected:

- **A page of its own** would add a top-level place for something two of the three personas
  rarely visit, and a second way in and out of "not playing" with its own rules to learn.
- **A side rail** would take width from the staff, which keeps the full width of the screen in
  every state.
- **A sheet holding the list** would put a list that can grow without limit inside a dialog,
  where it scrolls badly; and the review a row opens is not a dialog, so the player would jump
  between two kinds of place.

## Two Ways In

Two links sit at the end of the row above the staff, at idle only:

- `Review last session` opens the most recent session's review in one press, as it did in v2.
  It now also works after a reload, since that session is kept. It is shown whenever the most
  recent session can be reviewed: kept, or held in memory only because its save failed.
- `All sessions` opens the list. It is shown whenever at least one session is kept.

One `Sessions` link opening the list was considered and rejected: it would cost the player who
just wants the last session, by far the common case, a second press, and turn v2's one-press way
back into two. The header was rejected too: its widths are fixed and already full.

On a phone the first link reads `Last session`, so the row still holds the starting-note line
and both links on one line. The second keeps its label, `All sessions`, which is also the list's
title and the review's way back to it: one name for one place, everywhere.

The links are part of the idle workspace and nothing else. They go when a session starts, and
nothing about kept sessions ever appears during one.

## The List

**[v3.1 changed]** The list answers one question: which session is this? Newest first, each row
gives what a player remembers a session by: when it was played (the row's title, which opens it),
how long it lasted, how many phrases, which instrument and which preset it started with, whether
it is pinned, how many favorites it holds, and the first words of its comment. The most recent
session's row says "Last session" beside its date, so the player can match it with the link they
came from. The preset is written as it was at the session's start and never rewritten: a preset
renamed or deleted since still shows under its old name on the sessions played with it, which is
what those sessions were.

No row shows anything about how the player played: no count of notes, no accuracy, no figure to
compare from one session to the next. A list of sessions is exactly the place where such a figure
would turn into a progress chart, and the product never grades the player.

One field goes beyond the list the product requires: "Played notes kept", when a session holds
the player's own played notes. Those are the most private thing the app keeps, and they are kept
only when the player switched on "Keep my played notes". Saying so on the row makes them visible
in the place where they can be deleted with their session, rather than only inside the review.

A one-line introduction under the title says how keeping works: the most recent session is kept
until the next session is saved, and pinning a session keeps it for good. It is the one place
that explains the rule in full, so the rows can stay short.

The list's header also holds a `Your data` button, which opens the sheet that lists everything
the app keeps ([`flows/saved-data/`](../saved-data/intent.md)). A player looking at their kept
sessions is the player most likely to wonder what else is kept.

Rows are not clickable as a whole. The title is the one way to open a session, and the row's own
buttons sit beside it, so a press on `Delete` can never be mistaken for a press on the row.

## Opening a Session, and Coming Back

Pressing a row's title opens that session's review in the same place, its title focused, so a
keyboard or screen-reader player lands at the top of what they asked for. Reading a session from
the device takes a moment at most; while it does, only the title button shows it is working.

The review's first row holds an `All sessions` button. It goes back to the list with focus on the
title of the session the player just left, so moving through several sessions one after another
never means finding one's place again. Reached from the link above the staff, the list instead
focuses its own title, the top of the place.

`Close review` leaves from either level, exactly as it leaves the review of the session just
played, and the workspace comes back as between any two sessions.

## What Is Kept, and for How Long

The rule is the product's: the most recent session is kept by itself, and a pinned session is
kept until the player unpins or deletes it. When the next session is saved, every session that is
not pinned is deleted, not only the previous most recent one. The product says only one session
is ever kept without the player asking; an older session the player unpinned is one they chose
not to keep, so it goes with the rest. The rows and the review say this in words ("Not pinned:
deleted when your next session is saved."), so nothing disappears by surprise.

Starting a session never asks anything, however many unpinned sessions it will replace. An "are
you sure?" before Start would tax every session for the rare one worth keeping, and a player
reading from a music stand with an instrument in hand should never meet a dialog there. Nothing
the player marked can be lost by playing on: marking a favorite pins its session.

Pinning is two buttons, `Pin` and `Unpin`, rather than an on/off switch: each names what happens
when pressed, and the state is written beside it in words. Pinning never asks. Unpinning asks only
when the session holds favorites, since those would then be deleted with it at the next save;
without favorites it does not ask, because the session still stays until the next session is
saved and its row says so. Removing a session's last favorite never unpins it: un-marking a
phrase should not quietly schedule a deletion.

## Deleting

A session can be deleted from its row or from its review. Either way, one short confirmation
asks first, naming what goes with the session (its favorites, its comment, its played notes) and
saying it cannot be undone. Focus starts on `Cancel`, never on the deleting action, so an Enter
pressed out of habit deletes nothing.

After deleting from a row, focus moves to the next row's title, or the previous row's when the
last row went, so a player clearing several sessions keeps their place. After deleting from a
review, the list shows, since the review has nothing left to show; when that was the last kept
session, the list shows its empty state. Deleting the session that just ended also removes it
from memory, and `Review last session` goes with it: deleted means gone. A visit that saves
nothing offers no deletion here (see At the Edges).

## Jam Sessions

**[v3.2 new]** A Jam is kept like any session, by the same rule: once its first phrase has
sounded, it is saved at its end, kept as the most recent session, and kept for good when pinned or
when the player marks a favorite. Its row says "Jam" at the start of its detail line, so the
sessions that began with the player's own idea are easy to find. A Jam that ends before its first
phrase sounds keeps nothing and replaces nothing, as a session stopped during its count-in: there
is no music to keep.

**[v3.2 new]** A kept Jam session holds its doodle as the app wrote it, without the player having
to switch anything on: it is part of the music, the idea the phrases continue. The notes as the
player actually played them are played notes, kept only with "Keep my played notes" on. Deleting a
Jam session deletes both. Deleting its played notes, from its review or from Your data, deletes
the notes as played and keeps the written-out doodle, so the review still opens with the idea.

**[v3.2 new]** Sessions kept before v3.2 have no doodle; they open exactly as before. A Jam
session written by a newer version of the app is listed and cannot be opened, as any such session.

## At the Edges

- **No kept session.** The list says the next session will be kept there. It is reached only
  from a review whose session was just deleted, or after deleting every session, since the
  `All sessions` link is not shown when nothing is kept.
- **A session this version cannot read,** saved by a newer version of the app open in another
  tab: its row stays listed, says why it cannot be opened and what to do (reload). It cannot be
  deleted or pinned from here: meeting it means this tab is outdated (below). Hiding it would
  tell the player a session they kept is gone when it is not.
- **An outdated tab.** When a newer version of the app has saved data, this tab saves and deletes
  nothing until it is reloaded, so it offers no deletion at all: no `Delete` on a row, no
  `Delete session` or `Delete played notes` in a review, and turning `Keep my played notes` off
  asks nothing, since there is nothing this tab may delete. The data now belongs to the newer
  version; deleting from a tab that cannot read all of it would destroy what that version saved,
  and a deletion that only hid a session for this visit would show the player a result the device
  does not hold, the session coming back at the next reload. The notice above the workspace asks
  for the reload, and after it every deletion is offered again. Pinning, favorites and the
  comment still respond, in memory only for this visit, as the notice says.
- **A session whose save failed.** It stays in memory, reachable from `Review last session`, and
  its review says it is not saved. It is not in the list, which shows what the device keeps.
- **A session that fails to open.** Its row says so in one line, and the title stays available to
  try again; nothing else on the page changes.
- **Saved data that cannot be used this visit.** Nothing kept can be shown, so the link to the
  list is not shown, and the list, if reached from a review, says the kept sessions cannot be
  read in this visit rather than claiming there are none. Such a visit saves nothing, and, like
  an outdated tab, offers no deletion in a review: the session that ended in it is held in
  memory, and its review has neither `Delete session` nor `Delete played notes`, while turning
  `Keep my played notes` off asks nothing. One rule for every visit that saves nothing, so no
  deletion looks permanent while nothing is kept. The way out when a reload does not help is
  `Delete everything`, in Your data, the one deletion such a visit offers
  ([`flows/saved-data/`](../saved-data/intent.md)).

## On a Phone

The phone gets the whole flow, as the plain baseline of the review's functions: both links, the
list, opening, pinning, unpinning and deleting. Each row's two buttons drop under its text, since
a phone's width cannot hold both side by side with a readable title. Nothing is added for the
phone and nothing it needs is removed.

## What This Flow Leaves for Later

- No search, sort or filter: the list is newest first, and the comment is how a player tells
  sessions apart.
- No renaming: the date and time name a session; the comment carries anything else.
- No backup file to move kept sessions to another browser: a later candidate, not this version.
- No figure about how the player played, in the list or anywhere: a permanent rule, not a
  postponement.
