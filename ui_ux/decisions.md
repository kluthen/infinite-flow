# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)
- D177–D224 (v3.0's design, released as version 3.0.0):
  [archive/v3.0/decisions-D177-D224.md](archive/v3.0/decisions-D177-D224.md)
- D280–D322 (v3.0's design gates and corrections during its build):
  [archive/v3.0/decisions-D280-D322.md](archive/v3.0/decisions-D280-D322.md)
- D227–D234 (v3.1's own design decisions, released as version 3.1.0):
  [archive/v3.1/decisions-D227-D234.md](archive/v3.1/decisions-D227-D234.md)
- D323–D326 (after the v3.0 release; v3.1's approval, token-source pass and release gate):
  [archive/v3.1/decisions-D323-D326.md](archive/v3.1/decisions-D323-D326.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. D225, D226, D235–D264 and D328 on (v3.2 and v3.3, not yet released, and the
entries v3.1 shares with v3.2) stay here; D265–D279 were never used. Numbering continues from D350.

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

## v3.3 (richer chords) design, 2026-10-12

Inputs: `specs/versions/v3/master-spec.md` Part D (v3.3, cited "§Dn"), proposed for the owner's
approval with spec D264-D274; `docs/music/chord-research.md`; the lexicon's chord entries and their
popup lines; the v3.1 and v3.2 design above (ux D225-D251), still awaiting the owner's review. The
owner's standing delegation applies (D119, D135, archived; restated for this pass): minor design
issues settled here, phones low priority, a running session never asks anything. Nothing in `src/`
is edited. The design follows Part D as proposed; an entry changes only if the owner's approval of
Part D changes what it rests on.

- **D252 — v3.3 is marked on top of v3.0's, v3.1's and v3.2's marks (2026-10-12).** v3.1 and v3.2
  are not frozen yet (they wait for the owner's review, D251), so, as D225 did for them, v3.3's
  changes are layered at the root: `[v3.3 new]` / `[v3.3 changed]` inline, `_v3.3 new:_` /
  `_v3.3 changed:_` items in the change blocks, `v3.3 new` / `v3.3 changed` in code-block
  annotations. **v3.3 is built after v3.2, so every v3.3 change is its own tagged paragraph, item
  or annotation**, never a rewrite of earlier text in place: where v3.3 replaces a sentence it says
  "reads instead" or "also", leaving the earlier text whole for a v3.0, v3.1 or v3.2 builder. A
  document new in v3.1 gains a "Changes since v3.1" block for its v3.3 items, as D246 did for
  documents new in v3.0. v3.3 removes nothing. Every v3 mark:
  `grep -rn "v3\(\.[123]\)\? \(new\|changed\)" ui_ux --include=*.md`; `README.md` says so.
- **D253 — The Seventh chords level sits in the foundation group, right after Harmonic motion
  (2026-10-12; §D5.2, §D11).** One `field-group`, label **Seventh chords**, between Harmonic motion
  and Tension: it shapes the chords, as Harmonic motion does, so the two harmony settings read
  together, and a player who has just picked how the chords move picks next how rich they are. It
  takes the same `segmented-control` of four segments as the seven figure levels (§D11's "four-step
  look"). Rejected: inside the Embellishments group (its heading and intro speak of decorating the
  melody; seventh chords are not a decoration, and a reader would look for them by the staff's
  chord symbols, which the foundation group governs); a group of its own (one field, and a
  "Harmony" group would pull Harmonic motion out of the foundation group, reshaping v3.1's
  controls for one setting); a switch in "During a session" (it is a generation setting held by
  presets, not a session option).
- **D254 — The level's four labels: Off, Sometimes, Often, Mostly (2026-10-12; §D5.2).** For the
  spec's Off, Sometimes, Favored and Strongly favored. Named, like the figure levels (D230), for
  what the player will hear, in the same plain register. Not the figure labels themselves: the
  figure level "Rarely" means "only when nothing plainer fits", which is not this level's second
  step (about one chord in four), and "Mostly" says honestly that a seventh comes on nearly every
  chord, a triad only where none fits. "Often" means the same rank in both controls. The label
  "Mostly" rests on the share the build records at Strongly favored (§D10, done item 5) being a
  clear majority of chords; see Q77.
- **D255 — The level's note and behaviour (2026-10-12; §D5, §D8, §D11).** One `field-note`, named
  by the `radiogroup`'s `aria-describedby`: "How often a chord gets a fourth note on top, as G7 (G,
  B, D, F) instead of G (G, B, D): a richer, jazzier sound. A preference, never a promise." Built
  from the lexicon's popup lines for seventh chord and triad; "a preference, never a promise" is
  the Embellishments intro's own phrase, so the two level controls speak alike. Behaviour, every
  part of it an existing rule applied: first-visit value `Off`; editable at Idle and in the review
  mode, read-only in **Loading** and for a whole session; changing it never regenerates the phrase
  on screen (the player hears it with `Regenerate phrase`, as for every setting), discards the
  prepared phrases and lets a held doodle go, both unseen; saved when changed; preset-held, so a
  change makes Custom and choosing a preset sets it (every built-in to `Off`); never moved by Vary
  settings, so it never changes during a session and never makes Custom then. Nothing announces
  it. No message ever says a phrase has fewer sevenths than the level suggests.
- **D256 — Three built-in descriptions suggest raising the level (2026-10-12; §D8.1, §D11).** Each
  gains one sentence, after the existing text, in the way Reel's suggests Ionian: Jazz and Bebop
  "Also try raising Seventh chords, the usual chords of jazz."; Modal (Dorian) "Also try raising
  Seventh chords, for a richer, jazzier bed." No other description changes; a player preset's and
  Custom's lines are unchanged ("Changed from {name}" already covers a raised level). No built-in
  changes its values.
- **D257 — Vary settings' note says the level is never varied (2026-10-12; §D8.3, §D11).** The
  note reads, from v3.3: "Every 2 to 4 phrases, one setting from the groups below moves one step.
  Never the instrument, the tempo or Seventh chords. Keys and modes stay within what your preset
  is meant for. Your settings come back when the session ends." What may vary keeps its six
  toggles, "Harmony" unchanged: the note's "never" sentence is where the player looks for what is
  left out, and a seventh toggle that could never be turned on would be a control that does
  nothing.
- **D258 — Seventh chord symbols: letters on one line, never shrunk, and their fit (2026-10-12;
  §D7.1, §D11).** A symbol is its root, in written pitch with its accidental as the music font's
  glyph, then its suffix, on one baseline at the one chord-symbol size: `maj7`, `m7`, `7` and
  `m7♭5`, the ♭ in `m7♭5` drawn with the same glyph as a root's flat. No superscript (a smaller
  size falls under the legibility floor first), no signs (Δ, −, ø), never abbreviated, wrapped or
  cut. Each symbol's full width counts toward the minimum width of its measure, so a symbol never
  touches the next one (at least one staff space between them) and never runs past its measure's
  closing barline. The longest symbol is a root with an accidental plus `m7♭5` ("G♯m7♭5",
  "E♭m7♭5"). The engraving calibration gains the case: a measure holding two two-beat chords with
  the longest symbols, at the densest rhythm each layout allows (Sixteenth in the one-system
  layout, Eighth in the split layout), at the narrowest width of each named breakpoint and the
  legibility floor, must fit without the symbols alone making the phrase too wide; the shared
  system position size includes the new symbols' ink, measured as today. A calibration failure at
  a supported width comes back to `ux-writer`; the build never shrinks a symbol to pass it. On a
  phone, a phrase that still fails to fit takes the too-many-notes path like any phrase
  (regenerated unseen), never an overlap. The review and kept sessions follow the same contract,
  which they already apply in full.
- **D259 — The spoken words for the new suffixes (2026-10-12; §D7.1).** The score's text
  description reads `maj7` as "major seventh", `m7` as "minor seventh", `7` as "dominant seventh"
  and `m7♭5` as "half-diminished seventh" ("chord B half-diminished seventh"): each names the
  chord's quality as the lexicon names it, so the four read alike and match the lexicon's headings.
  The spec's alternative "minor seventh flat five" spells the symbol rather than naming the chord.
  A suffix is read as one whole, never letter by letter and never with its ♭ read as "flat" on its
  own. Triad words are unchanged ("minor", "diminished", nothing for major).
- **D260 — Review, exports, kept sessions and Your data: no new control and no new copy
  (2026-10-12; §D7.2, §D9, §D11, §D17).** No text of the review, the export dialog, the session
  list or Your data says "triads" today, so none changes; the backing toggle has no description to
  update. The review and a kept session's review draw the symbols as stored, so a session kept
  before v3.3 shows its triads. The level is not shown in the review's summary, the list's detail
  line or a phrase's header, as the figure levels are not. Your data's Settings line ("The phrase
  controls, the preset, ...") already covers the level, and Delete everything's first-visit state
  puts it at `Off`. The handoffs gain one line each where the content of a file or a kept session
  is listed: MusicXML carries the new chord kinds, the MIDI backing track the chords as the backing
  played them, a kept phrase's inputs the level.
- **D261 — No new token, class or motion (2026-10-12).** The level reuses `field-group`,
  `segmented-control` and `field-note`; the symbols reuse `chord-symbol` and the engraver's size.
  Nothing animates. `token-source-v3.1-v3.2.md` and `motion.md` are unchanged; `README.md` says
  v3.3 adds none.
- **D262 — Written in this thread, one pass (2026-10-12).** Small enough not to delegate: the tier
  changes are the level's field and its rules, three descriptions, one note, the symbols' contract
  and the spoken words, applied in `strategy.md`, `README.md`, `screens/phrase-workspace/`,
  `flows/presets/`, `screens/preset-sheet/handoff.md`, `flows/play-session/`,
  `flows/generate-phrase/handoff.md`, `flows/saved-data/handoff.md`,
  `flows/review-and-export/handoff.md` and `screens/last-session-review/handoff.md`. Unchanged, as
  §D11 says: `flows/jam/`, the suggestion, the rhythm lock, `flows/kept-sessions/`,
  `screens/session-list/`, `screens/your-data/` (its wording already covers the level).
- **D263 — `ux-critic`'s v3.3 pass: DRIFT, four findings fixed (2026-10-12).** (1) The workspace
  Layout Tree gains the v3.3 Vary settings note, as Components and Content had it, and the change
  block links the tree. (2) The presets handoff's change block links Routing Rules, where its v3.3
  paragraphs sit. (3) **The Seventh chords note reads, correcting D255:** "How often a chord gets
  one more note stacked on top, as G7 (G, B, D, F) instead of G (G, B, D): a richer, jazzier sound.
  A preference, never a promise." Under the label "Seventh chords", "a fourth note" could be read as
  the interval of a fourth; "one more note stacked on top" is the lexicon popup's own wording. The
  intent prose in `strategy.md`, `screens/phrase-workspace/intent.md` and `flows/presets/intent.md`
  follows. (4) Correcting D255's "unseen": changing the level lets a held doodle go announcing
  nothing, `jam-bar` leaving at once, as `flows/jam/` says; and `flows/generate-phrase/handoff.md`
  now says the change builds no request by itself but, as any setting change, starts a round under
  the too-many-notes notice. Not findings, noted: the formatter's `*…*` to `_…_` in
  `flows/saved-data/handoff.md` renders the same; the lexicon's "in Infinite Flow" lines for the
  chord terms ("Only triad symbols appear") are `documentalist`'s to update at the build.
- **D264 — Q77 closed by spec D275; the v3.3 build plan reviewed from the design side
  (2026-10-12; master spec §D5.2, build plan v3.3 draft v1).** Spec D275 settled Q77 as
  recommended: the fallback is per phrase, and Strongly favored must reach at least 3 in 4 chords
  as sevenths, measured and reported here. The design stands; the workspace handoff's `Mostly` line
  now says the phrase falls back "as a whole". **The label mapping is written where a coder reads
  it:** the workspace handoff's Seventh chords item says the four segments are §D5.2's levels in
  order (`Off` Off, `Sometimes` Sometimes, `Often` Favored, `Mostly` Strongly favored), that what
  is saved and sent names the spec's level, never the label (spec D277), and that they are not the
  figure levels' options (whose second step is `Rarely` and whose top step `Very often`), since a
  coder told to give it "a figure level's look" could otherwise reuse the wrong list. **What the
  design asks of the plan** (the plan is `coordination-leader`'s and `spec-writer`'s; the edits are
  in the review's report): (1) the three built-in descriptions' sentences ship with the control in
  chunk 19, not chunk 11, so no line on screen ever suggests raising a control that does not exist
  yet; (2) the labels are confirmed twice, on chunk 18's first shares before chunk 19 and on the
  final shares at the release gate, after chunk 20 if built and L2's tuning; (3) hand check H6
  regenerates at `Mostly`, so it runs once the control has shipped, not at chunk 14; (4) counting
  each symbol's width toward its measure's minimum width must leave every triad layout at Off as
  v3.2 draws it; if it would move one, chunk 14 brings it here before any snapshot is updated;
  (5) chunk 19's checks add what its scope already says: editable in the review mode, a round
  under the too-many-notes notice, `jam-bar` leaving at once, nothing announced.

## The v3.1 release, 2026-10-21

- **D327 — `versions/v3.1/` records its release; its preset sheet cites the token source alone
  (2026-10-21; applies D325, as D323 did for v3.0).** v3.1 shipped as version 3.1.0 (tag `v3.1.0`
  at 55364e7), so a recorded correction gives `versions/v3.1/README.md` the released status and
  points it at the archived record, and makes `screens/preset-sheet/handoff.md`, in the copy and
  at the root, cite `src/styles/theme.css` and `components.css` alone: every v3.1 class is there
  (D326). `token-source-v3.1-v3.2.md` stays at the root until v3.2's part is applied (D226).

## The v3.2 re-scope: Jam as its own mode, 2026-10-21

Inputs: `specs/versions/v3/jam-mode.md` (settled by spec D400–D408; §8 is the design brief), which
wins over master spec Part C until Part C is rebuilt from it; `specs/personas.md` (Chrome the one
supported browser, spec D399). The owner's standing delegation applies (D119, D135, archived):
minor design issues settled here, phones low priority, a running session never asks anything.
Nothing in `src/` is edited; the token pass waits for the owner's go (gate T2). Entries marked
**(spec, provisional)** rest on a recommended answer to a behaviour gap logged for `spec-writer`.

- **D328 — The re-scope rewrites v3.2's design in place (2026-10-21).** v3.2 is not frozen, so its
  marked text is rewritten under the same `v3.2` marks, and what the re-scope drops is deleted, not
  listed as a removal, since no version shipped it: the Jam switch among the session options, a
  controller switching Jam mode in or out, Idle in Jam inside session mode's controls, Drift in
  session mode, the held doodle's list of changes that let it go, the suggestion's restriction line.
  A removal of shipped v3.1 text links to `versions/v3.1/`. v3.3 paragraphs that lean on the old
  design are corrected in place. Superseded: D235, D243's placement, D247, D249's Q70 reading, and
  the parts of D236, D239, D240, D246, D248 and D251 the entries below replace. Kept as designed:
  the count-in, the capture's cue row, the writing and read-in measures, a Jam ended before phrase 1
  (D237, D238, D248's cue-row details), the review's doodle section (D240, D246), the session list's
  "Jam" (D241), the rhythm lock's changes list (D242) and What may vary (D244).
- **D329 — The mode shows as a two-segment switch in the header (2026-10-21; jam-mode §2, §8.1).**
  `segmented-control mode-switch`, accessible name "Mode", segments `Session` and `Jam`, in
  `layout-header` after `brand`: below `bp-desktop` at the trailing end of the brand row, from
  `bp-desktop` between the brand and `header-actions`. Pressing the other segment, or an arrow key,
  switches. Read-only (`is-readonly`) during **Loading**, a session (count-in included) and while
  the review mode shows (a review or the session list), with no note: `Close review` is in view.
  The switch is instant, with no animation; focus stays on the segment. At Idle the mode also shows
  in the session action (`Start session` / `Start Jam`), the staff and the controls' title (D332).
  Rejected: a single "Jam mode" toggle (names one mode only), a tab row over the workspace (a whole
  row for one choice, pushing the staff down), the score toolbar (it holds the never-locked mix).
- **D330 — The first press loads Jam's code: the wait and the failure (2026-10-21; jam-mode §2,
  D402).** At once `Jam` is checked and the switch takes `is-loading` and `aria-busy="true"`; the
  workspace is held as in **Loading** (controls read-only, both header actions disabled, the cue
  row empty, the starting note ignored), session mode still drawn. `Session` stays pressable and
  cancels: session mode as it was, the load finishing unseen. Loaded: Jam mode's Idle at once.
  Later presses in the visit wait for nothing. **Failure** (offline before the files were kept):
  session mode as it was, `Session` checked, and in `app-notice-row`: "Jam mode couldn't open
  because part of the app didn't load. Check that you're online, then try again." with `Try again`
  and `Dismiss`, focus on `Try again`; it leaves when Jam mode opens or on `Dismiss`. Never
  error-toned.
- **D331 — Leaving Jam mode, and at load (2026-10-21; jam-mode §2, D400, D407).** `Session` at
  Idle returns session mode exactly as it was left (phrase, prepared phrases, any banner or notice)
  and lets a kept doodle go, silently: its kept session still offers it. The app always opens in
  session mode; the mode is never saved. A controller arriving or leaving never switches the mode.
- **D332 — Jam's controls (2026-10-21; jam-mode §3, §8.1).** In Jam mode `control-section` holds
  Jam's settings in place of session mode's: title "Shape your Jam"; copy "Set these before you
  start. Jam keeps its own key, mode and tempo; the rhythm and the melody's shape come from your
  doodle."; `control-summary` "{key} {mode} · Drift: {drift} · Rhythm lock: {On or Off}". No preset
  bar and no key and mode marks. Three groups: **Foundation** (Tempo with `Tap tempo`, Written key,
  Collection, Instrument profile with my instrument's button, shared with session mode, Harmonic
  motion, Tension, Embellishments), **Following your doodle** (Drift, D243's control and note; Rhythm
  lock, note "Every phrase keeps one rhythm, the one nearest your doodle, so your eyes can stay on
  the notes.", with Allowed rhythm changes under it while `On`, D242's list and note), **From your
  doodle** (D334). Editable at Idle, read-only in **Loading** and a session, saved when changed.
- **D333 — Jam's harmony and embellishments: few, not fixed (2026-10-21; jam-mode §3).** Harmonic
  motion (three options) and Tension (four) are session mode's controls with Jam's own values.
  Embellishments is one level, `Off`, `Rarely`, `Often`, `Very often`, given to all seven figures
  alike, note "How often the app decorates the melody with passing tones, neighbor tones and the
  other figures. A preference, never a promise." Seven figure rows would turn a small set back into
  a generator to tune. **(spec, provisional, Q81, Q83)** Arpeggio chaos is not shown, held at its
  default; the defaults of Jam's own settings are Q83's recommendation.
- **D334 — What came from the doodle shows as a read-only list (2026-10-21; jam-mode §3, §8.1).**
  The **From your doodle** group: `control-group-intro`, then `doodle-readings`, a `dl` of seven
  rows named as session mode's controls (Note density, Rhythmic variety, Syncopation, Silence
  density, Contour, Leapiness, Register) with values in their words; a value the doodle does not
  show reads "{value} (default)". Without a doodle: "The app reads these from your doodle, so the
  phrases move like it." and the note "They show here once you've played a doodle." The list fills
  silently when a fresh Jam's phrase 1 enters, and empties on `New doodle` or leaving Jam mode.
  Rejected: the seven controls shown read-only (they read as locked settings to unlock).
- **D335 — Tap-in (2026-10-21; jam-mode §5, §8.1).** `btn tap-tempo` "Tap tempo" after Jam's tempo
  stepper. Each press (key repeats ignored) is a tap and starts listening; while listening, every
  controller note is a tap too, the starting note included (`start-note-line` hidden; `Start Jam`
  still works). Listening ends 2 seconds after the last tap or when anything else is used. From the
  fourth tap the tempo is the last four taps' mean beat, rounded to a step of 10, kept in 60–180,
  shown in the stepper at once and updated by each further tap. Its `field-note`, a polite live
  region: "Tap the beat here, or press once and tap on your controller." ("Tap the beat here."
  without one); "Keep tapping: four beats set the tempo."; "Set to {tempo} BPM. Keep tapping to
  correct it."; at a limit "Set to 180 BPM, the fastest a Jam goes." (or "60 BPM, the slowest").
  Unevenness is never judged; nothing starts or sounds. Rejected: notes tapping without the button
  (warming up at Idle would keep moving the tempo).
- **D336 — Jam's Idle and the doodle it keeps (2026-10-21; jam-mode §2, D408).** Without a kept
  doodle: D236's `staff-jam`, instruction and home note, `Generate phrase` disabled (the header
  stays still across modes), `Start Jam` primary. With one: phrase 1 as in **Ready**,
  `Regenerate phrase` writing a new one from the doodle, and `jam-bar`: "Jamming again on your
  doodle: phrase 1 continues it. Leaving Jam mode lets it go." with `New doodle` (plain `btn`) at
  its inline end, then `suggestion-row`. `New doodle`, unconfirmed (the kept session still holds
  the doodle): the doodle and its suggestion go, `staff-jam` returns, the readings empty, focus on
  `Start Jam` (or the mode switch when it is disabled). **(spec, provisional, Q82)** A change to any
  Jam setting phrase 1 is written from (all but the tempo) rewrites phrase 1 from the kept doodle at
  once, through **Loading**, so a Jam never meets the out-of-date phrase prompt.
- **D337 — No controller in Jam mode (2026-10-21; D407).** Jam mode opens and every setting can be
  set; `Start Jam` is disabled and the cue row holds `jam-needs-controller` where `start-note-line`
  goes: "A Jam needs a connected controller. Connect one to start." ("Connect a controller to
  start." below `bp-tablet-landscape`), named by `Start Jam`'s `aria-describedby`. A kept doodle
  stays, phrase 1 still written. A controller lost before a fresh Jam's phrase 1 ends it as a
  count-in end onto Jam's Idle, focus on `Connect controller`; after phrase 1, the disconnect
  countdown as in any session. `Jam again on this doodle` no longer needs a controller.
- **D338 — The suggestion speaks of Jam's key and mode (2026-10-21; jam-mode §3, §8.1).** Judged
  against Jam's key and mode; buttons `Jam in {answer}` and `Keep {Jam's key} {mode}`; set sentence
  "Jams now play in {answer}." `Jam in {answer}` sets Jam's key and mode only, from a review over
  either mode, and at Jam's Idle rewrites phrase 1 from the kept doodle. No restriction line (Jam
  has no presets). Otherwise as D240 and D246: offered again at Idle when unanswered, the no-fit
  sentence in every review of that Jam, focus after `Use` or `Keep` as before.
- **D339 — The review side (2026-10-21; jam-mode §2, §8.1, D408).** `Jam again on this doodle`
  leaves the review onto Jam mode with that doodle kept (replacing one already kept), phrase 1
  written from it through **Loading**; from the review of the Jam just played it simply closes the
  review. A Jam session's doodle section and suggestion come with Jam's code: until it has loaded
  the section shows `review-phrase-note` "Loading your doodle."; if it fails, "Your doodle can't be
  shown: part of the app didn't load. Check that you're online, then open this session again.",
  `Jam again on this doodle` disabled with that reason, no suggestion, and that session's two
  exports unavailable with the same reason (they open with the doodle). The rest of the review works.
- **D340 — Session mode after the re-scope (2026-10-21; jam-mode §2, §3).** "During a session" holds
  four fields: Rhythm lock (note "Every phrase keeps the rhythm of the first one, so your eyes can
  stay on the notes."; Allowed rhythm changes under it), Rising tempo, Tension across phrases, Vary
  settings (What may vary under it). Session settings gain the lock, its changes and the groups;
  Jam's settings are their own saved record, reset by `Delete everything` with the rest. Nothing in
  Jam mode touches session mode's settings or prepared phrases, the shared instrument aside (Q85).
- **D341 — Questions after the re-scope (2026-10-21; jam-mode §8.3).** Q70 closed as moot; Q73 and
  Q74 closed by spec D408 as recommended; Q75 closed as recommended (the no-fit sentence in every
  review). New behaviour gaps for `spec-writer`, designed on their recommended answers: Q81 (arpeggio
  chaos in Jam), Q82 (phrase 1 after a Jam setting changes), Q83 (the defaults of Jam's settings),
  Q84 (a doodle read as Sixteenth on a phone), Q85 (the instrument changed in Jam mode), Q86 (v3.3's
  Seventh chords in Jam).
- **D342 — Tokens and classes (2026-10-21).** `token-source-v3.1-v3.2.md` part 2 gains
  `mode-switch`, `tap-tempo`, `doodle-readings` and `jam-needs-controller`; `jam-bar` gains its
  button; `suggestion-row` loses the restriction line; `field-dependent` serves Allowed rhythm
  changes and What may vary only. No new token value. Applied at the T2 pass, on the owner's go.
- **D343 — Chrome is the one supported browser (2026-10-21; spec D399).** `strategy.md`'s context
  of use and `flows/saved-data/intent.md` name Chrome alone (other Chromium browsers, Edge
  included, untested); the v3.1 hand checks H3 to H5 leave `todo.md` (H4 passed, H3 and H5 waived).
- **D344 — How the rework is written (2026-10-21).** Tier 1 and 2 and the registers here; three
  delegated units from D328–D343: **A** `flows/jam/` and `screens/phrase-workspace/`; then, side
  by side, **B** `flows/play-session/`, `flows/generate-phrase/`, `screens/stale-phrase-prompt/`,
  `flows/presets/`, `flows/controller-connection/`, and **C** the review side
  (`screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`).
- **D345 — Details settled while writing units A, B and C (2026-10-21; minor, D119's standing
  rule).** A fresh Jam ended by a lost controller puts focus on `controller-status` (the badge,
  since `Connect controller` never returns once a controller has connected), correcting D337.
  While Jam mode shows, session mode keeps its prepared phrases and prepares no new ones. A
  reading "(default)" shows session mode's first-visit value for that control. The load-failure
  notice's `Try again` acts as a press of `Jam`, and the notice sits beside the saving notices,
  neither replacing the other. During **Opening Jam mode** the preset box is read-only and its
  actions behave as in **Loading**; deleting a player preset from Your data while Jam mode shows
  acts on session mode's selection, out of sight. A Jam session records no preset label, so its
  summary and list row have no preset part. An export pressed while Jam's code loads waits in
  `is-loading`; if the load fails both exports are disabled, the failure sentence as each one's
  `field-note`. After `Jam again on this doodle` onto another doodle, focus moves to
  `mode-switch`'s checked segment (both header actions are disabled while phrase 1 is written);
  from the review of the Jam just played it is `Close review`'s, focus included. Until Jam mode
  first opens, Jam's key and mode are session mode's current ones, so `Jam in {answer}` from a
  review before then starts Jam's record from them.
- **D346 — `ux-critic`'s pass on the re-scope: DRIFT, five findings, all resolved (2026-10-21).**
  (1) **(spec, provisional, Q87)** The kept doodle comes from the latest session played on it, so
  the save that replaces an unpinned session never lets it go; only the player's deletion of that
  session, or `Delete everything`, does (`flows/jam/handoff.md`, What lets the kept doodle go;
  `flows/kept-sessions/handoff.md`, Deleting a Session). (2) Focus never lands on `mode-switch`,
  where an arrow key would leave Jam mode and drop the doodle: after `Jam again on this doodle` it
  goes to `jam-bar`'s sentence; after `New doodle`, to `Start Jam`, else `controller-status`
  (correcting D345). (3) **(spec, provisional, Q83)** The readings' "(default)" values are Jam's
  defaults for the controls a doodle leaves unsaid, recommended as session mode's first-visit
  values, now part of Q83. (4) `strategy.md`'s Device tag moved to the start of its bullet.
  (5) In the review, `Jam in {answer}` moves focus to the set sentence, as at Idle.

## The owner's approval of the v3.2 design, 2026-10-21

- **D347 — Q81–Q87 closed as recommended; gate D0 granted, T2 allowed (2026-10-21; spec D411,
  D412).** The provisional marks on D333, D336 and D346 no longer apply; the tier documents
  already state these as designed. Jam's first values are Q83's with Drift `Near`, the lock and
  its changes off (master spec §C5.16). The token pass adds D342's classes, no new token value; it
  runs as build plan v3.2's chunk 1, not in this pass.
- **D348 — "The kept doodle"; phones a third-rate client (2026-10-21; spec D413, D414).** The
  design already says "the kept doodle"; "held doodle" in D236–D264 and the closed questions is
  Part C's earlier term, left as written. D414 restates D119's phone rule and adds that a
  capability may be reduced on a phone; now in `strategy.md`, Context of Use, Device.

## v3.2's token-source pass, 2026-10-21

- **D349 — Part 2 applied; the document deleted (2026-10-21; build plan v3.2 chunk 1, gate T2).**
  D342's classes are in `src/styles/components.css` under `v3.2 new`; `theme.css` is unchanged (no
  token value). `token-source-v3.1-v3.2.md` is deleted as it said (D226), the build plan's links
  repointed at the token source. Two details settled there: `doodle-readings` takes two columns
  from `bp-tablet-landscape` up as the phrase-workspace handoff says (an `auto-fill` grid gave one
  in a group's width), each row a `div` holding its `dt` and `dd`; `review-doodle`'s disabled
  button is named by `review-phrase-note`, as its handoff says, with no `field-note`.
