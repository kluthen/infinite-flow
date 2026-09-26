# v2 — Definition of Done

Status: draft v0.1 (2026-09-26). Everything here is `(proposed)`. It refines the candidate
definition in [highlights-proposal.md §6](highlights-proposal.md#6-candidate-v2-definition-of-done-proposed)
and collects the acceptance criteria of the topic documents.

## 1. Cut line (O75)

The proposed cut line follows [highlights-proposal.md §4](highlights-proposal.md#4-proposed-cut-line).
Whether it holds is **O75**.

| Release  | Content                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **v2.0** | Rolling phrase with carry-in (M1, M5). Backing, click and count-in (M2). Sessions (M3). MIDI expected-note acknowledgement and the controller check (M4; M6 is replaced by the check, see D72 and O55). Last-session review with favorites (M7). MusicXML and MIDI export of generated material (M8). Control changes at phrase boundaries (S3). |
| **v2.1** | End-of-measure chord-fit acknowledgement (S1, once O24 is settled). Played notes in the review, and in the MIDI export by choice (S2). Latency calibration if testers need it (O56).                                                                                                                                                             |
| **v2.2** | Adaptive tempo (N1). Multi-phrase arc (N3, O35). Embellishment flags (N2) are v2.2 or v3.                                                                                                                                                                                                                                                        |

Count-in (N4) is promoted into v2.0, because the MIDI start needs it (see
[audio-and-backing.md §6](audio-and-backing.md)).

## 2. Prerequisites that must have landed first

- **The v1.0 gate:** ISS-003 (D56, D57: instrument templates as open data, written key),
  ISS-004 (D59, D60: rhythmic variety, Mixed retired) and ISS-005 (D73: profile capability
  flags).
- **Re-measured generation latency after ISS-004 (O69).** The v2 look-ahead assumes a cold worst
  case well under the deadline: one bar, which is 1 s at 240 BPM. The current figures (cold p95
  316 ms, max 690 ms in Node; `docs/generation-latency.md`) predate the new rhythm grammar. This
  includes cold memo misses caused by a mid-session control change.

## 3. Definition of done for v2.0

A v2.0 release is done when all of the following hold.

1. **No gaps between phrases.** At 60, 120 and 240 BPM, and for every seed × supported-settings
   combination in the test matrix, every phrase after the first is generated and engraved before
   its deadline. The failure ladder keeps the session running when generation fails
   ([rolling-phrase.md §7](rolling-phrase.md) items 1 and 6).
2. **Joins obey the phrase rules, and the register is stable** (rolling-phrase items 2 and 3).
3. **Standalone phrases are unchanged.** Without carry-in, output is byte-identical to v1.0 on
   the golden fixtures (rolling-phrase item 5).
4. **Visible notes never change.** A control change applies to the first phrase that has not
   started sounding (rolling-phrase item 7).
5. **The backing is in pitch and on the beat. Muting keeps time. No autoplay violation**
   ([audio-and-backing.md §9](audio-and-backing.md) items 1, 2, 4 and 6).
6. **The clock stays in sync.** The playhead stays within 20 ms of the audio output position over
   a 5-minute session in Chromium on the reference machine (audio-and-backing item 3).
7. **Acknowledgement is exact and positive-only.** Only the exact expected pitch within its
   window is acknowledged. Nothing else produces any visible change, and the live view never
   renders a played pitch ([midi-and-acknowledgement.md §8](midi-and-acknowledgement.md) items
   1–3 and 5).
8. **The controller check works.** It reports a match or a constant offset
   (midi-and-acknowledgement item 6).
9. **Tuned on hardware.** The windows and latency constants are tuned and documented on the
   Travel Sax 2 over USB (and Bluetooth, if O71 allows) and on one USB keyboard
   (midi-and-acknowledgement item 9).
10. **MIDI is optional.** Sessions work without MIDI, with the permission denied, and after the
    device is unplugged (midi-and-acknowledgement items 7 and 8).
11. **Session boundaries behave as in D62 and D67.** A rhythm setting blocked in v1 can neither
    start a session nor be applied during one
    ([sessions-review-export.md §9](sessions-review-export.md) item 1).
12. **Review and export work in real tools.** This covers the complete and exact history,
    reproducibility from the stored inputs, MusicXML in MuseScore 4 for C, B♭ and E♭ templates,
    and MIDI with a concert-pitch tempo map (sessions-review-export items 2–5).
13. **Privacy holds and nothing is graded** (sessions-review-export items 6 and 7).
14. **The v1 guarantees still hold:** the instrument range contract, the notation rules,
    Chromium support, and offline use after the first load with no extra audio assets
    (audio-and-backing item 5).
15. **The latency budget is re-signed** for v2, including engraving during playback. No
    main-thread task longer than the scheduler look-ahead occurs during a 240 BPM session (O68).

## 4. Added by v2.1 and v2.2

- **v2.1:**
  - Chord-fit acknowledgement passes the "the app's own line fits" property test
    ([midi-and-acknowledgement.md §8](midi-and-acknowledgement.md) item 4).
  - Played notes appear in the review only on the toggle, and in the export only by choice.
- **v2.2:** adaptive tempo meets [adaptive-tempo.md §5](adaptive-tempo.md).

## 5. Open questions

- **O75 - The v2.0 cut line.** Should v2.0 ship the full core loop (proposed: M1–M8 plus S3 and
  the count-in, with chord-fit and played-note review in v2.1)? Or should it take the leaner cut
  from the proposal, v2.0 without MIDI ("flow, backing, review") and MIDI in v2.1?
- **O69 - Latency after ISS-004** _(measurement)_: re-run the latency harness after ISS-004,
  adding cold runs after a mid-session control change. Does the cold worst case stay under a
  quarter of the one-bar deadline at 240 BPM (250 ms in Chromium)?
