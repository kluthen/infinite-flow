---
id: req_jam_settings
status: DRAFT
type: REQUIREMENT
priority: 1
parents:
  - [[req_jam]]
layer: BUSINESS
version: 0.1
human_name: Jam's Own Settings
tags: [v3, release-v3.2, jam, player-controls]
dependents:
  - [[rule_doodle_sets_jam_controls]]
  - [[rule_jam_embellishments_one_level]]
  - [[rule_jam_settings_first_values]]
  - [[rule_jam_settings_load_tolerantly]]
  - [[rule_jam_settings_saved_on_change]]
  - [[rule_jam_tempo_range]]
---

# Jam's Own Settings

## INTENT
Give Jam a small set of settings of its own, for a player who wants to hear their idea grown, not to tune a generator.

## THE RULE / LOGIC
Jam mode keeps its own settings, apart from session mode's: the key and mode (Written key and Collection); the tempo; the drift; the rhythm lock and its allowed rhythm changes; harmonic motion and tension, with their usual choices; and one Embellishments level. Changing one in Jam mode never changes session mode's, and the other way round. The rhythm and shape controls (note density, rhythmic variety, syncopation, silence density, contour, leapiness and register) are not set by the player in Jam mode: the doodle sets them. Arpeggio chaos is not a Jam setting: it is held at Varied and not shown. The instrument, the controller, the audio mix and the theme are shared with session mode. Presets, Vary settings and its allowed groups, Tension across phrases and Rising tempo are session-mode tools and are not in Jam mode.

## TECHNICAL INTERFACE
Jam mode shows its own settings (key and mode, tempo, drift, rhythm lock and allowed rhythm changes, harmonic motion, tension and one Embellishments level) and the controls read from the doodle.

## EXPECTATION
- Changing a Jam setting never changes the session-mode setting of the same name, and the other way round.
- Jam mode offers no presets, no Vary settings, no Tension across phrases, no Rising tempo and no arpeggio chaos control.
- In a Jam, the rhythm and shape controls come from the doodle.
