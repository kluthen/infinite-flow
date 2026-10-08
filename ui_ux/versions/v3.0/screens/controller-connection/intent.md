# Controller Connection Screen Intent

> **Changes since v2**
>
> - _New:_ the check's result offers to use it for my instrument, through a confirmation inside
>   the sheet ([Using the result for my instrument](#using-the-result-for-my-instrument))
> - _New:_ the check runs against my instrument when it is selected; Connected can be reached
>   straight away for the remembered controller ([Focal point per state](#focal-point-per-state),
>   [How the check result is worded](#how-the-check-result-is-worded))
> - _Changed:_ the app remembers one controller, never a history
>   ([What is demoted or absent entirely](#what-is-demoted-or-absent-entirely))
> - _Removed:_ "A player reconnecting the same controller for the tenth time sees exactly the same
>   screen as the first time" (v2 in the
>   [frozen copy](../../../v2/screens/controller-connection/intent.md#what-is-demoted-or-absent-entirely))

This screen is a sheet, not a route, and every state is built to be read in a few seconds and then
acted on or dismissed — nothing here asks for the sustained attention the phrase workspace does.
Each state has exactly one job, stated in its own title and body copy, with no competing message
on screen at the same time. It is only ever open between sessions, so it never competes with a
running phrase.

## Focal point per state

**Requesting access** has no decision to make; its job is to show that something is happening, so
a pause after clicking `Connect controller` does not read as nothing happening. When the browser
is showing its own permission prompt, the sheet says so and points the player at it — a player who
does not notice the browser's small prompt near the address bar would otherwise wait on a sheet
that seems stuck.

**Unsupported browser**'s job is to say plainly that this browser cannot see a MIDI controller at
all, and that practicing works exactly the same without one. There is no retry: the fix (a
Chromium-based browser) is outside anything this sheet can do.

**Permission denied**'s job is to say that the browser has blocked MIDI for this page and to tell
the player how to allow it again: open the site settings from the icon at the left of the address
bar, set MIDI devices to Allow, and then check again. It deliberately stays at that level of
detail — the site-settings icon and the name of the permission — rather than step-by-step
instructions for each Chromium browser and version, which this design set could not keep accurate.
This is the one state in this sheet shown in the theme's error tone, because it is the one state
the player cannot fix from inside the app. `Check again` is worded and placed as the step after changing that
setting, not as a retry that could work on its own.

**No device found**'s job is to say that no MIDI input was seen, and to name the one physical fact
that resolves it: the controller needs to be plugged in and switched on. It does not try to tell
"you have no controller" from "it isn't plugged in yet" from "your computer hasn't recognized it" —
those all lead to the same next step. Plugging a controller in while this state is showing moves
the sheet on by itself, so the player's natural action is also the fix.

**Multi-device picker**'s job is to get one device chosen. It shows every input the browser
currently reports and nothing else — no last-used marker, no reordering by recency, no capability
detail — because none of that changes which one the player wants right now. The list keeps up with
what is plugged in: a device plugged in joins the end of the list, so nothing moves
under the pointer, and an unplugged one leaves it. Moving through the list with the arrow keys only
moves; choosing takes Enter, Space, or a click, so a player scanning the list with the keyboard
never starts a check on the wrong device by accident.

**Transposition check**'s job is to get one note played and report, in plain words, how what the
controller sent relates to what the current instrument profile expected. It shows exactly one
written note, engraved like the score, from the current instrument profile's range, and one
instruction: play it. Once played, it shows exactly one result with its suggestion. Nothing else
competes: no history of earlier runs, no tally of attempts, no countdown. The note played here
never starts a session; the check is its own step.

**[v3 new]** When my instrument is the selected instrument, the check is about it: the note comes
from its range and the result names it. A result that is not a match adds one action after
`Continue`, `Use this for my instrument`, which leads to a confirmation inside the sheet (see Using
the result for my instrument). A match has nothing to fix and offers nothing more.

**Connected**'s job is to confirm which device is in use and offer the few things a player might do
with a working connection: re-run the check, switch device, disconnect, or finish. It is the one
state allowed to feel like a resting point rather than a step, because for a player who is done
with this sheet, it usually is.

**[v3 new]** Two things can bring the player here that v2 did not have. The controller remembered
from an earlier visit, found among the inputs, goes straight to Connected, with one quiet line
saying it is the one chosen last time and that the check can be run again if its settings changed:
the check was done then, and a reload does not change the controller. And using a check result for
my instrument lands here with one line saying my instrument now matches the controller, so the
player sees the outcome of what they just confirmed before they close the sheet.

## How the check result is worded

The result names the current instrument profile and says which way the controller is off, because
a player cannot act on "transposed by 14" without knowing whether to turn a setting up or down, or
which profile the app assumed. Distances are in semitones, the smallest step between two notes; at
12 or more, the octave breakdown follows in brackets — "14 semitones (1 octave and 2 semitones)"
— since an octave is 12 semitones and many controllers have a separate octave switch. A shift of
exactly one or more whole octaves is described only in octaves.

The first suggestion is always the controller's own setting, because a controller left at its
default is the most common cause. A different instrument profile is suggested only when one of the
other two profiles would make the played note match exactly, framed as "if you actually play…" and
naming the instrument, because the player chose the profile to describe what they play and the app
should not second-guess that choice without a reason. With three profiles transposing by 0, 9, and
14 semitones, that happens only for an offset of 5, 9, or 14 semitones in the right direction; no
profile can match a whole-octave offset, so for that case the octave setting is the only
suggestion.

**[v3 new]** When my instrument is selected, the result names it instead of a profile, as "your
instrument, {name}", so the sentence reads naturally whatever the player called it, and the
profile suggestion looks at all three built-in profiles. My instrument is never the suggested
profile: `Use this for my instrument` already offers to make it match.

The result uses the same neutral notice style whatever it says. A match is not a pass and an offset
is not a fail: both are facts the player now has, each with one thing to do.

## What is demoted or absent entirely

There is no connection history or log anywhere: no list of previously seen devices beyond what the
current picker needs, no record of how many times the check has been run, no timestamp of the last
connection. None of that changes what the player should do next, and the product keeps nothing
about the player to be judged by.

**[v3 changed]** The app remembers one thing: the controller last chosen, so it can reselect it at
the next visit. That is a convenience, not a history: one device, replaced by the next choice,
forgotten on `Disconnect`, never shown as a list. A player reconnecting a controller they have
never connected before sees exactly the same screens as the first time; the remembered one skips
them.

There is no MIDI settings surface beyond choosing a device: no input-channel filter (every channel
is read), no latency calibration (a later version's concern), no renaming a device. Anything not
needed to get from "no controller" to "connected and checked" is left out.

## Using the result for my instrument

**[v3 new]** `Use this for my instrument` is a plain button after `Continue`, never the primary
action: the result's own suggestion, the controller's setting, stays the first thing offered, and
the player who just wants to play continues as before. Choosing it does not act at once. It
changes something kept, so the sheet first shows a confirmation in its own place, not a second
dialog over it: one question as the title, what will change in plain words ("A written C4 will
sound as B♭2.", and, when my instrument does not exist yet, that it will be made from the selected
profile, with its name and range), and two actions, `Use for my instrument` and `Back`. Focus
lands on `Back`, so a player pressing Enter out of habit changes nothing.

**[v3 new]** The confirmation stays inside the sheet because the sheet is where the player already
is, and a sheet stacked on a sheet would leave two `Close` buttons and two backdrops to reason
about. Its way back is a way back, not a way out: `Back`, Escape, the backdrop and `Close` all
return to the result the player was reading.

## Why a sheet, and why dismissing is always available

A modal sheet over `phrase-workspace` keeps the player's workspace — controls, the phrase on
screen, the Review, scroll position — untouched underneath it and visible again the moment it
closes. The dismiss paths are available in every state because none of this flow is a gate. A
player can close the sheet from `Permission denied` having fixed nothing, from the picker having
chosen nothing, or from the check having played nothing, and land on an entirely normal workspace.
A session without a controller is not a degraded session; it is one of the two ordinary ways to use
the product.

`Continue without a controller` is written out on the states before a device is chosen, so that
skipping reads as a legitimate, named option rather than something discovered by noticing the
sheet can be closed. After a device is chosen, that invitation no longer makes sense — there is
already a controller — so those states rely on `Done`, `Close`, Escape, and the backdrop.

## Focus

Keyboard and mouse users are the target. Each time the sheet moves to a new state, focus goes to
that state's main action, so a keyboard player can keep going with Enter without hunting. When the
sheet closes, focus goes to the workspace's session action, `Start session`: the player is most
likely about to play. When `Start session` is disabled, focus goes to the phrase action instead,
since getting a playable phrase on screen is then the next step. When both are disabled, while a
phrase is generating or the rhythm settings cannot form one, focus returns to the header element
that opened the sheet, the one control always usable between sessions. Everything that matters is shown as visible text; nothing depends on being read aloud.
