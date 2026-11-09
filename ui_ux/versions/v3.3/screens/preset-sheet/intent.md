# Preset Sheet Intent

> **New in v3.1.**

Keeping a setup under a name is occasional work, done between sessions, with the hands free. It
needs a short form the player fills in and closes, over a workspace left exactly as it was, so it
is a sheet, like the My instrument and Your data sheets. The flow it belongs to, and what each
action does to the selection, is [`flows/presets/`](../../flows/presets/intent.md).

## One Sheet, Four Short Modes

Saving a new preset, saving changes into one when the player has left its keys and modes,
renaming and deleting all happen in the same sheet, each mode showing only what that action needs.
Save as new asks a name and which keys and modes the preset is meant for; renaming asks the name
only; saving changes asks nothing when the key and mode are where the preset expects them, and in
the one case where they are not, asks only that question; deleting asks for confirmation. One
sheet keeps one place, one look and one way back for everything a player does to their presets,
and each mode stays small enough to read in a glance. The persona it serves first is the Curious
Improviser (P1, from [`specs/personas.md`](../../../../../specs/personas.md)), who pokes at settings to
see what happens and wants to keep what they found; switching between a warm-up and a drill serves
every persona.

## The Focal Point

In Save as new and Rename, the focal point is the name field: the sheet opens with focus in it and
its text selected, so the player either types a name straight away or accepts the suggestion. The
suggestion, "My preset", numbered when taken, means saving is never blocked by having to invent a
name, and selecting it means it never has to be deleted by hand first.

The **Key and mode** choice comes second, because most players keep its default. It offers what
the spec allows and nothing more: as now, only the current key and mode, or any key and mode. "As
now" is first and checked, because it is what a player who saves a customized reel expects: their
preset is still a reel, meant for Mixolydian or Dorian. "Only G Dorian" is how a player keeps a
setup for one piece. "Any key and mode" lets a preset be a pure sound, like Neutral. The three are
written out in words, "As now: Mixolydian or Dorian in any key", rather than as codes, because a
beginner should not need the lexicon open to save a preset. When two of them would mean the same
thing (no restriction in force, so "as now" is "any"), they are one option, so the player is never
asked to choose between two names for one result. A short line under the label says what the
choice does: choosing the preset later moves you inside them, and nothing is ever blocked.

The choice is a vertical list of full-width options, the same shape as the connection sheet's
device list, rather than a row of segments, because its labels are sentences of different lengths
that must stay whole on a phone.

## Saving Changes, and When It Asks

Saving changes into a preset of the player's own is normally one click with no sheet at all: the
player asked for exactly that, and a confirmation would only slow down the common case. The sheet
appears in one case only, when the key and mode are outside what the preset is meant for. Saving
then without asking would keep a preset whose own key and mode lie outside its guidance, and after
the next load it would show as Custom again, which would look like a save that did not work. So
the sheet says why it asks, in one sentence naming the key, the mode and what the preset was meant
for, and offers the two answers that keep the preset consistent: any key and mode from now on (the
default, since the player has just shown they want to leave the old guidance), or only the current
key and mode.

## Refused Names

A name is refused as it is typed, with its reason under the field, and the main button waits until
it is fixed: an empty name, a name another preset already has, built-in names included and capitals
ignored, or "Custom", which the preset box uses for its own label. Telling it live means the player
never presses Save and then reads that it did not work. The reason is one calm sentence in the
notice tone, never the error tone: choosing a taken name is not a fault. It is spoken to a screen
reader as it appears, because on a phone the sheet may scroll and the line sit out of view; the
disabled button says the same to everyone else. Names stop at forty characters, which is enough
for "Bebop in B-flat for the Thursday band" and keeps the preset box readable.

## Deleting

Deleting uses the confirmation every deletion in the app uses: a question naming the preset, one
sentence saying what matters most here, "Your settings stay as they are.", and "This can't be
undone.", with the deleting action in the error tone and `Cancel` focused, so a stray Enter never
deletes anything. What the player most fears when deleting a preset they are using is losing the
sound they have; the sentence answers that before they ask. Nothing is regenerated: the selection
simply becomes Custom, with the same values.

## What Was Left Out

- A field to type lists of keys or modes: v3.1 keeps the restriction to three choices a beginner
  can decide at a glance.
- A confirmation before `Save changes`: the player asked for it, and the preset can be changed
  again at any time.
- A success message after saving: every save in the app is silent; a failed one is told, once, in
  the notice row.
- Editing a preset's settings inside the sheet: the controls on the workspace are where settings
  are changed, and the sheet only names and keeps them.
