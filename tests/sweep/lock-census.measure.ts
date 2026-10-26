// @vitest-environment node
/**
 * The lock census runner (v3.2 measurement M2), manual only, never in `npm run quality`: run via
 * `npm run measure:lock`. Every supported rhythm setting with seeds 7 and 13 (or `LOCK_LIMIT`
 * evenly spaced cases), seeded eight-phrase sessions with the rhythm lock on, at 120 BPM with every
 * attempt generated at the flat modelled cost (timing plays no part): per case one session per
 * Tension across phrases (on, off) and allowed list (the strict lock, each change kind alone, all
 * five), the generator playing the lock. Each phrase is classed from its provenance's lock record
 * (kept, a drawn change, a forced bend), a re-lock from the session's mark, its bars only
 * cross-checking the record; each draw (phrases 2 to 8, repeats and re-locks skipped, some kind
 * allowed) records what it drew and which kinds had a candidate one change from the locked rhythm
 * in effect in the phrase's own rhythm domain, pooled over the 'all five' sessions per rhythm
 * control value and per rhythm setting. A few phrases of each class are replayed from their
 * `ifk4.` keys through the worker runtime and compared with what the session sounded. Groups: the
 * sweep's own cases, and each built-in preset applied to every case, each case then with its own
 * phrase-1 and session seeds (a preset replaces every case's rhythm setting, so the sweep's two
 * seeds would lock only about two rhythms per preset). A summary prints as `LOCK-CENSUS` lines.
 * A figure is reported, never failed on; checked: every session completed, no record and bars
 * disagree, and every replayed phrase matched.
 *
 * Env: `LOCK_OUT` writes the full figures JSON (with the machine, the date and the run duration)
 * to that path; `LOCK_LIMIT` keeps N evenly spaced sweep cases; `LOCK_SETTINGS` sweep (default),
 * builtin or both.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { sweepCases } from '../unit/session/deadline-sweep'
import { machineBlock } from './figure-census-sweep'
import { evenlySpaced } from './jam-sweep-population'
import {
  ALLOWED_SETS,
  LOCK_PHRASE_COUNT,
  LOCK_TEMPO,
  TENSION_ACROSS_PHRASES,
  censusOfGroup,
  lockCensusChoices,
  seedScheme,
  settingGroups,
  type LockGroupTally,
} from './lock-census-sweep'

describe('lock census runner (M2)', () => {
  it('reports, per setting group, Tension across phrases and allowed list, the lock census, the draws and the replays', async () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const choices = lockCensusChoices()
    const cases = evenlySpaced(sweepCases(), choices.limit)
    const groups = settingGroups(choices.settings)
    const tallies: LockGroupTally[] = []
    for (const group of groups) {
      const tally = await censusOfGroup(group, cases, (density, count) => {
        const heap = Math.round(process.memoryUsage().heapUsed / 2 ** 20)
        console.log(
          `LOCK-CENSUS [${group.label}] density ${density}: ${count} cases played, heap ${heap} MB`,
        )
      })
      console.log(tally.lines().join('\n'))
      tallies.push(tally)
    }

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: {
        description:
          'every supported rhythm setting with each seed (or LOCK_LIMIT evenly spaced cases), under each setting group (the sweep cases, or a built-in preset applied to every case with per-case seeds); per case one seeded session with the rhythm lock on per Tension across phrases (on, off) and allowed list, every attempt generated at the flat modelled cost; per draw (phrases 2 to 8, repeats and re-locks skipped, some kind allowed) what it drew and the kinds one change from the locked rhythm in effect in the phrase own rhythm domain; availability pooled over the all-five sessions; a sample of each class replayed from its key',
        sweepCases: cases.length,
        settingGroups: groups.map((group) => group.label),
        seeds: seedScheme(choices.settings),
        sessions: tallies.reduce((sum, tally) => sum + tally.sessions, 0),
        phrasesPerSession: LOCK_PHRASE_COUNT,
        tempo: LOCK_TEMPO,
        allowedSets: ALLOWED_SETS.map((set) => set.label),
        note: 'the rhythm lock on and played by the generator; each phrase classed from its provenance lock record (a re-lock from the session mark), its bars cross-checking it',
      },
      lockedRhythms: tallies.map((tally) => ({
        label: tally.label,
        completedSessions: tally.completed,
        distinctLockedRhythms: tally.distinctLockedRhythms,
      })),
      mismatches: tallies.map((tally) => ({ label: tally.label, ...tally.mismatches() })),
      replay: tallies.map((tally) => ({ label: tally.label, ...tally.replaySamples() })),
      groups: tallies.flatMap((tally) => tally.groups()),
      availabilityByRhythmSetting: tallies.flatMap((tally) => tally.availabilityFigures()),
    }
    const outPath = process.env.LOCK_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    const sessionsPerGroup = cases.length * TENSION_ACROSS_PHRASES.length * ALLOWED_SETS.length
    expect(tallies.map((tally) => [tally.sessions, tally.completed])).toEqual(
      groups.map(() => [sessionsPerGroup, sessionsPerGroup]),
    )
    expect(report.mismatches.flatMap(({ first }) => first)).toEqual([])
    expect(report.mismatches.map(({ count }) => count)).toEqual(groups.map(() => 0))
    for (const { byClass, mismatchedKeys } of report.replay) {
      expect(mismatchedKeys).toEqual([])
      for (const { replayed, matched } of Object.values(byClass)) expect(matched).toBe(replayed)
    }
  })
})
