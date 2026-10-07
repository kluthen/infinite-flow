# v3.1 — Presets

Status: draft v1 (2026-10-07). spec-writer's proposals for the owner; nothing here is approved
beyond the decisions it cites.

The owner's request (D210, scoped down by D217): a few more built-in presets, and presets the
player creates and saves. D228 sets the frame:

- A preset is **generator configuration**, "a bit cheap" for now, as Neutral and Jazz already
  are. Instrument, tempo, key and mode are out, so **a preset never sets the collection** (the
  scale or mode control).
- **Built-in presets are the project's own**; the player may customize them.
- **How a player makes one:** select a preset, change settings (the selection shows "Custom", as
  today), then save it under a name.
- **The preset selector becomes a combo box and moves higher in the controls**: the owner's
  direction for `ux-writer`, recorded here; the design is `ux-writer`'s.
- **Presets do not touch "my instrument"**.
- **Later, not v3:** gimmicks, preferred rhythm cues, restrictions on range, notes, key and mode,
  and the endgame's characters, locations and events, which add an instrument preference and a
  tone ([endgame](../../vision/endgame.md)).

Background: [v3 README](README.md#presets). Research:
[preset catalogue](../../../docs/music/preset-catalogue.md). The figure levels a preset carries
are in [embellishment-flags.md](embellishment-flags.md). Terms:
[built-in preset](../../../docs/music/lexicon.md#built-in-preset),
[player preset](../../../docs/music/lexicon.md#player-preset).

## 1. What the code does today

Checked in the code on 2026-10-07:

- **14 generation controls** (`src/domain/controls/generation-controls.ts:83-98`): tempo, written
  key, collection, harmonic motion, tension, note density, rhythmic variety, syncopation, silence
  density, contour, register, leapiness, arpeggio chaos and instrument profile. The musical profile
  is not one of them; it is a separate selection.
- **The selection** is a name, Neutral or Jazz, plus a Custom flag
  (`src/domain/controls/profile-selection.ts:25-28`). "Custom" is not a third value: it is the
  flag set, with the name kept.
- **Choosing Neutral or Jazz**, even the one already selected, overwrites **seven** controls with
  its bundle and clears the flag (`profile-selection.ts:49-69, 73-81`): harmonic motion, note
  density, rhythmic variety, syncopation, silence density, contour and register. Tension,
  leapiness and arpeggio chaos are left alone.
- **Any edit of one of those seven sets Custom**, without comparing the value with the bundle, and
  keeps the name, so the grammar is kept (`profile-selection.ts:104-114`). Nothing ever returns to
  the plain name except choosing a profile again. Edits of the other controls leave the selection
  alone.
- **The UI** shows the selector as a segmented control, the fifth item of the Foundation group
  after Tempo, Written key, Collection and Instrument profile; in the Custom state no segment is
  selected and a status line says which grammar is retained
  (`src/components/controls/FoundationControls.vue:129-153, 227-245`,
  `src/components/controls/ControlPanel.vue:98-134`).
- **The generation request carries the profile by name**; the generator looks up its one
  capability from the name (`src/domain/generation/generation-intent.ts:27-39`).
- **Nothing is saved.** v3.0's storage is specified, not built.

## 2. What a preset holds (proposed, O135)

| In a preset | Out of a preset |
| --- | --- |
| Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio chaos: **ten controls** | Tempo, Written key, Collection, Instrument profile (D228) |
| The **seven figure levels** ([embellishment-flags.md](embellishment-flags.md) §2.2) | "My instrument" (D228) |
| A name | The audio mix, the theme, the review's preferences |
| | The three "During a session" options: Vary settings, Tension across phrases, Rising tempo |

- **Every preset holds all ten controls and all seven levels**, built-in and player-made alike.
  So a preset always gives the same sound whatever was selected before it, and "Custom" and
  "save" mean one thing (§4).
- **Consequence for Neutral and Jazz:** they gain values for Tension, Leapiness and Arpeggio
  chaos, their first-load values (Lift, Shaped, Varied). Choosing Neutral or Jazz then also
  resets those three, which it does not do today, and editing Tension now shows "Custom". This is
  a visible change to two presets D228 describes as staying as they are; the alternative, a preset
  that leaves some controls "as you have them", makes Custom and saving ambiguous, and Gentle could
  not exist without setting Tension, Leapiness and Arpeggio chaos.
- **Session options stay out** because v3.0 keeps them the player's own opt-in (v3.0 master spec
  §4.2: "each comes back on only if the player turned it on"); a preset that switched Vary
  settings on would make that choice for them. Rising tempo is a tempo matter, which D228 excludes.
- **Note density is the chosen value**: below the tablet-landscape width a preset's Sixteenth
  generates as Eighth, as any chosen Sixteenth does (v2 master spec §5).
- **A player preset may hold an unsupported rhythm combination** (proposed): it is only the
  settings of the moment, and choosing it shows today's unsupported-rhythm alert. Built-in presets
  never do: each is checked with `isUnsupportedRhythmSetting` at Sixteenth and stepped down to
  Eighth.

## 3. The built-in presets

### 3.1 The catalogue's candidates, without the collection

The [catalogue](../../../docs/music/preset-catalogue.md#candidate-built-in-presets) found that a
style mostly lives in its collection, and proposed five presets that set it. D228 rules that out,
so each candidate is judged again on what remains: the ten controls and the figure levels.

| Candidate | Collection it wanted | Without it | Verdict |
| --- | --- | --- | --- |
| Gentle | Major | Keeps everything that makes it Gentle: one chord, quarter notes, steps only, no tension. A practice purpose, not a style. | **Keep** |
| Speed drill | the player's own already | Unchanged: dense, varied, unpredictable material in the player's key. | **Keep** |
| Folk reel | Mixolydian | Keeps the running even eighths, steady rhythm and four-bar phrases; the mode becomes the player's. Major is as typical of reels as Mixolydian and Dorian (S107). | **Keep**, as "Reel" |
| Bebop | Major | The collection never mattered; what it needed was weights, which v3.1 brings: chromatic approaches and enclosures strongly favored. | **Keep** (was "after flags") |
| Pop song | Major | Major is a tonal plan; the default collection, Ionian, has the same notes but a modal chord plan, which cannot give the I–vi–IV–V progression that made it pop. What is left is a generic lyrical setup. | Drop |
| Modal (Dorian) | Dorian | The mode **is** the preset. Nothing recognisable remains. | Drop |
| Blues | Mixolydian | Already thin; without the lowered 7th and with no held blue note, poor. | Drop (later) |
| Bossa | Major | Thin already: its rhythm pattern and chords are missing. | Drop (later) |
| Baroque | Minor | Thin already; loses the minor key it leaned on. | Drop (later) |

A preset's description may **suggest** a collection without setting it, such as "try Mixolydian or
Dorian" for Reel (proposed; the wording is `ux-writer`'s).

### 3.2 The v3.1 list (proposed, O136)

Six built-in presets: **Neutral and Jazz, unchanged apart from §2's three controls, and four
new ones.** Names are working names.

| Setting | Neutral | Jazz | Gentle | Speed drill | Reel | Bebop |
| --- | --- | --- | --- | --- | --- | --- |
| Harmonic motion | Gentle diatonic | Gentle diatonic | Static | Active diatonic | Gentle diatonic | Active diatonic |
| Tension | Lift | Lift | Settled | Lift | Settled | Build |
| Note density | Quarter | Eighth | Quarter | Sixteenth | Eighth | Eighth |
| Rhythmic variety | Slightly varied | Slightly varied | Strict | Heavily varied | Strict | Strict |
| Syncopation | Straight | Occasional offbeats | Straight | Occasional offbeats | Straight | Occasional offbeats |
| Silence density | Sparse | Conversational | Conversational | Sparse | Sparse | Sparse |
| Contour | Arch | Wandering | Arch | Wandering | Arch | Wandering |
| Register | Middle | Varying | Middle | Varying | Middle | Varying |
| Leapiness | Shaped | Shaped | Smooth | Leaping | Shaped | Leaping |
| Arpeggio chaos | Varied | Varied | Predictable | Chaotic | Varied | Varied |
| Passing tone | As today | As today | As today | Favored | Favored | As today |
| Accented passing tone | As today | As today | Off | Favored | As today | As today |
| Neighbor tone | As today | As today | As today | Favored | Favored | As today |
| Appoggiatura | Off | Off | Off | Favored | Off | Off |
| Diatonic enclosure | Off | Off | Off | Favored | Off | Favored |
| Chromatic approach | Off | As today | Off | Favored | Off | Strongly favored |
| Chromatic enclosure | Off | As today | Off | As today | Off | Strongly favored |

- **Gentle** (P1.G1, P1.G2 at the player's own pace; a warm-up for P2): the way in for a player
  new to improvising, and the only candidate the owner named. No decoration is favored; that is the
  point.
- **Speed drill** (P2.S1, P1.G2): the only preset aimed at P2, the persona with none of its own.
  Every diatonic figure and the chromatic approach are favored, so the material keeps changing
  shape and brings accidentals to read (D59). It is also the most expensive setting in the catalogue's sample (slowest 175 ms);
  it is the first setting the cost guard measures
  ([embellishment-flags.md](embellishment-flags.md) §6).
- **Reel** (P2.S1, P1.G2): the most faithful style in the catalogue: a steady stream of even
  eighths. Its ornaments (cuts and rolls) wait for family 2.
- **Bebop** (P1.G1, P1.G2): what separates it from Jazz is the levels: chromatic approaches and
  enclosures tried before chord tones at about half the notes where they fit. The owner plays
  tenor saxophone, a bebop instrument.
- The settings are the catalogue's, minus the collection. Speed drill's catalogue wish for Rising
  tempo is dropped with the session options (§2).

### 3.3 What the list is not

- **Not styles in full.** None swings, uses seventh chords, or has its style's rhythm pattern or
  ornaments; the catalogue lists what each would need
  ([What no setting can express today](../../../docs/music/preset-catalogue.md#what-no-setting-can-express-today)).
- **Not every persona goal.** P3 has no preset of its own; its goals are served by saving
  presets (§8) and, in v3.2, by Jam.

## 4. Choosing, customizing and saving (proposed, O137, O138)

### 4.1 The selection

The selection is one of: a **built-in preset**, a **player preset**, or **Custom**, which
remembers the preset it was **based on** (or none).

- **Choosing a preset** sets all ten controls and all seven levels to its values, from any state.
  Unsaved Custom changes are replaced without asking, as today.
- **Custom** begins when the player changes a preset-held setting while a preset is selected. As
  today, the value is not compared with the preset's: changing a setting back by hand stays
  Custom, and choosing the preset again leaves Custom. Changing tempo, written key, collection or
  the instrument never makes Custom: a preset does not hold them.
- **Custom's display** names its base ("Custom, based on Bebop", wording `ux-writer`'s). It
  replaces today's "grammar retained" line: no hidden grammar remains, since the figure levels are
  visible settings ([embellishment-flags.md](embellishment-flags.md) §10).

### 4.2 Managing player presets

| Action | Built-in preset | Player preset |
| --- | --- | --- |
| Choose | yes | yes |
| Save as a new preset (from any state) | yes: the current settings under a new name | yes |
| Save changes into it (from Custom based on it) | **never**: it is the project's; save as new instead | yes, replacing its values; no confirmation, since the player asked |
| Rename | no | yes |
| Delete | no | yes, after a confirmation |
| Hide | not in v3.1 | not applicable |

- **The new or overwritten preset becomes the selection.** Deleting the selected player preset
  leaves the selection Custom with no base and the same values, so nothing is regenerated.
- **Names:** plain text, trimmed, **1 to 40 characters**, unique among all presets ignoring case,
  built-in names included; "Custom" is reserved. A refused name says why.
- **At most 50 player presets.** At the limit, saving a new one is refused, saying why. Each is a
  few hundred bytes; the limit keeps the combo box usable, not the storage.
- **When:** at Idle or in the Review only. The settings are locked while a session runs
  ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)), and a running
  session never asks the player for anything.
- **Order and grouping** in the combo box (built-ins apart from player presets, practice purposes
  apart from styles) are `ux-writer`'s, with one requirement: the player can tell a built-in
  preset from their own, since only their own can be changed, renamed or deleted.

## 5. Saving on the device

Player presets follow v3.0's storage rules
([v3.0 master spec §4](master-spec.md#4-saving-on-the-device)):

- **Saved automatically when made, changed, renamed or deleted**, in the one storage directory,
  each preset a record with a data version and the app version that wrote it. A player preset is
  known by an internal identifier, not by its name, so renaming it keeps it selected.
- **The selection is saved with the settings** (v3.0 §4.2's "musical profile selection" becomes
  the preset selection: which preset, or Custom and its base). The ten controls and seven levels
  are saved as settings, as the 14 controls already are.
- **On load, the values win.** If the saved values differ from the selected preset's (a built-in
  retuned by a later version, a player preset changed in another tab), the selection shows Custom
  based on that preset; if the preset no longer exists, Custom with no base. The player's sound
  never changes behind their back.
- **Tolerant loading, per preset and per field.** A field that is unknown or invalid takes that
  setting's first-load value; a figure level missing because the preset was saved before that
  figure existed is Off, the same rule as replay keys
  ([embellishment-flags.md](embellishment-flags.md) §5); a missing name becomes a numbered one. A
  record that cannot be read at all is left in place and not listed.
- **Persistent storage:** saving the first player preset of a visit asks the browser for
  persistent storage, as pinning, a favorite or "my instrument" do (v3.0 §4.5), since a preset is
  something the player would miss.
- **An outdated tab** (v3.0 §4.3) saves nothing: presets made or changed there last for the page,
  under its reload notice. It offers no deletion of any kind (D223), so no preset deletion.
- **A visit whose saved data could not be read** (v3.0 §4.4) starts from the defaults, lists the
  built-in presets only, saves nothing, and offers no preset deletion (D224, D226).
- **Delete everything** removes every player preset; "Your data" lists them, with their number.
- **Two tabs of the same version:** each save writes a whole preset; the last write wins; another
  tab sees the change after a reload.

## 6. How presets meet the rest

### 6.1 Vary settings

A mutation of a preset-held setting (a control or, with
[embellishment-flags.md](embellishment-flags.md) §7.1, a figure level) marks the selection Custom
for that session, and the selection returns to the player's own when the session ends, exactly as
the profile's "customized" marking does today
([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)). Vary settings
never switches to another preset. Saving what a session drifted to as a preset ("save this
phrase's settings", from the review) is a later candidate, not v3.1.

### 6.2 Pre-generation

Choosing a preset whose values differ from the current settings changes settings phrases are
generated from, so it discards the pre-generated phrases (v3.0 §8). Saving, renaming or deleting
a preset, or choosing one with identical values, changes nothing phrases are generated from and
discards nothing (proposed).

### 6.3 What sessions and keys record (O139)

- **The generation request carries the settings, not the preset's name** (proposed). The name
  only ever served to look up the chromatic capability, which the figure levels replace; carrying
  it would let a rename change nothing but a label buried in every phrase. The `ifk3.` key
  ([embellishment-flags.md](embellishment-flags.md) §5) therefore holds the ten controls and seven
  levels, and no name.
- **A kept session records the preset as a label**: the selection's name at the session's start,
  or "Custom, based on …", in the session's own record where v3.0 keeps its "musical profile"
  (v3.0 §5.2) and shows it in the session list (v3.0 §5.4). It is a snapshot: renaming or deleting
  the preset later does not change it.

### 6.4 No export or sharing in v3.1

A preset leaves the device in no file (proposed). v3.0 lists "sharing" among what stays
permanently out (v3.0 master spec §2), and the full backup file is a candidate
(D216, closing O124). If the owner reads that exclusion as server-side sharing only, a preset as a
short text code to copy would be a candidate for later.

### 6.5 My instrument, Jam

- **"My instrument"**: no link at all (D228). Choosing a preset never changes the instrument;
  changing the instrument never makes Custom.
- **Jam (v3.2)** adds settings (the rhythm lock, the drift control, Vary settings' allowed list).
  Whether presets hold them is a v3.2 question; v3.1 presets do not.

## 7. What "Custom" means now

Before v3.1, Custom meant "Neutral's or Jazz's grammar, with some of its seven controls changed".
With v3.1 it means: **the current preset-held settings are not a saved preset, and saving them
would make one.** It always names the preset it started from, and it is the only state in which
"save changes" or "save as new" has something new to save.

## 8. Personas served

| Piece | Goal served ([personas](../../personas.md)) | How |
| --- | --- | --- |
| Gentle | **P1.G1**, **P1.G2** | A way in: plain, slow-moving material at the player's own pace. |
| Speed drill | **P2.S1** | P2's setup in one choice: dense, varied, unmemorizable. |
| Reel, Bebop | **P1.G1**, **P1.G2** | A new sound to absorb; Bebop's chromatic lines to read. |
| Player presets | **P1.G1**, **P2.S1** (comfort) | P1 "pokes at settings to see what happens" ([P1, Who](../../personas.md#who)); a player preset keeps what they found. Switching between a warm-up and a drill becomes one choice. |
| The combo box, higher in the controls | all | Choosing a starting point comes before fine-tuning (the owner's direction). |

Honest gap: no persona goal names "saving a configuration". Player presets are the owner's request
(D210, D228) and a comfort for every persona, the way v3.0 traces "settings come back" to P1.G1
as comfort.

## 9. Definition of done (proposed)

1. **Six built-in presets** with exactly §3.2's values; each is a supported rhythm setting at
   Sixteenth and stepped down to Eighth, and generates on the cost guard's sweep.
2. **Neutral and Jazz** produce, for the same request, the phrases v3.0 produces.
3. **Choosing a preset** sets all ten controls and seven levels, and never the tempo, written key,
   collection or instrument.
4. **Custom** appears on any change of a preset-held setting and names its base; tempo, key,
   collection and instrument changes never cause it.
5. **Saving:** save as new from any state; save changes only into a player preset; built-ins never
   change; rename and delete (with confirmation) for player presets only; names and the 50-preset
   limit enforced with a reason; nothing of this during a session.
6. **Persistence:** player presets and the selection survive a reload; values win over a changed
   preset; tolerant loading per field; Delete everything removes them; an outdated tab and a
   failed-read visit save nothing and delete no preset.
7. **Pre-generation:** choosing a preset with different values discards pre-generated phrases;
   saving, renaming and deleting do not.
8. **Sessions and keys:** a kept session shows the preset label it started with, unchanged by a
   later rename; `ifk3.` keys carry settings, never a preset name.
9. **No preset leaves the device.**

## 10. What presets change in earlier rules

For `documentalist`, when v3.1 is consolidated:

- **v3.0 §4.2**: "the musical profile selection (Neutral, Jazz, or customized)" becomes the preset
  selection, plus the figure levels and the player presets.
- **v3.0 §4.5 and its done item 13**: saving a player preset joins pinning, favorites and "my
  instrument" as a trigger for the persistent-storage request.
- **v3.0 §5.2 and §5.4**: the session's "musical profile" becomes the preset label.
- **v2 §5 and the profile atoms** (`rule_profile_control_customization`,
  `module_musical_profile_capabilities`): Custom's meaning, choosing a preset now setting ten
  controls, and the generation request carrying levels instead of a name.
- **The lexicon's** musical profile preset entry, and the built-in preset and player preset
  entries merged on 2026-10-07.

## 11. Open

Register-style entries, to be copied into the [register](../../open-questions.md):

- **O135 - What a preset holds** _(v3.1)_: which settings does every preset hold? Proposed: the
  ten generation controls other than tempo, written key, collection and instrument, plus the seven
  figure levels and a name; never session options, the audio mix or "my instrument"; Neutral and
  Jazz take Lift, Shaped and Varied for the three controls they did not set, so choosing them now
  resets those three (§2).
- **O136 - The built-in list** _(v3.1)_: which built-in presets ship? Proposed: Neutral and Jazz,
  plus Gentle, Speed drill, Reel and Bebop with §3.2's values; Pop song and Modal dropped, since
  without the collection they lose their character; Blues, Bossa and Baroque later (§3).
- **O137 - Managing player presets** _(v3.1)_: what may the player do with presets? Proposed: save
  as new from any state; save changes only into a player preset, without confirmation; rename and
  delete (with confirmation) player presets only; names of 1 to 40 characters, unique ignoring case
  with built-ins, "Custom" reserved; at most 50; only at Idle or in the Review (§4.2).
- **O138 - Custom and loading** _(v3.1)_: when is the selection Custom, and what wins when a saved
  preset and saved settings disagree? Proposed: any change of a preset-held setting makes Custom,
  without comparing values, naming its base; on load the saved values win and the selection shows
  Custom when they differ from the preset's (§4.1, §5).
- **O139 - What records a preset** _(v3.1)_: do requests, keys and kept sessions record the
  preset's settings or its name, and can a preset leave the device? Proposed: requests and keys
  carry the settings only; a kept session keeps the name at its start as a label; no export or
  sharing in v3.1 (§6.3, §6.4).
