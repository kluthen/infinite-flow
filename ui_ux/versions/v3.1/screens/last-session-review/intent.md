# Last Session Review Intent

> **Changes since v2**
>
> - _Changed:_ the screen reviews the session just ended or any kept one, opened three ways
>   ([What This Screen Is](#what-this-screen-is))
> - _Changed:_ the header holds more, the phrases stay the point ([Focal Point](#focal-point))
> - _New:_ the title, the keep line and the session's own tools
>   ([The Header: Which Session, and How It Is Kept](#the-header-which-session-and-how-it-is-kept))
> - _New:_ favorites ([Favorites](#favorites)) and the comment ([The Comment](#the-comment))
> - _Changed:_ the per-phrase tools and the way out, and no figure in the summary
>   ([What Is Deliberately Left Out](#what-is-deliberately-left-out))
> - _New:_ the export scope and the very short notes; _Changed:_ the format is remembered
>   ([The Export](#the-export))
> - _New:_ keeping and deleting the played notes, very short notes left out of the lane;
>   _Changed:_ the switch is remembered ([The Notes the Player Played](#the-notes-the-player-played))
> - _Changed:_ the phone gets every function ([On a Phone](#on-a-phone))
> - _Removed:_ "No way to keep or discard it by hand" (v2 in the
>   [frozen copy](../../../v2/screens/last-session-review/intent.md#what-is-deliberately-left-out))
> - _Removed:_ the phone's review as "the phrases and the export, nothing else" (v2 in the
>   [frozen copy](../../../v2/screens/last-session-review/intent.md#on-a-phone))
> - _v3.1 changed:_ the summary names the preset the session started with
>   ([The Header: Which Session, and How It Is Kept](#the-header-which-session-and-how-it-is-kept),
>   [What Is Deliberately Left Out](#what-is-deliberately-left-out))

## What This Screen Is

**[v3 changed]** The review is a mode of the workspace page, not a page of its own. It shows one
session: the session that just ended, or any session the app keeps on the device. It opens in
three ways: at a session's end, once the session's first phrase has sounded; from
`Review last session` above the staff, for the most recent session, after a reload too; and from
a row of the session list. It takes the staff's place, under the same header and score toolbar,
with the controls still below it, and no session can start while it shows: the header's session
button reads `Close review` instead of `Start session`. Leaving it brings the staff back as between
any two sessions. The reasoning for that shape, and for what happens around it at a session end,
is in [`flows/review-and-export/intent.md`](../../flows/review-and-export/intent.md); the list it
shares the mode with is [`screens/session-list/`](../session-list/intent.md).

**[v3 changed]** The screen keeps its v2 name, **Last session** review, which is still its title
for the most recent session, the one most players open. It now covers every kept session too.

It is written first for the Fledgling Composer (P3), who wants to look back at a session (P3.C1)
and take it out to other tools (P3.C2). Personas are defined in
[`specs/personas.md`](../../../../../specs/personas.md). For the Curious Improviser (P1) and the Speed
Builder (P2), who mostly want to play again, its job is to cost them one key or click on
the way out.

## Focal Point

**[v3 changed]** The phrases are the point. The panel opens with a header that says which session
this is and holds what acts on the whole session (pinning, deleting, the comment, the export),
then gives the rest of its space to the phrases, one after another, drawn exactly as they were on
the staff. The header grew with v3.0, so it is kept in a strict order, read top to bottom: the
way back to the list, which session and how it is kept, the player's own comment, what to take
out, what to show. The export still sits in the header rather than at the bottom, because after a
long session the bottom is far away, and taking the session out is the one thing most people who
open the review came to do.

Each phrase carries only what the product asks of it: its number and its tempo, on one quiet line
above it. The number matters because the export marks phrases with the same numbers, so "phrase 12
was the one" means the same thing in the review and in a notation program. Without the rising
tempo (v2.2) the tempo is the same for every phrase; it is shown anyway, so the line keeps one
shape, and with it each phrase's line records the tempo it actually played at, the last one being
the tempo the session reached.

A phrase the app repeated, because it could not find a new one in time, is shown and numbered like
any other: it is what the player heard and read, and the reason behind it is the app's business.

## The Header: Which Session, and How It Is Kept

**[v3 new]** At the very top, an `All sessions` button leads to the list of kept sessions. It
comes first because it is navigation, not a tool: it is where a player who opened this session
from the list goes back, and where a player who came from the end of a session finds the others.

**[v3.1 changed]** The title says which session this is: "Last session" for the most recent one, the
words the player knows from the link above the staff, and otherwise the date and time it was
played, the same words its row in the list shows. Under it, one quiet line gives the date and
time (when the title does not), the length, the number of phrases, the instrument, the preset the
session started with and the number of favorites: what the player needs to recognise it, and no
figure about how they played. The preset is written as it was at the start ("Bebop", or "Custom,
based on Bebop"), and stays so: renaming or deleting that preset later does not rewrite a record
of what was played.

**[v3 new]** A second quiet line says how the session is kept, in words: "Pinned: kept until you
unpin or delete it.", or "Not pinned: deleted when your next session is saved." This replaces
v2's reminder that the review lasted only until the next session; the risk is the same (a player
assuming a session is kept when it is not) and the answer is the same: say it plainly. When the
session's own save failed, this line is where the player learns it ("Not saved on this device:
export it to keep it."), since they are already looking at the review; no other message is shown,
except the storage-full notice when storage is full, since freeing space is something this line
cannot offer.

**[v3 new]** At the end of the title's row, `Pin` (or `Unpin`) and `Delete session`. They act on
the whole session, so they sit with its title, not with the export. They are two plain buttons
with words, not a switch and an icon: each names what happens when pressed. Deleting asks first;
pinning never does; unpinning asks only when favorites would go with the session.

**[v3 new]** In a visit that saves nothing, `Delete session` is not there, and neither is
`Delete played notes`. That is a tab a newer version of the app has outdated, which deletes
nothing until it is reloaded, and a visit that started from the defaults because the saved data
couldn't be read, whose review shows the session held in memory. The notice above the workspace
says why in both. A missing button is honest; a deletion that only hid the session for this visit
would come back at the next reload, and one that removed a session held in memory only would
look permanent while nothing is kept. One rule for both visits keeps the review the same in each.

## What Is Deliberately Left Out

- **No judgement of how the player played.** No lit notes, no counts, no marks. The review shows
  the music the session gave; from v2.1, the notes the player played can be shown under it, behind
  their own switch (see The Notes the Player Played), and even then nothing is ever marked as
  missed, or as matched.
- **[v3.1 changed]** **No figure in the summary.** The summary describes the session (when, how
  long, which instrument and preset, how many favorites), never the player's playing: no note
  count, no accuracy, no tempo reached presented as a result.
- **[v3 changed]** **One per-phrase tool, no more.** The favorite star is the first tool at the end
  of each phrase's number-and-tempo line, the place the review kept for per-phrase tools.
  Replaying a phrase, or using one as the starting point for new material, may come later and
  joins it there; whole-session tools sit beside the export and the pin and delete buttons. On
  larger screens they stay inside the panel: there is no side rail, so the phrases keep the full
  width, as the staff does.
- **[v3 changed]** **No way out inside the panel.** `Close review` lives in the header, in the slot
  where `Start session` will be once the player has left; a second close button in the panel would
  be one more thing on a screen the owner wants plain. `All sessions` is not a way out: it moves
  within the review mode, to the list.

## Favorites

**[v3 new]** A favorite marks a whole phrase. The star at the end of each phrase's line is a button
that stays pressed: an outline star when the phrase is not a favorite, a filled one in the accent
colour when it is, so the shape alone tells the state and colour is never the only sign. On a
tablet or larger the word "Favorite" sits beside the star; on a phone the star stands alone, with
the same target size, and its accessible name always says which phrase it marks.

**[v3 new]** The first favorite pins the session. Nothing announces it: the keep line and the pin
button change beside the title, which is enough for a player who looks, and costs nothing to one
who does not. Removing the last favorite leaves the session pinned: un-marking a phrase should
never quietly schedule a deletion.

**[v3 new]** The star never shows disabled. The review only ever shows between sessions, and the
change applies at once; if it cannot be saved, the workspace says so in its notice row once the
player is back, and the favorite holds for the visit.

## The Comment

**[v3 new]** A comment is the player's own words about a session. It sits right under the title
row, before the export, because it describes the session the title names. Without one, it is a
single `Add a comment` button, so a player who never writes comments sees one quiet button and
nothing else. With one, the whole comment shows, never cut, followed by `Edit comment`.

**[v3 new]** Editing opens a multi-line field with a count of the characters used out of 500.
The limit is the field's own: typing simply stops at 500 and a longer paste is cut, so there is
no error state to design or read. `Done` closes the field, and leaving the field or the review
keeps what was written too, so nothing is lost to a forgotten button. The comment is never
written into an exported file: it is a note for the player, not part of the music.

## The Export

**[v3 new]** The export row opens with its scope: `Whole session` or `Favorites only`. It comes
first because it governs both exports after it. It starts at `Whole session` every time a review
opens and is not remembered, since a remembered `Favorites only` would quietly export part of the
next session. Without a favorite, `Favorites only` is shown unavailable with the reason beside it
("No favorites in this session yet."), which also tells a new player that favorites exist.

**[v3 changed]** The generated-notes export is one group: a choice of format, the backing option when it applies,
and one button. The format is a two-option switch rather than two buttons, because the product's
rule is one action per kind of content: the generated notes are one kind, in either format, and
the played notes are the other, with their own button beside this one. MusicXML comes first and
is the default, because it keeps what the review shows, the notation. The backing track only
exists in the MIDI file, so its switch appears only while MIDI is chosen, rather than sitting
there disabled with an explanation beside it.

**[v3 changed]** The format and the backing choice are remembered, after a reload too: a player
who always exports MIDI with the backing sets it once.

The button is not the page's primary action. While the review shows, that emphasis belongs to
`Close review` in the header, the next step for every player; a second primary button further
down would compete with it.

Making the file takes a moment at most. The button shows it is working, the browser's own download
confirms the result, and the app adds no message of its own when it works. If making the file ever
fails, a plain message says so under the export and the button tries again.

**[v3 changed]** `Export played notes` follows the generated-notes group in the same row, a little further apart,
so the format and backing choices read as belonging to the generated notes only. Played notes
come out as MIDI only, since playing that was never snapped to a grid cannot be written as
notation without misplacing it. It makes one file named like the generated one, ending in
`-played`, so a session's files sit side by side; using both buttons gives both files. It is a
plain button too, and it behaves like the other one, the same failure message serving both. When
nothing was played during the session, which is always the case without a controller, there is
nothing to export, and the button is simply not there, nor the switch below: the review then
looks exactly as it did before played notes existed.

**[v3 new]** Just before that button, `Include very short notes` puts back into the file the
in-between notes some controllers send while the fingers move, which the app leaves out by
default. It is a toggle in the played-notes group because it changes that file only; it is off at
first and holds while the page is open, without being remembered, because it is a choice for one
export rather than a preference. Under `Favorites only`, when no favorite phrase holds a played
note, `Export played notes` is shown unavailable with the reason beside it. The same holds
whenever the file would hold no note: when every note the player played is very short and the
option is off, the reason names `Include very short notes`, the toggle just before the button, so
the cure sits beside the explanation. Hiding the group would hide that cure, and an empty file
gives the player nothing. The lane then shows no bar, as under a phrase in which nothing was
played, and needs nothing more: its lack of a switch is the master spec's choice, and the export's
reason already says what was left out.

## The Notes the Player Played

**[v3 changed]** A `Played notes` switch sits in its own row under the title and the export, just
above the phrases it changes. It is off until the player turns it on, so the review starts as the
plain record of the music, and the choice is remembered, after a reload too, like the format. It
is written for the Fledgling Composer looking back at "what they played" (P3.C1), and it must stay
an appreciation of having played along, never a score.

**[v3 new]** Beside it, `Keep my played notes` decides whether the player's own notes are kept on
the device with their sessions. It starts off, because those notes are the most private thing the
app holds. It sits here, as well as in `Your data`, because this is where the player sees their
notes and can judge whether they want them kept; switching it on while looking at the session that
just ended keeps that session's notes too. Switching it off asks whether to delete the notes
already kept, and never deletes without asking. In a visit that saves nothing it switches for
the visit only and asks nothing, since such a visit offers no deletion here.

**[v3 new]** When this session's played notes are kept, `Delete played notes` follows in the same
row. After a confirmation, the lane, both switches' row and the played-notes export leave the
review together, and the session, its favorites and its comment stay. After a reload, a session
whose played notes were not kept has none: the row, the lane and the played-notes export are
simply not there.

When it is on, each phrase gets a thin strip under its staff, and under each of its two lines on
a phone: a lane where every note the player played in that phrase is a short bar. A bar starts
where the note was played and lasts as long as it was held; a higher note sits higher in the
lane. The lane spans the same measures as the staff above it, with faint lines at the barlines,
so the player can see which measure a note fell in. Time in the lane follows the written notes
above: a note played right on a written note's beat starts right under that note, and between two
written notes time runs evenly; a note played in a measure always sits between that measure's lines. A
lane on a strict, even grid would be truer to the clock, but the staff does not space its notes
evenly, so a note played exactly in time would sit beside its written note, and a beginner would
read that gap as being early or late. The lane borrows the bar picture of a music program's piano
roll (a strip of bars, one per note played), bent to follow the staff's spacing, and that picture
is the honest one here: the notes were played freely, not on a grid, so they cannot be written as
notation without moving them, and drawing them on the staff, next to
the notes that were expected, would turn every difference into a visible mistake. The lane keeps
the two apart: the music the app wrote above, what the player did with it below.

Every bar has the same quiet colour. No note is coloured, marked or labelled, whether or not it
matched the written line: the product allows showing which notes matched, but on a page the player
studies at leisure, lit and unlit notes would read as a tally, which is exactly what the product
refuses. A phrase in which nothing was played simply has an empty lane. The vertical scale is the
same for every phrase of the session, from its lowest played note to its highest, so a melody's
shape can be compared from one phrase to the next.

**[v3 new]** The lane leaves out the very short in-between notes, always, with no switch of its
own: they are not what the player meant to play, and slivers between every pair of notes would
read as clumsy playing that never happened. The notes are kept exactly as received, so the
export's option can still put them back.

Switching the lanes on or off changes the height of every phrase at once. The phrase the player
was looking at stays where it was on screen; the rest of the list grows or shrinks around it. A
lane's space is set aside with its phrase's, so drawing the phrases as they come near the screen
still never moves the page.

## A Long Review

A half-hour session holds more than a hundred phrases, and there is no limit on length. The list
must stay quick to scroll however long it is, so a phrase is drawn only when it comes near the
visible part of the page. Every phrase's space is set aside before it is drawn, at the size a
staff system has on that screen, so the page never jumps and the scrollbar tells the truth about
the review's length. Phrases appear with no fade: a fade on something scrolling into view is
decoration, and a player scrolling quickly would see phrases flicker in.

## When the Window Is Too Small

The review draws its phrases with the same rules as the staff whose place it takes, at the same readable
minimum size. So when the window has no room for the staff at all, it has none for the review's
phrases either, and the list gives way to the same sentence the staff area would show, until the
window is large enough. The title, the export and `Close review` stay, since making a file needs no room on screen. When
the window has room but one phrase's notes need more width than it now gives, that phrase alone
shows a short line in its place, keeping its number and tempo: a review is a record, so a phrase
that does not fit cannot be replaced by another.

## On a Phone

**[v3 changed]** The phone keeps every function the review has, as their plain baseline, and
nothing more: the way to the list, the title, pinning and deleting, the comment, the export with
its scope and both exports, the played notes and their switches, and the phrases with their
favorite stars. It carries the least information that space allows: it drops the summary line and
the keep line (the pin button's own label already says whether the session is pinned), except
when the session could not be saved: the pin button cannot say that, and a phone player who is
never told would lose the session on closing the page, so the line stays in that one form. Each
star stands without its word. The header stacks, each row wrapping onto as many lines as it
needs, and the phrases keep the phone's two-line layout, at the size the staff has on that phone,
each still with its number and tempo. Each of a phrase's two lines gets its own lane.
