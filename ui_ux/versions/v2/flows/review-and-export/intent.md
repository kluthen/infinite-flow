# Review and Export Intent

> **New in v2.**

## Whose Flow This Is

This flow starts where a session ends. It serves the Fledgling Composer (P3) first, in their two
goals this version covers: looking back at the session just played (P3.C1) and taking it out to
other tools (P3.C2). It also serves the Curious Improviser (P1) and the Speed Builder (P2), who
mostly want to play again: for them the flow's job is to cost as little as possible, one key or
click to leave the review and one to start again (P1.G2, P2.S1). Personas are defined in
[`specs/personas.md`](../../../../../specs/personas.md).

This version's review is deliberately plain: every phrase that sounded, in order, as it was shown,
and an export for the generated notes; from v2.1, the notes the player played too, shown on request
and exportable on their own. Marking favourites is a later version. The review is built so that
later tools, such as replaying a phrase or using one as a starting point for new material, have an
obvious place to go without changing its shape.

## Reviewing Is a Mode, and Playing Starts Outside It

The owner's rule is that the player leaves the review before starting a new session. So the review
is a mode of the workspace: when a session ends, once its first phrase has sounded, the
**Last session** review takes the staff's place, under the same header and score toolbar, with the
musical controls still below it. No session can start while it shows, neither by a click nor by a
note. Everything else between sessions keeps working: the audio mix, the tempo and every setting
stay within reach, and a controller can still be connected, its check note included. The player
leaves the review, the staff comes back exactly as between any two sessions, and they start from
there as usual.

This removes the one real risk the review had. Looking back at a session with the instrument still
in hand, a player may well play a few notes; if one of them could start a session, it would throw
away a review they had not exported yet. While the review shows, no note starts a session.

Taking the staff's place, rather than adding a panel somewhere else on the page, follows from the
same rule: with no session to start, the staff has nothing to do while the review shows, and the
review is then the first thing under the toolbar. The controls stay below it, because the product
keeps them usable between sessions, review or not; the cost is that a long review (a half-hour
session holds well over a hundred phrases) puts them a scroll away until the player leaves it. The
audio mix, in the toolbar above, and the tempo, in the header, stay in view. A panel beside the
staff was never an option: the staff keeps the full width of the screen, and the owner wants no
side tools for now.

## Leaving and Coming Back

The way out sits exactly where the way to play again will be. While the review shows, the header's
session button, which otherwise reads `Start session` or `Stop`, reads `Close review`. It is the one
emphasised button on the page, since leaving is the next step for everyone. A player who looks for
Start finds, in its place, what they have to do first, so no extra message is needed to explain why
nothing starts. The phrase button beside it is simply unavailable, as during a session.

For a keyboard player the route is the same key twice. A session ends with focus on that button (a
player who stopped with Space is already there): Space closes the review, the workspace comes back
with focus still on the same button, now `Start session`, and Space starts the next session.

Leaving does not throw the review away. It stays until the next session starts or the page closes,
and a `Review last session` button in the row above the staff brings it back. So closing the review
by mistake loses nothing, and the only thing that ends a review is starting the next session, which
the player now does deliberately, after leaving it. The review says how long it lasts, in one line
under its title.

## What Happens When a Session Ends

The session's own ending is described in [`flows/play-session/`](../play-session/intent.md): the
audio fades, the playhead goes. From there:

- **The review shows** in the staff's place, under the header and the score toolbar.
- **The workspace gets the next phrase, out of sight.** The session's last systems are cleared from
  the staff, and the app generates a fresh phrase from the current settings, exactly as
  `Regenerate phrase` would. That phrase is what the player finds on the staff when they leave the
  review, ready to be the next session's first. A fresh phrase, rather than the last phrase played
  or the session's first phrase again, because a player who wants endless new material should not
  start every session on a phrase they have already read. By the time a player leaves the review it
  has usually long finished loading.
- **Focus is on `Close review`,** the session button's new label, as it has always been on that
  button at a session end.

## Looking Back

