# My Instrument Screen Intent

> **New in v3.**

This screen is a sheet over the workspace where the player describes their own instrument: a
name, the lowest and highest notes they want to read, and how a written note sounds on it. It is a
short form the player fills once, checks against what they know of their instrument, and closes.
Who it serves and how it fits the rest of the app is in `flows/my-instrument/intent.md`; this
document is about what the sheet puts first and why.

## Focal Point

The range is the focal point. It is the one part every player who opens this sheet comes to
change: a saxophonist whose instrument goes higher or lower than the built-in profile, a keyboard
player who wants more than two octaves, a wind-controller player who reads a part the built-in
profiles do not cover. The name is a label, the clef is usually right from the template, and so
is the transposition, so all three sit around the range rather than competing with it.

The order on the sheet follows the order a player thinks in: what am I starting from (the
template), what do I call it (the name), on which staff do I read it (the clef), what notes does
it play (the range), how does it sound (the transposition). The live summary of the Low, Middle and High windows sits under the range,
because it is the range's consequence: the player sees at once what the Register control will
pick from.

## Starting From a Template

The player never starts from a blank form. The Curious Improviser (P1) and the Speed Builder (P2)
both already play something close to one of the three built-in profiles, so the sheet starts from
the one they have selected and they only change what differs. Picking another template refills the
range and the transposition, the two things a template is for, and leaves the name and the clef
alone: a name the player has typed, or a clef they chose, is theirs, and a template has no
business overwriting it. Every template is written in treble clef anyway.

The template is a choice at creation only. Once the instrument exists, its values are the
player's; a template picked later would only be a way to throw them away. Editing therefore shows
the template as a fact, "Made from: {template}", which also tells the player where the instrument
control goes if they delete it.

## The Range in Written Notes

The range is entered in written pitch, the notes as the player reads them, because that is how
the Curious Improviser knows their instrument: a tenor saxophonist knows their lowest note is a
written B♭3, not the concert A♭2 it sounds. Asking for concert pitch would make a beginner
translate, and a translation done wrong would give a range in the wrong place without anything
looking wrong.

Notes are named with their octave number, C4 being middle C, in the same one-spelling-per-key list
the starting-note line uses, so the sheet never shows a D♯ where the workspace says E♭. Each
stepper moves one semitone, the smallest step between two notes, so every reachable note is one
press away from its neighbour and none can be skipped.

Steppers were chosen over typed note names: a typed "Bb3" or "B flat 3" invites spelling and
octave mistakes that would need an error state of their own, while a stepper can only ever show a
real note. They were also chosen over two keyboard pictures, which would take most of the sheet on
a phone and need a pointer to use.

## The Clef

The built-in instruments are all written in treble clef, and so is a new my instrument: it starts
from one of them, and the Curious Improviser (P1) and the Speed Builder (P2) mostly play
saxophones, keyboards and wind controllers, read in treble clef. A player whose instrument is low,
a trombone, a cello, a bass guitar, reads bass clef, and in treble clef their range would hang far
below the staff on a ladder of ledger lines, the hardest thing to read at speed and the one that
makes the staff tallest. So the sheet offers the choice, treble or bass, as two named segments
between the name and the range.

It sits right above the range because the range is read on the staff it chooses, and the range's
limits depend on it: the same written notes that sit comfortably in bass clef can be refused, or
cost a much taller staff, in treble clef. A player who changes the clef sees the consequence at
once, just below. Its one line of help says who it is for and what it does not do: it changes
where notes are drawn, never which notes, so a player trying it out loses nothing. The segment
labels say "Treble clef" and "Bass clef" in full: "Bass" alone could be read as the bass
instrument.

## A Range Under Two Octaves

Every instrument in the app spans at least two octaves, because the generator needs that room to
place a phrase in a Low, Middle or High window. A range under it is refused while it is being
entered, not after `Save`: a notice under the steppers says why and how wide the range is now, and
`Save` waits until it is fixed. The notice is calm, in the notice tone, because a too-narrow range
is a step on the way, not a mistake.

The steppers are deliberately not stopped at the two-octave limit. A player moving a C4-to-C6
range up a fifth may well start with the lowest note; stopping it at 24 semitones from the highest
would block the move in that order, with nothing on screen saying to start from the other end. So both ends move freely, even past each other, and
the notice says what is wrong until the range is valid again. The only limit a stepper ever hits
is the MIDI note range, where there are no more notes to send.

## A Range Outside Its Clef

Each clef bounds the range: written C2 to C7 in treble clef, E0 to E5 in bass clef, the same lines
and spaces on each staff, from eight ledger lines below it to about five above. Beyond that, notes
are no longer readable at a glance, and the staff would have to grow past what a phone can show.
A range outside the bound is refused the way a narrow range is: live, in the notice tone, with
`Save` waiting, and with the reason in note names, "In treble clef, the range must stay between C2
and C7. B1 is too low.", since a player can check a note name against their instrument where a
count of ledger lines means nothing to them. The steppers are not stopped at the bound, for the
same reason they are not stopped at two octaves, and because a clef change can put a range outside
its new bound without any stepper moving: refusing it, rather than moving the player's notes,
keeps their range exactly as they set it until they decide. When the other clef would take the
range as it is, the notice says so in four words, "It fits in bass clef.", because that is often
the player's real answer: a low range refused in treble clef is usually a bass-clef instrument.

