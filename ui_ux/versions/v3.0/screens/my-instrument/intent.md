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
profiles do not cover. The name is a label and the transposition is usually right from the
template, so both sit around the range rather than competing with it.

The order on the sheet follows the order a player thinks in: what am I starting from (the
template), what do I call it (the name), what notes does it play (the range), how does it sound
(the transposition). The live summary of the Low, Middle and High windows sits under the range,
because it is the range's consequence: the player sees at once what the Register control will
pick from.

## Starting From a Template

The player never starts from a blank form. The Curious Improviser (P1) and the Speed Builder (P2)
both already play something close to one of the three built-in profiles, so the sheet starts from
the one they have selected and they only change what differs. Picking another template refills the
range and the transposition, the two things a template is for, and leaves the name alone: a name
the player has typed is theirs and a template has no business overwriting it.

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

## A Range That Makes the Staff Taller

Every instrument is written in treble clef, and the workspace gives its two staff systems one
height, sized for the instrument whose range reaches furthest above or below the staff. A range
reaching further than the built-in instruments' makes that height grow, for every instrument,
whether or not my instrument is selected; on a landscape phone, where the staff is fitted to the
screen's height, that can shrink it below a readable size, and the workspace would then only say
the screen is too small. Nothing there could point back at the cause. So the form says it while
the range is being set, in one quiet line under the windows, and leaves the choice to the
player: such a range is not wrong, only costly, and a keyboard player at a desk may want it.

## Transposition as How a Note Sounds

The transposition is shown as what happens to a written note: "14 lower", "Same", "9 higher", in
semitones, with one example under it, "A written C4 sounds as B♭2." That is the fact a player can
check against their instrument or a tuner. Interval names ("a major ninth below") were rejected: a
beginner would have to translate them, and they add nothing the semitone count and the example do
not already say.

Changing the transposition keeps the written range where it is and moves the sounding range. The
written range is what the player knows of their instrument; the transposition only says how it
sounds. The windows summary follows, so the player sees the effect.

## What Is Demoted

The name is optional. A player who just wants their range right can leave it empty and gets "My
instrument", the label they already use for it.

The windows are shown, never edited: they are derived from the range by the same rule as the
built-in profiles, so a player cannot make a window the generator cannot fill.

`Delete my instrument` sits on its own row, after everything else and away from `Save`, in the
error tone, and asks once before it deletes anything. It is the one action in this sheet that
removes something kept, and it must never be the button a hurried player hits on the way to
`Save`.

## Leaving Without Saving

`Cancel`, Escape, the backdrop and `Close` leave the form without saving and without asking. A form
left half-done deletes nothing that was kept, so a question there would only slow down the common
case of a player who opened the sheet to look.

## The Phone

The phone gets the whole sheet, every field and action, as the plain baseline. The two range
steppers stack instead of sitting side by side, and the sheet scrolls inside itself. Because the
refusal notice can then sit below the fold, it is announced as it appears, and the disabled `Save`
shows, where the player is about to press, that the range is not ready yet.
