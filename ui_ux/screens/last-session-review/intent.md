# Last Session Review Intent

> **New in v2.**

## What This Screen Is

The **Last session** review is a mode of the workspace page, not a page of its own. When a
session ends, once the session's first phrase has sounded, it takes the staff's place, under the
same header and score toolbar, with the controls still below it, and no session can start while
it shows: the header's session
button reads `Close review` instead of `Start session`. Leaving it brings the staff back as between
any two sessions; a `Review last session` button above the staff reopens it until the next
session starts. The reasoning for that shape, and for what happens around it at a session end, is
in [`flows/review-and-export/intent.md`](../../flows/review-and-export/intent.md).

It is written first for the Fledgling Composer (P3), who wants to look back at a session (P3.C1)
and take it out to other tools (P3.C2). Personas are defined in
[`specs/personas.md`](../../../specs/personas.md). For the Curious Improviser (P1) and the Speed
Builder (P2), who mostly want to play again, its job is to cost them one key or click on
the way out.

## Focal Point

The phrases are the point. The panel opens with a short header, a title, one line of summary and
the export, and then gives the rest of its space to the phrases, one after another, drawn exactly
as they were on the staff. The export sits in the header rather than at the bottom, because after
a long session the bottom is far away, and taking the session out is the one thing most people who
open the review came to do.

Each phrase carries only what the product asks of it: its number and its tempo, on one quiet line
above it. The number matters because the export marks phrases with the same numbers, so "phrase 12
was the one" means the same thing in the review and in a notation program. Without the rising
tempo (v2.2) the tempo is the same for every phrase; it is shown anyway, so the line keeps one
shape, and with it each phrase's line records the tempo it actually played at, the last one being
the tempo the session reached.

A phrase the app repeated, because it could not find a new one in time, is shown and numbered like
any other: it is what the player heard and read, and the reason behind it is the app's business.

## What Is Deliberately Left Out

- **No judgement of how the player played.** No lit notes, no counts, no marks. The review shows
  the music the session gave; from v2.1, the notes the player played can be shown under it, behind
  their own switch (see The Notes the Player Played), and even then nothing is ever marked as
  missed, or as matched.
- **No per-phrase actions.** Replaying a phrase, or using one as the starting point for new
  material, may come later. When they do, they sit at the end of each phrase's number-and-tempo
  line, where there is room for them today; whole-session tools sit beside the export. On larger
  screens they stay inside the panel: there is no side rail, so the phrases keep the full width,
  as the staff does.
- **No way to keep or discard it by hand.** Leaving the review does not discard it; it lasts until
  the next session starts or the page closes. The summary line says so, because a player who
  assumes it is saved would otherwise find out the hard way.
- **No way out inside the panel.** `Close review` lives in the header, in the slot where
  `Start session` will be once the player has left; a second close button in the panel would be
  one more thing on a screen the owner wants plain.

## The Export

The export is one row: a choice of format, the backing option when it applies, and one button. The
format is a two-option switch rather than two buttons, because the product's rule is one action
per kind of content: the generated notes are one kind, in either format, and the played notes,
from v2.1, are the other, with their own button beside this one. MusicXML comes
first and is the default, because it keeps what the review shows, the notation. The backing track
only exists in the MIDI file, so its switch appears only while MIDI is chosen, rather than sitting
there disabled with an explanation beside it.

The button is not the page's primary action. While the review shows, that emphasis belongs to
`Close review` in the header, the next step for every player; a second primary button further
down would compete with it.

Making the file takes a moment at most. The button shows it is working, the browser's own download
confirms the result, and the app adds no message of its own when it works. If making the file ever
fails, a plain message says so under the export and the button tries again.

From v2.1, `Export played notes` follows the generated-notes group in the same row, a little
further apart, so the format and backing choices read as belonging to the generated notes only.
It has no choices of its own: played notes come out as MIDI only, since playing that was never
snapped to a grid cannot be written as notation without misplacing it. It makes one file named
like the generated one, ending in `-played`, so a session's files sit side by side; using both
buttons gives both files. It is a plain button too, and it behaves like the other one, the
same failure message serving both. When nothing was played during the session, which is always
the case without a controller, there is nothing to export, and the button is simply not there,
nor the switch below: the review then looks exactly as it did before played notes existed.

## The Notes the Player Played

From v2.1, a `Played notes` switch sits in its own row under the title and the export, just above
the phrases it changes. It is off when the review first opens, so the review starts as the plain
record of the music, and it keeps its setting for as long as the page is open, like the format
choice. It is written for the Fledgling Composer looking back at "what they played" (P3.C1), and
it must stay an appreciation of having played along, never a score.

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

The owner wants the phone's review kept to the minimum: the phrases and the export, nothing else.
So the phone drops the summary line and keeps the title, the export row, wrapped onto as many
lines as it needs, and the phrases, in the phone's two-line layout, at the size the staff has on
that phone, each still with its number and tempo. From v2.1, the played notes' export joins the
export row and their switch its row under it, as on a larger screen: the owner counts the played
notes among the phone's minimum. Each of the phrase's two lines gets its own lane.
