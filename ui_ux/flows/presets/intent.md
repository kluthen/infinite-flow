# Presets Intent

> **New in v3.1.**

Until v3.1 the player chose between two fixed styles, Neutral and Jazz, inside the foundation
group, and could not say which decorations the melody should use. v3.1 gives every setting a
generator reads a named starting point: a **preset**, chosen in one step from a dropdown at the
top of the controls, before any of the settings it fills in. Eight built-in presets ship with the
app, and the player can keep their own under a name. A preset may also say which keys and modes
it is meant for; the key and mode controls then mark them, and nothing is ever blocked. This flow
covers choosing a preset, the Custom state a change leads to, that key and mode guidance, and
saving, renaming and deleting presets of one's own. The embellishment levels a preset sets are a
group of the controls (`screens/phrase-workspace/`); the sheet presets are saved in is
`screens/preset-sheet/`.

The words follow the [lexicon](../../../docs/music/lexicon.md): a
[built-in preset](../../../docs/music/lexicon.md#built-in-preset), a
[player preset](../../../docs/music/lexicon.md#player-preset),
[Custom](../../../docs/music/lexicon.md#custom) and the
[key and mode restriction](../../../docs/music/lexicon.md#key-and-mode-restriction). On screen the
key is the **Written key** control and the mode the **Collection** control; together they make
what a musician calls the key, such as "G Dorian".

## Whose Flow This Is

From [`specs/personas.md`](../../../specs/personas.md) and
[master spec B3](../../../specs/versions/v3/master-spec.md#b3-personas-and-goals-served), primary
persona first:

- **P1, the Curious Improviser** (the primary persona) — **G1, vocabulary by exposure**, served
  much more than before. A style preset brings its mode or chord plan with it (Reel, Bebop, Pop
  song, Modal (Dorian)), so choosing one is enough to hear what it sounds like, and Gentle is a way
  in for a player new to improvising. **G2, real-time reading and dexterity**, partly: Bebop
  favors both chromatic figures and Speed drill the chromatic approach, which bring accidentals to read at speed. P1 "pokes at
  settings to see what happens"; a player preset keeps what they found.
- **P2, the Speed Builder** — **S1, fresh material never memorized, at a steadily higher tempo**,
  partly: Speed drill is their setup in one choice, dense, varied, with most figures favored.
- **P3, the Fledgling Composer**, is not served directly (their goals are v3.0's and v3.2's), but
  Pop song gives song-like material of the kind a player keeps and exports, and Modal (Dorian) a
  steady two-chord bed to grow an idea on.

Player presets serve no goal by name. They are the owner's request and a comfort for every
persona: switching between a warm-up and a drill becomes one choice instead of ten.

## A Starting Point First

The preset box is the first thing in the controls, under the section's title and summary and
before the four musical groups, because choosing where to start comes before fine-tuning. In v2
the musical profile sat inside the foundation group, among the very settings it overwrote, so a
player could change Note density first and then lose that change by picking Jazz. With the
preset first, the reading order is the working order: pick a starting point, then adjust what
follows it.

It is a dropdown, the owner's direction and the most familiar list there is, by mouse, finger or
keyboard. Eight built-in presets and up to fifty of the player's own fit no row of buttons. The
list is split into three groups, **Practice** (Neutral, Gentle, Speed drill), **Styles** (Jazz,
Bebop, Pop song, Reel, Modal (Dorian)) and **Your presets**, so a preset the player can change is
always told from one they cannot. A line under the box says what the selected preset is for, in
plain words, including why Pop song and Bebop show Major rather than Ionian, and that a reel is
also worth trying in Ionian, which its restriction leaves out.

## Choosing a Preset

Choosing a preset sets every setting it holds at once: the ten controls that shape a phrase
(Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour,
Register, Leapiness, Arpeggio chaos) and the seven embellishment levels. It never touches the
tempo, the instrument or the options that act during a session: those are the player's own, and a
preset that switched Vary settings on would make that choice for them. Every preset holds every
one of these settings, so a preset always gives the same sound whatever was selected before it.
Unsaved changes are replaced without asking: the player chose a starting point, and a question
before every choice would make the dropdown tiring to explore. What they had is one choice away if
it was a preset, and saving first is always on offer while it is Custom.

A preset with a key and mode restriction moves the key or mode only as far as it must, each half
on its own: the written key, often chosen for the instrument or the piece being practised, stays
if the preset allows it, and otherwise the first value it lists is taken. Keeping the home note
and changing the mode is also how modes are usually heard and taught: the same home note in a new
colour (musicians call these parallel modes). The first listed value, rather than the nearest one,
makes the result predictable whatever the player had before: Reel always lands on Mixolydian, its
signature sound. In the instrument's written pitch:

| Before | Preset chosen | After |
| --- | --- | --- |
| G Ionian | Modal (Dorian): any key, Dorian | **G** Dorian: the key is allowed and kept |
| A Aeolian | Reel: any key, Mixolydian or Dorian | A **Mixolydian**: the first listed mode |
| A Dorian | Reel | A Dorian: already inside, nothing moves |
| C Ionian | Pop song: any key, Major | C **Major**: the same notes, with chords that lead home the way songs do |
| E Ionian | a player preset kept to G Dorian | **G Dorian**: one key and one mode, so both are set |

Choosing a preset is the player's own act, so the rule that the app never changes the key and
mode by itself still holds. The phrase on screen stays until the player regenerates it, as after
any change of settings between sessions: replacing it by itself would throw away a phrase the
player may still want to read, and only an instrument switch, which changes what the phrase is
written for, replaces it. Choosing the preset already selected changes nothing.

A preset can only be chosen between sessions, at Idle or with the review showing, and not while a
phrase is being generated, when every control is read-only.

## Custom and Its Base

As soon as the player changes a setting the selected preset holds, or picks a key or mode outside
what it is meant for, the box reads "Custom, based on Reel". Custom is not a preset: it says that
what the player has is no longer a saved preset, and it keeps the name of where they came from, so
they always know what they started from and that saving would keep it. The line under the box
says the same in a sentence and names the way out: save these settings as a new preset, or, when
the base is the player's own, save the changes into it.

Custom is decided by what the player did, never by comparing values: a setting changed back by
hand stays Custom. Comparing would make the label flicker between Custom and the preset's name as
the player explores, and would hide that they had touched anything. Only choosing a preset leaves
Custom, which is a single, visible act. Changing the tempo or the instrument never makes Custom,
since no preset holds them. Custom can also have no base at all, after the preset it was based on
is deleted: the box then reads "Custom".

The Custom label cannot be picked from the list: it is what the box shows, not a choice, so the
dropdown only ever offers real presets.

## The Key and Mode a Preset Is Meant For

A style wants its mode, while the player's key is often fixed by their instrument or their piece.
So a preset says which keys and modes it is meant for, and suggests rather than imposes them.
While that guidance is in force, the Written key and Collection controls mark the values it
allows with a small dot in the corner of each segment, and a sentence under the control says it in
words: "Reel is meant for Mixolydian or Dorian, marked. Any mode works; another one makes your
settings Custom." The dot is a shape, so colour is never the only signal, and it is distinct from
the selected segment's fill, so a marked value and a chosen value are never confused. No value is
ever disabled: the player may well want Reel's rhythm in Ionian, and a disabled segment would
forbid it.

Choosing outside is the way to opt out. The selection turns to Custom, based on the preset, the
marks and the sentence go, since the guidance no longer applies, and nothing else changes. Coming
back inside by hand brings the marks back; the selection stays Custom, as after any change.
Editing any other setting keeps the guidance in force: a reel with more syncopation is still a
Mixolydian or Dorian reel. Switching instrument keeps the written key, so it never takes the player
out of a preset's keys.

The marks and the sentence change only between sessions. During a session they keep what they
showed at the start, so nothing in the controls grows or shrinks while the player reads.

## Keeping What You Found

Four actions sit beside the box, as plain buttons, because keeping a setup is occasional work
next to choosing one: **Save as new preset**, always there; **Save changes**, only in Custom based
on a preset of the player's own; and **Rename preset** and **Delete preset**, only while the
selection is a preset of the player's own or Custom based on one, acting on that preset. A
built-in preset is the project's: it can be copied by saving it as new, never changed, renamed or
deleted, and the buttons' absence says so without a disabled button that explains nothing.

**Saving as new** asks a name, prefilled so that saving can be two presses, and which keys and
modes the preset is meant for: as now (the default: a reel saved from Custom based on Reel stays a
reel), only the current key and mode (the player's "G Dorian practice"), or any. A player cannot
build other lists; v3.1 keeps the choice to what a beginner can decide at a glance.

**Saving changes** into the player's own preset is one click, with no confirmation, since the
player asked for exactly that, as long as the key and mode are inside what the preset is meant
for. When they are outside it, keeping the old guidance would save a preset whose own key and mode
lie outside it, which would show as Custom again after the next load. So that one case asks first:
any key and mode from now on, or only the current one. Saving makes the preset the selection, out
of Custom.

**Renaming** asks only the name. The preset keeps its place: selected, or as Custom's base.

**Deleting** asks once, in the same short confirmation every deletion in the app uses, and says
what the player most needs to hear: their settings stay as they are. The selection becomes Custom
with no base and the same values, so nothing is regenerated and nothing changes but the label and
the guidance, which went with the preset.

A preset can also be deleted from **Your data**, which lists every preset of the player's own by
name, each with its own `Delete`, behind the same confirmation. That second place exists for the
player at the limit. In the controls a preset is deleted by choosing it first, and choosing it
replaces the settings on screen: a player with unsaved Custom settings they want to keep as a new
preset could only make room by throwing them away. From Your data no preset is chosen, so the
selection's values never change; deleting the preset in use, or the one Custom is based on, only
turns the label to Custom with no base, as it does from the controls.

A name is refused as it is typed, with the reason under the field, and the sheet waits until it is
fixed: an empty name, a name another preset already has (ignoring capitals, built-in names
included), and "Custom", which the box uses. Waiting for the press of `Save` to refuse would make
the player read an error after they thought they were done. The player keeps at most fifty presets
of their own; at the limit `Save as new preset` is unavailable with the reason beside it, which
names both places to delete one: "Delete one, here or in Your data, to save a new one." The limit
keeps the dropdown usable, not the storage.

Every save is silent, as every save in the app is. A save the browser refuses keeps the preset for
the visit, so the player can go on using it, and says so at once, in the notice row at the top of
the workspace, in words about the preset: managing presets happens outside a session, so there is
no reason to wait.

## During a Session

A session plays the settings it started with. The box is read-only and the buttons are disabled,
like every control. When the player has turned Vary settings on, the app may move one setting a
preset holds, a control or one embellishment level by one step (the figure step, which replaces
v2's switch between Neutral and Jazz); the box then reads "Custom, based on Reel" from the moment
the first phrase built with the change starts sounding, as every change the app makes shows, and
the selection comes back with the settings when the session ends. The line under the box keeps the
text it had at the start, and the buttons stay the ones the row held: nothing below the staff
changes length mid-session. Vary settings keeps its key and mode moves inside what the preset is
meant for, so the app never opts the player out of their preset by itself; its note says so.
Tension across phrases changes only what each phrase is generated with, never the setting, so it
never makes Custom. See [`flows/play-session/`](../play-session/intent.md).

## When the Page Loads

The selection is kept with the settings and comes back at load, and the settings win: if what was
saved no longer matches the preset (a built-in retuned by a later version, a player preset changed
in another tab), the box shows Custom based on it, or Custom when the preset no longer exists.
Loading never moves the key or mode: the player's sound never changes behind their back. Settings
kept by v3.0 come back as the built-in preset they named, Neutral or Jazz, or as Custom based on
it; the only trace of that migration is the selection the box shows.

## When Nothing Can Be Saved

In a tab left open after a newer version saved data, and in a visit that could not read the saved
data and started from the defaults, nothing is saved, and the workspace already says so in its
notice. Presets made or changed there last for the page, with no notice of their own; one notice
about the visit is enough. No preset can be deleted there, as no kept data can: deleting from a
visit that cannot see, or must not overwrite, what is kept could destroy what another version
saved. A visit that could not read the saved data lists the built-in presets only; an outdated tab
lists the player's presets it read.

## Prepared Phrases

Between sessions the app prepares the next phrases a session would play (see
[`flows/generate-phrase/`](../generate-phrase/intent.md)). A preset choice that changes anything,
an embellishment level, and any change to which keys and modes are in force discard them, since a
session would no longer play them; saving, renaming or deleting that changes neither a setting nor
the guidance in force keeps them. None of this shows.

## What Was Left Out

From [master spec B2](../../../specs/versions/v3/master-spec.md#out-of-v31):

- Ornaments (grace notes, trills, turns and the like), which come in a release of their own after
  v3.2, and every figure beyond the seven.
- Richer presets: rhythm patterns, range or note restrictions, tempo or instrument preferences.
- Built-in Blues, Bossa and Baroque presets, which need sounds the app does not make yet.
- Free lists of keys or modes, and pairs such as "D Mixolydian or A Dorian"; a built-in preset
  that restricts keys.
- Exporting or sharing a preset, saving "this phrase's settings" from the review, and hiding a
  built-in preset.
- How presets meet v3.2's Jam, its key and mode suggestion and its rhythm lock: v3.2's matter.
- A confirmation before choosing a preset over unsaved Custom changes: choosing is how a player
  explores, and the Custom label and its sentence already say saving is possible.
