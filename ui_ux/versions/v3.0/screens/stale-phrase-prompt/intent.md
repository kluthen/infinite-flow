# Out-of-Date Phrase Prompt Intent

> **New in v3.**

## What This Screen Is

Between sessions, changing a setting never regenerates the phrase on screen: the player sets the
controls, reads the phrase, and asks for a new one when they want it. A session starts from the
phrase on screen, phrase 1, and runs on the settings the controls show. So the phrase on screen
can have been made before the player changed something it was made from: the written key, the
collection, the register. Before v3.0 that start failed silently at most tempos. Now the app
says so, at the moment it matters, and asks what to do: make a new phrase with the current
settings, or start with this one.

The prompt is a small sheet over the workspace, shown at Start, or when the player plays the
starting note, and only when the phrase on screen is out of date. When it is not, Start starts
as it always has and nothing is asked. How the start runs around it is in
[`flows/play-session/`](../../flows/play-session/intent.md#starting).

It serves the Curious Improviser (P1) first, from
[`specs/personas.md`](../../../../../specs/personas.md): a beginner at improvisation who changes a
setting to hear what it does (vocabulary by exposure, P1.G1), and who would otherwise read one
phrase in the old key before the music turns to the new one, without knowing why. The Speed
Builder (P2), who starts session after session (P2.S1), meets it only after changing a setting
the phrase is made from, never after changing the tempo.

## Asking Only When It Matters

The design holds that starting a session never asks anything: an "are you sure?" before every
Start would tax every session for the rare one where it helps. This prompt keeps that rule's
reason. It never appears on a phrase made under the current settings: a setting changed and
changed back is no change, and the tempo, the session options, the audio mix and the theme never
make a phrase out of date, since none of them changes what phrase 1 is. It appears only when
starting would play a phrase that is not what the player's settings make, which the player may
not have noticed: they may have changed the key while looking at the controls, not at the staff.

## The Words

The player is a beginner in music theory and may be at the instrument, so every line is short,
uses the app's own words, and names no mechanism. "Stale", "generate", "carry-in" and "settings
the generation reads" never appear.

- **The title says what is true:** "This phrase is from before your changes." A question title,
  the confirmations' habit, would have to pick one of the two answers to ask about, and both are
  good answers.
- **It names what changed**, by the controls' own labels, "Since it was made, you changed
  Written key and Register.", so the player can see at once that the prompt is about their own
  edit, and can check it is the one they meant. A list longer than three names its first two and
  counts the rest ("Written key, Register and 4 other settings"): naming fourteen controls would
  bury the choice under a list nobody reads.
- **It says what each answer means for the music**, naming each answer by its button: "Regenerate
  phrase makes a new phrase with your current settings. Start with this phrase plays this one
  first; the phrases after it use your current settings." That is the whole difference between
  the two, and the one thing a player cannot guess. "Uses" and "makes with", never "follows",
  which could also mean "comes after".

## The Two Answers

The owner named them Regenerate and Use it. On screen they read **Regenerate phrase** and
**Start with this phrase**.

- **`Regenerate phrase`** is exactly the header's `Regenerate phrase`: the same action, the same
  words. A player who learns it here learns the header button too, and can press it before Start
  next time. It is the primary answer: the player's last act was changing a setting, which says
  they want what that setting makes. It also starts nothing, so it is the safe answer for a
  keyboard player who presses Enter on the focused button.
- **`Start with this phrase`** says what happens, the session starts, and which phrase it starts
  on. A bare "Use it" would leave the player wondering what "it" is, and the word clashes with the
  key and mode suggestion of a later release, whose buttons the design already names by what they
  do. The phrases after phrase 1 follow the current settings; phrase 2 joins phrase 1 as it would
  after a setting changed during a session, so nothing in the music jars.

Regenerating does not start the session as soon as the new phrase is on screen. The player sees
the new phrase, and its new starting note, before playing it: phrase 1 is always the phrase the
player could read at idle. They press Start again, or play the new starting note, and nothing is
asked, since the new phrase is up to date.

## While It Shows

The prompt is modal. Everything behind it waits: the controls, the header, the audio mix, the
theme. A player who wants to change something else first closes the prompt, which changes
nothing, and changes it. Letting the controls stay live would let the player change the very
settings the prompt is listing, and the list would be wrong the moment they did. No note played
on the controller starts anything while it shows, the starting note included: the player has to
choose, and a note played while choosing is not a choice.

## When the Starting Note Opened It

A player at the instrument plays the starting note, hears no count-in, and looks up. The prompt
then opens with one more line, first: "Your note didn't start the session. Nothing you play will
until you choose." The player learns at once that nothing is broken and that playing again will
not help. Below the two answers' sentence, a quiet hint says what may change if they regenerate: "A
new phrase may start on a different note: the line above the staff names it." Without it, a
player who regenerates and then plays the old starting note would hear nothing and not know why.

The choice itself needs a click, a tap or a key press: a note cannot answer a question with two
answers. Focus is already on `Regenerate phrase`, so a player with a computer keyboard in reach
presses Enter, reads the new note, and plays it; the session starts with no further step. A
player who prefers this phrase taps `Start with this phrase` and the count-in begins.

## Closing It

`Close`, Escape and a press on the backdrop close it, as every sheet closes, and change nothing:
the phrase stays, the settings stay, no session starts. The next Start asks again, since nothing
has changed. If the window changes while it shows so that no session could start (the staff left
without room, or the phrase replaced to fit), the prompt closes by itself: a question about a
start that can no longer happen is not left on screen.

## The Phone

The phone is the third display. It gets the same sheet, filling the width, the two answers
stacked, `Regenerate phrase` on top; the sentences wrap, and the sheet scrolls inside itself on a
very short screen. Nothing is dropped and nothing is added.

## What It Deliberately Leaves Out

- **No "don't ask again".** The prompt appears only when the phrase is out of date, and a player
  who wants to skip it has one press that does: `Regenerate phrase` before Start.
- **No mark on the staff or in the cue row before Start.** The starting-note line keeps naming
  the note that begins the start; marking every edit there would make the line change under the
  player's hands while they set the controls, and the prompt says it at the only moment it
  matters.
- **No values.** The prompt names the controls that changed, not their old and new values: the
  controls show the new ones, and the old ones are in the phrase on screen.
- **Never during a session.** Once a session starts, nothing is asked until it ends.
