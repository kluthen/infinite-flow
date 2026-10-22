---
id: rule_optional_midi_privacy
status: STABLE
human_name: Optional MIDI Privacy
layer: BUSINESS
version: 0.5
priority: 2
tags: [midi, privacy, non-scoring, v2, release-v2.0, revised-for-v2]
dependents: []
type: RULE
parents:
  - [[req_midi_controller_input]]
---

# Optional MIDI Privacy

## INTENT
Keep the notes the player plays on their own machine unless they explicitly export them.

## THE RULE / LOGIC
MIDI input stays private by construction, not by policy. Played notes are never sent in any network request, and no export other than the played-notes export ever carries them. They are written to browser storage only with the session they belong to, and only while the player has opted in to keeping them; without that opt-in they exist only in memory, for the current session and its review. The only way a played note ever leaves the player's machine is the played-notes export action, which the player explicitly triggers. One thing derived from played notes is not played notes: the doodle a player plays to start a Jam, once the app has quantized it (its notes snapped to the nearest sixteenth note and reduced to one melodic line), is a generation input the player gave on purpose. That quantized doodle is never sent either, but it travels with the music it generated: it is stored with its kept session without the opt-in and carried by the generated-notes export (MusicXML and MIDI). The phrase replay key printed on the browser's console holds the steering block derived from it, rhythm positions and kinds of move with no pitch, never the doodle itself. The doodle's raw notes, exactly as played, remain played notes under every rule above.

## TECHNICAL INTERFACE
No network path carries played notes or a quantized doodle; the only storage path for played notes is their kept session, used only after the player's opt-in; the played-notes export is a local file download the player triggers. A quantized doodle is stored with its kept session and written into the generated-notes export; the replay key's console line holds the steering block, never the doodle.

## EXPECTATION
Under a network and storage spy across a full session, its review and every export, no played note and no quantized doodle is sent over the network; without the player's opt-in to keeping them, no played note is written to storage, though a Jam's quantized doodle may be; played notes leave the device only in a played-notes export file the player triggered, and a Jam's quantized doodle only in a generated-notes export file the player triggered.
