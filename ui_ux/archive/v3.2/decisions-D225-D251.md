# UI/UX Decisions

> **Archived 2026-11-09.** v3.2 (Jam) is released as version 3.2.0 (tag `v3.2.0` at f93e552d, 2026-11-09). These are the decisions D225-D251, kept verbatim
> with their section heading and intro: the v3.1 and v3.2 design of 2026-10-08, the entries v3.1
> shared with v3.2 included. Live summary: [README.md](README.md). Text was written from `ui_ux/`;
> it holds no link.

## v3.1 (presets and embellishment figures) and v3.2 (Jam) design, 2026-10-08

Inputs: `specs/versions/v3/master-spec.md` Part B (v3.1, cited "§Bn") and Part C (v3.2, cited
"§Cn"), approved by the owner on 2026-10-08; `specs/personas.md`; the lexicon. The owner asked for
both releases in one pass, settled by `ux-writer` under the standing delegation (D119, D135,
archived): minor issues settled here, phones low priority, a running session never asks the
player anything, one full owner review at the end. Implementation is paused: nothing in `src/` is
edited. Entries marked **(spec, provisional)** carry a recommendation on a spec gap logged for
`spec-writer` (Q70-Q72).

- **D225 — v3.0 frozen; v3.1 and v3.2 marked on top of v3.0's marks (2026-10-08).** The approved
  v3.0 design (D218, with the spec alignments D219-D224) is copied, marks included, into
  `versions/v3.0/` with a summary README, before any v3.1 edit at the root; only link paths were
  adjusted in the copy. The root keeps v3.0's marks (`[v3 new]`, `[v3 changed]`, the Changes since
  v2 blocks): v3.0, v3.1 and v3.2 are three releases of one version, designed back to back while
  v3.0 is still unbuilt, and the owner asked for them to be marked alike so each can be built on
  its own. So, at the root: a v3.0 change keeps `[v3 new]` / `[v3 changed]` and an unprefixed
  change-block item; a v3.1 change is tagged `[v3.1 new]` / `[v3.1 changed]` and listed in the
  change block as `_v3.1 new:_`, `_v3.1 changed:_` or `_v3.1 removed:_`; v3.2 likewise with
  `v3.2`. In code blocks and diagrams the same words go in the annotation or a `%%` comment. A
  document new in one of them carries `> **New in v3.1.**` (or v3.2). Removals link to the old
  wording in `versions/v3.0/`, which also holds every unchanged v2 wording. **v3.1 is built before
  v3.2**, so a v3.2 change to text v3.1 added is written as its own tagged paragraph or item,
  leaving the v3.1 text whole: a v3.1 builder reads everything but the `v3.2` tags. A v3.1 change
  to v3.0 or v2 text replaces it in place, the old wording being in `versions/v3.0/`. Every mark:
  `grep -rn "v3\(\.[12]\)\? \(new\|changed\)" ui_ux --include=*.md`. All three releases' marks are
  cleared together when v4's design starts. The v3.0 build plan links the root documents by
  section; it should point at `versions/v3.0/` instead (for `spec-writer`, reported).
- **D226 — v3.1 and v3.2 tokens and classes go in `token-source-v3.1-v3.2.md` (2026-10-08).** As
  D179 did for v3.0, while implementation is paused: one Tier 2 document in two parts, v3.1 then
  v3.2, so each release's token-source pass can be applied alone. `token-source-v3.md` stays as it
  is. No new colour, type or spacing value; a few sizes only.

### v3.2

- **D235 — Jam lives with the session options; Start reads `Start Jam` (2026-10-08; §C5.1,
  §C12).** Jam is the first field of "During a session": the group already gathers "what the app
  will do once I start", and Jam is the biggest change to that. `Off`/`On`, note "Start by playing
  a doodle, an idea of one to four measures, after the count-in. The phrases then continue it."
  Without a controller it is unavailable exactly as Rising tempo is (`On` disabled, `Off` shown,
  "Needs a connected controller.", the choice kept). While Jam mode is in effect the session
  action reads **`Start Jam`** (same fixed inline size), so the mode shows where the player acts.
  **Dependent options sit under their switch, in its column, only while it shows `On`**: Drift
  under Jam, Allowed rhythm changes under the rhythm lock, What may vary under Vary settings (which
  also shows while Vary settings cannot be turned on, so its cause can be fixed: D244). A hidden
  dependent keeps its values. Rejected: Jam beside the session action (the header's widths are
  fixed and full), in the score toolbar (its audio mix is never locked; Jam is).
