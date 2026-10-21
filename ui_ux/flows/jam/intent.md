# Jam Intent

> **New in v3.2.**

Until v3.2 the app only ever continued its own ideas. A Jam lets the player give it one: after the
count-in they play a short idea of their own, a **doodle** of one to four measures, over the app's
click, and the phrases then continue it, with a rhythm close to it, the same ups and downs, and a
first note joined to the doodle's last one. Jam is a mode of its own, beside the ordinary one: the
player switches to it in the header, and it has its own settings, its own idle staff and its own
way to phrase 1. The doodle does more than order the phrases: how busy, how syncopated and how
leaping the phrases are is read from it, so the phrases move like it. Afterwards the review opens
with the doodle as the app heard it, may suggest the key and mode it sounds in, and Jam mode keeps
the doodle, so the player can go round again on it without playing it again.

This flow covers entering and leaving Jam mode, Jam mode at idle, setting its tempo by tapping,
starting a Jam, the doodle and the measures that follow it until phrase 1 sounds, a Jam that ends
before then, the doodle Jam mode keeps, and the suggestion shown at idle. Once phrase 1 sounds, a
Jam is a session like any other (`flows/play-session/`); its review, with the doodle section and
the suggestion's actions, is in `flows/review-and-export/`. The layout of everything named here is
in [`screens/phrase-workspace/`](../../screens/phrase-workspace/intent.md).

