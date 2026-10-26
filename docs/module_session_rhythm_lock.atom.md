---
id: module_session_rhythm_lock
status: REVIEW
priority: 1
parents:
  - [[entity_request_rhythm_lock]]
  - [[req_rhythm_lock]]
  - [[rule_forced_bend]]
  - [[rule_locked_rhythm_is_phrase_one]]
  - [[rule_rhythm_change_share]]
  - [[rule_rhythm_changes_never_shown]]
  - [[rule_rhythm_lock_relocks_after_step_down]]
dependents: []
human_name: The Rhythm Lock in a Session
layer: ARCHITECTURE
version: 0.2
tags: [v3, release-v3.2, rhythm-lock, session]
type: MODULE
---

# The Rhythm Lock in a Session

## INTENT
Hold the rhythm lock through a session-mode session: freeze the locked rhythm at Start, carry it into every request the session builds, re-lock it once after a narrow-window step-down, and keep what the lock did on each phrase in the session history only.

## THE RULE / LOGIC
The lock's choices. Whether the lock is on and which rhythm changes are allowed are session settings: chosen at Idle or in the review, taken at Start with every other setting and fixed for the session. With the lock off, no request the session builds carries a rhythm lock group, and the session is exactly as it was before v3.2.

The locked bars. With the lock on, the session freezes at Start the written bars of phrase 1, the Idle phrase Start takes, even when it is out of date: its four measures, note starts and lengths as written. The locked bars are session state, not a setting: never saved, never shown, gone when the session ends; a kept session holds them only inside its phrases' requests.

The requests. Every request the session builds from phrase 2 on, on every rung of the failure ladder, the standalone attempt included, carries the lock group (entity_request_rhythm_lock): on with the locked bars, the allowed changes, and the tenser flag. The tenser flag is set only when Tension across phrases runs in the session and generates the phrase one step above the tension in effect: the second phrase of each group of four, unless the tension in effect is already Edge. A tension step made by Vary settings never sets it. The group depends only on the session's lock state and the phrase's place, so a request built again for the same phrase and rung carries the same group.

The re-lock. When the session steps the note density down from Sixteenth to Eighth under the narrow-window rule and the locked bars use sixteenth notes (a note or rest of them starts or lasts off the two-tick grid of the Eighth density), a re-lock is pending. The next phrase generated with Eighth is the re-lock phrase: each of its rungs' requests holds the old locked bars and no allowed change, so it draws no change and the lock's order gives it the nearest Eighth rhythm by total edits. When that phrase is decided, its written bars become the locked bars for the rest of the session and nothing is pending any more. A repeat is not a generated phrase, so it leaves the re-lock pending. Locked bars without sixteenth notes stay locked through a step-down, and the phrases after it draw as before.

Pre-generation. The pre-generation plan builds phrases 2 to 5 through the same steps, with phrase 1's locked bars, the same allowed changes, tenser flags and re-lock, so each ready phrase's request is the one the session would build at its place; the engine spends a ready phrase only when the request it re-derives, lock group included, is identical. The session seed plan does not change: a phrase's change draw takes the phrase's own seed inside generation.

The record. Each phrase the session decides keeps its outcome's provenance in the session history: the lock's outcome (the locked bars, a drawn change, or a forced bend) and, when the phrase drew a change, the kind of change it made or that no change was available. The session adds one mark of its own, on the re-lock phrase. So the history tells, for each phrase: locked, changed with its kind, forced bend, or re-lock, with "no change available" beside the locked bars or a forced bend when the phrase drew and could not change. A repeat keeps the repeated phrase's record and its repeat mark. None of it is shown in the live view, the review or the exports, and no kept session holds it.

## TECHNICAL INTERFACE
The lock's choices travel in SessionSettings (src/session/session-types.ts): rhythmLockOn, also read by the settings mutation, and allowedRhythmChanges, in RHYTHM_CHANGE_KINDS order, validated by freezeSessionSettings and taken by sessionSettingsAtStart (src/session/session-intents.ts). src/session/rhythm-lock-session.ts holds the session's lock state, SessionRhythmLock (bars, allowedChanges, relockOnStepDown), built at Start by sessionRhythmLockAtStart(settings, phraseOne) from phrase 1's written bars (lockedBarsOfOutcome), a re-lock pending when barsUseSixteenthNotes; phraseRhythmLock(lock, place) gives a phrase's PhraseRhythmLock, its group (makeRequestRhythmLock, src/domain/generation/request-rhythm-lock.ts) and, while a re-lock is pending, its relockGroup with no allowed change, from the phrase's number, the tension in effect and the session's Tension across phrases flag (isTenserPhrase, over tensionArcCycleStep in src/session/tension-arc-cycle.ts); rhythmLockAfterDecision(lock, phrase) locks a re-lock phrase's bars; phraseRhythmLockRecord(record) reads what the lock did to one phrase from its history record (PhraseRhythmLockRecord: relock, locked, changed with its kind, or forced_bend, and noChangeAvailable). openNextPhrase gives each opened phrase its rhythmLock, and the phrase course (PhraseCourse.rhythmLock) carries the lock state (src/session/session-phrase-opening.ts); buildRungIntent passes the phrase's groups to buildAttemptIntent (src/session/session-intents.ts), which puts the relockGroup on a rung built with Eighth by the step-down and the group otherwise, and returns relock (BuiltIntent). The engine's state carries the lock state as EngineState.rhythmLock, with DecidedPhrase.rhythmLock restored by undecide (src/session/session-engine-state.ts); the look-ahead carries its groups as LookAhead.rhythmLock and each attempt its relock flag (src/session/failure-ladder.ts, openLookAhead, acceptedPhrase), reopenedLookAhead takes the groups drawn again after a settings change (src/session/session-settings-change.ts), and requestRung builds each rung (src/session/session-ladder-step.ts). The pre-generation plan (src/session/session-pregeneration.ts) carries the same lock state through its course, and rederivedReadyPhrase and spentPhrase (src/session/session-ready-phrases.ts) re-derive a ready phrase with its groups and keep its re-lock mark. The re-lock mark is SessionPhrase.relock (src/session/session-types.ts) and SessionHistoryRecord.relock (src/session/session-history.ts), where each phrase's outcome keeps its provenance's rhythmLockOutcome and rhythmChange (src/domain/generation/orchestration/orchestration-types.ts).

## EXPECTATION
- With the lock off, no request carries a lock group and the session's phrases are those of v3.1.
- With the lock on and no kind allowed, every phrase has phrase 1's bars apart from forced bends, which the history records.
- Every rung of every phrase from phrase 2 carries the same locked bars, allowed changes and tenser flag.
- Only Tension across phrases' tenser phrase sets the tenser flag: never at Edge, never for a Vary settings step.
- After a step-down from locked bars with sixteenth notes, the first Eighth phrase's requests hold no allowed change, and its bars are locked from then on; a repeat leaves the re-lock pending.
- Pre-generated phrases are identical to the session's own, changes and the re-lock included.
- The history tells, per phrase, locked, changed with its kind, forced bend, re-lock, or no change available; nothing the player sees marks any of them.
