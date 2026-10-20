---
id: rule_stale_phrase_prompt_at_start
status: REVIEW
priority: 1
tags: [v3, release-v3.0, session, session-start, midi, changes-in-v3.1]
dependents:
  - [[module_idle_pregeneration_queue]]
  - [[module_session_pregeneration_plan]]
  - [[module_session_shown_settings]]
  - [[service_idle_generation_session]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
human_name: A Stale Phrase 1 Asks Before Start
parents:
  - [[req_rolling_practice_session]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_session_start_conditions]]
version: 0.4
---

# A Stale Phrase 1 Asks Before Start

## INTENT
Never start a session from a phrase made under settings the player has since changed without saying so, and let the player choose between a new phrase and the one on screen.

## THE RULE / LOGIC
At Idle, ordinary edits never regenerate the phrase on screen, and a session starts from that phrase as its phrase 1, so the phrase on screen can have been made under settings the player has since changed.

Stale. Phrase 1 is stale when a setting the generation reads has a different value now than when phrase 1 was generated. Values are compared, not edits: a setting changed and changed back is no difference.

- What counts: every generation control except the tempo (Written key, Collection, Harmonic motion, Tension, Note density as the player chose it, Rhythmic variety, Syncopation, Silence density, Contour, Register, Leapiness, Arpeggio chaos); each of the seven embellishment figure levels, the preset selection counting only through the settings it gives (choosing a preset changes what its values change, and a change of the selection alone, the Custom mark included, changes none); the instrument as the generation reads it, its id and, for my instrument, its range and transposition; and every setting a later version adds to the generation request (the chord level), in the same way.
- What never counts: the tempo and Rising tempo, since the tempo never affects generation; Vary settings and Tension across phrases, since neither acts on phrase 1; the audio mix; the theme; my instrument's clef and display name; and the window's width, since the note density a narrow window gives is not a setting.
- The instrument never makes phrase 1 stale in practice, since an instrument switch regenerates the phrase and saving my instrument's range or transposition while it is selected replaces it; it is counted for completeness.

When it asks. When the player presses Start, or plays the starting note, once every session start condition holds and before anything starts (no sound, no screen lock, no count-in), a stale phrase 1 opens a prompt that says the phrase on screen was made before the settings changed and offers two choices, Regenerate and Use it. The prompt is not a start condition and never replaces one: a start that a start condition blocks stays blocked and asks nothing. When phrase 1 is not stale, Start and the starting note work as before and nothing is asked.

Use it starts the session from that choice exactly as Start does: the choice is the start click, which unlocks the sound and asks for the screen locks, and every start condition is checked again at that moment. Phrase 1 is the phrase on screen, unchanged, with its request, seed and replay key, and it is shown, reviewed, kept and exported with the settings it was generated with. The session's settings are the current ones: phrase 2 onward is generated under them, Vary settings moves from them and returns to them, and the session's record names them. Phrase 2 joins phrase 1 as after a settings change applied at the boundary between phrase 1 and phrase 2 during a session, so the existing carry-in adaptation rules adapt the join and it cannot fail at any tempo. The read-only controls show the settings phrase 1 was generated with during the count-in and phrase 1, then the session's settings from phrase 2, as at any change; the preset selection alone shows the player's selection from the start, never phrase 1's, since it names the choice the next phrases follow. With the rhythm lock, the locked rhythm is still phrase 1's.

Regenerate runs the Idle Regenerate exactly: the current settings, a fresh seed, the usual fit run. The app stays at Idle with the new phrase on screen and nothing starts; regenerating never starts the session by itself. The player presses Start, or plays the new phrase's starting note, when ready, and is not asked again, since the new phrase is not stale. A failed regeneration shows the usual generation failure.

Dismissing the prompt without choosing changes nothing and starts nothing.

While the prompt shows, the app is still at Idle: no MIDI note starts anything, the starting note included, and pre-generation goes on, since its phrases are the ones Use it plays.

A running session never asks. The prompt comes before the session starts; the count-in starts only after Use it, and once the session has started nothing is asked until it ends.

## TECHNICAL INTERFACE
At Idle, with every start condition holding, the Start action and the starting note on a stale phrase 1 open the stale-phrase prompt and start nothing. The staleness check compares, by value, the settings phrase 1 was generated under with the current ones, over what the generation reads; a changed figure level is named by its figure's label, never as the preset selection. The prompt's Use it runs the session start with phrase 1 kept as it is and its own settings passed beside the session's settings; its Regenerate runs the Idle Regenerate and stays at Idle; dismissing it changes nothing. Its wording and form belong to the interface design. On screen, the two choices are labelled `Regenerate phrase`, the header's own Regenerate action, which the choice runs, and `Start with this phrase`; Regenerate and Use it stay the names of the two choices in the spec and the atoms.

## EXPECTATION
- After a change of Written key, Collection, Register or any other setting that counts, with phrase 1 kept, Start and the starting note open the prompt and start nothing: no sound, no screen lock, no count-in.
- A setting changed and changed back, or a change of only the tempo, Rising tempo, Vary settings, Tension across phrases, the audio mix, the theme, my instrument's clef or name, or the window's width, makes nothing stale: Start starts as before and nothing is asked.
- A start blocked by a start condition stays blocked and opens no prompt.
- Use it starts the session with phrase 1 unchanged, its request, seed and replay key the same; phrase 2 onward is generated under the current settings, joined to phrase 1 as after a settings change at that boundary, and the session starts at every tempo.
- During the count-in and phrase 1 the read-only controls show phrase 1's own settings, the preset selection aside, which shows the player's, then the session's settings from phrase 2.
- Regenerate shows a new phrase at Idle and starts nothing; the next Start or starting note asks nothing.
- Dismissing the prompt changes nothing and starts nothing.
- While the prompt shows, no MIDI note starts anything, the starting note included.
- A running session never shows the prompt.
