# v3.1 — Presets

Status: draft v3 (2026-10-08; terms aligned with D237 and D238 the same day, no behaviour changed; refined by D242, written into the master spec only).
Approved by the owner as proposed (D233). Consolidated for building into the [v3 master spec, Part
B](master-spec.md#part-b--v31); where the two differ, the master spec wins.

**Changes from draft v2.** The owner approved every proposal (D233), so each is now stated as
settled. spec-writer's consolidation pass corrected one statement against the code and added
precisions, each marked "spec-writer's call at consolidation" where it is written in:

- **Choosing a preset never replaces the phrase on screen** (§2.5). Draft v2 said phrase 1 is
  replaced when the key or mode moves; at Idle no control change regenerates the phrase today
  (`src/composables/generation-session-control-actions.ts`), so a preset choice behaves like any
  other change of settings.
- **Saving or deleting a preset can change the restriction in force**, and then discards the
  pre-generated phrases (§4.2, §6.2).
- **Identity, names and limits across tabs** (§4.2), **the start-up read, a refused save, and the
  visits that save nothing** (§5), **the migration of v3.0's saved settings and kept sessions**
  (§5, §6.3), and **when presets can be chosen and managed** (§4.2).

**Changes from draft v1.** D229–D231 came after draft v1 and amend D228: a preset may now carry a
**key and mode restriction** (§2.2–§2.8). The cost check finds it cheap (§2.3). The built-in list
(§3) is re-judged with it: Pop song and Modal (Dorian) come back, Reel is restricted to
Mixolydian or Dorian and Bebop to Major. §4 to §11 follow; two new open points, O161 and O162,
since closed by D233.

The owner's request (D210, scoped down by D217): a few more built-in presets, and presets the
player creates and saves. D228 sets the frame, amended by D229–D231 for key and mode:

- A preset is **generator configuration**, "a bit cheap" for now, as Neutral and Jazz already
  are. Instrument and tempo are out.
- **Key and mode** were out too (D228: "a preset never sets the collection"). **D229–D231 amend
  this**: a preset may carry a restriction on the keys and modes it is valid for (D229);
  choosing it moves the current key and mode inside the restriction, which sets them when the
  restriction allows exactly one key and one mode (D230); the restriction guides and never
  blocks: the key and mode controls highlight what it allows, everything stays selectable, and
  choosing outside it leaves the preset (D231). A preset still holds no key or mode **value** of
  its own: it holds which ones it is valid for.
- **Built-in presets are the project's own**; the player may customize them.
- **How a player makes one:** select a preset, change settings (the selection shows "Custom", as
  today), then save it under a name.
- **The preset selector becomes a combo box and moves higher in the controls**: the owner's
  direction for `ux-writer`, recorded here; the design is `ux-writer`'s. So is the highlight of
  D231.
- **Presets do not touch "my instrument"**.
- **Later, not v3:** gimmicks, preferred rhythm cues, restrictions on range and notes, and the
  endgame's characters, locations and events, which add an instrument preference and a tone
  ([endgame](../../vision/endgame.md)). The key and mode restriction moved from this list into
  v3.1 (D229).

Background: [v3 README](README.md#presets). Research:
[preset catalogue](../../../docs/music/preset-catalogue.md). The figure levels a preset carries
are in [embellishment-flags.md](embellishment-flags.md). Terms:
[built-in preset](../../../docs/music/lexicon.md#built-in-preset),
[player preset](../../../docs/music/lexicon.md#player-preset),
[Written key](../../../docs/music/lexicon.md#written-key),
[Collection](../../../docs/music/lexicon.md#collection),
[mode](../../../docs/music/lexicon.md#mode),
[parallel keys](../../../docs/music/lexicon.md#parallel-keys).

In this document **key** means the Written key control's value (the home note) and **mode** the
Collection control's value (one of nine: Major, Minor and the seven modes), as the restriction's
two halves. Together they make what musicians call the key, such as "G Dorian".

## 1. What the code does today

Checked in the code on 2026-10-07:

- **14 generation controls** (`src/domain/controls/generation-controls.ts:83-98`): tempo, written
  key, collection, harmonic motion, tension, note density, rhythmic variety, syncopation, silence
  density, contour, register, leapiness, arpeggio chaos and instrument profile. The musical profile
  is not one of them; it is a separate selection.
- **Keys and modes.** 12 written keys, stored sharps-only (`C`, `C#` … `B`; the flat names are
  labels only) and 9 collections: `Major`, `Minor`, `Ionian`, `Dorian`, `Phrygian`, `Lydian`,
  `Mixolydian`, `Aeolian`, `Locrian` (`generation-controls.ts:9-33`). Major and Ionian have the
  same notes, as do Minor and Aeolian (`src/domain/harmony/collection.ts:17-27`), but **not the
  same chord plan**: Major and Minor get the tonal plan, ending on degree 5; the seven modes get the
  modal plan, built around each mode's color note (`src/domain/harmony/harmony-planner.ts:143+,
  234-299, 384-389`). The key is **written** pitch: the request converts it to concert pitch from
  the instrument (`src/domain/generation/generation-intent.ts:90-97, 117-121`); the collection is
  not transposed. First load is C Ionian with Neutral (`profile-selection.ts:86-95`).
- **The selection** is a name, Neutral or Jazz, plus a Custom flag
  (`src/domain/controls/profile-selection.ts:25-28`). "Custom" is not a third value: it is the
  flag set, with the name kept.
- **Choosing Neutral or Jazz**, even the one already selected, overwrites **seven** controls with
  its bundle and clears the flag (`profile-selection.ts:49-69, 73-81`): harmonic motion, note
  density, rhythmic variety, syncopation, silence density, contour and register. Tension,
  leapiness and arpeggio chaos are left alone; so are the key and the collection.
- **Any edit of one of those seven sets Custom**, without comparing the value with the bundle, and
  keeps the name, so the grammar is kept (`profile-selection.ts:104-114`). Nothing ever returns to
  the plain name except choosing a profile again. Edits of the other controls, the key and the
  collection included, leave the selection alone: they go through one routing point
  (`src/composables/generation-session-control-actions.ts:24-32, 88-122`).
- **The UI** shows the selector as a segmented control, the fifth item of the Foundation group
  after Tempo, Written key, Collection and Instrument profile; in the Custom state no segment is
  selected and a status line says which grammar is retained
  (`src/components/controls/FoundationControls.vue:129-153, 227-245`,
  `src/components/controls/ControlPanel.vue:98-134`). Written key and Collection are segmented
  controls too (`FoundationControls.vue:195-214`). An option can be **disabled** (it then cannot be
  chosen), but no option can be **highlighted** while staying selectable
  (`src/components/controls/segmented-control-option.ts:4-15`).
- **The generation request carries the profile by name**; the generator looks up its one
  capability from the name (`src/domain/generation/generation-intent.ts:27-39`). The worker
  refuses any extra field in the selection
  (`src/generation-worker/generation-worker-inbound.ts:57-74`).
- **Vary settings** moves the key one step around the circle of fifths (from C: F or G) and the
  collection one step inside its group, Major ↔ Minor, or the modes by brightness, never between
  the two groups (`src/session/settings-mutation-scales.ts:200-235`). A move is drawn from a seeded
  source; a draw that lands on an unsupported combination is drawn again, the unsupported steps
  staying in the list (`src/session/settings-mutation.ts:135-144, 196-218`). Key and mode moves
  leave the selection alone.
- **The replay key `ifk1.`** stores the written key and the collection with the controls, and the
  profile name and Custom flag (`src/generation-worker/phrase-replay-key.ts:112-128`).
- **Nothing is saved.** v3.0's storage is specified, not built.

## 2. What a preset holds (D233)

### 2.1 The settings

| In a preset | Out of a preset |
| --- | --- |
| Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio chaos: **ten controls** | Tempo, Instrument profile (D228) |
| The **seven figure levels** ([embellishment-flags.md](embellishment-flags.md) §2.2) | "My instrument" (D228) |
| A **key and mode restriction** (§2.2), "any" for most presets | A key or mode **value**: the restriction says which are valid, not which is chosen |
| A name | The audio mix, the theme, the review's preferences |
| | The three "During a session" options: Vary settings, Tension across phrases, Rising tempo |

- **Every preset holds all ten controls, all seven levels and a restriction**, built-in and
  player-made alike. So a preset always gives the same sound whatever was selected before it, and
  "Custom" and "save" mean one thing (§4).
- **Consequence for Neutral and Jazz:** they gain values for Tension, Leapiness and Arpeggio
  chaos, their first-load values (Lift, Shaped, Varied). Choosing Neutral or Jazz then also
  resets those three, which it does not do today, and editing Tension now shows "Custom". This is
  a visible change to two presets D228 describes as staying as they are; the alternative, a preset
  that leaves some controls "as you have them", makes Custom and saving ambiguous, and Gentle could
  not exist without setting Tension, Leapiness and Arpeggio chaos. Their restriction is "any", so
  choosing them never moves the key or mode, as today.
- **Session options stay out** because v3.0 keeps them the player's own opt-in (v3.0 master spec
  §4.2: "each comes back on only if the player turned it on"); a preset that switched Vary
  settings on would make that choice for them. Rising tempo is a tempo matter, which D228 excludes.
- **Note density is the chosen value**: below the tablet-landscape width a preset's Sixteenth
  generates as Eighth, as any chosen Sixteenth does (v2 master spec §5).
- **A player preset may hold an unsupported rhythm combination**: it is only the
  settings of the moment, and choosing it shows today's unsupported-rhythm alert. Built-in presets
  never do: each is checked with `isUnsupportedRhythmSetting` at Sixteenth and stepped down to
  Eighth.

### 2.2 The key and mode restriction (D229–D231)

What is settled, in short:

- A preset may carry a **restriction**: the keys and modes it is valid for (D229).
- **Choosing the preset** moves a key and mode that are outside the restriction inside it; a
  restriction to exactly one key and one mode therefore sets them; a key and mode already inside
  are kept (D230). Choosing a preset is the player's own act, so this keeps the rule that the app
  never switches key and mode on its own (D209).
- **It guides, never blocks** (D231). While the preset is selected, the key and mode controls
  highlight what it allows, and every key and mode stays selectable. Choosing one outside the
  restriction is **opting out**: the preset is no longer selected and the selection reads Custom,
  exactly as any edit of a preset-held setting does today; no other setting changes.
- The highlight is the owner's direction for `ux-writer`. One requirement for it: it cannot rest
  on color alone, which would fail accessibility; how it reads next to the selected option is
  `ux-writer`'s.

What draft v2 added, all approved by D233: the cost check (§2.3), the forms (§2.4), where a
choice moves the key and mode (§2.5), Custom and Vary settings (§2.6, §2.7), player presets
(§2.8).

### 2.3 Is it cheap? Yes

D229 makes the restriction conditional on a cost check against the code. Checked on 2026-10-07,
part by part:

| Part | What it takes | Cost |
| --- | --- | --- |
| Where the restriction lives | Preset data next to the bundle, looked up from the selection, as the bundles are (`profile-selection.ts:49-69`). It does not enter the selection object, so the worker's check and the replay key are unchanged. | small |
| Choosing a preset moves the key and mode | One branch in the one function that applies a preset (`profile-selection.ts:73-81`), called from one place (`generation-session-control-actions.ts:130-138`). | small |
| Choosing outside reads Custom | One check on the one routing point that key and collection edits already pass through (`generation-session-control-actions.ts:88-122`). Vary settings has its own call site, so it is not caught by it. | small |
| The highlight | A `highlighted` flag on the segmented control's option, one class, one style rule, two computed option lists for Written key and Collection: about 30 to 60 lines, plus `ux-writer`'s design and its accessible wording. `disabled` cannot be reused: it blocks the choice. | small, plus design |
| The generation request | Nothing: the generator never needs the restriction, only the key and mode it led to, which the request already carries. | none |
| Vary settings stays inside | Steps outside the restriction count as unsupported, reusing the existing redraw (`settings-mutation.ts:135-144, 196-218`). A session with no restriction draws exactly as today. About 10 to 20 lines plus passing the restriction to the session. | small |
| The replay key | Unchanged (§6.3). | none |
| The planned storage | Two short lists in each preset record and nothing in the settings record (§5). v3.0 storage is not built, so nothing migrates. | small |

**Verdict: cheap.** Every part is a small change at a place the code already funnels through.
Nothing touches the pitch search, the chord planner or the generation request. The real work is
the highlight's design, which is `ux-writer`'s anyway. So the restriction is in v3.1, as D229
asked.

Two limits, both handled by the rules below rather than by more code:

- **Vary settings moves one step at a time**, a fifth for the key and one brightness step for a
  mode. A restriction whose allowed values are not neighbors along those steps (say the keys C
  and D, two fifths apart) leaves Vary settings no way between them: it then never moves that half
  (§2.7). v3.1's own restrictions avoid this (§3.2).
- **The key is written pitch.** A restriction on keys is therefore in the player's written pitch,
  like the control. No built-in preset restricts keys in v3.1, so the question of a built-in key
  meant in concert pitch ("fiddle keys", D or G as they sound) does not arise (§2.4).

### 2.4 The forms of a restriction (D233)

A restriction has two halves, each **"any" or a list**:

- **Keys**: any, or a list of written keys.
- **Modes**: any, or a list of collections.

The allowed key-and-mode pairs are every allowed key with every allowed mode. That gives the
forms the owner listed:

| Form | Keys | Modes | Example |
| --- | --- | --- | --- |
| Any | any | any | Neutral, Jazz, Gentle, Speed drill |
| Modes only | any | a list | Reel: Mixolydian or Dorian, in any key |
| Keys only | a list | any | not used in v3.1 |
| One key and one mode | one | one | a player preset kept to "G Dorian" (§2.8) |

- **Major and Ionian are different entries**, and so are Minor and Aeolian: they share their notes
  but not their chord plan (§1). A restriction to Major does not allow Ionian. This matters for
  Pop song and Bebop (§3.1), which need the Major chord plan.
- **A list is ordered.** Its first entry is the preset's main sound; §2.5 uses it.
- **No free lists of pairs** such as "D Mixolydian or A Dorian" in v3.1. With two independent
  halves, each control highlights its own list whatever the other control shows. With a list of
  pairs, the modes to highlight would depend on the current key, and a highlighted key could be
  invalid with the current mode: harder to read, and harder to design.
- **How a built-in preset writes one**, in the preset's definition: `keys: any` or a list of key
  ids (`C`, `C#` …), `modes: any` or a list of collection ids in order (`[Mixolydian, Dorian]`).
  A built-in's list must contain at least one entry, and its modes should be neighbors in Vary
  settings' order (§2.7).
- **A restriction never makes the first load move.** Neutral, selected at first load, allows any
  key and mode, so C Ionian stays.

### 2.5 Where choosing a preset moves the key and mode (D233)

**Each half separately: kept if allowed, else the restriction's first listed value.**

| Current | Preset's restriction | After choosing it |
| --- | --- | --- |
| G Ionian | Modal (Dorian): any key, Dorian | **G** Dorian: the key is allowed and kept |
| A Aeolian | Reel: any key, Mixolydian or Dorian | A **Mixolydian**: first listed |
| A Dorian | Reel | A Dorian: already inside, nothing moves |
| C Ionian | Pop song: any key, Major | C **Major**: same notes, the Major chord plan |
| E Ionian | a player preset kept to G Dorian | **G Dorian**: one pair, so it is set |

Why, rather than "the preset's first listed pair" (draft proposal) or the nearest mode:

- **The key is the player's.** The written key is often chosen for the instrument or the piece
  being practised. A modes-only restriction has no reason to move it; and with "any" keys there is
  no first listed key to move to. Keeping the home note and changing the mode is how modes are
  usually heard and taught: the same home note in a new color
  ([parallel keys](../../../docs/music/lexicon.md#parallel-keys)).
- **First listed, not nearest.** The nearest mode in brightness changes fewest notes (from Aeolian,
  Dorian differs by one note, Mixolydian by two), but the result would depend on where the player
  was. First listed is predictable: Reel always lands on Mixolydian, its signature sound, and the
  preset's author decides which that is.
- With one key and one mode, both halves are set: that is D230's "sets them".
- Moving the key or mode is a change of a setting phrases are generated from, so the
  pre-generated phrases are discarded, as for any key change (v3.0 §8). The phrase on screen
  stays until the player regenerates it, as after any change of settings at Idle: a control
  change never regenerates the phrase by itself today, only the instrument switch does
  (`src/composables/generation-session-control-actions.ts`). (Draft v2 said phrase 1 is replaced;
  corrected against the code, spec-writer's call at consolidation.)

### 2.6 Custom, the highlight and opting out (D233)

The **restriction in force** is the selection's preset's (the selected preset, or in Custom the
preset it is based on) **while the current key and mode are inside it**. It is worked out from the
selection and the two controls, never stored.

- **Highlight:** the key and mode controls highlight the restriction in force; with none in force,
  or with "any", nothing is highlighted.
- **Choosing a key or mode inside it** changes nothing else; the preset stays selected.
- **Choosing a key or mode outside it** opts out (D231): a selected preset becomes Custom based on
  it; Custom stays Custom. The restriction is no longer in force, so the highlight goes; no other
  setting changes. Choosing a key and mode back inside by hand brings the highlight back, and the
  selection stays Custom: only choosing a preset returns to a preset, as today.
- **Editing a preset-held setting** (Tension, a figure level…) makes Custom as before, and the
  restriction stays in force: a reel with more syncopation is still a Mixolydian or Dorian reel.

### 2.7 Vary settings under a restriction (D233)

D231's proposal, approved by D233: **Vary settings' key and mode moves stay inside the restriction in
force at the session's start**, so the app never opts the player out of their preset by itself.

- A move outside it counts like an unsupported combination: it is drawn again (v2 master spec §5),
  and the player never sees it.
- **Fixed for the session.** A Vary settings move of a preset-held setting marks the selection
  Custom for the session (§6.1); the bound still holds, since it was taken at the start.
- **One step at a time, unchanged.** Under Reel the mode may move Mixolydian ↔ Dorian (neighbors in
  brightness); under Modal (Dorian), Pop song or Bebop it never moves, and the key moves freely;
  under a one-pair player preset neither moves. When no allowed value is one step away, that half
  just does not move.
- **A session started outside any restriction** (any preset, or Custom after opting out) is not
  bounded.
- **Determinism:** a session with no restriction in force draws exactly as today; with one, the
  draws are still seeded, so the same inputs give the same moves.
- Vary settings never switches preset: v3.1's figure step replaces the Neutral ↔ Jazz flip
  ([embellishment-flags.md](embellishment-flags.md) §7.1).

### 2.8 Player presets' restriction (D233)

A player preset may carry a restriction. When the player saves (new or into their own preset),
they choose one of three, `ux-writer` deciding how it is asked:

1. **As now** (the default): the restriction in force, or "any" when none is. Saving from Custom
   based on Reel keeps "Mixolydian or Dorian".
2. **Only this key and mode**: one pair, the current written key and collection.
3. **Any key and mode.**

Why the default keeps the restriction in force, against the session's earlier proposal ("any"
unless the player asks): saving means "keep what I have now", and the restriction is part of what
a preset holds (§2.1). With "any" as the default, a player who customized Modal (Dorian) and saved
it would get a preset that no longer brings Dorian back, which is what made it Modal.

- The key half is **written** pitch, like the control. Switching instrument keeps the written key
  (lexicon, [Written key](../../../docs/music/lexicon.md#written-key)), so a player preset kept to
  G Dorian stays G Dorian as read on any instrument; what it sounds like changes with the
  instrument, as everywhere.
- A player cannot build arbitrary lists in v3.1: only the three choices above.

## 3. The built-in presets

### 3.1 The catalogue's candidates, with a restriction

The [catalogue](../../../docs/music/preset-catalogue.md#candidate-built-in-presets) found that a
style mostly lives in its collection, and proposed five presets that set it. D228 ruled that out,
and draft v1 judged each candidate on the ten controls and the figure levels alone. D229–D231 give
part of it back: a preset cannot hold a mode as a value, but a restriction to one mode sets it
when chosen, and a restriction to a few keeps the player among them.

| Candidate | Collection it wanted | With a restriction | Verdict |
| --- | --- | --- | --- |
| Gentle | Major | Not needed: one chord, quarter notes, steps only, no tension. A warm-up should not move the player's key and mode. | **Keep**, any |
| Speed drill | the player's own already | Not wanted: reading in many keys is part of the drill. | **Keep**, any |
| Folk reel | Mixolydian | Reels favor Ionian, Mixolydian and Dorian (S107). Restricting to Mixolydian or Dorian gives the folk sound the default C Ionian lacks; Vary settings can move between the two. | **Keep**, as "Reel", Mixolydian or Dorian |
| Bebop | Major | Bebop lines run over chord changes that lead home; the Major chord plan ends on degree 5, which gives its ii–V move room, where the default Ionian's modal plan does not. | **Keep**, Major |
| Pop song | Major | Draft v1 dropped it: only the Major chord plan can give the I–vi–IV–V progression that made it pop, and the default is Ionian. A restriction to Major restores it. | **Back**, Major |
| Modal (Dorian) | Dorian | Draft v1 dropped it: the mode **is** the preset. A restriction to Dorian sets it. | **Back**, Dorian |
| Blues | Mixolydian | Still thin: without the held blue note and the dominant seventh chords, Mixolydian alone is not a blues. | Drop (later) |
| Bossa | Major | Thin: its rhythm pattern and chords are missing; a mode does not bring them. | Drop (later) |
| Baroque | Minor | Thin: sequences and trills are missing; and the app's Minor is natural minor, without the raised 7th Baroque minor leans on. | Drop (later) |

- **Major, not Ionian, for Pop song and Bebop.** A player on the default C Ionian who chooses Pop
  song moves to C Major: the same notes, so the key signature does not change, but the chords now
  follow the tonal plan. The Collection control shows "Major" instead of "Ionian"; the preset's
  description should say why (wording `ux-writer`'s).
- **Ionian is not in Reel's list**, though reels are as often in major as in the other two (S107):
  with it, a player on the default Ionian would hear no change of mode at all. A player who wants a
  reel in major opts out by choosing Ionian (Custom based on Reel) or saves their own.
- A preset's description may still **suggest** what its restriction does not hold, such as "also
  try Ionian" for Reel (wording `ux-writer`'s).

### 3.2 The v3.1 list (D233)

Eight built-in presets: **Neutral and Jazz, unchanged apart from §2.1's three controls, and six
new ones.** Names are working names.

| Setting | Neutral | Jazz | Gentle | Speed drill | Reel | Bebop | Pop song | Modal (Dorian) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Key and mode** | any | any | any | any | any key; Mixolydian or Dorian | any key; Major | any key; Major | any key; Dorian |
| Harmonic motion | Gentle diatonic | Gentle diatonic | Static | Active diatonic | Gentle diatonic | Active diatonic | Gentle diatonic | Gentle diatonic |
| Tension | Lift | Lift | Settled | Lift | Settled | Build | Lift | Lift |
| Note density | Quarter | Eighth | Quarter | Sixteenth | Eighth | Eighth | Eighth | Eighth |
| Rhythmic variety | Slightly varied | Slightly varied | Strict | Heavily varied | Strict | Strict | Heavily varied | Slightly varied |
| Syncopation | Straight | Occasional offbeats | Straight | Occasional offbeats | Straight | Occasional offbeats | Occasional offbeats | Occasional offbeats |
| Silence density | Sparse | Conversational | Conversational | Sparse | Sparse | Sparse | Conversational | Conversational |
| Contour | Arch | Wandering | Arch | Wandering | Arch | Wandering | Arch | Wandering |
| Register | Middle | Varying | Middle | Varying | Middle | Varying | Middle | Varying |
| Leapiness | Shaped | Shaped | Smooth | Leaping | Shaped | Leaping | Shaped | Leaping |
| Arpeggio chaos | Varied | Varied | Predictable | Chaotic | Varied | Varied | Varied | Varied |
| Passing tone | As today | As today | As today | Favored | Favored | As today | As today | Favored |
| Accented passing tone | As today | As today | Off | Favored | As today | As today | As today | As today |
| Neighbor tone | As today | As today | As today | Favored | Favored | As today | As today | Favored |
| Appoggiatura | Off | Off | Off | Favored | Off | Off | Favored | Off |
| Diatonic enclosure | Off | Off | Off | Favored | Off | Favored | Off | Off |
| Chromatic approach | Off | As today | Off | Favored | Off | Strongly favored | Off | Off |
| Chromatic enclosure | Off | As today | Off | As today | Off | Strongly favored | Off | Off |

- **Gentle** (P1.G1, P1.G2 at the player's own pace; a warm-up for P2): the way in for a player
  new to improvising, and the only candidate the owner named. No decoration is favored; that is the
  point.
- **Speed drill** (P2.S1, P1.G2): the only preset aimed at P2, the persona with none of its own.
  Every diatonic figure and the chromatic approach are favored, so the material keeps changing
  shape and brings accidentals to read (D59). It is also the most expensive setting in the
  catalogue's sample (slowest 175 ms); it is the first setting the cost guard measures
  ([embellishment-flags.md](embellishment-flags.md) §6).
- **Reel** (P2.S1, P1.G2): the most faithful style in the catalogue: a steady stream of even
  eighths, now in a folk mode. Its ornaments (cuts and rolls) wait for family 2.
- **Bebop** (P1.G1, P1.G2): what separates it from Jazz is the levels (chromatic approaches and
  enclosures tried before chord tones at about half the notes where they fit) and the Major chord
  plan. The owner plays tenor saxophone, a bebop instrument.
- **Pop song** (P1.G1, P3.C1–C3): the most familiar idiom, with a real pop progression among its
  chord plans; the favored appoggiatura is typical of pop ballads. Its "push" (the anticipation)
  waits for a later figure.
- **Modal (Dorian)** (P1.G1, P3.C3): what a mode sounds like, the app's strongest harmonic
  feature, and a two-chord vamp-like bed to grow ideas on. Passing and neighbor tones are favored
  so Dorian's color note (the raised 6th) is heard in the melody; chromatic notes stay Off to keep
  the mode audible.
- The settings are the catalogue's. Speed drill's catalogue wish for Rising tempo is dropped with
  the session options (§2.1); the catalogue's suggested tempos are not applied (D228).
- **Each restricted list is connected for Vary settings** (§2.7): Mixolydian and Dorian are
  neighbors in brightness; the others hold one mode.
- **Eight, approved** (D233), though more than "a few more" (D210): Pop song and Modal (Dorian)
  give P3 presets of their own.
- **Each built-in is known by a fixed internal identifier**, not by its name, so a later version
  may rename a working name without breaking a saved selection or a Custom base (spec-writer's
  call at consolidation).

### 3.3 What the list is not

- **Not styles in full.** None swings, uses seventh chords, or has its style's rhythm pattern or
  ornaments; the catalogue lists what each would need
  ([What no setting can express today](../../../docs/music/preset-catalogue.md#what-no-setting-can-express-today)).
- **No built-in restricts keys.** A key restriction on a built-in would mean concert keys
  converted per instrument, which v3.1 does not need (§2.3).

## 4. Choosing, customizing and saving (D233)

### 4.1 The selection

The selection is one of: a **built-in preset**, a **player preset**, or **Custom**, which
remembers the preset it was **based on** (or none).

- **Choosing a preset** sets all ten controls and all seven levels to its values, and moves the
  key and mode inside its restriction (§2.5), from any state. Unsaved Custom changes are replaced
  without asking, as today.
- **Custom** begins when the player, while a preset is selected, changes a preset-held setting or
  chooses a key or mode outside the restriction (§2.6). As today, values are not compared with
  the preset's: changing a setting back by hand stays Custom, and choosing the preset again leaves
  Custom. Changing tempo or the instrument never makes Custom, nor does choosing a key or mode
  inside the restriction.
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

- **Saving asks for the restriction** (§2.8): as now (the default), only this key and mode, or
  any.
- **The new or overwritten preset becomes the selection.** Deleting the selected player preset,
  or the one Custom is based on, leaves the selection Custom with no base and the same values, so
  nothing is regenerated. With no base, no restriction is in force (§2.6).
- **Saving or deleting can change the restriction in force**: a save whose restriction choice
  differs from the one in force before, or the deletion of the preset that supplied it. When it
  does, the pre-generated phrases are discarded (§6.2); otherwise nothing (spec-writer's call at
  consolidation).
- **Names:** plain text, trimmed, **1 to 40 characters**, unique among all presets ignoring case,
  built-in names included; "Custom" is reserved. A refused name says why. Uniqueness and the
  limit below are checked when saving or renaming only: presets arriving from another tab's
  writes, or a later version's new built-in name, are loaded and listed as they are, duplicates
  included, and the player may rename them (spec-writer's call at consolidation).
- **At most 50 player presets.** At the limit, saving a new one is refused, saying why. Each is a
  few hundred bytes; the limit keeps the combo box usable, not the storage. More than 50 loaded
  (from two tabs) are all listed; saving a new one stays refused while there are 50 or more.
- **When:** at Idle or in the Review only. The settings are locked while a session runs
  ([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)), and a running
  session never asks the player for anything. Choosing a preset, like any control, also waits
  while a phrase is being generated; saving, renaming and deleting do not, since they change no
  setting (spec-writer's call at consolidation).
- **Order and grouping** in the combo box (built-ins apart from player presets, practice purposes
  apart from styles) are `ux-writer`'s, with one requirement: the player can tell a built-in
  preset from their own, since only their own can be changed, renamed or deleted.

## 5. Saving on the device

Player presets follow v3.0's storage rules
([v3.0 master spec §4](master-spec.md#4-saving-on-the-device)):

- **Saved automatically when made, changed, renamed or deleted**, in the one storage directory,
  each preset a record with a data version and the app version that wrote it. A player preset is
  known by an internal identifier, not by its name, so renaming it keeps it selected. Its record
  holds the ten controls, the seven levels, the name and the restriction (two lists, or "any").
- **The selection is saved with the settings** (v3.0 §4.2's "musical profile selection" becomes
  the preset selection: which preset, or Custom and its base). The ten controls and seven levels
  are saved as settings, as the 14 controls already are. The restriction in force is not saved: it
  follows from the selection and the key and mode (§2.6).
- **On load, the values win.** If the saved values differ from the selected preset's, or the saved
  key and mode are outside its restriction (a built-in retuned by a later version, a player preset
  changed in another tab), the selection shows Custom based on that preset; if the preset no
  longer exists, Custom with no base. Loading never moves the key or mode. The player's sound
  never changes behind their back.
- **Tolerant loading, per preset and per field.** A field that is unknown or invalid takes that
  setting's first-load value; a figure level missing because the preset was saved before that
  figure existed is Off, the same rule as replay keys
  ([embellishment-flags.md](embellishment-flags.md) §5); a missing name becomes a numbered one. In
  a restriction, an unknown key or mode is dropped from its list, and a list left empty, or a
  missing restriction, reads "any". A record that cannot be read at all is left in place and not
  listed.
- **Read at start-up with the settings.** Player presets are read in the same start-up read as
  the saved settings, before the first phrase and within the same wait (v3.0 §4.4); if that read
  fails, the visit is a failed-read visit as a whole (spec-writer's call at consolidation).
- **A refused save** (storage full, browser refusal) keeps the preset for this visit and tells
  the player at once that it is not kept, as v3.0 §4.1's failed save; preset management happens
  outside a session, so the notice needs no wait (spec-writer's call at consolidation).
- **Persistent storage:** saving a player preset, as new or by saving changes into one, counts as
  keeping something the player would miss: the first such save of a visit asks the browser for
  persistent storage, unless already granted, under v3.0 §4.5's once-per-visit rule shared with
  pinning, a favorite and "my instrument".
- **An outdated tab** (v3.0 §4.3) saves nothing: presets made or changed there last for the page,
  under its reload notice. It offers no deletion of any kind (D223), so no preset deletion.
- **A visit whose saved data could not be read** (v3.0 §4.4) starts from the defaults, lists the
  built-in presets only, saves nothing, and offers no preset deletion (D224, D226). As in an
  outdated tab, a preset made or changed there lasts for the page (spec-writer's call at
  consolidation).
- **Delete everything** removes every player preset, a record that could not be read included;
  "Your data" lists them, with their number.
- **Settings saved by v3.0** are migrated when the database opens (v3.0 §4.3): the saved musical
  profile selection becomes that built-in, or Custom based on it, and the figure levels are that
  built-in's ([embellishment-flags.md](embellishment-flags.md) §3.3); then "the values win"
  applies, so a v3.0 selection of Jazz saved with, say, Tension at Build loads as Custom, based on
  Jazz, since Jazz now holds Tension Lift (spec-writer's call at consolidation).
- **Two tabs of the same version:** each save writes a whole preset; the last write wins; another
  tab sees the change after a reload.

## 6. How presets meet the rest

### 6.1 Vary settings

A mutation of a preset-held setting (a control or, with
[embellishment-flags.md](embellishment-flags.md) §7.1, a figure level) marks the selection Custom
for that session, and the selection returns to the player's own when the session ends, exactly as
the profile's "customized" marking does today
([v2 master spec §5](../v2/master-spec.md#5-control-changes-during-a-session)). Key and mode moves
stay inside the restriction in force at the session's start, so they never mark Custom (§2.7).
Vary settings never switches to another preset. Saving what a session drifted to as a preset
("save this phrase's settings", from the review) is a later candidate, not v3.1.

### 6.2 Pre-generation

Choosing a preset whose values differ from the current settings, or that moves the key or mode,
changes settings phrases are generated from, so it discards the pre-generated phrases (v3.0 §8).
So does a change of the restriction in force, since with Vary settings on it changes which moves
later phrases may make (discarding whatever the Vary settings option, which is simpler and rare).
Saving, renaming or deleting a preset, or choosing one with identical values and restriction,
changes nothing phrases are generated from and discards nothing, unless the save or the deletion
changes the restriction in force (§4.2).

### 6.3 What sessions and keys record (D233)

- **The generation request carries the settings, not the preset's name**. The name
  only ever served to look up the chromatic capability, which the figure levels replace; carrying
  it would let a rename change nothing but a label buried in every phrase. The `ifk3.` key
  ([embellishment-flags.md](embellishment-flags.md) §5) therefore holds the ten controls and seven
  levels, and no name.
- **The restriction is recorded nowhere**: not in the request, the replay key or a kept
  session. A phrase never depends on it, only on the key and mode, which every phrase's inputs
  already hold. What it does influence is which key and mode moves Vary settings drew during a
  session; but a kept session keeps every phrase with its own inputs and its timeline (v3.0 §5.2),
  and nothing in v3.1 replays a whole session's chain of moves from its seed. If a later feature
  did, it would need the restriction in force at the start, as it would need the rest of the
  session's starting settings.
- **A kept session records the preset as a label**: the selection's name at the session's start,
  or "Custom, based on …", in the session's own record where v3.0 keeps its "musical profile"
  (v3.0 §5.2) and shows it in the session list (v3.0 §5.4). It is a snapshot: renaming or deleting
  the preset later does not change it. A session kept by v3.0 shows the musical profile it recorded,
  in the same form: Neutral, Jazz, or Custom based on one of them (spec-writer's call at
  consolidation).

### 6.4 No export or sharing in v3.1

A preset leaves the device in no file. v3.0 lists "sharing" among what stays
permanently out (v3.0 master spec §2), and the full backup file is a candidate
(D216, closing O124). If the owner reads that exclusion as server-side sharing only, a preset as a
short text code to copy would be a candidate for later.

### 6.5 My instrument, Jam

- **"My instrument"**: no link at all (D228). Choosing a preset never changes the instrument;
  changing the instrument never makes Custom, and keeps the written key, so it never leaves a
  restriction.
- **Jam (v3.2)** adds settings (the rhythm lock, the drift control, Vary settings' allowed groups).
  Whether presets hold them is a v3.2 question; v3.1 presets do not.
- **The key and mode suggestion (v3.2)** asks the player to confirm a key and mode. Confirming one
  is the player's own choice of key and mode, so under D231 one outside the restriction opts out
  like any other. Whether the suggestion should prefer, or mark, candidates inside the restriction
  in force is for the v3.2 draft (D229 named it as a place the restriction might bound).

## 7. What "Custom" means now

Before v3.1, Custom meant "Neutral's or Jazz's grammar, with some of its seven controls changed".
With v3.1 it means: **the current preset-held settings are not a saved preset, or the key and mode
left the preset's restriction; saving them would make one.** It always names the preset it started
from, and it is the only state in which "save changes" or "save as new" has something new to save.

## 8. Personas served

| Piece | Goal served ([personas](../../personas.md)) | How |
| --- | --- | --- |
| Gentle | **P1.G1**, **P1.G2** | A way in: plain, slow-moving material at the player's own pace. |
| Speed drill | **P2.S1** | P2's setup in one choice: dense, varied, unmemorizable. |
| Reel, Bebop | **P1.G1**, **P1.G2** | A new sound to absorb, now with its mode or chord plan; Bebop's chromatic lines to read. |
| Pop song | **P1.G1**, **P3.C1–C3** | The most familiar idiom; song-like ideas are the ones a player keeps and exports. |
| Modal (Dorian) | **P1.G1**, **P3.C3** | Hearing what a mode sounds like; a steady bed to grow an idea on. |
| The key and mode restriction | **P1.G1** | A style preset brings its mode with it, so choosing it is enough to hear it; the highlight shows which modes belong to the style without forbidding the others. |
| Player presets | **P1.G1**, **P2.S1** (comfort) | P1 "pokes at settings to see what happens" ([P1, Who](../../personas.md#who)); a player preset keeps what they found. Switching between a warm-up and a drill becomes one choice. |
| The combo box, higher in the controls | all | Choosing a starting point comes before fine-tuning (the owner's direction). |

Honest gap: no persona goal names "saving a configuration". Player presets are the owner's request
(D210, D228) and a comfort for every persona, the way v3.0 traces "settings come back" to P1.G1
as comfort.

## 9. Definition of done

1. **Eight built-in presets** with exactly §3.2's values and restrictions; each is a supported
   rhythm setting at Sixteenth and stepped down to Eighth, and generates on the cost guard's sweep
   in every mode its restriction allows.
2. **Neutral and Jazz** produce, for the same request, the phrases v3.0 produces, and never move
   the key or mode.
3. **Choosing a preset** sets all ten controls and seven levels; moves the key and mode inside its
   restriction by §2.5's rule, and only then; and never sets the tempo or instrument.
4. **Custom** appears on any change of a preset-held setting, and on a key or mode chosen outside
   the restriction, and names its base; tempo and instrument changes, and keys and modes chosen
   inside the restriction, never cause it.
5. **The highlight** shows the restriction in force on the key and mode controls, not by color
   alone; every key and mode stays selectable.
6. **Vary settings** never moves the key or mode outside the restriction in force at the session's
   start; with no restriction in force, no move is drawn again for a restriction's sake. (Draft v2
   said "draws exactly as v3.0 does", which the figure step replacing the profile flip makes
   untrue.)
7. **Saving:** save as new from any state, with the restriction choice of §2.8; save changes only
   into a player preset; built-ins never change; rename and delete (with confirmation) for player
   presets only; names and the 50-preset limit enforced with a reason; nothing of this during a
   session.
8. **Persistence:** player presets, their restrictions and the selection survive a reload; values
   win over a changed preset, and loading never moves the key or mode; tolerant loading per field;
   Delete everything removes them; an outdated tab and a failed-read visit save nothing and delete
   no preset.
9. **Pre-generation:** choosing a preset with different values, key, mode or restriction discards
   pre-generated phrases; saving, renaming and deleting do not, unless they change the restriction
   in force.
10. **Sessions and keys:** a kept session shows the preset label it started with, unchanged by a
    later rename; `ifk3.` keys carry settings, never a preset name or restriction.
11. **No preset leaves the device.**

## 10. What presets change in earlier rules

For `documentalist`, when v3.1 is consolidated:

- **D228**: "key and mode are out" and "a preset never sets the collection" are amended by
  D229–D231: a preset holds a key and mode restriction, and choosing it may move or set the key and
  mode (§2.2).
- **v3.0 §4.2**: "the musical profile selection (Neutral, Jazz, or customized)" becomes the preset
  selection, plus the figure levels and the player presets.
- **v3.0 §4.5 and its done item 13**: saving a player preset joins pinning, favorites and "my
  instrument" as a trigger for the persistent-storage request.
- **v3.0 §5.2 and §5.4**: the session's "musical profile" becomes the preset label.
- **v2 §5 and the profile atoms** (`rule_profile_control_customization`,
  `rule_profile_presets_apply_defined_controls`, `module_musical_profile_capabilities`): Custom's
  meaning, choosing a preset now setting ten controls and moving the key and mode, and the
  generation request carrying levels instead of a name.
- **v2 §5's Vary settings and its atoms** (`rule_mutation_setting_scales`,
  `rule_mutation_rerolls_unsupported_combination`): a move outside the restriction in force is
  drawn again, like an unsupported combination.
- **The lexicon's** musical profile preset entry, and the built-in preset and player preset
  entries merged on 2026-10-07; the Collection entry's "default Ionian" stays true, but a preset
  may now change it.

## 11. Open

None: closed by D233.
