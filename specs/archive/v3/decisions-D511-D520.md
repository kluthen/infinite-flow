> **Archived 2026-11-22.** Closed range for the v3.3 milestone: v3.3 is released as version
> 3.3.0 (tag `v3.3.0`, b2a0e3fa). These decisions are Part D's refresh against v3.2 as built and
> the owner's approval of v3.3 (gates A0 and D0). D521–D523, which follow them, stay live (v3.2's
> release as built, whose checks after the `3.2.0` tag are still open). Archived IDs keep their
> meaning and may be cited anywhere; each decision's content is now stated as settled fact in a
> live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md#v33-release-archived-2026-11-22) records. Relative links were
> written from `specs/`; their paths were repaired on 2026-11-22 so they resolve from this folder.

- **D511 (2026-11-09): Part D and the v3.3 build plan are refreshed against v3.2 as built
  (proposed for owner approval with Part D, gate A0).** spec-writer's review, asked for before A0:
  Part D v1.1 and plan v3 predate most of v3.2. Re-checked on `main` d10de742 (Part C v1.24,
  CONTRACT 14.0.0) by `codebase-explorer` and a read-only `documentalist` pass: stale code
  references, tools, budgets and atom versions corrected, and the chord research's code table
  re-checked. The substantive gaps are D512–D518 and O306. Now in:
  [Part D v1.2](../../versions/v3/master-spec.md#part-d--v33),
  [build plan v3.3, v4](../../versions/v3/build-plan-v3.3.md),
  [chord research](../../../docs/music/chord-research.md#where-a-fourth-chord-note-meets-the-code).

- **D512 (2026-11-09): Jam's own level runs through all of Part D, and new chunk 23 builds it
  (proposed with Part D).** D411 gave Jam its own level, but only §D8.4 said so; scope, saving,
  the interface, the definition of done and the plan covered session mode only. Jam's level is
  one more `jam.*` setting, Off first, with no database step. Now in:
  [Part D §D8.4](../../versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion),
  [build plan v3.3, chunk 23](../../versions/v3/build-plan-v3.3.md#chunk-23--jams-own-seventh-chords-level).

- **D513 (2026-11-09): a level change keeps the kept doodle (proposed with Part D; corrects D274's
  point 4).** Since v3.2's wave 7 only New doodle, leaving Jam mode or deleting its session lets the
  doodle go. Session mode's level discards session mode's prepared phrases; Jam's rewrites phrase 1
  from the kept doodle, as any Jam setting but the tempo does. Now in:
  [Part D §D8.4](../../versions/v3/master-spec.md#d84-pre-generation-jam-and-the-key-and-mode-suggestion),
  [§D15 item 16](../../versions/v3/master-spec.md#d15-definition-of-done).

- **D514 (2026-11-09): the level rides the generation intent only (proposed with Part D; amends
  D277's placement).** The resolved request holds neither the controls nor the figure levels;
  the level sits beside the figure levels and is read from the intent as they are, so stored
  requests and their parser stay as they are. Now in:
  [Part D §D9](../../versions/v3/master-spec.md#d9-the-generation-request-the-replay-key-and-kept-sessions),
  [build plan v3.3, chunk 3](../../versions/v3/build-plan-v3.3.md#chunk-3--the-level-in-the-generation-request).

- **D515 (2026-11-09): data version 5 rewrites the records whose shape changes (proposed with
  Part D; amends D279).** STABLE `module_on_device_database` reads a record below its shape's
  version as unreadable; a step that rewrote nothing would need that rule changed. The step
  rewrites player presets and kept bodies with the level at Off; the levels' settings records
  need no step. Now in: [Part D §D8.2](../../versions/v3/master-spec.md#d82-saving-on-the-device),
  [build plan v3.3, chunk 17](../../versions/v3/build-plan-v3.3.md#chunk-17--the-level-on-the-device-data-version-5).

- **D516 (2026-11-09): the rhythm lock's walk, the carried note, and Jam measured at 180 BPM
  (proposed with Part D).** With locked bars the search tries every plan per locked rhythm; each
  plan's two forms stay side by side, measured with the lock on. The carried final note is read
  against the triad. Jam's phrase 1 is measured at 180 BPM, its fastest (D506). Now in:
  [Part D §D5.3](../../versions/v3/master-spec.md#d53-how-the-planner-applies-it),
  [§D6.3](../../versions/v3/master-spec.md#d63-phrase-endings-and-the-join-read-the-triad-until-a-listening-check),
  [§D10](../../versions/v3/master-spec.md#d10-the-cost-guard-generation-time-with-seventh-chords).

- **D517 (2026-11-09): every STABLE wording v3.3 changes is confirmed once and applied wave by
  wave (proposed with Part D; amends D276).** v3.2 promoted many touched atoms to STABLE, so §D12
  lists two meaning changes and seven groups that grow to name the level; `rule_leap_recovery`
  keeps its wording ("chord-tone run"). The owner confirms all at C1; each applies at its wave's
  sync, as D422 did. First bump: 15.0.0 if v3.2's release adds none. Now in:
  [Part D §D12](../../versions/v3/master-spec.md#d12-contract-changes-needing-owner-confirmation),
  [build plan v3.3, gates](../../versions/v3/build-plan-v3.3.md#gates).

- **D518 (2026-11-09): the backing beside v3.2's guides (proposed with Part D).** The guides play
  the line and the root, so the backing alone sounds the whole chord; each chord note keeps
  today's loudness, the mix is unchanged, and H2 judges the balance with the guides on and off.
  Now in: [Part D §D7.3](../../versions/v3/master-spec.md#d73-the-backing-plays-the-seventh),
  [build plan v3.3, hand checks](../../versions/v3/build-plan-v3.3.md#hand-checks).

- **D519 (2026-11-09): after `Start with this phrase`, phrase 1 keeps its own level (a
  clarification, proposed with Part D).** §D8.3's "never switches" read as if it overrode v3.0's
  rule that phrase 1 keeps every setting it was generated with; the design follows that rule (ux
  D481), and the session's level holds from the next phrase. Now in:
  [Part D §D8.3](../../versions/v3/master-spec.md#d83-vary-settings-and-the-session).

- **D520 (2026-11-09): the owner approves v3.3: Part D v1.2, its build plan and its design (gates
  A0 and D0).** Asked both at once, the owner: "Approve both". A0: Part D v1.2, D263–D288 and
  D511–D519, every one proposed with Part D now settled, and build plan v3.3 v4. D0: the design,
  ux D252–D264 refreshed by ux D477–D481, recorded by `ux-writer` as ux D482. I0, `documentalist`'s
  ingestion, is next. Now in: [Part D](../../versions/v3/master-spec.md#part-d--v33),
  [build plan v3.3, gates](../../versions/v3/build-plan-v3.3.md#gates).
