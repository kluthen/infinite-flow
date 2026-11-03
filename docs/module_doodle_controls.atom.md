---
id: module_doodle_controls
status: DRAFT
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.2, jam, generation, register]
dependents: []
version: 0.3
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

The silence reading counts the doodle's rests, read by the one function the steering block's builder writes its rest starts from: a silence, a stretch where no note sounds, holds a rest only where a whole rest of the note density's value as read (Quarter's when the doodle does not show it; a Sixteenth read below the tablet-landscape width still a sixteenth) fits in it on that grid, from the first such grid tick to the silence's end; a shorter silence, and the part of a silence before that tick, are part of the note before them and count nothing.

When the four rhythm values, with note density as read (a Sixteenth judged as Sixteenth at every width), form a combination the generator does not support, rhythmic variety steps up, Strict to Slightly varied to Heavily varied, until they form a supported one; nothing else moves. The raised variety keeps the source of the value it was raised from, and the rhythmic variety reading says whether the step raised it: raised exactly when the step gave a higher variety than the value read or the default. No reading depends on the window's width, so the readings are made once per doodle and a window crossing changes none of them. Below the tablet-landscape width a Sixteenth read from the doodle stays Sixteenth in the readings and generates as Eighth, as any chosen Sixteenth does.

The result is the readings: each of the seven controls with its value and whether it came from the doodle or is the first-visit value, which Jam's settings show. The register reading is the register window phrase 1's join reads: among the selected instrument's three register windows, Low, Middle and High, the one holding the doodle's last note, the nearest by its centre when several do, Middle when two or three centres are equally near (Middle is always among them, as the windows are derived); Varying when none does. It carries that window with the register, so the join takes the very window the register names, and none when the register reads Varying. Nothing it returns is saved.

## TECHNICAL INTERFACE
src/jam/doodle-controls.ts, pure, inside Jam's code (module_jam_code_boundary): `readDoodleControls(doodle, windows)` returns the `DoodleReadings`, each control a `DoodleReading` (its `value` and its `source`, `doodle` or `default`), the rhythmic variety reading also carrying `raised`, and the register a `DoodleRegisterReading` with its `window`, a `RegisterWindowCandidate` or null for Varying, which `readDoodleRegister(doodle, windows)` also gives alone; `supportedRhythmicVariety(setting)` is the step, judged by the generator's own rule (`isRhythmSettingBlocked`, src/domain/controls/unsupported-rhythm-settings.ts) at the note density as read. It takes the quantized doodle (QuantizedDoodle, src/domain/doodle/quantized-doodle.ts) and the selected instrument's register windows from deriveRegisterWindowCandidates (src/domain/profile/register-window-derivation.ts), and no window context. The four rhythm readings and the doodle's rests are in src/jam/doodle-rhythm-reading.ts (`readDoodleRhythmAim`, `doodleNoteValueTicks`, `doodleMeasureRests`, `doodleRestTicks`), shared with the steering block's builder (module_steering_block_builder). Phrase 1's join (`doodleJoin`, src/jam/doodle-join.ts) reads the register reading's window. Nothing in the app calls it yet: Jam's path to phrase 1 calls it when the doodle ends, and Jam's kept doodle when it is used again. Not built yet in this form: the code still takes the window's NoteDensityContext in both functions, judges the density as it generates at that width, and carries no `raised`.

## EXPECTATION
- Each reading rule gives its value at its edges, and a control the doodle cannot show gives its first-visit value, marked as such.
- The silence reading counts each rest from its start to its silence's end, and nothing of a silence holding no whole rest of the note density's value.
- Every result is a supported combination at both window widths; reaching one only ever raises rhythmic variety, judged at the note density as read.
- `raised` is true exactly when the step gave a higher rhythmic variety than the value read or the default.
- The register reading is the window holding the doodle's last note, the nearest by its centre among several, Middle on a tie, Varying when none holds it, and the window it carries is that window.
- The same doodle and instrument always give the same readings, at every window width; nothing is saved.
