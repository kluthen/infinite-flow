# Look Up a Word Intent

> **New in v3.4.**

> **Draft, proposed.** Moves to `ui_ux/flows/look-up-a-word/` once the owner has ruled.

## Whose Flow It Is

It serves the Curious Improviser (P1) of [`specs/personas.md`](../../../../../specs/personas.md),
between sessions: vocabulary by exposure (P1.G1), "get to know the possibilities rather than
study theory". P1 pokes at settings to see what happens and meets words the controls, a preset or
the review use (Leapiness, Figure level, an enclosure, a seventh chord). The flow lets them look
such a word up without leaving the app or going online, and come back to the workspace exactly
as it was. The Speed Builder (P2) and the Fledgling Composer (P3) can use it the same way; no
step is designed for one of them alone.

## Why It Is a Short Detour

The workspace is the product, and the lexicon is a side page that supports it. So the flow is a
detour that always returns where it started: one button in the footer, a page over the
workspace, and one way back, to the same workspace, the same phrase and the same settings. It
never changes anything the player set, so the player can open it in the middle of trying out a
control and lose nothing.

It cannot open during a session, nor can a session start while it is open. During a session the
player's hands are on the instrument and nothing may need a click; a reading page has nothing to
offer then, and a session starting under it would sound with the staff out of sight. This is the
same rule as the Your data sheet's, for the same reason.

## Why the Footer

The header is full and belongs to playing: the mode switch, the session action, the controller.
The footer already holds the app's one side page, `Your data`, and is reachable from every
state outside a session, the review included. A beginner who wonders about a word looks for help
at the edge of the page, not among the controls. The link is plain, beside `Your data`, with no
icon.

## Why Back Should Close It

The page covers the whole window and reads like a page. On a page, people press Back to leave
it: the browser's button, a mouse's back button, Alt+Left, or the Android back gesture on a
tablet. Today the app has no history of its own, so Back from the lexicon would leave the app
altogether. Nothing is lost by that, since settings and the last session are kept on the device,
but it is a jarring way to finish reading a word, and a tablet's back gesture makes it easy to do
by accident.

So the proposal gives the page one history entry while it is open, and nothing more: Back
closes it, and closing it any other way removes that entry, so the browser's history never fills
with lexicon visits. Jumps inside the page add nothing: a beginner following related words from
Phrase to Cadence to Tonic would otherwise need many Backs to get home. This is a small new
pattern for the app (its first use of the address bar), which is why it is the owner's choice;
without it, the page still works, and Back simply leaves the app as it does from the workspace.

## What Was Left Out

- **A web address per word.** A link straight to one word would help sharing and the later API,
  but nobody in the personas sends links, and the API step will define its own addresses. Each
  entry already has a stable address inside the page (its `id`), so adding one later costs
  little.
- **Opening from other screens.** Word popups and links from the controls to the page are a later
  step; the page's entry addresses are what they will use.
- **Browsing by group.** The twelve groups are shown as a label on each entry, not as a way in.