- **D236 — Idle in Jam mode (2026-10-08; §C5.1, §C5.2).** Without a held doodle the staff takes a
  new state, `staff-jam`: the top system shows an empty staff with the clef, the key signature of
  the selected written key and collection, and the time signature, and the bottom system's place
  holds one instruction, "After the count-in, play your doodle: one to four measures. The app
  continues it." The phrase action reads `Generate phrase`, disabled, secondary (there is nothing
  to generate); `Start Jam` is primary. `start-note-line` names the home note in its usual wording
  (§C5.2), with no `start-note-marker` (no note to mark). The idle phrase rules do not run; the
  unsupported-rhythm alert, the no-room notice and the orientation guard still block the start, as
  for any session. Turning Jam on, or a controller attaching with Jam on, discards the phrase on
  screen, any generation-failure banner and notation error, and shows `staff-jam`. **(spec,
  provisional, Q70)** Leaving Jam mode at Idle (the switch off, the controller lost, a held doodle
  dropped with Jam out of effect) shows **Empty**, generating nothing until the player asks.
- **D237 — The Jam's cue row and staff before phrase 1 (2026-10-08; §C5.3-§C5.7, §C12).** The
  count-in is v2's. During the capture, `session-cue-row` holds `jam-capture`: the label "Your
  doodle" and four measure numbers, 1 to 4, lit as each measure begins (`is-current`, `is-past`),
  styled as the count-in's beats; measures after the doodle's end never light. During the
  generation measure and any extended wait it holds `jam-writing`, "Writing your first phrase",
  static (no animated ellipsis). During the read-in measure it holds the count-in's four beats
  again, phrase 1 now on screen. The staff keeps `staff-jam`, instruction included, until phrase 1
  enters, at the read-in measure, with the ordinary `staff-content` fade (top system; bars 1-2 top
  and 3-4 below in the split layout); phrase 2 then fills the bottom system as after v2's count-in.
  No playhead and no doodle note are drawn before phrase 1. On a phone `jam-capture`'s label
  shortens to "Doodle" and `jam-writing` to "Writing". A Jam on a held doodle is a v2 start in
  every respect.
- **D238 — A Jam that ends before phrase 1 sounds (2026-10-08; §C5.7, §C5.13).** It ends as a
  count-in end: the workspace returns to Jam mode's Idle, focus on `Start Jam`. Only one cause is
  told: when every attempt at phrase 1 failed, `staff-jam` adds a notice-toned line under its
  instruction, "The app couldn't continue your doodle with these settings. Try again, or change a
  setting.", until the next start or a change of any setting; never error-toned (nothing is the
  player's fault). Stop, no doodle note within 30 seconds, a lost controller, a hidden tab and a
  staff that can no longer be shown say nothing more, as a v2 count-in end.
- **D239 — A held doodle at Idle, and its suggestion (2026-10-08; §C5.11, §C6.4, §C6.5).** While a
  doodle is held, a `jam-bar` sits between the score toolbar and the cue row: "Jamming again on
  your doodle: phrase 1 continues it. Changing a setting other than the tempo lets it go." and,
  when there is a suggestion, the suggestion row of D240. It is held still during the Jam started
  from it (buttons disabled), like the notice row, so a start never moves the staff; it appears and
  leaves at Idle only, with the player's action. The staff shows phrase 1 written from the doodle,
  every v2 idle rule applying; `Regenerate phrase` writes a new one from it. **(spec, provisional,
  Q72)** The doodle stays held after the Jam played on it, so the Idle after its review shows a new
  phrase 1 from it. A fresh Jam's doodle is never held by itself.
- **D240 — The review's doodle section and the suggestion (2026-10-08; §C5.15, §C6, §C12).** A
  Jam's review opens with a `review-doodle` section before the phrase list: a header like a
  phrase's ("Your doodle", its capture tempo "{tempo} BPM", and at its trailing end, where
  per-phrase tools go, `Jam again on this doodle`, disabled with "Needs a connected controller."
  without one), then the doodle engraved from the quantized doodle in written pitch, in the key
  signature the Jam started with, no chord symbols, no number, no favorite, its measures at a
  phrase's measure width from the system's start (so a two-measure doodle looks two measures long),
  and the played-notes lane under it when shown. Then `review-suggestion`, when there is one: "Your
  doodle sounds like {key} {mode}." with **`Use {key} {mode}`** and **`Keep {current key and
