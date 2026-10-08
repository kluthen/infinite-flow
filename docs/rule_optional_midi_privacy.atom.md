---
id: rule_optional_midi_privacy
status: STABLE
human_name: Optional MIDI Privacy
layer: BUSINESS
version: 0.4
priority: 2
tags: [midi, privacy, non-scoring, v2, release-v2.0, revised-for-v2]
dependents: []
type: RULE
parents:
  - [[req_midi_controller_input]]
notes: Revised 2026-10-08 to version 0.4 (previous version 0.3) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A5), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. A Jam's quantized doodle is a generation input, not played notes: it is never sent, but it is stored with its kept session without the opt-in, carried by the generated-notes export and printed in the replay key's console line; the doodle's raw notes stay played notes under every rule. Played notes keep every guarantee, and nothing is ever sent. Earlier: Revised 2026-10-07 to version 0.3 with the explicit confirmation of the product owner, given on 2026-10-07, of contract change set part A (docs/release/v3.0-intent-change-set.md, A2), together with the CONTRACT 2.0 MAJOR bump; stays STABLE. Narrowed to what holds in both v2.0 and v3.0: the guarantee that played notes are never written to browser storage is removed; they may now be written with their kept session, only after the player opts in to keeping them, and are still never sent over the network. The v3.0 behaviour lives in the DRAFT atoms rule_played_notes_kept_only_after_opt_in and rule_kept_played_notes_deletable. The storage half of the review privacy spy becomes only allowed data, played notes only after opt-in; its network half stays. Earlier: Revised 2026-09-29 by v2 spec ingestion for release v2.0 (previous version 0.1). Version 0.1 stated the first-release boundary that the app has no MIDI controller connection, input or feedback at all; v2 lifts that exclusion, so this rule now states how played MIDI input stays private. Since v2 chunk 17 played notes exist, in memory only, in the session history. The lint and boundary-script bans on network and storage enforce its never-sent/never-stored half. Since v2 chunk 23 (release v2.1) the played-notes export is built. The review privacy end-to-end test runs the network and storage spy across a session with played notes, its review, every generated-notes export, the played-notes export and the Played notes switch, and checks that every generated-notes file is byte-identical to the file of the same session played silently. On 2026-10-04 the owner approved dropping the LOGIC clause about the time before the played-notes action existed.
---

# Optional MIDI Privacy

## INTENT
Keep the notes the player plays on their own machine unless they explicitly export them.

## THE RULE / LOGIC
MIDI input stays private by construction, not by policy. Played notes are never sent in any network request, and no export other than the played-notes export ever carries them. They are written to browser storage only with the session they belong to, and only while the player has opted in to keeping them; without that opt-in they exist only in memory, for the current session and its review. The only way a played note ever leaves the player's machine is the played-notes export action, which the player explicitly triggers. One thing derived from played notes is not played notes: the doodle a player plays to start a Jam, once the app has quantized it (its notes snapped to the nearest sixteenth note and reduced to one melodic line), is a generation input the player gave on purpose. That quantized doodle is never sent either, but it travels with the music it generated: it is stored with its kept session without the opt-in, carried by the generated-notes export (MusicXML and MIDI), and printed in the phrase replay key on the browser's console. The doodle's raw notes, exactly as played, remain played notes under every rule above.

## TECHNICAL INTERFACE
No network path carries played notes or a quantized doodle; the only storage path for played notes is their kept session, used only after the player's opt-in; the played-notes export is a local file download the player triggers. A quantized doodle is stored with its kept session and written into the generated-notes export and the replay key's console line.

## EXPECTATION
Under a network and storage spy across a full session, its review and every export, no played note and no quantized doodle is sent over the network; without the player's opt-in to keeping them, no played note is written to storage, though a Jam's quantized doodle may be; played notes leave the device only in a played-notes export file the player triggered, and a Jam's quantized doodle only in a generated-notes export file the player triggered.
