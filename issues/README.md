# Issues

Tracked issues for Infinite Flow. See `.claude/skills/issue_management/SKILL.md` for the workflow.

## Index

| Ref     | File                                                                                                 | Severity | Status   | Summary                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ISS-011 | [Ref_20261012_start_after_idle_harmony_change.md](Ref_20261012_start_after_idle_harmony_change.md)   | High     | Open     | Start fails silently (CarryInError) at 60–220 BPM when Written key, Collection, Register or Harmonic motion changed at Idle after phrase 1; planned for the end of v3.0 (D297, chunk 24b) |
| ISS-010 | [Ref_20261007_locale_dependent_candidate_order.md](Ref_20261007_locale_dependent_candidate_order.md) | Low      | Resolved | Candidate, transform and failure-detail order used locale collation; now code-unit order, output byte-identical                |
| ISS-009 | [Ref_20261006_failed_carry_in_attempts_slow.md](Ref_20261006_failed_carry_in_attempts_slow.md)       | High     | Resolved | Slow, repeated failed carry-in attempts fixed: faster search, smaller allowance, time-aware ladder; sweep 0 of 568 repeat      |
| ISS-008 | [Ref_20261005_chord_symbol_through_rising_beam.md](Ref_20261005_chord_symbol_through_rising_beam.md) | Medium   | Open     | A rising up-stemmed beam can run through the chord symbol on its first note, which VexFlow places from the unextended stem tip |
| ISS-007 | [Ref_20260930_ledger_lines_keep_vexflow_grey.md](Ref_20260930_ledger_lines_keep_vexflow_grey.md)     | Medium   | Resolved | Ledger lines keep VexFlow's own `#444` stroke, so they ignore the staff colour and have low contrast in the dark theme         |
| ISS-006 | [Ref_20260929_every_stem_drawn_up.md](Ref_20260929_every_stem_drawn_up.md)                           | Medium   | Resolved | Every stem is drawn up, high notes included, which also makes each staff system about two spaces taller                        |
| ISS-005 | [Ref_20260926_profile_capability_flags.md](Ref_20260926_profile_capability_flags.md)                 | Low      | Resolved | Planner gates chromatic figures on the musical-profile name 'Jazz'; replaced with a capability flag (D73), output unchanged    |
| ISS-004 | [Ref_20260925_note_density_variety_setting.md](Ref_20260925_note_density_variety_setting.md)         | Low      | Resolved | Rhythmic variety (Strict / Slightly varied / Heavily varied) replaces Mixed; grammar rhythm-mvp-v2, goldens v3 (D74)           |
| ISS-003 | [Ref_20260925_tonal_center_in_written_key.md](Ref_20260925_tonal_center_in_written_key.md)           | Medium   | Resolved | Read the tonal center in the instrument's written key; transposition becomes instrument-template data so new presets are easy  |
| ISS-002 | [Ref_20260925_beamed_notes_draw_flags.md](Ref_20260925_beamed_notes_draw_flags.md)                   | High     | Resolved | Beamed eighths and sixteenths also draw flags, because beams are built after voice.draw                                        |
| ISS-001 | [Ref_20260925_score_dark_mode_black_strokes.md](Ref_20260925_score_dark_mode_black_strokes.md)       | High     | Resolved | Dark mode leaves staff lines, stems, beams and barlines black on the dark surface                                              |