mode}`** (the spec's Use it and Keep mine, named by what they do), the answer named in the
  player's family (§C6.5). When the answer lies outside the restriction in force, a second line
  says so in the highlight's words: "{preset} isn't meant for {key} {mode}: using it makes your
  settings Custom." After `Use`, the row reads "Key and mode set to {key} {mode}." until the review
  closes (the controls are out of view below the review); after `Keep`, it goes. When under 80 %
  of the doodle fits any mode, the row is one sentence instead, with no action: "Your doodle uses
  notes outside the app's keys and modes, so no key is suggested." The same row, minus the 80 %
  sentence, is the `jam-bar`'s at Idle. `Jam again on this doodle` closes the review mode; focus
  follows `Close review`'s rule.
- **D241 — Jam sessions in the list and the review summary (2026-10-08; §C5.15).** The detail line
  begins with the word "Jam" for a Jam session ("Jam · 12 min · 9 phrases · …"), and so does the
  review's summary, which writes the same line. A word, not an icon.
- **D242 — The rhythm lock and its allowed changes (2026-10-08; §C7, §C12).** A "During a session"
  field after Jam: **Rhythm lock**, `Off`/`On`, note "Every phrase keeps the rhythm of the first
  one, so your eyes can stay on the notes. In a Jam, the rhythm nearest your doodle." Under it,
  while `On`: **Allowed rhythm changes**, five `toggle-button`s in a wrapping `toggle-list`, all off
  by default: "Move a note", "Move a rest", "Split a note", "Merge two notes", "Add or remove a
  rest"; note "Now and then one phrase changes the rhythm in one of these ways, and the next goes
  back to it. What's possible depends on your rhythm settings: with Strict variety and Straight
  syncopation, almost nothing." While the lock is off the list is hidden and kept (D235). No rhythm
  change and no forced bend is ever marked, anywhere.
- **D243 — Drift (2026-10-08; §C8).** Under Jam while it shows `On`: **Drift**, a segmented
  control `Close`, `Near` (default), `Free`, note "How far the phrases wander from your doodle:
  Close follows its rhythm and its moves, Near its ups and downs, Free only starts where it
  ended."
- **D244 — Vary settings' allowed groups (2026-10-08; §C9).** Under Vary settings: **What may
  vary**, six `toggle-button`s in a `toggle-list`, all on by default: "Key and mode", "Harmony",
  "Tension", "Rhythm", "Melody shape", "Embellishments". Shown while Vary settings shows `On`, and
  also while it cannot be turned on for lack of a legal move. While the rhythm lock is on, "Rhythm"
  is disabled, its choice kept, with "The rhythm lock holds the rhythm." With no legal move, Vary
  settings' `On` is disabled, the choice kept, with a `field-note` naming the fix: "Nothing is
  allowed to vary with these choices. Turn on another group below." (judged at Idle and in the
  review, as Rising tempo's availability is). The option's note becomes "Every 2 to 4 phrases, one
  setting from the groups below moves one step. Never the instrument or the tempo. Your settings
  come back when the session ends."
- **D245 — How the write-up is split (2026-10-08).** Three units, each written by a fresh
  `ux-writer` delegate from these entries: **P** (v3.1 core: `flows/presets/` and
  `screens/preset-sheet/` new; `screens/phrase-workspace/`, `flows/play-session/` and
  `flows/generate-phrase/` for v3.1), **R** (both releases on the review side:
  `screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`) and **J** (v3.2 core:
  `flows/jam/` new; `screens/phrase-workspace/`, `flows/play-session/` and
  `flows/generate-phrase/` for v3.2). P and R touch no file in common and run together; J follows
  P. `strategy.md`, `motion.md`, `README.md` and the token document are written here.
- **D246 — Details settled while writing units P and R (2026-10-08; minor, D119's standing
  rule).** Unit P (presets): the box's label is "Preset", its `title` holding the full selection;
  a restriction is put in words one way everywhere ("{modes} in any key", "{keys} in any mode",
  "{keys}, in {modes}", "only {key} {mode}", lists "A, B or C"); Save as new merges any two
  options meaning the same restriction (also when the restriction in force is exactly the current
  key and mode); sheet titles "Save as a new preset" / "Save changes to “{name}”" / "Rename
  “{name}”" with `Save` / `Save changes` / `Rename`; the Save changes sheet and the Key and mode
  choice each carry one explaining sentence; one refusal reason at a time (empty, then "Custom",
  then a duplicate, quoted as the existing preset writes it; a change of capitals alone is a
  rename); focus returns to the opener when it is still shown and enabled, else to the preset box
  (a one-click `Save changes` too); the marks and their notes keep their session-start state
  during a session; with the passing-and-neighbor rule shipped, a stored "both off" loads the
  neighbor tone at `Rarely`; `control-summary` may reach its ellipsis with a long preset name;
  `no_legal_harmony_plan` names written key, collection, harmonic motion and tension. Unit R (the
  review side): the suggestion row is judged when the review opens and again on any key, mode or
  restriction change while it shows, leaving once the current key and mode are a close answer;
  the "set" form lasts until the review closes or the key or mode changes again; after `Use` or
  `Keep`, focus goes to `Jam again on this doodle` if enabled, else `review-title`; the doodle is
  laid out as a four-measure system whose staff lines end at its last barline, and on a phone a
  one- or two-measure doodle reserves the top system position only; a doodle that cannot be
  drawn says so in `review-phrase-note`; its lane is labelled "Played notes, your doodle", empty
  in a Jam on a held doodle; raw doodle notes count as played notes for the export and the view;
  the doodle is exported under Favorites only too, at its capture tempo, marked "Doodle"; "Jam"
  follows the date in the summary; the no-fit sentence shows in every review of that Jam (one
  plain statement, not "the first time only"); `Use` keeps a held doodle only when it is that
  review's; `Jam again on this doodle` replaces a doodle already held, and an unanswered
  suggestion is offered again at Idle; a decline carried by a held doodle is recorded in the
  session played on it too; played-notes deletion copy for Jam sessions says the doodle stays as
  the app wrote it; only a new preset or `Save changes` triggers the persistent-storage request;
  Your data counts the presets the box lists (more than 50 included, unreadable records not), and
  shows no Presets section while saving is off; documents new in v3.0 open with a separate
  "Changes since v3.0" block for their v3.1 and v3.2 items. Reconciled by the parent: a failed
  preset deletion keeps its confirmation open with the shared retry line and raises no notice,
  like every deletion (Unit R's Save-failed wording for it is dropped). Correction to D240: the
  suggestion's class is `suggestion-row`, not `review-suggestion`.
- **D247 (spec, provisional, Q73) — Deleting a Jam session lets go a doodle held from it
  (2026-10-08).** The spec's list of what drops a held doodle (§C5.11) does not name the deletion
  of its session, and §C5.14 says deleting a kept Jam session deletes its doodle in both forms.
  Designed: the held doodle goes with the session, as a setting change lets it go; Idle then
  shows Jam mode without a held doodle. Applied in `flows/kept-sessions/handoff.md`.
- **D248 — Details settled while writing unit J (2026-10-08; minor, D119's standing rule).** The
  doodle's measure "1" lights with its first note; at a silent barline the cue row shows
  `jam-writing` at once, and a note in that measure brings `jam-capture` back with it lit. The home
  note is spelled as the empty staff's key signature spells it, with its octave ("G4"). The failed
  Jam's notice clears on the next start or a change in the controls section (tempo and session
  options included, not the theme or the audio mix); it is not a live region, `Start Jam` names it
  with `aria-describedby`, and below `bp-tablet-landscape` it takes the instruction's place.
  `jam-bar` hides with the generation-failure banner while the review mode shows; its sentence and
  the suggestion's "set" sentence take focus (`tabindex="-1"`) after `Keep` and `Use` at Idle; the
  "set" sentence lasts until the key or mode changes again, the doodle is let go, or a session on
  it ends. The disabled "Rhythm" toggle under the lock shows off, its choice kept; each toggle list
  is a labelled `role="group"`, one tab stop per toggle. An empty system that fails to engrave
  takes the ordinary Notation error. Turning Jam on also discards a too-many-notes notice and a
  generation in flight; a no-room notice stays and gives way to `staff-jam` when it clears. A
  fresh Jam's phrase 1 must fit the session staff layout, a misfit counting as a failed attempt.
  A controller lost before phrase 1 ends the Jam as a count-in end and takes Jam mode out of
  effect, so Idle is Empty, focus on the phrase action. Readings of the spec, conservative: a
  controller away when a held-doodle Jam ends lets the doodle go (Jam mode is out of effect at
  Idle); a preset save or deletion that changes the restriction in force lets a held doodle go (it
  discards pre-generated phrases); a held doodle stays held under an unsupported rhythm
  combination, `staff-jam` showing with the alert, and under the ordinary generation-failure
  states, `Retry generation` writing from it; a controller attaching or lost during Loading
  changes Jam mode at once, cancelling the generation silently; at load with Jam stored on, the
  page opens Empty and a remembered controller attaching puts Jam mode in effect. **Vary
  settings' note** keeps v3.1's sentence in v3.2's rewrite (correcting D244, whose copy dropped
  it by mistake): "Every 2 to 4 phrases, one setting from the groups below moves one step. Never
  the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your
  settings come back when the session ends."
- **D249 — Q70, Q71 and Q72 closed by the spec as recommended (2026-10-08; spec D242, D243,
  D244).** `spec-writer` settled all three while the design was being written: `Save changes`
  asks the restriction only when the key or mode lies outside the preset's restriction (spec D242,
  confirming D231); leaving Jam mode at Idle leaves the workspace empty (spec D243, confirming
  D236); a Jam played on a held doodle keeps it (spec D244, confirming D239). The provisional
  marks on D231, D236 and D239 no longer apply; the tier documents already state these as
  designed. Also applied from the spec the same day, already followed by unit J: the home note and
  the doodle's notes never start the silence timer (spec D240); a controller lost during a fresh
  Jam's count-in ends it at once (spec D241). Logged from `ux-critic`'s v3.2 pass: Q74 (a
  held-doodle Jam ended in its count-in keeps the doodle) and Q75 (the no-fit note in every
  review), both designed as recommended. Q73 stays open.
- **D250 — `ux-critic`'s v3.1 and v3.2 passes: DRIFT both, findings resolved (2026-10-08).**
  v3.1: (1) a player at the 50-preset limit could only free a slot by choosing a preset to delete
  it, which throws away the unsaved Custom settings they wanted to keep (§B6.6 lets any player
  preset be deleted): **Your data's Presets section now lists every player preset by name, each
  with its own `Delete`** (the shared confirmation, absent while saving is off), as §B7's "lists
  the player presets" also reads, and the limit's note reads "You have 50 presets of your own, the
  most the app keeps. Delete one, here or in Your data, to save a new one."; deleting from there
  never changes the selection's values (deleting the selected or base preset leaves Custom with no
  base, as anywhere). (2) Two descriptions overstated their presets: Speed drill becomes "Dense,
  changing rhythms with most embellishments favored, to read fast in any key."; Jazz becomes
  "Eighth notes and offbeats, now and then with a short note from outside the key." (B5.3: Jazz
  still sounds nearly free of decorations). (3) Q71 closed (D249). (4) `strategy.md`'s removed P3
  sentence is now listed as a v3.2 removal and the new P3.C3 bullet tagged `[v3.2 new]`; "Three
  actions" in the presets intent corrected to four. v3.2: (1) registers updated (D249). (2) The
  read-only state of `toggle-list` and of `field-dependent` inside a read-only field is defined
  in the token document (activation refused by script, one dashed ring). (3) Q74 and Q75 logged
  with provisional designs (D249). (4) The held doodle's sentence names what keeps it: "Jamming
  again on your doodle: phrase 1 continues it. Changing any setting except the tempo, Rising
  tempo, the audio mix or the theme lets it go."; `strategy.md` matches. (5) Four `changed`/`new`
  tags corrected (session list, Your data, the workspace intent's change block, `strategy.md`).
- **D251 (spec, provisional, Q74 and Q75) — Two readings of Part C, designed as recommended
  (2026-10-08; `ux-critic`'s recheck).** **Q74:** a Jam on a held doodle that ends during its
  count-in (Stop, a hidden tab, a staff that can no longer be shown) keeps the doodle held, and
  Idle shows the same phrase 1 again, as after any count-in end (`flows/jam/handoff.md`, The Held
  Doodle); §C5.13's "the doodle is not held" is read as describing a fresh Jam's doodle, never
  held by itself. **Q75:** the "no mode fits" note is one plain sentence shown in every review of
  that Jam, kept ones included (first settled in D246). The recheck's other finding, a leftover
  "Speed drill favors the chromatic figures" in `flows/presets/intent.md`, is corrected to §B6.5
  (Speed drill favors the chromatic approach only). Recheck otherwise clean: v3.1 and v3.2
  validated for the owner's review.
