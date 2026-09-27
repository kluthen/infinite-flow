> **Archived 2026-09-25.** This is the live decision log for D47–D71, from the persona and vision session, moved here verbatim below this notice. Relative links in the text were written from `specs/`; their paths were repaired on 2026-09-27, when this file moved into this folder, so they resolve from here. Where each decision now lives as settled fact: [archive index](README.md).

# Decisions

Status: draft v1.0

Append-only record of settled decisions. The first-release log, D1–D46, is archived verbatim in
[archive/v1/decisions-D1-D46.md](../v1/decisions-D1-D46.md). Numbering continues from there, and
archived IDs keep their meaning.

## Decision Log

- **D47 - First release (v1) reached.** Settled 2026-09-25. The first release is implemented
  (`v1.0-rc1` = `2418069`). Its decision log (D1–D46) is archived, and the
  [v1 feature note](../../features/v1-first-release.md) stands in for the release. The v1.0 gate
  stays open until ISS-003 and ISS-004 are resolved.
- **D48 - Primary persona P1, "The Curious Improviser".** Settled 2026-09-25, from the user's description; the name is still a working name. P1 is a musician who can already play and reads most standard notation, but still struggles to read and perform at speed. P1 is a beginner at improvisation and has a curious, playful "game player" attitude. No age or gender target, probably under 60. The two goals: G1, learn vocabulary by playing what is generated; G2, read in real time, build dexterity and gain BPM. The product owner fits P1; that bias is acknowledged. See [personas](../../personas.md).
- **D49 - v1 applies no time pressure, by design.** Settled 2026-09-25; resolves O19. v1 is not meant to pressure the player and will not for some time. G2 is served from v2, where the phrase updates on a rolling basis. That pressure stays mild: even with MIDI, the app only acknowledges the expected note.
- **D50 - "Game player" is an attitude for now.** Settled 2026-09-25; resolves O17 for persona purposes. P1 is curious and playful. No game mechanics are planned in the near term. The far-future game direction is recorded as vision input in [far vision](../../vision/far-vision.md) and is discussed separately.
- **D51 - v2 direction: rolling phrase and MIDI acknowledgement.** Settled 2026-09-25 as a direction; the details are open (O22, O23). v2 turns the finite phrase into a rolling one, where the app keeps generating the next item. v2 also adds a MIDI controller that only acknowledges when the player plays the expected note. This bundles two stages the roadmap listed separately: "Minimal MIDI" and "rolling continuation".
- **D52 - v2 MIDI feedback: acknowledge right notes, then check the measure against its chord.** Settled 2026-09-25; resolves O22, with the details in O24 and O25. v2 acknowledges a played note only when it is the expected note. The app still keeps track of everything played. When a measure's time is up, it checks whether what was played fits that measure's chord, and if so acknowledges that the player kept that part of the contract. Embellishing and trying out improvisation are encouraged, as long as the notes suit the chord. This supersedes the "gentle mismatch hint" of the archived minimal-MIDI plan (D21, D22).
- **D53 - MIDI-seeded continuation moves to v3.** Settled 2026-09-25; resolves O23. The user wants this feature, but v2's rolling phrase is generated from the player's controls only.
- **D54 - Personas are instrument-agnostic; adding an instrument template must stay easy.** Settled 2026-09-25; resolves O18. No persona is tied to one instrument. Tenor saxophone and Travel Sax 2 limitations remain practical design constraints. The product owner tests with a Travel Sax 2, and other testers are expected on other MIDI controllers and keyboards. Adding an instrument template MUST remain easy.
- **D55 - "My instrument" configuration is a v3 direction; microphone input is much later.** Settled 2026-09-25 as a direction. A small interface will let the player configure their instrument: input kind (MIDI controller, or later the microphone), expected range and transposition, saved locally. This is the first local persistence, a deliberate departure from v1's ephemeral sessions (archived D27). Microphone interpretation is far later, "v5 or 8".
- **D56 - Transposition belongs to the instrument; the key is chosen in written pitch.** Settled 2026-09-25; resolves O20 and gives ISS-003 its semantics.
  - (a) Transposition becomes a field of the instrument template: keyboard concert, tenor B♭ (+M9), alto E♭ (+M6). The separate notation-display selector is removed.
  - (b) The tonal center and scale are read in the instrument's written pitch. "C Ionian" on tenor gives written C major with an empty signature, which is concert B♭. The generator stays concert-only, and the conversion happens at request construction.
  - (c) Switching instrument keeps the selected written key, so the concert key changes and the phrase regenerates. This supersedes the archived D43/D44 keep-if-it-fits switch policy.
  - (d) v1.0 has no Concert-display override; it may return with the v3 "my instrument" configuration (D55).
  - Switching instrument is expected to be rare. It will eventually belong to a user profile, which does not exist yet.
  - Supersedes archived D17, D18, D39 and D42 insofar as they make display a separate selection.
