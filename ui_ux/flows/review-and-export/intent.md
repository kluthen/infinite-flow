# Review and Export Intent

> **Changes since v2**
>
> - _Changed:_ the flow covers the review of the session just ended or of any kept one, and
>   serves the Fledgling Composer's two goals in full ([Whose Flow This Is](#whose-flow-this-is))
> - _New:_ the list of kept sessions as the review mode's second level, and the review's other
>   ways in
>   ([Reviewing Is a Mode, and Playing Starts Outside It](#reviewing-is-a-mode-and-playing-starts-outside-it))
> - _Changed:_ leaving keeps the review across a reload, by the rules of kept sessions, and a
>   keep line says how it is kept ([Leaving and Coming Back](#leaving-and-coming-back))
> - _New:_ the session is saved once, as its review opens
>   ([What Happens When a Session Ends](#what-happens-when-a-session-ends))
> - _New:_ the very short notes left out of the lane ([Looking Back](#looking-back))
> - _Changed:_ a kept session drawn from the music it kept, and what the player adds to it
>   ([Looking Back](#looking-back))
> - _New:_ favorites ([Marking Favorites](#marking-favorites)), the comment
>   ([A Comment on the Session](#a-comment-on-the-session)), pinning and deleting
>   ([Keeping It or Deleting It](#keeping-it-or-deleting-it)), keeping and deleting the played
>   notes ([The Player's Own Notes, Kept on Request](#the-players-own-notes-kept-on-request))
> - _New:_ the export scope, the very short notes in the played-notes file, and what is kept and
>   what is never sent ([Taking It Out](#taking-it-out))
> - _Changed:_ both exports follow the scope, the export's choices are saved, and a
>   favorites-only file says so in its name ([Taking It Out](#taking-it-out))
> - _Changed:_ the phone gets every function of the review ([On a Phone](#on-a-phone))
> - _Changed:_ what this flow leaves for later
>   ([What This Flow Leaves for Later](#what-this-flow-leaves-for-later))
> - _Removed:_ the review lasting only until the next session starts or the page closes (v2 in
>   the [frozen copy](../../versions/v2/flows/review-and-export/intent.md#leaving-and-coming-back))
> - _Removed:_ "nothing is stored" about the export (v2 in the
>   [frozen copy](../../versions/v2/flows/review-and-export/intent.md#taking-it-out))
> - _Removed:_ the phone's review as "the phrases and the export, nothing else" (v2 in the
>   [frozen copy](../../versions/v2/flows/review-and-export/intent.md#on-a-phone))
> - _Removed:_ "No favourites or marks" and "No way to keep a review past the next session or a
>   reload" from what is left for later (v2 in the
>   [frozen copy](../../versions/v2/flows/review-and-export/intent.md#what-this-flow-leaves-for-later))
> - _v3.1 new:_ the preset a session started with, kept as it was
>   ([What Happens When a Session Ends](#what-happens-when-a-session-ends))
> - _v3.2 new:_ the flow serves the Fledgling Composer's idea grown by a Jam
>   ([Whose Flow This Is](#whose-flow-this-is))
> - _v3.2 new:_ a Jam that ends before phrase 1 sounds has no review
>   ([What Happens When a Session Ends](#what-happens-when-a-session-ends))
> - _v3.2 new:_ a Jam's review opens with the doodle, the key and mode suggestion, and jamming
>   again on the same doodle ([A Jam's Review](#a-jams-review))
> - _v3.2 new:_ the doodle in the exports, and its two forms
>   ([Taking It Out](#taking-it-out))

## Whose Flow This Is

**[v3 changed]** This flow starts where a session ends, and wherever a kept session is opened
again. It serves the Fledgling Composer (P3) first, in both goals this version covers in full:
looking back at a session, the one just played or any one they kept, and marking the phrases they
liked (P3.C1), and taking the whole session or only those phrases out to other tools (P3.C2). It
also serves the Curious Improviser (P1) and the Speed Builder (P2), who mostly want to play again:
for them the flow's job is to cost as little as possible, one key or click to leave the review
and one to start again (P1.G2, P2.S1). Personas are defined in
[`specs/personas.md`](../../../specs/personas.md).

**[v3.2 new]** With Jam, it also serves the Fledgling Composer's third goal, growing an idea
(P3.C3): the review of a Jam shows the doodle the player played and what the app grew from it,
can suggest the key and mode the doodle sounds in, and lets the player go round again on the same
doodle without playing it again.

**[v3 changed]** The review stays plain: every phrase that sounded, in order, as it was shown,
an export for the generated notes and, on request, the notes the player played. What v3.0 adds
is what a player needs to come back to a session: a star to mark a phrase as a favorite, a
comment, pinning to keep the session and deleting it. Each sits where the review kept room for
it: per-phrase tools at the end of the phrase's number-and-tempo line, whole-session tools in
the header beside the export. Later tools, such as replaying a phrase or using one as a starting
point for new material, still have an obvious place to go without changing the review's shape.

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

**[v3 new]** The mode now has a second level, the list of every session kept on the device,
titled **All sessions**, drawn in the same place. A button at the top of every review goes to
the list, and a row of the list opens its session's review; `Close review` leaves the mode from
either. So a review opens in three ways: at a session's end, from `Review last session` above the
staff (the most recent session, after a reload too), and from a row of the list. Its title is
"Last session" for the most recent session and the session's date and time for any other, so the
player always knows which one they are looking at. The list, the links that lead to it, and the
reasoning for keeping both inside one mode are in
[`flows/kept-sessions/`](../kept-sessions/intent.md).

## Leaving and Coming Back

The way out sits exactly where the way to play again will be. While the review shows, the header's
session button, which otherwise reads `Start session` or `Stop`, reads `Close review`. It is the one
emphasised button on the page, since leaving is the next step for everyone. A player who looks for
Start finds, in its place, what they have to do first, so no extra message is needed to explain why
nothing starts. The phrase button beside it is simply unavailable, as during a session.

For a keyboard player the route is the same key twice. A session ends with focus on that button (a
player who stopped with Space is already there): Space closes the review, the workspace comes back
with focus still on the same button, now `Start session`, and Space starts the next session.

**[v3 changed]** Leaving does not throw the review away. The session is kept on the device, so it
survives a reload as well as a closed review, and `Review last session`, in the row above the
staff, brings it back in one press. What ends it is the next session: when that one is saved, the
previous session is deleted unless the player pinned it, and a pinned session stays until they
unpin or delete it. Starting that next session still asks nothing. So closing the review by
mistake, or reloading the page, loses nothing, and the review says how it is kept, in one line
under its title: pinned, or deleted when the next session is saved.

## What Happens When a Session Ends

The session's own ending is described in [`flows/play-session/`](../play-session/intent.md): the
audio fades, the playhead goes. From there:

- **[v3 new]** **The session is saved, once.** As its review opens, the session is written to the
  device: its phrases as they were shown, what identifies it, and the notes the player played only
  when they have switched on "Keep my played notes". Nothing is written during a session, so
  saving can never disturb one, and nothing says the save worked: a "saved" message after every
  session would be noise. If it fails, the session stays in memory and its review says, in its
  keep line, that it is not saved on this device and should be exported to be kept: the player
  is already looking at the review, so that is where they learn it.
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

**[v3.1 new]** Among what identifies a session, the save records the preset it started with, as
the controls named it then: "Bebop", or "Custom, based on Bebop". It is a snapshot. Renaming or
deleting the preset later leaves it as it was, because the session is a record of what was
played, and a label that changed under it would describe a setup the player never used.

**[v3.2 new]** A Jam that ends before its first phrase sounds (the player never played a doodle,
stopped, lost the controller, or the app could not write phrase 1) has nothing to review: like a
session stopped during its count-in, it opens no review and changes nothing kept. Once phrase 1
has sounded, a Jam ends and is saved like any session, its doodle with it.

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

**[v3 new]** Some controllers send very short in-between notes while the fingers move, notes a
real instrument would swallow. The lane always leaves them out, with no switch: they are not what
the player meant to play, and a lane full of slivers would read as clumsy playing that never
happened. The notes themselves are kept exactly as received, so nothing is lost.

**[v3 changed]** The music in the review belongs to the session it came from. Nothing changed
after the session, on the staff or in the controls, changes it, and a kept session is drawn from
the music it kept, even if the player has changed their instrument's name or clef since: each
phrase is drawn in the clef it was played in, given the room it needs. A change to my
instrument's range or transposition, or deleting it, erases its sessions instead, after a
warning, so a kept session's review never shows music its instrument can no longer play. The theme is the one
exception, since it changes only colours. What the player adds to it (favorites, a comment,
whether it is pinned) is theirs, and they can change it every time they open it.

A long session makes a long review, and it must stay quick to scroll whatever its length. So a
phrase is drawn only as it comes near the visible part of the page, into a space already set aside
for it, so the page never jumps while the player scrolls.

## A Jam's Review

**[v3.2 new]** A Jam begins with the player's own doodle, and its review begins there too: a
section before phrase 1, the doodle written out as the app heard it, with the tempo it was played
at. It reads like a phrase, without what makes a phrase the app's: no number, no chords, no
favorite star. Then come the phrases that continued it, so the review reads in the order the
session sounded, idea first. The reasoning for the section's look is in
[`screens/last-session-review/intent.md`](../../screens/last-session-review/intent.md#the-doodle).

**[v3.2 new]** The written-out doodle is the doodle as the app used it, snapped to the beat grid,
one line. The notes as the player actually played them stay what they always were, played notes:
behind the `Played notes` switch, in a lane under the doodle, kept only if the player asked. A Jam
played again on a held doodle shows that doodle too, but its lane is empty: the notes that made
it were played in an earlier session and belong to it.

**[v3.2 new]** **The suggestion waits for the review.** A running session never asks anything,
so the key and mode the doodle sounds in is offered only once the Jam is over, under the doodle.
The player either uses it, which sets the key and mode exactly as choosing them in the controls
would, or keeps their own, which declines it for good: the same doodle always gives the same
answer, so asking again would only nag, and the decline is kept with the session. The Jam that
produced the doodle always continued in the player's own key and mode; the suggestion serves the
next Jam. A kept Jam's review works it out again against the player's current key and mode, so
it is offered only while it would change something. When the doodle uses notes the app's keys and
modes do not have, the review says so once, plainly, naming no note.

**[v3.2 new]** **Jamming again.** `Jam again on this doodle` leaves the review for the staff with
the doodle held, its first phrase already written from it, ready to start; Jam turns on if it was
off. It sits on the doodle's own line, where per-phrase tools go, and needs a controller, like
every Jam. A player can go round as many times as they like, perhaps after using the suggestion,
without ever playing the idea again. What the staff then shows is in
`flows/jam/`.

## Marking Favorites

**[v3 new]** A favorite is a whole phrase. Each phrase's number-and-tempo line ends with a star:
pressed, the phrase is a favorite; pressed again, it is not. A whole phrase, because marking a
range of measures is left for a later version, and because a phrase is what the export's phrase
numbers already name. The star changes shape as well as colour, outline to filled, so colour is
never the only sign.

**[v3 new]** Marking a favorite pins its session, in place and with no message: the keep line
and the pin button change beside the title. That is what lets starting the next session ask
nothing: a phrase the player marked can never be lost by playing on. The reverse does not hold:
removing a session's last favorite leaves the session pinned, since un-marking a phrase should
never quietly schedule a deletion. The player unpins by hand.

## A Comment on the Session

**[v3 new]** A session can carry one comment, a few lines of the player's own words: what they
were working on, what to try next. It sits under the title, collapsed to an `Add a comment`
button when there is none, so a review the player never annotates looks as plain as before. Once
written it shows in full, with `Edit comment` beside it, and its first words appear on the
session's row in the list, which is how a player tells sessions apart.

**[v3 new]** Editing shows a text field with a count of the characters used out of 500, the
product's limit. The field simply stops at 500, so there is never an error to read. The comment
is kept when the player presses `Done`, leaves the field, or leaves the review, so nothing
written is lost by forgetting a button. It is the player's private note: it is never written
into an exported file.

## Keeping It or Deleting It

**[v3 new]** Beside the title sit two whole-session tools: `Pin` (or `Unpin`) and
`Delete session`. Pinning keeps the session until the player unpins or deletes it; it never asks.
Unpinning asks first only when the session holds favorites, since those would go with it at the
next save. Deleting always asks, naming what goes with the session, and, once confirmed, shows
the list of kept sessions, since the review has nothing left to show. Deleting the session that
just ended removes it from memory as well, and `Review last session` goes with it. The rules for
both, the same in the list and in a review, are in [`flows/kept-sessions/`](../kept-sessions/intent.md).
A visit that saves nothing offers no deletion in the review: neither a tab that a newer version
of the app has outdated, until it is reloaded, nor a visit that couldn't read the saved data,
whose review shows a session held in memory only.

**[v3 new]** A session played with my instrument also goes when my instrument is deleted or its
range or transposition changes, after the warning in its sheet or in the transposition check
([`flows/my-instrument/`](../my-instrument/intent.md#what-changing-it-does-to-its-sessions)).
When the review on screen is of that session, it closes exactly as after `Delete session`,
showing the list; the warning has said so first.

## The Player's Own Notes, Kept on Request

**[v3 new]** The notes the player played are the most private thing the app holds. They are kept
with a session only after the player switches on "Keep my played notes", which starts off; until
then they exist in memory only, exactly as in v2: the review of the session that just ended shows
them, and after a reload that session has none, so its review has no `Played notes` switch and
no played-notes export.

**[v3 new]** The switch sits in two places: in `Your data`, with everything else the app keeps,
and in the review, beside `Played notes`, whenever the session holds played notes. The review is
where the choice means most: the player sees their notes and decides to keep them. So switching
it on while reviewing the session that just ended keeps that session's notes too, not only the
next session's. Switching it off keeps nothing new and, when some are already kept, asks whether
to delete those: the player who turns keeping off may well want what was kept gone as well, but
deleting is never done without asking. In a visit that saves nothing, which offers no
deletion here, it switches for the visit only and asks nothing.

**[v3 new]** A session whose played notes are kept gets a `Delete played notes` button beside
the switch. After a confirmation, that session's played notes go, and its lane, its switch and its
played-notes export leave the review at once; the session, its favorites and its comment stay.
Every session's played notes can be deleted at once from `Your data`.

## Taking It Out

**[v3 changed]** The review offers an export for the generated notes, in the format the player
picks.

- **MusicXML** is the default, because it keeps what the review shows, the notation, and opens in
  notation programs such as MuseScore.
- **MIDI** suits a music production program. Only for MIDI, the player can also include the
  backing track, off unless they ask for it.

**[v3 new]** First in the export row, a choice of scope governs both exports: `Whole session` or
`Favorites only`. The exported phrases come in session order, each keeping its session phrase
number, so "phrase 12" means the same in the file as in the review. The scope starts at
`Whole session` every time a review opens and is not remembered: a remembered `Favorites only`
would quietly export only part of the next session. Without a favorite, `Favorites only` is
unavailable and says why; when no favorite phrase holds a played note, the played-notes export is
unavailable under that scope, and says why too.

**[v3 changed]** The format and the backing-track choice are remembered, as is the `Played notes`
switch: a player who exports MIDI with the backing every time sets it once. They come back after a
reload, like every other setting.

**[v3 changed]** A second button exports the notes the player played, as a MIDI file: the only
format that can hold playing that was never snapped to a grid. It lines up with the generated
notes' MIDI file in a music production program, phrase by phrase. It appears only when something was played; the
owner wants nothing offered that has nothing to give.

**[v3 new]** Beside it, `Include very short notes` puts the in-between notes the lane leaves out
back into the file, for a player who wants every note exactly as their controller sent it. It is
off by default, changes only the played-notes file, and is not remembered after the page closes.
When every note the player played is very short, the file would be empty with the option off, so
the played-notes export is unavailable and says why, naming the option; it neither fails nor
turns the option on by itself, which would change the file without asking.

**[v3 changed]** One button makes one file, as an ordinary browser download. The file name says
what it holds and which session it comes from, by the date and time the session started, so the
file of the notes the player played sits next to the generated one with the same name apart from
its last word, and a favorites-only file says so in its name. Using both buttons gives both
files; no button ever gives two. The exports are plain buttons: the page's one emphasised button
stays the way out of the review.

**[v3 new]** What is kept and what leaves. The review keeps a session on the device by the rules
of kept sessions, the player's played notes only when they asked, and nothing is ever sent
anywhere. An export the player triggers is the only way anything leaves the device, and the
comment never does.

**[v3.2 new]** A Jam's files open with the doodle, in a section marked "Doodle", whether the whole
session or only the favorites are exported: it is where the music began, and a favorites-only file
without it would lose what the phrases continue. The generated-notes file holds the doodle as the
app wrote it, the played-notes file the notes as played, and the two still line up measure for
measure: the doodle at the start of each, the first phrase at the next barline, the measures the
app spent writing phrase 1 left out of both.

**[v3.2 new]** The doodle exists in two forms, and they are kept apart on purpose. The written-out
doodle is part of the music: the player gave it to the app to continue, so it is kept with the
session, shown in the review and exported with the generated notes, like the phrases. The notes
as played stay played notes, the most private thing the app holds: kept only on request, shown
only behind their switch, exported only in their own file. Deleting a session's played notes
removes them and keeps the written-out doodle; deleting the session removes both.

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

**[v3 changed]** The phone gets every function the review has, as their plain baseline, and
nothing more: the phrases with their numbers and tempos, the played notes on request, the export
with its scope, the favorite stars, the comment, pinning, deleting, and the way to the list of
kept sessions. The phone is used for playing rather than looking back, so it carries the least
information that space allows: it drops the summary line and the line saying how the session is
kept (the pin button's own label already says whether it is pinned), and shows each favorite as
its star without the word. The phrases keep the phone's usual two-line layout, at the size the
staff has on that phone, and `Close review` sits in the header as on every screen.

## What This Flow Leaves for Later

- **[v3 changed]** No favorite smaller than a whole phrase: marking a range of measures is a
  later candidate.
- No lit notes, marks or comparison of any kind: the played notes are shown beside the music,
  never judged against it.
- **[v3 changed]** No replay, no "continue from this phrase", no selection. Tools for one phrase,
  when they come, join the favorite star at the end of that phrase's number and tempo line;
  whole-session tools join the export and the pin and delete buttons in the review's header. On
  larger screens they stay inside the review: there is no side rail. Tools that play sound, such
  as a replay, find the audio mix already in view, in the toolbar above the review.
- **[v3 new]** No backup file to move kept sessions to another browser: a later candidate.