The review lists every phrase that sounded, in the order it sounded, each with its number and its
tempo, drawn exactly as it was on the staff: the same written pitch for the instrument the session
used, the same key signature and chord symbols, the same staff layout for the screen size (one line
per phrase on a tablet or larger, two lines of two measures on a phone). A phrase the app repeated
because it could not find a new one in time looks like any other phrase: a repeat is a detail of
how the app works, not something the player did.

Nothing the player did is judged: no lit notes, no marks, no counts. From v2.1, what they played
can be shown, behind its own switch, which starts off: a thin lane under each line of staff where
each played note is a plain bar, placed where it was played and as long as it was held, higher
for a higher note. It is drawn in one quiet colour, whether or not a note matched the written
line, and never on the staff itself, where a note played beside the expected one would read as a
mistake. The switch only appears when something was played, so a session without a controller
gives the same review as before. The reasoning is in
[`screens/last-session-review/intent.md`](../../screens/last-session-review/intent.md#the-notes-the-player-played).

The review belongs to the session it came from. Nothing changed after the session, on the staff or
in the controls, changes it; the theme is the one exception, since it changes only colours.

A long session makes a long review, and it must stay quick to scroll whatever its length. So a
phrase is drawn only as it comes near the visible part of the page, into a space already set aside
for it, so the page never jumps while the player scrolls.

## Taking It Out

The review offers an export for the generated notes: the whole session, in the format the player
picks.

- **MusicXML** is the default, because it keeps what the review shows, the notation, and opens in
  notation programs such as MuseScore.
- **MIDI** suits a music production program. Only for MIDI, the player can also include the
  backing track, off unless they ask for it.

From v2.1 a second button exports the notes the player played, the whole session as a MIDI file:
the only format that can hold playing that was never snapped to a grid. It lines up with the
generated notes' MIDI file in a music production program, phrase by phrase. It appears only when
something was played; the owner wants nothing offered that has nothing to give.

One button makes one file, as an ordinary browser download: nothing is sent anywhere and nothing is
stored. The file name says what it holds and which session it comes from, by the date and time the
session started, so the file of the notes the player played sits next to the generated one with the
same name apart from its last word. Using both buttons gives both files; no button ever gives two.
The exports are plain buttons: the page's one emphasised button stays the way out of the review.

## When the Window Has No Room

A session can end because the window became too small for the staff. The review still shows, since
the phrases were played. Its list follows the same test as the staff: while the window has no room,
the staff's own sentence about the room stands in place of the phrases, and they come back when the
window is large enough. The title, the export and `Close review` work throughout, since making a
file needs no room on screen. Leaving the review then shows the staff's notice about the room, and
focus goes to it, since it says what to do; the next phrase is generated once the window gives the
staff room, as at any idle moment.

Between those two, a window can have room for the staff but not for one particular phrase of the
review. That phrase keeps its place, number and tempo, with a short line saying it needs a wider
window. Phrases cannot be regenerated in a review: they are the record of what was played.

## On a Phone

The owner wants the phone's review kept to the minimum: the phrases and the export, nothing else.
The phone's review therefore drops the summary line (and with it the reminder of how long the
review lasts), keeps each phrase's number and tempo (the product requires them), and shows the
phrases in the phone's usual two-line layout, at the size the staff has on that phone. The export
works as everywhere, and `Close review` sits in the header as on every screen. From v2.1 the
played notes' switch and export join the same places as on a larger screen: the owner counts the
played notes among the phone's minimum.

## What This Flow Leaves for Later

- No favourites or marks (a later version).
- No lit notes, marks or comparison of any kind: the played notes, from v2.1, are shown beside the
  music, never judged against it.
- No replay, no "continue from this phrase", no selection. Whole-session tools, when they come,
  join the export in the review's header; tools for one phrase go at the end of that phrase's
  number and tempo line. On larger screens they stay inside the review: there is no side rail.
  Tools that play sound, such as a replay, find the audio mix already in view, in the toolbar
  above the review.
- No way to keep a review past the next session or a reload.