- **D57 - Transposition is open data, so new instrument presets stay easy to add.** Settled 2026-09-25; applies D54 and is part of ISS-003. Transposition is a data field (a chromatic and diatonic interval) on each instrument template. It is not a closed set of display conventions or a literal union type. Adding a preset means adding one validated declarative template. It must require no new types, enum members or UI code paths.
- **D58 - The first-release contract may change for the v1 gate issues.** Settled 2026-09-25. The contract describes the current version. If ISS-003 or ISS-004 require it, it may be amended for v1.0 under its own versioning rules, with human confirmation.
- **D59 - Rhythmic variety: the chance of values other than the selected density.** Settled 2026-09-25; this gives ISS-004 its semantics. The canonical term is "rhythmic variety" (proposed); the player-facing label is ux-writer's call.
  - It is one setting with three levels: _Strict_, _Slightly varied_, _Heavily varied_.
  - It controls how likely note values other than the selected density are to appear, both **shorter and longer**. Today's Quarter mode already produces dotted values, half notes and eighths.
  - _Strict_ allows only the selected value, plus the rests and ties that silence and syncopation produce.
  - The default is _Slightly varied_, which matches today's Quarter-mode feel. At the default, Eighth and Sixteenth therefore become a bit more varied than today, and Quarter + Strict is stricter than today.
  - Both presets set it to _Slightly varied_.
  - Variety does not apply to _Mixed_, which is already varied; the control shows as read-only there. Whether Mixed itself stays is O26.
  - What the rhythm grammar can support is not assumed. Implementation starts with a feasibility review of possible values, blocked combinations, latency and determinism.
  - Direction: the embellishment and style-figure flags expected in v2/v3 may collide with this setting or complete it. Variety may later become selective rates, for example "embellishment at 20%". That is not decided now.
- **D60 - Mixed density is retired in favor of rhythmic variety.** Settled 2026-09-25; resolves O26 and supersedes D59's "variety doesn't apply to Mixed". _Mixed_ is redundant with _Heavily varied_, so v1.0 note density becomes Quarter, Eighth or Sixteenth, and variety applies to all three. This is part of ISS-004. Known nuance: Mixed had no dominant value, while _Heavily varied_ keeps the selected density dominant. Mixed is referenced in six rhythm modules, controls, rhythm tests, `api_rhythm_domain_expansion` and the UI mockup. Sessions are ephemeral, so no saved setting needs migrating. Only golden fixtures and tests change.
- **D61 - Secondary personas: P2 "Speed Builder" and P3 "Fledgling Composer".** Settled 2026-09-25; resolves O21. The earlier keyboard-tester and sight-reading-student candidates merge into P2, whose main goal is speed in reading and playing. P3 wants to review a session, keep what they liked, export it in a widely known music format, and grow their own idea through the app's generation. The teacher candidate is dropped. See [personas](../../personas.md).
- **D62 - v2 includes a review of the last session, with MusicXML and MIDI export.** Settled 2026-09-25; resolves most of O27. The user considers review "not urgent, but must come soon" and instrumental for working with gimmicks and leitmotifs.
  - A **session** starts when the player starts playing on the MIDI controller or clicks a Start button. It ends after more than 30 s without input, or when the player clicks Stop.
  - At the end, the player can review the last session and mark what they liked.
  - Export formats are MusicXML and MIDI. Export ships with the v2 review (proposed).
  - Reviewing earlier sessions needs persistence and comes later, with D55.
  - The open edges are in O29 and O30.