## A Range That Makes the Staff Taller

The workspace gives its two staff systems one height: 16 staff spaces, what the built-in
instruments need, unless my instrument's range, placed on the staff in its own clef, needs more.
A range that needs more makes that height grow, for every instrument, whether or not my
instrument is selected; on a landscape phone, where the staff is fitted to the screen's height,
that can shrink it below a readable size, and the workspace would then only say the screen is too
small. Nothing there could point back at the cause. So the form says it while the range is being
set, in one quiet line under the windows, and leaves the choice to the player: such a range is not
wrong, only costly, and a keyboard player at a desk may want it. The line names the clef, since
the cost depends on it (written C2 to C4 needs 19 staff spaces in treble clef and fits the usual
16 in bass clef), and when the other clef would cost nothing it says so too.

## Transposition as How a Note Sounds

The transposition is entered as what happens to a written note: "14 lower", "Same", "9 higher",
in semitones, one stepper across octaves, with one example under it: "a written C4 sounds as
B♭2". That is the fact a player can check against their instrument or a tuner. It is never chosen
by interval name: a beginner would have to translate the name into notes before picking it. But
the name is shown, derived from the count, at the start of the same line: "A major ninth lower (an
octave and a major second): a written C4 sounds as B♭2." The name is how a tenor saxophone's
transposition is written in every method book and fingering chart, so a player who meets it there
can match it to the sheet, and one who has never met it learns it from a count they already
trust. Between one and two octaves the compound name ("a major ninth") is followed by the octave
it holds, in brackets, because "ninth" does not say "an octave and a second" to a beginner; past
two octaves the name is built the plain way ("two octaves and a major second"), since the compound
names there are rarely used. The six-semitone interval is always "an augmented fourth", the one
name the app uses for it.

Changing the transposition keeps the written range where it is and moves the sounding range. The
written range is what the player knows of their instrument; the transposition only says how it
sounds. The windows summary follows, so the player sees the effect.

## What Is Demoted

The name is optional. A player who just wants their range right can leave it empty and gets "My
instrument", the label they already use for it.

The windows are shown, never edited: they are derived from the range by the same rule as the
built-in profiles, so a player cannot make a window the generator cannot fill.

`Delete my instrument` sits on its own row, after everything else and away from `Save`, in the
error tone, and asks once before it deletes anything. It must never be the button a hurried player
hits on the way to `Save`.

## When Saving Erases Sessions

Every kept session belongs to the instrument it was played with. A change to my instrument's range
or transposition changes what it plays, so its kept sessions no longer match it, and saving such a
change erases them; deleting my instrument deletes them too. Both ask once, and say how many
sessions go, because a number is what tells the player whether this is nothing or a month of
favorites: "Changing the range or the transposition erases the 3 sessions played with Tenor." The
warning comes at `Save`, not as the steppers move, so a player exploring a range is never nagged;
and it comes only when something would go: with no kept session of my instrument, `Save` just
saves. A name or a clef change never asks, since it changes nothing generated and every session
keeps its own phrases in the clef they were played in.

The warning replaces the form inside the sheet, as the delete confirmation does, with the erasing
action in the error tone and focus on `Cancel`, which returns to the form with the edit intact: the
player who wants to keep a session first can cancel, export it from its review, and come back to
the same unsaved change. The line that says so is the warning's last. When the review on screen
is one of the sessions that go, the warning says it will close, so the review vanishing behind the
sheet is never a surprise; afterwards the review mode shows the session list, exactly as after
`Delete session`.

## In a Tab That Must Be Reloaded

A tab that a newer version of the app has outdated deletes nothing, so it cannot erase my
instrument's sessions either. While my instrument has kept sessions, its sheet says so first, in
one notice line, and the three steppers are shown but disabled, so the player sees their values
and why they cannot move, rather than meeting a refusal after making a change; `Delete my
instrument` is absent, as every deletion is in such a tab. The name and the clef still change,
since they erase nothing.

## Leaving Without Saving

`Cancel`, Escape, the backdrop and `Close` leave the form without saving and without asking. A form
left half-done deletes nothing that was kept, so a question there would only slow down the common
case of a player who opened the sheet to look.

## The Phone

The phone gets the whole sheet, every field and action, as the plain baseline. The two range
steppers stack instead of sitting side by side, and the sheet scrolls inside itself. Because the
refusal notice can then sit below the fold, it is announced as it appears, and the disabled `Save`
shows, where the player is about to press, that the range is not ready yet.
