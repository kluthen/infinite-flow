---
id: module_doodle_controls
status: DRAFT
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.2, jam, generation, register]
dependents: []
version: 0.1
priority: 1
human_name: The Controls Read From the Doodle
parents:
  - [[rule_doodle_contour_reading]]
  - [[rule_doodle_controls_always_supported]]
  - [[rule_doodle_leapiness_reading]]
  - [[rule_doodle_note_density_reading]]
  - [[rule_doodle_rhythmic_variety_reading]]
  - [[rule_doodle_sets_jam_controls]]
  - [[rule_doodle_silence_density_reading]]
  - [[rule_doodle_syncopation_reading]]
  - [[rule_jam_register_follows_doodle]]
---

# The Controls Read From the Doodle

## INTENT
Turn a quantized doodle into the seven ordinary control values a Jam is generated with, telling for each whether the doodle showed it, and give phrase 1's join the register window it reads.

## THE RULE / LOGIC
A pure function inside Jam's code, run when a doodle ends and for a kept doodle, on the quantized doodle after the very-short-note filter, in whole numbers only. It reads note density first, then rhythmic variety and syncopation, which read note density's value, then silence density, contour, leapiness and register, each by its own reading rule. A control the doodle cannot show takes session mode's first-visit value (Quarter, Slightly varied, Straight, Sparse, Arch, Shaped, Middle); a doodle of one note shows only its register.

When the four rhythm values, with note density as it generates at the current window width, form a combination the generator does not support, rhythmic variety steps up, Strict to Slightly varied to Heavily varied, until they form a supported one; nothing else moves. Below the tablet-landscape width a Sixteenth read from the doodle stays Sixteenth in the readings and generates as Eighth, as any chosen Sixteenth does.

The result is the readings: each of the seven controls with its value and whether it came from the doodle or is the first-visit value, which Jam's settings show. The register reading is the register window phrase 1's join reads: among the selected instrument's three register windows, Low, Middle and High, the one holding the doodle's last note, the nearest by its centre when several do; Varying when none does. It carries that window with the register, so the join takes the very window the register names, and none when the register reads Varying.

Nothing it returns is saved. Two points are not decided yet: how a tie between two windows whose centres are equally near the last note is broken; and how a short silence between two doodle notes (a detached note) is read, which the silence reading follows (today it counts every sixteenth in which no note sounds). Not built yet.

## TECHNICAL INTERFACE
src/jam/doodle-controls.ts, pure, inside Jam's code (module_jam_code_boundary). It takes the quantized doodle (QuantizedDoodle, src/domain/doodle/quantized-doodle.ts), the selected instrument's register windows as the generator derives them (src/domain/profile/register-window-derivation.ts) and the window's note-density context, and checks combinations with the generator's own rule (src/domain/controls/unsupported-rhythm-settings.ts). Its readings model gives each of the seven controls its value and its source, the doodle or the first-visit value; the register reading also gives its window when one holds the last note. Jam's path to phrase 1 calls it when the doodle ends, and Jam's kept doodle when it is used again; phrase 1's join (src/jam/doodle-join.ts) reads the register reading's window. Not built yet.

## EXPECTATION
- Each reading rule gives its value at its edges, and a control the doodle cannot show gives its first-visit value, marked as such.
- Every result is a supported combination at both window widths; reaching one only ever raises rhythmic variety.
- The register reading is the window holding the doodle's last note, the nearest by its centre among several, Varying when none holds it, and the window it carries is that window.
- The same doodle, instrument and width always give the same readings; nothing is saved.
