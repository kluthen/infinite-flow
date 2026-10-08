# Jam Intent

> **New in v3.2.**

Until v3.2 the app only ever continued its own ideas. A Jam lets the player give it one: after the
count-in they play a short idea of their own, a **doodle** of one to four measures, over the app's
click, and the session's phrases then continue it, with a rhythm close to it, the same ups and
downs, and a first note joined to the doodle's last one. The doodle changes no setting: it only
decides which of the phrases the player's settings allow come first. Afterwards the review opens
with the doodle as the app heard it, may suggest the key and mode it sounds in, and offers to jam
again on the same doodle. This flow covers Jam mode at idle, starting a Jam, the doodle and the
measures that follow it until phrase 1 sounds, a Jam that ends before then, the held doodle, and
the suggestion shown at idle. Once phrase 1 sounds, a Jam is a session like any other
(`flows/play-session/`); its review, with the doodle section and the suggestion's actions, is in
`flows/review-and-export/`.

The words follow the [lexicon](../../../docs/music/lexicon.md): [Jam](../../../docs/music/lexicon.md#jam),
[doodle](../../../docs/music/lexicon.md#doodle),
[held doodle](../../../docs/music/lexicon.md#held-doodle),
[drift](../../../docs/music/lexicon.md#drift),
[rhythm lock](../../../docs/music/lexicon.md#rhythm-lock),
[key and mode suggestion](../../../docs/music/lexicon.md#key-and-mode-suggestion),
[starting note](../../../docs/music/lexicon.md#starting-note) and
[count-in](../../../docs/music/lexicon.md#count-in). The **home note** is the note the music feels
settled on, the one the Written key control names; a **measure** (or bar) is four beats.

## Whose Flow This Is

From [`specs/personas.md`](../../../specs/personas.md) and
[master spec C3](../../../specs/versions/v3/master-spec.md#c3-personas-and-goals-served), primary
goal first:

- **P3, the Fledgling Composer** — **C3, grow an idea**, the goal this flow exists for. "I liked
  that gimmick": they play it, and the app takes it further. The owner put it as "I've a doodle in
  mind, but I'm not good enough to iterate on it." Jam captures the doodle and continues it, the
  drift sets how far the phrases may wander from it, and jamming again on the same doodle lets the
  player go round as often as they like without playing it again, in the key and mode the
  suggestion found if they wish. It is served by shape: the doodle is matched, never quoted, and
  its exact rhythm waits for a later rhythm editor. The Fledgling Composer's review and export
  goals (C1, C2) are extended by the doodle opening the review and both exports, designed in
  `flows/review-and-export/`.
- **P1, the Curious Improviser** (the primary persona) — **G1, vocabulary by exposure**, partly:
  hearing their own idea developed is exposure too, and the suggestion names the mode their idea
  sounds in, which is vocabulary learned from their own playing. **G2, real-time reading and
  dexterity**, partly, through the rhythm lock a Jam can run with: the rhythm settles on the one
  nearest the doodle and the eyes go to the pitches.
- **P2, the Speed Builder** — **S1, fresh material at a steadily higher tempo**, partly: a Jam
  runs at any tempo up to 240 BPM, the two measures before phrase 1 included, and the session
  after it is as fresh as any.

Where these pull apart the Curious Improviser's experience is the default, as everywhere in the
app: nothing in a Jam grades the doodle, names a wrong note or ranks the player.

## A Mode, Not a Second Start

Jam is a way of starting a session, so it is chosen before the session like the other session
options, and it sits first among them, in the "During a session" group. While it is on and a
controller is attached, the session button reads `Start Jam` and the empty staff explains what to
do, so the mode shows where the player acts and where they look. A second start button beside
`Start session` was rejected: with a controller attached, a session can start by a played note,
and two starts would compete for one note. A mode also leaves the header as it is, its widths
fixed and full.

Jam needs a controller, since the doodle is played on it. Without one the switch is unavailable
and says why, as the rising tempo does, and the player's choice is kept: Idle and the start
behave exactly as with Jam off until a controller attaches, and the mode comes back with it. So
plugging in or unplugging the controller between sessions turns the mode on and off as though the
player had used the switch.

In Jam mode no phrase is shown at idle: nothing is read before the doodle, since the phrases are
written from it. The staff shows an empty system with the clef, the key signature of the selected
key and mode, and the time signature, so the player sees which key they are about to play in, and
under it one sentence: "After the count-in, play your doodle: one to four measures. The app
continues it." `Generate phrase` stays in its place, disabled, since there is nothing to generate,
and `Start Jam` takes the emphasis. Turning Jam on discards the phrase on screen, along with any
failure message about it, because a Jam never plays it. Turning Jam off leaves the workspace as it
is at first load, empty, with nothing generated until the player asks: the app generates a phrase
by itself only on an instrument switch, and leaving a mode is not a reason to start a new one.

## Starting Hands-Free, by the Home Note

Both hands, and on a wind instrument the mouth, are on the instrument when a session starts. So a
Jam can start, like any session, by a played note as well as by a click. With no phrase on screen
there is no first note to play, so the starting note is the home note of the selected key, in
written pitch, in the octave nearest the middle of the instrument's written range. The row above
the staff names it as it always names the starting note, "Play this note to start: G4", but no
triangle marks it on the staff, since there is no note there to mark: the octave number carries
it alone. The home note was chosen because it is the one note a player always knows where to find
in their key, and because it says "this is the key" before the doodle starts. As with every
starting note, playing it at idle is enough to start, which is a small risk the player accepts
for hands-free starts, and the line names the note so it is never a surprise. Notes played at idle
are otherwise ignored: a doodle is captured only after the count-in, so a doodle never starts
anything by accident.

## Playing the Doodle

The count-in is the same one measure of click as any session's. Then the player plays. The click
goes on under the doodle, and through the two measures after it, whatever the click switch says,
because it is what sets the measure grid the doodle is played against; there is no backing yet,
since the backing follows a phrase's chords and there are none. From phrase 1 on, the click
switch governs again.

The row above the staff counts the doodle's measures, "Your doodle" and the numbers 1 to 4, each
lit as its measure begins, in the same style as the count-in's beats. A glance tells the player
how much room they have left, which matters because the doodle ends by itself. The numbers wait,
unlit, until the first note: a doodle may start after a pause, and its first measure is the one
that holds its first note. Measures after the doodle's end never light.

**The doodle ends by itself**, so the player never has to reach for the screen. It ends when a
whole measure passes with no note sounding: at such a barline the row already says the app is
writing, and if the player plays on within that measure, the doodle simply goes on and the row
counts the measure. A note still held across a barline keeps the next measure from counting as
silent, so a long last note is never cut off by mistake. And it ends after its fourth measure,
whatever is sounding. Ending by silence was chosen over a button or a gesture because silence is
what a player does naturally when an idea is finished, and a fixed length alone would force every
idea to four measures.

**The live view never shows the doodle's notes**, as no session ever draws a played note on the
staff. The empty staff and its sentence stay as they are; the player is listening to themselves,
and a staff filling with their own notes, quantized, would invite them to read and correct a
sketch that is meant to be rough.

## Two Measures Before Phrase 1

After the doodle the app needs time to write phrase 1 from it, and the player needs time to read
phrase 1 before playing it. So two measures separate the doodle and phrase 1: in the first the app
writes, and the row says "Writing your first phrase", still, with no animated dots that would
suggest progress the app cannot measure; in the second, phrase 1 is on the staff and the row
counts its four beats, exactly as the count-in counts them before any phrase. Then phrase 1 sounds
with the backing, and the Jam runs as a session. The read-in measure exists because every session
promises at least a measure of reading ahead: without it phrase 1 would appear on the barline it
starts on.

At fast tempos a measure is short. When phrase 1 is not ready in time, the wait grows by whole
measures, the click going on and the row still saying the app is writing, up to three measures;
phrase 1 then appears at the next barline, followed by its read-in measure. The app tries its
best phrase first, joined to the doodle's last note and following its shape, then one that follows
the shape without the join, then a plain phrase with no doodle at all, so that a Jam almost never
fails for lack of time. None of this is shown: the player only sees "Writing" last a measure or
two longer. Phrase 1 enters the empty staff with the ordinary entrance, and from there the staff
rolls as in every session.

## Nothing Is Asked During a Jam

A running session never asks the player for anything and offers nothing to click, a Jam included.
There is no "new doodle" during a Jam: telling a new idea apart from a player who lost their
place would need a played signal the app does not have, and guessing wrong would throw away the
session. To doodle again, the player stops and starts a new Jam. For the same reason the key and
mode suggestion, which needs the player's answer, is worked out while the app writes phrase 1 but
shown only afterwards, in the review, where the hands are free. The Jam is therefore always
continued in the player's own key and mode, and the suggestion serves the next Jam on that
doodle. A two-step Jam, back to idle after the doodle to ask about the key before going on, was
rejected: it breaks the doodle-then-phrases flow that makes a Jam feel like playing with someone.

## When a Jam Ends Before Phrase 1

A Jam can end before its first phrase sounds: the player stops it, plays nothing within 30 seconds
after the count-in, unplugs the controller, hides the tab, or makes the window too small for the
staff, or, rarely, the app cannot write any phrase 1 in time. Each ends it the way a session
ended during its count-in ends: back to Jam mode's idle, focus on `Start Jam`, no review, nothing
kept, and the doodle not held. There is nothing to look back at, since no phrase was played.

Only one of these causes is told, because only one would otherwise leave the player puzzled: when
the app could not write phrase 1, a calm line appears under the instruction, "The app couldn't
continue your doodle with these settings. Try again, or change a setting." It is never
error-toned, since nothing is the player's fault, and it stays until the next start or the next
change of a setting. The other causes are the player's own actions or plain to see, and a session
ended during its count-in has never said anything more. A lost controller before phrase 1 ends the
Jam at once, with no countdown, because there is nothing rolling to keep playing along to, and a
doodle cannot be captured without it.

## Going Round Again: the Held Doodle

"Jam again on this doodle", in the review, is how the player goes round again. It closes the
review and holds the doodle at idle, turning Jam on if it was off. Idle then shows phrase 1
already written from the held doodle, ready to read, and the session starts like any session: the
count-in, then phrase 1, with no doodle to play again and no 30-second wait for it. The starting
note is phrase 1's first note again, marked on the staff. A held doodle is the Fledgling
Composer's loop: try the idea, look at what the app did with it, try it again, perhaps in the key
the app heard in it.

A line above the staff says what is going on, so the player never wonders why the staff shows a
phrase in Jam mode: "Jamming again on your doodle: phrase 1 continues it. Changing any setting
except the tempo, Rising tempo, the audio mix or the theme lets it go." The second sentence names
the four settings that keep the doodle, because every other setting change lets it go: every
phrase written from it depends on the settings, and keeping a doodle across a change of key would
mean continuing it in settings it was never played in. The tempo, Rising tempo, the audio mix and
the theme keep it, since none of them changes what is written; the line names all four so that it
stays true, where naming the tempo alone would tell a player changing the theme that their doodle
is gone when it is not.
`Regenerate phrase` writes a new phrase 1 from it, and the Jam played on it keeps it, so after its
review the next phrase 1 from the same doodle is waiting, with a fresh seed. Deleting the session
the doodle came from lets it go too: deleted means gone, the doodle included. A held doodle lives
for the visit only and is never saved; the kept session's review offers it again after a reload.

The line holds still during a Jam played on it, like the notice row above the staff, so that a
start never moves the staff; it appears and leaves only at idle, after something the player did.
It sits between the score toolbar and the staff, where a generation failure message would go,
rather than in the row above the staff, which belongs to the starting note and the session.

## The Suggestion's Place

The key and mode suggestion is offered where the player can answer it: in the Jam's review, and,
when a doodle is held, in the line that holds it. "Your doodle sounds like G Dorian." with two
buttons named by what they do, `Use G Dorian` and `Keep C Major`, rather than "Use it" and "Keep
mine", which would make the player look elsewhere to know what each changes. Using it at idle
sets the key and mode exactly as a change by hand does and is the one key and mode change that
keeps the held doodle: phrase 1 is written again from it in the new key and mode, so the next Jam
continues the idea in the key it sounds in. Keeping their own changes nothing, and that doodle is
never offered the suggestion again, since the same doodle always gives the same answer. When the
answer lies outside what the selected preset is meant for, a second line says so beforehand in
the words the key and mode marks use: using it makes the settings Custom. The sentence that says a
doodle uses notes outside the app's keys and modes belongs to the review, where the doodle is
written out; at idle there is nothing to suggest, and the line simply holds the doodle.

## What Is Never Shown

- **The doodle's notes during the Jam.** No played note is ever drawn live; the review shows the
  doodle as the app heard it, and the played notes under it on request.
- **Rhythm changes and forced bends.** With the rhythm lock on, a phrase that changes the rhythm
  in one of the ways the player allowed, or that takes the nearest workable rhythm because the
  locked one cannot make a phrase, is played and read as written. A mark on the staff would pull
  the eyes off the notes for something the player cannot act on mid-session, the way a repeated
  phrase or a setting the app varied has never been marked.
- **Which attempt wrote phrase 1.** The extended wait and the fallback show nothing but "Writing"
  lasting a little longer.
- **A grade of any kind.** The suggestion is a suggestion; a doodle that fits no mode is said so
  plainly, never with a wrong note named.

## Leaving Jam Mode

Turning the switch off, or losing the controller at idle, takes Jam mode out of effect, and a
held doodle goes with it. The workspace then opens empty, as at first load, and the player asks
for a phrase with `Generate phrase`. Generating one automatically was considered: it would save a
click, but the app would start a generation the player did not ask for, which it does at idle
only on an instrument switch, and a player leaving Jam mode is often about to change something
else first.

## What Was Left Out

From [master spec C2](../../../specs/versions/v3/master-spec.md#out-of-v32), and why it shapes
nothing here:

- **The doodle's exact rhythm.** The phrases match the nearest rhythm the app can write; the exact
  one needs a later rhythm editor.
- **Quoting the doodle**, developing it by named operations, or choosing chords to fit it: later.
  A fourth drift position waits for those operations.
- **A new doodle during a running Jam**: it would need a played signal, which comes later at the
  earliest. Stop and start a new Jam.
- **A Jam without a controller**, a tempo inferred from a doodle played freely, a drone under the
  doodle, a doodle taken from a file or a past session, a pickup or tie across the join: later or
  never.
- **The suggestion during a Jam, or a list of every candidate it weighed**: only the drawn answer
  is shown, and only afterwards.
- **Presets holding Jam, the drift, the rhythm lock or what Vary settings may move**: none does;
  choosing a preset changes none of them.
- **Any grading, scoring, ranking or wrong-note signal**: permanently out.