The words follow the [lexicon](../../../docs/music/lexicon.md): [Jam](../../../docs/music/lexicon.md#jam),
[doodle](../../../docs/music/lexicon.md#doodle),
[drift](../../../docs/music/lexicon.md#drift),
[rhythm lock](../../../docs/music/lexicon.md#rhythm-lock),
[key and mode suggestion](../../../docs/music/lexicon.md#key-and-mode-suggestion),
[starting note](../../../docs/music/lexicon.md#starting-note),
[count-in](../../../docs/music/lexicon.md#count-in) and [tempo](../../../docs/music/lexicon.md#tempo).
The **home note** is the [tonic](../../../docs/music/lexicon.md#tonic), the note the music feels
settled on, the one the Written key control names; a **measure** (or bar) is four beats.
**Session mode** is the app as it always was; **Jam mode** is the mode this flow adds.

## Whose Flow This Is

From [`specs/personas.md`](../../../specs/personas.md) and
[the Jam re-scope](../../../specs/versions/v3/jam-mode.md), primary goal first:

- **P3, the Fledgling Composer** — **C3, grow an idea**, the goal this flow exists for. "I liked
  that gimmick": they play it, and the app takes it further. The owner put it as "I've a doodle in
  mind, but I'm not good enough to iterate on it." Jam captures the doodle and continues it, the
  drift sets how far the phrases may wander from it, and the doodle Jam mode keeps lets the player
  go round as often as they like without playing it again, in the key and mode the suggestion
  found if they wish. It is served by shape: the doodle is matched, never quoted, and its exact
  rhythm waits for a later rhythm editor. The Fledgling Composer's review and export goals (C1,
  C2) are extended by the doodle opening the review and both exports, designed in
  `flows/review-and-export/`.
- **P1, the Curious Improviser** (the primary persona) — **G1, vocabulary by exposure**, partly:
  hearing their own idea developed is exposure too, and the suggestion names the mode their idea
  sounds in, which is vocabulary learned from their own playing. **G2, real-time reading and
  dexterity**, partly, through Jam's rhythm lock: the rhythm settles on the one nearest the doodle
  and the eyes go to the pitches.

The Speed Builder (P2) is not Jam's persona: a Jam runs from 60 to 180 BPM, the range a doodle
can be played and continued in reliably, below the tempos the Speed Builder works towards. Where
the personas pull apart the Curious Improviser's experience is the default, as everywhere in the
app: nothing in a Jam grades the doodle, names a wrong note or ranks the player.

## A Mode of Its Own

In a Jam the app follows the player's idea instead of its own settings, so the settings a Jam
needs are not session mode's. Most of session mode's musical controls describe what the doodle
already says (how busy the rhythm is, how the melody moves), and session mode's tools for steering
variety (presets, Vary settings, a rising tempo) do the job the doodle and the drift do in a Jam.
Folding Jam into session mode, as a switch among the session options, made every control ask
"does this still count in a Jam?" and made one note on the controller mean two different starts.
As a mode of its own, Jam has a small set of settings of its own, an idle staff that says what to
do, and a start that cannot be confused with a session's.

The mode is chosen with a two-segment switch in the header, `Session` and `Jam`, right after the
app's name. The header is where the player looks to know what the app is doing, and a switch with
both names always shows which mode is on and which is the other; a single "Jam mode" toggle would
name only one of them. A row of tabs over the workspace was rejected: it would spend a whole row
on one choice and push the staff down. The score toolbar was rejected too: it holds the audio mix,
which is never locked, and the mode is locked during a session. At idle the mode also shows where
the player acts and looks: the session action reads `Start Jam`, the staff shows Jam's empty
staff or the phrase written from the doodle, and the controls open with "Shape your Jam".

The mode changes only between sessions, at idle, by the player's own press: never during a
session, never while a review shows, and never by itself. The app always opens in session mode,
after a reload too, since being in Jam mode is not a setting but where the player is right now.
And leaving Jam mode returns session mode exactly as it was left, its phrase and everything it had
prepared, because nothing in Jam mode touches session mode's settings: a player who tries a Jam in
the middle of a practice sitting goes back to their practice with nothing to redo.

## Opening Jam Mode the First Time

Jam's part of the app is not loaded with the page, so a player who never jams never waits for it.
The first press of `Jam` in a visit loads it. That takes a moment, so the switch shows it at once:
`Jam` is checked and the switch shows it is busy, while the workspace holds still as it does while
a phrase is being written, controls read-only and both header actions disabled. Session mode stays
drawn until Jam mode is ready, then Jam mode appears at once. `Session` stays pressable meanwhile,
so a player who pressed `Jam` by mistake is back at once, without waiting for the load to finish.
Later presses in the visit wait for nothing.

The load can fail only when the device is offline before the app's files were kept for offline
use. Then session mode stays as it was, `Session` checked again, and the notice row at the top of
the workspace says what happened and what to do: "Jam mode couldn't open because part of the app
didn't load. Check that you're online, then try again.", with `Try again` and `Dismiss`. It is
never error-toned: nothing is broken that the player did, and session mode works as before.

## Jam's Idle

Without a doodle there is nothing to read before the Jam: the phrases are written from the doodle,
so there are none yet. The staff shows an empty system with the clef, the key signature of Jam's
key and mode, and the time signature, so the player sees which key they are about to play in, and
under it one sentence: "After the count-in, play your doodle: one to four measures. The app
continues it." `Generate phrase` stays in its place, disabled, since there is nothing to generate,
so the header does not move between the modes, and `Start Jam` takes the emphasis.

A Jam needs a controller, since the doodle is played on it. Without one, Jam mode still opens and
every setting can be set, so a player can prepare a Jam before plugging in; `Start Jam` is
disabled, and the row above the staff says why, where the starting note would be: "A Jam needs a
connected controller. Connect one to start." A controller arriving or leaving never switches the
mode: the player chose it with a button, and a mode that changed by itself because a cable moved
would be a surprise.

## Jam's Settings

Jam keeps its own settings, saved apart from session mode's: its key and mode, its tempo, how far
the phrases drift from the doodle, its own rhythm lock, and a few harmony settings. The instrument,
the controller, the audio mix and the theme are shared, since they describe the player and the
room, not the music being made. Jam's key and mode start from session mode's the first time, so
the first Jam is in the key the player was already practising in, and from then on they are Jam's
own: the suggestion's answer changes Jam's key, and session mode never moves under the player.

What the doodle shows (how dense, varied, syncopated and silent its rhythm is, how its melody moves
and where it sits) is read from it, and the controls show what was read as a short list rather
than as controls to set. The screen's reasoning for the settings' layout, the read-only list and
the single embellishments level is in
[`screens/phrase-workspace/intent.md`](../../screens/phrase-workspace/intent.md#jams-controls).

## Setting the Tempo by Tapping

A Jam's tempo is set before the doodle, so the doodle is played over a click at a known speed:
that is what makes the doodle's measures, its end by silence and its quantizing reliable, and a
steady click is how beginners practise anyway. But a player with an idea in their head often hears
it at a speed rather than a number. So beside Jam's tempo there is `Tap tempo`: the player taps
the beat, on the button or on the controller, and the tempo follows their taps, at the speed
they hear.

Tapping starts with a press of the button, not with a note. Notes at idle could otherwise count as
taps all the time, and a player warming up on their instrument before a Jam would keep moving the
tempo without meaning to. One press starts listening, so a player with both hands on the
instrument presses once and taps on the controller; the starting note counts as a tap too while
listening, so it starts nothing. From the fourth tap the tempo is set and shown at once, and each
further tap corrects it, so an uneven start is simply tapped over. The line under the tempo says
what is going on at each step, in plain words, and never judges the taps: unevenness is the
player's own business, and the tempo shown is what they get. Tapping starts nothing and sounds
nothing; the Jam still starts with `Start Jam` or the home note.

## Starting Hands-Free, by the Home Note

Both hands, and on a wind instrument the mouth, are on the instrument when a Jam starts. So a Jam
can start, like any session, by a played note as well as by a click. With no phrase on screen
there is no first note to play, so the starting note is the home note of Jam's key, in written
pitch, in the octave nearest the middle of the instrument's written range. The row above the staff
names it as it always names the starting note, "Play this note to start: G4", but no triangle
marks it on the staff, since there is no note there to mark: the octave number carries it alone.
The home note was chosen because it is the one note a player always knows where to find in their
key, and because it says "this is the key" before the doodle starts. As with every starting note,
playing it at idle is enough to start, a small risk the player accepts for hands-free starts, and
the line names the note so it is never a surprise. Notes played at idle are otherwise ignored,
unless the player has pressed `Tap tempo`: a doodle is captured only after the count-in, so a
doodle never starts anything by accident.

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
rolls as in every session. As phrase 1 enters, the list of what the app read from the doodle fills
in, below the staff, out of the way: it is there to look at afterwards.

## Nothing Is Asked During a Jam

A running session never asks the player for anything and offers nothing to click, a Jam included.
There is no "new doodle" during a Jam: telling a new idea apart from a player who lost their
place would need a played signal the app does not have, and guessing wrong would throw away the
session. To doodle again, the player stops, presses `New doodle` and starts again. For the same
reason the key and mode suggestion, which needs the player's answer, is worked out while the app
writes phrase 1 but shown only afterwards, in the review, where the hands are free. The Jam is
therefore always continued in Jam's own key and mode, and the suggestion serves the next Jam on
that doodle. A two-step Jam, back to idle after the doodle to ask about the key before going on,
was rejected: it breaks the doodle-then-phrases flow that makes a Jam feel like playing with
someone.

## When a Jam Ends Before Phrase 1

A Jam can end before its first phrase sounds: the player stops it, plays nothing within 30 seconds
after the count-in, unplugs the controller, hides the tab, or makes the window too small for the
staff, or, rarely, the app cannot write any phrase 1 in time. Each ends it the way a session
ended during its count-in ends: back to Jam's idle, no review, nothing kept. There is nothing to
look back at, since no phrase was played, so a fresh Jam's doodle is not kept either; the player
simply plays it again. Focus returns to `Start Jam`, except after a lost controller, when it goes
to the controller's place in the header, since connecting one is the next thing to do.

Only one of these causes is told, because only one would otherwise leave the player puzzled: when
the app could not write phrase 1, a calm line appears under the instruction, "The app couldn't
continue your doodle with these settings. Try again, or change a setting." It is never
error-toned, since nothing is the player's fault, and it stays until the next start or the next
change of a setting. The other causes are the player's own actions or plain to see, and a session
ended during its count-in has never said anything more. A lost controller before phrase 1 ends the
Jam at once, with no countdown, because there is nothing rolling to keep playing along to, and a
doodle cannot be captured without it; Jam mode stays, and the row says a controller is needed.

## Going Round Again: the Doodle Jam Mode Keeps

After a Jam, Jam mode keeps its doodle. Leaving the review, the player finds phrase 1 already
written from it again, with a fresh seed, ready to read, and the next Jam starts like any session:
the count-in, then phrase 1, with no doodle to play again and no 30-second wait for it. The
starting note is phrase 1's first note again, marked on the staff. This is the Fledgling
Composer's loop: try the idea, look at what the app did with it, change a setting, try it again,
perhaps in the key the app heard in it. `Jam again on this doodle`, in the review of a kept Jam
session, brings back an older doodle the same way, from either mode.

A bar above the staff says what is going on, so the player never wonders why the staff shows a
phrase in Jam mode: "Jamming again on your doodle: phrase 1 continues it. Leaving Jam mode lets it
go." At its end, `New doodle` lets the doodle go at once and brings back the empty staff, ready
for a new idea. It asks for no confirmation: the doodle stays in the kept session it came from,
whose review offers it again, so nothing is lost by one press.

The doodle stays through every setting change. A change of anything phrase 1 is written from,
Jam's key or mode, its harmony, the drift, the rhythm lock, the instrument, rewrites phrase 1 from
the doodle at once, so the phrase on screen always says what the next Jam will play, and a Jam
never needs to ask whether to start on a phrase made before the settings changed. The tempo
rewrites nothing, since it changes no note. The doodle goes only when the player says so, with
`New doodle`, by leaving Jam mode, or by deleting the session it came from, since deleted means
gone, the doodle included. It lives for the visit only and is never saved; the kept session's
review offers it again after a reload. A Jam on it that ends before phrase 1 keeps it, and so does
a controller lost or unplugged: the doodle is the player's idea, not the cable's.

The bar holds still during a Jam played on the doodle, like the notice row above the staff, so
that a start never moves the staff; it appears and leaves only at idle, after something the player
did. It sits between the score toolbar and the staff, where a generation failure message would go,
rather than in the row above the staff, which belongs to the starting note and the session.

## The Suggestion's Place

The key and mode suggestion is offered where the player can answer it: in the Jam's review, and,
while the doodle is kept, in the bar that holds it. "Your doodle sounds like G Dorian." with two
buttons named by what they do, `Jam in G Dorian` and `Keep C Major`, rather than "Use it" and
"Keep mine", which would make the player look elsewhere to know what each changes. `Jam in` says
which key it changes: Jam's, never session mode's. Using it at idle sets Jam's key and mode and
writes phrase 1 again from the doodle in them, so the next Jam continues the idea in the key it
sounds in; the bar then says "Jams now play in G Dorian." Keeping their own changes nothing, and
that doodle is never offered the suggestion again, since the same doodle always gives the same
answer. The sentence that says a doodle uses notes outside the app's keys and modes belongs to the
review, where the doodle is written out; at idle there is nothing to suggest, and the bar simply
holds the doodle.

## Leaving Jam Mode

Pressing `Session` at idle returns session mode exactly as it was left: the phrase on screen, the
phrases it had prepared, a message it was showing. The doodle Jam mode kept is let go, silently,
since it belongs to Jam mode; its kept session still offers it. Session mode was set aside, not
replaced, so there is nothing for the player to redo and nothing generated that they did not ask
for. The one thing that can have changed is shared: the instrument. When the player changed it in
Jam mode, session mode takes the change on return as though it had been made there, writing a new
phrase for the new instrument, since a phrase written for another instrument's range would not be
theirs to play.

## What Is Never Shown

- **The doodle's notes during the Jam.** No played note is ever drawn live; the review shows the
  doodle as the app heard it, and the played notes under it on request.
- **Rhythm changes and forced bends.** With the rhythm lock on, a phrase that changes the rhythm
  in one of the ways the player allowed, or that takes the nearest workable rhythm because the
  locked one cannot make a phrase, is played and read as written. A mark on the staff would pull
  the eyes off the notes for something the player cannot act on mid-session, the way a repeated
  phrase has never been marked.
- **Which attempt wrote phrase 1.** The extended wait and the fallback show nothing but "Writing"
  lasting a little longer.
- **A grade of any kind.** The suggestion is a suggestion; a doodle that fits no mode is said so
  plainly, never with a wrong note named; uneven taps are never judged.

## What Was Left Out

From [master spec C2](../../../specs/versions/v3/master-spec.md#out-of-v32) and
[the Jam re-scope](../../../specs/versions/v3/jam-mode.md), and why it shapes nothing here:

- **The doodle's exact rhythm.** The phrases match the nearest rhythm the app can write; the exact
  one needs a later rhythm editor.
- **Quoting the doodle**, developing it by named operations, or choosing chords to fit it: later.
  A fourth drift position waits for those operations.
- **A new doodle during a running Jam**: it would need a played signal, which comes later at the
  earliest. Stop, press `New doodle`, and start a new Jam.
- **A tempo inferred from a doodle played freely, without a click**: a research problem, and it
  fails worst for the players Jam is for. Tapping sets the tempo instead, before the doodle.
- **A Jam started without a controller**, a drone under the doodle, a doodle taken from a file or
  a past session's phrases, a pickup or tie across the join: later or never.
- **The suggestion during a Jam, or a list of every candidate it weighed**: only the drawn answer
  is shown, and only afterwards.
- **Presets, Vary settings, Tension across phrases and Rising tempo in Jam mode**: session tools
  for steering variety; in a Jam the doodle and the drift do that job.
- **Any grading, scoring, ranking or wrong-note signal**: permanently out.
