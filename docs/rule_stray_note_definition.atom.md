---
id: rule_stray_note_definition
status: DRAFT
dependents:
  - [[rule_stray_notes_filtered_on_reading]]
layer: BUSINESS
version: 0.1
human_name: What a Very Short Note Is
parents:
  - [[req_midi_controller_input]]
type: RULE
priority: 1
tags: [v3, release-v3.0, midi]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# What a Very Short Note Is

## INTENT
Define which played notes count as stray in-between notes a controller sends.

## THE RULE / LOGIC
Some controllers send very short notes while the fingers change position: in-between notes a real instrument would swallow. From v3.0, a very short note is a played note whose length, from note-on to note-off, is under a fixed threshold. The threshold is a constant, not a player setting, the same for every controller; it is set from recordings of the reference controller and stays well under the shortest note the app writes at its fastest tempo, a sixteenth note at 240 BPM, which lasts 62.5 ms.

## TECHNICAL INTERFACE
One constant duration threshold classifies a played note as very short.

## EXPECTATION
- The threshold is a constant well under 62.5 ms, with no player setting.
- A played note shorter than the threshold, note-on to note-off, is very short; any other is not.
