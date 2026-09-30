# Review and Export Intent

> **New in v2.**

## Whose Flow This Is

This flow starts where a session ends. It serves the Fledgling Composer (P3) first, in their two
goals this version covers: looking back at the session just played (P3.C1) and taking it out to
other tools (P3.C2). It also serves the Curious Improviser (P1) and the Speed Builder (P2), who
mostly want to play again: for them the flow's job is to stay out of the way, with the next
session one action away (P1.G2, P2.S1). Personas are defined in
[`specs/personas.md`](../../../specs/personas.md).

Where they pull apart, the strategy's rule holds: the review appears between sessions only, never
interrupts one, and never stands between the player and the next session.

This version's review is deliberately plain: every phrase that sounded, in order, as it was shown,
and one export action for the generated notes. Marking favourites is a later version, and so is
showing the notes the player played (the next point release). The review is built so that those,
and later tools such as replaying a phrase or using one as a starting point for new material, have
an obvious place to go without changing its shape.

## Where the Review Lives

The review is not a separate place. When a session ends, the workspace stays where it was, and a
**Last session** panel appears on the same page, after the musical controls. The staff at the top
of the page already holds a fresh phrase, ready to be the next session's first.

Three other shapes were considered and set aside:

- **The review between the staff and the controls.** It would be the first thing below the staff,
  but a half-hour session holds well over a hundred phrases, and every one of them would sit
  between the player and the controls they use to set up the next session. The Curious Improviser
  is the primary persona, and their between-sessions loop (set a direction, read, regenerate) lives
  in those controls.
- **A review screen that replaces the workspace.** The next session could then only start from a
  phrase the player has not seen yet, or after a second action to go back. The starting note
  could not work at all, since it names a note on a staff that would not be on screen.
- **A side panel beside the staff.** The staff keeps the full width of the screen at every size;
  that has been the rule since the first release, and the owner wants no side tools for now.

The cost of putting the review after the controls is that it starts below the fold on most
screens. A small `Review last session` button in the row above the staff, where the session speaks,
fixes that: it appears when the review does, and takes the player straight to it.

## What Happens When a Session Ends

The session's own ending is described in [`flows/play-session/`](../play-session/intent.md): the
audio fades, the playhead goes. From there:

- **The staff gets the next phrase.** The phrase the session last played, and whatever was waiting
  after it, clear from the staff with the usual quick fade, and the app generates a fresh phrase
  from the current settings, exactly as `Regenerate phrase` would, with the ordinary loading. That
  phrase becomes the next session's phrase 1. The phrases just played are not lost: they are all in
  the review. A fresh phrase, rather than the last phrase played or the first phrase of the session
  again, because a player who wants endless new material should not start every session on a
  phrase they have already read.
- **The review appears** after the controls, and the `Review last session` button appears above
  the staff. Nothing scrolls by itself.
- **Focus stays ready for the next session.** Focus goes to the session action, which reads
  `Start session` again, as it always has at a session end. It shows as unavailable for the
  moment the new phrase takes to load, without losing focus, so a keyboard player who stopped with
  Space can start again with Space as soon as the phrase is there.

## Starting the Next Session From the Review

Starting from the review works exactly as starting from the idle workspace, because it _is_ the
idle workspace with the review added: the same `Start session` button, the same conditions (a
phrase fully on screen, nothing loading, no error showing, the staff shown), and, with a controller
connected, the same starting note, named in the row above the staff and marked on the phrase. The
phrase on the staff is phrase 1.

Starting a session discards the review, without asking, as the product always intended: the next
session's review replaces it. That has one accepted risk. A player who keeps playing after a
session, looking back at the review with the instrument still in hand, could hit the starting note
by accident and lose a review they had not exported. Stopping the next session during its count-in
does not bring it back. Taking the starting note away from the review was considered and set
aside: after the first session of a visit there is almost always a review on the page, so the
hands-free start would in practice stop working after the first session, or need an extra button
just to throw the review away. Instead, the risk is made visible. The starting-note line always
says which note starts a session, and the review itself says, in one line, that it lasts until the
next session starts or the page is closed.

## Looking Back

The review lists every phrase that sounded, in the order it sounded, each with its number and its
tempo, drawn exactly as it was on the staff: the same written pitch for the instrument the session
used, the same key signature and chord symbols, the same staff layout for the screen size (one
line per phrase on a tablet or larger, two lines of two measures on a phone). A phrase the app
repeated because it could not find a new one in time looks like any other phrase: a repeat is a
detail of how the app works, not something the player did.

Nothing the player did is shown in this version: no lit notes, no played notes, no marks. The
review is the music the session gave them, which is what P3 needs to decide what they liked. What
they played comes in the next point release, behind its own switch.

The review belongs to the session it came from. Changing a setting, switching instrument or
regenerating the phrase on the staff after the session changes nothing in the review. The theme is
the one exception, since it changes only colours.

A long session makes a long review, and it must stay quick to scroll whatever its length. So a
phrase is drawn only as it comes near the visible part of the page, into a space already set aside
for it, so the page never jumps while the player scrolls.

## Taking It Out

The review offers one export in this version, for the generated notes: the whole session, in the
format the player picks.

- **MusicXML** is the default, because it keeps what the review shows, the notation, and opens in
  notation programs such as MuseScore.
- **MIDI** suits a music production program. Only for MIDI, the player can also include the
  backing track, off unless they ask for it.

One button makes one file, as an ordinary browser download: nothing is sent anywhere and nothing is
stored. The file name says what it holds and which session it comes from, by the date and time the
session started, so a later file of the notes the player played, from the same session, will sit
next to it with the same name apart from its last word.

The export is a plain button, not the page's primary action: between sessions the primary action
stays `Start session`, the next useful step for most players, most of the time.

## When the Window Has No Room

A session can end because the window became too small for the staff. The review still opens, since
the phrases were played. The staff area then shows its usual notice about the room, and the next
phrase is generated once the window gives the staff room, as at any idle moment. The review's list
follows the same test as the staff: while there is no room, the same sentence stands in place of
its phrases, and the phrases come back when the window is large enough. Its title and export work
throughout, since making a file does not need any room on screen. Focus goes to the staff area's
notice, which says what to do.

Between those two, a window can have room for the staff but not for one particular phrase of the
review, whose notes happen to need more width than the window now gives. That phrase keeps its
place, number and tempo, with a short line saying it needs a wider window. Phrases cannot be
regenerated in a review: they are the record of what was played.

## On a Phone

The owner wants the phone's review kept to the minimum: the phrases and the export, nothing else.
The phone's review therefore drops the summary line (and with it the reminder of how long the
review lasts; the phone is the third display, used for playing rather than looking back), keeps
each phrase's number and tempo (the product requires them), and shows the phrases in the phone's usual two-line layout, at the size the
staff has on that phone. The export works as everywhere. When the played notes arrive, their switch
and their export join the same places as on a larger screen.

## What This Flow Leaves for Later

- No favourites or marks (a later version).
- No played notes, lit notes or comparison of any kind in this version.
- No replay, no "continue from this phrase", no selection. Whole-session tools, when they come,
  join the export in the review's header; tools for one phrase go at the end of that phrase's
  number and tempo line. On larger screens they stay inside the panel: there is no side rail.
- No way to keep a review past the next session or a reload, and no way to throw it away early:
  the next session replaces it, and closing the page ends it.
