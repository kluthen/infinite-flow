# My Instrument Intent

> **New in v3.**

The app reads and writes music in the selected instrument's written pitch, and until v3.0 that
instrument had to be one of three built-in profiles: C MIDI keyboard, B-flat tenor saxophone,
E-flat alto saxophone. A player whose instrument goes further than its profile, or whose
controller sends notes no profile expects, had to live with a written part that was not quite
theirs. This flow lets the player describe one instrument of their own, once, starting from the
closest built-in profile: a name, a range in written notes, and how a written note sounds. The
app keeps it on the device, and it stays the fourth choice of the instrument control from then on.

## Whose Flow This Is

From `specs/personas.md`, primary persona first:

- **P1, the Curious Improviser** (the primary persona) — **G2, real-time reading and dexterity.**
  They read in their own instrument's written pitch, and they are not tied to one instrument: a
  tenor saxophonist whose instrument reaches below the profile's range, or a wind-controller
  player whose part sits elsewhere, reads phrases that use their whole instrument once it is
  described. It also serves their goal when the controller and the profile disagree: the
  transposition check can make my instrument follow the controller (see Two Ways In).
- **P2, the Speed Builder** — **S1, an endless supply of fresh material read at a steadily higher
  tempo.** Often on a keyboard or a generic MIDI controller and reading concert pitch, they are the
  player for whom a two-octave keyboard range is too narrow and no saxophone profile fits; a wider
  range gives the generator more room for material they cannot memorize.

The Fledgling Composer (P3) is not served by this flow in particular; they benefit as any player
does when the phrase sits in their instrument's range.

## One Instrument, Made From a Template

There is exactly one player-made instrument. The flow starts it from one of the three built-in
profiles, the one selected by default, so a player changes only what differs from an instrument
they already know. The built-in profiles stay as they are and stay selectable, so making an
instrument never takes anything away.

What the player can set is what they know about their instrument: its name, its lowest and highest
notes as they read them, and how a written note sounds. What they cannot set is what the app
derives: the Low, Middle and High windows the Register control picks from are computed from the
range exactly as for the built-in profiles, so a player can never make a window the generator
cannot fill. The reasoning behind each field is in `screens/my-instrument/intent.md`.

## Where It Lives on the Workspace

My instrument is a fourth choice in the instrument control, labelled with its name, and appears
only once it exists: an empty fourth segment, or one reading "Create…", would put a setup task
inside a control the player uses to pick, every practice sitting. Making and changing it go
through one button under the control, `Create my instrument` before it exists and `Edit my
instrument` after, beside the control it changes and nowhere else. It is rare work, so it gets a
plain button, never the emphasis of the phrase action or the session action.

A sheet suits the task: a short, self-contained form the player finishes and closes, over a
workspace left exactly as it was. A separate page was rejected for the same reasons it was
rejected for the connection sheet: the controls, the phrase and the review would have to be rebuilt
on the way back.

## What Saving, Changing and Deleting Do to the Phrase

My instrument behaves like any instrument profile, so the rules a player already met for switching
profiles apply unchanged:

- **Saving a new instrument selects it.** The player made it to use it; a new segment they then had
  to click would be one more step for nothing. Selecting it replaces the phrase exactly as a
  profile switch does, with a fresh phrase in the new range.
- **Saving a change to the selected instrument** replaces the phrase the same way, when the change
  touches the range or the transposition: the phrase on screen was made for the old instrument and
  may not fit the new one. A new name alone changes no note, so the phrase stays.
- **Saving a change to my instrument while another profile is selected** changes nothing on screen
  but the segment's label. The player edited it; they did not ask to switch.
- **Changing the transposition keeps the written range.** The range is the notes the player reads,
  which do not change when they learn their instrument sounds a semitone lower than they thought;
  the sounding range moves with the transposition.
- **Deleting it** returns the instrument control to the profile it was made from, when it was the
  one selected, which replaces the phrase as a profile switch does. When another profile was
  selected, nothing on screen changes but the missing segment.

None of these asks for confirmation, except deleting: it is the only step that removes something
kept, and it asks once, in the sheet, naming what goes.

## Two Ways In

The sheet is the way to make and change my instrument by hand. The other way in is the
transposition check in `flows/controller-connection/`: when the controller does not match the
selected instrument, the check offers to make my instrument follow it, creating it from the
selected profile if it does not exist yet. That path exists because the most common mismatch is a
controller left at its own default, sending the written note untransposed, and a player who would
rather not dig through their controller's settings can make the app follow the controller instead.
It changes only the transposition, after one confirmation; everything else about my instrument
stays as it was, and the sheet remains the place to change the rest. The check's side of this is
specified in the controller-connection documents.

## When It Can Happen

At idle and while the review shows, like every other control: saving then replaces the phrase
under the review, the one the staff will have for the next session, exactly as changing any
control does. Never during a session: the button is disabled for the whole session, like every
control, and while the sheet is open no session can start, not even from the starting note,
because a count-in starting behind an open form would be a surprise with both hands off the
instrument.

## What Is Kept

My instrument is kept on the device and comes back after a reload, selected if it was selected.
Saving it is silent, like every save. The first time it is saved the app also asks the browser to
protect its kept data, as it does on the first pin or favorite; that request shows nothing, and
`Your data` reports whether the browser agreed. A save the browser refuses is told after the sheet
closes, in the workspace's notice row (`flows/saved-data/`), and the instrument still works for
the visit. Deleting my instrument does not forget the remembered controller: they are independent
things, and a player rebuilding their instrument should not have to reconnect.

## What Was Left Out

- **More than one instrument of one's own.** The master spec keeps one; a list of instruments
  would need a manager this version does not need.
- **Editing the Low, Middle and High windows.** They are derived, as for every profile.
- **A concert-pitch display.** Notation shows the selected instrument's written pitch, as in v2.
- **Interval names for the transposition.** Semitones and one written-to-sounding example are what
  a beginner can check; "a major ninth below" is a translation step.