- **D63 - v2 includes backing playback.** Settled 2026-09-25; narrows O6. The backing can be rudimentary, but it must at least match the pitch of the generated harmony and play on an appropriate beat. It is the first audio in the product. Generated lead-line playback is still not planned.
- **D64 - What the player plays is private.** Settled 2026-09-25 as a principle; the rules are in O30. Played notes belong to the player. The product is prudent with them, especially about keeping them. This extends the existing `rule_optional_midi_privacy`.
- **D65 - Continuation seeds, staged.** Settled 2026-09-25; resolves O28.
  - v2's rolling phrase already continues from the app's _own_ generated material. This is the simpler form of the same mechanism.
  - v3 continues from a motif the player _plays_ (D53).
  - Later, a whole MusicXML or MIDI file can be fed in as a seed. The whole file is used; there is no preview, cutting or editing, because Infinite Flow is not a DAW.
  - A unified "library" comes further out, around v5: display external files and past sessions alike, select a snippet, and hand it over as a seed. The limits are in O31.
- **D66 - Core principle: acknowledge and encourage, never penalize or score.** Settled 2026-09-25; resolves O25. New wording: "Infinite Flow acknowledges and encourages; it never penalizes, grades, ranks or scores the player. Anything that adapts to how you play is opt-in and visible." This replaces the "never evaluates" wording of archived D3, D21 and D26. The vision atom must be reworded to match when the vision is consolidated. Adaptive tempo (P2's nice-to-have) is a voluntary, checkbox-enabled option for players working on reading and playing speed.
- **D67 - Without MIDI, a session ends only on Stop; the phrase keeps scrolling through silence.** Settled 2026-09-25; resolves O29. With no controller, only the Stop button ends a session. With a controller, the rolling phrase keeps scrolling while the player is silent: they may be catching their breath or recovering after losing track, which is common with younger musicians. The 30 s inactivity rule (D62) still ends a MIDI session.
- **D68 - Snippet selection is allowed only as a way to create a seed; Infinite Flow stays non-professional.** Settled 2026-09-25; resolves O31. Selecting a snippet from a file or a past session to use as a continuation seed is in scope, because it is too practical to leave out. Other manipulation of material is out of scope: editing, cutting and splicing, arranging, multitrack. The app must not become a "too professional" tool.
- **D69 - Played notes stay on the player's side.** Settled 2026-09-25; resolves O30. Played notes are kept only in local storage on the player's own system, or leave it through a file export the player triggers. Both are acceptable because the first is tied to the player's system and the second depends entirely on the player's action. They are never sent anywhere else. The proposed defaults are confirmed in spirit: in-memory for the last-session review, opt-in to keep them across sessions with a way to delete them, and played notes included in an export only by the player's choice.
- **D70 - v2 backing form; accompaniment with roles in v4+.** Settled 2026-09-25; resolves O6. The v2 backing plays a bass line and block chords that follow the generated harmony. It has an optional click and a mute/volume control. It plays only while a session is running, and keeps playing through the player's silences. In v4+, accompaniment adds side instruments with distinct roles: highlighting, contrasting, responding.
- **D71 - Endgame direction: a rhythm RPG built on the v2 loop.** Settled 2026-09-25 as a direction, not scoped. See [endgame](../../vision/endgame.md).
  - The active play stays mostly the v2 loop, not quite infinite: a series of phrases to complete, with choices, antagonists and companions, whose voices the system plays.
  - Characters are restrictive musical presets.
  - Fights are exchanges of short phrases in which the player chooses skill options on their turn.
  - Off-phases cover character improvement, team building and quests.
  - Status effects alter both display and generation.
